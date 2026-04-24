/**
 * Frost analysis for any US airport — client-side.
 *
 * Pipeline:
 *   1. Given (lat, lon), find nearest GHCN-D station with 1991-2020 normals.
 *   2. Fetch the station's daily TAVG normals CSV via the /noaa Vite proxy.
 *   3. Compute Air Freezing Index (AFI = sum of (32 - TAVG_d) for days where TAVG_d < 32).
 *   4. Compute modified Berggren frost depth: X = K * sqrt(AFI), with K per soil class.
 *   5. Map to FAA AC 150/5320-6F treatment tier.
 *
 * All math mirrors `scripts/fetch_climate_normals.py` so per-airport frost
 * data on the website is bit-for-bit consistent with the pre-computed
 * `frost_data.json` for the 6 project airports.
 */

import inventory from '../data/noaa_normals_stations.json'

// ---------- Constants ----------
export const SIGMA_WANDER_NA = null  // not used here; this module is climate-only

// FAA AC 150/5320-6F Table 3-2 frost-susceptibility classes
// Mapped from AASHTO classification (subgrade soil)
export const FROST_CLASSES = ['FG-1', 'FG-2', 'FG-3', 'FG-4']

// Modified-Berggren K coefficient by frost class (in / sqrt(F-day))
// Higher K = coarser soil = faster frost penetration (higher conductivity, lower latent heat)
export const BERGGREN_K = {
  'FG-1': 1.40,   // gravels / sands — negligible frost susceptibility
  'FG-2': 1.30,   // sandy gravels / sandy loams
  'FG-3': 1.20,   // silty sands / low-PI clays
  'FG-4': 1.10,   // silts / silty clays / organics
}

// AASHTO group → FAA frost class (rough guide; final design needs lab verification)
const AASHTO_TO_FROST_CLASS = {
  'A-1-a': 'FG-1', 'A-1-b': 'FG-1',
  'A-3':   'FG-2',
  'A-2-4': 'FG-2', 'A-2-5': 'FG-2', 'A-2-6': 'FG-2', 'A-2-7': 'FG-2',
  'A-4':   'FG-3', 'A-5':   'FG-3',
  'A-6':   'FG-3', 'A-7-5': 'FG-4', 'A-7-6': 'FG-4',
  'Rock':  'FG-1', 'Bedrock': 'FG-1',
}

export function frostClassFromAASHTO(aashtoGroup) {
  if (!aashtoGroup) return 'FG-3'   // moderate default when unknown
  return AASHTO_TO_FROST_CLASS[aashtoGroup] || 'FG-3'
}

// ---------- Geometry: nearest-station lookup ----------
function haversineMi(lat1, lon1, lat2, lon2) {
  const R_MI = 3958.7613
  const toRad = (d) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R_MI * Math.asin(Math.sqrt(a))
}

export function findNearestStations(lat, lon, n = 5) {
  // Coarse pre-filter by lat/lon box (~5 deg) to avoid haversine on all 26k entries
  const stations = inventory.stations
  const candidates = []
  for (const s of stations) {
    if (Math.abs(s.lat - lat) > 5 || Math.abs(s.lon - lon) > 5) continue
    candidates.push({ ...s, distance_mi: haversineMi(lat, lon, s.lat, s.lon) })
  }
  // Fallback: if nothing within 5°, expand to 15° (covers AK / remote sites)
  if (candidates.length === 0) {
    for (const s of stations) {
      if (Math.abs(s.lat - lat) > 15 || Math.abs(s.lon - lon) > 15) continue
      candidates.push({ ...s, distance_mi: haversineMi(lat, lon, s.lat, s.lon) })
    }
  }
  candidates.sort((a, b) => a.distance_mi - b.distance_mi)
  return candidates.slice(0, n)
}

// ---------- CSV fetch + parse ----------
const csvCache = new Map()  // station_id → days array, in-memory cache

export async function fetchTavgNormals(stationId) {
  if (csvCache.has(stationId)) return csvCache.get(stationId)
  const url = `/noaa/data/normals-daily/1991-2020/access/${stationId}.csv`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${stationId}`)
  const text = await res.text()
  const days = parseTavg(text)
  csvCache.set(stationId, days)
  return days
}

function parseTavg(csvText) {
  // Use first row to find DATE, month, day, DLY-TAVG-NORMAL columns
  const rows = csvText.split(/\r?\n/).filter(r => r.length > 0)
  if (rows.length < 2) return []
  const header = parseCSVRow(rows[0])
  const idx = (name) => header.indexOf(name)
  const iDate = idx('DATE'), iMonth = idx('month'), iDay = idx('day')
  const iTavg = idx('DLY-TAVG-NORMAL')
  if (iTavg < 0) return []

  const days = []
  for (let r = 1; r < rows.length; r++) {
    const cols = parseCSVRow(rows[r])
    const tavg = parseFloat(cols[iTavg])
    if (!Number.isFinite(tavg) || tavg < -100) continue   // missing-data sentinel
    days.push({
      date:  cols[iDate]?.trim(),
      month: parseInt(cols[iMonth] || '0', 10),
      day:   parseInt(cols[iDay]   || '0', 10),
      tavg_F: tavg,
    })
  }
  return days
}

function parseCSVRow(row) {
  // Minimal CSV parser; NOAA normals CSVs use plain comma + quoted strings
  const out = []
  let cur = '', inQ = false
  for (let i = 0; i < row.length; i++) {
    const c = row[i]
    if (inQ) {
      if (c === '"') {
        if (row[i + 1] === '"') { cur += '"'; i++ } else inQ = false
      } else cur += c
    } else {
      if (c === ',') { out.push(cur); cur = '' }
      else if (c === '"') inQ = true
      else cur += c
    }
  }
  out.push(cur)
  return out
}

// ---------- Frost math ----------
export function computeAFI(days) {
  let afi = 0
  let freezingDays = 0
  let coldest = { date: null, tavg_F: null }
  for (const d of days) {
    if (d.tavg_F < 32) {
      afi += (32 - d.tavg_F)
      freezingDays += 1
    }
    if (coldest.tavg_F === null || d.tavg_F < coldest.tavg_F) {
      coldest = { date: d.date, tavg_F: d.tavg_F }
    }
  }
  return { afi: +afi.toFixed(1), freezingDays, coldest }
}

export function berggrenDepth(afi, K) {
  if (!(afi > 0)) return 0
  return +(K * Math.sqrt(afi)).toFixed(2)
}

export function monthlyMeans(days) {
  const buckets = {}
  for (const d of days) {
    if (!buckets[d.month]) buckets[d.month] = []
    buckets[d.month].push(d.tavg_F)
  }
  const out = []
  for (let m = 1; m <= 12; m++) {
    if (buckets[m]) out.push({
      month: m,
      tavg_F: +(buckets[m].reduce((s, v) => s + v, 0) / buckets[m].length).toFixed(1),
    })
  }
  return out
}

export function faaTreatment(frostIn, frostClass, totalPavementIn) {
  if (frostClass === 'FG-1') {
    return {
      tier: 'No special treatment required',
      designApproach: 'Standard FAARFIELD design (no frost adjustment)',
      rationale: 'Subgrade is FG-1 (negligible frost susceptibility)',
      compliant: true,
    }
  }
  const limited = 0.65 * frostIn
  const complete = frostIn
  if (totalPavementIn >= complete) {
    return {
      tier: 'Complete frost protection',
      designApproach: 'Standard FAARFIELD design holds; no additional frost adjustment needed.',
      rationale: `Total pavement section (${totalPavementIn}") meets or exceeds computed frost depth (${frostIn}"); subgrade fully protected.`,
      compliant: true,
      limitedDepthIn: +limited.toFixed(2),
      completeDepthIn: +complete.toFixed(2),
      totalPavementIn,
    }
  }
  if (totalPavementIn >= limited) {
    return {
      tier: 'Limited subgrade frost penetration',
      designApproach: 'Reduced subgrade strength approach acceptable; or thicken non-frost-susceptible base to full frost depth for complete protection.',
      rationale: `Total pavement section (${totalPavementIn}") covers ≥65% of frost depth (${frostIn}"); some subgrade freezing acceptable per AC 150/5320-6F.`,
      compliant: true,
      limitedDepthIn: +limited.toFixed(2),
      completeDepthIn: +complete.toFixed(2),
      totalPavementIn,
    }
  }
  return {
    tier: 'INADEQUATE — frost-susceptible subgrade exposed',
    designApproach: 'Recommend non-frost-susceptible base/subbase extension to limited-penetration depth, or full reconstruction to complete-protection depth.',
    rationale: `Total pavement section (${totalPavementIn}") is less than 65% of frost depth (${frostIn}"). Recommend non-frost-susceptible base/subbase extension to a depth of ${limited.toFixed(1)}" minimum, OR full reconstruction to ${frostIn.toFixed(1)}" of non-frost-susceptible material.`,
    compliant: false,
    limitedDepthIn: +limited.toFixed(2),
    completeDepthIn: +complete.toFixed(2),
    totalPavementIn,
  }
}

// ---------- Main entry point ----------
/**
 * Get frost analysis for a coordinate.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {object} opts
 *   - aashtoGroup    AASHTO subgrade group (e.g., "A-7-6") for frost-class derivation
 *   - frostClass     direct frost class override (FG-1..FG-4)
 *   - pavementIn     total pavement section thickness for treatment-tier check
 *   - maxFallback    how many nearest stations to try before giving up (default 5)
 * @returns {Promise<object|null>}
 */
export async function getFrostForCoord(lat, lon, opts = {}) {
  const { aashtoGroup, frostClass: classOverride, pavementIn = 14, maxFallback = 5 } = opts
  const candidates = findNearestStations(lat, lon, maxFallback)
  if (!candidates.length) return null

  let lastErr = null
  for (const station of candidates) {
    try {
      const days = await fetchTavgNormals(station.id)
      if (!days.length) { lastErr = `no TAVG data for ${station.id}`; continue }
      const { afi, freezingDays, coldest } = computeAFI(days)
      const fclass = classOverride || frostClassFromAASHTO(aashtoGroup)
      const K = BERGGREN_K[fclass] ?? BERGGREN_K['FG-3']
      const frostIn = berggrenDepth(afi, K)
      const treatment = faaTreatment(frostIn, fclass, pavementIn)
      return {
        station: {
          id: station.id, name: station.name, state: station.state,
          lat: station.lat, lon: station.lon,
          distance_mi: +station.distance_mi.toFixed(1),
          elev_m: station.elev_m,
        },
        airfreezingIndex_Fdays: afi,
        freezingDaysPerYear: freezingDays,
        coldestNormalDay: coldest.date,
        coldestNormal_F: coldest.tavg_F,
        subgradeFrostClass: fclass,
        berggrenK: K,
        frostDepthIn: frostIn,
        pavementTotalIn: pavementIn,
        treatment,
        monthlyTavg_F: monthlyMeans(days),
        source: 'NOAA NCEI Climate Normals 1991-2020 (live, via Vite proxy)',
      }
    } catch (e) {
      lastErr = String(e)
      // try next-nearest station (404, parse error, etc.)
    }
  }
  return { error: `No usable climate-normals station within ${maxFallback} candidates. Last error: ${lastErr}` }
}
