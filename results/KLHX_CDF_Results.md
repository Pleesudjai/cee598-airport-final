# KLHX (La Junta Municipal, CO) — CDF Results

**Engine:** FAARFIELD desktop parity — LEAFClassLib (layered elastic) + AMClassLib via FAASR3D (3D rigid FEM).  
**Material inputs:** R = 360 psi (FAA AC 150/5320-6F lower bound, 8% × 4500 psi assumed f'c for >20-yr aged airport PCC) · SCI = 80.0 (FAARFIELD design default).  
**Run parameters:** life = 20 yr · growth = +3.20%/yr · 41-offset lateral sweep, σ_wander = 30.435".  
**Subgrade:** Silt Loam (AASHTO A-6, NRCS), CBR=7, E=10,500 psi.  
**Verdict:** 1 OVER / 1 UNDER across 2 section(s).

## Verdict Summary

| Section | Use | Layers | CDF (max) | Controlling | Verdict |
|---|---|---|---|---|---|
| 6627 | Taxiway | 2.5" AC + 6" PCC | 6.6714e+00 | PCC Fatigue | **UNDER** |
| 7347 | Taxiway | 2" AC + 10" PCC | 5.0386e-03 | PCC Fatigue | **OVER** |

## Per-Section Aircraft CDF Contributions (Top 5)

### Section 6627 (Taxiway) — 2.5" AC + 6" PCC — UNDER

CDF: AC = 2.524e-10 · Subgrade = 1.710e-15 · PCC = 6.671e+00 — **Max = 6.671e+00** (PCC Fatigue)

Controlling lateral offset ω* = 80″ from runway centerline.

| # | Aircraft | MTOW (lb) | Gear | Aircraft CDF | Wheel-coord source |
|---|---|---|---|---|---|
| 1 | `C130` | 155,000 | 2D | 5.218e+00 | xml (exact FAARFIELD XML) |
| 2 | `CRJ9` | 80,500 | D | 1.433e+00 | xml |
| 3 | `CL30` | 37,478 | D | 1.170e-02 | xml |
| 4 | `F2TH` | 34,833 | D | 8.334e-03 | xml |
| 5 | `H25B` | 28,000 | D | 7.194e-05 | xml |

### Section 7347 (Taxiway) — 2" AC + 10" PCC — OVER

CDF: AC = 8.115e-11 · Subgrade = 2.007e-15 · PCC = 5.039e-03 — **Max = 5.039e-03** (PCC Fatigue)

Controlling lateral offset ω* = 80″ from runway centerline.

| # | Aircraft | MTOW (lb) | Gear | Aircraft CDF | Wheel-coord source |
|---|---|---|---|---|---|
| 1 | `CRJ9` | 80,500 | D | 4.124e-03 | xml |
| 2 | `C130` | 155,000 | 2D | 9.144e-04 | xml (exact FAARFIELD XML) |
| 3 | `SW4` | 14,500 | D | 2.144e-09 | nearest_proxy (nearest_proxy donor → B350) |
| 4 | `BE20` | 12,500 | D | 1.213e-09 | nearest_proxy (nearest_proxy donor → BE10) |
| 5 | `CL30` | 37,478 | D | 8.854e-10 | xml |


_Generated 2026-04-22 19:09 from `results/cdf_results.json`._
