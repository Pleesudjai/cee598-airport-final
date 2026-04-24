# KLHX 6627 — Desktop FAARFIELD 2.1.1 Cross-Check

**Goal:** Verify our native backend's CDF (`6.7258e-10`) against what FAARFIELD 2.1.1 Desktop computes for the identical inputs.

## Why this section

- Simplest pavement in the study (just 2 structural layers: AC + PCC).
- The old Python engine and JS engine both claimed CDF ≈ **10.1** (UNDER). Parity test ([results/parity_test.txt](results/parity_test.txt)) confirmed Python ≈ JS within 2.4%.
- Native backend now says CDF = **6.7e-10** (OVER). That's a **10¹⁰ gap** we need to adjudicate.
- Top 5 aircraft account for essentially 100% of the CDF, so cross-check is tractable without entering all 37.

## Section specification

| Parameter | Value |
|---|---|
| **Design type** | Flex on Rigid (HMA Overlay over Existing PCC) |
| **Structure** | 2.5" AC overlay + 6.0" PCC + subgrade |
| AC overlay (P-401) | h = 2.5", E = 200,000 psi, ν = 0.35 |
| PCC (P-501) | h = 6.0", E = 4,000,000 psi, ν = 0.15 |
| Subgrade | E = 10,500 psi (CBR = 7), ν = 0.40 |
| **Design life** | 20 years |
| **PCC flexural strength (R)** | **650 psi** (FAARFIELD default — important!) |
| **SCI** | **80** (FAARFIELD default for existing PCC under HMA overlay) |
| **Traffic growth** | 3.2%/yr |

## Native backend result (what we're comparing against)

```
CDF_AC  = 2.524e-10
CDF_Sub = 1.710e-15
CDF_PCC = 6.726e-10
CDF_Max = 6.726e-10  (PCC Fatigue)  → 1/CDF = Life ≈ 1.49 × 10⁹ years
Verdict: OVER-DESIGNED
Solver:  FAARFIELD_desktop_parity  (LEAF + AMClassLib rigid FEM, no 3D FEM)
```

### Top-5 per-aircraft contributions (100% of CDF)

| # | ICAO | MTOW (lb) | Gear | Annual deps | Design deps | PCC stress (psi) | CDF |
|---|------|-----------|------|-------------|-------------|------------------|-----|
| 1 | **C130** | 155,000 | 2D | 0.625 | 16 | **143.8** | 5.858e-10 |
| 2 | **BE9L** | 10,097 | D | 1.250 | 33 | **132.2** | 8.405e-11 |
| 3 | **CRJ9** | 80,500 | D | 0.125 | 3 | **124.0** | 2.717e-12 |
| 4 | **EA50** | 39,595 | S | 0.875 | 23 | **106.7** | 4.398e-14 |
| 5 | **A10** | 50,044 | S | 0.125 | 3 | **106.0** | 8.887e-15 |

Sum of top 5 ≈ 6.7e-10 ≈ total CDF. The tail (32 more aircraft) is negligible.

### Design-deps formula used by native backend

`designDeps = (1 + Life · growth · 0.5) · AnnualDeps · Life = 1.32 × AnnualDeps × 20 = 26.4 × AnnualDeps`

Matches FAARFIELD's `modFAILURE_MODEL_NP.vb:840`.

## Step-by-step: entering this in FAARFIELD 2.1.1 Desktop

1. **Launch FAARFIELD 2.1.1** (installed from `FAARFIELD_2.1.1_Installation/`).
2. **File → New Job**.
3. **Section → Add Section** with Design Type = **HMA Overlay over Existing Rigid**.
4. **Structure tab** — build from top to bottom:
   - Layer 1: P-401 HMA — thickness **2.5** in, E = **200,000** psi
   - Layer 2: P-501 PCC Surface — thickness **6.0** in, E = **4,000,000** psi, **R (flexural strength) = 650 psi**, **SCI = 80**
   - Subgrade — E = **10,500** psi (or CBR = 7; FAARFIELD auto-converts via E = 1500·CBR)
5. **Aircraft tab** — add at minimum the top 5 aircraft:

   | FAARFIELD library name | ICAO | Gross wt (lb) | Annual departures |
   |---|---|---|---|
   | Hercules C-130 | C130 | 155,000 | **0.625** |
   | King Air 90 (Beech 9L) | BE9L | 10,097 | **1.250** |
   | CRJ 900 | CRJ9 | 80,500 | **0.125** |
   | Eclipse 500 | EA50 | 39,595 | **0.875** |
   | A-10 Thunderbolt | A10 | 50,044 | **0.125** |

   (Annual departures: FAARFIELD accepts decimals. If it rounds/floors, we can instead enter annual × 20 as "total design departures" where the field allows.)

   Growth = **3.2%** / year. Design life = **20** years.

6. **Analysis → Life** (the CDF computation), not "Design".
7. **Read the CDF value** on the results tab. Also note the controlling mode (should be PCC fatigue or AC fatigue).

## What to report back

Copy-paste the desktop FAARFIELD values back here:

```
Desktop CDF (max):        _____________
Desktop CDF (AC):         _____________
Desktop CDF (PCC):        _____________
Desktop CDF (Subgrade):   _____________
Desktop Controlling:      _____________
Desktop Life (years):     _____________
Verdict:                  _____________
```

## Interpretation matrix

| Desktop CDF ≈ | Interpretation | Action |
|---|---|---|
| **6.7e-10** (within ±1 order) | Native backend matches desktop. Python engine was wrong. | Accept the all-13-over-designed result. Document that the old Python engine overestimated by 10¹⁰× because of Westergaard-on-Winkler + hard endurance cutoff. |
| **~10** (matches old Python) | Desktop agrees with Python. Native backend has a bug. | Investigate: LEAF integration, SCI equation sign, fatigue exponent. Likely suspects: `PccFatigueLifeFull` in [FullAnalysisWrapper.vb:89](c:/temp/aeropave/faarfield-api/FullAnalysisWrapper.vb#L89). |
| **Somewhere in between** (say 10⁻³ to 10⁻¹) | Both are partially right. Probably a mix of flexStr / SCI / FEM differences. | Decide which value is closer to desktop and adjust accordingly. |

## Notes on 3D FEM

FAARFIELD 2.1.1 Desktop may enable NIKE3D (3D FEM) by default for rigid overlay designs. Our native backend ran with `useFem3d=false` — LEAF + rigid FEM (AMClassLib) only. If desktop uses 3D FEM, its CDF may be somewhat higher than ours for complex-gear aircraft (the C-130 and CRJ-9 in particular). For apples-to-apples:

- **Option:** disable 3D FEM in desktop if the UI exposes that toggle, or
- **Accept:** desktop CDF being slightly higher than native is expected, but shouldn't be 10¹⁰× higher.
