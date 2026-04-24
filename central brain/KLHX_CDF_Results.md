# KLHX (La Junta Municipal Airport) — CDF Analysis Results

## Final Verdict

| Section | Layers | CDF (max) | Controlling Mode | Verdict |
|---------|--------|-----------|-----------------|---------|
| **6627** | 2.5" AC + 6" PCC | **9.64** | PCC Fatigue | **UNDER-DESIGNED** |
| **7347** | 2" AC + 10" PCC | **0.00027** | PCC Fatigue | **OVER-DESIGNED** |

## Interpretation

- **Section 6627** (6" PCC): CDF = 9.64 >> 1.0 — the thin PCC slab (only 6") cannot handle the occasional heavy aircraft (EA50, C-130, A-10). The slab would fail in PCC fatigue well before the 20-year design life. This section is **significantly under-designed**.

- **Section 7347** (10" PCC): CDF = 0.00027 << 1.0 — the thicker PCC slab (10") has massive reserve capacity. Even with the C-130 and other heavy aircraft, the CDF is essentially zero. This section is **massively over-designed** for the actual traffic at La Junta.

## Key Finding
The **PCC fatigue** (stress in the concrete slab) controls both sections — not AC fatigue or subgrade rutting. This makes sense because:
1. The subgrade strains are tiny (thick pavement spreads the load well)
2. The AC layer is thin (2-2.5") so AC fatigue doesn't accumulate much
3. The PCC slab takes the primary bending stress, and for the thin 6" slab, a C-130 creates significant stress

## Top Contributing Aircraft (Section 6627)

| Aircraft | MTOW (lbs) | Gear | Annual Dep | CDF (PCC) | % of Total |
|----------|-----------|------|-----------|-----------|-----------|
| EA50 (Eclipse 500) | 39,595 | S | 0.9 | 4.87 | 50.5% |
| C130 (Hercules) | 155,000 | 2D | 0.6 | 3.44 | 35.7% |
| A10 (Thunderbolt) | 50,044 | S | 0.1 | 0.78 | 8.1% |
| CRJ9 (CRJ-900) | 80,500 | D | 0.1 | 0.54 | 5.6% |
| All others | — | — | — | ~0.01 | <1% |

## Analysis Parameters
- Subgrade: Silt Loam (AASHTO A-6), CBR = 7, E = 10,500 psi
- PCC Flexural Strength: 700 psi (default)
- SCI: 80 (default)
- Growth Rate: 3.2% CAGR
- Design Life: 20 years
- Traffic: 79 aircraft types, 3,504 total departures over 8 years (2014-2021)
- Significant aircraft (MTOW >= 3,000 lbs): 63 types

## Methodology
- Multi-layer elastic analysis: Odemark equivalent thickness + Westergaard PCC stress
- AC Fatigue: log10(Nf) = 2.68 - 5.0*log10(eps_h) - 2.665*log10(E_ac)
- Subgrade Rutting: Nf = 10000 * (AA/eps_v)^BB (FAARFIELD standard constants)
- PCC Fatigue: log10(Nf) = 11.737 - 12.077 * SR (stress ratio)
- Coverage: Gaussian wander, sigma = 30.435"

## Script
`scripts/klhx_cdf_analysis.py`
