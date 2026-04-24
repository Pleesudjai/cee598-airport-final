import React, { useState, useEffect, useMemo, Suspense } from 'react'
import sections from '../data/sections.json'
import traffic from '../data/traffic.json'
import subgradeData from '../data/subgrade.json'
import { cbrToModulus, modulusToK } from '../engine/faarfieldEngine'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'

const AirportMap = React.lazy(() => import('../components/AirportMap'))
const AirportSearch = React.lazy(() => import('../components/AirportSearch'))
const TrafficBuilder = React.lazy(() => import('../components/TrafficBuilder'))
const PavementPanel = React.lazy(() => import('../components/PavementPanel'))
import { fetchFullCdf, fetchDesign } from '../api/nativeStressClient'
import SolverModeBadge from '../components/SolverModeBadge'
import StressContourPanel from '../components/StressContourPanel'
import RigidStressProfile from '../components/RigidStressProfile'
import Fem3dMeshPanel from '../components/Fem3dMeshPanel'
import CdfProfileChart from '../components/CdfProfileChart'
import GearFootprintTopView from '../components/GearFootprintTopView'
import SearchedAirportFrost from '../components/SearchedAirportFrost'

function Loading() {
  return <div className="p-8 text-center text-outline text-sm">Loading...</div>
}

const PROJECT_ICAOS = ['KLHX', 'KPUB', 'KMQJ', 'KCIU', 'KOTM', 'KMWH']

// Step 4: Step indicator
function StepIndicator({ steps }) {
  return (
    <div className="flex items-center justify-between bg-surface-lowest rounded-xl p-4 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
      {steps.map((s, i) => (
        <React.Fragment key={s.label}>
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              s.complete ? 'bg-adequate text-white' : 'bg-surface-low text-outline'
            }`}>
              {s.complete ? <span className="material-symbols-outlined text-sm">check</span> : i + 1}
            </span>
            <span className={`text-xs font-bold ${s.complete ? 'text-on-surface' : 'text-outline'}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && <div className="flex-1 h-px bg-outline-variant/30 mx-3" />}
        </React.Fragment>
      ))}
    </div>
  )
}

// Step 2: Changes Summary
function ChangesSummary({ originalSection, customLayers, originalResult, modifiedResult, cbr, growthRate, flexStr, designLife, trafficData, onReset }) {
  if (!originalSection || !modifiedResult) return null
  const origPcc = originalSection.layers.find(l => l.type.includes('PCC'))
  const origAc = originalSection.layers.find(l => l.type.includes('AC'))
  const modPcc = customLayers?.find(l => l.type.includes('PCC'))
  const modAc = customLayers?.find(l => l.type.includes('AC'))

  const changes = []
  if (modAc && origAc && modAc.h !== origAc.h)
    changes.push({ label: 'AC Thickness', from: `${origAc.h}"`, to: `${modAc.h}"`, delta: `${modAc.h > origAc.h ? '+' : ''}${(modAc.h - origAc.h).toFixed(1)}"` })
  if (modPcc && origPcc && modPcc.h !== origPcc.h)
    changes.push({ label: 'PCC Thickness', from: `${origPcc.h}"`, to: `${modPcc.h}"`, delta: `${modPcc.h > origPcc.h ? '+' : ''}${(modPcc.h - origPcc.h).toFixed(1)}"` })
  if (originalSection.subgrade?.cbr !== cbr)
    changes.push({ label: 'Subgrade CBR', from: `${originalSection.subgrade?.cbr}`, to: `${cbr}`, delta: `${cbr > originalSection.subgrade?.cbr ? '+' : ''}${cbr - originalSection.subgrade?.cbr}` })
  if (trafficData?.growth && Math.abs(trafficData.growth - growthRate) > 0.001)
    changes.push({ label: 'Growth Rate', from: `${(trafficData.growth * 100).toFixed(1)}%`, to: `${(growthRate * 100).toFixed(1)}%`, delta: `${(growthRate - trafficData.growth) > 0 ? '+' : ''}${((growthRate - trafficData.growth) * 100).toFixed(1)}%` })
  // Compare against the section's saved MOR baseline (R = 360 psi for >20-yr aged
  // PCC per FAA AC 150/5320-6F, R = 650 psi for fresh PCC).  Falls back to the
  // FAARFIELD-default 700 psi only when no saved record exists (searched airport).
  const baselineFlexStr = originalResult?.mor_psi ?? 700
  if (flexStr !== baselineFlexStr) {
    const delta = flexStr - baselineFlexStr
    changes.push({
      label: 'Flexural Str.',
      from: `${baselineFlexStr} psi`,
      to: `${flexStr} psi`,
      delta: `${delta > 0 ? '+' : ''}${delta} psi`,
    })
  }

  const origCdf = originalResult?.cdf_max || 0
  const modCdf = modifiedResult?.cdf_max || 0
  const cdfDelta = origCdf > 0 ? ((modCdf - origCdf) / origCdf * 100) : 0

  return (
    <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-outline">What Changed</p>
        {changes.length > 0 && (
          <button onClick={onReset}
            className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-container transition-colors bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg">
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            Reset to Default
          </button>
        )}
      </div>
      {changes.length === 0 ? (
        <p className="text-sm text-outline flex items-center gap-2">
          <span className="material-symbols-outlined text-base">info</span>
          No changes yet — adjust layer thicknesses, soil, or parameters above to see the impact on CDF.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-3">
            {changes.map(c => (
              <div key={c.label} className="bg-surface-low rounded-lg px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline">{c.label}</p>
                <p className="text-sm font-mono mt-0.5">
                  <span className="text-outline">{c.from}</span>
                  <span className="text-primary mx-1">→</span>
                  <span className="font-bold text-on-surface">{c.to}</span>
                  <span className="text-xs text-primary ml-1">({c.delta})</span>
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-6 pt-2 border-t border-outline-variant/20">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-outline">CDF Impact: </span>
              <span className="text-sm font-mono font-bold">
                {origCdf < 0.001 ? origCdf.toExponential(2) : origCdf.toFixed(4)}
                <span className="text-primary mx-1">→</span>
                <span className={modCdf < 1 ? 'text-adequate' : 'text-failing'}>
                  {modCdf < 0.001 ? modCdf.toExponential(2) : modCdf.toFixed(4)}
                </span>
                <span className="text-xs text-outline ml-1">({cdfDelta > 0 ? '+' : ''}{cdfDelta.toFixed(1)}%)</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DesignTool({
  airports, sections: allSections, cdfResults,
  selectedAirport, selectedSection, onAirportChange, onSectionChange,
  searchedAirport, onSearchResult,
  customTraffic, onTrafficChange,
  customLayers, onLayersChange,
  nativeAvailable, analysisAvailable,
}) {
  const [cbr, setCbr] = useState(7)
  const [flexStr, setFlexStr] = useState(700)
  const [growthRate, setGrowthRate] = useState(0)
  const [designLife, setDesignLife] = useState(20)
  const [resetKey, setResetKey] = useState(0)

  // Stress visualization aircraft selection — FAA default: highest CDF contribution
  const [stressAircraftMode, setStressAircraftMode] = useState('top_cdf')

  // FEM3D toggle — off by default (adds ~15s per aircraft)
  // Default ON — FEM gives the FAARFIELD max(FEM, LEAF×0.95) rule which is
  // the published procedure for FlexOnRigid design. Backend caches by inputs,
  // so repeat calls are instant. Users can toggle off for LEAF-only speed or
  // to compare against LEAF-alone numbers.
  const [useFem3d, setUseFem3d] = useState(true)

  // Incremented each time a Run FEM CDF pass completes with femUsed=true. The
  // Fem3dMeshPanel watches this token and auto-fetches the mesh so the user
  // doesn't have to click a second button.
  const [femCdfToken, setFemCdfToken] = useState(0)

  // AC Mix Design for RDEC fatigue model (0 = use FAARFIELD defaults)
  const [acMixDesign, setAcMixDesign] = useState({
    flexuralMod: 0, airVoids: 0, asphaltVol: 0, pnms: 0, ppcs: 0, p200: 0
  })
  const [showMixDesign, setShowMixDesign] = useState(false)

  const currentAirport = selectedAirport || airports[0]?.icao
  const isProject = PROJECT_ICAOS.includes(currentAirport)
  const airportSections = allSections.filter(s => s.icao === currentAirport)
  const currentSectionId = selectedSection || airportSections[0]?.section_id
  const currentSection = allSections.find(s => s.section_id === currentSectionId)
  const originalResult = cdfResults.find(r => r.section_id === currentSectionId)
  const sub = subgradeData[currentAirport]
  const trafficData = traffic[currentAirport]
  const baseYear = trafficData?.base_year || 2021

  const searchedSoilHorizons = searchedAirport?.icao === currentAirport && searchedAirport?.soil?.horizons
    ? searchedAirport.soil.horizons : null

  // The saved MOR for this project section (R = 360 psi for >20-yr aged PCC per
  // FAA AC 150/5320-6F).  Falls back to 700 when no saved record (searched airport).
  const sectionSavedMor = originalResult?.mor_psi ?? 700

  function resetToDefaults() {
    if (!currentSection) return
    setCbr(currentSection.subgrade?.cbr || 7)
    setFlexStr(sectionSavedMor)
    setGrowthRate(trafficData?.growth || 0)
    setDesignLife(20)
    onLayersChange?.(currentSection.layers)
    onTrafficChange?.(null)
    setResetKey(k => k + 1)
  }

  useEffect(() => {
    if (isProject && currentSection) {
      setCbr(currentSection.subgrade?.cbr || 7)
      setFlexStr(originalResult?.mor_psi ?? 700)
      setGrowthRate(trafficData?.growth || 0)
      onLayersChange?.(currentSection.layers)
    } else if (searchedAirport?.icao === currentAirport) {
      setGrowthRate(0)
    }
  }, [currentSectionId, currentAirport])

  // Native FAARFIELD CDF — auto-run on ANY input change
  const [nativeCdf, setNativeCdf] = useState(null)
  const [nativeCdfLoading, setNativeCdfLoading] = useState(false)
  const nativeCdfTimer = React.useRef(null)
  // Guard against parallel FEM solves. A 15 s FEM call can be re-scheduled
  // by input changes while it's running; without this guard we'd pile up
  // overlapping requests and hammer the backend.
  const nativeCdfInflight = React.useRef(false)
  // Track the input signature of the last successful run so we skip redundant
  // fetches when the useEffect re-fires for reference-identity reasons (props
  // returning new array instances without the values changing).
  const lastCdfSignature = React.useRef('')

  // Native FAARFIELD Design — on-demand only (expensive)
  const [nativeDesign, setNativeDesign] = useState(null)
  const [nativeDesignLoading, setNativeDesignLoading] = useState(false)

  // Convert a saved cdf_results.json record into the live-API shape so that
  // the verdict card, CDF bar chart, per-aircraft table, CDF profile chart,
  // and gear footprint top-view can all hydrate immediately from disk —
  // without forcing the backend to recompute results we already have.
  //
  // After the 2026-04-23 batch refactor, top_aircraft_full carries the rich
  // per-aircraft fields (LEAF/FEM stresses, C/P, wheel coords, per-aircraft
  // cdfProfile) and the section record carries the cdf_profile_* arrays.
  // Older records (top_aircraft only) still hydrate the verdict card; the
  // chart/footprint just appear empty until the user triggers a live re-run.
  function savedRecordToNativeShape(rec) {
    if (!rec) return null
    const richTop = rec.top_aircraft_full
    const perAircraft = richTop?.length
      ? richTop.map(a => ({
          icao: a.icao, name: a.name || a.icao,
          mtow: a.mtow, gear: a.gear, libGear: a.libGear ?? null,
          annualDeps: a.annualDeps ?? 0, designDeps: a.designDeps ?? 0,
          cdf: a.cdf ?? 0, cdfMax: a.cdfMax ?? a.cdf ?? 0,
          coverageToPass: a.coverageToPass ?? null,
          leafPccStress: a.leafPccStress ?? null,
          femPccStress: a.femPccStress ?? null,
          effectivePccStress: a.effectivePccStress ?? null,
          femRatio: a.femRatio ?? null,
          geometrySource: a.geometrySource ?? null,
          nWheels: a.nWheels ?? null,
          tireWidth: a.tireWidth ?? null,
          wheelX: a.wheelX ?? null, wheelY: a.wheelY ?? null,
          cdfProfile: a.cdfProfile ?? [],
        }))
      : (rec.top_aircraft || []).map(a => ({
          icao: a.ac, name: a.ac, mtow: a.mtow, gear: a.gear,
          annualDeps: 0, designDeps: 0,
          cdf: a.cdf_contribution ?? a.cdf_total ?? 0,
          cdfMax: a.cdf_max_aircraft ?? a.cdf_total ?? 0,
          coverageToPass: null,
          leafPccStress: null, femPccStress: null,
          effectivePccStress: null, femRatio: null,
          cdfProfile: [],
        }))
    return {
      cdf_ac: rec.cdf_ac, cdf_sub: rec.cdf_sub, cdf_pcc: rec.cdf_pcc,
      cdf_max: rec.cdf_max, controlling: rec.controlling,
      adequate: rec.adequate, controlOffsetIn: rec.control_offset_in,
      perAircraft,
      cdfProfileOffsetsIn: rec.cdf_profile_offsets_in || [],
      cdfProfileAc:         rec.cdf_profile_ac    || [],
      cdfProfileSub:        rec.cdf_profile_sub   || [],
      cdfProfilePcc:        rec.cdf_profile_pcc   || [],
      cdfProfileTotal:      rec.cdf_profile_total || [],
      femUsed:              rec.fem_used ?? true,
      femAircraftCount:     rec.fem_aircraft_count ?? 0,
      femComputeTimeMs:     rec.fem_compute_time_ms ?? 0,
      femMaxRatio:          rec.fem_max_ratio ?? 0,
      femMaxRatioAircraft:  rec.fem_max_ratio_aircraft ?? '',
      solver: 'pre-calculated (results/cdf_results.json batch run)',
      computeTimeMs: 0,
      _hydrated: 'saved',
    }
  }

  useEffect(() => {
    setNativeDesign(null)
    if (nativeCdfTimer.current) clearTimeout(nativeCdfTimer.current)
    // For project sections that match cdf_results.json, hydrate immediately
    // from the saved batch record AND seed lastCdfSignature so the auto-fire
    // effect below skips the initial backend round-trip.  Live recompute
    // still fires the moment any input differs from the saved baseline.
    if (isProject && originalResult && currentSection) {
      const seeded = savedRecordToNativeShape(originalResult)
      setNativeCdf(seeded)
      const baselineLayers = currentSection.layers || []
      const baselineTraffic = trafficData?.aircraft || []
      const layerSig = baselineLayers.map(l => `${l.type}:${l.h}:${l.E}:${l.nu}`).join('|')
      const trafSig = baselineTraffic.map(a =>
        `${a.icao || a.type || ''}:${a.mtow || 0}:${a.annualDepartures || a.deps || 0}:${a.nTires || 0}:${a.tirePressure || 0}`
      ).join('|')
      const baselineMor = originalResult.mor_psi ?? 700
      const baselineGrowth = trafficData?.growth || 0
      const baselineCbr = currentSection.subgrade?.cbr || 7
      lastCdfSignature.current = `${currentAirport}|${currentSectionId}|${layerSig}||${trafSig}||${baselineCbr}|${baselineMor}|${baselineGrowth}|20|${useFem3d ? 'F' : 'L'}`
    } else {
      setNativeCdf(null)
      lastCdfSignature.current = ''
    }
  }, [currentAirport, currentSectionId])

  useEffect(() => {
    // Always cancel any pending fire FIRST.  When the user switches sections,
    // this effect runs once with stale state (queueing a fire), then again
    // after the section-change effect commits new cbr/flexStr/growthRate
    // values.  The second run must cancel the first or a stale backend call
    // executes 2 s later and the spinner reappears even though the saved
    // pre-cal data is already on screen.
    if (nativeCdfTimer.current) {
      clearTimeout(nativeCdfTimer.current)
      nativeCdfTimer.current = null
    }
    // If the backend is momentarily unreachable (poll between heartbeats), or
    // layers/traffic haven't been computed yet for the new section, just bail
    // out without firing.  CRITICALLY: do NOT setNativeCdf(null) here — the
    // section-change effect above (Effect 2) may have just seeded nativeCdf
    // with the saved pre-cal record from cdf_results.json, and clearing it
    // would erase the verdict card / charts the user expects to see on every
    // project section.  The pre-cal is authoritative until an input changes.
    if (!analysisAvailable) return
    const activeLayers = customLayers || currentSection?.layers
    const activeTraffic = customTraffic || trafficData?.aircraft
    if (!activeLayers?.length || !activeTraffic?.length) return

    // Build an input signature from the VALUES (not refs) so reference
    // flapping from parent re-renders doesn't re-fire the effect.
    const layerSig = activeLayers.map(l => `${l.type}:${l.h}:${l.E}:${l.nu}`).join('|')
    const trafSig = activeTraffic.map(a =>
      `${a.icao || a.type || ''}:${a.mtow || 0}:${a.annualDepartures || a.deps || 0}:${a.nTires || 0}:${a.tirePressure || 0}`
    ).join('|')
    const signature = `${currentAirport}|${currentSectionId}|${layerSig}||${trafSig}||${cbr}|${flexStr}|${growthRate}|${designLife}|${useFem3d ? 'F' : 'L'}`
    if (signature === lastCdfSignature.current) return   // nothing actually changed

    // When FEM is on, use a longer debounce (2 s) because each cold solve is
    // ~10-15 s/aircraft. First call on a fresh input set is slow; the backend
    // then caches it and subsequent matching requests return instantly.
    const debounceMs = useFem3d ? 2000 : 600
    nativeCdfTimer.current = setTimeout(async () => {
      if (nativeCdfInflight.current) return   // don't stack parallel FEM solves
      nativeCdfInflight.current = true
      setNativeCdfLoading(true)
      try {
        const leafLayers = activeLayers.map(l => ({ type: l.type, h: l.h, E: l.E, nu: l.nu }))
        const result = await fetchFullCdf(leafLayers, { E: cbrToModulus(cbr || 7), nu: 0.4 },
          activeTraffic, growthRate || 0, designLife, flexStr, 80, acMixDesign, useFem3d)
        setNativeCdf(result.data)
        lastCdfSignature.current = signature
        // Signal the mesh panel to auto-fetch the FEM result that just ran
        // (backend cache will serve instantly).
        if (useFem3d && result.data?.femUsed) setFemCdfToken(t => t + 1)
      } finally {
        nativeCdfInflight.current = false
        setNativeCdfLoading(false)
      }
    }, debounceMs)
    return () => { if (nativeCdfTimer.current) clearTimeout(nativeCdfTimer.current) }
  }, [analysisAvailable, customLayers, customTraffic, cbr, flexStr, growthRate, designLife, currentAirport, currentSectionId, useFem3d])

  // Memoized subgrade for stress visualization — avoids re-render loops from new object refs
  const stressSubgrade = useMemo(() => ({ E: cbrToModulus(cbr || 7), nu: 0.4 }), [cbr])

  // Memoized aircraft for stress visualization — driven by native FAARFIELD per-aircraft data
  const stressAircraft = useMemo(() => {
    const details = nativeCdf?.perAircraft || []
    const defaultAc = { type: 'B738', mtow: 174200, gear: 'D' }
    if (!details.length) return defaultAc
    const sorted = stressAircraftMode === 'top_cdf'
      ? [...details].sort((a, b) => (b.cdf || 0) - (a.cdf || 0))
      : [...details].sort((a, b) => (b.mtow || 0) - (a.mtow || 0))
    const top = sorted[0]
    return top
      ? { type: top.icao || top.name, mtow: top.mtow, gear: top.gear }
      : defaultAc
  }, [nativeCdf?.perAircraft, stressAircraftMode])

  // Step 4: completion checks
  const hasLayers = (customLayers || currentSection?.layers || []).length > 0
  const hasSoil = cbr > 0
  const hasTraffic = (customTraffic || trafficData?.aircraft || []).length > 0
  const hasResult = nativeCdf != null

  // Step 1: Quick adjust helpers
  const pccLayer = (customLayers || []).find(l => l.type?.includes('PCC'))
  const acLayer = (customLayers || []).find(l => l.type?.includes('AC'))
  function quickAdjust(layerType, newH) {
    if (!customLayers) return
    const updated = customLayers.map(l => l.type?.includes(layerType) ? { ...l, h: newH } : l)
    onLayersChange(updated)
  }

  function VerdictCard({ title, result, accent }) {
    if (!result) return (
      <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">{title}</p>
        <p className="text-sm text-outline">Define pavement layers and traffic to run analysis</p>
      </div>
    )
    const life = result.cdf_max > 0 ? designLife / result.cdf_max : Infinity
    const failYear = life < 999 ? baseYear + Math.round(life) : null
    const endYear = baseYear + designLife
    const lifePercent = Math.min((life / designLife) * 100, 999)

    return (
      <div className={`bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)] ${accent ? 'ring-2 ring-primary/20' : ''}`}>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${accent ? 'text-primary' : 'text-outline'} mb-2`}>{title}</p>
        <div className={`text-3xl font-extrabold tracking-tighter ${result.adequate ? 'text-adequate' : 'text-failing'}`}>
          CDF = {result.cdf_max < 0.001 ? result.cdf_max.toExponential(2) : result.cdf_max.toFixed(4)}
        </div>
        <span className={`inline-block mt-2 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded ${
          result.adequate ? 'bg-adequate/10 text-adequate' : 'bg-failing/10 text-failing'
        }`}>{result.adequate ? 'OVER-DESIGNED' : 'UNDER-DESIGNED'}</span>
        <p className="text-xs text-outline mt-1">Controlling: {result.controlling}</p>

        <div className="mt-3 pt-3 border-t border-outline-variant/20 space-y-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline">
              Structure Life <span className="text-outline-variant normal-case tracking-normal">(FAARFIELD: LifeStr)</span>
            </p>
            <p className={`text-xl font-extrabold mt-0.5 ${life < designLife ? 'text-failing' : 'text-adequate'}`}>
              {life >= 999 ? '999+ years' : life < 1 ? `${(life * 12).toFixed(0)} months` : `${life.toFixed(1)} years`}
              {life < designLife && (
                <span className="text-xs font-normal text-outline ml-2">
                  ({(designLife - life).toFixed(1)} yr short of target)
                </span>
              )}
              {life >= designLife && life < 999 && (
                <span className="text-xs font-normal text-outline ml-2">
                  ({(life / designLife).toFixed(1)}× design target)
                </span>
              )}
            </p>
            <p className="text-[10px] text-outline mt-1 italic">
              Life = Design life ÷ CDF = {designLife}÷{result.cdf_max?.toFixed(2)} = {life < 999 ? life.toFixed(1) : '999+'} yr
            </p>
          </div>
          <div className="text-xs text-outline space-y-1">
            <div className="flex justify-between"><span>Base year (traffic data)</span><span className="font-mono font-bold text-on-surface">{baseYear}</span></div>
            <div className="flex justify-between"><span>Design target</span><span className="font-mono font-bold text-on-surface">{designLife} yr → {endYear}</span></div>
          </div>
          {life < designLife && failYear && (
            <div className="bg-failing/10 rounded-lg px-3 py-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-failing">⚠ Pavement fails in</span>
                <span className="text-xl font-extrabold font-mono text-failing">~{failYear}</span>
              </div>
              <p className="text-[10px] text-failing/80 mt-0.5">
                ({Math.round(endYear - failYear)} years before {endYear} target — under-designed)
              </p>
            </div>
          )}
          {life >= designLife && (
            <div className="bg-adequate/10 rounded-lg px-3 py-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-adequate">✓ Adequate through</span>
                <span className="text-xl font-extrabold font-mono text-adequate">{endYear}+</span>
              </div>
              <p className="text-[10px] text-adequate/80 mt-0.5">
                (Meets or exceeds {designLife}-year design target)
              </p>
            </div>
          )}
          <div className="bg-surface-high rounded-full h-2 overflow-hidden">
            <div className={`h-full rounded-full ${life >= designLife ? 'bg-adequate' : 'bg-failing'}`}
              style={{ width: `${Math.min(lifePercent, 100)}%` }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Banner */}
      <section>
        <div className="flex items-center gap-3 mb-2">
          <span className="material-symbols-outlined text-primary text-3xl">engineering</span>
          <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface">FAARFIELD Design Tool</h2>
          <SolverModeBadge available={nativeAvailable} analysisAvailable={analysisAvailable} />
        </div>
        <p className="text-sm text-outline max-w-3xl">
          Analyze any US airport pavement. Project airports auto-fill all data.
          Searched airports require manual pavement layers — soil & traffic auto-fill from live APIs.
        </p>
      </section>

      {/* Step 4: Step indicators */}
      <StepIndicator steps={[
        { label: 'Pavement Layers', complete: hasLayers },
        { label: 'Subgrade', complete: hasSoil },
        { label: 'Traffic Mix', complete: hasTraffic },
        { label: 'Parameters', complete: true },
        { label: 'Results', complete: hasResult },
      ]} />

      {/* Map + Search + Selector */}
      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <Suspense fallback={<Loading />}><AirportMap onSelectAirport={onAirportChange} searchedAirport={searchedAirport} selectedAirport={currentAirport} /></Suspense>
        </div>
        <div className="col-span-4 space-y-4">
          {isProject ? (
            <>
              {/* Search bar (always visible) */}
              <Suspense fallback={<Loading />}><AirportSearch onResult={(result) => {
                onSearchResult(result)
                onAirportChange(result.icao)
                onSectionChange(null)
                onLayersChange([])
                onTrafficChange([])
                setCbr(7)
                setFlexStr(700)
                setGrowthRate(0)
              }} /></Suspense>

              {/* Project airport selector */}
              <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline block mb-1">Project Airport</label>
                <select value={currentAirport} onChange={e => { onAirportChange(e.target.value); onSectionChange(null) }}
                  className="w-full bg-surface-low border-none rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary mb-2">
                  {airports.map(a => <option key={a.icao} value={a.icao}>{a.icao} — {a.name}, {a.state}</option>)}
                </select>
                {airportSections.length > 0 && (
                  <>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-outline block mb-1">Section</label>
                    <select value={currentSectionId || ''} onChange={e => onSectionChange(e.target.value)}
                      className="w-full bg-surface-low border-none rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary">
                      {airportSections.map(s => <option key={s.section_id} value={s.section_id}>{s.section_id} — {s.use} — {s.desc}</option>)}
                    </select>
                  </>
                )}
                <div className="mt-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded text-adequate bg-adequate/10">
                    All data pre-loaded
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Searched airport — merged single panel with search + info + back button */
            <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Custom Analysis</span>
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded text-adequate bg-adequate/10">
                  {searchedAirport?.live ? '🟢 Live' : '🔵 Cached'}
                </span>
              </div>

              {/* Airport info */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-extrabold text-primary">{currentAirport}</span>
                <span className="text-sm font-medium text-on-surface">{searchedAirport?.name || ''}</span>
              </div>
              <p className="text-xs text-outline mb-3">{searchedAirport?.city}, {searchedAirport?.state} — Elev. {searchedAirport?.elevation?.toFixed(0)} ft</p>

              {/* Runways */}
              {searchedAirport?.runways?.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Runways</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {searchedAirport.runways.map((r, i) => (
                      <span key={i} className="text-[10px] bg-surface-low rounded px-2 py-0.5 font-mono">
                        {r.designator} — {r.length}x{r.width} ft — {r.surface}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Soil */}
              {searchedAirport?.soil && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Soil Profile 🟢</p>
                  <p className="text-xs">Dominant: <span className="font-bold">{searchedAirport.soil.dominant}</span></p>
                  <p className="text-[10px] text-outline">{searchedAirport.soil.horizons?.length} horizons — select in Soil Picker below</p>
                </div>
              )}

              <div className="pt-3 border-t border-outline-variant/20 space-y-2">
                <p className="text-xs text-outline">Define pavement layers & traffic below to run analysis.</p>

                {/* Search another */}
                <Suspense fallback={<Loading />}><AirportSearch hideResult onResult={(result) => {
                  onSearchResult(result)
                  onAirportChange(result.icao)
                  onSectionChange(null)
                  onLayersChange([])
                  onTrafficChange([])
                  setCbr(7)
                  setFlexStr(700)
                  setGrowthRate(0)
                }} /></Suspense>

                <button onClick={() => { onAirportChange(airports[0]?.icao); onSectionChange(null); onSearchResult(null); onLayersChange(null); onTrafficChange(null) }}
                  className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Back to project airports
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Live frost-protection lookup for searched (non-project) airports.
          Calls NOAA NCEI Climate Normals 1991-2020 via the /noaa Vite proxy,
          then runs the same Berggren / FAA AC 150/5320-6F treatment math used
          by the project's pre-computed FrostPanel. */}
      {!isProject && searchedAirport?.lat && searchedAirport?.lon && (
        <section>
          <SearchedAirportFrost
            airport={searchedAirport}
            aashtoGroup={searchedAirport?.soil?.dominantAASHTO || null}
            pavementIn={(customLayers || []).reduce((s, l) => s + (l.h || 0), 0) || 14}
          />
        </section>
      )}

      {/* CDF Results — auto-updates on any input change. Native FAARFIELD desktop-parity engine only. */}
      {(() => {
        const activeResult = nativeCdf
        const activeChartData = nativeCdf ? [
          { name: 'AC Fatigue', value: nativeCdf.cdf_ac || 0 },
          { name: 'Subgrade', value: nativeCdf.cdf_sub || 0 },
          { name: 'PCC Fatigue', value: nativeCdf.cdf_pcc || 0 },
        ] : []

        return (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4">
              {nativeCdfLoading ? (
                <div className="flex items-center justify-center bg-surface-lowest rounded-xl p-8 shadow-[0px_12px_32px_rgba(25,28,30,0.06)] h-full">
                  <span className="material-symbols-outlined text-primary animate-spin text-3xl mr-3">progress_activity</span>
                  <span className="text-sm text-outline">Running FAARFIELD engine...</span>
                </div>
              ) : !analysisAvailable ? (
                <div className="bg-surface-lowest rounded-xl p-6 shadow-[0px_12px_32px_rgba(25,28,30,0.06)] border border-failing/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-failing">cloud_off</span>
                    <p className="text-sm font-bold text-failing">FAARFIELD backend offline</p>
                  </div>
                  <p className="text-xs text-outline">
                    CDF analysis requires the native FAARFIELD desktop-parity backend (LEAFClassLib + AMClassLib + 2014 fatigue equations). Start <code className="font-mono">FaarfieldApi.exe</code> at <code className="font-mono">c:/temp/aeropave/faarfield-api/bin/x86/Release/</code> and reload — no approximate fallback is provided.
                  </p>
                </div>
              ) : activeResult ? (
                <>
                  <VerdictCard
                    title="FAARFIELD Analysis"
                    result={activeResult} accent />
                  {nativeCdf.solver && (
                    <p className="text-[9px] text-outline mt-1 text-center">
                      {nativeCdf.solver} | {nativeCdf.computeTimeMs}ms
                    </p>
                  )}

                  {/* Native Design — Required Thickness */}
                  {analysisAvailable && (
                    <div className="mt-3 bg-surface-lowest rounded-xl p-4 shadow-[0px_12px_32px_rgba(25,28,30,0.06)] border border-outline-variant/20">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Required Thickness</p>
                        <button onClick={async () => {
                          setNativeDesignLoading(true)
                          const activeLayers = (customLayers || currentSection?.layers || []).map(l => ({ type: l.type, h: l.h, E: l.E, nu: l.nu }))
                          const activeTraffic = customTraffic || trafficData?.aircraft
                          if (activeLayers.length && activeTraffic?.length) {
                            const result = await fetchDesign(activeLayers, { E: cbrToModulus(cbr || 7), nu: 0.4 },
                              activeTraffic, growthRate || 0, designLife, flexStr, 80, acMixDesign)
                            setNativeDesign(result.data)
                          }
                          setNativeDesignLoading(false)
                        }}
                        disabled={nativeDesignLoading || !hasTraffic || !hasLayers}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          nativeDesignLoading ? 'bg-outline/20 text-outline' : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                        }`}>
                          {nativeDesignLoading
                            ? <><span className="material-symbols-outlined text-xs animate-spin">progress_activity</span> Designing...</>
                            : <><span className="material-symbols-outlined text-xs">straighten</span> Run Design</>
                          }
                        </button>
                      </div>
                      {nativeDesign ? (
                        nativeDesign.requiredThickness > 0 ? (
                          <div>
                            <div className="text-2xl font-extrabold tracking-tighter text-primary">
                              {nativeDesign.requiredThickness.toFixed(1)}"
                            </div>
                            <p className="text-xs text-outline mt-1">
                              {nativeDesign.designConverged ? 'Converged' : 'Did not converge'} in {nativeDesign.designIterations} iterations
                            </p>
                            <p className="text-xs text-outline">
                              Controlling: {nativeDesign.controlling} | CDF at design = {nativeDesign.cdf_max?.toFixed(4)}
                            </p>
                            <p className="text-[9px] text-outline mt-1">{nativeDesign.solver} | {nativeDesign.computeTimeMs}ms</p>
                          </div>
                        ) : (
                          <p className="text-xs text-outline">Traffic too low to require design thickness</p>
                        )
                      ) : (
                        <p className="text-xs text-outline">Click "Run Design" to find the AC overlay thickness needed for CDF = 1.0</p>
                      )}
                    </div>
                  )}

                  {/* Native 3D FEM toggle — FEM runs automatically with every CDF (default ON).
                      Backend caches by inputs, so repeat requests are instant. */}
                  {analysisAvailable && (
                    <div className="mt-3 bg-surface-lowest rounded-xl p-4 shadow-[0px_12px_32px_rgba(25,28,30,0.06)] border border-outline-variant/20">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-outline">3D FEM (Rigid Pavement)</p>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={useFem3d} onChange={e => setUseFem3d(e.target.checked)}
                            className="accent-primary" />
                          <span className="text-[10px] font-bold text-outline">Use 3D FEM</span>
                        </label>
                      </div>
                      {useFem3d ? (
                        <>
                          <p className="text-[10px] text-outline mb-2">
                            CDF above uses the FAARFIELD rule: stress = max(FEM, LEAF × 0.95). FEM re-runs automatically on every input change (~10-15 s per aircraft first time; cached afterwards).
                          </p>
                          {nativeCdfLoading && (
                            <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold">
                              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                              Running FEM on {(customTraffic || trafficData?.aircraft || []).filter(a => (a.mtow || 0) >= 6000).length} aircraft (~{Math.max(1, Math.round((customTraffic || trafficData?.aircraft || []).filter(a => (a.mtow || 0) >= 6000).length * 15 / 60))} min)…
                            </div>
                          )}
                          {!nativeCdfLoading && nativeCdf?.femUsed && (
                            <div className="text-[10px] space-y-0.5">
                              <p className="text-outline">FEM ran on <span className="font-bold text-on-surface">{nativeCdf.femAircraftCount}</span> aircraft in <span className="font-bold text-on-surface">{(nativeCdf.femComputeTimeMs / 1000).toFixed(1)} s</span></p>
                              <p className="text-outline">Max FEM/LEAF ratio: <span className="font-bold text-failing">{nativeCdf.femMaxRatio?.toFixed(2)}×</span> ({nativeCdf.femMaxRatioAircraft})</p>
                            </div>
                          )}
                          {!nativeCdfLoading && !nativeCdf?.femUsed && (
                            <p className="text-[10px] text-outline">Waiting for inputs…</p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-outline">CDF above is LEAF-only. Toggle on to apply the FAARFIELD max(FEM, LEAF×0.95) rule — LEAF alone can under-predict PCC stress for rigid pavements.</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-surface-lowest rounded-xl p-8 shadow-[0px_12px_32px_rgba(25,28,30,0.06)] text-center">
                  <span className="material-symbols-outlined text-outline text-4xl mb-2">engineering</span>
                  <p className="text-sm text-outline">Set up layers and traffic, then click <strong>Run FAARFIELD Analysis</strong></p>
                </div>
              )}
            </div>
            <div className="col-span-8 bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">
                CDF by Failure Mode (FAARFIELD)
              </p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={activeChartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e2e6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#737784' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#737784' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <ReferenceLine y={1} stroke="#ba1a1a" strokeDasharray="6 3" label={{ value: 'CDF=1.0', fill: '#ba1a1a', fontSize: 10 }} />
                  <Bar dataKey="value" name="FAARFIELD" fill="#0047ab" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })()}

      {/* Top-10 gear footprint + CDF-vs-offset profile — moved here so they
          sit immediately below the verdict / "Running FAARFIELD engine..." card,
          before the per-aircraft table further down the page. */}
      {nativeCdf?.perAircraft?.length > 0 && (
        <GearFootprintTopView nativeCdf={nativeCdf} />
      )}
      <CdfProfileChart nativeCdf={nativeCdf} />

      {/* Changes Summary — right below CDF so user sees what changed → what happened */}
      {isProject && (
        <ChangesSummary
          originalSection={currentSection} customLayers={customLayers}
          originalResult={originalResult} modifiedResult={nativeCdf}
          cbr={cbr} growthRate={growthRate} flexStr={flexStr} designLife={designLife}
          trafficData={trafficData} onReset={resetToDefaults}
        />
      )}

      {/* Native LEAF Stress Visualization — shows whenever layers exist, even without traffic */}
      {hasLayers && (
        (() => {
          const activeLayers = customLayers || currentSection?.layers || []
          const details = nativeCdf?.perAircraft || []
          const totalDepth = activeLayers.reduce((s, l) => s + l.h, 0)

          // Label helpers (computed fresh for display, but stressAircraft is memoized)
          const byMtow = [...details].sort((a, b) => (b.mtow || 0) - (a.mtow || 0))
          const byCdf = [...details].sort((a, b) => (b.cdf || 0) - (a.cdf || 0))
          const heaviest = byMtow[0]
          const topCdf = byCdf[0]
          const acIcao = stressAircraft.type || '?'
          const acMtow = (stressAircraft.mtow || 0).toLocaleString()
          const heaviestLabel = heaviest ? `${heaviest.icao || heaviest.name} (${(heaviest.mtow||0).toLocaleString()} lbs)` : 'N/A'
          const topCdfLabel = topCdf ? `${topCdf.icao || topCdf.name} (CDF ${(topCdf.cdf||0).toExponential(2)})` : 'N/A'

          return (
            <>
              {/* Aircraft selector for stress visualization */}
              <div className="bg-surface-lowest rounded-xl p-4 shadow-[0px_12px_32px_rgba(25,28,30,0.06)] flex items-center gap-4">
                <span className="material-symbols-outlined text-primary text-xl">flight</span>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Stress Visualization Aircraft</p>
                  <select value={stressAircraftMode} onChange={e => setStressAircraftMode(e.target.value)}
                    className="bg-surface-low border border-outline-variant/30 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-primary w-full max-w-md">
                    <option value="top_cdf">Design Aircraft (FAA: Highest CDF) — {topCdfLabel}</option>
                    <option value="heaviest">Heaviest Aircraft (Max MTOW) — {heaviestLabel}</option>
                  </select>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-on-surface">{acIcao}</p>
                  <p className="text-[10px] text-outline">{acMtow} lbs | {stressAircraft.gear || '?'} gear</p>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-7">
                  <StressContourPanel
                    layers={activeLayers}
                    subgrade={stressSubgrade}
                    aircraft={stressAircraft}
                    evalDepth={totalDepth}
                    nativeAvailable={nativeAvailable}
                  />
                </div>
                <div className="col-span-5">
                  <RigidStressProfile
                    layers={activeLayers}
                    subgrade={stressSubgrade}
                    aircraft={stressAircraft}
                    nativeAvailable={nativeAvailable}
                  />
                </div>
              </div>

              {/* 3D FEM Mesh Viewer — opt-in via same useFem3d toggle that gates the CDF rule.
                  femCdfToken triggers an auto-fetch after a successful Run FEM CDF pass. */}
              {useFem3d && (
                <Fem3dMeshPanel
                  layers={activeLayers}
                  subgrade={stressSubgrade}
                  aircraft={stressAircraft}
                  enabled={useFem3d}
                  cdfRunToken={femCdfToken}
                />
              )}
            </>
          )
        })()
      )}

      {/* Quick Adjust bar (project airports only, when layers exist) */}
      {hasLayers && pccLayer && (
        <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-base">tune</span>
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Quick Adjust — Drag sliders to change thickness</p>
          </div>
          <div className="grid grid-cols-12 gap-6">
            {acLayer && (
              <div className="col-span-4">
                <label className="text-xs font-bold text-on-surface block mb-1">AC Overlay</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="1" max="8" step="0.5" value={acLayer.h}
                    onChange={e => quickAdjust('AC', +e.target.value)} className="flex-1 accent-primary h-2" />
                  <span className="text-lg font-extrabold font-mono text-primary w-12 text-right">{acLayer.h}"</span>
                </div>
              </div>
            )}
            <div className="col-span-4">
              <label className="text-xs font-bold text-on-surface block mb-1">PCC Slab</label>
              <div className="flex items-center gap-3">
                <input type="range" min="4" max="30" step="0.5" value={pccLayer.h}
                  onChange={e => quickAdjust('PCC', +e.target.value)} className="flex-1 accent-primary h-2" />
                <span className="text-lg font-extrabold font-mono text-primary w-12 text-right">{pccLayer.h}"</span>
              </div>
            </div>
            <div className="col-span-4 flex items-end">
              <div className="bg-surface-low rounded-lg px-4 py-2 w-full text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Total Depth: </span>
                <span className="text-lg font-extrabold font-mono text-on-surface">
                  {(customLayers || []).reduce((s, l) => s + l.h, 0).toFixed(1)}"
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Design Parameters (right after Quick Adjust for easy access) */}
      <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">Design Parameters</p>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="text-xs font-bold text-on-surface block mb-1">PCC Flexural Strength</label>
            <div className="flex items-center gap-2">
              <input type="range" min={400} max={1000} step={25} value={flexStr}
                onChange={e => setFlexStr(+e.target.value)} className="flex-1 accent-primary" />
              <span className="text-sm font-mono font-bold w-20 text-right">{flexStr} psi</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-on-surface block mb-1">Growth Rate</label>
            <div className="flex items-center gap-2">
              <input type="range" min={-5} max={10} step={0.1} value={+(growthRate * 100).toFixed(1)}
                onChange={e => setGrowthRate(+e.target.value / 100)} className="flex-1 accent-primary" />
              <span className="text-sm font-mono font-bold w-20 text-right">{(growthRate * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-on-surface block mb-1">Design Life</label>
            <div className="flex items-center gap-2">
              <input type="range" min={5} max={40} step={1} value={designLife}
                onChange={e => setDesignLife(+e.target.value)} className="flex-1 accent-primary" />
              <span className="text-sm font-mono font-bold w-20 text-right">{designLife} yr</span>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-outline mt-3">
          Subgrade: CBR = <span className="font-mono font-bold">{cbr}</span> → E = {cbrToModulus(cbr).toLocaleString()} psi | k = {modulusToK(cbrToModulus(cbr)).toFixed(0)} pci
          <span className="text-outline-variant ml-1">(set in Soil Horizon Picker below)</span>
        </p>

        {/* AC Mix Design for RDEC Fatigue Model */}
        <div className="mt-4 pt-4 border-t border-outline-variant/20">
          <button onClick={() => setShowMixDesign(!showMixDesign)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-outline hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-sm">{showMixDesign ? 'expand_less' : 'expand_more'}</span>
            AC Mix Design (RDEC Fatigue Model)
            {Object.values(acMixDesign).some(v => v > 0)
              ? <span className="text-primary bg-primary/10 px-2 py-0.5 rounded normal-case tracking-normal">Custom values</span>
              : <span className="text-outline bg-outline/10 px-2 py-0.5 rounded normal-case tracking-normal">Using defaults</span>
            }
          </button>
          {showMixDesign && (
            <div className="mt-3 grid grid-cols-3 gap-4">
              {[
                { key: 'flexuralMod', label: 'Flexural Modulus', unit: 'psi', def: 600000, min: 100000, max: 1500000, step: 50000 },
                { key: 'airVoids', label: 'Air Voids', unit: '%', def: 3.5, min: 1, max: 10, step: 0.5 },
                { key: 'asphaltVol', label: 'Asphalt Content (vol)', unit: '%', def: 12, min: 5, max: 20, step: 0.5 },
                { key: 'pnms', label: '% Passing NMS', unit: '%', def: 95, min: 80, max: 100, step: 1 },
                { key: 'ppcs', label: '% Passing PCS', unit: '%', def: 58, min: 30, max: 80, step: 1 },
                { key: 'p200', label: '% Passing #200', unit: '%', def: 4.5, min: 1, max: 12, step: 0.5 },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-bold text-outline block mb-1">{f.label}</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min={f.min} max={f.max} step={f.step}
                      value={acMixDesign[f.key] || ''}
                      placeholder={f.def}
                      onChange={e => setAcMixDesign(prev => ({ ...prev, [f.key]: e.target.value ? +e.target.value : 0 }))}
                      className="w-full bg-surface-low border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs font-mono text-center focus:ring-2 focus:ring-primary" />
                    <span className="text-[10px] text-outline w-8">{f.unit}</span>
                  </div>
                </div>
              ))}
              <div className="col-span-3 flex items-center justify-between">
                <p className="text-[10px] text-outline">Leave blank to use FAARFIELD defaults. Values affect AC fatigue life calculation.</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAcMixDesign({ flexuralMod: 0, airVoids: 0, asphaltVol: 0, pnms: 0, ppcs: 0, p200: 0 })}
                    className="text-[10px] font-bold text-outline hover:text-primary px-3 py-1.5 rounded-lg bg-surface-low">
                    Reset to Defaults
                  </button>
                  <button onClick={async () => {
                      setNativeCdfLoading(true)
                      const activeLayers = (customLayers || currentSection?.layers || []).map(l => ({ type: l.type, h: l.h, E: l.E, nu: l.nu }))
                      const activeTraffic = customTraffic || trafficData?.aircraft
                      if (activeLayers.length && activeTraffic?.length) {
                        const result = await fetchFullCdf(activeLayers, { E: cbrToModulus(cbr || 7), nu: 0.4 },
                          activeTraffic, growthRate || 0, designLife, flexStr, 80, acMixDesign)
                        setNativeCdf(result.data)
                      }
                      setNativeCdfLoading(false)
                    }}
                    disabled={nativeCdfLoading}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      nativeCdfLoading ? 'bg-outline/20 text-outline' : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                    }`}>
                    {nativeCdfLoading
                      ? <><span className="material-symbols-outlined text-xs animate-spin">progress_activity</span> Running...</>
                      : <><span className="material-symbols-outlined text-xs">play_arrow</span> Re-Analyze</>
                    }
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Combined Pavement + Subgrade panel — cross-section on left, layer editor + soil horizon picker on right */}
      <Suspense fallback={<Loading />}>
        <PavementPanel
          initialLayers={currentSection?.layers}
          customLayers={customLayers}
          onLayersChange={onLayersChange}
          isProjectAirport={isProject}
          horizons={(searchedSoilHorizons || sub?.horizons || []).map(h => ({
            hz: h.hz || h.component, topCm: h.top || h.topCm, botCm: h.bot || h.botCm,
            texture: h.texture, sand: h.sand, silt: h.silt, clay: h.clay,
            ll: h.ll, pi: h.pi, pass200: h.pass200
          }))}
          pavementDepthIn={(customLayers || currentSection?.layers || []).reduce((s, l) => s + l.h, 0)}
          onSelectCBR={val => { if (val !== cbr) setCbr(val) }}
          cbr={cbr}
          resetKey={resetKey}
          pccYear={originalResult?.pcc_year}
          overlayYear={originalResult?.overlay_year}
        />
      </Suspense>

      {/* Traffic */}
      <Suspense fallback={<Loading />}>
        <TrafficBuilder icao={currentAirport} onTrafficChange={onTrafficChange} growthRate={growthRate} />
      </Suspense>

      {/* Top Aircraft by CDF Contribution — prefers native backend response */}
      {(() => {
        const nativePerAc = nativeCdf?.perAircraft
        if (nativePerAc?.length) {
          const rows = [...nativePerAc].sort((a, b) => (b.cdf || 0) - (a.cdf || 0)).slice(0, 10)
          return (
            <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Top Aircraft by CDF Contribution</p>
                {nativeCdf?._hydrated === 'saved' ? (
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary" title="Pre-calculated from results/cdf_results.json — change any input to trigger a live re-run for full per-aircraft breakdown">
                    pre-calculated batch (top 5)
                  </span>
                ) : (
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-adequate/10 text-adequate">
                    native FAARFIELD engine
                  </span>
                )}
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-outline border-b border-outline-variant/20">
                    <th className="text-left py-2 px-3">Aircraft</th>
                    <th className="text-right py-2 px-3">MTOW (lb)</th>
                    <th className="text-center py-2 px-3">Gear</th>
                    <th className="text-right py-2 px-3">Annual</th>
                    <th className="text-right py-2 px-3" title="Coverage-to-Pass at controlling lateral offset">C/P</th>
                    <th className="text-right py-2 px-3">Design Deps</th>
                    <th className="text-right py-2 px-3" title="LEAF σx/σy at PCC bottom (axisymmetric layered elastic)">σ_LEAF (psi)</th>
                    <th className="text-right py-2 px-3" title="FAASR3D σ at PCC bottom (3D rigid FEM via AMClassLib)">σ_FEM (psi)</th>
                    <th className="text-right py-2 px-3" title="max(σ_FEM, σ_LEAF × 0.95) — value actually used in PCC fatigue Nf">σ_eff (psi)</th>
                    <th className="text-right py-2 px-3" title="σ_FEM / σ_LEAF — values >1 mean FEM dominates the design">FEM/LEAF</th>
                    <th className="text-right py-2 px-3">CDF</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a, i) => (
                    <tr key={i} className="border-t border-outline-variant/10 hover:bg-surface-low">
                      <td className="py-2 px-3 font-mono font-bold">{a.icao || a.name}</td>
                      <td className="py-2 px-3 text-right font-mono">{a.mtow?.toLocaleString()}</td>
                      <td className="py-2 px-3 text-center" title={a.libGear && a.gear && a.libGear.toUpperCase() !== (a.gear || '').toUpperCase() ? `Library: ${a.libGear}  ·  Traffic supplied: ${a.gear}` : undefined}>
                        {a.libGear && a.gear && a.libGear.toUpperCase() !== (a.gear || '').toUpperCase()
                          ? <span className="text-failing" title={`Library: ${a.libGear}  ·  Traffic: ${a.gear}`}>{a.libGear}<span className="text-[8px] text-outline ml-0.5">≠{a.gear}</span></span>
                          : (a.libGear || a.gear || '?')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{a.annualDeps?.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right font-mono">{a.coverageToPass?.toFixed(3) ?? '—'}</td>
                      <td className="py-2 px-3 text-right font-mono">{a.designDeps?.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {a.leafPccStress != null ? a.leafPccStress.toFixed(1) : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {a.femPccStress != null && a.femPccStress > 0 ? a.femPccStress.toFixed(1) : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {a.effectivePccStress != null ? a.effectivePccStress.toFixed(1) : (a.leafPccStress?.toFixed(1) ?? '—')}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono ${a.femRatio > 1 ? 'text-failing font-bold' : 'text-outline'}`}>
                        {a.femRatio != null && a.femRatio > 0 ? a.femRatio.toFixed(2) + '×' : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{a.cdf?.toExponential(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-outline mt-2">
                Per-aircraft CDF contributions from FAARFIELD desktop-parity engine ({nativeCdf.solver}). <strong>σ_LEAF</strong> = horizontal stress at PCC bottom from LEAFClassLib (axisymmetric layered elastic). <strong>σ_FEM</strong> = stress at PCC bottom from FAASR3D (3D rigid FEM via AMClassLib). <strong>σ_eff</strong> = max(σ_FEM, σ_LEAF × 0.95) — the value actually plugged into the PCC fatigue Nf equation. <strong>FEM/LEAF</strong> ratio shows which engine drives the design (red bold = FEM dominates). For AC fatigue and subgrade rutting, the strain inputs (ε_h at AC bottom, ε_v at subgrade top) come from LEAF only and are not currently surfaced in this table.
              </p>
            </div>
          )
        }
        if (nativeCdfLoading) {
          return (
            <div className="bg-surface-lowest rounded-xl p-6 shadow-[0px_12px_32px_rgba(25,28,30,0.06)] flex items-center justify-center">
              <span className="material-symbols-outlined text-primary animate-spin text-2xl mr-3">progress_activity</span>
              <span className="text-sm text-outline">Computing per-aircraft CDF via native FAARFIELD engine...</span>
            </div>
          )
        }
        if (!analysisAvailable) {
          return (
            <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)] border border-failing/30">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-failing">warning</span>
                <p className="text-sm font-bold text-failing">Backend offline — per-aircraft CDF unavailable</p>
              </div>
              <p className="text-xs text-outline">
                CDF requires the native FAARFIELD desktop-parity backend. No approximate JS fallback is provided — every reported number must come from <code className="font-mono">LEAFClassLib + AMClassLib + LeafCDFRigid_2014</code>. Start <code className="font-mono">FaarfieldApi.exe</code> at <code className="font-mono">c:/temp/aeropave/faarfield-api/bin/x86/Release/</code> and reload.
              </p>
            </div>
          )
        }
        return null
      })()}

    </div>
  )
}
