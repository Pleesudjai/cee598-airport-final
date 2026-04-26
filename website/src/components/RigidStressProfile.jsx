import { useState, useEffect, useRef } from 'react'
import { fetchLeafProfile } from '../api/nativeStressClient'

export default function RigidStressProfile({ layers, subgrade, aircraft, nativeAvailable, sectionKey = null }) {
  const [profileData, setProfileData] = useState(null)
  const [profileSource, setProfileSource] = useState(null)  // 'precal' | 'native'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const plotRef = useRef(null)
  const debounceRef = useRef(null)

  // Clear old data when inputs change
  useEffect(() => {
    setProfileData(null)
    setError(null)
    if (plotRef.current && window.Plotly) {
      try { window.Plotly.purge(plotRef.current) } catch {}
    }
  }, [layers, subgrade, aircraft])

  useEffect(() => {
    if (!layers?.length || !aircraft) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        // Build depth array: 0.5" increments through all layers + 2" into subgrade
        const totalThick = layers.reduce((s, l) => s + l.h, 0)
        const depths = []
        for (let d = 0.25; d <= totalThick + 2; d += 0.5) depths.push(d)

        const leafLayers = layers.map(l => ({ type: l.type, h: l.h, E: l.E, nu: l.nu }))
        const icao = aircraft.type || aircraft.aircraft || aircraft.icao || ''
        const leafAc = {
          name: icao || 'Aircraft',
          icao: icao,
          gear: aircraft.gear || 'D',
          mtow: aircraft.mtow || 50000,
          gearLoad: (aircraft.mtow || 50000) * 0.95,
          nTires: 2,
          tirePressure: 200,
          tireSpacingIn: 34,
        }
        const result = await fetchLeafProfile(leafLayers, subgrade, leafAc, depths, sectionKey)
        if (result.data) {
          setProfileData(result.data)
          setProfileSource(result.source || 'native')
        } else if (!nativeAvailable) {
          setError('No pre-cal\'d profile for this aircraft. Start faarfield-api for live LEAF.')
        } else {
          setError(`Backend: ${result.source}${result.detail ? ' — ' + result.detail : ''}`)
        }
      } catch (e) {
        setError(e.message || 'Fetch failed')
      }
      setLoading(false)
    }, 500)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [layers, subgrade, aircraft, nativeAvailable, sectionKey])

  useEffect(() => {
    if (!profileData || !profileData.depths || !plotRef.current || !window.Plotly) return
    if (!plotRef.current.isConnected || plotRef.current.offsetWidth === 0) return

    try {
    // Layer boundaries
    const boundaries = []
    let cum = 0
    for (const l of (layers || [])) {
      cum += l.h
      boundaries.push({ depth: cum, label: l.type })
    }

    const shapes = boundaries.map(b => ({
      type: 'line', x0: -0.05, x1: 1.05, xref: 'paper',
      y0: b.depth, y1: b.depth,
      line: { color: '#737784', width: 1, dash: 'dash' },
    }))

    const annotations = boundaries.map(b => ({
      x: 1.02, xref: 'paper', y: b.depth, yref: 'y',
      text: b.label.replace('P-401 ', '').replace('P-501 ', ''),
      showarrow: false, font: { size: 9, color: '#737784' }, xanchor: 'left',
    }))

    const acLabel = aircraft?.aircraft || aircraft?.type || aircraft?.icao || ''

    window.Plotly.react(plotRef.current, [
      {
        x: profileData.stressX, y: profileData.depths,
        type: 'scatter', mode: 'lines', name: 'σx',
        line: { color: '#1a73e8', width: 2 },
      },
      {
        x: profileData.stressY, y: profileData.depths,
        type: 'scatter', mode: 'lines', name: 'σy',
        line: { color: '#e8710a', width: 2 },
      },
      {
        x: profileData.stressZ, y: profileData.depths,
        type: 'scatter', mode: 'lines', name: 'σz',
        line: { color: '#0d652d', width: 2, dash: 'dot' },
      },
    ], {
      title: { text: `Stress vs Depth — ${acLabel} (under load center)`, font: { size: 13 } },
      xaxis: { title: 'Stress (psi)', zeroline: true, zerolinecolor: '#ccc' },
      yaxis: { title: 'Depth (in)', autorange: 'reversed' },
      shapes, annotations,
      margin: { t: 40, r: 60, b: 50, l: 50 },
      height: 400,
      legend: { x: 0, y: 1, bgcolor: 'rgba(255,255,255,0.8)', font: { size: 10 } },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
    }, { responsive: true, displayModeBar: false })
    } catch (e) {
      console.error('Plotly profile error:', e)
      setError('Chart render error: ' + e.message)
    }
  }, [profileData, layers, aircraft])

  return (
    <div className="rounded-2xl bg-surface-lowest p-6 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
      <h3 className="text-sm font-bold text-on-surface mb-3">Stress vs Depth (Native LEAF)</h3>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <span className="material-symbols-outlined text-primary animate-spin text-3xl">progress_activity</span>
          <span className="ml-2 text-sm text-outline">Computing depth profile...</span>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-failing text-2xl mb-1">error</span>
          <p className="text-xs text-outline">{error}</p>
        </div>
      )}

      {!loading && !error && !profileData && (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-outline text-2xl mb-1">ssid_chart</span>
          <p className="text-xs text-outline">Waiting for stress profile data...</p>
        </div>
      )}

      <div ref={plotRef} style={{ display: (loading || error || !profileData) ? 'none' : 'block' }} />

      {profileData?.meta && !loading && (
        <p className="text-[10px] text-outline mt-2 text-right">
          {profileSource === 'precal' && <span className="text-green-700 font-semibold">⚡ precal · </span>}
          Solver: {profileData.meta.solver} | {profileData.depths?.length} depths | {profileData.meta.computeTimeMs}ms
        </p>
      )}
    </div>
  )
}
