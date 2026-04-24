import subgradeData from '../data/subgrade.json'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// Soil-themed palette: graded earth tones from rich loam → weak silt.
// Quality reads as soil-color: deep umber for excellent bearing soil,
// tan/beige for fair, ochre/red-brown for poor.
const QUALITY_COLOR = {
  Excellent:                    '#5d4037',   // deep umber loam
  Good:                         '#795548',   // brown loam
  'Good (weathered shale)':     '#6d4c41',   // dark brown rock
  Fair:                         '#a1887f',   // tan loam
  Poor:                         '#8d6e63',   // light umber/clay
}

// Soil base palette
const SOIL = {
  loamDeep:   '#3e2723',   // very dark brown — accents
  loamMid:    '#5d4037',   // dark brown — primary text
  loamLight:  '#795548',   // brown — secondary
  tan:        '#a1887f',   // tan — values
  beigeBg:    '#efebe9',   // brown-50 — panel bg
  ivoryBg:    '#fafaf7',   // ivory — alternating row
  sandBg:     '#d7ccc8',   // brown-200 — header bg
  rust:       '#bf360c',   // burnt sienna — alerts
}

export default function SubgradeChart() {
  const data = Object.entries(subgradeData).map(([icao, s]) => ({
    icao, cbr: s.cbr, soil: s.soil, aashto: s.aashto, quality: s.quality,
    E: s.E, k: s.k, drainage: s.drainage,
    color: QUALITY_COLOR[s.quality] || SOIL.tan,
  }))

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined" style={{ color: SOIL.loamDeep }}>landscape</span>
        <h3 className="text-xl font-bold tracking-tight" style={{ color: SOIL.loamDeep }}>Subgrade Comparison</h3>
        <span className="text-[10px] font-bold uppercase tracking-widest ml-2"
              style={{ color: SOIL.loamLight }}>
          Source: USDA NRCS Web Soil Survey
        </span>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* CBR bar chart card */}
        <div className="col-span-5 rounded-xl p-5 shadow-[0px_12px_32px_rgba(70,40,20,0.08)]"
             style={{ background: SOIL.beigeBg, borderLeft: `4px solid ${SOIL.loamMid}` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
             style={{ color: SOIL.loamDeep }}>
            <span className="material-symbols-outlined text-base">terrain</span>
            CBR by Airport
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={SOIL.sandBg} />
              <XAxis dataKey="icao" tick={{ fontSize: 11, fontWeight: 700, fill: SOIL.loamDeep }} stroke={SOIL.loamLight} />
              <YAxis tick={{ fontSize: 10, fill: SOIL.loamMid }}
                     label={{ value: 'CBR', angle: -90, position: 'insideLeft', fontSize: 10, fill: SOIL.loamDeep }}
                     stroke={SOIL.loamLight} />
              <Tooltip
                contentStyle={{
                  fontSize: 12, borderRadius: 8, border: `1px solid ${SOIL.tan}`,
                  background: SOIL.ivoryBg, color: SOIL.loamDeep,
                  boxShadow: '0 4px 12px rgba(70,40,20,0.15)',
                }}
                cursor={{ fill: 'rgba(141,110,99,0.10)' }}
              />
              <Bar dataKey="cbr" radius={[3, 3, 0, 0]}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] mt-3 italic" style={{ color: SOIL.loamLight }}>
            Bars colored by quality class — deep umber = excellent bearing, lighter tan = weaker subgrade.
          </p>
        </div>

        {/* Soil properties table card */}
        <div className="col-span-7 rounded-xl p-5 shadow-[0px_12px_32px_rgba(70,40,20,0.08)]"
             style={{ background: SOIL.beigeBg, borderLeft: `4px solid ${SOIL.loamMid}` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
             style={{ color: SOIL.loamDeep }}>
            <span className="material-symbols-outlined text-base">grain</span>
            Soil Properties
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <colgroup>
                <col style={{ width: '8%'  }} />
                <col style={{ width: '32%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '8%'  }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '17%' }} />
              </colgroup>
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: SOIL.loamDeep, background: SOIL.sandBg }}>
                  <th className="text-left py-2 px-3 rounded-l-md">ICAO</th>
                  <th className="text-left py-2 px-3">Soil</th>
                  <th className="text-left py-2 px-3" title="AASHTO classification group">AASHTO</th>
                  <th className="text-right py-2 px-3" title="California Bearing Ratio">CBR</th>
                  <th className="text-right py-2 px-3" title="Resilient/elastic modulus">E (psi)</th>
                  <th className="text-right py-2 px-3" title="Modulus of subgrade reaction">k (pci)</th>
                  <th className="text-center py-2 px-3 rounded-r-md">Quality</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => (
                  <tr key={i}
                      style={{ background: i % 2 === 0 ? SOIL.ivoryBg : SOIL.beigeBg, borderBottom: `1px solid ${SOIL.sandBg}` }}>
                    <td className="py-2.5 px-3 font-mono font-bold" style={{ color: SOIL.loamDeep }}>{d.icao}</td>
                    <td className="py-2.5 px-3" style={{ color: SOIL.loamMid }}>{d.soil}</td>
                    <td className="py-2.5 px-3 font-mono" style={{ color: SOIL.loamMid }}>{d.aashto}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold" style={{ color: d.color }}>{d.cbr}</td>
                    <td className="py-2.5 px-3 text-right font-mono" style={{ color: SOIL.loamLight }}>{d.E?.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono" style={{ color: SOIL.loamLight }}>{d.k}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded inline-block"
                            style={{ color: '#fff', background: d.color }}>
                        {d.quality}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] mt-3 italic" style={{ color: SOIL.loamLight }}>
            CBR & E from FAA standard <code className="font-mono" style={{ color: SOIL.loamDeep }}>E = 1500·CBR</code>; k from <code className="font-mono" style={{ color: SOIL.loamDeep }}>k = (E/20.15)^(1/1.28405)</code>. Quality chip color = deep umber loam (excellent) → light tan (poor).
          </p>
        </div>
      </div>
    </section>
  )
}
