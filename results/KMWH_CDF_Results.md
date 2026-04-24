# KMWH (Grant County International, WA) — CDF Results

**Engine:** FAARFIELD desktop parity — LEAFClassLib (layered elastic) + AMClassLib via FAASR3D (3D rigid FEM).  
**Material inputs:** R = 360 psi (FAA AC 150/5320-6F lower bound, 8% × 4500 psi assumed f'c for >20-yr aged airport PCC) · SCI = 80.0 (FAARFIELD design default).  
**Run parameters:** life = 20 yr · growth = -0.50%/yr · 41-offset lateral sweep, σ_wander = 30.435".  
**Subgrade:** Gravelly Coarse Sand (AASHTO A-1-a, NRCS), CBR=40, E=50,000 psi.  
**Verdict:** 0 OVER / 2 UNDER across 2 section(s).

## Verdict Summary

| Section | Use | Layers | CDF (max) | Controlling | Verdict |
|---|---|---|---|---|---|
| 37325 | Runway (narrow) | 2" AC + 6" PCC + 12" Agg Base | 2.2977e+04 | PCC Fatigue | **UNDER** |
| 37508 | Runway (wide) | 2" AC + 6" PCC + 12" Agg Base | 2.2977e+04 | PCC Fatigue | **UNDER** |

## Per-Section Aircraft CDF Contributions (Top 5)

### Section 37325 (Runway (narrow)) — 2" AC + 6" PCC + 12" Agg Base — UNDER

CDF: AC = 5.430e-10 · Subgrade = 3.384e-32 · PCC = 2.298e+04 — **Max = 2.298e+04** (PCC Fatigue)

Controlling lateral offset ω* = 140″ from runway centerline.

| # | Aircraft | MTOW (lb) | Gear | Aircraft CDF | Wheel-coord source |
|---|---|---|---|---|---|
| 1 | `C17` | 585,000 | 2D | 1.416e+04 | xml (exact FAARFIELD XML) |
| 2 | `B738` | 174,200 | D | 3.362e+03 | xml (exact FAARFIELD XML) |
| 3 | `P3` | 135,000 | D | 1.129e+03 | xml |
| 4 | `B739` | 187,700 | D | 5.448e+02 | xml |
| 5 | `B737` | 154,500 | D | 5.174e+02 | xml |

### Section 37508 (Runway (wide)) — 2" AC + 6" PCC + 12" Agg Base — UNDER

CDF: AC = 5.430e-10 · Subgrade = 3.384e-32 · PCC = 2.298e+04 — **Max = 2.298e+04** (PCC Fatigue)

Controlling lateral offset ω* = 140″ from runway centerline.

| # | Aircraft | MTOW (lb) | Gear | Aircraft CDF | Wheel-coord source |
|---|---|---|---|---|---|
| 1 | `C17` | 585,000 | 2D | 1.416e+04 | xml (exact FAARFIELD XML) |
| 2 | `B738` | 174,200 | D | 3.362e+03 | xml (exact FAARFIELD XML) |
| 3 | `P3` | 135,000 | D | 1.129e+03 | xml |
| 4 | `B739` | 187,700 | D | 5.448e+02 | xml |
| 5 | `B737` | 154,500 | D | 5.174e+02 | xml |


_Generated 2026-04-22 19:09 from `results/cdf_results.json`._
