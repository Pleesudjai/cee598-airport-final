import Methodology from '../components/Methodology'
import DataSources from '../components/DataSources'

export default function MethodologyTab() {
  return (
    <div className="space-y-10">
      <Methodology />

      {/* Subgrade Methods */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-primary">terrain</span>
          <h3 className="text-xl font-bold tracking-tight">Subgrade Selection Methods</h3>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[
            { title: 'Method 1: At Pavement Bottom', desc: 'Uses the NRCS soil horizon at the total pavement depth. Most common for quick estimates. Simple and direct — one horizon, one CBR.', badge: 'Quick', color: 'primary' },
            { title: 'Method 2: Weighted Average', desc: 'Averages all horizons below the pavement, weighted by layer thickness. More representative when soil varies significantly with depth.', badge: 'Balanced', color: 'secondary' },
            { title: 'Method 3: Weakest Layer (1.5x)', desc: 'Uses the horizon with the lowest CBR within 1.5x the pavement depth. Most conservative — accounts for the stress influence zone extending below the direct subgrade.', badge: 'Conservative', color: 'tertiary' },
          ].map(m => (
            <div key={m.title} className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
              <span className={`text-[9px] font-bold uppercase tracking-widest text-${m.color} bg-${m.color}/10 px-2 py-0.5 rounded`}>{m.badge}</span>
              <p className="text-sm font-bold mt-2">{m.title}</p>
              <p className="text-xs text-outline mt-1">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Conversions */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-primary">swap_horiz</span>
          <h3 className="text-xl font-bold tracking-tight">Subgrade Conversions</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">CBR → Elastic Modulus</p>
            <p className="font-mono text-sm font-bold bg-surface-low rounded-lg p-3">E (psi) = 1500 × CBR</p>
            <p className="text-xs text-outline mt-2">FAARFIELD default conversion. Range: E = 1,000–50,000 psi</p>
          </div>
          <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">E → Modulus of Subgrade Reaction</p>
            <p className="font-mono text-sm font-bold bg-surface-low rounded-lg p-3">k (pci) = (E / 20.15)^(1/1.28405)</p>
            <p className="text-xs text-outline mt-2">FAARFIELD default conversion. Used for rigid/overlay analysis.</p>
          </div>
        </div>
      </section>

      {/* AASHTO table */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-primary">grid_on</span>
          <h3 className="text-xl font-bold tracking-tight">AASHTO Soil Classification → CBR</h3>
        </div>
        <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-widest text-outline border-b border-outline-variant/20">
                <th className="text-left py-2 px-3">AASHTO Group</th>
                <th className="text-left py-2 px-3">Typical Soil</th>
                <th className="text-center py-2 px-3">#200 (%)</th>
                <th className="text-center py-2 px-3">LL</th>
                <th className="text-center py-2 px-3">PI</th>
                <th className="text-center py-2 px-3">CBR Range</th>
                <th className="text-center py-2 px-3">Default CBR</th>
                <th className="text-center py-2 px-3">Quality</th>
              </tr>
            </thead>
            <tbody>
              {[
                { group: 'A-1-a', soil: 'Gravel, coarse sand', p200: '≤15', ll: '—', pi: '≤6', range: '25–80', cbr: 30, quality: 'Excellent', color: 'adequate' },
                { group: 'A-1-b', soil: 'Fine sand, gravel', p200: '≤25', ll: '—', pi: '≤6', range: '20–40', cbr: 25, quality: 'Good', color: 'adequate' },
                { group: 'A-2-4', soil: 'Silty/clayey gravel', p200: '≤35', ll: '≤40', pi: '≤10', range: '15–30', cbr: 20, quality: 'Good', color: 'adequate' },
                { group: 'A-3', soil: 'Fine sand', p200: '≤10', ll: '—', pi: 'NP', range: '15–25', cbr: 20, quality: 'Good', color: 'adequate' },
                { group: 'A-4', soil: 'Silt', p200: '>35', ll: '≤40', pi: '≤10', range: '5–15', cbr: 8, quality: 'Fair', color: 'borderline' },
                { group: 'A-6', soil: 'Clayey silt', p200: '>35', ll: '≤40', pi: '>10', range: '5–10', cbr: 7, quality: 'Fair', color: 'borderline' },
                { group: 'A-7-6', soil: 'Clay', p200: '>35', ll: '>40', pi: '>10', range: '3–8', cbr: 4, quality: 'Poor', color: 'failing' },
              ].map(r => (
                <tr key={r.group} className="border-t border-outline-variant/10 hover:bg-surface-low">
                  <td className="py-2 px-3 font-mono font-bold">{r.group}</td>
                  <td className="py-2 px-3 text-outline">{r.soil}</td>
                  <td className="py-2 px-3 text-center font-mono">{r.p200}</td>
                  <td className="py-2 px-3 text-center font-mono">{r.ll}</td>
                  <td className="py-2 px-3 text-center font-mono">{r.pi}</td>
                  <td className="py-2 px-3 text-center font-mono">{r.range}</td>
                  <td className="py-2 px-3 text-center font-mono font-bold">{r.cbr}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`text-[9px] font-bold uppercase tracking-widest text-${r.color} bg-${r.color}/10 px-2 py-0.5 rounded`}>{r.quality}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Growth formula */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-primary">trending_up</span>
          <h3 className="text-xl font-bold tracking-tight">Traffic Growth Formula</h3>
        </div>
        <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <p className="font-mono text-sm font-bold bg-surface-low rounded-lg p-3 mb-3">
            Total Design Departures = [1 + (Life × Growth × 0.5)] × Annual_Deps × Life
          </p>
          <p className="text-xs text-outline">
            From FAARFIELD source code (modFAILURE_MODEL_NP.vb, line 840). This is a linear growth approximation,
            not compound growth. Annual_Deps = base year departures. Growth = annual CAGR as decimal. Life = design life in years.
          </p>
        </div>
      </section>

      {/* PCC Material Property Inputs (FAA AC 150/5320-6F) */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-primary">science</span>
          <h3 className="text-xl font-bold tracking-tight">Existing-PCC Material Properties (FAA AC 150/5320-6F)</h3>
        </div>
        <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <p className="text-sm text-on-surface mb-3">
            All 13 project sections have PCC poured between 1942 and 1977 (49–84 years old at the 2026 analysis date). For overlay design on existing PCC, FAA AC 150/5320-6F instructs the engineer to use <strong>field-measured flexural strength</strong> from cores (ASTM C78) or non-destructive testing. When no field test data is available, the AC permits an empirical relation:
          </p>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="bg-surface-low rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Modulus of Rupture R</p>
              <p className="font-mono text-sm font-bold mb-2">R = (8 – 15%) · f′<sub>c</sub></p>
              <p className="text-xs text-outline">
                Lower bound (8%) selected for &gt;20-yr aged PCC with unknown in-situ condition. Assumed effective f′<sub>c</sub> = <strong>4,500 psi</strong> (mid-range of 1940s–70s airport PCC after moderate environmental loss). Result: <strong>R = 360 psi</strong> uniformly across all 13 sections — a 45% reduction from FAARFIELD's 650 psi default for new construction.
              </p>
            </div>
            <div className="bg-surface-low rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Slab Condition Index SCI</p>
              <p className="font-mono text-sm font-bold mb-2">SCI = 80 (FAARFIELD default)</p>
              <p className="text-xs text-outline">
                FAARFIELD's design-default representing "moderate" condition (first observable cracking — end of standard 20-yr design life). The 2014 fatigue model (<code className="font-mono">LeafCDFRigid_2014</code>) uses SCI to shift the Nf curve, but its dependence is non-monotonic in typical subgrade-modulus ranges, so we do <strong>not</strong> attempt to derive per-section SCI from prior-period CDFU. Existing-PCC degradation enters only through the reduced R (left).
              </p>
            </div>
          </div>
          <p className="text-xs text-outline">
            <strong>Caveat:</strong> R = 360 psi is a one-sided conservative assumption. Actual in-situ MOR could be higher; if cores measured higher R the verdicts shift toward more OVER. The borderline OVER sections (KOTM 27641 at CDF = 0.96, KOTM 28171 at CDF = 0.94) are particularly sensitive — moving R from 360 to 500 psi would push them comfortably over, while moving to 300 psi would flip them UNDER. <strong>Field cores or FWD backcalculation are strongly recommended</strong> before final rehabilitation design. Construction-history records used to confirm all 13 PCC slabs exceed the 20-year aging threshold are preserved at <code className="font-mono">results/SCI_estimation.md</code>.
          </p>
        </div>
      </section>

      {/* Native FAARFIELD Engine */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-primary">memory</span>
          <h3 className="text-xl font-bold tracking-tight">Native FAARFIELD Engine</h3>
        </div>
        <div className="bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <p className="text-sm text-on-surface mb-3">
            All CDF and stress analysis runs through a custom .NET 4.8 backend that <strong>directly invokes the actual FAARFIELD 2.1.1 DLLs</strong> via in-process P/Invoke. Same compiled code FAARFIELD desktop calls when you click "Analysis → Life".
          </p>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="bg-surface-low rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-adequate mb-1">What's Native</p>
              <ul className="text-xs text-outline space-y-1">
                <li>Layered elastic stress (LEAFClassLib.dll) — same as desktop, validated within 0.1% (Phase D crosscheck)</li>
                <li>Rigid-FEM PCC slab stress (AMClassLib.dll) — same as desktop's NewRigid path</li>
                <li>Aircraft wheel coords from FAARFIELD XML (FAAMeshClassLib library lookup)</li>
                <li>Growth/design-deps formula (modFAILURE_MODEL_NP.vb:840) bit-exact</li>
                <li>41-lateral-offset CDF sweep, max-of-offsets reporting</li>
              </ul>
            </div>
            <div className="bg-surface-low rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-under mb-1">Wrapper-Side</p>
              <ul className="text-xs text-outline space-y-1">
                <li>Fatigue equations (PCC 2014, AC RDEC, subgrade rutting) re-implemented in VB.NET as line-by-line ports of FAARFIELD source</li>
                <li>Three real bugs caught and fixed during development: (1) PCC fatigue exponent cap missing; (2) ported the dead 2013 fatigue function instead of the active 2014 model; (3) AMClassLib rigid FEM was being skipped when useFem3d=false, while desktop ALWAYS runs it for rigid/overlay design</li>
                <li>Verified via source-code parity audit, hand calculation, and Phase D printout-file crosscheck (4,580/4,580 elements within 0.1% on B738 standard mesh)</li>
                <li>3D FEM (FAASR3D via AMClassLib) <strong>enabled by default</strong> for the batch and Design Tool — matches desktop behavior for HMA-on-rigid overlay design</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-outline">
            CDF answers from the native engine match what FAARFIELD desktop computes for the same inputs (same DLLs, same equations). For each section's per-aircraft CDF table, see the expanded row on the Project Report tab.
          </p>
        </div>
      </section>

      <DataSources />
    </div>
  )
}
