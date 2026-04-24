# FAARFIELD CDF Analysis — All 6 Airports Summary (History-Informed SCI)

**Engine:** FAARFIELD desktop parity — LEAF + rigid-FEM (AMClassLib), `useFem3d=false`  
**Parameters:** flexStr = 650 psi · design life = 20 yr  
**SCI (per section):** estimated from PCC construction year + pre-overlay bare-slab traffic damage — see `SCI_estimation.md`  
**Baseline comparison:** SCI=80 run preserved in `cdf_results_sci80_baseline.json`  
**Date:** 2026-04-21  ·  **Runtime:** 10893.9s (main CDF rerun)

## Verdict — 4 over-designed, 8 under-designed (of 12 sections)

| ICAO | Section | Layers | PCC yr | Overlay yr | SCI | CDF (max) — SCI=80 | CDF (max) — SCI history | Controlling | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| KLHX | 6627 | 2.5" AC + 6" PCC | 1942 | 2016 | 80.0 | 6.671e+00 | 6.671e+00 | PCC Fatigue | **UNDER** |
| KLHX | 7347 | 2" AC + 10" PCC | 1942 | 2016 | 80.0 | 5.039e-03 | 5.039e-03 | PCC Fatigue | **OVER** |
| KPUB | 6948 | 2.5" AC + 7" PCC + 6" P-154 | 1965 | 2012 | 80.0 | 9.651e+02 | 9.651e+02 | PCC Fatigue | **UNDER** |
| KMQJ | 8662 | 3.5" AC + 8" PCC + 6" Stab Base | 1977 | 2012 | 80.0 | 1.813e+01 | 1.813e+01 | PCC Fatigue | **UNDER** |
| KMQJ | 8640 | 3.5" AC + 8" PCC + 6" Stab Base | 1977 | 2012 | 80.0 | 1.813e+01 | 1.813e+01 | PCC Fatigue | **UNDER** |
| KMQJ | 8780 | 3.5" AC + 8" PCC + 6" Stab Base | 1977 | 2012 | 80.0 | 1.813e+01 | 1.813e+01 | PCC Fatigue | **UNDER** |
| KCIU | 21222 | 2.5" AC + 24" PCC | 1958 | 2000 | 80.0 | 1.139e+01 | 1.139e+01 | PCC Fatigue | **UNDER** |
| KOTM | 28171 | 2.5" AC + 8" PCC | 1943 | 2009 | 80.0 | 9.409e-01 | 9.409e-01 | PCC Fatigue | **OVER** |
| KOTM | 27450 | 3" AC + 9" PCC | 1943 | 2009 | 80.0 | 4.662e-01 | 4.662e-01 | PCC Fatigue | **OVER** |
| KOTM | 27641 | 3" AC + 8" PCC | 1943 | 2009 | 80.0 | 9.616e-01 | 9.616e-01 | PCC Fatigue | **OVER** |
| KMWH | 37325 | 2" AC + 6" PCC + 12" Agg Base | 1942 | 2020 | 80.0 | 2.298e+04 | 2.298e+04 | PCC Fatigue | **UNDER** |
| KMWH | 37508 | 2" AC + 6" PCC + 12" Agg Base | 1942 | 2020 | 80.0 | 2.298e+04 | 2.298e+04 | PCC Fatigue | **UNDER** |

See `SCI_estimation.md` for per-section construction history sources and confidence levels.
