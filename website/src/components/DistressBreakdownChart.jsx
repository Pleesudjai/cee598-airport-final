// Distress severity breakdown for the most-recent inspection of one section.
// Stacked bars by severity (L/M/H) within each distress code, color-grouped
// by ASTM D5340 category (load / climate / other).
// Spec: specs/distress-trend-vs-cdf-panel.md (Phase 3)

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import pciData from '../data/pci_distress.json'
import {
  classify, CATEGORY_COLORS, SEVERITY_GRAYSCALE, pciKeyFor, codeLabel, normalizeUnit,
} from '../lib/distressClassification'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="bg-surface-lowest border border-outline-variant/20 rounded-lg p-2.5 text-[11px] shadow-lg max-w-[260px]">
      <div className="font-bold text-on-surface mb-1">
        Code {p.code}: {p.label}
      </div>
      <div className="text-[10px] text-outline mb-1.5">
        Category:{' '}
        <span className={`font-bold ${
          p.category === 'load'    ? 'text-failing' :
          p.category === 'climate' ? 'text-primary' : 'text-outline'
        }`}>
          {p.category.toUpperCase()}
        </span>
        <span className="ml-2">Unit: <span className="font-mono">{p.unit}</span></span>
      </div>
      {p.L > 0 && <div>Low severity:    <span className="font-mono">{p.L.toFixed(1)} {p.unit}</span></div>}
      {p.M > 0 && <div>Medium severity: <span className="font-mono">{p.M.toFixed(1)} {p.unit}</span></div>}
      {p.H > 0 && <div>High severity:   <span className="font-mono">{p.H.toFixed(1)} {p.unit}</span></div>}
      <div className="mt-1 pt-1 border-t border-outline-variant/20">
        Total: <span className="font-mono font-bold">{p.total.toFixed(1)} {p.unit}</span>
      </div>
      <div className="text-[10px] text-outline mt-1">Inspection: {p.date}</div>
    </div>
  )
}

export default function DistressBreakdownChart({ icao, sectionId, height = 220 }) {
  const [filter, setFilter] = useState('all')   // all | load | climate
  const key = pciKeyFor(icao, sectionId)
  const sect = pciData.sections[key]

  const data = useMemo(() => {
    if (!sect?.distress_records?.length) return []
    // Find the most recent inspection date — and then aggregate that date's records.
    const latestDate = sect.distress_records.reduce((m, r) => r.date > m ? r.date : m, '')
    const latest = sect.distress_records.filter(r => r.date === latestDate)

    // Aggregate by code+severity. Bucket by (code, unit) — m and m² are
    // separate quantities (linear cracks vs area distress) and must not
    // be summed together.
    const byCodeUnit = new Map()
    for (const r of latest) {
      const code = Number(r.code)
      const cat = classify(code)
      const unit = normalizeUnit(r.unit)
      const key = `${code}::${unit}`
      const label = codeLabel(code, r.desc)
      if (!byCodeUnit.has(key)) {
        byCodeUnit.set(key, { code, label, category: cat, unit, L: 0, M: 0, H: 0, date: r.date })
      }
      const row = byCodeUnit.get(key)
      const sev = (r.severity || '').toUpperCase()
      if (sev === 'L' || sev === 'M' || sev === 'H') row[sev] += (r.qty || 0)
    }
    let rows = [...byCodeUnit.values()].map(r => ({ ...r, total: r.L + r.M + r.H }))
    // Filter
    if (filter !== 'all') rows = rows.filter(r => r.category === filter)
    // Sort by total desc within unit groups (m first, then m²)
    rows.sort((a, b) => {
      if (a.unit !== b.unit) return a.unit === 'm' ? -1 : 1
      return b.total - a.total
    })
    return rows
  }, [sect, filter])

  if (!sect?.distress_records?.length) {
    return (
      <div className="bg-surface-lowest rounded-lg p-4 text-center text-[11px] text-outline">
        No distress records available for {icao} {sectionId}
      </div>
    )
  }

  const counts = useMemo(() => {
    const r = sect.distress_records
    const dates = [...new Set(r.map(x => x.date))]
    const latest = dates.sort().pop()
    const latestRecords = r.filter(x => x.date === latest)
    // Split by category AND by unit (m vs m²) — these can't be summed together
    const byCat = {
      load:    { m: 0, 'm²': 0 },
      climate: { m: 0, 'm²': 0 },
      other:   { m: 0, 'm²': 0 },
    }
    for (const x of latestRecords) {
      const cat = classify(x.code)
      const u = normalizeUnit(x.unit)
      byCat[cat][u] += (x.qty || 0)
    }
    return { latest, byCat }
  }, [sect])

  // Load-vs-Non-load deduct fraction from the latest PCI inspection.
  // pct_load is computed by the airport's PMS using ASTM D5340 deduct curves —
  // it's the unit-agnostic comparison metric (m and m² already converted to
  // deduct points and ratioed). Non-load = (100 - pct_load).
  const loadFraction = useMemo(() => {
    if (!sect?.pci_history?.length) return null
    const sorted = [...sect.pci_history].sort((a, b) => a.date.localeCompare(b.date))
    const last = sorted[sorted.length - 1]
    if (last.pct_load == null) return null
    return {
      pctLoad:    last.pct_load,
      pctNonLoad: Math.max(0, 100 - last.pct_load),
      pci:        last.pci,
      date:       last.date,
    }
  }, [sect])

  const fmtCat = (obj) => {
    const parts = []
    if (obj.m > 0) parts.push(`${obj.m.toFixed(0)} m`)
    if (obj['m²'] > 0) parts.push(`${obj['m²'].toFixed(0)} m²`)
    return parts.length ? parts.join(' · ') : '0'
  }

  return (
    <div className="bg-surface-lowest rounded-lg p-4">
      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
          Distress Breakdown · ASTM D5340 ({counts.latest})
        </span>
        <span className="text-[10px] text-outline">
          Load: <span className="text-failing font-bold">{fmtCat(counts.byCat.load)}</span> ·
          Climate: <span className="text-primary font-bold">{fmtCat(counts.byCat.climate)}</span> ·
          Other: <span className="font-bold">{fmtCat(counts.byCat.other)}</span>
        </span>
        <div className="ml-auto flex gap-1 text-[10px]">
          {['all', 'load', 'climate'].map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-2 py-1 rounded font-bold uppercase tracking-widest ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-surface-low text-outline hover:bg-surface-low/70'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Load-vs-Non-Load deduct fraction (Option A — unit-agnostic comparison
          from ASTM D5340 deduct curves, computed by the airport's PMS). */}
      {loadFraction && (
        <div className="mb-4 p-3 bg-surface-low/40 rounded-lg">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
              Load vs Non-Load Deduct Share (latest PCI inspection {loadFraction.date})
            </span>
            <span className="text-[10px] text-outline">
              PCI = <span className="font-mono font-bold text-on-surface">{loadFraction.pci.toFixed(1)}</span>
              <span className="ml-1">→ total deduct ≈ {(100 - loadFraction.pci).toFixed(1)}</span>
            </span>
          </div>
          <div className="flex h-7 rounded overflow-hidden ring-1 ring-outline-variant/20 relative">
            <div
              className="flex items-center justify-center text-white text-[10px] font-bold whitespace-nowrap overflow-hidden"
              style={{
                width: `${Math.max(loadFraction.pctLoad, 0.5)}%`,
                background: '#dc2626',  // load = red
              }}
              title={`Load-related: ${loadFraction.pctLoad.toFixed(1)}% of total deduct`}
            >
              {loadFraction.pctLoad >= 18
                ? `Load ${loadFraction.pctLoad.toFixed(0)}%`
                : loadFraction.pctLoad >= 6
                  ? `${loadFraction.pctLoad.toFixed(0)}%`
                  : ''}
            </div>
            <div
              className="flex items-center justify-center text-white text-[10px] font-bold whitespace-nowrap overflow-hidden"
              style={{
                width: `${Math.max(loadFraction.pctNonLoad, 0.5)}%`,
                background: '#1d4ed8',  // non-load = blue
              }}
              title={`Non-load (climate + other): ${loadFraction.pctNonLoad.toFixed(1)}% of total deduct`}
            >
              {loadFraction.pctNonLoad >= 22
                ? `Non-load ${loadFraction.pctNonLoad.toFixed(0)}%`
                : loadFraction.pctNonLoad >= 6
                  ? `${loadFraction.pctNonLoad.toFixed(0)}%`
                  : ''}
            </div>
          </div>
          {/* Always-visible labels under the bar so very narrow segments stay readable */}
          <div className="flex justify-between mt-1 text-[10px]">
            <span className="font-bold text-failing">
              ▌ Load {loadFraction.pctLoad.toFixed(1)}%
            </span>
            <span className="font-bold text-primary">
              Non-load {loadFraction.pctNonLoad.toFixed(1)}% ▌
            </span>
          </div>
          <p className="text-[10px] text-outline mt-1.5 italic">
            Load fraction is computed by the airport's PMS from ASTM D5340 deduct curves —
            unit-agnostic (m and m² already collapsed to deduct points).
            <strong className="not-italic"> FAARFIELD's CDF predicts only the red (load) portion.</strong>
            {loadFraction.pctLoad < 5 ?
              ' This section\'s deterioration is overwhelmingly climate-driven; FAARFIELD CDF (load-only) cannot explain the PCI decline alone.' :
            loadFraction.pctLoad > 60 ?
              ' This section\'s deterioration is dominated by load damage — directly comparable to FAARFIELD\'s CDF prediction.' :
              ' This section has mixed load and non-load contributions; CDF prediction is partially representative.'}
          </p>
        </div>
      )}

      <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">
        Raw quantities by distress code &amp; severity (m vs m² shown separately)
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e2e6" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9 }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fontSize: 9 }}
            label={{ value: 'qty (per unit)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#737784' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="L" name="Low severity" stackId="sev" isAnimationActive={false}>
            {data.map((row, i) => (
              <Cell key={i} fill={CATEGORY_COLORS[row.category].L} />
            ))}
          </Bar>
          <Bar dataKey="M" name="Medium severity" stackId="sev" isAnimationActive={false}>
            {data.map((row, i) => (
              <Cell key={i} fill={CATEGORY_COLORS[row.category].M} />
            ))}
          </Bar>
          <Bar dataKey="H" name="High severity" stackId="sev" isAnimationActive={false}>
            {data.map((row, i) => (
              <Cell key={i} fill={CATEGORY_COLORS[row.category].H} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Custom 2-axis legend: color family = category; saturation = severity */}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[10px]">
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-widest text-outline">Category (color)</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: CATEGORY_COLORS.load.M }} />
            <span className="font-bold text-failing">Load-related</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: CATEGORY_COLORS.climate.M }} />
            <span className="font-bold text-primary">Climate-related</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: CATEGORY_COLORS.other.M }} />
            <span className="font-bold text-adequate">Other</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-widest text-outline">Severity (saturation)</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm border border-outline-variant/30" style={{ background: SEVERITY_GRAYSCALE.L }} />
            <span>Low</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: SEVERITY_GRAYSCALE.M }} />
            <span>Medium</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: SEVERITY_GRAYSCALE.H }} />
            <span>High</span>
          </span>
        </div>
      </div>
      <div className="text-[10px] text-outline mt-2 italic">
        Each stacked bar is colored by its category (load / climate / other) and saturated by severity (lighter = Low, darker = High).
        Load-related distresses are what FAARFIELD's CDF predicts; climate-related are NOT.
      </div>
    </div>
  )
}
