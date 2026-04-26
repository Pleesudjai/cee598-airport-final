// Compact stacked-layer SVG diagram of a pavement cross-section.
// Renders the pavement layers + a 28-px subgrade band, plus an OPTIONAL
// blue frost-zone band on the right side of the diagram (depth based on the
// airport's air-freezing-index from NOAA Climate Normals 1991-2020,
// converted via Berggren equation to frost penetration depth).
//
// The blue band is a thermometer-style visualization:
//   - Light blue at top  (surface, just-frozen)
//   - Deep blue mid-band (full frost penetration)
//   - Violet at bottom IF the frost extends past the pavement total thickness
//     (i.e., frost penetrates the subgrade — frost-heave risk).
//
// Snowflake icon at top + icicle drips on the right edge for visual clarity.

export default function CrossSectionSmall({ layers, subgrade, frostDepthIn = null }) {
  const maxH = layers.reduce((s, l) => s + l.h, 0)
  const scale = 140 / Math.max(maxH, 8)
  const totalPavementIn = maxH
  const colors = {
    'P-401 AC': '#1a1a2e',
    'P-501 PCC': '#a0aec0',
    'P-154 Subbase': '#d4a574',
    'Stabilized Base': '#b8c9e0',
    'Stabilized Subbase': '#b8c9e0',
    'P-209 Agg Base': '#c4a882',
  }
  let y = 4
  const layerTopY = 4
  const layerBottomY = 4 + maxH * scale
  const subgradeBottomY = layerBottomY + 28

  // Frost band geometry
  const haveFrost = typeof frostDepthIn === 'number' && isFinite(frostDepthIn) && frostDepthIn > 0
  const frostPenetratesSub = haveFrost && frostDepthIn > totalPavementIn
  const frostBandWidth = 56  // px in viewBox
  const frostBandX = 350     // left edge of frost band
  // y-coordinate at the requested frost depth (capped at subgrade band bottom)
  const frostBottomY = haveFrost
    ? Math.min(layerTopY + frostDepthIn * scale, subgradeBottomY - 2)
    : null
  // y-coordinate at the pavement-bottom (where penetration into subgrade begins)
  const pavementBottomY = layerBottomY
  const gradId = `frost-grad-${Math.random().toString(36).slice(2, 9)}`

  return (
    <svg viewBox="0 0 430 200" className="w-full max-w-[430px]">
      {haveFrost && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#dbeafe" stopOpacity="0.85" />
            <stop offset="40%"  stopColor="#60a5fa" stopOpacity="0.85" />
            <stop offset="80%"  stopColor="#1d4ed8" stopOpacity="0.90" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.95" />
          </linearGradient>
        </defs>
      )}

      {/* Pavement layers */}
      {layers.map((l, i) => {
        const h = l.h * scale
        const typeLabel = (l.type || '').replace(/^P-\d+\s+/, '')
        const rect = (
          <g key={i}>
            <rect
              x="20" y={y} width="320" height={h}
              fill={colors[l.type] || '#ccc'} rx="3"
              stroke="#737784" strokeWidth="0.5"
            />
            <text x="180" y={y + h / 2 + 4} textAnchor="middle" fontSize="11"
                  fill={i === 0 ? '#fff' : '#1a1c1e'} fontWeight="700">
              {typeLabel}
            </text>
            <text x="332" y={y + h / 2 + 4} textAnchor="end" fontSize="10"
                  fill={i === 0 ? '#ccc' : '#737784'} fontWeight="600">
              {l.h}"
            </text>
          </g>
        )
        y += h
        return rect
      })}
      <rect x="20" y={y} width="320" height={28} fill="#d4b896" rx="3" opacity="0.45" />
      <text x="180" y={y + 17} textAnchor="middle" fontSize="11" fill="#651f00" fontWeight="600">
        Subgrade · CBR = {subgrade?.cbr}
      </text>

      {/* Frost zone — blue thermometer-style band on the right */}
      {haveFrost && (
        <g>
          {/* Empty rail (full pavement+subgrade height) — outline of the thermometer */}
          <rect
            x={frostBandX} y={layerTopY}
            width={frostBandWidth} height={subgradeBottomY - layerTopY}
            fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" rx="4"
          />

          {/* Filled frost zone (gradient blue → deep blue) */}
          <rect
            x={frostBandX + 1} y={layerTopY + 1}
            width={frostBandWidth - 2}
            height={frostBottomY - layerTopY - 1}
            fill={`url(#${gradId})`}
            rx="3"
          />

          {/* If frost crosses the pavement bottom, draw a horizontal warning line */}
          {frostPenetratesSub && pavementBottomY < frostBottomY && (
            <>
              <line
                x1={frostBandX} x2={frostBandX + frostBandWidth}
                y1={pavementBottomY} y2={pavementBottomY}
                stroke="#dc2626" strokeWidth="1.5" strokeDasharray="3 2"
              />
              <text
                x={frostBandX + frostBandWidth / 2}
                y={pavementBottomY - 3}
                textAnchor="middle" fontSize="7" fill="#7f1d1d" fontWeight="700"
              >
                pavement
              </text>
            </>
          )}

          {/* Snowflake icon at top of band */}
          <text
            x={frostBandX + frostBandWidth / 2}
            y={layerTopY + 14}
            textAnchor="middle" fontSize="14" fill="#1e3a8a"
          >
            ❄
          </text>

          {/* "FROST" label inside band, mid-vertical */}
          <text
            x={frostBandX + frostBandWidth / 2}
            y={layerTopY + (frostBottomY - layerTopY) / 2 - 2}
            textAnchor="middle" fontSize="10" fill="#fff" fontWeight="700"
            style={{ letterSpacing: '1px' }}
          >
            FROST
          </text>
          {/* Depth value inside band */}
          <text
            x={frostBandX + frostBandWidth / 2}
            y={layerTopY + (frostBottomY - layerTopY) / 2 + 11}
            textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700"
          >
            {frostDepthIn.toFixed(1)}″
          </text>

          {/* Status caption below band — pill-style for visibility.
              Pill is wider than the frost band so the text fits without clipping;
              centered on the band's vertical centerline. */}
          {(() => {
            const pillCenterX = frostBandX + frostBandWidth / 2
            const pillW = 96
            const pillH = 18
            const pillX = pillCenterX - pillW / 2
            const pillY = subgradeBottomY + 4
            return (
              <>
                <rect
                  x={pillX} y={pillY}
                  width={pillW} height={pillH}
                  rx={9}
                  fill={frostPenetratesSub ? '#fee2e2' : '#dcfce7'}
                  stroke={frostPenetratesSub ? '#dc2626' : '#16a34a'}
                  strokeWidth="0.8"
                />
                <text
                  x={pillCenterX}
                  y={pillY + 12}
                  textAnchor="middle" fontSize="9"
                  fill={frostPenetratesSub ? '#7f1d1d' : '#14532d'}
                  fontWeight="700"
                >
                  {frostPenetratesSub ? '⚠ subgrade risk' : '✓ in pavement'}
                </text>
              </>
            )
          })()}
        </g>
      )}
    </svg>
  )
}
