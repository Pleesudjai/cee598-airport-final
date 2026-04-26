import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchLeafGrid } from '../api/nativeStressClient'

const FIELDS = [
  { key: 'stressZ', label: 'Vertical Stress (σz)', unit: 'psi' },
  { key: 'stressX', label: 'Horizontal Stress (σx)', unit: 'psi' },
  { key: 'stressY', label: 'Horizontal Stress (σy)', unit: 'psi' },
  { key: 'deflZ', label: 'Vertical Deflection (δz)', unit: 'in' },
  { key: 'stressMaxShear', label: 'Max Shear Stress (τmax)', unit: 'psi' },
]

export default function StressContourPanel({ layers, subgrade, aircraft, evalDepth, nativeAvailable, sectionKey = null }) {
  const [gridData, setGridData] = useState(null)
  const [gridSource, setGridSource] = useState(null)  // 'precal' | 'native'
  const [loading, setLoading] = useState(false)
  const [field, setField] = useState('stressZ')
  const [error, setError] = useState(null)
  const plotRef = useRef(null)
  const debounceRef = useRef(null)

  // Clear old data and Plotly chart when inputs change. Also reset the field
  // selector to Vertical Stress (σz) — the engineering default — on every
  // section / aircraft swap so the user lands on a consistent starting view.
  useEffect(() => {
    setGridData(null)
    setError(null)
    setField('stressZ')
    if (plotRef.current && window.Plotly) {
      try { window.Plotly.purge(plotRef.current) } catch {}
    }
  }, [layers, subgrade, aircraft, evalDepth])

  // Fetch new data with debounce. Try live backend first; if unavailable,
  // fetchLeafGrid falls back to the pre-baked precal cache when sectionKey
  // matches a baked (section, aircraft) pair.
  useEffect(() => {
    if (!layers?.length || !aircraft) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
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
        const result = await fetchLeafGrid(leafLayers, subgrade, leafAc, evalDepth, 21, null, sectionKey)
        if (result.data) {
          setGridData(result.data)
          setGridSource(result.source || 'native')
        } else {
          setError(nativeAvailable ? 'Backend unavailable' : 'No pre-cal\'d data for this aircraft. Start faarfield-api for live LEAF.')
        }
      } catch (e) {
        setError(e.message || 'Fetch failed')
      }
      setLoading(false)
    }, 500)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [layers, subgrade, aircraft, evalDepth, nativeAvailable, sectionKey])

  // Render Plotly chart ONLY when gridData is valid
  useEffect(() => {
    if (!gridData || !plotRef.current || !window.Plotly) return
    const z = gridData[field]
    const x = gridData.xCoords
    const y = gridData.yCoords
    if (!z || !x || !y) return

    // Guard against Plotly race condition: element must be in DOM and have dimensions
    if (!plotRef.current.isConnected || plotRef.current.offsetWidth === 0) return

    try {
      const fieldInfo = FIELDS.find(f => f.key === field) || FIELDS[0]
      const xMin = Math.min(...x), xMax = Math.max(...x)
      const yMin = Math.min(...y), yMax = Math.max(...y)
      const nx = x.length, ny = y.length
      const mid = Math.floor(nx / 2)
      console.log(`[StressContourPanel] Rendering ${field}: x=[${xMin},${xMax}] y=[${yMin},${yMax}]`)
      console.log(`  z_range=[${Math.min(...z.flat()).toFixed(2)}, ${Math.max(...z.flat()).toFixed(2)}]`)
      console.log(`  z at center (${x[mid]},${y[mid]}): ${z[mid][mid]?.toFixed(2)}`)
      console.log(`  z at corner (${x[0]},${y[0]}): ${z[0][0]?.toFixed(2)}`)
      console.log(`  z at corner (${x[nx-1]},${y[ny-1]}): ${z[ny-1][nx-1]?.toFixed(2)}`)
      console.log(`  full raw gridData.stressZ[10][10]:`, gridData.stressZ?.[10]?.[10])
      console.log(`  full raw gridData.stressX[10][10]:`, gridData.stressX?.[10]?.[10])
      window.Plotly.react(plotRef.current, [{
        z, x, y,
        type: 'contour',
        colorscale: 'Viridis',
        contours: { coloring: 'heatmap' },
        colorbar: { title: { text: fieldInfo.unit, side: 'right' }, thickness: 12, len: 0.85, x: 1.0 },
      }], {
        title: { text: `${fieldInfo.label} at depth ${evalDepth}"`, font: { size: 13 } },
        xaxis: { title: 'X (in)', range: [xMin, xMax], scaleanchor: 'y' },
        yaxis: { title: 'Y (in)', range: [yMin, yMax] },
        margin: { t: 60, r: 90, b: 50, l: 50 },
        height: 400,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        // Park the modebar in the top margin, horizontal — never overlaps the
        // colorbar (which lives inside the right margin).
        modebar: { orientation: 'h', bgcolor: 'rgba(255,255,255,0)', color: '#737784', activecolor: '#0047ab' },
      }, {
        responsive: true,
        displayModeBar: 'hover',         // appears only when hovering the plot
        displaylogo: false,              // hide Plotly watermark
        // Keep only the buttons engineers actually use on a stress contour:
        // zoom (drag-rect), zoomIn / zoomOut, pan, autoScale (= reset), download.
        modeBarButtonsToRemove: ['select2d', 'lasso2d', 'hoverClosestCartesian', 'hoverCompareCartesian', 'toggleSpikelines'],
        toImageButtonOptions: { format: 'png', filename: `stress_${field}_${evalDepth}in`, scale: 2 },
      })
    } catch (e) {
      console.error('Plotly render error:', e)
      setError('Chart render error')
    }
  }, [gridData, field, evalDepth])

  return (
    <div className="rounded-2xl bg-surface-lowest p-6 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-on-surface">Stress Contour (Native LEAF)</h3>
        <select value={field} onChange={e => setField(e.target.value)}
          className="text-xs bg-surface-low border border-outline-variant/30 rounded-lg px-2 py-1 text-on-surface">
          {FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <span className="material-symbols-outlined text-primary animate-spin text-3xl">progress_activity</span>
          <span className="ml-2 text-sm text-outline">Computing LEAF response...</span>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-8 text-outline text-xs">{error}</div>
      )}

      <div ref={plotRef} style={{ display: (loading || error || !gridData) ? 'none' : 'block' }} />

      {gridData?.meta && !loading && (
        <p className="text-[10px] text-outline mt-2 text-right">
          {gridSource === 'precal' && <span className="text-green-700 font-semibold">⚡ precal · </span>}
          Solver: {gridData.meta.solver} | Grid: {gridData.xCoords?.length}x{gridData.yCoords?.length} | {gridData.meta.computeTimeMs}ms
        </p>
      )}
    </div>
  )
}
