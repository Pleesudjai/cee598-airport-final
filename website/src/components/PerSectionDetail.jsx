// Per-section drill-down: CDF breakdown (3 failure modes) + verdict + construction
// history + top-N aircraft table with libGear mismatch indicators.
// Extracted from SummaryTable.jsx during the unified-summary-panel migration so
// both the unified panel and any other consumer can reuse the same drill-down.

function CdfBar({ label, value, max, active }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div>
      <div className="flex justify-between items-center text-[11px]">
        <span className={`${active ? 'font-bold text-failing' : 'font-medium text-outline'}`}>
          {label}
          {active && <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest">controlling</span>}
        </span>
        <span className="font-mono">{value > 0 ? value.toExponential(2) : '0'}</span>
      </div>
      <div className="h-1.5 bg-outline-variant/15 rounded mt-1 overflow-hidden">
        <div
          className={`h-full rounded transition-all ${active ? 'bg-failing' : 'bg-primary/50'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function PerSectionDetail({ r, apt }) {
  const life = r.cdf_max > 0 ? 1 / r.cdf_max : Infinity
  // Merge libGear (authoritative FAARFIELD library gear) from top_aircraft_full
  // onto each top_aircraft row by ICAO so the per-aircraft table can show the
  // same library-first gear label that DesignTool uses.
  const libGearByIcao = Object.fromEntries(
    (r.top_aircraft_full || []).map(a => [a.icao || a.name, a.libGear ?? null])
  )
  // Limit to top 10 by CDF contribution — the pre-cal'd JSON sometimes carries
  // up to 20 entries, but the chart legend, gear footprint, and report narrative
  // standardize on top-10 (matches the Design Tool's CDF profile chart and the
  // 130-row gear-coordinate trace audit's top-10 sample).
  const top = (r.top_aircraft || []).slice(0, 10).map(a => ({
    ...a,
    libGear: libGearByIcao[a.ac] ?? null,
  }))
  const hasSimplified = top.some(
    a => a.wheelSource === 'gear_template' || a.wheelSource === 'dual_fallback'
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
      <div className="lg:col-span-5">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">
          CDF breakdown (3 failure modes)
        </h4>
        <div className="space-y-2.5">
          <CdfBar label="AC Fatigue" value={r.cdf_ac} max={r.cdf_max} active={r.controlling === 'AC Fatigue'} />
          <CdfBar label="Subgrade Rutting" value={r.cdf_sub} max={r.cdf_max} active={r.controlling === 'Subgrade Rutting'} />
          <CdfBar label="PCC Fatigue" value={r.cdf_pcc} max={r.cdf_max} active={r.controlling === 'PCC Fatigue'} />
        </div>
        <div className="mt-4 p-3 bg-surface-lowest rounded-lg border border-outline-variant/10">
          <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1.5">Verdict</div>
          <div className="text-xs">
            {r.adequate ? (
              <>
                <span className="font-bold text-adequate">Over-designed</span> —{' '}
                <span className="font-mono font-bold">
                  {life === Infinity ? '∞' : life.toExponential(2) + '×'}
                </span>{' '}
                the 20-year design life
              </>
            ) : (
              <>
                <span className="font-bold text-failing">Under-designed</span> — fails at{' '}
                <span className="font-mono font-bold">{(100 / r.cdf_max).toFixed(1)}%</span> of design life
              </>
            )}
          </div>
          {(r.pcc_year || r.overlay_year || r.mor_psi !== undefined || r.sci !== undefined) && (
            <div className="mt-3 pt-3 border-t border-outline-variant/10 text-[11px] space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">
                Construction history &amp; material inputs
              </div>
              {r.pcc_year && (
                <div>
                  PCC constructed: <span className="font-mono">{r.pcc_year}</span>
                  <span className="text-outline"> ({(new Date().getFullYear()) - r.pcc_year} yr old)</span>
                </div>
              )}
              {r.overlay_year && (
                <div>
                  AC overlay placed: <span className="font-mono">{r.overlay_year}</span>
                  <span className="text-outline"> ({(new Date().getFullYear()) - r.overlay_year} yr old)</span>
                </div>
              )}
              {r.pcc_year && r.overlay_year && (
                <div className="text-outline">
                  Bare-PCC service: <span className="font-mono">{r.overlay_year - r.pcc_year} yr</span>
                </div>
              )}
              {r.mor_psi !== undefined && r.mor_psi !== null && (
                <div>
                  PCC MOR (R) used: <span className="font-mono font-bold">{r.mor_psi} psi</span>
                  <span className="text-outline"> {r.mor_psi <= 400 ? '(FAA AC 150/5320-6F lower bound: 0.08·f\'c, aged PCC)' : '(fresh-PCC default)'}</span>
                </div>
              )}
              {r.sci !== undefined && (
                <div>
                  PCC SCI: <span className="font-mono font-bold">{r.sci.toFixed(0)}</span>
                  <span className="text-outline"> / 100 (FAARFIELD design default; existing-PCC degradation captured by reduced R above, not SCI)</span>
                </div>
              )}
              {r.pre_overlay_cdfu !== undefined && r.pre_overlay_cdfu !== null && (
                <div className="text-outline">
                  Pre-overlay CDFU (audit-only): <span className="font-mono">{r.pre_overlay_cdfu.toExponential(2)}</span>
                </div>
              )}
            </div>
          )}
          <div className="text-[11px] text-outline mt-2">
            Engine: <span className="font-mono">{r.engine || 'unknown'}</span>
            {r.growth !== undefined && <> · Growth: <span className="font-mono">{(r.growth * 100).toFixed(1)}%/yr</span></>}
          </div>
        </div>
      </div>

      <div className="lg:col-span-7 overflow-x-auto">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">
          Top {top.length} aircraft by CDF contribution
        </h4>
        <div className="bg-surface-lowest rounded-lg border border-outline-variant/10 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-surface-low">
              <tr className="text-outline">
                <th className="text-left font-semibold px-3 py-2 text-[10px] uppercase tracking-widest">#</th>
                <th className="text-left font-semibold px-3 py-2 text-[10px] uppercase tracking-widest">Aircraft</th>
                <th className="text-right font-semibold px-3 py-2 text-[10px] uppercase tracking-widest">MTOW (lb)</th>
                <th className="text-left font-semibold px-3 py-2 text-[10px] uppercase tracking-widest">Gear</th>
                <th className="text-right font-semibold px-3 py-2 text-[10px] uppercase tracking-widest">CDF</th>
                <th className="text-left font-semibold px-3 py-2 text-[10px] uppercase tracking-widest">Wheel source</th>
              </tr>
            </thead>
            <tbody>
              {top.map((a, i) => {
                const simplified = a.wheelSource === 'gear_template' || a.wheelSource === 'dual_fallback'
                return (
                  <tr key={i} className="border-t border-outline-variant/5">
                    <td className="px-3 py-2 text-outline">{i + 1}</td>
                    <td className="px-3 py-2 font-mono font-bold text-on-surface">
                      {a.ac}
                      {simplified && <span className="text-failing ml-1" title="Simplified wheel layout">*</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{a.mtow.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono">
                      {a.libGear || a.gear || '?'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{a.cdf_total.toExponential(2)}</td>
                    <td className="px-3 py-2 text-[11px] text-outline">
                      {a.wheelSourceNote || a.wheelSource || '—'}
                    </td>
                  </tr>
                )
              })}
              {top.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-outline text-[11px]">
                    No per-aircraft breakdown available for this section.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {hasSimplified && (
          <div className="mt-2 text-[11px] text-outline">
            <span className="text-failing">*</span> simplified wheel layout (tier-3 <code className="font-mono">gear_template</code> or tier-4 <code className="font-mono">dual_fallback</code>) — see{' '}
            <code className="font-mono">results/gear_coord_audit.json</code>
          </div>
        )}
      </div>
    </div>
  )
}
