# SCI Estimation from Construction History

**Methodology:** For each section we estimate (a) the year the PCC slab was originally poured and (b) the year the current AC overlay was placed. The gap between them = years of bare-PCC service. We run the FAARFIELD native engine on the **pre-overlay** pavement (PCC + base + subgrade, no AC) with traffic scaled to that pre-overlay period, `SCI=100` (pristine at start), to get a pre-overlay Cumulative Damage Factor Used (CDFU). Current SCI = max(40, 100 − 20·CDFU) for CDFU ≤ 1, or 80 − 10·(CDFU−1) for CDFU > 1. The SCI-80 baseline (FAARFIELD program default) is preserved in `cdf_results_sci80_baseline.json` for comparison.

## Sources

Construction year estimates are best-effort from public data (Wikipedia airport history pages, FAA AIP grant records FY2021-2024 at `central brain/`, contractor news reports, and GlobalSecurity/military-history wikis for former military airfields). **FAA PAVEAIR per-section history is login-gated and not accessible here.** Sections without documented rehab dates use a fallback assumption of "~10-year-old overlay".

## Per-section history and computed SCI

| ICAO | Section | Use | PCC yr | Overlay yr | Pre-overlay yrs | Pre-overlay CDFU | **SCI** | Conf | Source |
|---|---|---|---|---|---|---|---|---|---|
| KLHX | 6627 | Taxiway | 1942 | 2016 | 74 | 2.693e+01 | **40.0** | low | WWII airfield (1942); no overlay records — assumed ~10 yr old |
| KLHX | 7347 | Taxiway | 1942 | 2016 | 74 | 2.576e+02 | **40.0** | low | Same WWII airfield; same assumption |
| KPUB | 6948 | Taxiway | 1965 | 2012 | 47 | 4.398e-06 | **50.0** | low-medium | 1960s jet extension; Wikipedia describes current overlay; 2019 seal-coat was surface-only |
| KMQJ | 8662 | Taxiway TWA2 | 1977 | 2012 | 35 | 1.853e-06 | **65.0** | low-medium | Phase-1 construction Oct 1976-Nov 1977; overlay cycle ~2010-2015 |
| KMQJ | 8881 | Taxiway TWA1 | 1977 | 2012 | 35 | 1.853e-06 | **65.0** | low-medium | Same as 8662 |
| KMQJ | 8640 | Taxiway TWA3 | 1977 | 2012 | 35 | 1.853e-06 | **65.0** | low-medium | Same as 8662 |
| KMQJ | 8780 | Taxiway TWA4 | 1977 | 2012 | 35 | 1.853e-06 | **65.0** | low-medium | Same as 8662; $10M apron/taxiway project 2023 in progress |
| KCIU | 21222 | Runway | 1958 | 2000 | 42 | 1.984e+04 | **40.0** | medium | Kincheloe AFB B-52 extension 1958 (24" PCC matches SAC design); overlay year estimated |
| KOTM | 28171 | Taxiway | 1943 | 2009 | 66 | 9.330e+02 | **40.0** | medium | NAS Ottumwa 1942-43; 2009 $3.9M project documented |
| KOTM | 27450 | Runway | 1943 | 2009 | 66 | 1.035e+03 | **40.0** | medium | Same; 2009 repaving of RW 4/22 explicitly documented |
| KOTM | 27641 | Runway | 1943 | 2009 | 66 | 9.330e+02 | **40.0** | medium | Same as 27450 |
| KMWH | 37325 | Runway (narrow) | 1942 | 2020 | 78 | 1.075e-05 | **40.0** | medium-high | Moses Lake AAB 1942 + 1950s B-52 extension; $20M Granite 2019-2020 rehab well documented |
| KMWH | 37508 | Runway (wide) | 1942 | 2020 | 78 | 1.075e-05 | **40.0** | medium-high | Same project as 37325 |

## SCI conversion formula

```
SCI = 100 − 20 × CDFU           (CDFU ≤ 1.0)
SCI = max(40, 80 − 10·(CDFU−1)) (CDFU > 1.0)
```

This matches FAARFIELD's conceptual damage model: SCI=100 is pristine, SCI=80 is end-of-design-life (first crack), and below SCI=40 the slab would normally be reconstructed rather than overlaid — so we floor it there.

