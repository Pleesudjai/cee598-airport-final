import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { fetchFem3dMesh } from '../api/nativeStressClient'

// Viridis colorscale (9-stop) — maps [0, 1] scalar to "rgb(r,g,b)".
const VIRIDIS = [
  [0.00, [68, 1, 84]],
  [0.125, [72, 40, 120]],
  [0.25, [62, 73, 137]],
  [0.375, [49, 104, 142]],
  [0.50, [38, 130, 142]],
  [0.625, [31, 158, 137]],
  [0.75, [53, 183, 121]],
  [0.875, [110, 206, 88]],
  [1.00, [253, 231, 37]],
]
function viridis(t) {
  t = Math.max(0, Math.min(1, t))
  for (let i = 0; i < VIRIDIS.length - 1; i++) {
    const [t0, c0] = VIRIDIS[i], [t1, c1] = VIRIDIS[i + 1]
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0 || 1)
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * f)
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * f)
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * f)
      return `rgb(${r},${g},${b})`
    }
  }
  return 'rgb(253,231,37)'
}

// Derive a per-element scalar from the 6-component FEM stress tensor.
// Tensor row = [sigmaX, sigmaY, sigmaZ, tauXY, tauYZ, tauXZ] in psi.
// FAARFIELD sign convention: positive = tension; +Z = downward into pavement.
function deriveScalar(row, component) {
  if (!row) return 0
  const [sx, sy, sz, txy, tyz, txz] = row
  switch (component) {
    case 'sigmaX': return sx
    case 'sigmaY': return sy
    case 'sigmaZ': return sz
    case 'tauMax': {
      // Max shear from invariants: sqrt(((sx-sy)/2)^2 + txy^2)
      // 3D τmax is half the difference of max & min principal stresses.
      const mean = (sx + sy + sz) / 3
      const dev = [sx - mean, sy - mean, sz - mean]
      // Solve principal stresses of the deviatoric tensor (cubic). Use the
      // closed-form for symmetric 3x3 via second invariant J2:
      const j2 = 0.5 * (dev[0] * dev[0] + dev[1] * dev[1] + dev[2] * dev[2])
        + txy * txy + tyz * tyz + txz * txz
      // For visualization we approximate τmax with sqrt(J2) — exact for
      // pure shear, slight underestimate for triaxial states. Good enough
      // for engineering color contours.
      return Math.sqrt(j2)
    }
    case 'mises': {
      // Von Mises: sqrt(0.5*((sx-sy)^2 + (sy-sz)^2 + (sz-sx)^2 + 6*(txy^2 + tyz^2 + txz^2)))
      return Math.sqrt(
        0.5 * ((sx - sy) ** 2 + (sy - sz) ** 2 + (sz - sx) ** 2)
          + 3 * (txy * txy + tyz * tyz + txz * txz)
      )
    }
    case 'sigma1': {
      // Max principal stress — eigenvalue of the symmetric 3x3 stress tensor.
      // Use the Smith trigonometric closed form for stability.
      const mean = (sx + sy + sz) / 3
      const a = sx - mean, b = sy - mean, c = sz - mean
      const j2 = 0.5 * (a * a + b * b + c * c) + txy * txy + tyz * tyz + txz * txz
      // det(deviatoric)
      const j3 = a * (b * c - tyz * tyz) - txy * (txy * c - tyz * txz) + txz * (txy * tyz - b * txz)
      if (j2 < 1e-12) return mean
      const r = j3 / 2 * Math.pow(3 / j2, 1.5)
      const arg = Math.max(-1, Math.min(1, r))
      const phi = Math.acos(arg) / 3
      return mean + 2 * Math.sqrt(j2 / 3) * Math.cos(phi)
    }
    default: return sz
  }
}

// Build per-triangle scalar by mapping each tri to its source brick and
// deriving the requested scalar from the brick's stress tensor.
//
// When aggregation === 'auto' AND the backend sent tensorTop / tensorBottom,
// route each tri to the GP set that matches its face kind:
//   top face    → tensorTop[brickId]    (GP 5-8 avg, upper half of brick)
//   bottom face → tensorBottom[brickId] (GP 1-4 avg, lower half of brick)
//   side face   → mean tensor (fallback — side faces span both halves)
// This is the senior-codex Stage 3 fix: resolves slab-bending top vs bottom
// so σy flips sign through a PCC layer under a wheel load.
function computeTriangleStressFromTensor(mesh, component, aggregation) {
  if (!mesh) return null
  const { surfaceTriBrickIds, elementStressTensor, elementStressTensorTop,
          elementStressTensorBottom, surfaceTriFaceKinds } = mesh
  if (!surfaceTriBrickIds || !elementStressTensor) return null
  const nTris = surfaceTriBrickIds.length
  const out = new Float32Array(nTris)
  const autoMode = aggregation === 'auto'
    && elementStressTensorTop && elementStressTensorBottom && surfaceTriFaceKinds
  for (let t = 0; t < nTris; t++) {
    const brickId = surfaceTriBrickIds[t]
    let row = elementStressTensor[brickId]
    if (autoMode) {
      const kind = surfaceTriFaceKinds[t]
      if (kind === 'top') row = elementStressTensorTop[brickId]
      else if (kind === 'bottom') row = elementStressTensorBottom[brickId]
    }
    out[t] = deriveScalar(row, component)
  }
  return out
}

function buildTraces(mesh, colorMode, triStress, stressRange, wheelDiagnostics, meshBounds, faceFilter = 'all') {
  const { nodeCoords, surfaceTriNodes, surfaceTriLayerIds, surfaceTriFaceKinds, layers, wheelLoads, slabDomain } = mesh
  if (!nodeCoords || !surfaceTriNodes) return []

  // Face filter predicate — used to skip tris that don't match the user's face pick.
  const faceOk = (t) => {
    if (faceFilter === 'all' || !surfaceTriFaceKinds) return true
    const k = surfaceTriFaceKinds[t]
    if (faceFilter === 'top') return k === 'top'
    if (faceFilter === 'bottom') return k === 'bottom'
    if (faceFilter === 'sides') return k === 'side'
    if (faceFilter === 'topbottom') return k === 'top' || k === 'bottom'
    return true
  }

  const nNodes = nodeCoords.length / 3
  const xArr = new Array(nNodes), yArr = new Array(nNodes), zArr = new Array(nNodes)
  for (let i = 0; i < nNodes; i++) {
    xArr[i] = nodeCoords[i * 3]
    yArr[i] = nodeCoords[i * 3 + 1]
    zArr[i] = nodeCoords[i * 3 + 2]
  }

  const layerLookup = {}
  for (const l of layers || []) layerLookup[l.id] = l

  const traces = []

  if (colorMode === 'stress' && triStress && stressRange) {
    const nTris = surfaceTriLayerIds.length
    const [smin, smax] = stressRange
    const span = smax - smin || 1
    const fc = []
    const iArr = [], jArr = [], kArr = []
    for (let t = 0; t < nTris; t++) {
      if (!faceOk(t)) continue
      const base = t * 3
      iArr.push(surfaceTriNodes[base])
      jArr.push(surfaceTriNodes[base + 1])
      kArr.push(surfaceTriNodes[base + 2])
      fc.push(viridis((triStress[t] - smin) / span))
    }
    traces.push({
      type: 'mesh3d',
      name: 'Stress heatmap',
      x: xArr, y: yArr, z: zArr,
      i: iArr, j: jArr, k: kArr,
      facecolor: fc,
      flatshading: true,
      lighting: { ambient: 0.85, diffuse: 0.4, specular: 0.05, roughness: 0.9 },
      showlegend: false,
      hoverinfo: 'skip',
    })
    traces.push({
      type: 'scatter3d', mode: 'markers',
      x: [slabDomain?.xMin ?? 0], y: [slabDomain?.yMin ?? 0], z: [slabDomain?.zMin ?? 0],
      marker: {
        size: 0.01, opacity: 0,
        color: [smin], cmin: smin, cmax: smax, colorscale: 'Viridis',
        showscale: true,
        colorbar: { title: { text: 'σ (psi)', side: 'right' }, thickness: 14, len: 0.7, x: 1.02 },
      },
      hoverinfo: 'skip', showlegend: false,
    })
  } else {
    // Layer color mode: one trace per layer.
    const byLayer = new Map()
    const nTris = surfaceTriLayerIds.length
    for (let t = 0; t < nTris; t++) {
      if (!faceOk(t)) continue
      const lid = surfaceTriLayerIds[t]
      let bucket = byLayer.get(lid)
      if (!bucket) { bucket = { i: [], j: [], k: [] }; byLayer.set(lid, bucket) }
      const base = t * 3
      bucket.i.push(surfaceTriNodes[base])
      bucket.j.push(surfaceTriNodes[base + 1])
      bucket.k.push(surfaceTriNodes[base + 2])
    }
    // Render layers in top-down order for a consistent legend.
    const sortedLids = [...byLayer.keys()].sort((a, b) => a - b)
    for (const lid of sortedLids) {
      const bucket = byLayer.get(lid)
      const info = layerLookup[lid] || { name: `Layer ${lid}`, color: '#888' }
      traces.push({
        type: 'mesh3d',
        name: info.name,
        x: xArr, y: yArr, z: zArr,
        i: bucket.i, j: bucket.j, k: bucket.k,
        color: info.color,
        opacity: 1,
        flatshading: false,
        // Uniform flat lighting — each face renders with the layer's base color
        // regardless of orientation. Softer-looking but avoids per-triangle
        // shading artifacts where FAARFIELD's mesh mixes different element
        // sizes on the same surface (fine-mesh refinement zones under wheels
        // neighbor coarser elements, and per-triangle lighting can show
        // adjacent quads in noticeably different shades).
        lighting: { ambient: 1.0, diffuse: 0, specular: 0, roughness: 1, fresnel: 0 },
        showlegend: true,
        hovertemplate: `${info.name}<br>x=%{x:.1f}" y=%{y:.1f}" z=%{z:.1f}"<extra></extra>`,
      })
    }
  }

  if (wheelLoads && wheelLoads.length > 0) {
    const zTop = slabDomain ? slabDomain.zMax : 0
    const zLift = (slabDomain && (slabDomain.zMax - slabDomain.zMin) * 0.02) || 0.5

    // Wheel markers intentionally NOT drawn here. The wheelLoads /
    // wheelDiagnostics positions are reported in the AIRCRAFT frame, but
    // FAARFIELD's single-slab FEM applies an equivalent-loading approximation
    // near the mesh origin — so the stress peaks won't visually align with
    // the wheel positions, which would be misleading. Users get accurate
    // per-wheel locations from the LEAF Stress Contour panel above (LEAF
    // computes Boussinesq from each wheel's actual position).
  }

  // FEM mesh extent rectangle — shows the user exactly what region the FEM
  // actually covers. Critical for complex gears where wheels may fall outside.
  if (meshBounds && Number.isFinite(meshBounds.xMin)) {
    const { xMin, xMax, yMin, yMax } = meshBounds
    const zTop = slabDomain ? slabDomain.zMax : 0
    const zLift = (slabDomain && (slabDomain.zMax - slabDomain.zMin) * 0.04) || 1.0
    const z = zTop + zLift
    traces.push({
      type: 'scatter3d', mode: 'lines', name: 'FEM mesh boundary',
      x: [xMin, xMax, xMax, xMin, xMin],
      y: [yMin, yMin, yMax, yMax, yMin],
      z: [z, z, z, z, z],
      line: { color: '#2563eb', width: 4, dash: 'dash' },
      hoverinfo: 'skip',
    })
  }

  return traces
}

// Camera presets — eye positions relative to the domain center (Plotly uses
// relative units where "1" is approximately the domain radius).
const CAMERA_PRESETS = {
  iso:         { eye: { x: 1.6, y: -1.6, z: 0.9 }, up: { x: 0, y: 0, z: 1 } },
  top:         { eye: { x: 0,   y: 0,    z: 2.4 }, up: { x: 0, y: 1, z: 0 } },
  longitudinal:{ eye: { x: 2.4, y: 0,    z: 0.2 }, up: { x: 0, y: 0, z: 1 } },
  transverse:  { eye: { x: 0,   y: 2.4,  z: 0.2 }, up: { x: 0, y: 0, z: 1 } },
}

export default function Fem3dMeshPanel({ layers, subgrade, aircraft, enabled, cdfRunToken = 0, sectionKey = null }) {
  const [meshData, setMeshData] = useState(null)
  const [meshSource, setMeshSource] = useState(null)  // 'precal' | 'native' — for the badge
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [highDetail, setHighDetail] = useState(false)
  const [colorMode, setColorMode] = useState('layer')
  // Default to Mises — combines all 6 components into a single positive scalar
  // that's intuitive for engineers ("equivalent stress"). σz alone misses the
  // shear contribution that controls cracking under wheel footprints.
  // Default to σy — this is the slab-flexural stress civil engineers want to
  // read for rigid pavement. Mises is a diagnostic invariant that hides the
  // sign information needed for bending interpretation (top compression vs
  // bottom tension). See note_x/codex-claude-fix-3d-stress-through-depth.md.
  const [stressField, setStressField] = useState('sigmaY')
  // GP aggregation: default "auto" — top faces of bricks get top-GP stress,
  // bottom faces get bottom-GP stress, sides get mean. This is the only mode
  // that resolves top-vs-bottom slab-bending behavior correctly.
  const [stressAgg, setStressAgg] = useState('auto')
  // Face filter: "all" / "top" / "bottom" / "sides" / "topbottom".
  const [faceFilter, setFaceFilter] = useState('all')
  const plotRef = useRef(null)
  const lastHandledCdfToken = useRef(0)
  // Tracks whether the user has successfully built a mesh at least once. While
  // false, the panel stays idle until the user clicks Build. While true, input
  // changes auto-refresh so the displayed mesh always matches current inputs.
  const hasEverRendered = useRef(false)
  const autoRefreshTimer = useRef(null)
  // Stored on every run so the auto-refresh effect knows what to diff against
  // and won't fire a redundant solve when nothing has actually changed.
  const lastRunInputs = useRef(null)

  // When FEM is toggled off, wipe the canvas and reset the "has rendered" gate
  // so toggling back on starts clean.
  useEffect(() => {
    if (!enabled) {
      hasEverRendered.current = false
      lastRunInputs.current = null
      setMeshData(null); setError(null)
      if (plotRef.current && window.Plotly) {
        try { window.Plotly.purge(plotRef.current) } catch {}
      }
    }
  }, [enabled])

  const normalizedAc = useMemo(() => aircraft && ({
    ...aircraft,
    type: aircraft.type || aircraft.aircraft || aircraft.icao || '',
    icao: aircraft.icao || aircraft.type || aircraft.aircraft || '',
  }), [aircraft])

  // Stress field is real FEM — opt into the second FAASR3D pass on the backend
  // when the user is in stress mode. Layer mode skips the extra ~10s solve.
  const wantStressField = colorMode === 'stress'

  // Snapshot current inputs into a comparable string. Used so the auto-refresh
  // debounce fires only when something actually changed since the last solve.
  // Includes wantStressField — switching to stress mode triggers a re-fetch
  // because the backend needs to do the second FAASR3D pass.
  const inputSignature = useMemo(() => {
    if (!layers?.length || !normalizedAc) return null
    const layerSig = layers.map(l => `${l.type}:${l.h}:${l.E}:${l.nu}`).join('|')
    const subSig = `${subgrade?.E ?? ''}:${subgrade?.nu ?? ''}`
    const acSig = `${normalizedAc.icao || normalizedAc.type}:${normalizedAc.mtow}:${normalizedAc.gear}`
    return `${layerSig}||${subSig}||${acSig}||${highDetail ? 'H' : 'L'}||${wantStressField ? 'S' : 'G'}||${stressAgg}`
  }, [layers, subgrade?.E, subgrade?.nu, normalizedAc, highDetail, wantStressField, stressAgg])

  async function runMesh() {
    if (!enabled || !layers?.length || !normalizedAc) return
    setLoading(true); setError(null)
    const snapshot = inputSignature
    try {
      const result = await fetchFem3dMesh(layers, subgrade, normalizedAc, highDetail, true, wantStressField, stressAgg, sectionKey)
      if (result.data?.mesh) {
        setMeshData(result.data)
        setMeshSource(result.source || 'native')
        hasEverRendered.current = true
        lastRunInputs.current = snapshot
      } else {
        setError(result.detail || 'Backend did not return mesh data')
      }
    } catch (e) {
      setError(e.message || 'Mesh fetch failed')
    }
    setLoading(false)
  }

  // Auto-refresh: after the first successful build, silently refetch the mesh
  // 1000 ms after the user stops adjusting inputs (CBR slider, layer
  // thickness, aircraft pick). Cached hits are instant; cold hits show the
  // spinner. Skips if nothing changed since the last run (no redundant solves).
  useEffect(() => {
    if (!enabled) return
    if (!hasEverRendered.current) return
    if (!inputSignature) return
    if (inputSignature === lastRunInputs.current) return
    if (loading) return
    // Fire immediately on any settled input change. Why not setTimeout-debounce?
    //   1) The backend caches on input hash, so rapid slider drags produce a
    //      single cold solve plus instant cached hits — no redundant work.
    //   2) The `inputSignature === lastRunInputs.current` guard above already
    //      skips no-op re-renders.
    //   3) `loading` is in the dep array so when a solve finishes we re-enter
    //      the effect and pick up any input changes the user made mid-solve.
    //   4) setTimeout in headless Chromium (Playwright) is unreliable during
    //      React state churn, so an immediate fire is more testable and more
    //      predictable in real browsers too.
    runMesh()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputSignature, enabled, loading])

  // Auto-fetch the mesh after the Design Tool finishes a Run FEM CDF pass.
  // DesignTool increments `cdfRunToken` each time `/api/analysis/cdf` returns
  // with `femUsed: true` — we watch for new tokens and pull the mesh in the
  // background so the user doesn't have to click a second button. Backend
  // cache makes this nearly instant if the CDF pass already computed FEM
  // for the same aircraft/layers (identical input hash).
  useEffect(() => {
    if (!enabled || !cdfRunToken || cdfRunToken === lastHandledCdfToken.current) return
    if (!layers?.length || !normalizedAc) return
    lastHandledCdfToken.current = cdfRunToken
    runMesh()
    // runMesh is stable enough not to need a dep — we intentionally fire only on token change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cdfRunToken, enabled])

  // Auto-fetch on initial mount when the (sectionKey, aircraft) pair is in the
  // precal cache — pulling the cached mesh is ~10-50 ms so there's no reason to
  // make the user click "Build mesh" first. For custom airports / edited inputs
  // (sectionKey == null), defer to the explicit button so we don't accidentally
  // fire a 10-15 s live FEM3D solve.
  useEffect(() => {
    if (!enabled || !sectionKey) return
    if (hasEverRendered.current) return  // already running via the other auto-effects
    if (loading) return
    if (!layers?.length || !normalizedAc?.icao) return
    runMesh()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sectionKey, normalizedAc?.icao])

  // Per-triangle scalar derived directly from the backend's per-element
  // FEM tensor (no LEAF interpolation — this is real FAARFIELD FEM output).
  const { triStress, stressRange } = useMemo(() => {
    if (!meshData?.mesh) return { triStress: null, stressRange: null }
    const s = computeTriangleStressFromTensor(meshData.mesh, stressField, stressAgg)
    if (!s) return { triStress: null, stressRange: null }
    // When computing the color range, only consider triangles that pass the
    // current face filter — otherwise side-face extremes can squash the scale
    // of the top/bottom view the user is trying to read.
    const kinds = meshData.mesh.surfaceTriFaceKinds
    let smin = Infinity, smax = -Infinity
    for (let i = 0; i < s.length; i++) {
      if (faceFilter !== 'all' && kinds) {
        const k = kinds[i]
        if (faceFilter === 'top' && k !== 'top') continue
        if (faceFilter === 'bottom' && k !== 'bottom') continue
        if (faceFilter === 'sides' && k !== 'side') continue
        if (faceFilter === 'topbottom' && k !== 'top' && k !== 'bottom') continue
      }
      if (s[i] < smin) smin = s[i]
      if (s[i] > smax) smax = s[i]
    }
    if (!isFinite(smin) || !isFinite(smax)) return { triStress: s, stressRange: null }
    return { triStress: s, stressRange: [smin, smax] }
  }, [meshData, stressField, stressAgg, faceFilter])

  const applyCameraPreset = useCallback((preset) => {
    if (!plotRef.current || !window.Plotly) return
    try {
      window.Plotly.relayout(plotRef.current, { 'scene.camera': CAMERA_PRESETS[preset] })
    } catch (e) { console.warn('[Fem3dMeshPanel] relayout failed', e) }
  }, [])

  useEffect(() => {
    const mesh = meshData?.mesh
    if (!mesh || !plotRef.current || !window.Plotly) return
    if (!plotRef.current.isConnected || plotRef.current.offsetWidth === 0) return
    try {
      // Pull new Phase 2 diagnostics from the top-level Fem3dResult.
      const wheelDiag = meshData?.wheelDiagnostics || null
      const mBounds = Number.isFinite(meshData?.meshBoundsXmin) ? {
        xMin: meshData.meshBoundsXmin, xMax: meshData.meshBoundsXmax,
        yMin: meshData.meshBoundsYmin, yMax: meshData.meshBoundsYmax,
      } : null
      const traces = buildTraces(mesh, colorMode, triStress, stressRange, wheelDiag, mBounds, faceFilter)
      // Expand plot axis range to include ALL real wheel positions AND the mesh
      // bounds, so users see wheels outside the mesh instead of them being
      // clipped off the plot.
      const dom = mesh.slabDomain
      let xMinAx = dom?.xMin ?? 0, xMaxAx = dom?.xMax ?? 0
      let yMinAx = dom?.yMin ?? 0, yMaxAx = dom?.yMax ?? 0
      if (mBounds) {
        xMinAx = Math.min(xMinAx, mBounds.xMin); xMaxAx = Math.max(xMaxAx, mBounds.xMax)
        yMinAx = Math.min(yMinAx, mBounds.yMin); yMaxAx = Math.max(yMaxAx, mBounds.yMax)
      }
      if (wheelDiag) {
        wheelDiag.forEach(w => {
          xMinAx = Math.min(xMinAx, w.x - 20); xMaxAx = Math.max(xMaxAx, w.x + 20)
          yMinAx = Math.min(yMinAx, w.y - 20); yMaxAx = Math.max(yMaxAx, w.y + 20)
        })
      }
      window.Plotly.react(plotRef.current, traces, {
        scene: {
          aspectmode: 'data',
          xaxis: { title: 'X (in)', range: [xMinAx - 5, xMaxAx + 5], showbackground: true, backgroundcolor: 'rgb(247,247,250)', gridcolor: 'rgb(220,220,225)', zerolinecolor: 'rgb(160,160,170)' },
          yaxis: { title: 'Y (in)', range: [yMinAx - 5, yMaxAx + 5], showbackground: true, backgroundcolor: 'rgb(247,247,250)', gridcolor: 'rgb(220,220,225)', zerolinecolor: 'rgb(160,160,170)' },
          zaxis: { title: 'Z (in) — up', showbackground: true, backgroundcolor: 'rgb(250,250,252)', gridcolor: 'rgb(220,220,225)' },
          camera: CAMERA_PRESETS.iso,
        },
        margin: { t: 0, r: 0, b: 0, l: 0 },
        height: 520,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(255,255,255,0.85)', font: { size: 11 }, bordercolor: 'rgba(0,0,0,0.1)', borderwidth: 1 },
      }, { responsive: true, displayModeBar: true, displaylogo: false,
           modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'autoScale2d'] })
    } catch (e) {
      console.error('[Fem3dMeshPanel] Plotly render error', e)
      setError('3D render error: ' + (e.message || ''))
    }
  }, [meshData, colorMode, triStress, stressRange, faceFilter])

  if (!enabled) return null

  const mesh = meshData?.mesh
  const tris = mesh?.surfaceTriCount ?? 0
  const totalBricks = mesh?.totalElementCount ?? 0
  const compute = meshData?.computeTimeMs ?? 0
  const geoBadge = mesh?.renderMode === 'full'
    ? `full mesh — ${tris.toLocaleString()} faces`
    : `${tris.toLocaleString()} visible faces · ${totalBricks.toLocaleString()} bricks`
  const colorBadge = colorMode === 'stress'
    ? `FEM stress (${stressField})`
    : 'layer colors'

  // Geometry provenance chip — reads the AircraftLibrary.ResolveGeometry
  // result surfaced by the backend (geometrySource / resolvedIcao / faarfieldName).
  // Tells the user whether they're seeing exact FAARFIELD XML geometry, a
  // proxy donor's geometry, or a generic template.
  const geometryChip = (() => {
    const src = meshData?.geometrySource
    if (!src) return null
    const target = (aircraft?.icao || '').toUpperCase()
    const donor = (meshData?.resolvedIcao || '').toUpperCase()
    const ffName = meshData?.faarfieldName || ''
    const sameIcao = target && donor && target === donor
    if (src === 'xml') {
      return {
        label: sameIcao ? 'Exact XML' : `XML: ${target || '?'} → ${donor}`,
        cls: 'bg-emerald-50 text-emerald-700',
        icon: 'verified',
        title: `FAARFIELD library geometry${ffName ? ` (${ffName})` : ''}`,
      }
    }
    if (src === 'proxy_override') {
      return {
        label: `Curated proxy: ${target || '?'} → ${donor}`,
        cls: 'bg-sky-50 text-sky-700',
        icon: 'tune',
        title: `${target || 'Aircraft'} has no FAARFIELD XML — using curated donor ${donor}${ffName ? ` (${ffName})` : ''}. Chosen manually for correct gear type and close MTOW.`,
      }
    }
    if (src === 'icao_proxy' || src === 'family_proxy' || src === 'nearest_proxy') {
      const kind = src === 'icao_proxy' ? 'ICAO' : src === 'family_proxy' ? 'Family' : 'Nearest'
      return {
        label: `${kind} proxy: ${target || '?'} → ${donor}`,
        cls: 'bg-amber-50 text-amber-700',
        icon: 'alt_route',
        title: `No exact XML for ${target || 'aircraft'} — borrowed wheel layout from ${donor}${ffName ? ` (${ffName})` : ''}`,
      }
    }
    if (src === 'gear_template') {
      return {
        label: 'Gear template',
        cls: 'bg-orange-50 text-orange-700',
        icon: 'category',
        title: 'No library match or donor — using generic wheel layout for gear type',
      }
    }
    if (src === 'dual_fallback') {
      return {
        label: 'Generic dual',
        cls: 'bg-red-50 text-red-700',
        icon: 'warning',
        title: 'Geometry unknown — using generic dual-wheel (17" offset). FEM3D blocked; this path should not normally render.',
      }
    }
    return null
  })()

  // FAARFIELD legitimately skips FEM for single-wheel / light gear aircraft on
  // rigid pavement (AC 150/5320-6). When that happens, the API returns success
  // but with zero stresses and a sub-second compute — we surface "Not available"
  // in the KPI row rather than a misleading 0.0 psi.
  const femSkipped = mesh && (meshData.pccBottomStress ?? 0) === 0 && compute < 1000
  const acLabel = aircraft?.type || aircraft?.aircraft || aircraft?.icao || '—'
  const acGear = aircraft?.gear || '—'
  const acMtow = aircraft?.mtow || 0

  // Render state for the header chip.
  let renderState = 'idle'
  if (loading) renderState = 'loading'
  else if (error) renderState = 'error'
  else if (mesh) renderState = femSkipped ? 'skipped' : 'ready'
  const stateChip = {
    idle:    { icon: 'pending',        label: 'Idle',       cls: 'bg-surface-low text-outline' },
    loading: { icon: 'progress_activity', label: 'Solving…', cls: 'bg-primary/15 text-primary animate-pulse' },
    ready:   { icon: 'check_circle',   label: 'Ready',      cls: 'bg-adequate/15 text-adequate' },
    skipped: { icon: 'info',           label: 'FEM skipped', cls: 'bg-amber-100 text-amber-900' },
    error:   { icon: 'error',          label: 'Error',      cls: 'bg-failing/15 text-failing' },
  }[renderState]

  function kpiValue(raw, unit, digits = 1) {
    if (raw == null || !isFinite(raw)) return <span className="italic text-outline text-sm">Not available</span>
    if (femSkipped && unit === 'psi') return <span className="italic text-outline text-sm">Not available</span>
    return <span className="text-sm font-mono font-bold text-on-surface">{raw.toFixed(digits)} {unit}</span>
  }

  return (
    <div className="rounded-2xl bg-surface-lowest p-6 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="material-symbols-outlined text-primary">view_in_ar</span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-on-surface">3D FEM Pavement Model</h3>
            <p className="text-[10px] text-outline">
              Mesh + per-element stress tensor from FAARFIELD-managed FAASR3D solve
            </p>
          </div>
          {mesh && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary ml-2">
              {geoBadge} · {colorBadge}
            </span>
          )}
          <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${stateChip.cls}`}>
            <span className={`material-symbols-outlined text-sm ${renderState === 'loading' ? 'animate-spin' : ''}`}>{stateChip.icon}</span>
            {stateChip.label}
          </span>
          {geometryChip && (
            <span
              className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${geometryChip.cls}`}
              title={geometryChip.title}
            >
              <span className="material-symbols-outlined text-sm">{geometryChip.icon}</span>
              {geometryChip.label}
            </span>
          )}
          {mesh && hasEverRendered.current && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-blue-50 text-blue-700" title="Mesh auto-refreshes 1s after you change soil, aircraft, or layers. Cached results are instant.">
              <span className="material-symbols-outlined text-sm">autorenew</span>
              Auto-refresh on
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {mesh && (
            <div className="flex items-center gap-1 bg-surface-low rounded-lg p-0.5">
              <button onClick={() => setColorMode('layer')}
                title="Color each face by its pavement layer (geometry view, no extra compute)"
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                  colorMode === 'layer' ? 'bg-primary text-white' : 'text-outline hover:text-on-surface'
                }`}>Layer</button>
              <button onClick={() => setColorMode('stress')}
                title="Real per-element FEM stress from FAARFIELD's FAASR3D solver. Adds ~10s for the second solve pass."
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                  colorMode === 'stress' ? 'bg-primary text-white' : 'text-outline hover:text-on-surface'
                }`}>FEM stress</button>
            </div>
          )}
          {mesh && colorMode === 'stress' && (
            <>
              <select value={stressField} onChange={e => setStressField(e.target.value)}
                title="Per-element FEM stress component. Default σy = slab flexural stress (compressive at top, tensile at bottom under a wheel — the design-relevant direction for rigid pavement bending)."
                className="text-[10px] bg-surface-low border border-outline-variant/30 rounded-lg px-2 py-1 text-on-surface">
                <option value="sigmaY">σy — transverse (slab flexural default)</option>
                <option value="sigmaX">σx — longitudinal</option>
                <option value="sigmaZ">σz — vertical (subgrade rutting)</option>
                <option value="sigma1">σ1 — max principal</option>
                <option value="tauMax">τmax — max shear</option>
                <option value="mises">Mises — diagnostic invariant</option>
              </select>
              <select value={stressAgg} onChange={e => setStressAgg(e.target.value)}
                title="Gauss-point aggregation within each brick. 2×2×2 GPs: 1-4 bottom half, 5-8 top half. AUTO is face-aware — top tris use top-GP stress, bottom tris use bottom-GP. MEAN averages all 8 (cancels bending → hides depth variation). BOTTOM shows tensile-fiber stress (PCC fatigue driver). TOP shows compressive-fiber stress. PEAK shows the worst GP anywhere in the brick."
                className="text-[10px] bg-surface-low border border-outline-variant/30 rounded-lg px-2 py-1 text-on-surface">
                <option value="auto">Auto — top/bottom face-aware (engineering default)</option>
                <option value="mean">Mean (GP 1-8) — cancels bending</option>
                <option value="bottom">Bottom (GP 1-4) — tensile fiber</option>
                <option value="top">Top (GP 5-8) — compression face</option>
                <option value="peak">Peak (max |GP|) — worst point</option>
              </select>
              <select value={faceFilter} onChange={e => setFaceFilter(e.target.value)}
                title="Filter visible triangles by face kind. Each brick face is classified by its outward normal: top (+Z), bottom (−Z), or side (horizontal). Useful for inspecting layer-top/bottom stresses without side-face color bleed."
                className="text-[10px] bg-surface-low border border-outline-variant/30 rounded-lg px-2 py-1 text-on-surface">
                <option value="all">All faces</option>
                <option value="top">Top faces only</option>
                <option value="bottom">Bottom faces only</option>
                <option value="topbottom">Top + bottom only</option>
                <option value="sides">Side faces only</option>
              </select>
            </>
          )}
          <button onClick={runMesh} disabled={loading || !layers?.length || !aircraft}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              loading ? 'bg-outline/20 text-outline' : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
            }`}>
            {loading
              ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Building…</>
              : <><span className="material-symbols-outlined text-sm">play_arrow</span> {mesh ? 'Refresh' : 'Build 3D model'}</>
            }
          </button>
        </div>
      </div>

      {/* Camera preset bar — only when mesh is loaded */}
      {mesh && !loading && (
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-outline mr-2">View</span>
          {[
            { id: 'iso', label: 'Iso' },
            { id: 'top', label: 'Top' },
            { id: 'longitudinal', label: 'Long.' },
            { id: 'transverse', label: 'Transv.' },
          ].map(v => (
            <button key={v.id} onClick={() => applyCameraPreset(v.id)}
              className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-low hover:bg-primary/10 text-outline hover:text-primary transition-colors">
              {v.label}
            </button>
          ))}
          <div className="ml-auto">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-outline cursor-pointer">
              <input type="checkbox" checked={highDetail} onChange={e => setHighDetail(e.target.checked)}
                className="accent-primary" />
              <span>Diagnostic: all brick faces</span>
            </label>
          </div>
        </div>
      )}

      {!mesh && !loading && !error && (
        <div className="text-center py-12 text-outline text-xs">
          <p className="mb-1">Click <strong>Run FEM CDF</strong> above and this panel auto-populates,
            or click <strong>Build 3D model</strong> here to solve the mesh standalone.</p>
          <p>Mesh geometry matches desktop FAARFIELD. Typical aircraft: ~15 s cold, instant on cache hits.</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-96">
          <span className="material-symbols-outlined text-primary animate-spin text-3xl">progress_activity</span>
          <span className="ml-2 text-sm text-outline">Running FAARFIELD FEM + extracting surface…</span>
        </div>
      )}

      {error && !loading && (
        <div className="bg-failing/10 text-failing text-xs rounded-lg p-3">
          <p className="font-bold mb-1">Mesh request failed</p>
          <p className="font-mono">{error}</p>
        </div>
      )}

      {/* Mesh-coverage warning — explains why some wheels appear outside the rendered mesh. */}
      {mesh && !loading && meshData?.wheelsOutsideMeshCount > 0 && (
        <div className="mb-3 rounded-lg border border-warning/40 bg-warning/5 p-3 text-[11px] text-on-surface">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-warning text-base">info</span>
            <div className="flex-1">
              <p className="font-bold text-warning uppercase tracking-widest text-[10px] mb-1">
                FEM mesh coverage
              </p>
              <p>
                FAARFIELD's single-slab FEM applies the gear as an <span className="font-semibold">equivalent loading</span> near the mesh origin — it doesn't simulate each tire at its physical aircraft-frame position. That's why this view doesn't show individual wheel pins. For the per-wheel footprint and stress lobes, see the <span className="font-semibold">Stress Contour (Native LEAF)</span> panel above — LEAF computes Boussinesq response from each wheel's actual position.
                {' '}Mesh region: X∈[{meshData.meshBoundsXmin?.toFixed(0)}, {meshData.meshBoundsXmax?.toFixed(0)}]",
                {' '}Y∈[{meshData.meshBoundsYmin?.toFixed(0)}, {meshData.meshBoundsYmax?.toFixed(0)}]".
              </p>
            </div>
          </div>
        </div>
      )}

      <div ref={plotRef} style={{ display: (loading || error || !mesh) ? 'none' : 'block' }} />

      {mesh && !loading && (
        <>
          <div className="mt-3 pt-3 border-t border-outline-variant/20 grid grid-cols-5 gap-3 text-[10px]">
            <div>
              <p className="font-bold uppercase tracking-widest text-outline">Aircraft</p>
              <p className="text-sm font-mono font-bold text-on-surface">{acLabel}</p>
              <p className="text-[10px] text-outline">
                {acGear} gear{acMtow > 0 ? ` · ${acMtow.toLocaleString()} lbs` : ''}
              </p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-widest text-outline">PCC bottom σ</p>
              {kpiValue(meshData.pccBottomStress, 'psi')}
              <p className="text-[10px] text-outline">max horizontal</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-widest text-outline">Overlay σ</p>
              {kpiValue(meshData.overlayStress, 'psi')}
              <p className="text-[10px] text-outline">AC bottom, horizontal</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-widest text-outline">Mesh</p>
              <p className="text-sm font-mono font-bold text-on-surface">
                {mesh.nodeCount.toLocaleString()} nodes · {tris.toLocaleString()} faces
              </p>
              <p className="text-[10px] text-outline">{totalBricks.toLocaleString()} solid bricks</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-widest text-outline">Solve time</p>
              <p className="text-sm font-mono font-bold text-on-surface">
                {femSkipped ? <span className="italic text-outline text-sm">Skipped</span> : `${(compute / 1000).toFixed(1)} s`}
              </p>
              <p className="text-[10px] text-outline">
                {meshSource === 'precal' ? (
                  <span className="text-green-700 font-semibold">⚡ from precal cache</span>
                ) : (
                  <>AMClassLib → FAASR3D <span className="text-outline italic">(live)</span></>
                )}
              </p>
            </div>
          </div>
          {femSkipped && (
            <div className="mt-2 text-[10px] bg-amber-50 text-amber-900 rounded px-3 py-2">
              <span className="font-bold">FEM not applicable for this aircraft:</span>{' '}
              FAARFIELD's managed 3D FEM at offset=0 short-circuited for this gear — the mesh geometry above is
              still valid, but stress wasn't computed. Try a heavier aircraft with a simple dual gear
              (B738, A320) in the "Stress Visualization Aircraft" dropdown.
            </div>
          )}
          {!femSkipped && meshData.warnings?.length > 0 && (
            <div className="mt-2 text-[10px] bg-blue-50 text-blue-900 rounded px-3 py-2 space-y-1">
              {meshData.warnings.filter(w => !/fell outside the FEM mesh/i.test(w)).map((w, i) => (
                <p key={i}>
                  <span className="font-bold">Note:</span> {w}
                </p>
              ))}
            </div>
          )}
          {colorMode === 'stress' && stressRange && meshData?.mesh?.stressFieldMeta && (
            <div className="mt-2 text-[10px] bg-amber-50 text-amber-900 rounded px-3 py-2 space-y-1 border border-amber-200">
              <p>
                <span className="font-bold">How to read this stress plot:</span>{' '}
                Colors are per-brick FEM stresses from{' '}
                <span className="font-mono">clsPrintOut.st(elem, comp, gp, time)</span>{' '}
                after a managed-path FAASR3D solve — real FAARFIELD output, not LEAF interpolation.
                Each brick has 2×2×2 = 8 Gauss integration points; the GP aggregation dropdown
                controls whether you see top-face, bottom-face, mean, peak, or auto face-aware values.
                With mean aggregation, flexural bending (compression top + tension bottom) averages
                to ~0 within each brick → layers look uniform. Use <span className="font-mono">auto</span>{' '}
                (default — top faces show top-GP, bottom faces show bottom-GP) or <span className="font-mono">bottom</span>{' '}
                to see the tensile fiber stress that drives PCC fatigue.
              </p>
              <p className="text-[9px] opacity-80">
                Component: <span className="font-mono">{stressField}</span> ·
                Range: {stressRange[0].toFixed(1)} – {stressRange[1].toFixed(1)} psi ·
                {' '}{meshData.mesh.stressFieldMeta.nElements.toLocaleString()} elements ·
                Solve time: {(meshData.mesh.stressFieldMeta.secondPassMs / 1000).toFixed(1)}s.
                Sign convention: positive = tension; +Z = downward into pavement.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
