# KPUB (Pueblo Memorial, CO) — CDF Results

**Engine:** FAARFIELD desktop parity — LEAFClassLib (layered elastic) + AMClassLib via FAASR3D (3D rigid FEM).  
**Material inputs:** R = 360 psi (FAA AC 150/5320-6F lower bound, 8% × 4500 psi assumed f'c for >20-yr aged airport PCC) · SCI = 80.0 (FAARFIELD design default).  
**Run parameters:** life = 20 yr · growth = -0.70%/yr · 41-offset lateral sweep, σ_wander = 30.435".  
**Subgrade:** Bedrock/Shale (NRCS), CBR=12, E=18,000 psi.  
**Verdict:** 0 OVER / 1 UNDER across 1 section(s).

## Verdict Summary

| Section | Use | Layers | CDF (max) | Controlling | Verdict |
|---|---|---|---|---|---|
| 6948 | Taxiway | 2.5" AC + 7" PCC + 6" P-154 | 9.6509e+02 | PCC Fatigue | **UNDER** |

## Per-Section Aircraft CDF Contributions (Top 5)

### Section 6948 (Taxiway) — 2.5" AC + 7" PCC + 6" P-154 — UNDER

CDF: AC = 1.308e-08 · Subgrade = 6.363e-18 · PCC = 9.651e+02 — **Max = 9.651e+02** (PCC Fatigue)

Controlling lateral offset ω* = 90″ from runway centerline.

| # | Aircraft | MTOW (lb) | Gear | Aircraft CDF | Wheel-coord source |
|---|---|---|---|---|---|
| 1 | `C130` | 155,000 | 2D | 1.900e+02 | xml |
| 2 | `B734` | 150,000 | D | 1.396e+02 | xml |
| 3 | `B738` | 174,200 | D | 1.173e+02 | xml |
| 4 | `CRJ7` | 84,500 | D | 7.819e+01 | xml |
| 5 | `CRJ2` | 53,000 | D | 6.123e+01 | xml |


_Generated 2026-04-22 19:09 from `results/cdf_results.json`._
