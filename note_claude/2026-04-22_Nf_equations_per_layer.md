# Nf (Cycles to Failure) Equations Used in CEE 598 Final Project

**Date:** 2026-04-22
**Source code:** `c:/temp/aeropave/faarfield-api/FullAnalysisWrapper.vb`
**Reference:** FAARFIELD 2.1.1 source (`modCDF.vb`, `modFAILURE_MODEL_NP.vb`, `modStrDesign13.vb`)
**Engine:** Native VB.NET backend wrapping `LEAFClassLib.dll` (LEAF stress) + `AMClassLib.dll` (rigid FEM)

There are **three failure modes**, each computed at a **specific depth** in the pavement structure with a **specific response variable** from the LEAF (and optionally FEM) stress field. CDF for each mode is `Σ (designDeps_i · passToCoverage_i / Nf_i)` summed over all aircraft. Section CDF is the **max** of the three modes at the worst lateral offset (41-point sweep, 0–400" from centerline).

---

## 1. AC Fatigue — RDEC Model (FAARFIELD 2.1.1 default)

**Layer:** Asphalt Concrete (AC) overlay
**Depth:** Bottom of AC layer → `EvalDepth = h_AC`, `EvalLayer = 1`
**Response variable:** Horizontal tensile strain `ε_h = max(|StrainX|, |StrainY|)` from LEAF

```
PV = 44.422 · ε_h^5.14 · (E_AC · 0.0068948)^2.993 · V_r^1.85 · G_p^(−0.4063)
Nf = 0.4801 · PV^(−0.90074)
```

Where:
- `V_r = AirVoids / (AirVoids + AsphaltVol)` — void ratio
- `G_p = (PNMS − PPCS) / P200` — gradation parameter
- Defaults (used unless overridden in Design Tool's "AC Mix Design" panel):
  - `FlexMod` = 600,000 psi
  - `AirVoids` = 3.5 %
  - `AsphaltVol` = 12 %
  - `PNMS` = 95 %, `PPCS` = 58 %, `P200` = 4.5 %

**Code:** [FullAnalysisWrapper.vb:148-175](c:/temp/aeropave/faarfield-api/FullAnalysisWrapper.vb#L148)
**Source ref:** `modCDF.vb:289-318`

A classical model `logNf = 2.68 − 5.0·log(ε_h) − 2.665·log(E_AC)` is implemented as a fallback at line 178 but **not currently called** by the CDF loop.

---

## 2. PCC Fatigue — FAARFIELD 2014 Model (`LeafCDFRigid_2014`)

**Layer:** Portland Cement Concrete (PCC) slab — design-controlling for 12 of 13 project sections
**Depth:** Bottom of PCC layer → `EvalDepth = h_AC + h_PCC`, `EvalLayer = 2`
**Response variable:** Horizontal flexural stress at PCC bottom

```
σ_LEAF = max(|StressX|, |StressY|)        from LEAF response
σ_FEM  = pccBottomStress                   from AMClassLib rigid FEM (if useFem3d=true)
σ_eff  = max(σ_FEM, σ_LEAF · 0.95)         FAARFIELD FlexOnRigid rule
```

Then:

```
DesFactor = R / σ_eff                      R = flexural strength (default 700 psi)
sci_f     = 1 − SCI/100                    SCI = Slab Condition Index (1–100)
DEN       = sci_f · (D − B) + FSlope · B
AA        = DesFactor − [sci_f · (A·D − B·C) + FSlope · B · C] / DEN
BB        = (FSlope · B · D) / DEN
exponent  = AA / BB                        capped at 10 for HMA-over-rigid
Nf        = 10^exponent
```

**Constants are subgrade-modulus dependent** (`E_sub` in psi):

| E_sub range | ParamA | ParamB | ParamC | ParamD |
|---|---|---|---|---|
| ≤ 4,500 | 0.76 | 0.16 | 0.857 | 0.16 |
| 4,500 ≤ E ≤ 45,000 | 0.76 + (E−4500)·2.54e−5 | 0.16 | 0.857 + (E−4500)·2.31e−5 | 0.16 |
| ≥ 45,000 | up to 1.027 | 0.16 | 1.794 + (E−45000)·2.54e−5 | 0.16 |

`FSlope` is derived from the structural-equivalent thickness of layers above the PCC (aggregate factor 0.5; stiffer materials get up to 1.0); `FSlope` is also adjusted by the subgrade modulus (`A`, `B` polynomial in `E_sg/1000`).

**Code:** [FullAnalysisWrapper.vb:109-142](c:/temp/aeropave/faarfield-api/FullAnalysisWrapper.vb#L109)
**Source ref:** `modFAILURE_MODEL_NP.vb:1932-2148` (function `LeafCDFRigid_2014`)
**FSlope calc:** [FullAnalysisWrapper.vb:52-81](c:/temp/aeropave/faarfield-api/FullAnalysisWrapper.vb#L52)

**Two real bugs were caught and fixed during this project:**
1. Exponent cap of 10 was missing → produced absurd Nf for stiff sections.
2. The earlier wrapper had ported the *dead* legacy 2013 fatigue function (`modStrDesign13.vb:36`) instead of the active 2014 model. They diverge by 10–1000× at SR > ~0.4, but happen to agree at the Nf=10^10 floor (where most low-stress sections sit).

---

## 3. Subgrade Rutting — Standard Model (Bleasdale / StraightLine variants implemented)

**Layer:** Natural subgrade (silt loam, clay, sand, etc. — set per airport from NRCS data)
**Depth:** Top of subgrade → `EvalDepth = h_AC + h_PCC + h_base + … (sum of all bound + unbound layers)`, `EvalLayer = N` (last layer)
**Response variable:** Vertical compressive strain `ε_v = |StrainZ|` from LEAF

**Standard model** (default for the 13 project sections):

```
A  = 0.000247 + 0.000245 · log10(E_sg)
B  = 0.0658 · E_sg^0.559
Nf = 10,000 · (A / ε_v)^B
```

**Straight-line override** (high-departure regime — `useStraightLine=true`):

```
ε_break = piecewise crossover between standard and high-strain branches
If ε_v > ε_break:    Nf = (0.004 / ε_v)^8.1     (steep slope)
Else:                Nf = (A_orig / ε_v)^B_orig (standard at E_sg = 15,000 pinned)
```

**Bleasdale override** (rare — `useBleasdale=true`):

```
If ε_v ≤ 0.001765:   Nf = 10^[(−0.164 + 185.2·ε_v)^(−1/1.65)]
Else:                Nf = (0.00414 / ε_v)^8.1
```

**Code:** [FullAnalysisWrapper.vb:191-235](c:/temp/aeropave/faarfield-api/FullAnalysisWrapper.vb#L191)
**Source ref:** `modCDF.vb:327-330`

---

## Summary table — depth and response per mode

| Layer / mode | EvalLayer | EvalDepth (in) | Response variable | Nf equation |
|---|---|---|---|---|
| **AC fatigue (RDEC)** | 1 | `h_AC` | ε_h = max(|StrainX|,|StrainY|) | `0.4801 · PV^(−0.90074)` |
| **PCC fatigue (2014)** | 2 | `h_AC + h_PCC` | σ_eff = max(σ_FEM, σ_LEAF · 0.95) | `10^(AA/BB)`, capped at 10^10 |
| **Subgrade rutting** | last | total pavement depth | ε_v = |StrainZ| | `10,000 · (A/ε_v)^B` |

For the 6 project airports, the **PCC fatigue mode is the controlling failure mode for 12 of 13 sections** (only one taxiway is subgrade-controlled). This is consistent with FAARFIELD desktop's behavior on HMA-overlay-on-rigid sections.

---

## Stress augmentation: LEAF vs. FEM

For the **PCC stress only**, the backend implements the FAARFIELD desktop's FlexOnRigid rule:

```
σ_eff = max(σ_FEM, σ_LEAF × 0.95)
```

- `σ_LEAF` = horizontal stress at PCC bottom from `LEAFClassLib.ComputeResponse` (always run, fast)
- `σ_FEM` = `pccBottomStress` from `AMClassLib.clsAM.ComputeResponse` (the managed rigid FEM solver — same one FAARFIELD desktop calls for overlay design)
- Only enabled when `useFem3d=true` (default ON for the batch and Design Tool, OFF for fast pre-overlay damage estimation)

The 13-section batch run (2026-04-22, 2.5 h runtime) used `useFem3d=True` for the main 20-yr CDF and produced the final **10 OVER / 3 UNDER** verdict that the website displays.

**Validation:** The native FEM stress export was cross-checked against FAARFIELD 2.1.1 desktop's own printout file: 4580/4580 elements within 0.1 % of peak (Phase D PASS — see `Crosscheck FAARFIELD Desktop/REPORT.md`).

---

## Where the project report displays this

- **Website Methodology component** ([c:/temp/aeropave/src/components/Methodology.jsx](c:/temp/aeropave/src/components/Methodology.jsx)) — three side-by-side cards titled "AC Fatigue (RDEC)", "Subgrade Rutting", "PCC Fatigue (2014)" with the exact same equations as above.
- **Design Tool — Top Aircraft by CDF Contribution table** ([c:/temp/aeropave/src/tabs/DesignTool.jsx:920-947](c:/temp/aeropave/src/tabs/DesignTool.jsx#L920)) — shows per-aircraft `PCC Stress (psi)` and `CDF` so each Nf computation is traceable.
- **CDF by Failure Mode bar chart** — shows the three CDFs (AC, Subgrade, PCC) side-by-side for the active section.
- **CDF vs Lateral Offset profile plot** ([c:/temp/aeropave/src/components/CdfProfileChart.jsx](c:/temp/aeropave/src/components/CdfProfileChart.jsx)) — shows the 41-point lateral sweep that produces the section CDF_max.

---

## 2026-04-22 update — JS Burmister/Westergaard fallback REMOVED

Per project rule "everything must follow desktop FAARFIELD," the in-browser JavaScript CDF engine (`analyzeSection` + `odemarkSubgradeStrain` + `westergaardPccStress` + `burmisterAcStrain` + classical Nf models) was deleted from `c:/temp/aeropave/src/engine/faarfieldEngine.js`. The Design Tool now refuses to compute CDF when the native backend is offline — it shows a "FAARFIELD backend offline" panel instead of an approximate fallback number.

Files changed (2026-04-22):
- `c:/temp/aeropave/src/engine/faarfieldEngine.js` — gutted, kept only `classifyAASHTO`, `cbrToModulus`, `modulusToK` (pure soil/unit utilities, not engine code).
- `c:/temp/aeropave/src/tabs/DesignTool.jsx` — removed `analyzeSection` import and `modifiedResult` useMemo; CDF, bar chart, ChangesSummary impact, stress-aircraft selector, and per-aircraft table all now read exclusively from `nativeCdf` (the FAARFIELD backend response). When `analysisAvailable=false`, a "Backend offline" warning is rendered in place of the verdict card.
- `c:/temp/aeropave/src/components/AnalysisPanel.jsx` — orphan file (not rendered anywhere) that imported the deleted JS engine. Deleted.

After this change there is **only one path** in the website that produces CDF numbers: a POST to `localhost:5100/api/analysis/cdf`, which routes through `FullAnalysisWrapper.vb` and the three Nf equations described above.
