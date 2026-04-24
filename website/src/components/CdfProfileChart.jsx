import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer
} from 'recharts'

// Distinct colors for top-10 aircraft lines
const AC_COLORS = [
  '#0047ab', '#dc2626', '#16a34a', '#ea580c', '#7c3aed',
  '#0891b2', '#db2777', '#ca8a04', '#475569', '#9d174d',
]

export default function CdfProfileChart({ nativeCdf }) {
  const offsets = nativeCdf?.cdfProfileOffsetsIn
  const cdfProfileTotal = nativeCdf?.cdfProfileTotal
  const cdfProfilePcc = nativeCdf?.cdfProfilePcc
  const cdfProfileAc = nativeCdf?.cdfProfileAc
  const cdfProfileSub = nativeCdf?.cdfProfileSub
  const controlOffsetIn = nativeCdf?.controlOffsetIn ?? 0
  const perAircraft = nativeCdf?.perAircraft
  const controlling = nativeCdf?.controlling ?? ''

  // FAARFIELD plots show offsets symmetric about centerline (negative + positive).
  // Our backend computes offsets 0..400 in inches. Mirror to negative side for the plot.
  const mirrored = useMemo(() => {
    if (!offsets?.length) return []
    const rows = []
    const n = offsets.length
    for (let i = n - 1; i > 0; i--) {
      const off = -offsets[i]
      rows.push(buildRow(off, i, perAircraft, cdfProfileTotal, cdfProfilePcc, cdfProfileAc, cdfProfileSub))
    }
    for (let i = 0; i < n; i++) {
      const off = offsets[i]
      rows.push(buildRow(off, i, perAircraft, cdfProfileTotal, cdfProfilePcc, cdfProfileAc, cdfProfileSub))
    }
    return rows
  }, [offsets, cdfProfileTotal, cdfProfilePcc, cdfProfileAc, cdfProfileSub, perAircraft])

  // Top 10 aircraft by CDF — every aircraft with a non-zero per-offset profile
  const topAcByCdf = useMemo(() => {
    const ac = (perAircraft || []).filter(a => (a.cdfProfile || []).some(v => v > 0))
    ac.sort((a, b) => (b.cdf || 0) - (a.cdf || 0))
    return ac.slice(0, 10)
  }, [perAircraft])

  if (!offsets?.length) return null

  const peakLabel = `${controlOffsetIn.toFixed(0)}"`

  return (
    <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-outline">
          CDF vs Lateral Offset · 41-point sweep · controlling: {controlling}
        </p>
        <p className="text-[10px] text-outline">
          inches · linear scale · top {topAcByCdf.length} aircraft
        </p>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={mirrored} margin={{ top: 10, right: 30, left: 10, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e2e6" />
          <XAxis dataKey="off" type="number" domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 11, fill: '#737784' }}
            label={{ value: 'Lateral Distance (in)', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#737784' }} />
          <YAxis scale="linear" domain={[0, 'auto']}
            tick={{ fontSize: 10, fill: '#737784' }}
            label={{ value: 'CDF', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#737784' }}
            tickFormatter={v => v === 0 ? '0' : v.toExponential(0)} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            formatter={(value, name) => [value > 0 ? value.toExponential(2) : '0', name]}
            labelFormatter={off => `Lateral: ${off.toFixed(0)} in`} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
          <ReferenceLine y={1} stroke="#dc2626" strokeDasharray="6 3"
            label={{ value: 'CDF = 1.0', fill: '#dc2626', fontSize: 10, position: 'right' }} />
          <ReferenceLine x={controlOffsetIn} stroke="#16a34a" strokeDasharray="3 3"
            label={{ value: `peak +${peakLabel}`, fill: '#16a34a', fontSize: 9, position: 'top' }} />
          <ReferenceLine x={-controlOffsetIn} stroke="#16a34a" strokeDasharray="3 3"
            label={{ value: `−${peakLabel}`, fill: '#16a34a', fontSize: 9, position: 'top' }} />
          {topAcByCdf.map((ac, idx) => (
            <Line key={ac.icao || ac.name || idx}
              type="monotone" dataKey={`ac_${ac.icao || ac.name || idx}`}
              name={ac.icao || ac.name}
              stroke={AC_COLORS[idx % AC_COLORS.length]} strokeWidth={1.5}
              dot={false} isAnimationActive={false} />
          ))}
          <Line type="monotone" dataKey="total" name="Cumulative CDF"
            stroke="#000000" strokeWidth={2.5}
            dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-[11px] text-outline mt-2">
        Cumulative CDF = sum of all aircraft contributions in the controlling failure mode ({controlling}). Peak at <span className="font-mono font-bold text-on-surface">±{peakLabel}</span> from centerline — this is the value reported as section CDF_max. Matches FAARFIELD desktop's "CDF profile" plot.
      </p>
    </div>
  )
}

function buildRow(off, idx, perAircraft, total, pcc, ac, sub) {
  const row = { off, total: safe(total?.[idx]), pcc: safe(pcc?.[idx]), ac: safe(ac?.[idx]), sub: safe(sub?.[idx]) }
  for (const a of (perAircraft || [])) {
    const key = `ac_${a.icao || a.name}`
    row[key] = safe(a.cdfProfile?.[idx])
  }
  return row
}

function safe(v) { return (v === undefined || v === null || isNaN(v)) ? 0 : v }
