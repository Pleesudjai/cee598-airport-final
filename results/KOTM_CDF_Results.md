# KOTM (Ottumwa Regional, IA) — CDF Results

**Engine:** FAARFIELD desktop parity — LEAFClassLib (layered elastic) + AMClassLib via FAASR3D (3D rigid FEM).  
**Material inputs:** R = 360 psi (FAA AC 150/5320-6F lower bound, 8% × 4500 psi assumed f'c for >20-yr aged airport PCC) · SCI = 80.0 (FAARFIELD design default).  
**Run parameters:** life = 20 yr · growth = -2.20%/yr · 41-offset lateral sweep, σ_wander = 30.435".  
**Subgrade:** Silty Clay Loam (AASHTO A-7-6, NRCS), CBR=4, E=6,000 psi.  
**Verdict:** 3 OVER / 0 UNDER across 3 section(s).

## Verdict Summary

| Section | Use | Layers | CDF (max) | Controlling | Verdict |
|---|---|---|---|---|---|
| 27450 | Runway | 3" AC + 9" PCC | 4.6621e-01 | PCC Fatigue | **OVER** |
| 27641 | Runway | 3" AC + 8" PCC | 9.6163e-01 | PCC Fatigue | **OVER** |
| 28171 | Taxiway | 2.5" AC + 8" PCC | 9.4087e-01 | PCC Fatigue | **OVER** |

## Per-Section Aircraft CDF Contributions (Top 5)

### Section 27450 (Runway) — 3" AC + 9" PCC — OVER

CDF: AC = 3.443e-10 · Subgrade = 2.462e-11 · PCC = 4.662e-01 — **Max = 4.662e-01** (PCC Fatigue)

Controlling lateral offset ω* = 140″ from runway centerline.

| # | Aircraft | MTOW (lb) | Gear | Aircraft CDF | Wheel-coord source |
|---|---|---|---|---|---|
| 1 | `R135` | 321,874 | 2D | 4.662e-01 | xml |
| 2 | `GALX` | 33,289 | D | 3.248e-07 | proxy_override (curated proxy_override → C650) |
| 3 | `CL35` | 40,600 | D | 4.725e-08 | xml |
| 4 | `CL30` | 37,478 | D | 2.582e-08 | xml |
| 5 | `F2TH` | 34,833 | D | 6.611e-09 | xml |

### Section 27641 (Runway) — 3" AC + 8" PCC — OVER

CDF: AC = 4.244e-10 · Subgrade = 2.356e-11 · PCC = 9.616e-01 — **Max = 9.616e-01** (PCC Fatigue)

Controlling lateral offset ω* = 140″ from runway centerline.

| # | Aircraft | MTOW (lb) | Gear | Aircraft CDF | Wheel-coord source |
|---|---|---|---|---|---|
| 1 | `R135` | 321,874 | 2D | 9.616e-01 | xml |
| 2 | `GALX` | 33,289 | D | 2.200e-05 | proxy_override (curated proxy_override → C650) |
| 3 | `CL35` | 40,600 | D | 2.130e-06 | xml |
| 4 | `CL30` | 37,478 | D | 1.577e-06 | xml |
| 5 | `F2TH` | 34,833 | D | 6.086e-07 | xml |

### Section 28171 (Taxiway) — 2.5" AC + 8" PCC — OVER

CDF: AC = 4.594e-10 · Subgrade = 2.303e-11 · PCC = 9.409e-01 — **Max = 9.409e-01** (PCC Fatigue)

Controlling lateral offset ω* = 140″ from runway centerline.

| # | Aircraft | MTOW (lb) | Gear | Aircraft CDF | Wheel-coord source |
|---|---|---|---|---|---|
| 1 | `R135` | 321,874 | 2D | 9.408e-01 | xml |
| 2 | `GALX` | 33,289 | D | 3.876e-05 | proxy_override (curated proxy_override → C650) |
| 3 | `CL35` | 40,600 | D | 3.517e-06 | xml |
| 4 | `CL30` | 37,478 | D | 2.742e-06 | xml |
| 5 | `F2TH` | 34,833 | D | 1.128e-06 | xml |


_Generated 2026-04-22 19:09 from `results/cdf_results.json`._
