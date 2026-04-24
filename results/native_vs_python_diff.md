# Native FAARFIELD Engine vs Python Engine — Result Diff

Side-by-side comparison of `cdf_max` between the old Python engine and the new native FAARFIELD desktop-parity engine.

| | Old (Python) | New (Native) |
|---|---|---|
| Engine | `scripts/faarfield_engine.py` (hand-ported) | `FullAnalysisWrapper.RunCdfAnalysis` (desktop parity) |
| Fatigue models | Odemark + Westergaard + Burmister | SCI-dependent PCC (FSlopeComp), RDEC AC, StraightLine+Bleasdale subgrade |
| Rigid slab analysis | Westergaard closed-form | AMClassLib.ComputeResponse (rigid FEM), `max(LEAF, FEM)` |
| SCI | Not modelled | 80 |
| PCC flexural strength | 700 psi | **650 psi** (FAARFIELD program default) |
| Aircraft wheel coords | Simplified gear-letter templates (GEAR_MAP) | Backend AircraftLibrary — XML tier 1, proxy tier 2, template tier 3/4 (flagged) |
| Growth formula | `[1+L*g*0.5]*Annual*L` | Applied internally by backend |

| ICAO | Section | Old cdf_max | New cdf_max | Δ | % change | Old | New | Flipped? |
|---|---|---|---|---|---|---|---|---|
| KLHX | 6627 | 6.726e-10 | 8.615e-09 | +7.943e-09 | +1180.9% | O | O |  |
| KLHX | 7347 | 8.115e-11 | 1.003e-08 | +9.953e-09 | +12265.5% | O | O |  |
| KPUB | 6948 | 1.308e-08 | 1.899e-06 | +1.886e-06 | +14419.5% | O | O |  |
| KMQJ | 8662 | 7.468e-09 | 1.267e-06 | +1.259e-06 | +16862.2% | O | O |  |
| KMQJ | 8881 | 7.468e-09 | 1.267e-06 | +1.259e-06 | +16862.2% | O | O |  |
| KMQJ | 8640 | 7.468e-09 | 1.267e-06 | +1.259e-06 | +16862.2% | O | O |  |
| KMQJ | 8780 | 7.468e-09 | 1.267e-06 | +1.259e-06 | +16862.2% | O | O |  |
| KCIU | 21222 | 1.284e-10 | 9.853e-07 | +9.851e-07 | +767471.9% | O | O |  |
| KOTM | 28171 | 2.737e-07 | 2.775e-07 | +3.740e-09 | +1.4% | O | O |  |
| KOTM | 27450 | 2.823e-07 | 2.864e-07 | +4.044e-09 | +1.4% | O | O |  |
| KOTM | 27641 | 2.732e-07 | 2.770e-07 | +3.840e-09 | +1.4% | O | O |  |
| KMWH | 37325 | 5.430e-10 | 2.774e-06 | +2.773e-06 | +510702.5% | O | O |  |
| KMWH | 37508 | 5.430e-10 | 2.774e-06 | +2.773e-06 | +510702.5% | O | O |  |

## Caveats

- **flexStr changed from 700 → 650 psi** (we moved to the actual FAARFIELD program default). Lower flex strength means higher stress/strength ratio → *higher* CDF, all else equal.
- **SCI = 80** is now applied. The old Python engine had no SCI term. SCI modifies the PCC fatigue equation via FSlope / FSlopeComp (see modStrDesign13.vb).
- **Rigid FEM via AMClassLib** is now in the loop. For sections where the rigid-FEM stress exceeds 0.95× the LEAF stress, the fatigue calc uses the rigid-FEM value.
- **Simplified (tier-3/4) aircraft coords are essentially the same as the Python engine used** — both use hard-coded gear-letter templates. Those aircraft's deltas here reflect SCI/fatigue model + flexStr changes, not a gear-coord correction.
- **Tier-1/2 (xml / proxy) aircraft are new geometry** — the Python engine had no real wheel coords, just `n_tires` + `tire_pressure` from `GEAR_MAP`. For those aircraft (the majority), wheel-position accuracy directly improves stress realism.
