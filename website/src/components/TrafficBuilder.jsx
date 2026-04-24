import { useState, useMemo, useEffect } from 'react'
import aircraftLibrary from '../data/aircraft_library.json'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts'

// Wheel configuration diagram — shows gear layout as dots
function GearDiagram({ gear }) {
  const g = String(gear).trim().toUpperCase()
  const r = 2.5  // dot radius
  const c = '#00327d' // primary color

  // Each config: array of [x,y] positions for wheels (left side mirrored to right)
  // Viewed from below the aircraft, nose at top
  const configs = {
    'S':      { left: [[0,0]], label: 'Single', w: 40, h: 24 },
    'D':      { left: [[0,0],[6,0]], label: 'Dual', w: 40, h: 24 },
    '2D':     { left: [[0,0],[6,0],[0,8],[6,8]], label: 'Dual Tandem', w: 40, h: 32 },
    '2S':     { left: [[0,0],[0,8]], label: '2 Single', w: 40, h: 32 },
    '2T':     { left: [[0,0],[6,0],[0,8],[6,8]], label: '2 Tandem', w: 40, h: 32 },
    '3D':     { left: [[0,0],[6,0],[0,8],[6,8],[0,16],[6,16]], label: 'Triple Dual', w: 40, h: 40 },
    '5D':     { left: [[0,0],[6,0],[0,8],[6,8],[0,16],[6,16],[0,24],[6,24],[0,32],[6,32]], label: '5 Dual', w: 40, h: 56 },
    '2D/2D2': { left: [[0,0],[6,0],[0,8],[6,8]], body: [[0,0],[6,0],[0,8],[6,8]], label: 'B747 type', w: 56, h: 32 },
    '2D/D1':  { left: [[0,0],[6,0],[0,8],[6,8]], body: [[0,4],[6,4]], label: 'DC-10 type', w: 56, h: 32 },
    '2D/2D1': { left: [[0,0],[6,0],[0,8],[6,8]], body: [[0,0],[6,0],[0,8],[6,8]], label: 'A340 type', w: 56, h: 32 },
    '2D/3D2': { left: [[0,0],[6,0],[0,8],[6,8]], body: [[0,0],[6,0],[0,8],[6,8],[0,16],[6,16]], label: 'A380 type', w: 56, h: 40 },
  }

  const cfg = configs[g] || configs['S']
  const ox = 4  // left offset
  const centerX = cfg.w / 2

  return (
    <div className="flex flex-col items-center" title={`${g} — ${cfg.label}`}>
      <svg width={cfg.w} height={cfg.h} viewBox={`0 0 ${cfg.w} ${cfg.h}`}>
        {/* Left gear */}
        {cfg.left.map(([x, y], i) => (
          <circle key={`l${i}`} cx={ox + x} cy={y + r + 1} r={r} fill={c} />
        ))}
        {/* Right gear (mirror) */}
        {cfg.left.map(([x, y], i) => (
          <circle key={`r${i}`} cx={cfg.w - ox - x} cy={y + r + 1} r={r} fill={c} />
        ))}
        {/* Body gear (if exists, centered) */}
        {cfg.body && cfg.body.map(([x, y], i) => (
          <circle key={`b${i}`} cx={centerX - 3 + x} cy={y + r + 1} r={r} fill={c} opacity={0.5} />
        ))}
        {/* Centerline */}
        <line x1={centerX} y1={0} x2={centerX} y2={cfg.h} stroke="#c3c6d5" strokeWidth={0.5} strokeDasharray="2 2" />
      </svg>
      <span className="text-[10px] font-bold text-outline mt-0.5">{g}</span>
    </div>
  )
}

function AircraftPicker({ onAdd }) {
  const [search, setSearch] = useState('')
  const [deps, setDeps] = useState(10)

  const filtered = useMemo(() => {
    if (!search || search.length < 2) return []
    const q = search.toUpperCase()
    return aircraftLibrary
      .filter(a => a.icao.includes(q) || a.model.toUpperCase().includes(q) || a.manufacturer.toUpperCase().includes(q))
      .slice(0, 10)
  }, [search])

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-outline block mb-1">Search Aircraft</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Type ICAO, name, or manufacturer..."
            className="w-full bg-surface-low border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-outline block mb-1">Dep/Year</label>
          <input type="number" value={deps} onChange={e => setDeps(+e.target.value)} min="1"
            className="w-24 bg-surface-low border-none rounded-lg px-3 py-2 text-sm text-center focus:ring-2 focus:ring-primary" />
        </div>
      </div>
      {filtered.length > 0 && (
        <div className="bg-surface-lowest rounded-lg shadow-[0px_12px_32px_rgba(25,28,30,0.06)] max-h-48 overflow-y-auto custom-scrollbar">
          {/* Dropdown header */}
          <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-outline bg-surface-low sticky top-0">
            <span>Aircraft</span>
            <div className="flex gap-4">
              <span>MTOW</span>
              <span>Gear</span>
            </div>
          </div>
          {filtered.map((ac, i) => (
            <div key={i}
              onClick={() => { onAdd({ type: ac.icao, mtow: ac.mtow, gear: ac.gear, annual_deps: deps }); setSearch('') }}
              className="flex items-center justify-between px-3 py-2 hover:bg-surface-low cursor-pointer text-xs border-b border-outline-variant/10">
              <div>
                <span className="font-mono font-bold">{ac.icao}</span>
                <span className="text-outline ml-2">{ac.manufacturer} {ac.model}</span>
              </div>
              <div className="flex gap-4 text-right">
                <span className="font-mono w-20 text-right">{ac.mtow?.toLocaleString()} lb</span>
                <span className="font-mono w-6 text-center">{ac.gear}</span>
              </div>
            </div>
          ))}
          <div className="px-3 py-1.5 text-[10px] text-outline text-center">Click to add at {deps} dep/yr</div>
        </div>
      )}
    </div>
  )
}

function TAFChart({ tafData, growthRate }) {
  if (!tafData) return null
  const historical = tafData.historical || []
  const forecast = tafData.forecast || []

  // Base year = last historical year with data
  const lastHist = historical.length > 0 ? historical[historical.length - 1] : null
  const baseYear = lastHist?.year || 2021
  const baseOps = lastHist ? (lastHist.ac + lastHist.at + lastHist.ga + lastHist.mil + (lastHist.loc_ga || 0) + (lastHist.loc_mil || 0)) : 0

  // Growth projection line from base year using design growth rate
  const growthProjection = []
  if (growthRate != null && baseOps > 0) {
    for (let yr = baseYear; yr <= baseYear + 30; yr++) {
      const elapsed = yr - baseYear
      const projected = Math.round(baseOps * (1 + growthRate * elapsed))
      growthProjection.push({ year: yr, growth: projected })
    }
  }

  const chartData = [
    ...historical.map(r => ({ year: r.year, total: r.ac + r.at + r.ga + r.mil + (r.loc_ga || 0) + (r.loc_mil || 0) })),
    ...forecast.map(r => ({ year: r.year, forecast: r.ac + r.at + r.ga + r.mil + (r.loc_ga || 0) + (r.loc_mil || 0) })),
  ]

  // Merge growth projection into chart data
  for (const gp of growthProjection) {
    const existing = chartData.find(d => d.year === gp.year)
    if (existing) {
      existing.growth = gp.growth
    } else {
      chartData.push({ year: gp.year, growth: gp.growth })
    }
  }
  chartData.sort((a, b) => a.year - b.year)

  const growthPct = growthRate != null ? (growthRate * 100).toFixed(1) : null

  // Compute TAF implied growth rate for label
  let tafGrowthLabel = 'FAA TAF Forecast'
  if (forecast.length >= 2) {
    const firstF = forecast[0]
    const lastF = forecast[forecast.length - 1]
    const t1 = firstF.ac + firstF.at + firstF.ga + firstF.mil + (firstF.loc_ga || 0) + (firstF.loc_mil || 0)
    const t2 = lastF.ac + lastF.at + lastF.ga + lastF.mil + (lastF.loc_ga || 0) + (lastF.loc_mil || 0)
    const yrs = lastF.year - firstF.year
    if (t1 > 0 && yrs > 0) {
      const tafCagr = (Math.pow(t2 / t1, 1 / yrs) - 1) * 100
      tafGrowthLabel = `FAA TAF Forecast (${tafCagr >= 0 ? '+' : ''}${tafCagr.toFixed(1)}%/yr)`
    }
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-outline">TAF Operations (Historical + Forecast)</p>
        {growthPct != null && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            growthRate > 0 ? 'bg-adequate/10 text-adequate' : growthRate < 0 ? 'bg-failing/10 text-failing' : 'bg-outline/10 text-outline'
          }`}>
            Design Growth: {growthRate > 0 ? '+' : ''}{growthPct}%/yr
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e2e6" />
          <XAxis dataKey="year" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 9 }} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none' }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="total" name="Historical Ops" fill="#00327d" radius={[2,2,0,0]} />
          <Line dataKey="forecast" name={tafGrowthLabel} stroke="#0047ab" strokeDasharray="6 3" dot={false} strokeWidth={2} />
          {growthRate != null && (
            <Line dataKey="growth" name={`Design Growth (${growthRate > 0 ? '+' : ''}${growthPct}%/yr)`}
              stroke="#0d652d" strokeDasharray="4 2" dot={false} strokeWidth={2} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

import allTraffic from '../data/traffic.json'
import TrafficHints from './TrafficHints'

export default function TrafficBuilder({ icao, onTrafficChange, growthRate }) {
  const trafficData = allTraffic[icao]
  const [aircraft, setAircraft] = useState(trafficData?.aircraft || [])

  // Reload aircraft list when airport changes
  useEffect(() => {
    const data = allTraffic[icao]
    setAircraft(data?.aircraft || [])
  }, [icao])

  // Load TAF data for this airport (lazy — 18MB file)
  // ICAO → FAA LOCID: K prefix (contiguous US) = strip K, PA (Alaska) = strip PA, PH (Hawaii) = strip PH
  function icaoToLocid(code) {
    if (!code) return ''
    const c = code.toUpperCase().trim()
    if (c.startsWith('K') && c.length === 4) return c.slice(1)       // KLHX → LHX
    if (c.startsWith('PA') && c.length === 4) return c.slice(2)      // PAKP → KP... wait
    // Actually Alaska: PAKP → AKP (strip first P, keep A)
    // Hawaii: PHNL → HNL (strip P, keep H)
    // General rule: for PA/PH prefixed 4-letter codes, the FAA LOCID is the last 3 chars
    if ((c.startsWith('PA') || c.startsWith('PH')) && c.length === 4) return c.slice(1)  // PAKP → AKP, PHNL → HNL
    return c
  }
  const locid = icaoToLocid(icao)
  const [tafData, setTafData] = useState(null)
  const [tafLoading, setTafLoading] = useState(false)
  useEffect(() => {
    setTafData(null)
    setTafLoading(true)
    import('../data/taf_operations.json').then(mod => {
      const data = mod.default || mod
      if (data[locid]) {
        const hist = data[locid].historical || []
        const latest = hist[hist.length - 1] || null
        setTafData({ latest, historical: hist, forecast: data[locid].forecast || [] })
      }
    }).catch(() => {}).finally(() => setTafLoading(false))
  }, [icao, locid])

  // Load TAF based aircraft
  const [basedAircraft, setBasedAircraft] = useState(null)
  useEffect(() => {
    import('../data/taf_based_aircraft.json').then(mod => {
      const data = mod.default || mod
      if (data[locid]) {
        const rows = data[locid]
        setBasedAircraft(rows[rows.length - 1] || null)
      }
    }).catch(() => {})
  }, [icao, locid])

  const [expanded, setExpanded] = useState(null)

  function addAircraft(ac) {
    // If aircraft already exists, add departures to it instead of duplicating
    const existing = aircraft.findIndex(a => a.type === ac.type)
    let updated
    if (existing >= 0) {
      updated = aircraft.map((a, i) => i === existing
        ? { ...a, annual_deps: a.annual_deps + ac.annual_deps, source: 'user_edited' }
        : a)
    } else {
      updated = [...aircraft, { ...ac, source: 'user_added',
        years: [], first_year: null, last_year_seen: null, total_deps: 0 }]
    }
    setAircraft(updated)
    onTrafficChange?.(updated)
  }

  function addFleet(fleet) {
    // Add multiple aircraft at once from TAF hints
    let updated = [...aircraft]
    for (const ac of fleet) {
      const existing = updated.findIndex(a => a.type === ac.type)
      if (existing >= 0) {
        updated[existing] = { ...updated[existing], annual_deps: updated[existing].annual_deps + ac.annual_deps, source: 'taf_estimate' }
      } else {
        updated.push(ac)
      }
    }
    setAircraft(updated)
    onTrafficChange?.(updated)
  }

  function removeAircraft(idx) {
    const updated = aircraft.filter((_, i) => i !== idx)
    setAircraft(updated)
    onTrafficChange?.(updated)
  }

  function updateAircraft(idx, field, value) {
    const updated = aircraft.map((a, i) => i === idx ? { ...a, [field]: value } : a)
    setAircraft(updated)
    onTrafficChange?.(updated)
  }

  const totalDeps = aircraft.reduce((s, a) => s + (a.annual_deps || 0), 0)
  const heaviest = aircraft.reduce((max, a) => a.mtow > (max?.mtow || 0) ? a : max, null)

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-primary">flight</span>
        <h3 className="text-xl font-bold tracking-tight">Traffic Mix — {icao || 'Select Airport'}</h3>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Summary cards — col-span-5 to match Subgrade Comparison layout */}
        <div className="col-span-5 space-y-3">
          <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Traffic Summary</p>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-outline">Aircraft types</span><span className="font-bold">{aircraft.length}</span></div>
              <div className="flex justify-between"><span className="text-outline">Annual departures</span><span className="font-bold">{totalDeps.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-outline">Base year</span><span className="font-bold">{trafficData?.base_year || 2021}</span></div>
              <div className="flex justify-between"><span className="text-outline">Heaviest</span><span className="font-mono font-bold">{heaviest?.type || '—'} ({heaviest?.mtow?.toLocaleString() || 0} lb)</span></div>
            </div>
            <div className="mt-3 pt-3 border-t border-outline-variant/20 text-[10px] text-outline leading-relaxed">
              <span className="material-symbols-outlined text-xs align-middle mr-1">info</span>
              <strong>Dep/yr</strong> = departures in the base year ({trafficData?.base_year || 2021}) from FAA traffic records.
              Aircraft not present in {trafficData?.base_year || 2021} use the average of the last 3 years.
              Aircraft only in earlier years use their active-year average.
            </div>
          </div>

          <TAFChart tafData={tafData} growthRate={growthRate} />

          {/* TAF Hints — show when no pre-loaded traffic and TAF data available */}
          {aircraft.length === 0 && tafData?.latest && (
            <TrafficHints tafOps={tafData.latest} basedAircraft={basedAircraft} onAddFleet={addFleet} />
          )}

          {/* Also show hints as collapsible when aircraft exist but TAF is available */}
          {aircraft.length > 0 && tafData?.latest && !trafficData && (
            <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
              <details>
                <summary className="text-[10px] font-bold uppercase tracking-widest text-outline cursor-pointer">
                  TAF Suggestions (click to expand)
                </summary>
                <div className="mt-3">
                  <TrafficHints tafOps={tafData.latest} basedAircraft={basedAircraft} onAddFleet={addFleet} />
                </div>
              </details>
            </div>
          )}

          <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">Add Aircraft from FAA ACD (388 types)</p>
            <AircraftPicker onAdd={addAircraft} />
          </div>
        </div>

        {/* Aircraft list — col-span-7 to match Subgrade Comparison layout */}
        <div className="col-span-7 bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Aircraft Mix ({aircraft.length} types)</p>
            <span className="text-[10px] text-outline">Base year: <span className="font-bold">{trafficData?.base_year || 2021}</span></span>
          </div>
          <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-lowest">
                <tr className="text-[10px] font-bold uppercase tracking-widest text-outline border-b border-outline-variant/20">
                  <th className="text-center py-2 px-2">ICAO</th>
                  <th className="text-center py-2 px-2">Model</th>
                  <th className="text-center py-2 px-2">MTOW (lb)</th>
                  <th className="text-center py-2 px-2">Gear Config</th>
                  <th className="text-center py-2 px-2">Dep/yr</th>
                  <th className="text-center py-2 px-2">Data</th>
                  <th className="text-center py-2 px-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {aircraft.sort((a,b) => (b.annual_deps * b.mtow) - (a.annual_deps * a.mtow)).map((ac, i) => {
                  const acdMatch = aircraftLibrary.find(lib => lib.icao === ac.type)
                  const sourceLabel = ac.source === 'base_year' ? `${trafficData?.base_year || 2021} actual`
                    : ac.source === 'last_3yr_avg' ? 'Last 3yr avg'
                    : ac.source === 'active_yr_avg' ? 'Active yr avg'
                    : ac.source === 'user_added' ? 'User added'
                    : ac.source === 'user_edited' ? 'User edited' : 'User input'
                  const tooltipText = ac.years && ac.years.length > 0
                    ? `${ac.type}: ${ac.total_deps || '?'} total deps over ${ac.years.length} years (${ac.first_year}–${ac.last_year_seen})\nActive years: ${ac.years.join(', ')}\nMethod: ${sourceLabel}`
                    : `${ac.type}: ${sourceLabel} — no historical data`
                  const sourceBadge = ac.source === 'base_year' ? 'text-adequate bg-adequate/10'
                    : ac.source === 'last_3yr_avg' ? 'text-primary bg-primary/10'
                    : ac.source === 'active_yr_avg' ? 'text-borderline bg-borderline-bg'
                    : ac.source === 'user_added' ? 'text-secondary bg-secondary-container'
                    : ac.source === 'user_edited' ? 'text-secondary bg-secondary-container'
                    : 'text-outline bg-surface-low'
                  return (
                  <tr key={i} className="border-t border-outline-variant/10 hover:bg-surface-low group align-middle" title={tooltipText}>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-primary">{ac.type}</td>
                    <td className="py-2.5 px-2 text-center text-outline truncate max-w-[200px]" title={acdMatch ? `${acdMatch.manufacturer} ${acdMatch.model}` : ac.type}>
                      {acdMatch ? acdMatch.model : <span className="italic text-outline-variant">Unknown</span>}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-outline">{ac.mtow?.toLocaleString()}</td>
                    <td className="py-2.5 px-2">
                      <div className="flex justify-center">
                        <GearDiagram gear={ac.gear} />
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <input type="number" value={ac.annual_deps} min="0" step="0.1"
                        onChange={e => updateAircraft(i, 'annual_deps', +e.target.value)}
                        className="w-20 bg-surface-low border-none rounded px-2 py-1 text-center font-mono focus:ring-1 focus:ring-primary" />
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${sourceBadge}`}
                        title={tooltipText}>
                        {ac.source === 'base_year' ? `${trafficData?.base_year || 2021}`
                          : ac.source === 'last_3yr_avg' ? '3yr avg'
                          : ac.source === 'active_yr_avg' ? `${ac.first_year}–${ac.last_year_seen}`
                          : ac.source === 'user_added' ? 'added'
                          : ac.source === 'user_edited' ? 'edited'
                          : 'user'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button onClick={() => removeAircraft(i)}
                        className="text-failing opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
