export default function Methodology() {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-primary">calculate</span>
        <h3 className="text-xl font-bold tracking-tight">Methodology — FAARFIELD 2.1.1 Desktop Parity</h3>
      </div>
      <div className="grid grid-cols-12 gap-6">

        {/* Flow Diagram */}
        <div className="col-span-12 bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <div className="flex items-center justify-between gap-2 text-center">
            {[
              { icon: 'database', label: 'Input Data', sub: 'Layers, Traffic, Soil' },
              { icon: 'arrow_forward', label: '', sub: '' },
              { icon: 'science', label: 'Material Inputs', sub: 'R per AC 150/5320-6F · SCI = 80' },
              { icon: 'arrow_forward', label: '', sub: '' },
              { icon: 'hub', label: 'LEAF + Rigid FEM', sub: 'LEAFClassLib + AMClassLib (FAASR3D)' },
              { icon: 'arrow_forward', label: '', sub: '' },
              { icon: 'warning', label: 'Failure Models', sub: 'AC + Subgrade + PCC' },
              { icon: 'arrow_forward', label: '', sub: '' },
              { icon: 'functions', label: '41-Offset CDF', sub: 'Σ(n·C/P / Nf), max over offsets' },
              { icon: 'arrow_forward', label: '', sub: '' },
              { icon: 'verified', label: 'Verdict', sub: 'CDF < 1 = OVER' },
            ].map((step, i) => step.label ? (
              <div key={i} className="flex-1 bg-surface-low rounded-xl p-4">
                <span className="material-symbols-outlined text-primary text-2xl">{step.icon}</span>
                <p className="text-xs font-bold mt-1">{step.label}</p>
                <p className="text-[10px] text-outline">{step.sub}</p>
              </div>
            ) : (
              <span key={i} className="material-symbols-outlined text-outline-variant text-xl">arrow_forward</span>
            ))}
          </div>
        </div>

        {/* Material Property Inputs — front-and-center because they drive the verdict */}
        <div className="col-span-12 bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)] border-l-4 border-primary">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary">science</span>
            <p className="text-sm font-bold">PCC Material-Property Inputs (per FAA AC 150/5320-6F)</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-on-surface mb-1">Modulus of Rupture (R) — flexural strength</p>
              <pre className="font-mono text-[11px] font-bold text-on-surface bg-surface-low rounded-lg p-3 mb-2 whitespace-pre-wrap">
{`R = 0.08 · f'c_assumed
   = 0.08 · 4,500 psi
   = 360 psi`}
              </pre>
              <p className="text-xs text-outline">
                FAA AC 150/5320-6F recommends measured flexural strength from cores or NDT for existing-PCC overlay design. Without field test data, the AC permits the empirical relation R = (8–15%)·f′<sub>c</sub>. All 13 project sections have PCC ≥ 49 yr old (1942–1977), so we apply the AC's <strong>lower bound (8%)</strong> with an assumed effective f′<sub>c</sub> = 4,500 psi for aged airport-grade concrete with moderate environmental loss. This yields R = 360 psi, a 45% reduction from FAARFIELD's 650 psi default for new construction.
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-on-surface mb-1">Slab Condition Index (SCI)</p>
              <pre className="font-mono text-[11px] font-bold text-on-surface bg-surface-low rounded-lg p-3 mb-2 whitespace-pre-wrap">
{`SCI = 80
sci_f = 1 − SCI/100 = 0.20`}
              </pre>
              <p className="text-xs text-outline">
                FAARFIELD's design-default for "moderate" slab condition / first-observable cracking. Used uniformly across all 13 sections. The 2014 fatigue model's SCI dependence is non-monotonic in typical subgrade-modulus ranges (verified algebraically against <code className="font-mono">modFAILURE_MODEL_NP.vb:2138-2140</code>), so we do <strong>not</strong> attempt to derive per-section SCI from prior CDF; existing-PCC degradation is captured exclusively via the reduced R (left).
              </p>
            </div>
          </div>

          <p className="text-[11px] text-outline mt-3 italic">
            Both inputs are conservative-side defaults necessitated by the absence of project-specific cores or FWD data. Per-section refinement (especially for the borderline sections) would benefit from destructive flexural-beam testing per ASTM C78.
          </p>
        </div>

        {/* Three Failure Models */}
        {[
          {
            title: 'AC Fatigue (RDEC)',
            color: 'primary',
            eq: 'Nf = 0.4801 · PV^(−0.90074)\nPV = 44.422 · ε^5.14 · (E·0.0069)^2.993 · Vᵣ^1.85 · Gp^(−0.4063)',
            desc: 'RDEC fatigue model from modCDF.vb:289-318. Horizontal tensile strain ε_h at AC bottom from LEAF. Vᵣ = AirVoids/(AirVoids+AsphaltVol), Gp = (PNMS−PPCS)/P200. Uses FAARFIELD defaults (FlexMod=600,000 psi, AV=3.5%, AsphaltVol=12%, PNMS=95, PPCS=58, P200=4.5).',
          },
          {
            title: 'Subgrade Rutting',
            color: 'secondary',
            eq: 'Nf = 10,000 · (A / εᵥ)^B\nA = 0.000247 + 0.000245·log₁₀(E_sub)\nB = 0.0658·E_sub^0.559',
            desc: 'Standard FAA strain criterion from modCDF.vb:327-330. Vertical strain ε_v at top of subgrade from LEAF. Straight-line and Bleasdale alternative branches also implemented but not invoked for this study.',
          },
          {
            title: 'PCC Fatigue (2014)',
            color: 'tertiary',
            eq: 'σ_eff = max(σ_FEM, σ_LEAF · 0.95)\nDesFactor = R / σ_eff\nAA = DesFactor − [sci_f·(A·D−B·C) + FSlope·B·C] / DEN\nBB = (FSlope·B·D) / DEN\nNf = 10^min(10, AA/BB)',
            desc: 'LeafCDFRigid_2014 from modFAILURE_MODEL_NP.vb:1932-2148. σ_FEM from AMClassLib → FAASR3D 3D rigid FEM (8-node hex, 8 GPs/elem); σ_LEAF from LEAFClassLib axisymmetric layered-elastic. ParamA, ParamC depend on subgrade E (table); B = D = 0.16. Exponent capped at 10 (HMA-on-rigid).',
          },
        ].map((m, i) => (
          <div key={i} className="col-span-4 bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">{m.title}</p>
            <pre className="font-mono text-[11px] font-bold text-on-surface bg-surface-low rounded-lg p-3 mb-2 whitespace-pre-wrap">{m.eq}</pre>
            <p className="text-xs text-outline">{m.desc}</p>
          </div>
        ))}

        {/* Coverage-to-Pass / 41-offset sweep */}
        <div className="col-span-12 bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary">timeline</span>
            <p className="text-sm font-bold">Coverage-to-Pass (C/P) and the 41-Offset Lateral Sweep</p>
          </div>
          <p className="text-xs text-outline">
            For each aircraft the per-pass <strong>coverage fraction C/P(ω)</strong> is the integral of the Gaussian wander distribution (σ = 30.435″ for rigid pavements per FAA standard) over the wheel-print intervals at lateral offset ω. The CDF is then summed across the FAA-standard 41 offsets (0–400″ at 10″ increments) and across aircraft, with the section CDF<sub>max</sub> = max over ω of Σ<sub>k</sub> [DesignDeps<sub>k</sub> · C/P<sub>k</sub>(ω) / Nf<sub>k</sub>]. Implemented in <code className="font-mono">FullAnalysisWrapper.vb:300-414</code> (CoverageToPassFull) and <code className="font-mono">:766-789</code> (offset/aircraft loop), with <code className="font-mono">GaussArea</code> using FAARFIELD's 4-point Euler–McLaurin quadrature.
          </p>
        </div>

        {/* Engine note */}
        <div className="col-span-12 bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)] border-l-4 border-adequate">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-adequate">verified</span>
            <p className="text-sm font-bold">Native FAARFIELD desktop-parity engine</p>
          </div>
          <p className="text-xs text-outline">
            Stress calculations use the actual FAARFIELD 2.1.1 DLLs: <code className="font-mono">LEAFClassLib.dll</code> for layered-elastic stress (the same engine FAARFIELD desktop calls when you click "Analysis → Life") and <code className="font-mono">AMClassLib.dll</code> wrapping <code className="font-mono">FEMClassLib</code>'s <code className="font-mono">FAASR3D</code> — a managed-code reimplementation of LLNL's NIKE3D — for the 3D rigid-FEM PCC slab stress (8-node hex elements, 2×2×2 Gauss integration). The fatigue equations are line-by-line ports of <code className="font-mono">LeafCDFRigid_2014</code> (PCC), the RDEC model (AC), and the standard rutting model (subgrade). The 3D FEM stress export is validated against FAARFIELD desktop's printout file: <strong>4,580 / 4,580 brick elements within 0.1% of the desktop's per-Gauss-point σ peak</strong> on a B738 standard mesh. Aircraft wheel coordinates pulled directly from FAARFIELD's XML library via tier-matched proxies (160 unique aircraft in the project's traffic mix, all tier 1–2 matches, no simplified gear templates).
          </p>
        </div>

        {/* Data Sources */}
        <div className="col-span-12 bg-surface-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">Data Sources</p>
          <div className="grid grid-cols-5 gap-4 text-xs">
            {[
              { name: 'FAA ArcGIS', type: '🟢 Live', desc: 'Airport locations + runways' },
              { name: 'NRCS SDA', type: '🟢 Live', desc: 'Soil profile by lat/lon → CBR → E_sub' },
              { name: 'FAA TAF', type: '🔵 FY2025', desc: '3,319 airports (1990–2055)' },
              { name: 'FAA ACD', type: '🔵 v2024', desc: '388 aircraft characteristics' },
              { name: 'Course Data', type: '🔵 2014–2021', desc: '6 airports, aircraft-level traffic' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="font-bold text-on-surface">{s.name}</p>
                <p className="text-[10px]">{s.type}</p>
                <p className="text-outline mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
