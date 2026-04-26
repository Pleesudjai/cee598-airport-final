// PCI History line chart per section.
// Shows the 4–7 inspection records over time on the standard ASTM D5340
// 0–100 scale with the 7 rating bands as horizontal reference areas.
// Spec: specs/distress-trend-vs-cdf-panel.md (Phase 2)

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter,
  ComposedChart,
} from 'recharts'
import pciData from '../data/pci_distress.json'
import { ASTM_D5340_BANDS, pciKeyFor, dateToMs, pctLoadColor } from '../lib/distressClassification'

function PciHistoryTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="bg-surface-lowest border border-outline-variant/20 rounded-lg p-2.5 text-[11px] shadow-lg">
      <div className="font-bold text-on-surface">{p.dateLabel}</div>
      <div>PCI: <span className="font-mono font-bold">{p.pci.toFixed(1)}</span> · {p.band}</div>
      <div>
        Load-related share:{' '}
        <span className="font-mono">{p.pct_load.toFixed(0)}%</span>
        <span className="text-outline ml-1">({p.pctLoadInterp})</span>
      </div>
      {p.sample > 0 && <div className="text-outline">Sample units inspected: {p.sample}</div>}
    </div>
  )
}

export default function PciHistoryChart({ icao, sectionId, height = 220 }) {
  const key = pciKeyFor(icao, sectionId)
  const sect = pciData.sections[key]
  if (!sect || !sect.pci_history?.length) {
    return (
      <div className="bg-surface-lowest rounded-lg p-4 text-center text-[11px] text-outline">
        No PCI history data available for {icao} {sectionId}
      </div>
    )
  }

  const constructionMs = dateToMs(sect.construction_date)

  const dataPoints = sect.pci_history.map(h => {
    const ms = dateToMs(h.date)
    const pct = h.pct_load ?? 0
    const interp = pct < 25 ? 'mostly climate' :
                   pct < 50 ? 'mixed (climate-leaning)' :
                   pct < 75 ? 'mixed (load-leaning)' :
                              'mostly load'
    const band = (ASTM_D5340_BANDS.find(b => h.pci >= b.min && h.pci <= b.max) || {}).label
    return {
      ms,
      dateLabel: h.date,
      pci: h.pci,
      pct_load: pct,
      pctLoadInterp: interp,
      sample: h.sample ?? 0,
      band,
      dotColor: pctLoadColor(pct),
    }
  }).sort((a, b) => a.ms - b.ms)

  const xMin = Math.min(constructionMs ?? Infinity, dataPoints[0].ms) - 30 * 24 * 3600 * 1000
  const xMax = dataPoints[dataPoints.length - 1].ms + 90 * 24 * 3600 * 1000

  const xTicks = []
  const startYear = new Date(xMin).getFullYear()
  const endYear = new Date(xMax).getFullYear()
  for (let y = startYear; y <= endYear; y += 2) {
    xTicks.push(new Date(`${y}-01-01`).getTime())
  }

  return (
    <div className="bg-surface-lowest rounded-lg p-4">
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
          PCI History · ASTM D5340
        </span>
        <span className="text-[10px] text-outline">
          ({dataPoints.length} inspection{dataPoints.length === 1 ? '' : 's'})
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={dataPoints} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e2e6" />

          {/* ASTM D5340 7 bands as horizontal reference areas */}
          {ASTM_D5340_BANDS.map(b => (
            <ReferenceArea
              key={b.label}
              y1={b.min} y2={b.max}
              fill={b.fill} fillOpacity={0.08}
              stroke="none"
              ifOverflow="hidden"
            />
          ))}

          {/* Threshold lines at lower bound of each band */}
          <ReferenceLine y={86} stroke="#22c55e" strokeOpacity={0.5} strokeDasharray="2 2" />
          <ReferenceLine y={71} stroke="#86efac" strokeOpacity={0.5} strokeDasharray="2 2" />
          <ReferenceLine y={56} stroke="#facc15" strokeOpacity={0.5} strokeDasharray="2 2" />
          <ReferenceLine y={41} stroke="#fbbf24" strokeOpacity={0.5} strokeDasharray="2 2" />
          <ReferenceLine y={26} stroke="#f97316" strokeOpacity={0.5} strokeDasharray="2 2" />
          <ReferenceLine y={11} stroke="#dc2626" strokeOpacity={0.5} strokeDasharray="2 2" />

          {/* Construction date marker */}
          {constructionMs && (
            <ReferenceLine
              x={constructionMs}
              stroke="#0f766e"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              label={{ value: `Built ${sect.construction_date.slice(0, 4)}`, position: 'top', fill: '#0f766e', fontSize: 10 }}
            />
          )}

          <XAxis
            dataKey="ms"
            type="number"
            domain={[xMin, xMax]}
            ticks={xTicks}
            tickFormatter={ms => new Date(ms).getFullYear()}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 11, 26, 41, 56, 71, 86, 100]}
            tick={{ fontSize: 9 }}
            label={{ value: 'PCI', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#737784' } }}
          />
          <Tooltip content={<PciHistoryTooltip />} />

          {/* The line connecting inspections */}
          <Line
            type="monotone"
            dataKey="pci"
            stroke="#1f2937"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />

          {/* Dots colored by pct_load */}
          <Scatter
            dataKey="pci"
            shape={(props) => {
              const { cx, cy, payload } = props
              if (cx == null || cy == null) return null
              return (
                <g>
                  <circle cx={cx} cy={cy} r={6} fill={payload.dotColor} stroke="#1f2937" strokeWidth={1.5} />
                </g>
              )
            }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-between mt-1 text-[10px] text-outline">
        <span>● blue = climate-driven · ● red = load-driven · ● gray = mixed</span>
        <span>Bands: Good ≥86 · Sat ≥71 · Fair ≥56 · Poor ≥41 · VPoor ≥26 · Serious ≥11</span>
      </div>
    </div>
  )
}
