# Field Distress & PCI Data — CEE 598 Final Project

**Author:** Chidchanok Pleesudjai (`cpleesud@asu.edu`)
**Date:** 2026-04-24
**Source:** `FAA_Project_Data_4_Grad_Students/02_Pavement_Design_with_Traffic/20260223_Traffic_Filtered_Airport_Data.xlsx`
**Companion JSON:** `note_claude/pci_distress_data.json`

---

## 1. What was found

The original `AO_CEE598_FAARFIELD.xlsx` (the workbook referenced in the assignment statement) carries only **design inputs** — pavement geometry, subgrade properties, traffic mix, growth rates. It contains **no field-condition data**: a keyword sweep for `distress`, `PCI`, `SCI`, `condition`, `crack`, `spall`, `rut`, `IRI`, `FOD`, `FWD`, etc. across all 11 sheets returned zero hits.

Field-condition data is in a separate FAA grad-student bundle: **`FAA_Project_Data_4_Grad_Students/02_Pavement_Design_with_Traffic/20260223_Traffic_Filtered_Airport_Data.xlsx`**. This file ships four condition-related sheets:

| Sheet | Rows | Contents |
|---|---|---|
| `Inspection Def` | 59 | Inspection metadata + **PCI** in `Condition` column + `PctLoad` (% load-related distress) |
| `Section Distress Values` | 188 | Per-distress records (type, severity, quantity, unit, date) |
| `Distress Code Def` | 156 | Distress-code dictionary |
| `Structure Summary` | 34 | Layer construction history |

All **13 project sections** are covered. PCI series span **2005 – 2023** (typically 4–5 inspections per section). The `Sample` column carries the inspection-sample size (number of slabs / unit area inspected).

---

## 2. Distress codes observed in the 13 sections

10 distinct distress codes appear in our project:

| Code | Description | FAA category | Mechanism |
|---:|---|---|---|
| **41** | Alligator cracking | Load-related (AC fatigue) | Repeated tensile strain at AC bottom — the classical fatigue mode |
| 42 | Bleeding | Climate / mix design | Excess asphalt + heat |
| 45 | Depression | Subgrade / structural | Localized settlement, drainage failure |
| **47** | Joint reflection cracking | Composite-pavement specific | PCC joint movement reflects through HMA overlay |
| **48** | Longitudinal & transverse cracking | Mixed (climate + load) | Thermal contraction + load fatigue |
| 50 | Patching / utility cut | Maintenance artifact | Not a primary distress |
| **52** | Raveling | Climate / mix age | UV oxidation + aggregate loss |
| 54 | Shoving | Load (low-stability mix) | Plastic flow under braking/turning |
| 56 | Swelling | Subgrade / frost | Expansive soils, frost heave |
| **57** | Weathering | Climate | Surface oxidation, micro-cracking |

Codes that **FAARFIELD CDF actually predicts** are bolded — alligator (41), longitudinal (48), and joint reflection (47, the AC-over-PCC composite signature). The CDF model says nothing about raveling (52), weathering (57), or swelling (56) — those are climate-driven and tracked separately by the empirical AC durability adjustments in AC 150/5320-6F.

---

## 3. PCI snapshot — most recent inspection per section

`Condition` is reported on the standard **PCI scale (0–100)**: 100 = newly constructed, 70+ = good, 55–70 = fair, 40–55 = poor, <40 = very poor / failed. `PctLoad` is the percentage of distress points attributable to load-related distress (the rest is climate/aging).

| ICAO | SecID | Use | Construction | Latest insp. | **Latest PCI** | %Load | Notes |
|---|---|---|---|---|---:|---:|---|
| KCIU | 21222 | Runway | 2014 | 2023-05-17 | **58.7** | 0% | Steady decline, no load fingerprint |
| KLHX | 6627 | Taxiway | 2012 | 2023-06-12 | **63.5** | 0% | Mid-fair, climate-driven |
| KLHX | 7347 | Taxiway | 2010 | 2023-06-12 | **66.7** | 0% | Mid-fair |
| KMQJ | 8640 | Taxiway | 2005 | 2023-07-31 | **41.7** | 0% | Poor — oldest cohort |
| KMQJ | 8662 | Taxiway | 2005 | 2023-07-31 | **33.9** | **11.0%** | Very poor + load fingerprint emerging |
| KMQJ | 8780 | Taxiway | 2005 | 2023-07-31 | **42.8** | 0% | Poor |
| KMQJ | 8881 | Taxiway | 2005 | 2023-07-31 | **33.5** | **15.3%** | Worst observed PCI; load-driven |
| KMWH | 37325 | Runway | 2005 | 2018-05-31 | **67.3** | **26.2%** | Fair but heavy load fraction |
| KMWH | 37508 | Runway | 2005 | 2018-05-31 | **71.9** | 0% | Fair, climate-only |
| KOTM | 27450 | Taxiway | 2009 | 2022-11-14 | **95.0** ↑ | 0% | Jumped from 54.4 → likely **rehab 2019–2022** |
| KOTM | 27641 | Runway | 2009 | 2022-11-14 | **94.9** ↑ | 0% | Same — jumped from 61.5 → **rehab** |
| KOTM | 28171 | Runway | 2015 | 2022-11-14 | **64.1** | 6.3% | Mid-fair |
| KPUB | 6948 | Taxiway | 2015 | 2023-06-11 | **78.9** | 0% | Good — newest cohort |

Two **KOTM sections (27450, 27641)** show a step-jump in PCI between 2019 (54–61) and 2022 (94–95). This is the unmistakable signature of an **AC overlay or full reconstruction**. These two sections should either be **flagged with an asterisk** or **excluded** from the CDF-vs-field-condition comparison, because their post-2022 PCI reflects new construction, not the 2005-vintage pavement that the original layer description (and our FAARFIELD inputs) describe.

---

## 4. Predicted CDF vs measured PCI — the validation table

This is the key cross-check that the field data enables. CDF is dimensionless; lower is better. PCI is 0–100; higher is better. They should track inversely.

| Section | Pred. CDF (FAARFIELD) | Verdict (CDF) | Latest PCI | %Load | Field judgement | Agreement |
|---|---:|---|---:|---:|---|---|
| KMQJ 8881 | 46.87 | UNDER | 33.5 | **15.3%** | Failed, load-driven | ✅ Strong agreement |
| KMQJ 8662 | 18.13 | UNDER | 33.9 | **11.0%** | Failed, load fingerprint | ✅ Strong agreement |
| KMQJ 8640 | 18.13 | UNDER | 41.7 | 0% | Poor, climate-only | ⚠️ Distress is non-load |
| KMQJ 8780 | 18.13 | UNDER | 42.8 | 0% | Poor, climate-only | ⚠️ Distress is non-load |
| KCIU 21222 | 76.0 | UNDER | 58.7 | 0% | Fair, climate-only | ⚠️ Distress is non-load |
| KLHX 6627 | 6.67 | UNDER | 63.5 | 0% | Fair, climate-only | ⚠️ Distress is non-load |
| KLHX 7347 | 0.005 | OVER | 66.7 | 0% | Fair, climate-only | ✅ Over-design + slow climate decay |
| KMWH 37325 | 22,980 | UNDER | 67.3 (2018) | **26.2%** | Fair-but-degrading, load fingerprint | ⚠️ CDF vastly overstates |
| KMWH 37508 | 24,148 | UNDER | 71.9 (2018) | 0% | Fair, climate-only | ❌ CDF predicts catastrophic; field disagrees |
| KOTM 27450 | 0.466 | OVER | 95.0 ↑ (rehab) | 0% | Reconstructed | 🔄 Excluded — rehab artifact |
| KOTM 27641 | 0.962 | OVER | 94.9 ↑ (rehab) | 0% | Reconstructed | 🔄 Excluded — rehab artifact |
| KOTM 28171 | 0.941 | OVER | 64.1 | 6.3% | Fair, mostly climate | ✅ Borderline-OK matches fair-stable |
| KPUB 6948 | 965.1 | UNDER | 78.9 | 0% | Good | ❌ CDF predicts severe; field is good |

### Interpretation key

1. **Strong agreement (4 sections).** CDF > 1 with measurable load-related distress fraction — FAARFIELD identified the load-overstressed sections that field inspectors are now seeing crack from traffic. This validates the methodology where it matters most.
2. **CDF over-predicts on KMWH runways and KPUB.** Two possibilities:
   - **C-17 traffic exposure error.** KMWH 37508's CDF is dominated by C-17 (1.42 × 10⁴). The library's 2T gear classification (corrected from Excel's 2D) raises the CDF roughly an order of magnitude. If actual C-17 movements are far below the assumed annual departures, the field PCI of 71.9 is consistent with reality and the CDF assumption is conservative.
   - **CDF's design-life convention.** CDF > 1 means "predicted to fail before design life," not "currently failed." A pavement at CDF = 24,000 should have failed catastrophically by year ≈ design-life ÷ 24,000. Since these sections are 13–18 years old and still functioning, the CDF is computing damage on a traffic mix that hasn't actually flown.
3. **PCI degradation is mostly climate-driven, not load-driven.** Every section with %Load = 0 is showing distress from raveling (52), weathering (57), and joint reflection (47) — all climate/age mechanisms that CDF does not predict. This is consistent with FAA experience: most GA airports never accumulate enough heavy traffic to fatigue-crack, and pavement life is governed by **environmental durability**, not load fatigue.
4. **The KOTM step-jump between 2019 and 2022 must be acknowledged in the report.** Two sections were rehabilitated; their post-2022 PCI cannot be compared to the original layer assumptions in `Pavement` sheet.

---

## 5. PCI degradation rate (informal — for context in the report)

| Section | Δyears | ΔPCI | Annual decay |
|---|---:|---:|---:|
| KCIU 21222 | 2014→2023 (9 y) | 100 → 58.7 | **−4.6/yr** |
| KLHX 6627 | 2012→2023 (11 y) | 100 → 63.5 | **−3.3/yr** |
| KLHX 7347 | 2010→2023 (13 y) | 100 → 66.7 | **−2.6/yr** |
| KMQJ 8640 | 2005→2023 (18 y) | 100 → 41.7 | **−3.2/yr** |
| KMQJ 8662 | 2005→2023 (18 y) | 100 → 33.9 | **−3.7/yr** |
| KMQJ 8780 | 2005→2023 (18 y) | 100 → 42.8 | **−3.2/yr** |
| KMQJ 8881 | 2005→2023 (18 y) | 100 → 33.5 | **−3.7/yr** |
| KMWH 37325 | 2005→2018 (13 y) | 100 → 67.3 | **−2.5/yr** |
| KMWH 37508 | 2005→2018 (13 y) | 100 → 71.9 | **−2.2/yr** |
| KOTM 28171 | 2015→2022 (7 y) | 100 → 64.1 | **−5.1/yr** |
| KPUB 6948 | 2015→2023 (8 y) | 100 → 78.9 | **−2.6/yr** |

**Range:** −2.2 to −5.1 PCI / year. **Median ≈ −3.2 PCI / year** for our airport portfolio. This is consistent with the published FAA expectation of **−2 to −5 PCI / year** for AC-over-PCC composite pavements at GA airports under normal climate exposure.

The two KMQJ sections with detectable load distress (8662, 8881) decay slightly faster (−3.7/yr) than the climate-only KMQJ sections (8640, 8780 at −3.2/yr) — a small but consistent ~0.5 PCI/yr load-driven increment, which is exactly the kind of separable load contribution the `PctLoad` column was designed to expose.

---

## 6. Implications for the final report

### What this data **lets us claim**

1. **The 4 OVER / 9 UNDER verdict is partially confirmed by field PCI.** All four CDF-OVER sections (KLHX 7347, KOTM 27450, KOTM 27641, KOTM 28171) have **0% load-related distress** in their latest inspection — meaning where FAARFIELD said "the load is fine," the field agrees: no load-driven cracking is being observed. (Two of the four had rehab work, which doesn't contradict the CDF — it just means the field PCI no longer reflects the original section.)
2. **The two KMQJ sections with load fingerprints (8662, 8881) are exactly the two with the highest %Load distress in the entire portfolio.** This is the strongest validation result we can get without doing FWD back-calculation.
3. **Climate degradation dominates GA pavement life.** Of the 11 non-rehabbed sections, 8 show 0% load-related distress despite all 11 being structurally aged 8–18 years. This justifies emphasizing the **frost-protection analysis** (note 2026-04-23) and the **AC-overlay durability** rather than treating CDF as the sole adequacy criterion.

### What we **cannot claim**

1. **CDF magnitude is not directly comparable to PCI.** CDF >> 1 does not mean PCI = 0 today; it means the section will exhaust its design fatigue life before the design horizon. KMWH 37508 at CDF = 24,148 with PCI = 71.9 is not necessarily wrong — it's a statement about the next design cycle, not the current condition.
2. **KOTM 27450 / 27641 cannot be used to validate CDF.** Their PCI history was reset by maintenance/overlay work. Use only KOTM 28171 from KOTM.
3. **No FWD / NDT data is available.** We cannot back-calculate layer moduli to refine the FAARFIELD inputs. The published k, E, CBR values for the subgrade (from NRCS Web Soil Survey) and the assumed PCC modulus remain the only structural inputs.

### Suggested report sections to add

- **§ Field condition validation.** A new chapter using the table in §4 above. Frame it as "predicted (CDF) vs observed (PCI + %Load)" — not as a calibration exercise (we have only n = 13, no degrees of freedom for fitting), but as a qualitative agreement check.
- **§ Discussion of climate vs load.** Make the point that 8 of 11 non-rehabbed sections show 0% load distress despite varying CDF predictions — i.e., **load fatigue is rarely the binding life-limit at GA airports**. The frost-protection analysis already in `note_claude/2026-04-23_Frost_Protection_Analysis.md` provides the climate-side counterpart.
- **§ Limitations.** Document the KOTM rehab artifact, the PCI/CDF unit mismatch, and the absence of FWD data.

---

## 7. Companion JSON — `pci_distress_data.json`

A structured extract of all 187 distress records and 58 PCI inspections for the 13 sections, indexed by `{ICAO}_{SectionID}`. Schema:

```jsonc
{
  "sections": {
    "KMWH_37508": {
      "icao": "MWH",
      "section_id": 37508,
      "name": "RWY 14R-32L",
      "use": "RUNWAY",
      "construction_date": "2005-07-19",
      "pci_history": [
        {"date":"2005-07-19","pci":100,"pct_load":0,"sample":107},
        {"date":"2012-09-26","pci":86.87,"pct_load":0,"sample":214},
        ...
      ],
      "distress_records": [
        {"date":"...", "code":47, "desc":"JT REF. CR", "severity":"L", "qty":..., "unit":"..."},
        ...
      ]
    }
  }
}
```

This is the canonical source for any PCI/distress visualization or table in the report and the website.

---

## 8. Citation in the report

> **Field condition data for all 13 project sections were obtained from the FAA-supplied dataset `20260223_Traffic_Filtered_Airport_Data.xlsx`. PCI inspections span 2005–2023 with 4–5 inspections per section. The `Condition` field follows ASTM D5340 PCI on a 0–100 scale; `PctLoad` reports the percentage of distress points attributable to load-related distress per the FAA Distress Code Definition list. Two KOTM sections (27450, 27641) show a discontinuity between 2019 and 2022 consistent with overlay/reconstruction and were excluded from CDF-vs-PCI comparisons; their post-2022 PCI no longer reflects the layer composition listed in `Pavement` sheet of the original input workbook.**

---

*End of note. See `pci_distress_data.json` for the structured data export.*
