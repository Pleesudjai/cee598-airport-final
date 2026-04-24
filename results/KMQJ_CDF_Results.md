# KMQJ (Indianapolis Regional, IN) — CDF Results

**Engine:** FAARFIELD desktop parity — LEAFClassLib (layered elastic) + AMClassLib via FAASR3D (3D rigid FEM).  
**Material inputs:** R = 360 psi (FAA AC 150/5320-6F lower bound, 8% × 4500 psi assumed f'c for >20-yr aged airport PCC) · SCI = 80.0 (FAARFIELD design default).  
**Run parameters:** life = 20 yr · growth = +0.50%/yr · 41-offset lateral sweep, σ_wander = 30.435".  
**Subgrade:** Silty Clay (AASHTO A-7-6, NRCS), CBR=4, E=6,000 psi.  
**Verdict:** 0 OVER / 4 UNDER across 4 section(s).

## Verdict Summary

| Section | Use | Layers | CDF (max) | Controlling | Verdict |
|---|---|---|---|---|---|
| 8640 | Taxiway TWA3 | 3.5" AC + 8" PCC + 6" Stab Base | 1.8132e+01 | PCC Fatigue | **UNDER** |
| 8662 | Taxiway TWA2 | 3.5" AC + 8" PCC + 6" Stab Base | 1.8132e+01 | PCC Fatigue | **UNDER** |
| 8780 | Taxiway TWA4 | 3.5" AC + 8" PCC + 6" Stab Base | 1.8132e+01 | PCC Fatigue | **UNDER** |
| 8881 | Taxiway TWA1 | 3.5" AC + 8" PCC + 6" Stab Subbase | 1.8132e+01 | PCC Fatigue | **UNDER** |

## Per-Section Aircraft CDF Contributions (Top 5)

### Section 8640 (Taxiway TWA3) — 3.5" AC + 8" PCC + 6" Stab Base — UNDER

CDF: AC = 7.468e-09 · Subgrade = 9.950e-10 · PCC = 1.813e+01 — **Max = 1.813e+01** (PCC Fatigue)

Controlling lateral offset ω* = 90″ from runway centerline.

| # | Aircraft | MTOW (lb) | Gear | Aircraft CDF | Wheel-coord source |
|---|---|---|---|---|---|
| 1 | `GLF5` | 88,846 | D | 7.903e+00 | xml |
| 2 | `GLF4` | 73,200 | D | 4.314e+00 | xml |
| 3 | `GLF6` | 99,600 | D | 2.140e+00 | xml |
| 4 | `GLEX` | 95,901 | D | 1.511e+00 | xml |
| 5 | `B738` | 174,200 | D | 1.443e+00 | xml |

### Section 8662 (Taxiway TWA2) — 3.5" AC + 8" PCC + 6" Stab Base — UNDER

CDF: AC = 7.468e-09 · Subgrade = 9.950e-10 · PCC = 1.813e+01 — **Max = 1.813e+01** (PCC Fatigue)

Controlling lateral offset ω* = 90″ from runway centerline.

| # | Aircraft | MTOW (lb) | Gear | Aircraft CDF | Wheel-coord source |
|---|---|---|---|---|---|
| 1 | `GLF5` | 88,846 | D | 7.903e+00 | xml |
| 2 | `GLF4` | 73,200 | D | 4.314e+00 | xml |
| 3 | `GLF6` | 99,600 | D | 2.140e+00 | xml |
| 4 | `GLEX` | 95,901 | D | 1.511e+00 | xml |
| 5 | `B738` | 174,200 | D | 1.443e+00 | xml |

### Section 8780 (Taxiway TWA4) — 3.5" AC + 8" PCC + 6" Stab Base — UNDER

CDF: AC = 7.468e-09 · Subgrade = 9.950e-10 · PCC = 1.813e+01 — **Max = 1.813e+01** (PCC Fatigue)

Controlling lateral offset ω* = 90″ from runway centerline.

| # | Aircraft | MTOW (lb) | Gear | Aircraft CDF | Wheel-coord source |
|---|---|---|---|---|---|
| 1 | `GLF5` | 88,846 | D | 7.903e+00 | xml |
| 2 | `GLF4` | 73,200 | D | 4.314e+00 | xml |
| 3 | `GLF6` | 99,600 | D | 2.140e+00 | xml |
| 4 | `GLEX` | 95,901 | D | 1.511e+00 | xml |
| 5 | `B738` | 174,200 | D | 1.443e+00 | xml |

### Section 8881 (Taxiway TWA1) — 3.5" AC + 8" PCC + 6" Stab Subbase — UNDER

CDF: AC = 7.468e-09 · Subgrade = 9.950e-10 · PCC = 1.813e+01 — **Max = 1.813e+01** (PCC Fatigue)

Controlling lateral offset ω* = 90″ from runway centerline.

| # | Aircraft | MTOW (lb) | Gear | Aircraft CDF | Wheel-coord source |
|---|---|---|---|---|---|
| 1 | `GLF5` | 88,846 | D | 7.903e+00 | xml |
| 2 | `GLF4` | 73,200 | D | 4.314e+00 | xml |
| 3 | `GLF6` | 99,600 | D | 2.140e+00 | xml |
| 4 | `GLEX` | 95,901 | D | 1.511e+00 | xml |
| 5 | `B738` | 174,200 | D | 1.443e+00 | xml |


_Generated 2026-04-22 19:09 from `results/cdf_results.json`._
