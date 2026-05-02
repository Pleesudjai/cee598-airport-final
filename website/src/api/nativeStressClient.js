// Direct backend URL — Vite 8 proxy doesn't forward POST requests reliably.
// Backend has CORS enabled (Access-Control-Allow-Origin: *).
// In dev, VITE_API_BASE is unset and we fall back to localhost:5100.
// On Netlify, set VITE_API_BASE in Site settings → Environment variables to a
// public tunnel URL (e.g. https://aeropave-api.trycloudflare.com) so visitors
// can reach the backend from the deployed site.
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5100'

// Precal manifest (build-time import). Lists which (sectionKey, aircraftIcao)
// pairs have static stress JSONs available under /public/data/precal/.
// Manifest lives in src/ (small, imported at build); payloads live in public/
// (~160 MB, fetched at runtime only when needed).
import precalIndex from '../data/precal/index.json'

// Precal cache helper. Returns the cached payload when (sectionKey, aircraftIcao)
// matches a baked entry. The caller (DesignTool) is responsible for setting
// sectionKey to null when the user has edited inputs past as-built — we trust
// that gate rather than re-deriving a request hash here, because Python's float
// serialization (e.g., 6.0) and JS's (e.g., 6 after JSON round-trip) don't
// agree byte-for-byte.
async function loadPrecal(sectionKey, aircraftIcao, layers, subgrade, endpoint) {
  if (!sectionKey || !aircraftIcao) return null
  const section = precalIndex.sections?.find(s => s.sectionKey === sectionKey)
  if (!section) return null
  const ac = section.aircraft?.find(a => a.icao === aircraftIcao)
  if (!ac) return null
  const path = ac[`${endpoint}Path`]
  if (!path) return null
  try {
    const r = await fetch(path)
    if (!r.ok) return null
    const data = await r.json()
    if (data?._meta?.skipped) return null
    return { data, source: 'precal' }
  } catch { return null }
}

export async function checkHealth() {
  // Bumped to 8 s — when the backend is mid-CDF (especially FEM3D) the single-
  // threaded HttpListener queues /api/health behind the in-flight request, so a
  // 3 s timeout was producing false offline flips during normal operation.
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null   // distinguished from the catch path below
    return await res.json()
  } catch {
    return null   // network/timeout error (not a definitive "backend is down")
  }
}

export async function fetchLeafGrid(layers, subgrade, aircraft, evalDepthIn, gridPoints = 21, gridExtentIn = null, sectionKey = null) {
  // v2: pass icao/gear/mtow for library-resolved geometry
  const ac = {
    name: aircraft.type || aircraft.name || 'Aircraft',
    gearLoad: aircraft.gearLoad || (aircraft.mtow || 50000) * 0.95,
    nTires: aircraft.nTires || 2,
    tirePressure: aircraft.tirePressure || 200,
    tireSpacingIn: aircraft.tireSpacingIn || 34,
    icao: aircraft.type || aircraft.icao || '',
    gear: aircraft.gear || '',
    mtow: aircraft.mtow || 0,
  }

  // Precal-first: serve cached LEAF grid when (sectionKey, aircraft.icao)
  // matches a baked entry AND the request hash still matches (i.e., user
  // hasn't edited layers/subgrade past as-built). Avoids a 200-1000 ms live
  // recompute on every aircraft swap for project-section views.
  if (sectionKey && ac.icao) {
    const precal = await loadPrecal(sectionKey, ac.icao, layers, subgrade, 'leafGrid')
    if (precal) return precal
  }

  try {

    // Auto-scale grid extent from library wheel coords (if not explicitly set).
    // Rule: 40% margin past the outermost wheel, floored at 120" so even tiny
    // GA aircraft display a useful surrounding context band. 1.4 × maxWheel
    // keeps wide-bodies (e.g., B772 with wheels at ±243") to a 350" grid that
    // still shows the gear cluster prominently rather than a tiny dot in a sea
    // of empty contour.
    let extent = gridExtentIn
    if (extent === null || extent <= 0) {
      extent = 120
      if (ac.icao) {
        try {
          const acRes = await fetch(`${BASE}/api/aircraft/${encodeURIComponent(ac.icao)}`)
          if (acRes.ok) {
            const acData = await acRes.json()
            if (acData.wheel_coords?.length) {
              const maxX = Math.max(...acData.wheel_coords.map(c => Math.abs(c.x || 0)))
              const maxY = Math.max(...acData.wheel_coords.map(c => Math.abs(c.y || 0)))
              const maxXY = Math.max(maxX, maxY)
              const computed = Math.ceil((maxXY * 1.4) / 10) * 10
              extent = Math.max(extent, computed)
              console.log(`[fetchLeafGrid] Auto-scaled gridExtent for ${ac.icao}: ${extent}" (wheels at ±${maxX.toFixed(0)}, ±${maxY.toFixed(0)})`)
            }
          }
        } catch (e) { console.warn('[fetchLeafGrid] aircraft lookup failed:', e) }
      }
    }

    const res = await fetch(`${BASE}/api/leaf/grid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layers, subgrade, aircraft: ac, evalDepthIn, gridExtentIn: extent, gridPoints })
    })
    if (!res.ok) return { data: null, source: 'error' }
    return { data: await res.json(), source: 'native' }
  } catch {
    return { data: null, source: 'unavailable' }
  }
}

export async function fetchFullCdf(layers, subgrade, aircraftList, growth, life, flexStr, sci = 80, acMixDesign = {}, useFem3d = false) {
  try {
    const res = await fetch(`${BASE}/api/analysis/cdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        layers, subgrade,
        // AC mix design for RDEC model (0 = use FAARFIELD defaults)
        acFlexuralMod: acMixDesign.flexuralMod || 0,
        acAirVoids: acMixDesign.airVoids || 0,
        acAsphaltVol: acMixDesign.asphaltVol || 0,
        acPNMS: acMixDesign.pnms || 0,
        acPPCS: acMixDesign.ppcs || 0,
        acP200: acMixDesign.p200 || 0,
        aircraft: aircraftList.map(a => ({
          icao: a.type || a.icao || '',
          name: a.type || a.icao || 'Aircraft',
          mtow: a.mtow || 50000,
          gear: a.gear || 'S',
          annualDeps: a.annual_deps || a.annualDeps || 1,
          mgPct: 0.95,
          tirePressure: 0,
        })),
        growth, life, flexStr, sci,
        designType: 'FlexOnRigid',
        runMode: 'cdf',
        useFem3d,
      })
    })
    if (!res.ok) return { data: null, source: 'error' }
    return { data: await res.json(), source: 'native' }
  } catch {
    return { data: null, source: 'unavailable' }
  }
}

export async function fetchDesign(layers, subgrade, aircraftList, growth, life, flexStr, sci = 80, acMixDesign = {}) {
  try {
    const res = await fetch(`${BASE}/api/analysis/design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        layers, subgrade,
        acFlexuralMod: acMixDesign.flexuralMod || 0,
        acAirVoids: acMixDesign.airVoids || 0,
        acAsphaltVol: acMixDesign.asphaltVol || 0,
        acPNMS: acMixDesign.pnms || 0,
        acPPCS: acMixDesign.ppcs || 0,
        acP200: acMixDesign.p200 || 0,
        aircraft: aircraftList.map(a => ({
          icao: a.type || a.icao || '',
          name: a.type || a.icao || 'Aircraft',
          mtow: a.mtow || 50000,
          gear: a.gear || 'S',
          annualDeps: a.annual_deps || a.annualDeps || 1,
          mgPct: 0.95,
          tirePressure: 0,
        })),
        growth, life, flexStr, sci,
        designType: 'FlexOnRigid',
        runMode: 'design',
      })
    })
    if (!res.ok) return { data: null, source: 'error' }
    return { data: await res.json(), source: 'native' }
  } catch {
    return { data: null, source: 'unavailable' }
  }
}

export async function fetchFem3dMesh(layers, subgrade, aircraft, highDetail = false, filterCoarse = true, includeStressField = false, stressAggregation = 'mean', sectionKey = null) {
  const icao = aircraft.type || aircraft.icao || ''
  const ac = {
    name: icao || aircraft.name || 'Aircraft',
    icao,
    gear: aircraft.gear || '',
    mtow: aircraft.mtow || 0,
    gearLoad: aircraft.gearLoad || (aircraft.mtow || 50000) * 0.95,
    nTires: aircraft.nTires || 2,
    tirePressure: aircraft.tirePressure || 200,
    tireSpacingIn: aircraft.tireSpacingIn || 34,
  }

  // Precal-first (see fetchLeafGrid). Avoids 5-15 s FEM3D recomputes when
  // browsing aircraft on as-built sections.
  if (sectionKey && icao) {
    const precal = await loadPrecal(sectionKey, icao, layers, subgrade, 'fem3dMesh')
    if (precal) return precal
  }

  try {
    const res = await fetch(`${BASE}/api/fem3d/mesh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        layers: layers.map(l => ({ type: l.type, h: l.h, E: l.E, nu: l.nu })),
        subgrade,
        aircraft: ac,
        highDetail,
        filterCoarse,
        includeStressField,
        stressAggregation,
      })
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[fetchFem3dMesh] HTTP', res.status, body.slice(0, 500))
      return { data: null, source: `error ${res.status}`, detail: body.slice(0, 300) }
    }
    return { data: await res.json(), source: 'native' }
  } catch (e) {
    console.error('[fetchFem3dMesh] exception', e)
    return { data: null, source: 'unavailable', detail: e.message }
  }
}

export async function fetchLeafProfile(layers, subgrade, aircraft, evalDepths, sectionKey = null) {
  // v2: pass icao/gear/mtow for library-resolved geometry
  const ac = {
    name: aircraft.type || aircraft.name || 'Aircraft',
    gearLoad: aircraft.gearLoad || (aircraft.mtow || 50000) * 0.95,
    nTires: aircraft.nTires || 2,
    tirePressure: aircraft.tirePressure || 200,
    tireSpacingIn: aircraft.tireSpacingIn || 34,
    icao: aircraft.type || aircraft.icao || '',
    gear: aircraft.gear || '',
    mtow: aircraft.mtow || 0,
  }

  // Precal-first (see fetchLeafGrid).
  if (sectionKey && ac.icao) {
    const precal = await loadPrecal(sectionKey, ac.icao, layers, subgrade, 'leafPoint')
    if (precal) return precal
  }

  try {
    const res = await fetch(`${BASE}/api/leaf/point`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layers, subgrade, aircraft: ac, evalDepths, evalX: 0, evalY: 0 })
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[fetchLeafProfile] HTTP', res.status, body.slice(0, 500))
      return { data: null, source: `error ${res.status}`, detail: body.slice(0, 200) }
    }
    return { data: await res.json(), source: 'native' }
  } catch (e) {
    console.error('[fetchLeafProfile] exception', e)
    return { data: null, source: 'unavailable', detail: e.message }
  }
}
