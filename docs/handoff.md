# Session Handoff
Date: 2026-04-23 (full-day session)
Focus: **Pre-cal hydration of saved batch data**, **C-17 gear-label investigation → libGear field added**, **GearFootprintTopView visualization fixes (centroid normalization + correct ω* semantics)**, **NOAA Climate Normals + Berggren frost depth + FAA AC 150/5320-6F frost-protection feature**, **Project Report content audit**, and **single-section rerun infrastructure** to recover from individual-section batch timeouts.

## Headline state

- **CDF verdict:** **4 OVER / 9 UNDER** with the FAA AC 150/5320-6F MOR rule (R = 360 psi) + SCI = 80. Same as yesterday but with a much richer per-section JSON now (full top-10 per-aircraft fields, cdfProfile arrays, libGear field, Phase D-validated FEM stresses).
- **Frost verdict:** **4 compliant / 2 inadequate** (KCIU and KOTM). KOTM is the most interesting because it passes CDF but fails frost — a finding the structural-only analysis missed.
- **One section pending:** KMQJ 8881 timed out in the overnight libGear batch. Currently re-running solo via `scripts/rerun_one_section.py` (background task `b5up88nn3`, ETA 10-25 min). The other 12/13 sections have full new data.

## Completed this session

### 1. Pre-cal hydration of project sections (no spinner on section open)
- `c:/temp/aeropave/src/tabs/DesignTool.jsx` — added `savedRecordToNativeShape()` that converts a saved cdf_results.json record into the live-API shape; on section change, hydrates `nativeCdf` from disk + seeds `lastCdfSignature.current` so the auto-fire useEffect skips the initial backend call. Live recompute still fires the moment any input differs from the saved baseline.
- `flexStr` slider now defaults to the section's saved `mor_psi` (360 for aged PCC), not the FAARFIELD generic 700, so the slider reflects the inputs that produced the displayed CDF.
- Per-aircraft table badge flips between "pre-calculated batch (top 5/10)" (purple) and "native FAARFIELD engine" (green) so the user knows which engine produced the shown numbers.

### 2. Bug fix: spinner appearing when revisiting a section
**Root cause:** the auto-fire useEffect ran twice when sections were switched — first with stale state values (queueing a 2 s timer), then again after React committed the new state. The second run saw signature-matches-baseline and returned early *without canceling* the first timer, so the stale backend call fired anyway.
**Fix:** `nativeCdfTimer.current = clearTimeout(...)` is now performed at the very top of the useEffect, before the signature check. Documented in `DesignTool.jsx`.

### 3. Backend extension: top 10 with FULL per-aircraft fields + cdfProfile arrays
- `Dto/FullAnalysisResponse.vb` — added `libGear` to `AircraftCdfResult` (alongside earlier `geometrySource`, `nWheels`, `tireWidth`, `wheelX[]`, `wheelY[]`, σ_LEAF, σ_FEM, σ_eff, femRatio).
- `FullAnalysisWrapper.vb` — captures `geo.GearType` per aircraft into `libGearArr` and emits in `acResults`.
- `scripts/all_airports_cdf_with_sci_history.py` — `top_aircraft_full` now records all per-aircraft fields including libGear; the section record carries the 41-element `cdf_profile_*` arrays + FEM3D summary stats (`fem_used`, `fem_max_ratio`, `fem_max_ratio_aircraft`, etc.).
- Backend rebuilt 2026-04-23 mid-day, restarted, healthy on port 5100.
- **Overnight batch with new schema completed at ~3:09 PM** (~2.4 hr runtime, FEM enabled). 12/13 sections written; KMQJ 8881 timed out.

### 4. Single-section rerun infrastructure
- `scripts/rerun_one_section.py` — NEW. Posts a single `/api/analysis/cdf` call for one section using the same inputs as the batch script, builds a record matching the new schema, and **merges into `cdf_results.json`** (replaces stale entry, sorts to project order, auto-copies to website data + `cdf_results_sci_history.json`). Used to recover KMQJ 8881 without forcing a full 2.5 hr re-run.
- Currently running for KMQJ 8881 — task `b5up88nn3` started ~14:45, ETA 10-25 min.

### 5. C-17 gear-label investigation → libGear field
**Discovery:** the Excel traffic-sheet entry for C-17 says `gear=2D` (4 wheels), but the actual C-17 Globemaster III has triple-tandem `2T` main gear (12 wheels). FAARFIELD's library correctly stores 2T with 12 wheels at the right coordinates — but the row label in our gear-footprint top-view echoed the misclassified Excel string.
**Fix:** new `libGear` field carries the library's authoritative gear classification distinct from the request-supplied `gear`. Per-aircraft table column shows `libGear`, in red with `≠2D` suffix when the library disagrees with traffic. Tooltip on hover shows both. Per-aircraft footprint row label shows `2T (lib) ≠ 2D (traffic)` in amber when mismatched.

### 6. GearFootprintTopView centroid + ω* semantics fix
**Two bugs found:**
1. **BE9L wheel coords stored asymmetrically in FAARFIELD's library** (`wheelX = [0, −153]`, centroid = −76.5″ instead of 0). The visualization read these raw and shifted BE9L's gear off-center. **Fix:** centroid-normalize each gear before plotting.
2. **Misinterpretation of ω*:** I had been plotting gears at ω* (the controlling lateral offset) and centering the wander envelope on ω*. **Correct interpretation:** ω* is the *peak-CDF evaluation point on the pavement*, NOT where the gear sits. The wander Gaussian is centered on the runway centerline (X = 0) with σ = 30.435; the gear centroid statistically sits at X = 0; ω* is where the outboard wheels happen to land most often during the high-probability region of the wander distribution. **Fix:** gears now plotted with centroid at X = 0; wander envelope ±2σ around X = 0; ω* drawn as a separate green vertical marker labeled "(peak-CDF evaluation point)".
- Caption rewritten to explain the corrected interpretation.
- Added `shape-rendering="crispEdges"` to wander rect and wheels to eliminate sub-pixel rounding asymmetry.
- Aircraft library audit (`scripts/audit_aircraft_centroids.py`) found **BE9L is the ONLY X-asymmetric entry in the entire 136-aircraft geometry library** that affects this project; 8 widebodies (A388, B744/8/SP, IL76, A340-200/300, C-5) have Y-axis asymmetry but none are in project traffic.

### 7. Project Report content audit + corrections
- `Footer.jsx` — replaced "Per-section SCI from construction history" (stale) with "R = 360 psi per FAA AC 150/5320-6F · SCI = 80".
- `SummaryTable.jsx` — section-detail panel relabeled to "Construction history & material inputs"; new "PCC MOR (R) used" row with FAA-AC reference; SCI row clarified to say degradation is captured by R, not SCI; year math now uses `new Date().getFullYear()`.
- `DesignTool.jsx` ChangesSummary — Flex Str baseline now compares against `originalResult.mor_psi` (360 for project sections), not the hardcoded 700, so opening a project section no longer produces a phantom "−340 psi changed" entry.

### 8. NOAA Climate Normals → Berggren frost depth → FAA AC 150/5320-6F treatment
- `scripts/fetch_climate_normals.py` — NEW. Downloads daily TAVG normals (1991–2020) from NOAA NCEI public CSV API for each project airport's nearest GHCN-D station, computes Air Freezing Index (AFI), modified Berggren frost depth `X = K · √AFI` with K coefficients per FAA frost class, and maps to FAA AC 150/5320-6F treatment tier (complete protection / limited penetration / inadequate).
- Station mapping confirmed for all 6 airports: KLHX → Las Animas (`USC00054834`), KPUB → Pueblo Memorial (`USW00093058`), KMQJ → Indianapolis (`USW00093819`), KCIU → Sault Ste Marie (`USW00014847`), KOTM → Burlington proxy (`USW00014931`), KMWH → Moses Lake (`USW00024110`).
- Subgrade frost-class mapping per FAA AC 150/5320-6F Table 3-2 (FG-1 to FG-4) derived from the existing NRCS soil classifications.
- `results/airport_frost_data.json` + auto-copy to `c:/temp/aeropave/src/data/frost_data.json`.
- `c:/temp/aeropave/src/components/FrostPanel.jsx` — NEW. 4-section panel (summary card, AFI×frost-depth chart with frost-class color-coding, per-airport table with click-through to Design Tool, inadequate-section recommendations callout, methodology footer).
- Mounted in Project Report between SubgradeChart and KeyFindings.

### 9. PhD-level frost note for the report
- `note_claude/2026-04-23_Frost_Protection_Analysis.md` — NEW. Comprehensive write-up: methodology, per-airport NOAA station mapping, AFI/frost-depth/FG-class/verdict table, detailed treatment recommendations for the 2 inadequate sites, combined CDF + frost assessment, limitations, 4 references.

## Current State

### Working end-to-end (after browser hard-refresh)
- Backend at localhost:5100 with full DTO including libGear, healthy.
- Website at localhost:5173 with **rich pre-cal hydration**: open any project section → verdict card, bar chart, per-aircraft table (with σ_LEAF/σ_FEM/σ_eff/FEM-LEAF/C/P columns + libGear gear column), CDF profile chart, gear footprint top-view, FEM3D badge — all populated from disk in <1 s, no spinner.
- Live backend fires only when user changes any input (slider, traffic, layer).
- Frost Protection panel renders below SubgradeChart on the Project Report tab.
- 12/13 sections in `cdf_results.json` carry the full new schema (top_aircraft_full + cdfProfile arrays + libGear); KMQJ 8881 currently re-running.

### Built but untested
- The libGear "≠" mismatch warning in the per-aircraft table — would only fire for aircraft where Excel traffic-supplied gear differs from FAARFIELD library gear. Currently 0 mismatches in the 120 saved entries (the C-17 case from KPUB 6948 doesn't appear because it dropped below top-10 with the new MOR rule). To test: pick a searched airport with a traffic mix containing C-17, run live CDF, look for the amber `2T (lib) ≠ 2D (traffic)` flag.
- KOTM and KCIU frost-protection treatment recommendations have not been independently verified against AC 150/5320-6F's actual Figure 3-2 chart — the script uses the simplified `X = K · √AFI` form. For the report this is acceptable as a screening computation; for design final the full Berggren equation with measured soil thermal properties would be needed.

### Broken / Incomplete
- **KMQJ 8881 not in current `cdf_results.json`** — timed out in the overnight batch. Re-running solo via `rerun_one_section.py` task `b5up88nn3`. When that completes, the file becomes 13/13 again at the expected verdict 4 OVER / 9 UNDER (8881 is sister-identical to 8662/8640/8780 which all returned CDF = 18.13).
- **KOTM proxy station** — uses Burlington (~80 mi east) because Ottumwa Industrial AP doesn't have its own NOAA climate-normals station. Documented in the frost note. AFI estimate may be low by ~10 % vs an Ottumwa-specific reading.

## Next Steps (priority order)

1. **Wait for `b5up88nn3` to finish** (KMQJ 8881 rerun). When complete, the `cdf_results.json` returns to 13/13 sections and the verdict is fully restored to 4 OVER / 9 UNDER.
2. **Visual confirmation** of the new gear-footprint top view (gears centered on X = 0 with wander envelope ±2σ around 0; ω* as separate green marker) and frost panel after browser hard-refresh (Ctrl + Shift + R required because Vite caches JSON imports aggressively).
3. **Run the KMQJ 8662 desktop GUI cross-check** per `results/KMQJ_8662_desktop_crosscheck.md`. Outstanding from yesterday — would independently verify the FAA AC 150/5320-6F MOR methodology end-to-end.
4. **Write the final deliverable** (Word .docx via `engineering-report` skill, or a slide deck). The methodological backbone is in place: rewritten KeyFindings, MethodologyTab, SummaryTable, FrostPanel + frost-protection note + KMQJ cross-check recipe. Combined CDF + frost verdict table is in the frost note (Section 6).
5. **(Optional)** MOR sensitivity sweep on KOTM 27641 / 28171 (CDF = 0.94 / 0.96, both within ~5 % of CDF = 1.0). With the frost analysis flagging KOTM as INADEQUATE, the structural margin is moot — frost rehab is required regardless. So this sweep is no longer urgent; if anything the OVER verdict is comfortable in the context of "frost is the design driver here".
6. **(Optional)** Add a frost summary line/badge to the Hero or KeyFindings so the 2-inadequate count is visible at the top of the Project Report.

## Key Decisions (with WHY)

- **Pre-cal hydration via static JSON** — chose this over a live "always re-run" approach because (a) the saved batch already used the desktop-parity FEM engine, so its CDFs are authoritative; (b) opening a section was costing 5–15 min of FEM solve before showing anything; (c) the website still recomputes live the moment the user changes ANY input, so engineering exploration is unaffected. Net: instant verdict display + correct numbers.
- **libGear field added rather than overwriting `gear`** — preserves the user's input (Excel-supplied) while exposing the library's authoritative classification. UI shows the library value in normal use and flags mismatches in red so the user can see Excel-data quality issues.
- **GearFootprintTopView gears centered at X = 0** — matches FAARFIELD's wander statistic (gear centroid is N(0, σ²) about the centerline). Earlier interpretation (gears at ω*) was wrong — ω* is the peak damage point on the pavement, not the gear position. The corrected visualization shows engineers WHY peak damage occurs at ω* (because the outboard wheel of a wide-track aircraft lands there).
- **Frost-protection feature is screening-grade, not final design** — uses simplified `X = K · √AFI` rather than the full modified Berggren equation. Documented as such in the methodology footer + report note. For final design, project would commission frost-heave testing per ASTM D5918.
- **KOTM proxy is Burlington** (80 mi east) — documented as the closest available NOAA climate-normals station; a slightly north-of-Ottumwa station would also work but Burlington is the only nearby airport-class station with a complete 1991–2020 record.
- **Auto-fire timer must be cleared at the top of the useEffect**, NOT inside the change-detection branch — otherwise stale-state fires queue timers that never get canceled. Subtle React state-batching issue worth remembering.

## Dead Ends to Avoid

- **Don't read `gear` from the Excel traffic data and trust it for visualization** — it can be misclassified (C-17 example: Excel says 2D = 4 wheels, library has 2T = 12 wheels). Always cross-check with the library's `geo.GearType` (now exposed as `libGear`).
- **Don't shift the gear to ω* in any wander-related visualization** — ω* is the evaluation point on the pavement that receives peak damage, not where the gear physically sits. The wander statistic is centered on the runway centerline, not on ω*.
- **Don't compute centroid from the raw library wheel coords for plotting without normalization** — some library entries (BE9L confirmed; 8 widebody entries also asymmetric in Y) store gears in a gear-local frame. FAARFIELD's solver re-centers internally via `xCenter`; visualization code must do the same.
- **Don't trust `cp1252` console encoding when running scripts on Windows** — `→`, `°`, etc. cause `UnicodeEncodeError`. Use plain ASCII or set `PYTHONIOENCODING=utf-8` or invoke `py -X utf8`.
- **Don't issue NOAA NCEI CDO API requests without a token** if you need historical raw data — but the **Climate Normals daily CSV downloads are public and tokenless**, which is the route we used. Endpoint pattern: `https://www.ncei.noaa.gov/data/normals-daily/1991-2020/access/<station>.csv`.

## Open Questions / Blockers

- [ ] Will KMQJ 8881 rerun (`b5up88nn3`) succeed within 30-min FEM timeout? It failed once in the overnight batch — if it fails again, fall back to copying the 8662 record and renaming `section_id` (sister-identical structure & traffic).
- [ ] Should the Hero / KeyFindings get a "frost-protection: 4/2" badge alongside the existing CDF "4/9" badge? Or keep frost as a Project Report-only section?
- [ ] Final report format — Word `.docx` via `engineering-report` skill, slide deck, or both? Brief email asking about presentation requirements may be overdue.

## Files Modified / Created This Session

### Backend (`c:/temp/aeropave/faarfield-api/`)
- `Dto/FullAnalysisResponse.vb` — added `libGear` field on `AircraftCdfResult`.
- `FullAnalysisWrapper.vb` — captures `geo.GearType` per aircraft → `libGearArr`, emits in `acResults`.
- Rebuilt + restarted (PID 39300 currently).

### Scripts (`scripts/`)
- `all_airports_cdf_with_sci_history.py` — extended `top_aircraft_full` with `libGear` + full per-aircraft fields (cdfProfile, σ_LEAF/FEM/eff, wheel coords, geometrySource); section record now carries `cdf_profile_*` arrays and FEM3D summary stats.
- `audit_aircraft_centroids.py` — NEW. Library-wide audit of wheel-coordinate centroid offsets.
- `fetch_climate_normals.py` — NEW. NOAA Climate Normals → AFI → Berggren → FAA frost-protection assessment.
- `rerun_one_section.py` — NEW. Single-section rerun + merge utility for recovering from individual-section batch timeouts.

### Frontend (`c:/temp/aeropave/src/`)
- `tabs/DesignTool.jsx` — pre-cal hydration via `savedRecordToNativeShape()`; section-change auto-fire bug fix (clearTimeout at top); per-aircraft table libGear column + mismatch badge; ChangesSummary baseline now uses saved `mor_psi`.
- `components/GearFootprintTopView.jsx` — centroid-normalize gears, center wander envelope on X=0, ω* as separate marker; libGear in row label; `shape-rendering="crispEdges"`; caption rewritten to explain ω* semantics.
- `components/FrostPanel.jsx` — NEW. Project Report frost-protection panel.
- `tabs/ProjectReport.jsx` — mounts `FrostPanel` between SubgradeChart and KeyFindings.
- `components/Footer.jsx` — methodology line updated to FAA AC 150/5320-6F R=360 + SCI=80.
- `components/SummaryTable.jsx` — section-detail "Construction history & material inputs" panel updated; MOR row added; SCI row clarified.

### Data (`c:/temp/aeropave/src/data/`)
- `cdf_results.json` — overwritten from overnight batch (12/13 sections with rich new schema; 8881 still rerunning).
- `frost_data.json` — NEW. Frost analysis output for 6 airports.

### Results (`results/`)
- `cdf_results.json` + `cdf_results_sci_history.json` — overwritten 2026-04-23 15:19 with rich new schema.
- `airport_frost_data.json` — NEW.
- `aircraft_centroid_audit.json` + `aircraft_centroid_audit.md` — NEW. Library audit results.

### Notes (`note_claude/`)
- `2026-04-23_Frost_Protection_Analysis.md` — NEW (12.7 KB). PhD-level frost write-up for the report.

### Docs (`docs/`)
- `decisions.md` — earlier methodology-pivot entry preserved; this session's changes captured here in the handoff.
- `handoff.md` — this file.
- `todo.md` — earlier 4-item next-steps list (still relevant: visual confirmation, KMQJ desktop cross-check, final report, optional MOR sensitivity).
