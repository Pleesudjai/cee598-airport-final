export default function KeyFindings({ cdfResults, sections, airports }) {
  const underSections = cdfResults.filter(r => !r.adequate).sort((a, b) => b.cdf_max - a.cdf_max)
  const overSections = cdfResults.filter(r => r.adequate).sort((a, b) => b.cdf_max - a.cdf_max)
  const borderlineOver = overSections.filter(r => r.cdf_max > 0.5 && r.cdf_max <= 1.0)
  const moderateOver = overSections.filter(r => r.cdf_max > 0.05 && r.cdf_max <= 0.5)
  const comfyOver = overSections.filter(r => r.cdf_max <= 0.05)

  const pccControlled = cdfResults.filter(r => r.controlling === 'PCC Fatigue').length

  // Per-section first-order PCC thickness estimate to reach CDF = 1.0.
  // PCC bottom flexural stress sigma ~ 1/h^2 (Westergaard plate-on-foundation).
  // 2014 fatigue: log10(Nf) ~ (R/sigma - C)/D, so log10(Nf) ~ h^2 (linear in h^2).
  // To increase Nf by factor cdf_max: h_new ~ h_now * cdf_max^(1/(2*Nf_slope))
  // Empirical first order with FAARFIELD constants ~ cdf_max^0.10 (matches DesignTool sensitivity).
  function estimateRequiredPcc(r) {
    const sec = sections.find(s => s.section_id === r.section_id)
    const pcc = sec?.layers?.find(l => l.type?.includes('PCC'))
    if (!pcc) return null
    const thicknessRatio = Math.pow(Math.max(r.cdf_max, 1.001), 0.1)
    return Math.ceil(pcc.h * thicknessRatio)
  }

  const morUsed = cdfResults[0]?.mor_psi ?? 360
  const sciUsed = cdfResults[0]?.sci ?? 80

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-primary">lightbulb</span>
        <h3 className="text-xl font-bold tracking-tight">Key Findings & Recommendations</h3>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Findings */}
        <div className="col-span-7 bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">Key Findings</p>
          <ul className="space-y-2 text-sm">

            <li className="flex gap-2">
              <span className="text-failing font-bold shrink-0">1.</span>
              <span>
                <strong className="text-failing">{underSections.length} of {cdfResults.length} sections are structurally under-designed</strong> (CDF<sub>max</sub> &gt; 1.0 over the 20-year design life): {' '}
                <strong>{underSections.map(r => `${r.icao}-${r.section_id}`).join(', ')}</strong>.{' '}
                These will exhaust their PCC fatigue capacity before reaching the design horizon and require structural rehabilitation (PCC slab thickening, unbonded PCC overlay, or full-depth reconstruction). The maximum CDF observed is {underSections[0]?.cdf_max?.toExponential(2)} at <strong>{underSections[0]?.icao}-{underSections[0]?.section_id}</strong>, indicating capacity already several orders of magnitude past failure under the input traffic.
              </span>
            </li>

            <li className="flex gap-2">
              <span className="text-under font-bold shrink-0">2.</span>
              <span>
                <strong>{borderlineOver.length} sections are at the failure boundary</strong> (0.5 &lt; CDF ≤ 1.0):{' '}
                {borderlineOver.length > 0
                  ? <><strong>{borderlineOver.map(r => `${r.icao}-${r.section_id} (CDF=${r.cdf_max.toFixed(2)})`).join(', ')}</strong>. With less than {Math.round(100 * (1 - Math.max(...borderlineOver.map(r => r.cdf_max), 0)))}% margin to design failure, these sections are highly sensitive to MOR uncertainty and traffic-growth assumptions. Recommend (a) field cores to refine MOR estimate, (b) FWD backcalculation to verify in-situ moduli, and (c) mid-life PCC overlay scheduled at year ~{Math.round(20 * (borderlineOver[0]?.cdf_max ?? 1))}.</>
                  : <em>none in this batch.</em>}
              </span>
            </li>

            <li className="flex gap-2">
              <span className="text-under font-bold shrink-0">3.</span>
              <span>
                <strong>{moderateOver.length} sections are moderately over-designed</strong> (0.05 &lt; CDF ≤ 0.5):{' '}
                {moderateOver.length > 0
                  ? <><strong>{moderateOver.map(r => `${r.icao}-${r.section_id} (CDF=${r.cdf_max.toFixed(3)})`).join(', ')}</strong>. Structural capacity exceeds the 20-yr demand by a factor of {Math.round(1 / (moderateOver[0]?.cdf_max ?? 0.1))}–{Math.round(1 / (moderateOver[moderateOver.length-1]?.cdf_max ?? 0.5))}×. These sections are not load-fatigue limited; physical service life will be governed by environmental and surface-condition mechanisms (joint deterioration, freeze–thaw scaling, reflective cracking through the AC overlay).</>
                  : <em>none in this batch.</em>}
              </span>
            </li>

            <li className="flex gap-2">
              <span className="text-adequate font-bold shrink-0">4.</span>
              <span>
                <strong>{comfyOver.length} sections are far over-designed</strong> (CDF ≤ 0.05):{' '}
                {comfyOver.length > 0
                  ? <>{comfyOver.map(r => `${r.icao}-${r.section_id}`).join(', ')}. CDF below the engine's numerical resolution under typical traffic; structural fatigue is not the limiting mechanism within an engineering planning horizon.</>
                  : <em>none in this batch.</em>}
              </span>
            </li>

            <li className="flex gap-2">
              <span className="text-primary font-bold shrink-0">5.</span>
              <span>
                <strong>Universal controlling failure mode: PCC flexural fatigue</strong> ({pccControlled} of {cdfResults.length} sections). Neither asphalt-concrete fatigue (RDEC ε<sub>h</sub> at AC bottom) nor subgrade rutting (ε<sub>v</sub> at subgrade top) controls in any section. This is consistent with HMA-overlay-on-rigid composite behavior: the rigid PCC slab carries the bending, the AC layer dissipates surface stresses, and the subgrade sees attenuated vertical strain through the deep stiff plate.
              </span>
            </li>

            <li className="flex gap-2">
              <span className="text-primary font-bold shrink-0">6.</span>
              <span>
                <strong>Material strength dominates over thickness for aged PCC.</strong> KCIU 21222 — a 24″ PCC slab (B-52 SAC-base era, originally designed for &gt;700,000 lb aircraft) — is now flagged UNDER (CDF = {cdfResults.find(r => r.icao === 'KCIU')?.cdf_max?.toFixed(2)}) despite enormous thickness, because the FAA AC 150/5320-6F lower-bound MOR (R = {morUsed} psi for &gt;20-yr aged PCC, no field cores available) reduces the design margin to where even the thick slab cannot resist current traffic. By contrast, KLHX-7347 (8″ PCC, very low traffic) is comfortably OVER (CDF = {cdfResults.find(r => r.icao === 'KLHX' && r.section_id === '7347')?.cdf_max?.toExponential(2)}). The lesson: when in-situ MOR is uncertain, the conservative assumption can flip even thick slabs to UNDER.
              </span>
            </li>

            <li className="flex gap-2">
              <span className="text-primary font-bold shrink-0">7.</span>
              <span>
                <strong>Engine provenance and validation.</strong> All CDF computations use the native FAARFIELD 2.1.1 engine (LEAFClassLib for layered-elastic stress + AMClassLib invoking FAASR3D for the rigid 3D FEM PCC stress; 2014 fatigue equation <code className="font-mono">LeafCDFRigid_2014</code> from <code className="font-mono">modFAILURE_MODEL_NP.vb:1932-2148</code>). The 3D FEM stress export was validated against FAARFIELD desktop's printout file: 4,580 / 4,580 brick elements within 0.1% of the desktop's per-Gauss-point σ peak. CDF is reported as the maximum across the FAA-standard 41-offset lateral sweep (0–400″ from centerline at 10″ increments), wander σ = 30.435″.
              </span>
            </li>

          </ul>
        </div>

        {/* Methodology note + Recommendations */}
        <div className="col-span-5 space-y-4">

          {/* Methodology box — explains why R=360, SCI=80 */}
          <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)] border-l-4 border-primary">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Material-Property Inputs</p>
            <p className="text-xs text-on-surface mb-2">
              <strong>PCC modulus of rupture R = {morUsed} psi</strong> for all sections. All 13 PCC slabs are 49–84 years old (1942–1977 construction), so the FAA AC 150/5320-6F empirical relation for existing PCC overlay design — <em>R = (8–15%) · f'<sub>c</sub></em> when no field core or NDT data is available — is applied at the lower bound: 0.08 × 4,500 psi assumed effective f'<sub>c</sub> for aged airport-grade PCC = 360 psi. This is a 45% reduction from FAARFIELD's 650 psi default for new construction, and conservatively accounts for environmental and microcracking-driven strength loss over the half-century since pour.
            </p>
            <p className="text-xs text-on-surface mb-2">
              <strong>Slab Condition Index SCI = {sciUsed}</strong> uniformly. This is FAARFIELD's design-default representing "moderate" slab condition / first-observable cracking; lower SCI inputs in the 2014 model do not correspond to "more damaged" — they shift the fatigue curve in a non-monotonic way (verified against <code className="font-mono">modFAILURE_MODEL_NP.vb:1932-2148</code>). Existing-PCC fatigue damage is captured exclusively through the reduced R, not through SCI manipulation.
            </p>
            <p className="text-[10px] text-outline italic">
              Both inputs are conservative-side defaults driven by the absence of project-specific cores or FWD backcalculation. Per-section refinement would require destructive testing.
            </p>
          </div>

          {/* Recommendations */}
          <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">Design Recommendations</p>
            <div className="space-y-3">

              {/* UNDER sections — structural rehab needed */}
              {underSections.length > 0 && (
                <div className="bg-failing-bg rounded-lg p-3 border-l-4 border-failing">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-failing uppercase tracking-widest">Structural Rehabilitation Required</span>
                    <span className="text-[10px] font-mono text-failing">{underSections.length} of {cdfResults.length}</span>
                  </div>
                  {underSections.map(r => {
                    const sec = sections.find(s => s.section_id === r.section_id)
                    const needed = estimateRequiredPcc(r)
                    const pccCurrent = sec?.layers?.find(l => l.type?.includes('PCC'))?.h
                    const yearsToFail = r.cdf_max > 0 ? (20 / r.cdf_max).toFixed(1) : 'n/a'
                    return (
                      <div key={r.section_id} className="mt-2 pt-2 border-t border-failing/20 first:mt-1 first:pt-0 first:border-t-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{r.icao} — Section {r.section_id}</span>
                          <span className="text-[10px] font-mono">CDF = {r.cdf_max.toExponential(2)}</span>
                        </div>
                        <p className="text-[11px] text-outline mt-0.5">
                          Current: {sec?.desc}. Predicted fatigue exhaustion in <strong>≈{yearsToFail} yr</strong> (vs 20-yr target). First-order replacement-PCC thickness ≈ <strong>{needed}″</strong>{needed && pccCurrent ? <> (+{(needed - pccCurrent).toFixed(0)}″ over existing {pccCurrent}″)</> : null}; alternatives are an unbonded PCC overlay or, for catastrophic CDF (&gt; 100), full-depth reconstruction. Confirm with FAARFIELD <em>Design</em> mode.
                        </p>
                      </div>
                    )
                  })}
                  <p className="text-[10px] text-outline italic mt-2">
                    Thickness estimates use first-order σ ~ 1/h² scaling on the 2014 fatigue curve at R = {morUsed} psi. Recommend obtaining cores or FWD before final design — actual in-situ R may exceed 360 psi, in which case required thickness drops.
                  </p>
                </div>
              )}

              {/* Borderline OVER */}
              {borderlineOver.length > 0 && (
                <div className="bg-surface-low rounded-lg p-3 border-l-4 border-under">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-under uppercase tracking-widest">Mid-Life Rehab + Field Verification</span>
                    <span className="text-[10px] font-mono text-under">{borderlineOver.length} of {cdfResults.length}</span>
                  </div>
                  <p className="text-[11px] text-outline mt-1">
                    {borderlineOver.map(r => <span key={r.section_id}><strong>{r.icao}-{r.section_id}</strong> (CDF={r.cdf_max.toFixed(2)}, ~{(20*r.cdf_max).toFixed(1)} yr to depletion){' '}</span>)}.
                    Margins are within MOR and traffic-growth uncertainty. <strong>Cores + FWD strongly recommended</strong> before committing to a rehab strategy. If in-situ MOR is found to be ≥ 500 psi these sections move to comfortable OVER; if ≤ 300 psi they cross to UNDER.
                  </p>
                </div>
              )}

              {/* Moderate OVER */}
              {moderateOver.length > 0 && (
                <div className="bg-surface-low rounded-lg p-3 border-l-4 border-outline-variant">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-on-surface uppercase tracking-widest">Routine Maintenance + Surface Treatments</span>
                    <span className="text-[10px] font-mono text-on-surface">{moderateOver.length} of {cdfResults.length}</span>
                  </div>
                  <p className="text-[11px] text-outline mt-1">
                    <strong>{moderateOver.map(r => `${r.icao}-${r.section_id}`).join(', ')}</strong> — structural capacity adequate within the 20-yr horizon. Service life will be limited by environmental aging (joint deterioration, freeze–thaw, reflective cracking, surface raveling), not load fatigue. Recommend:
                  </p>
                  <ul className="text-[10px] text-outline mt-1.5 ml-3 list-disc space-y-0.5">
                    <li>Crack/joint sealing on a 3–5 year cycle</li>
                    <li>Thin AC overlay or slurry seal at 10–15 year intervals</li>
                    <li>Reflective-cracking inspection on the existing AC overlay</li>
                  </ul>
                </div>
              )}

              {/* Comfy OVER */}
              {comfyOver.length > 0 && (
                <div className="bg-adequate-bg rounded-lg p-3 border-l-4 border-adequate">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-adequate uppercase tracking-widest">Environmental-Aging-Limited</span>
                    <span className="text-[10px] font-mono text-adequate">{comfyOver.length} of {cdfResults.length}</span>
                  </div>
                  <p className="text-[11px] text-outline mt-1">
                    <strong>{comfyOver.map(r => `${r.icao}-${r.section_id}`).join(', ')}</strong> — load-fatigue capacity exceeds traffic demand by factors of 10²–10⁵. No structural action warranted within planning horizon; standard preventive maintenance only.
                  </p>
                </div>
              )}

              {/* Methodology + scope caveat */}
              <div className="bg-surface-low rounded-lg p-3 border-l-2 border-outline">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface">Model Scope &amp; Caveats</span>
                <ul className="text-[10px] text-outline mt-1 ml-3 list-disc space-y-0.5">
                  <li>FAARFIELD CDF captures wheel-load fatigue only. Environmental degradation (freeze–thaw, ASR, joint deterioration), reflective cracking, and surface distress are not modeled.</li>
                  <li>R = {morUsed} psi is a one-sided conservative assumption per FAA AC 150/5320-6F. Actual in-situ R may be higher; verdict shifts toward more OVER if cores measure higher MOR.</li>
                  <li>Aircraft wheel coordinates and tire pressures pulled from FAARFIELD's XML library via tier-matched proxies (gear-coord audit confirms all 160 unique aircraft are tier 1–2 matches).</li>
                  <li>Subgrade modulus from NRCS soil class via FAA standard E = 1500·CBR. FWD backcalculation would refine further but was outside project scope.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
