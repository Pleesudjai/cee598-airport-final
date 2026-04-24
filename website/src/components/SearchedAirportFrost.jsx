import { useEffect, useState } from 'react'
import { getFrostForCoord, frostClassFromAASHTO, BERGGREN_K, FROST_CLASSES } from '../lib/frost'

const FROST_CLASS_COLOR = {
  'FG-1': '#16a34a',
  'FG-2': '#a3a61a',
  'FG-3': '#ea580c',
  'FG-4': '#dc2626',
}

function tierColor(tier) {
  if (tier?.startsWith('INADEQUATE')) return '#dc2626'
  if (tier === 'No special treatment required') return '#16a34a'
  if (tier === 'Complete frost protection') return '#16a34a'
  if (tier === 'Limited subgrade frost penetration') return '#ca8a04'
  return '#737784'
}

/**
 * Live frost-protection lookup for any searched airport.
 * Uses the client-side `lib/frost.js` module which:
 *   1. Looks up nearest GHCN-D station from the local 26k-station inventory
 *   2. Fetches the station's daily 1991-2020 TAVG normals via /noaa Vite proxy
 *   3. Computes Air Freezing Index, modified Berggren frost depth,
 *      and FAA AC 150/5320-6F treatment tier
 *
 * Recomputes whenever lat/lon, AASHTO group, or pavement thickness changes.
 */
export default function SearchedAirportFrost({ airport, aashtoGroup, pavementIn = 14 }) {
  const [frost, setFrost] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [classOverride, setClassOverride] = useState(null)

  // Reset when airport changes
  useEffect(() => {
    setFrost(null); setError(null); setClassOverride(null)
  }, [airport?.icao])

  async function runFrost() {
    if (!airport?.lat || !airport?.lon) return
    setLoading(true); setError(null); setFrost(null)
    try {
      const result = await getFrostForCoord(airport.lat, airport.lon, {
        aashtoGroup,
        frostClass: classOverride,
        pavementIn,
      })
      if (result?.error) setError(result.error)
      else setFrost(result)
    } catch (e) {
      setError(String(e))
    }
    setLoading(false)
  }

  // Auto-run on airport change, on AASHTO change, or on pavement-thickness change.
  useEffect(() => { if (airport?.lat && airport?.lon) runFrost() },
    [airport?.lat, airport?.lon, aashtoGroup, pavementIn, classOverride])

  if (!airport?.lat || !airport?.lon) return null

  const inferredClass = classOverride || frostClassFromAASHTO(aashtoGroup)
  const compliant = frost?.treatment?.compliant

  return (
    <div className="bg-surface-lowest rounded-xl p-4 border border-outline-variant/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">ac_unit</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface">
            Frost Protection (FAA AC 150/5320-6F)
          </p>
        </div>
        <span className="text-[9px] text-outline">NOAA Climate Normals 1991–2020 · live</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-outline">
          <span className="material-symbols-outlined text-primary animate-spin text-sm">progress_activity</span>
          Looking up nearest NOAA station + computing frost depth...
        </div>
      )}

      {error && (
        <div className="text-xs text-failing bg-failing/5 rounded p-2">
          <strong>Frost lookup failed:</strong> {error}
        </div>
      )}

      {frost && !loading && (
        <div className="space-y-3 text-xs">
          {/* Station + AFI summary */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Climate Station</p>
              <p className="text-on-surface font-medium">{frost.station.name}</p>
              <p className="text-[10px] text-outline">
                {frost.station.id} · {frost.station.state} · {frost.station.distance_mi} mi from airport
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Air Freezing Index</p>
              <p className="font-mono text-base font-bold text-on-surface">
                {frost.airfreezingIndex_Fdays.toFixed(1)} <span className="text-[10px] font-normal text-outline">°F·days</span>
              </p>
              <p className="text-[10px] text-outline">
                {frost.freezingDaysPerYear} freezing days/yr · coldest {frost.coldestNormal_F?.toFixed(1)}°F ({frost.coldestNormalDay})
              </p>
            </div>
          </div>

          {/* Frost class override + result */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Subgrade frost class</p>
              <select value={frost.subgradeFrostClass}
                      onChange={e => setClassOverride(e.target.value)}
                      className="w-full bg-surface-low border-none rounded px-2 py-1 text-xs font-mono">
                {FROST_CLASSES.map(c => (
                  <option key={c} value={c}>{c}  (K={BERGGREN_K[c]})</option>
                ))}
              </select>
              <p className="text-[10px] text-outline mt-0.5">
                {aashtoGroup ? `From AASHTO ${aashtoGroup}` : 'Default — adjust if soil differs'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Frost depth</p>
              <p className="font-mono text-base font-bold" style={{ color: FROST_CLASS_COLOR[frost.subgradeFrostClass] }}>
                {frost.frostDepthIn}″
              </p>
              <p className="text-[10px] text-outline">Modified Berggren  X = K · √AFI</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Pavement total</p>
              <p className="font-mono text-base font-bold text-on-surface">{frost.pavementTotalIn}″</p>
              <p className="text-[10px] text-outline">AC + PCC + base layers</p>
            </div>
          </div>

          {/* Treatment tier */}
          <div className={`rounded-lg p-3 border-l-4 ${compliant ? 'bg-adequate/5 border-adequate' : 'bg-failing/5 border-failing'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
               style={{ color: tierColor(frost.treatment.tier) }}>
              FAA Treatment Tier
            </p>
            <p className="text-sm font-bold" style={{ color: tierColor(frost.treatment.tier) }}>
              {frost.treatment.tier}
            </p>
            <p className="text-[11px] text-outline mt-1">{frost.treatment.rationale}</p>
            {!compliant && frost.treatment.limitedDepthIn && (
              <div className="text-[11px] mt-2 pt-2 border-t border-outline-variant/20">
                <strong className="text-failing">Recommended treatment:</strong>{' '}
                Extend non-frost-susceptible base/subbase to a minimum depth of{' '}
                <strong>{frost.treatment.limitedDepthIn}″</strong> (limited frost penetration), or{' '}
                to <strong>{frost.treatment.completeDepthIn}″</strong> for complete protection.
              </div>
            )}
          </div>
        </div>
      )}

      {!frost && !loading && !error && (
        <p className="text-xs text-outline">
          No coordinates yet. Search an airport above to compute frost.
        </p>
      )}
    </div>
  )
}
