import React, { useMemo } from 'react'

/**
 * Top-down pavement view of the 10 highest-CDF-contributing aircraft.
 *
 * Each row = one aircraft. Wheel rectangles drawn at the resolved
 * (wheelX, wheelY) coords from the tier-matched FAARFIELD library record,
 * shifted to the controlling lateral offset omega*. Wander envelope ±2σ
 * shaded behind. C/P shown in row label is the same value that multiplies
 * design departures in the CDF sum at this offset.
 */

const SIGMA = 30.435            // FAARFIELD rigid-pavement wander std dev (in)
const HALF_BAND = 2 * SIGMA     // ±2σ wander envelope = ±60.87 in
const ROW_HEIGHT = 64           // px per aircraft row
const LEFT_LABEL_W = 360        // px reserved for the row label
const RIGHT_PAD = 24
const TOP_HEADER = 84           // bumped to fit ω* label + readable ±2σ wander-envelope legend band
const BOTTOM_AXIS = 32

// CDF rank → color (rank 1 = darkest red, rank 10 = pale green)
function rankColor(rank, total) {
  const t = (rank - 1) / Math.max(total - 1, 1)   // 0 (worst) → 1 (best)
  const hue = Math.round(t * 120)                  // 0=red, 120=green
  const sat = 70
  const lig = 38 + Math.round(t * 12)              // darker for higher CDF
  return `hsl(${hue} ${sat}% ${lig}%)`
}

export default function GearFootprintTopView({ nativeCdf }) {
  const top = useMemo(() => {
    const all = nativeCdf?.perAircraft || []
    return [...all].sort((a, b) => (b.cdf || 0) - (a.cdf || 0)).slice(0, 10)
  }, [nativeCdf?.perAircraft])

  // Compute X-domain to fit all centroid-normalized wheels + wander envelope
  // + the ω* peak-damage indicator.  Each aircraft's gear is plotted with
  // centroid at X = 0 (true mean lateral position under FAARFIELD's wander
  // statistic, which is centered on the runway centerline).  ω* is drawn as
  // a separate vertical marker — it is the evaluation point that accumulates
  // the highest CDF, NOT the gear position.
  const omegaStar = nativeCdf?.controlOffsetIn ?? 0
  const xExtent = useMemo(() => {
    let xMin = -100, xMax = 100   // sensible default if no aircraft yet
    for (const ac of top) {
      const xs = ac.wheelX || []
      if (!xs.length) continue
      const cx = xs.reduce((s, v) => s + v, 0) / xs.length
      const tw = ac.tireWidth || 12
      for (const x of xs) {
        const xn = x - cx                       // re-centered coord
        const lo = xn - tw / 2
        const hi = xn + tw / 2
        if (lo < xMin) xMin = lo
        if (hi > xMax) xMax = hi
      }
    }
    // Make sure both the wander envelope (±2σ around centerline) and the
    // ω* marker fit comfortably in the view.
    xMin = Math.min(xMin, -HALF_BAND - 10, omegaStar - 10)
    xMax = Math.max(xMax, +HALF_BAND + 10, omegaStar + 10)
    // Symmetric around 0 so centerline stays visually centered
    const half = Math.max(Math.abs(xMin), Math.abs(xMax)) + 20
    return { xMin: -half, xMax: half }
  }, [top, omegaStar])

  if (!top.length) return null

  const plotW = 1180 - LEFT_LABEL_W - RIGHT_PAD     // px width for the pavement strip
  const totalH = TOP_HEADER + top.length * ROW_HEIGHT + BOTTOM_AXIS
  const xRange = xExtent.xMax - xExtent.xMin
  const xToPx = (x) => LEFT_LABEL_W + ((x - xExtent.xMin) / xRange) * plotW

  // X-axis ticks every 50 in
  const tickStart = Math.ceil(xExtent.xMin / 50) * 50
  const ticks = []
  for (let v = tickStart; v <= xExtent.xMax; v += 50) ticks.push(v)

  const controllingMode = nativeCdf?.controlling || 'PCC Fatigue'

  return (
    <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-outline">
          Top 10 CDF Contributors — Gear Footprint Top View
        </p>
        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-adequate/10 text-adequate">
          tier-matched library
        </span>
      </div>

      <svg width="1180" height={totalH} className="block max-w-full" style={{ height: 'auto' }}>
        {/* Background pavement strip */}
        <rect x={LEFT_LABEL_W} y={TOP_HEADER}
              width={plotW} height={top.length * ROW_HEIGHT}
              fill="#f1ecdf" stroke="#d4cab0" strokeWidth="1" />

        {/* ±2σ wander envelope — drawn ONCE in the header strip as a legend
            reference (instead of repeating it on every row).  This is the
            lateral region where the gear centroid sits ~95% of passes under
            FAARFIELD's N(0, σ² = 30.435²) wander statistic. */}
        {(() => {
          const bandY = 30
          const bandH = 26
          const bx0 = xToPx(-HALF_BAND)
          const bx1 = xToPx(+HALF_BAND)
          const bxMid = (bx0 + bx1) / 2
          return (
            <g>
              <rect x={bx0} y={bandY}
                    width={Math.max(bx1 - bx0, 1)} height={bandH}
                    fill="#737784" fillOpacity="0.20"
                    stroke="#737784" strokeWidth="0.8" strokeDasharray="4 2"
                    shapeRendering="crispEdges" />
              {/* Tick marks at the band edges so the ±60.87" extent is unmistakable */}
              <line x1={bx0} y1={bandY - 4} x2={bx0} y2={bandY + bandH + 4}
                    stroke="#3b3f47" strokeWidth="1" />
              <line x1={bx1} y1={bandY - 4} x2={bx1} y2={bandY + bandH + 4}
                    stroke="#3b3f47" strokeWidth="1" />
              <text x={bx0 - 4} y={bandY + bandH / 2 + 4}
                    textAnchor="end" fontSize="10" fontWeight="700" fill="#3b3f47">
                −60.87″
              </text>
              <text x={bx1 + 4} y={bandY + bandH / 2 + 4}
                    textAnchor="start" fontSize="10" fontWeight="700" fill="#3b3f47">
                +60.87″
              </text>
              <text x={bxMid} y={bandY + bandH / 2 + 4}
                    textAnchor="middle" fontSize="11" fontWeight="800" fill="#1a1c1e">
                ±2σ wander envelope
              </text>
            </g>
          )
        })()}

        {/* Centerline (x=0) */}
        {xExtent.xMin <= 0 && xExtent.xMax >= 0 && (
          <line x1={xToPx(0)} y1={TOP_HEADER} x2={xToPx(0)} y2={TOP_HEADER + top.length * ROW_HEIGHT}
                stroke="#1a1c1e" strokeWidth="1" strokeDasharray="6 4" />
        )}

        {/* ω* indicator — peak-damage evaluation point (NOT the gear position).
            Under FAARFIELD's wander statistic, the gear centroid is at X=0;
            ω* is the lateral pavement point that accumulates the highest CDF. */}
        {Math.abs(omegaStar) > 0.01 && (
          <>
            <line x1={xToPx(omegaStar)} y1={TOP_HEADER - 6}
                  x2={xToPx(omegaStar)} y2={TOP_HEADER + top.length * ROW_HEIGHT}
                  stroke="#16a34a" strokeWidth="1.5" strokeDasharray="3 3" />
            <text x={xToPx(omegaStar)} y={TOP_HEADER - 10}
                  textAnchor="middle" fontSize="10" fontWeight="700" fill="#16a34a">
              ω* = {omegaStar.toFixed(0)}″ (peak-CDF evaluation point)
            </text>
          </>
        )}

        {/* X-axis ticks + labels */}
        {ticks.map(v => (
          <g key={v}>
            <line x1={xToPx(v)} y1={TOP_HEADER + top.length * ROW_HEIGHT}
                  x2={xToPx(v)} y2={TOP_HEADER + top.length * ROW_HEIGHT + 4}
                  stroke="#737784" strokeWidth="0.8" />
            <text x={xToPx(v)} y={TOP_HEADER + top.length * ROW_HEIGHT + 16}
                  textAnchor="middle" fontSize="10" fill="#737784">{v}"</text>
          </g>
        ))}
        <text x={LEFT_LABEL_W + plotW / 2} y={totalH - 4}
              textAnchor="middle" fontSize="10" fontWeight="600" fill="#737784">
          Lateral position from centerline (in)
        </text>

        {/* Per-aircraft rows */}
        {top.map((ac, idx) => {
          const rank = idx + 1
          const yRow = TOP_HEADER + idx * ROW_HEIGHT
          const yMid = yRow + ROW_HEIGHT / 2
          const wheelXs = ac.wheelX || []
          const wheelYs = ac.wheelY || []
          const tireW = ac.tireWidth || 12
          const tireH = tireW * 0.6
          const cdf = ac.cdf || 0
          const cp = ac.coverageToPass ?? 0
          const src = ac.geometrySource || 'unknown'
          const fill = rankColor(rank, top.length)

          // Re-center each gear so the geometric centroid sits on the runway
          // centerline (X = 0).  Under FAARFIELD's wander model, the gear
          // centroid is statistically centered on the centerline with
          // σ = 30.435 in lateral standard deviation; each wheel maintains a
          // fixed offset from the centroid.  FAARFIELD's library stores some
          // aircraft (e.g. BE9L) in a gear-local frame where wheels are not
          // already centroid-zero; we mirror the FAARFIELD-internal
          // re-centering for visual consistency.
          const cxRaw = wheelXs.length
            ? wheelXs.reduce((s, v) => s + v, 0) / wheelXs.length
            : 0
          return (
            <g key={`${ac.icao || ac.name}-${idx}`}>
              {/* Row separator */}
              {idx > 0 && (
                <line x1={LEFT_LABEL_W} y1={yRow}
                      x2={LEFT_LABEL_W + plotW} y2={yRow}
                      stroke="#d4cab0" strokeWidth="0.5" />
              )}

              {/* Wheels — centroid-normalized; gear centroid sits on the centerline.
                  Each wheel rectangle is centered on its (centroid-relative) X
                  coordinate.  Compute width in pixels FIRST, then offset the
                  left edge by half the pixel-width so the rect center coincides
                  with xToPx(x - cxRaw).  Mixing inches and pixels in the offset
                  vs the width was the previous off-center bug. */}
              {wheelXs.map((x, j) => {
                const tireWpx = Math.max(tireW * (plotW / xRange), 2)
                const wx = xToPx(x - cxRaw) - tireWpx / 2
                // Map longitudinal Y to row-local vertical offset (for visual cue
                // about tandem layout; not to scale — clamped to ±18 px)
                const yOff = wheelYs[j]
                  ? Math.max(-18, Math.min(18, wheelYs[j] / 8))
                  : 0
                const wy = yMid - tireH / 2 + yOff
                return (
                  <rect key={j}
                        x={wx} y={wy}
                        width={tireWpx}
                        height={tireH}
                        fill={fill} stroke="#1a1c1e" strokeWidth="0.5" rx="1"
                        shapeRendering="crispEdges" />
                )
              })}

              {/* Row label */}
              <text x={8} y={yMid - 8} fontSize="11" fontWeight="700" fill="#1a1c1e">
                #{rank}  {ac.icao || ac.name}
              </text>
              <text x={8} y={yMid + 6} fontSize="10" fontFamily="monospace" fill="#1a1c1e">
                C/P={cp.toFixed(3)}  CDF={cdf.toExponential(2)}
              </text>
              {(() => {
                const lib = ac.libGear || ''
                const traf = ac.gear || ''
                const mismatch = lib && traf && lib.toUpperCase() !== traf.toUpperCase()
                const nW = ac.nWheels || wheelXs.length
                if (mismatch) {
                  // Two-line layout: emphasize that the LIBRARY gear is what was
                  // actually used (the wheel rectangles drawn above come from
                  // the library's wheelX/wheelY coords, not the traffic sheet).
                  return (
                    <>
                      <text x={8} y={yMid + 19} fontSize="10" fontWeight="700" fill="#1a1c1e">
                        library gear: {lib}  (used for analysis)
                      </text>
                      <text x={8} y={yMid + 30} fontSize="9" fill="#b85c00">
                        traffic-sheet gear: {traf}  (overridden) · {nW} wheels · src={src}
                      </text>
                    </>
                  )
                }
                return (
                  <text x={8} y={yMid + 19} fontSize="9" fill="#737784">
                    library gear: {lib || traf || '?'}  ·  {nW} wheels  ·  src={src}
                  </text>
                )
              })()}
            </g>
          )
        })}
      </svg>

      <p className="text-[11px] text-outline mt-2">
        Top 10 aircraft contributing to {controllingMode}. Each gear is plotted with its centroid on the runway centerline (X = 0) — the gear centroid's true mean lateral position under the FAA-standard wander statistic, which is N(0, σ² = 30.435²) about the centerline. Wheel coordinates come from the tier-matched FAARFIELD aircraft library entry per row (<code className="font-mono text-[10px]">src</code> tag: <code className="font-mono">xml</code> = exact ICAO match in FAARFIELD's library; <code className="font-mono">icao_proxy</code> / <code className="font-mono">family_proxy</code> / <code className="font-mono">nearest_proxy</code> = tier-matched fallback when the exact ICAO is missing). The grey band shown above the rows is the wander envelope <strong>±2σ = ±60.87″</strong> centered on the centerline — i.e. the lateral region the gear centroid occupies on ~95% of passes; it applies identically to every row, so it is drawn once in the legend strip rather than repeated per aircraft. The green dashed line at <strong>ω* = <span className="font-mono">{omegaStar.toFixed(0)}″</span></strong> is the lateral pavement point that accumulates the <em>highest</em> CDF over all 41 evaluation offsets (0–400″) — <strong>not</strong> where the gear sits, but the location where peak damage occurs (typically because an outboard wheel of one or more aircraft lands near this point during the high-probability portion of the wander distribution). <strong>C/P</strong> in each row label is the integral of the wander Gaussian over that aircraft's wheel-print intervals at ω* — the per-pass coverage multiplier applied to design departures in the CDF sum.
      </p>
    </div>
  )
}
