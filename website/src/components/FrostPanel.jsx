import frostData from '../data/frost_data.json'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer, Cell
} from 'recharts'

// Frost-class palette: lightest blue = FG-1 (negligible) → deepest blue = FG-4 (high).
// "Cold severity" reads as colder/deeper blue.  Inadequate verdicts kept in red
// for severity contrast; compliant verdicts stay in the blue family.
const FROST_CLASS_COLOR = {
  'FG-1': '#7dd3fc',   // sky-300 — coldest tolerance (negligible susceptibility)
  'FG-2': '#38bdf8',   // sky-400
  'FG-3': '#0284c7',   // sky-600 — concern
  'FG-4': '#0c4a6e',   // sky-900 — most susceptible
}

function tierColor(tier) {
  if (tier?.startsWith('INADEQUATE')) return '#dc2626'                          // red — severity
  if (tier === 'No special treatment required') return '#0369a1'                // sky-700 — calm blue
  if (tier === 'Complete frost protection')    return '#0369a1'                 // sky-700
  if (tier === 'Limited subgrade frost penetration') return '#075985'           // sky-800 (slightly more attention)
  return '#64748b'
}

function tierBg(tier) {
  if (tier?.startsWith('INADEQUATE')) return '#fee2e2'    // red-100
  return '#e0f2fe'                                         // sky-100
}

export default function FrostPanel({ onSelectAirport }) {
  const airports = frostData.airports
  const inadequateCount = airports.filter(a => !a.recommendation?.compliant).length
  const okCount = airports.length - inadequateCount

  const chartData = airports.map(a => ({
    icao: a.icao,
    afi: a.air_freezing_index_F_days,
    frost: a.frost_depth_in,
    pavement: a.pavement_total_in,
    class: a.subgrade.frost_class,
    compliant: a.recommendation?.compliant,
  }))

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-primary">ac_unit</span>
        <h3 className="text-xl font-bold tracking-tight">Frost Protection — FAA AC 150/5320-6F Check</h3>
        <span className="ml-auto text-[10px] text-outline">
          NOAA NCEI Climate Normals 1991–2020 · Modified Berggren frost depth · Per-airport subgrade frost class
        </span>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Summary card */}
        <div className="col-span-3 bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Frost-Protection Summary</p>
          <div className="flex items-center justify-around mt-3">
            <div className="text-center">
              <div className="text-3xl font-extrabold text-failing">{inadequateCount}</div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-failing">Inadequate</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-adequate">{okCount}</div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-adequate">Compliant</p>
            </div>
          </div>
          <p className="text-[11px] text-outline mt-4">
            Frost penetration depth computed per modified Berggren equation from NOAA Air Freezing Index (AFI). Treatment tiers per FAA AC 150/5320-6F Chapter 3.
          </p>
        </div>

        {/* Bar chart: AFI × frost depth */}
        <div className="col-span-9 bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">
            Frost penetration vs total pavement section per airport (in)
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e2e6" />
              <XAxis dataKey="icao" tick={{ fontSize: 12, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 11, fill: '#737784' }} label={{ value: 'inches', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#737784' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="frost" name="Berggren frost depth (in)" radius={[3,3,0,0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={FROST_CLASS_COLOR[d.class]} />
                ))}
              </Bar>
              <Bar dataKey="pavement" name="Total pavement section (in)" fill="#0047ab" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-outline mt-2">
            Bar color reflects subgrade frost-susceptibility class (FG-1 green / FG-2 olive / FG-3 orange / FG-4 red). When the frost-depth bar exceeds the pavement-thickness bar AND the frost class is FG-2/3/4, the FAA treatment tier flips to "inadequate".
          </p>
        </div>

        {/* Per-airport detail table — blue-themed, fixed column widths for legibility.
            Layout (left → right): ID · climate-data inputs · subgrade × frost depth ·
            pavement comparison · verdict.  Numeric columns right-aligned with
            consistent units; station-note is on its own subtle line. */}
        <div className="col-span-12 rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]"
             style={{ background: '#f0f9ff' /* sky-50 */ }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
             style={{ color: '#0c4a6e' }}>
            <span className="material-symbols-outlined text-base">ac_unit</span>
            Per-airport frost-protection assessment
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <colgroup>
                <col style={{ width: '6%'  }} /> {/* ICAO */}
                <col style={{ width: '24%' }} /> {/* Climate station */}
                <col style={{ width: '10%' }} /> {/* AFI */}
                <col style={{ width: '8%'  }} /> {/* Freezing days */}
                <col style={{ width: '9%'  }} /> {/* FG class */}
                <col style={{ width: '11%' }} /> {/* Frost depth */}
                <col style={{ width: '11%' }} /> {/* Pavement */}
                <col style={{ width: '21%' }} /> {/* Treatment tier */}
              </colgroup>
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: '#0c4a6e', background: '#bae6fd' /* sky-200 */ }}>
                  <th className="text-left py-2 px-3 rounded-l-md">Airport</th>
                  <th className="text-left py-2 px-3" title="NOAA GHCN-D station providing the 1991-2020 climate normals">Climate station</th>
                  <th className="text-right py-2 px-3" title="Air Freezing Index = Σ max(0, 32 − TAVG_d) over the year">AFI <span className="font-normal lowercase">(°F·d)</span></th>
                  <th className="text-right py-2 px-3" title="Days per year with TAVG below freezing in the 30-year normals">Freeze d/yr</th>
                  <th className="text-center py-2 px-3" title="FAA AC 150/5320-6F Table 3-2 subgrade frost-susceptibility class">FG class</th>
                  <th className="text-right py-2 px-3" title="Modified Berggren frost penetration depth, X = K·√AFI">Frost depth</th>
                  <th className="text-right py-2 px-3" title="Total pavement section (AC + PCC + base) for the controlling structure">Pavement</th>
                  <th className="text-left py-2 px-3 rounded-r-md">Treatment tier</th>
                </tr>
              </thead>
              <tbody>
                {airports.map((a, i) => {
                  const compliant = a.recommendation?.compliant
                  const rowBg = i % 2 === 0 ? '#ffffff' : '#f0f9ff'   // alternating white / sky-50
                  return (
                    <tr key={a.icao}
                        className="cursor-pointer transition-colors"
                        style={{ background: !compliant ? '#fef2f2' /* red-50 */ : rowBg, borderBottom: '1px solid #e0f2fe' }}
                        onMouseOver={e => { if (compliant) e.currentTarget.style.background = '#e0f2fe' }}
                        onMouseOut={e => { if (compliant) e.currentTarget.style.background = rowBg }}
                        onClick={() => onSelectAirport?.(a.icao)}>
                      <td className="py-2.5 px-3 font-mono font-bold" style={{ color: '#0c4a6e' }}>{a.icao}</td>
                      <td className="py-2.5 px-3">
                        <div style={{ color: '#0c4a6e', fontWeight: 500 }}>{a.station_name}</div>
                        {a.station_note && (
                          <div className="text-[10px] italic mt-0.5" style={{ color: '#64748b' }}>↳ {a.station_note}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono" style={{ color: '#075985' }}>{a.air_freezing_index_F_days?.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right font-mono" style={{ color: '#075985' }}>{a.freezing_days_per_year}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded text-white"
                              style={{ background: FROST_CLASS_COLOR[a.subgrade.frost_class] }}
                              title={a.subgrade.class_rationale}>
                          {a.subgrade.frost_class}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold" style={{ color: !compliant ? '#dc2626' : '#0c4a6e' }}>
                        {a.frost_depth_in}″
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono" style={{ color: '#0c4a6e' }}>{a.pavement_total_in}″</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-bold px-2 py-1 rounded inline-block"
                              style={{ background: tierBg(a.recommendation?.tier), color: tierColor(a.recommendation?.tier) }}>
                          {a.recommendation?.tier}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] mt-3 italic" style={{ color: '#0369a1' }}>
            Click any row to open the airport in the Design Tool. Frost-depth bold red ⇒ exceeds the FAA-AC 65 % coverage threshold; FG class chips graded from sky-300 (FG-1, negligible) to sky-900 (FG-4, high susceptibility).
          </p>
        </div>

        {/* Inadequate sections — recommendations.  Themed with a frost-blue
            background to match the panel's "frost / freeze" visual identity
            (rather than a generic red "failing" treatment).  The chip + ICAO
            still use the failing red for severity. */}
        {inadequateCount > 0 && (
          <div className="col-span-12 rounded-xl p-5 border-l-4 border-[#0c4a6e]"
               style={{ background: '#e0f2fe' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
               style={{ color: '#0c4a6e' }}>
              <span className="material-symbols-outlined text-base">ac_unit</span>
              Frost-Inadequate Sections — Recommended Treatment
            </p>
            <div className="grid grid-cols-2 gap-4">
              {airports.filter(a => !a.recommendation?.compliant).map(a => (
                <div key={a.icao} className="rounded-lg p-4 border"
                     style={{ background: '#f0f9ff', borderColor: '#bae6fd' }}>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm font-bold text-failing">{a.icao}</span>
                    <span className="text-[10px] font-mono" style={{ color: '#075985' }}>
                      AFI = {a.air_freezing_index_F_days?.toFixed(0)} °F·d  ·  {a.subgrade.frost_class}  ·  Frost {a.frost_depth_in}″ vs Pavement {a.pavement_total_in}″
                    </span>
                  </div>
                  <p className="text-[11px]" style={{ color: '#0c4a6e' }}>{a.recommendation?.rationale}</p>
                  <p className="text-[10px] mt-2 italic" style={{ color: '#0369a1' }}>{a.recommendation?.design_approach}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Methodology footer */}
        <div className="col-span-12 bg-surface-low rounded-xl p-4 border-l-2 border-outline">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface mb-1">Methodology</p>
          <ul className="text-[11px] text-outline space-y-1 ml-3 list-disc">
            <li><strong>Data source:</strong> NOAA NCEI Climate Normals 1991–2020 daily TAVG, fetched per-airport from the nearest GHCN-D station.</li>
            <li><strong>Air Freezing Index (AFI):</strong> Σ max(0, 32 − TAVG_daily) over the year, units °F-days. Standard FAA pavement-design input for frost analysis.</li>
            <li><strong>Frost penetration depth:</strong> Modified Berggren simplified — X = K · √AFI, with K = 1.10 (FG-4) to 1.40 (FG-1) capturing soil thermal conductivity and latent-heat effects in a typical airport AC-over-PCC composite section.</li>
            <li><strong>Subgrade frost class:</strong> FAA AC 150/5320-6F Table 3-2, derived from the NRCS soil classification (already used for CBR/E_sub in the FAARFIELD CDF analysis).</li>
            <li><strong>Treatment tiers:</strong> "Complete frost protection" requires pavement total ≥ frost depth; "Limited subgrade frost penetration" allows ≥ 65% coverage; below 65% is flagged inadequate per AC 150/5320-6F Chapter 3.</li>
            <li><strong>Caveats:</strong> Berggren K coefficients are typical pavement values, not site-specific. For final design, conduct site-specific frost-heave tests (ASTM D5918) and apply complete Berggren formula with measured soil thermal properties.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
