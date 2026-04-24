import { lazy, Suspense } from 'react'

const LayerBuilder = lazy(() => import('./LayerBuilder'))
const SoilHorizonPicker = lazy(() => import('./SoilHorizonPicker'))

const LAYER_COLORS = {
  'P-401 AC': '#1a1a2e',
  'P-501 PCC': '#a0aec0',
  'P-154 Subbase': '#d4a574',
  'Stabilized Base': '#b8c9e0',
  'Stabilized Subbase': '#b8c9e0',
  'P-209 Agg Base': '#c4a882',
  'P-209 Crushed Agg': '#c4a882',
  'P-154 Aggregate': '#d4a574',
  'P-301 Soil Cement': '#b8c9e0',
  'P-304 Cement Treated': '#b8c9e0',
  'P-306 Lean Concrete': '#9bb0d9',
}

function CrossSection({ layers, cbr, pccYear, overlayYear }) {
  if (!layers || layers.length === 0) return null
  const totalPavDepth = layers.reduce((s, l) => s + l.h, 0)
  const subgradeVisH = Math.max(8, totalPavDepth * 0.45)
  const fullH = totalPavDepth + subgradeVisH

  // Viewbox 520×auto. Layout across x (tighter depth gutter, wider layer blocks):
  //   0-48    — depth axis gutter (tick labels "0", "5", "10", ...)
  //   48      — axis line
  //   60-400  — layer rectangles (width 340 — was 220, ~55% wider)
  //   408-520 — right annotations (year callouts, pavement-depth label)
  const pxPerIn = Math.min(26, 700 / fullH)
  const vbH = fullH * pxPerIn + 44      // + 44 for top/bottom padding
  const vbW = 520
  const rectX = 60
  const rectW = 340
  const axisX = 48
  let y = 22

  // Match a layer to its construction year when we have it. AC overlay gets the
  // overlay_year, PCC + everything built below it gets the original pcc_year.
  // Use substring match on the type string for forgiveness across naming variants.
  function yearFor(type) {
    const t = (type || '').toLowerCase()
    if (t.includes('ac') && overlayYear) return { year: overlayYear, label: 'overlaid' }
    if (t.includes('pcc') && pccYear) return { year: pccYear, label: 'built' }
    // Base / subbase / stabilized layers — share PCC construction era
    if ((t.includes('base') || t.includes('subbase')) && pccYear) return { year: pccYear, label: 'built' }
    return null
  }

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full" style={{ maxHeight: 720 }}>
      {/* Depth axis left */}
      <line x1={axisX} y1="22" x2={axisX} y2={vbH - 22} stroke="#737784" strokeWidth="0.7" />
      {/* Scale ticks every 5 inches */}
      {Array.from({ length: Math.ceil(fullH / 5) + 1 }, (_, k) => {
        const dIn = k * 5
        const ty = 22 + dIn * pxPerIn
        if (ty > vbH - 22) return null
        return (
          <g key={k}>
            <line x1={axisX - 5} y1={ty} x2={axisX} y2={ty} stroke="#737784" strokeWidth="0.7" />
            <text x={axisX - 7} y={ty + 4} textAnchor="end" fontSize="12" fill="#737784" fontFamily="monospace" fontWeight="600">
              {dIn}"
            </text>
          </g>
        )
      })}

      {/* Pavement layers */}
      {layers.map((l, i) => {
        const h = l.h * pxPerIn
        const fill = LAYER_COLORS[l.type] || '#ccc'
        const textColor = i === 0 ? '#fff' : '#1a1c1e'
        const label = (l.type || '').replace(/^P-\d+\s+/, '').slice(0, 22)
        const yr = yearFor(l.type)
        const rect = (
          <g key={i}>
            <rect x={rectX} y={y} width={rectW} height={h}
              fill={fill} stroke="#737784" strokeWidth="0.7" rx="3" />
            <text x={rectX + rectW / 2} y={y + h / 2 + 5}
              textAnchor="middle" fontSize="15" fill={textColor} fontWeight="700">
              {label}
            </text>
            <text x={rectX + rectW - 8} y={y + h / 2 + 5}
              textAnchor="end" fontSize="13"
              fill={i === 0 ? '#ccc' : '#737784'} fontWeight="600">
              {l.h}"
            </text>
            {yr && h >= 16 && (
              <>
                {/* Tick from layer edge toward year callout */}
                <line x1={rectX + rectW + 2} y1={y + h / 2}
                  x2={rectX + rectW + 10} y2={y + h / 2}
                  stroke="#737784" strokeWidth="0.7" />
                <text x={rectX + rectW + 14} y={y + h / 2 - 2}
                  textAnchor="start" fontSize="13" fill="#4a5568" fontWeight="700" fontFamily="monospace">
                  {yr.year}
                </text>
                <text x={rectX + rectW + 14} y={y + h / 2 + 12}
                  textAnchor="start" fontSize="10" fill="#737784" fontWeight="500">
                  {yr.label} · {new Date().getFullYear() - yr.year} yr
                </text>
              </>
            )}
          </g>
        )
        y += h
        return rect
      })}

      {/* Subgrade */}
      <defs>
        <pattern id="subgradeHatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#d4b896" opacity="0.4" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="#a8886a" strokeWidth="0.7" />
        </pattern>
      </defs>
      <rect x={rectX} y={y} width={rectW} height={subgradeVisH * pxPerIn}
        fill="url(#subgradeHatch)" stroke="#a8886a" strokeWidth="0.7" strokeDasharray="3 3" rx="3" />
      <text x={rectX + rectW / 2} y={y + subgradeVisH * pxPerIn / 2 - 2}
        textAnchor="middle" fontSize="15" fill="#651f00" fontWeight="700">
        Subgrade
      </text>
      <text x={rectX + rectW / 2} y={y + subgradeVisH * pxPerIn / 2 + 16}
        textAnchor="middle" fontSize="13" fill="#651f00" fontWeight="600">
        {cbr != null ? `CBR = ${cbr}` : 'CBR — (no data)'}
      </text>

      {/* Pavement-bottom indicator */}
      <line x1={axisX - 4} y1={y} x2={rectX + rectW + 10} y2={y}
        stroke="#dc2626" strokeWidth="1.2" strokeDasharray="5 3" />
      <text x={rectX + rectW + 14} y={y + 4} fontSize="12" fill="#dc2626" fontWeight="700">
        Pavement depth
      </text>
      <text x={rectX + rectW + 14} y={y + 18} fontSize="12" fill="#dc2626" fontFamily="monospace" fontWeight="700">
        {totalPavDepth.toFixed(1)}"
      </text>
    </svg>
  )
}

export default function PavementPanel({
  initialLayers, customLayers, onLayersChange, isProjectAirport,
  horizons, onSelectCBR, cbr, pavementDepthIn, resetKey,
  pccYear, overlayYear,
}) {
  const activeLayers = customLayers || initialLayers || []
  return (
    <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-primary">layers</span>
        <p className="text-sm font-bold uppercase tracking-widest text-outline">Pavement + Subgrade</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left — Cross-section visualization (col-span-5 — ~1.6× wider than prior 3) */}
        <div className="col-span-5 flex flex-col items-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3 self-start">Cross Section</p>
          <div className="w-full bg-surface-low rounded-lg p-4 flex items-start justify-center">
            <CrossSection layers={activeLayers} cbr={cbr} pccYear={pccYear} overlayYear={overlayYear} />
          </div>
          <p className="text-[10px] text-outline mt-2 text-center">
            Pavement depth = {activeLayers.reduce((s, l) => s + l.h, 0).toFixed(1)}" · Subgrade hatched
            {(pccYear || overlayYear) && (
              <span className="block mt-0.5">
                {pccYear && <>PCC {pccYear}</>}
                {pccYear && overlayYear && <> · </>}
                {overlayYear && <>overlay {overlayYear}</>}
              </span>
            )}
          </p>
        </div>

        {/* Right — Editors stacked */}
        <div className="col-span-7 space-y-6 min-w-0">
          <Suspense fallback={<div className="text-outline text-xs">Loading…</div>}>
            <LayerBuilder
              initialLayers={initialLayers}
              onLayersChange={onLayersChange}
              isProjectAirport={isProjectAirport}
              flat
            />
          </Suspense>

          {horizons && horizons.length > 0 && (
            <Suspense fallback={<div className="text-outline text-xs">Loading…</div>}>
              <SoilHorizonPicker
                key={resetKey}
                horizons={horizons}
                pavementDepthIn={pavementDepthIn}
                onSelectCBR={onSelectCBR}
                flat
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  )
}
