# KMQJ 8662 — Desktop FAARFIELD 2.1.1 Cross-Check

**Goal.** Verify that our native backend's CDF result for KMQJ Section 8662 (CDF<sub>max</sub> = **18.13**, controlling = PCC Fatigue, peak at lateral offset ω* = 90″) matches what FAARFIELD 2.1.1 desktop computes for the identical inputs. This section is the most diagnostic of the 13 because it just **flipped from OVER (CDF = 0.60) to UNDER (CDF = 18.13)** when the methodology was changed from R = 650 psi / variable SCI to R = 360 psi / SCI = 80 per FAA AC 150/5320-6F. If the desktop reproduces ≈ 18 (within ~10–20%), the methodology change is verified end-to-end.

## Why this section is the right cross-check target

| Reason | Detail |
|---|---|
| **Just flipped verdict** | Prior batch (R = 650, SCI = 100) returned CDF = 0.60 (OVER). New batch (R = 360, SCI = 80) returns CDF = 18.13 (UNDER). Verifies the MOR-rule sensitivity is real, not a backend artifact. |
| **Tractable structure** | Three layers (AC + PCC + Stabilized Base) — easy to enter manually in desktop. |
| **Tractable traffic** | Top 5 aircraft account for 95.4% of CDF (GLF5, GLF4, GLF6, GLEX, B738), top 10 covers 98%. Cross-check can be done with a 10-aircraft mix instead of all 96. |
| **Common pavement type** | 8″ PCC on stabilized base is a standard taxiway section — desktop's library matches well. |
| **Identical sister sections** | KMQJ 8640, 8780, 8881 share structure & traffic; cross-check on 8662 validates all four. |

## Section specification (enter exactly into FAARFIELD desktop)

| Parameter | Value | FAARFIELD desktop field |
|---|---|---|
| **Design type** | **Flex on Rigid** (HMA overlay on existing rigid PCC) | Section → New Section → Design Type |
| **Design life** | 20 years | Design tab |
| **Annual growth rate** | **+0.5 %/yr** (linear, FAARFIELD default) | Aircraft tab → Growth |
| **PCC flexural strength R** | **360 psi** | Structure tab → P-501 PCC → Flexural Strength |
| **Slab Condition Index SCI** | **80** | Structure tab → Existing PCC → SCI |

### Layer structure (top → bottom)

| Layer | Material | h (in) | E (psi) | ν |
|---|---|---|---|---|
| 1 | P-401 HMA Overlay | 3.5 | 200,000 | 0.35 |
| 2 | P-501 PCC (existing, MOR = 360 psi) | 8.0 | 4,000,000 | 0.15 |
| 3 | P-304 Stabilized Aggregate Base (or closest local equivalent) | 6.0 | 500,000 | 0.20 |
| 4 | Subgrade (Silty Clay, AASHTO A-7-6, CBR = 4) | ∞ | 6,000 | 0.40 |

> **Note:** The Excel data only labels layer 3 as "Stabilized Base" — desktop default for P-304 (Cement-Treated Aggregate Base) is E = 500,000 psi which is reasonable. If the desktop run uses P-301 (Soil-Cement Base, E = 250,000 psi) instead, expect a small change in C/P (slightly higher stress at PCC bottom → CDF up by maybe 10-20%).

### Aircraft mix to enter (top 10 by native-engine CDF contribution — 98% of total)

| Rank | ICAO | MTOW (lb) | Gear | Annual departures (avg 2014–2021) | Native-engine CDF contribution |
|---|---|---|---|---|---|
| 1 | **GLF5** | 88,846 | D | 3.71 | 7.903 |
| 2 | **GLF4** | 73,200 | D | 13.25 | 4.314 |
| 3 | **GLF6** | 99,600 | D | 2.00 | 2.140 |
| 4 | **GLEX** | 95,901 | D | 2.25 | 1.511 |
| 5 | **B738** | 174,200 | D | 1.00 | 1.443 |
| 6 | F900 | 45,503 | D | 20.88 | (next ~3% of CDF combined) |
| 7 | CL60 | 48,200 | D | 29.12 |  |
| 8 | CL35 | 40,600 | D | 9.33 |  |
| 9 | FA7X | 70,000 | D | 7.60 |  |
| 10 | CRJ2 | 53,000 | D | 2.33 |  |

(For an exact match, enter all 96 aircraft from the [`Traffic378` sheet](../AO_CEE598_FAARFIELD.xlsx) of the project workbook with `MTOW ≥ 6000 lb`. The top-10 cross-check should land within 5% of the native-engine CDF.)

## Native backend result (target to reproduce)

```
Engine:           FAARFIELD_desktop_parity + FEM3D (LEAFClassLib + AMClassLib via FAASR3D)
Inputs:           R = 360 psi, SCI = 80, life = 20 yr, growth = +0.5 %/yr, useFem3d = true

CDF_AC          = 7.468e-09          (RDEC, ε_h at AC bottom from LEAF)
CDF_Subgrade    = 9.950e-10          (standard rutting, ε_v at subgrade top from LEAF)
CDF_PCC         = 1.813e+01          (LeafCDFRigid_2014, σ_eff = max(σ_FEM, σ_LEAF·0.95))
CDF_max         = 1.813e+01          ← controlling
Controlling     = PCC Fatigue
Control offset  = ω* = 90″ from runway centerline
Verdict         = UNDER-DESIGNED
Predicted life  = 20 / 18.13 ≈ 1.10 yr until first crack (vs 20-yr target)
```

### Per-aircraft CDF profile (top contributors)

| ICAO | Annual deps | Design deps | C/P at ω* | σ_LEAF | σ_FEM | σ_eff (psi) | CDF |
|---|---|---|---|---|---|---|---|
| GLF5 | 3.71 | 78 | (varies) | (varies) | (varies) | ~330 | 7.90 |
| GLF4 | 13.25 | 278 | (varies) | (varies) | (varies) | ~310 | 4.31 |
| GLF6 | 2.00 | 42 | (varies) | (varies) | (varies) | ~340 | 2.14 |
| GLEX | 2.25 | 47 | (varies) | (varies) | (varies) | ~330 | 1.51 |
| B738 | 1.00 | 21 | (varies) | (varies) | (varies) | ~280 | 1.44 |

**Design-deps formula** (matches `modFAILURE_MODEL_NP.vb:840`):
`designDeps = (1 + Life · growth · 0.5) · AnnualDeps · Life = 1.05 × AnnualDeps × 20 = 21 × AnnualDeps`

So for GLF4 (highest annual deps): designDeps = 21 × 13.25 = 278 (matches desktop).

## Step-by-step: entering this in FAARFIELD 2.1.1 desktop

1. **Launch FAARFIELD 2.1.1** (`C:\Program Files (x86)\FAARFIELD\FF2.exe`).
2. **File → New Job** — name it `KMQJ_8662_crosscheck`.
3. **Section → Add Section**:
   - Name: `KMQJ_8662`
   - Design Type: **HMA Overlay on Existing Rigid (Flex on Rigid)**
   - Design Life: **20 years**
4. **Structure tab** — build top-down:
   1. Add layer **P-401 HMA Overlay**, thickness = 3.5″, E = 200000 psi, ν = 0.35
   2. Add layer **P-501 PCC**, thickness = 8.0″, E = 4000000 psi, ν = 0.15, **flexural strength = 360 psi** (override default), **SCI = 80**
   3. Add layer **P-304 Stabilized Base** (or P-306 Lean Concrete Base), thickness = 6.0″, E = 500000 psi, ν = 0.20
   4. Subgrade: E = 6000 psi, ν = 0.40 (or set CBR = 4, FAARFIELD will compute E = 1500 × 4 = 6000 psi)
5. **Aircraft tab**:
   - Set Annual Growth Rate = 0.5 %/yr
   - Add the 10 aircraft from the table above with the listed Annual Departures
   - For each: confirm MTOW and gear configuration match (FAARFIELD's library should auto-populate gear coords)
6. **Analysis → Life** (this triggers the CDF calculation):
   - Wait for FAASR3D to converge (a few minutes — desktop runs the same FEM as our backend)
   - Read the reported CDF in the Section panel

## Acceptance criteria

| Outcome | Action |
|---|---|
| Desktop CDF<sub>max</sub> ≈ 14–22 (within ±25% of 18.13) | ✅ Methodology verified; UNDER verdict is real. Update report with desktop confirmation. |
| Desktop CDF<sub>max</sub> ≈ 0.5–1.5 (close to old 0.60) | ⚠️ MOR override may not have taken effect in desktop — re-check the flexural-strength field. |
| Desktop CDF<sub>max</sub> < 0.1 | ❌ Major mismatch — investigate (probably SCI default differs, or the existing-PCC overlay path needs a different design type). |
| Desktop reports controlling = PCC Fatigue with peak around ω = 90″ | ✅ Failure mode and offset agree |
| Desktop's per-aircraft CDF table — top 5 are GLF5, GLF4, GLF6, GLEX, B738 in some order with summed CDF ≈ 17 | ✅ Per-aircraft contributions agree |

## Known sources of small discrepancies

- **Stabilized base material code** — desktop's library may have slightly different default E for P-304 vs P-306 vs custom. Try the closest local match.
- **Aircraft library completeness** — if any of the 10 aircraft is named differently in desktop's library (e.g., GLF5 = "Gulfstream V"), enter manually with the listed MTOW and gear.
- **Top-10 truncation** — entering only the top 10 of 96 will leave out ~2% of CDF. To recover the full result, enter all 96 from `Traffic378` sheet (about 30 minutes of data entry, or import via desktop's Aircraft → Import CSV if available).
- **3D FEM cache state** — desktop may show "running FEM" for several minutes; this is normal and matches our backend behavior.

## After running the cross-check

Update the entry in `docs/decisions.md` with:
- Desktop CDF<sub>max</sub> achieved
- Whether it falls within the acceptance window
- Any discrepancies and their explanations

If the desktop result is in the acceptance window, the **4 OVER / 9 UNDER** project verdict is independently verified, and the FAA AC 150/5320-6F MOR methodology is sound for the report. If it's outside the window, this section needs further investigation before publishing the verdict.

---

_Generated 2026-04-22 alongside the R = 360 psi / SCI = 80 batch run. Sister-section cross-check would be redundant: KMQJ 8640 / 8780 / 8881 share structure and traffic with 8662, so all four have CDF = 18.13._
