# KCIU (Chippewa County International, MI) — CDF Results

**Engine:** FAARFIELD desktop parity — LEAFClassLib (layered elastic) + AMClassLib via FAASR3D (3D rigid FEM).  
**Material inputs:** R = 360 psi (FAA AC 150/5320-6F lower bound, 8% × 4500 psi assumed f'c for >20-yr aged airport PCC) · SCI = 80.0 (FAARFIELD design default).  
**Run parameters:** life = 20 yr · growth = -0.10%/yr · 41-offset lateral sweep, σ_wander = 30.435".  
**Subgrade:** Fine Sand (AASHTO A-3, NRCS), CBR=20, E=30,000 psi.  
**Verdict:** 0 OVER / 1 UNDER across 1 section(s).

## Verdict Summary

| Section | Use | Layers | CDF (max) | Controlling | Verdict |
|---|---|---|---|---|---|
| 21222 | Runway | 2.5" AC + 24" PCC | 1.1393e+01 | PCC Fatigue | **UNDER** |

## Per-Section Aircraft CDF Contributions (Top 5)

### Section 21222 (Runway) — 2.5" AC + 24" PCC — UNDER

CDF: AC = 1.284e-10 · Subgrade = 2.332e-24 · PCC = 1.139e+01 — **Max = 1.139e+01** (PCC Fatigue)

Controlling lateral offset ω* = 190″ from runway centerline.

| # | Aircraft | MTOW (lb) | Gear | Aircraft CDF | Wheel-coord source |
|---|---|---|---|---|---|
| 1 | `B763` | 412,000 | 2D | 3.785e+00 | xml |
| 2 | `A332` | 533,519 | 2D | 1.660e+00 | xml |
| 3 | `B77W` | 775,000 | 3D | 1.578e+00 | xml |
| 4 | `B77L` | 775,000 | 3D | 1.575e+00 | xml |
| 5 | `B772` | 766,000 | 3D | 1.534e+00 | xml |


_Generated 2026-04-22 19:09 from `results/cdf_results.json`._
