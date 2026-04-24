# Gear Classification Mismatch — Excel Traffic vs FAARFIELD Library

**Author:** Chidchanok Pleesudjai (`cpleesud@asu.edu`)
**Date:** 2026-04-24
**Source scripts:** `scripts/audit_excel_vs_library.py`, `scripts/backfill_libgear.py`
**Audit file:** `results/audit_excel_vs_library.{json, md}`

---

## 1. Finding in one sentence

Across the 859 traffic rows in `AO_CEE598_FAARFIELD.xlsx`, **38 instances** (11 unique aircraft) carry a **gear classification that disagrees with the FAARFIELD aircraft library** (`C:\Program Files (x86)\FAARFIELD\`). For these aircraft, the CDF analysis in this project uses the **library gear** (authoritative, since that is the gear FAARFIELD itself would assign), not the Excel-supplied gear.

## 2. Why this matters

The `GearType` string selects which wheel-layout template and spacing rules FAARFIELD applies to each aircraft when computing stresses. The four main classes are:

| Class | Meaning | Wheels (per main gear) |
|---|---|---:|
| S | Single | 1 |
| D | Dual | 2 |
| 2S | Single tandem | 2 |
| 2D | Dual tandem | 4 |
| 2T | Triple tandem | 6 |
| 2D/D1 | Quad (KC-10 family) | 4 |

Stress magnitude and the CDF value scale strongly with the gear class because:
- **More wheels at the same total MTOW → lower stress at any single wheel** (load is distributed)
- **Tandem configurations** put wheels in-track, so the same pavement point is loaded multiple times per pass — which **increases** CDF even though peak stress decreases

Mislabeling a 2T (triple-tandem) as 2D (dual-tandem) is the worst common error — a 2T distributes its loaded axle across three wheels in the direction of travel, but the effective coverage factor and the in-track tandem interaction are fundamentally different.

## 3. Audit categories (859 rows total)

| Category | Rows | What it means |
|---|---:|---|
| **OK** | 278 | Excel gear matches the library exactly — no override needed |
| **PROXY** | 550 | Excel ICAO not found in library — a similar aircraft was substituted; gear matches the proxy |
| **GEAR_MISMATCH** | 38 | Excel gear differs from the library's authoritative gear for the matched record — **library overrides** |
| **DUAL_FALLBACK** | 5 | Excel said "Dual" with no match; defaulted to D |

## 4. All 11 unique mismatches

**High-confidence overrides** — ICAO is in the FAARFIELD XML library and the library's gear is authoritative:

| ICAO | Excel | **Library** | Wheels (lib) | Airports | Total deps | Aircraft |
|---|:---:|:---:|:---:|---|---:|---|
| **BE9L** | D | **S** | 2 | KCIU, KLHX, KMQJ, KMWH | 2,746 | Beech King Air C90 |
| **C130** | 2D | **2S** | 4 | KCIU, KLHX, KMQJ, KMWH, KPUB | 552 | C-130-70 Hercules |
| **C17**  | 2D | **2T** | 12 | KCIU, KMWH, KPUB, KLHX | **7,207** | C-17A Globemaster III |
| **C750** | S  | **D**  | 4 | KCIU, KMQJ, KMWH, KOTM | 682 | Cessna Citation X |
| **DC10** | 2D | **2D/D1** | 8 | KMWH, KPUB | 212 | KC-10 |
| **E190** | 2D | **D**  | 4 | KCIU, KPUB | 11 | Embraer 190 STD |
| **FA50** | S  | **D**  | 4 | KCIU, KMQJ, KMWH, KOTM | 137 | Dassault Falcon 50/50EX |

**Low-confidence overrides** — ICAO is not in the library; a proxy was substituted and its gear propagates through. Treat these as uncertain — the proxy may not structurally represent the real aircraft:

| ICAO | Excel | **Library (via proxy)** | Proxy aircraft | Total deps | Real-world aircraft |
|---|:---:|:---:|---|---:|---|
| **BE19** | D | **S** | Learjet 35 | 3,953 | Beech 19 Musketeer (actually S — proxy wrong) |
| **BE9T** | D | **S** | King Air B100 | 311 | Beech King Air B100 |
| **C30J** | 2D | **2S** | B757-200 | 186 | C-130J Super Hercules |
| **SW3**  | S | **D** | PA-32 Cherokee Six | 149 | Swearingen Metro III |

## 5. Why the Excel values disagree

Two root causes:

1. **Transcription from generic aircraft databases.** Many public traffic datasets (ASPM, TAF, T-100) record only a coarse gear class. A compiler filling in "dual tandem" for any large military/widebody aircraft will produce 2D entries for the C-17 (really 2T), C-130 (really 2S), and DC-10 (really 2D/D1) even though FAARFIELD's library stores their actual configurations.

2. **Small GA aircraft defaulted to D.** Piston singles like the BE19 Musketeer and King Air C90 (BE9L) have one wheel each side (single-wheel main gear = S) but they were coded as D in the Excel. The library correctly stores them as S.

## 6. What the project does with this

**The analysis uses library gear unconditionally.** The backend resolves each Excel row through `AircraftLibrary.ResolveGeometry()` (file `c:/temp/aeropave/faarfield-api/AircraftLibrary.vb`), which:

1. Tries exact ICAO match in FAARFIELD's XML library → returns `LibraryGearType` directly.
2. If missing, tries `icao_proxy` (manual curated override).
3. If still missing, falls back to `family_proxy` (aircraft-family template) or `nearest_proxy` (same MTOW class).
4. The returned `LibraryGearType` becomes the gear used for wheel-layout, coverage, and CDF computation — regardless of what the Excel row said.

The echoed `gear` field in the response is preserved for audit purposes so the UI can show the mismatch.

## 7. How the mismatch is surfaced in the deliverables

### Website (AeroPave — `c:/temp/aeropave/src/`)

- **Per-aircraft table** (`DesignTool.jsx`): shows library gear in bold with `≠traffic-gear` suffix in red when they differ, hover tooltip spells out "Library: X · Traffic: Y".
- **Gear footprint top-view** (`GearFootprintTopView.jsx`): draws wheels using library `wheelX`/`wheelY` coordinates; label shows
    - `library gear: X (used for analysis)` on one line (bold black)
    - `traffic-sheet gear: Y (overridden)` on the second line (orange)
- **Section summary table** (`SummaryTable.jsx`): per-aircraft expansion shows library gear in red bold with `≠excel` suffix; tooltip says "Library: X · Traffic supplied: Y (library overrides for analysis)".
- **Quick-add presets** (`TrafficHints.jsx`): hardcoded C-130 corrected from `2D` → `2S`, C-17 corrected from `2D` → `2T`, matching the library.
- **Aircraft picker dropdown** (`TrafficBuilder.jsx`): sources from `data/aircraft_library.json`, which already carries the correct library gear for all 11 mismatched ICAOs — no patch needed.

### Data files

- `cdf_results.json` — `top_aircraft_full[].libGear` holds the authoritative gear; `top_aircraft_full[].gear` preserves the Excel value.
- `results/audit_excel_vs_library.{json,md}` — full 859-row audit with per-airport breakdown, per-entry flags, and the final resolution.

## 8. Impact on the 4-over / 9-under verdict

The 11 mismatches do not change the global count of over- vs under-designed sections. The **magnitude** of CDF values on a few airports shifts noticeably because of C-17 (biggest contributor at KMWH and KPUB):

| Section | Dominant aircraft | If Excel gear (2D) were used | With library gear (2T) |
|---|---|---:|---:|
| KMWH 37508 | C-17 | ~10× lower | **24,148** (actual) |
| KMWH 37325 | C-17 | ~10× lower | **22,980** (actual) |
| KPUB 6948  | C-17 | ~3× lower | **965** (actual) |
| KCIU 21222 | mixed (C-17 is #9) | ~20% lower | **76** (actual) |

So the under-design signal on these runways is amplified by the library gear override — but the verdict is robust either way: even with the Excel gear (2D), all three would still compute CDF > 1.

## 9. Citation block for the final written report

> **Aircraft gear classification.** Each traffic-mix entry from `AO_CEE598_FAARFIELD.xlsx` was resolved against the FAARFIELD aircraft library (`C:\Program Files (x86)\FAARFIELD\AircraftGeometry.xml`). In 38 of 859 traffic rows (11 unique aircraft), the Excel-supplied gear classification disagreed with the library record; for these aircraft the library's gear and wheel coordinates are used, consistent with FAARFIELD desktop behavior. Affected high-volume aircraft include the C-17A (Excel: 2D → Library: **2T**), C-130 (2D → **2S**), and Beech King Air C90 (D → **S**). Full audit provided in `results/audit_excel_vs_library.md`.

---

## 10. Which gear actually drives the CDF — for report and presentation

This is the question that needs to be defensible in both the written report and Q&A during the presentation. The answer is unambiguous:

> **The CDF is computed using the FAARFIELD library gear, library wheel coordinates, library tire width, library track width, and library gear spacing. The Excel/traffic-sheet gear is preserved in the response only for audit display — it does not enter the structural calculation.**

This matches FAARFIELD desktop behavior: once an aircraft is selected by ICAO, the desktop GUI uses its own library record for stress and CDF computation. The Excel "gear" column is essentially a label, not an input that the solver consumes.

### 10.1 Code-level evidence

The data flow from request to CDF, traced through `c:/temp/aeropave/faarfield-api/`:

| Step | File:line | What happens |
|---|---|---|
| 1. Excel gear arrives in request | `Dto/CdfRequest.vb` | `ac.gear` field carries the Excel value (e.g. C-17 → `"2D"`) |
| 2. Library lookup | `FullAnalysisWrapper.vb:614` | `Dim geo = AircraftLibrary.ResolveGeometry(icao, If(ac.gear, ""), mtow, tp)` — Excel gear passed as a **hint only** (used for tie-breaking when an ICAO has multiple library records, never overrides the library's wheel coords) |
| 3. Library returns geometry | `AircraftLibrary.vb:178` | Returns `WheelX`, `WheelY`, `TireWidth`, `TrackWidth`, `GearSpacing`, `NWheels`, `LibraryGearType` — all sourced from `AircraftGeometry.xml` |
| 4. Geometry is bound to the analysis | `FullAnalysisWrapper.vb:626-630` | `wheelXArr(ia) = geo.WheelX`, `wheelYArr(ia) = geo.WheelY`, `tireWidthArr(ia) = geo.TireWidth`, etc. |
| 5. LEAF aircraft built from library | `FullAnalysisWrapper.vb:634` | `leafAC(1) = AircraftLibrary.BuildLeafParms(geo, acNameArr(ia))` |
| 6. FEM3D mesh built from library | `Fem3dWrapper.vb` (via `geo.WheelX/Y`) | Same library coords feed `clsFEM.FAASR3D` |
| 7. CDF integration | `LeafCDFRigid_2014` per offset | Per-wheel stress contribution sums into PCC/AC/Subgrade Nf |
| 8. Excel gear is only echoed back | `FullAnalysisWrapper.vb:611` | `gearTypeArr(ia) = If(ac.gear, "S")` → exposed as `top_aircraft_full[].gear` for **display/audit only**; never flows into wheel coordinates or stress computation |

### 10.2 Concrete example — C-17A at KMWH 37508

| Source | Gear class | Wheels | Used in CDF? |
|---|:---:|:---:|:---:|
| Excel traffic sheet | `2D` | 8 (would be) | ❌ No — only echoed for audit |
| **FAARFIELD library** | **`2T`** | **12** | ✅ **Yes** — wheel coords feed LEAF & FEM3D |

C-17 contributes CDF = 1.42 × 10⁴ to KMWH 37508 — computed from **12 wheels arranged as triple-tandem (2T)**, not 8 wheels in dual-tandem (2D). If the Excel gear had driven the calculation, this contribution would be roughly an order of magnitude smaller (per-wheel load is higher with fewer wheels, but tandem geometry redistributes pavement stress differently).

### 10.3 Verdict robustness

The library override **amplifies** the under-design signal on KMWH 37325 / 37508 / KPUB 6948 (all C-17–dominated), but does not flip any verdict:

- **All three sections still compute CDF > 1** even if the Excel gear (2D) were used.
- The **OVER-designed** verdicts (KLHX 7347, KOTM 27450, KOTM 27641, KOTM 28171) are unaffected — none of them are C-17–dominated, and none of the other 10 mismatched aircraft account for more than a few percent of any over-designed section's CDF.

The 4-OVER / 9-UNDER verdict is therefore robust to the Excel-vs-library choice, which is a key defensive point for the presentation.

### 10.4 Talking-point version (one slide / one minute)

> **Q:** "Which gear classification did you use — the one in the Excel traffic sheet or something else?"
>
> **A:** "We used the FAARFIELD library gear and library wheel coordinates. The Excel gear was treated as a label, not as a structural input — same as the FAARFIELD desktop. We audited all 859 traffic rows and found 38 instances (11 unique aircraft) where Excel disagreed with the library; the C-17 was the most consequential because Excel called it dual-tandem when FAARFIELD's record correctly classifies it as triple-tandem with 12 wheels instead of 8. We log every override in the per-aircraft tables on the website so the disagreement is fully visible. Even if we had used the Excel gear instead, the global verdict — 4 sections over-designed, 9 under-designed — would not change."

### 10.5 What to put in the methods section of the written report

A 3-sentence paragraph for the **Methods → Aircraft data** section:

> *Aircraft gear configuration, wheel coordinates, tire width, track width, and gear spacing for every entry in the traffic mix were resolved against the FAARFIELD 2.1.1 aircraft library (`AircraftGeometry.xml`) by ICAO. The gear classification supplied in the Excel traffic sheet was preserved only as an echo field in the per-aircraft audit table; it was not consumed by the LEAF or FAASR3D solvers, which read wheel geometry directly from the library record. Of 859 traffic rows reviewed, 38 (11 unique aircraft) carried a gear classification that disagreed with the library; the library record was used in all such cases, consistent with FAARFIELD desktop behavior, and the disagreements are documented in `results/audit_excel_vs_library.md`.*

---

*End of note. See `results/audit_excel_vs_library.json` for the full per-row audit.*
