import { useState } from 'react'
import subgradeData from '../data/subgrade.json'
import traffic from '../data/traffic.json'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts'

function CrossSectionSmall({ layers, subgrade }) {
  const maxH = layers.reduce((s, l) => s + l.h, 0)
  const scale = 140 / Math.max(maxH, 8)
  const colors = { 'P-401 AC': '#1a1a2e', 'P-501 PCC': '#a0aec0', 'P-154 Subbase': '#d4a574', 'Stabilized Base': '#b8c9e0', 'Stabilized Subbase': '#b8c9e0', 'P-209 Agg Base': '#c4a882' }
  let y = 4
  return (
    <svg viewBox="0 0 360 180" className="w-full max-w-[360px]">
      {layers.map((l, i) => {
        const h = l.h * scale
        const typeLabel = (l.type || '').replace(/^P-\d+\s+/, '')
        const rect = <g key={i}>
          <rect x="20" y={y} width="320" height={h} fill={colors[l.type] || '#ccc'} rx="3" stroke="#737784" strokeWidth="0.5" />
          <text x="180" y={y + h/2 + 4} textAnchor="middle" fontSize="11" fill={i === 0 ? '#fff' : '#1a1c1e'} fontWeight="700">
            {typeLabel}
          </text>
          <text x="332" y={y + h/2 + 4} textAnchor="end" fontSize="10" fill={i === 0 ? '#ccc' : '#737784'} fontWeight="600">
            {l.h}"
          </text>
        </g>
        y += h
        return rect
      })}
      <rect x="20" y={y} width="320" height={28} fill="#d4b896" rx="3" opacity="0.45" />
      <text x="180" y={y + 17} textAnchor="middle" fontSize="11" fill="#651f00" fontWeight="600">
        Subgrade · CBR = {subgrade?.cbr}
      </text>
    </svg>
  )
}

export default function AirportAccordion({ airport, sections: allSections, cdfResults, onOpenInTool }) {
  const [open, setOpen] = useState(false)
  const aptSections = allSections.filter(s => s.icao === airport.icao)
  const aptResults = cdfResults.filter(r => r.icao === airport.icao)
  const underCount = aptResults.filter(r => !r.adequate).length
  const sub = subgradeData[airport.icao]
  const trafficData = traffic[airport.icao]

  const chartData = aptResults.map(r => ({
    name: r.section_id,
    cdf_ac: r.cdf_ac,
    cdf_sub: r.cdf_sub,
    cdf_pcc: r.cdf_pcc,
  }))

  return (
    <div className="bg-surface-lowest rounded-xl shadow-[0px_12px_32px_rgba(25,28,30,0.06)] mb-4 overflow-hidden">
      {/* Header — always visible (div, not button, because it contains nested buttons) */}
      <div role="button" tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open) } }}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-low transition-colors text-left cursor-pointer">
        <div className="flex items-center gap-4">
          <span className={`w-3 h-3 rounded-full ${underCount > 0 ? 'bg-failing' : 'bg-adequate'}`} />
          <div>
            <span className="text-lg font-bold text-on-surface">{airport.icao}</span>
            <span className="text-sm text-outline ml-3">{airport.name}, {airport.state}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-outline bg-surface-low px-2 py-0.5 rounded">
            {aptSections.length} section{aptSections.length > 1 ? 's' : ''}
          </span>
          {underCount > 0 ? (
            <span className="text-[10px] font-bold uppercase tracking-widest text-failing bg-failing/10 px-2 py-0.5 rounded">
              {underCount} under-designed
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-widest text-adequate bg-adequate/10 px-2 py-0.5 rounded">
              All adequate
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={e => { e.stopPropagation(); onOpenInTool(airport.icao) }}
            className="text-[10px] font-bold text-primary hover:underline">
            Open in Design Tool →
          </button>
          <span className={`material-symbols-outlined text-outline transition-transform ${open ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </div>
      </div>

      {/* Expanded content */}
      {open && (
        <div className="px-6 pb-6 space-y-6">
          {/* Pavement Sections — 3 per row grid */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">Pavement Sections</p>
            <div className="grid grid-cols-3 gap-4">
              {aptSections.map(sec => {
                const result = aptResults.find(r => r.section_id === sec.section_id)
                return (
                  <div key={sec.section_id} className="bg-surface-low rounded-lg p-4 text-center">
                    <div className="flex items-baseline justify-between mb-1">
                      <p className="text-sm font-bold">{sec.section_id}</p>
                      <p className="text-[10px] text-outline">{sec.use}</p>
                    </div>
                    <div className="flex justify-center">
                      <CrossSectionSmall layers={sec.layers} subgrade={sec.subgrade} />
                    </div>
                    <p className="text-xs font-mono mt-2 text-outline">{sec.desc}</p>
                    <span className={`inline-block mt-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded ${
                      result?.adequate ? 'bg-adequate/10 text-adequate' : 'bg-failing/10 text-failing'
                    }`}>
                      CDF = {result?.cdf_max < 0.01 ? result?.cdf_max?.toExponential(2) : result?.cdf_max?.toFixed(3)}
                      {' · '}{result?.adequate ? 'OVER' : 'UNDER'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Chart + Info row */}
          <div className="grid grid-cols-12 gap-6">
            {/* CDF Chart */}
            <div className="col-span-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">CDF by Failure Mode</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e2e6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none' }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <ReferenceLine y={1} stroke="#ba1a1a" strokeDasharray="4 3" />
                  <Bar dataKey="cdf_ac" name="AC Fatigue" fill="#4e5e85" radius={[2,2,0,0]} />
                  <Bar dataKey="cdf_sub" name="Subgrade" fill="#059669" radius={[2,2,0,0]} />
                  <Bar dataKey="cdf_pcc" name="PCC Fatigue" fill="#00327d" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Info cards */}
            <div className="col-span-4 space-y-3">
              {/* Subgrade */}
              {sub && (
                <div className="bg-surface-low rounded-lg p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">Subgrade</p>
                  <p className="text-xs font-medium">{sub.soil}</p>
                  <p className="text-xs text-outline">AASHTO {sub.aashto}</p>
                  <p className="text-sm font-bold mt-1">CBR = {sub.cbr} <span className="text-xs font-normal text-outline">({sub.quality})</span></p>
                </div>
              )}
              {/* Traffic */}
              {trafficData && (
                <div className="bg-surface-low rounded-lg p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">Traffic</p>
                  <p className="text-xs">{trafficData.aircraft.length} aircraft types</p>
                  <p className="text-xs text-outline">Base year: {trafficData.base_year}</p>
                  <p className="text-xs text-outline">Growth: {(trafficData.growth * 100).toFixed(1)}%</p>
                </div>
              )}
              {/* Results table */}
              <div className="bg-surface-low rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">Results</p>
                {aptResults.map(r => (
                  <div key={r.section_id} className="flex items-center justify-between text-xs py-0.5">
                    <span className="font-mono">{r.section_id}</span>
                    <span className={`font-bold ${r.adequate ? 'text-adequate' : 'text-failing'}`}>
                      {r.adequate ? 'OVER' : 'UNDER'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
