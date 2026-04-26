// CDF vs Load-Adjusted Deduct scatter — the centerpiece field-validation chart.
// X = predicted CDF (log scale).  Y = (100 − latest PCI) × pct_load/100.
// Spec: specs/distress-trend-vs-cdf-panel.md (Phase 4)

import { useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer, Cell, Label,
} from 'recharts'
import pciData from '../data/pci_distress.json'
import { pciKeyFor, loadAdjustedDeduct } from '../lib/distressClassification'

const REHAB_NOTES = {
  // Documented rehab artifacts for KOTM 27450/27641 — predicted CDF was high
  // before rehab, but PCI resets after overlay/reconstruction.  Surface in tooltip.
  KOTM_27450: 'Rehab artifact — overlay/reconstruction reset the PCI clock',
  KOTM_27641: 'Rehab artifact — overlay/reconstruction reset the PCI clock',
  KMWH_37325: 'Verdict driven by C-17 (12-wheel 2T tridem)',
  KMWH_37508: 'Verdict driven by C-17 (12-wheel 2T tridem)',
}

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="bg-surface-lowest border border-outline-variant/20 rounded-lg p-2.5 text-[11px] shadow-lg max-w-[300px]">
      <div className="font-bold text-on-surface mb-1">
        {p.icao} · {p.section_id}
      </div>
      <div className="text-[10px] text-outline mb-1.5">{p.desc}</div>
      <div>Predicted CDF (max): <span className="font-mono font-bold">{p.cdf < 0.01 ? p.cdf.toExponential(2) : p.cdf.toFixed(3)}</span></div>
      <div>Controlling layer: <span className="font-mono">{p.controlling}</span></div>
      <div className="mt-1 pt-1 border-t border-outline-variant/20">
        Latest PCI: <span className="font-mono font-bold">{p.pci_latest != null ? p.pci_latest.toFixed(1) : '—'}</span>
        <span className="text-outline ml-1">({p.pci_date || 'no data'})</span>
      </div>
      <div>Load-related share: <span className="font-mono">{p.pct_load != null ? p.pct_load.toFixed(0) + '%' : '—'}</span></div>
      <div>
        Load-adjusted deduct:{' '}
        <span className="font-mono font-bold">{p.deduct != null ? p.deduct.toFixed(1) : '—'}</span>
        <span className="text-outline ml-1">((100 − PCI) × pct_load)</span>
      </div>
      {p.rehab && (
        <div className="mt-1.5 text-[10px] text-amber-700 italic">
          ⚠ {p.rehab}
        </div>
      )}
      <div className="text-[10px] text-outline mt-1">
        Verdict: <span className={`font-bold ${p.adequate ? 'text-adequate' : 'text-failing'}`}>
          {p.adequate ? 'OVER (CDF < 1)' : 'UNDER (CDF ≥ 1)'}
        </span>
      </div>
    </div>
  )
}

export default function CdfVsPciScatter({ cdfResults, sections, onOpenInTool }) {
  const points = useMemo(() => {
    const raw = cdfResults.map(r => {
      const key = pciKeyFor(r.icao, r.section_id)
      const sect = pciData.sections[key]
      const sectionInfo = sections.find(s => s.section_id === r.section_id) || {}
      let pci_latest = null
      let pct_load = null
      let pci_date = null
      if (sect?.pci_history?.length) {
        const sorted = [...sect.pci_history].sort((a, b) => a.date.localeCompare(b.date))
        const last = sorted[sorted.length - 1]
        pci_latest = last.pci
        pct_load = last.pct_load
        pci_date = last.date
      }
      const deduct = (pci_latest != null && pct_load != null)
        ? loadAdjustedDeduct(pci_latest, pct_load)
        : null
      const cdf = Math.max(r.cdf_max ?? 0, 1e-3)
      return {
        icao: r.icao,
        section_id: r.section_id,
        desc: sectionInfo.desc || r.desc,
        cdf,
        cdf_raw: r.cdf_max,
        adequate: r.adequate,
        controlling: r.controlling,
        pci_latest,
        pct_load,
        pci_date,
        deduct,
        y: pci_latest,
        rehab: REHAB_NOTES[`${r.icao}_${r.section_id}`] || null,
      }
    }).filter(p => p.y != null)

    // ---------------------------------------------------------------------
    // Label lane assignment — avoids overlapping airport labels under dots.
    // For each point, count how many earlier points are "close" (within ~0.5
    // log10 decade in CDF and ~5 PCI). Assign successive lanes:
    //   lane 0  → below dot
    //   lane 1  → above dot
    //   lane 2  → further below
    //   lane 3  → further above
    // The dy offsets are applied in the Scatter shape function.
    // ---------------------------------------------------------------------
    const sorted = [...raw].sort((a, b) => a.cdf - b.cdf)
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i]
      const logCdf = Math.log10(Math.max(p.cdf, 1e-3))
      let cluster = 0
      for (let j = 0; j < i; j++) {
        const q = sorted[j]
        const dLog = Math.abs(logCdf - Math.log10(Math.max(q.cdf, 1e-3)))
        const dPci = Math.abs(p.y - q.y)
        if (dLog < 0.5 && dPci < 8) cluster++
      }
      // Map cluster index to dy offsets. When the dot is near the top of the
      // chart (PCI > 88) — which is the upper edge where the "CDF = 1" line
      // label also lives — force ALL labels in the cluster BELOW the dot, so
      // they never collide with the chart's top reference labels. Same trick
      // for near-bottom dots (PCI < 12), labels always go above. Otherwise
      // alternate below/above for readability.
      const nearTop = p.y > 88
      const nearBottom = p.y < 12
      let lanes
      if (nearTop)         lanes = [24, 44, 64, 84]            // all below
      else if (nearBottom) lanes = [-20, -40, -60, -80]        // all above
      else                 lanes = [24, -20, 44, -40, 64, -60] // alternating
      p.labelDy = lanes[Math.min(cluster, lanes.length - 1)]
    }
    return sorted
  }, [cdfResults, sections])

  return (
    <section>
      <div className="flex items-baseline gap-3 mb-3 flex-wrap">
        <span className="material-symbols-outlined text-primary">scatter_plot</span>
        <h3 className="text-xl font-bold tracking-tight">CDF Prediction vs Field PCI</h3>
        <span className="text-[10px] text-outline">
          ASTM D5340 inspection data, latest record per section
        </span>
      </div>

      <div className="bg-surface-lowest rounded-xl p-5 shadow-sm">
        <ResponsiveContainer width="100%" height={420}>
          <ScatterChart margin={{ top: 12, right: 28, left: 12, bottom: 36 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e2e6" />

            {/* Quadrant background tints — green = predicted+observed adequate, red = predicted+observed under */}
            <ReferenceArea x1={1e-3} x2={1} y1={70} y2={100} fill="#dcfce7" fillOpacity={0.4} stroke="none" />
            <ReferenceArea x1={1} x2={1e6} y1={0} y2={70} fill="#fee2e2" fillOpacity={0.4} stroke="none" />

            <ReferenceLine x={1} stroke="#dc2626" strokeWidth={2} strokeDasharray="4 3">
              <Label value="CDF = 1" position="top" fill="#dc2626" fontSize={10} fontWeight="bold" />
            </ReferenceLine>
            <ReferenceLine y={70} stroke="#f97316" strokeOpacity={0.7} strokeDasharray="4 3">
              <Label value="PCI = 70 (FAA M&R trigger)" position="insideTopLeft" fill="#f97316" fontSize={10} fontWeight={600} />
            </ReferenceLine>

            <XAxis
              type="number"
              dataKey="cdf"
              scale="log"
              domain={[1e-3, 1e5]}
              ticks={[1e-3, 1e-2, 1e-1, 1, 10, 100, 1000, 1e4, 1e5]}
              tickFormatter={v =>
                v < 0.01 ? v.toExponential(0) :
                v < 1    ? v.toString() :
                           v.toExponential(0)
              }
              tick={{ fontSize: 10 }}
              label={{ value: 'Predicted CDF (max) — log scale', position: 'insideBottom', offset: -16, style: { fontSize: 11, fill: '#737784' } }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 100]}
              ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
              tick={{ fontSize: 10 }}
              label={{ value: 'PCI (latest inspection)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#737784', textAnchor: 'middle' } }}
            />
            <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />

            <Scatter
              name="Sections"
              data={points}
              shape={(props) => {
                const { cx, cy, payload } = props
                if (cx == null || cy == null) return null
                const fill = payload.adequate ? '#16a34a' : '#dc2626'
                const stroke = payload.rehab ? '#f59e0b' : '#1f2937'
                return (
                  <g
                    style={{ cursor: onOpenInTool ? 'pointer' : 'default' }}
                    onClick={onOpenInTool ? () => onOpenInTool(payload.icao, payload.section_id) : undefined}
                  >
                    <circle cx={cx} cy={cy} r={9} fill={fill} stroke={stroke} strokeWidth={payload.rehab ? 2.5 : 1.5} fillOpacity={0.85} />
                    {/* Faint connector line from dot to label when label is offset further away */}
                    {Math.abs(payload.labelDy ?? 22) > 24 && (
                      <line
                        x1={cx} y1={cy + (payload.labelDy > 0 ? 9 : -9)}
                        x2={cx} y2={cy + (payload.labelDy + (payload.labelDy > 0 ? -8 : 4))}
                        stroke="#9ca3af" strokeWidth="0.7" strokeDasharray="1 2"
                      />
                    )}
                    <text
                      x={cx}
                      y={cy + (payload.labelDy ?? 22)}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#1f2937"
                      fontWeight="600"
                    >
                      {payload.icao} · {payload.section_id}
                    </text>
                  </g>
                )
              }}
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>

        <div className="mt-3 grid grid-cols-2 gap-4 text-[11px] text-outline">
          <div>
            <span className="font-bold text-on-surface">Reading the chart:</span>{' '}
            ● green dot = OVER-designed (CDF &lt; 1) · ● red dot = UNDER-designed (CDF ≥ 1) ·
            ◯ amber outline = rehab artifact or special note (see tooltip)
          </div>
          <div>
            <span className="font-bold text-on-surface">Validation pattern:</span>{' '}
            green dots should cluster upper-left (low CDF + high PCI = predicted &amp; observed adequate);
            red dots should cluster lower-right (high CDF + low PCI = predicted &amp; observed under-designed).
          </div>
        </div>
      </div>
    </section>
  )
}
