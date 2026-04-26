// Unified project summary — replaces SummaryTable (flat 13-row) + AirportAccordion
// (per-airport detail) with a single panel where airports are collapsible groups.
// Each expanded group shows: cross-section thumbnail grid, per-section table with
// click-to-drill-down (CDF breakdown + top-aircraft), and subgrade/traffic info.
//
// Spec: specs/unified-project-summary-panel.md (2026-04-25)

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend,
} from 'recharts'
import subgradeData from '../data/subgrade.json'
import traffic from '../data/traffic.json'
import frostData from '../data/frost_data.json'
import CrossSectionSmall from './CrossSectionSmall'
import PerSectionDetail from './PerSectionDetail'
import PciHistoryChart from './PciHistoryChart'
import DistressBreakdownChart from './DistressBreakdownChart'

function fmtCdf(v) {
  if (v === undefined || v === null) return '—'
  if (v < 0.001) return v.toExponential(2)
  return v.toFixed(4)
}

function fmtCdfShort(v) {
  if (v === undefined || v === null) return '—'
  if (v < 0.01) return v.toExponential(1)
  if (v < 100) return v.toFixed(2)
  return v.toExponential(1)
}

// One airport group: collapsed header + expanded body (cross-section grid +
// expandable per-section table + auxiliary info cards + per-airport CDF chart).
function AirportGroup({ airport, sections, results, expanded, onToggle, onOpenInTool }) {
  const [openSectionKey, setOpenSectionKey] = useState(null)
  const aptSections = sections.filter(s => s.icao === airport.icao)
  const aptResults = results.filter(r => r.icao === airport.icao)
  const underCount = aptResults.filter(r => !r.adequate).length
  const overCount = aptResults.length - underCount
  const maxCdf = aptResults.reduce((m, r) => Math.max(m, r.cdf_max ?? 0), 0)
  const worstControlling = (aptResults.find(r => r.cdf_max === maxCdf) || {}).controlling
  const sub = subgradeData[airport.icao]
  const trafficData = traffic[airport.icao]
  // Lookup frost depth for this airport from NOAA Climate Normals (1991-2020)
  const frostEntry = (frostData?.airports || []).find(a => a.icao === airport.icao)
  const frostDepthIn = frostEntry?.frost_depth_in ?? null

  const chartData = aptResults.map(r => ({
    name: String(r.section_id),
    cdf_ac: r.cdf_ac,
    cdf_sub: r.cdf_sub,
    cdf_pcc: r.cdf_pcc,
  }))

  const allOver = underCount === 0
  const dotColor = allOver ? 'bg-adequate' : 'bg-failing'

  return (
    <div className="border-t border-outline-variant/10 first:border-t-0">
      {/* Header — clickable airport row */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() }
        }}
        title={expanded ? 'Click to collapse — hide section detail' : 'Click to expand — read section detail (cross-sections, CDF breakdown, top aircraft, PCI history)'}
        className={`w-full flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 hover:bg-surface-low transition-colors text-left cursor-pointer ${
          expanded ? 'bg-surface-low' : ''
        }`}
      >
        <span className={`material-symbols-outlined text-outline transition-transform text-lg ${expanded ? 'rotate-90' : ''}`}>
          chevron_right
        </span>
        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
        <span className="text-base font-bold text-on-surface min-w-[3rem]">{airport.icao}</span>
        <span className="hidden sm:inline text-sm text-outline truncate flex-1 max-w-[16rem]">
          {airport.name}{airport.state ? `, ${airport.state}` : ''}
        </span>
        <span className="hidden sm:inline text-[10px] font-mono text-outline whitespace-nowrap">
          {aptSections.length} section{aptSections.length > 1 ? 's' : ''}
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded whitespace-nowrap ${
          allOver
            ? 'bg-adequate/10 text-adequate'
            : 'bg-failing/10 text-failing'
        }`}>
          {(() => {
            if (underCount === 0) return `${overCount}/${aptResults.length} OVER`
            if (overCount === 0)  return `${underCount}/${aptResults.length} UNDER`
            return `${overCount} OVER · ${underCount} UNDER`
          })()}
        </span>
        <span className="ml-auto hidden sm:inline text-[10px] uppercase tracking-widest text-outline whitespace-nowrap">
          max CDF
        </span>
        <span className="font-mono font-bold text-sm whitespace-nowrap">{fmtCdfShort(maxCdf)}</span>
        {worstControlling && (
          <span
            className="hidden md:inline text-[10px] text-outline whitespace-nowrap italic"
            title={`Controlling failure mode: ${worstControlling}`}
          >
            ctrl: {worstControlling}
          </span>
        )}
        {/* Inline-expand hint — last column on mobile too */}
        <span className="text-[10px] text-outline whitespace-nowrap sm:pl-3 sm:border-l sm:border-outline-variant/30 ml-auto sm:ml-0">
          {expanded ? 'Hide ▴' : 'Read ▾'}
        </span>
      </div>

      {/* Expanded — per-section cards (each with cross-section inline) + chart + cards */}
      {expanded && (
        <div className="px-6 pb-6 pt-2 space-y-6 bg-surface-low/40">
          {/* Per-airport CDF bar chart + subgrade + traffic cards (moved above per-section cards 2026-04-25) */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">
                CDF by Failure Mode — all sections at this airport
              </p>
              <div className="bg-surface-lowest rounded-xl p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e2e6" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none' }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <ReferenceLine y={1} stroke="#ba1a1a" strokeDasharray="4 3" />
                    <Bar dataKey="cdf_ac" name="AC Fatigue" fill="#4e5e85" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="cdf_sub" name="Subgrade" fill="#059669" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="cdf_pcc" name="PCC Fatigue" fill="#00327d" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-3">
              {sub && (
                <div
                  className="rounded-lg p-3 border"
                  style={{
                    background: 'rgba(212, 184, 150, 0.25)',  // matches CrossSectionSmall subgrade fill (tan/sandy)
                    borderColor: 'rgba(101, 31, 0, 0.20)',    // matches CrossSectionSmall subgrade label color
                  }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-2"
                    style={{ color: '#651f00' }}
                  >
                    Subgrade
                  </p>
                  <p className="text-xs font-medium" style={{ color: '#3d1300' }}>{sub.soil}</p>
                  <p className="text-xs" style={{ color: '#7a5230' }}>AASHTO {sub.aashto}</p>
                  <p className="text-sm font-bold mt-1" style={{ color: '#3d1300' }}>
                    CBR = {sub.cbr}{' '}
                    <span className="text-xs font-normal" style={{ color: '#7a5230' }}>({sub.quality})</span>
                  </p>
                </div>
              )}
              {trafficData && (
                <div className="bg-surface-lowest rounded-lg p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Traffic</p>
                  <p className="text-xs">{trafficData.aircraft.length} aircraft types</p>
                  <p className="text-xs text-outline">Base year: {trafficData.base_year}</p>
                  <p className="text-xs text-outline">Growth: {(trafficData.growth * 100).toFixed(1)}%</p>
                </div>
              )}
            </div>
          </div>

          {/* Per-section cards — cross-section diagram inline with section data, click to drill down */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
              Per-Section Detail (click card to expand · arrow opens in Design Tool)
            </p>
            <div className="space-y-3">
              {aptResults.map((r) => {
                const sec = aptSections.find(s => s.section_id === r.section_id)
                const key = `${r.icao}/${r.section_id}`
                const isOpen = openSectionKey === key
                return (
                  <div
                    key={key}
                    className={`bg-surface-lowest rounded-xl shadow-sm overflow-hidden transition-shadow ${
                      isOpen ? 'ring-2 ring-primary/20' : ''
                    }`}
                  >
                    {/* Header row — section identity + verdict badges + actions.
                        Same labeling convention as the airport row above:
                          • 'ctrl: PCC Fatigue' = informational status (italic)
                          • 'Read details ▾' = inline expand (CDF breakdown + top aircraft + PCI/distress)
                          • 'Design Tool →' = navigation to live what-if tab */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setOpenSectionKey(isOpen ? null : key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setOpenSectionKey(isOpen ? null : key)
                        }
                      }}
                      title={isOpen ? 'Click to collapse — hide CDF breakdown and per-aircraft / PCI / distress detail' : 'Click to expand — read CDF breakdown, top-10 aircraft, PCI history, distress breakdown'}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-3 px-3 sm:px-5 py-3 hover:bg-surface-low cursor-pointer"
                    >
                      <span className="font-mono text-base font-bold text-on-surface min-w-[3.5rem]">
                        {r.section_id}
                      </span>
                      <span className="hidden sm:inline text-xs text-outline uppercase tracking-widest min-w-[5rem]">
                        {r.use}
                      </span>
                      <span className="hidden md:inline text-sm font-medium flex-1 truncate">{r.desc}</span>
                      <span className="font-mono text-sm font-bold whitespace-nowrap">
                        CDF {fmtCdf(r.cdf_max)}
                      </span>
                      <span
                        className="hidden md:inline text-xs text-outline whitespace-nowrap italic"
                        title={`Controlling failure mode: ${r.controlling}`}
                      >
                        ctrl: {r.controlling}
                      </span>
                      <span
                        className={`inline-block text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded whitespace-nowrap ${
                          r.adequate ? 'bg-adequate/10 text-adequate' : 'bg-failing/10 text-failing'
                        }`}
                      >
                        {r.adequate ? 'OVER' : 'UNDER'}
                      </span>
                      {/* Inline-expand hint */}
                      <span className="text-[10px] text-outline whitespace-nowrap sm:pl-3 sm:border-l sm:border-outline-variant/30 ml-auto sm:ml-0">
                        {isOpen ? 'Hide ▴' : 'Read ▾'}
                      </span>
                      {/* Navigate to Design Tool — compact on mobile */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onOpenInTool(r.icao, r.section_id) }}
                        title="Switch to the Design Tool tab and open this section for live what-if analysis"
                        className="text-[10px] font-bold text-primary hover:underline whitespace-nowrap sm:pl-3 sm:border-l sm:border-outline-variant/30"
                      >
                        <span className="sm:hidden">Tool →</span>
                        <span className="hidden sm:inline">Design Tool →</span>
                      </button>
                    </div>

                    {/* Cross-section diagram — ALWAYS visible underneath the header row */}
                    {sec && (
                      <div className="px-5 pb-3 pt-1 flex justify-center bg-surface-low/30 border-t border-outline-variant/10">
                        <CrossSectionSmall
                          layers={sec.layers}
                          subgrade={sec.subgrade}
                          frostDepthIn={frostDepthIn}
                        />
                      </div>
                    )}

                    {/* Drill-down detail — CDF breakdown + top-aircraft table + PCI history + distress breakdown on click */}
                    {isOpen && (
                      <div className="px-5 py-5 bg-surface-low/40 border-t border-outline-variant/10 space-y-5">
                        <PerSectionDetail r={r} apt={airport} />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <PciHistoryChart icao={r.icao} sectionId={r.section_id} />
                          <DistressBreakdownChart icao={r.icao} sectionId={r.section_id} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

export default function ProjectSummaryUnified({ airports, sections, cdfResults, onOpenInTool }) {
  const [expanded, setExpanded] = useState(() => new Set())

  const toggleAirport = (icao) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(icao)) next.delete(icao)
      else next.add(icao)
      return next
    })
  }

  const expandAll = () => setExpanded(new Set(airports.map(a => a.icao)))
  const collapseAll = () => setExpanded(new Set())

  const underCount = cdfResults.filter(r => !r.adequate).length
  const overCount = cdfResults.length - underCount

  return (
    <section>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4">
        <span className="material-symbols-outlined text-primary">table_chart</span>
        <h3 className="text-xl font-bold tracking-tight">Project Summary</h3>
        <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
          {airports.length} airports · {cdfResults.length} sections ·
          <span className="text-adequate ml-1">{overCount} OVER</span>
          <span className="text-outline mx-1">/</span>
          <span className="text-failing">{underCount} UNDER</span>
        </span>
        <div className="sm:ml-auto flex items-center gap-2 text-[10px]">
          <button
            type="button"
            onClick={expandAll}
            className="font-bold text-primary hover:underline"
          >
            Expand all
          </button>
          <span className="text-outline">·</span>
          <button
            type="button"
            onClick={collapseAll}
            className="font-bold text-primary hover:underline"
          >
            Collapse all
          </button>
        </div>
      </div>
      <div className="bg-surface-lowest rounded-xl shadow-[0px_12px_32px_rgba(25,28,30,0.06)] overflow-hidden">
        {airports.map(apt => (
          <AirportGroup
            key={apt.icao}
            airport={apt}
            sections={sections}
            results={cdfResults}
            expanded={expanded.has(apt.icao)}
            onToggle={() => toggleAirport(apt.icao)}
            onOpenInTool={onOpenInTool}
          />
        ))}
      </div>
      <p className="text-[10px] text-outline mt-3">
        Click an airport row to see its sections, cross-sections, and CDF chart. Click a section row to drill into per-aircraft contributions. Use the arrow to open in the Design Tool.
      </p>
    </section>
  )
}
