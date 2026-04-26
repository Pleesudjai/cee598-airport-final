# Session Handoff
**Date:** 2026-04-25 (late evening session — visual polish + GitHub Aeropave repo + mobile-responsive)
**Focus:** Final visual polish (frost band viz, verdict badges, soil-tan subgrade card, gear-label simplification across all components, frost-panel blue/gray bars) → CDF-vs-PCI scatter rebuild (raw PCI on Y, auto-staggered labels) → distress-breakdown improvements (other=green, grayscale severity legend, load-fraction pill bar) → button-label clarification across airport + section rows → added co-authors Can Atakan Ozturk + Kai Halland → mobile-responsive layout pass → created `Pleesudjai/Aeropave` GitHub repo for Netlify deploy → pushed full session changes to `Pleesudjai/cee598-airport-final` for multi-machine sync.
**Earlier this same day:** afternoon — gear-trace audit + unified ProjectSummary panel + field-validation + final report/slides. See "Earlier session 2026-04-25 — afternoon (gear-trace audit + unified panel + final deliverables)" below.
**Even earlier today:** morning — fresh-machine bring-up (FAARFIELD .msi install). See further below.
**Previous session:** 2026-04-24 (KMWH split rerun, gear audit). See further below.

---

## This session (2026-04-25 late evening)

### Completed

**Frontend visual polish** ([c:/temp/aeropave/src/](../../../../../../temp/aeropave/src/)):
- `CrossSectionSmall.jsx` — added blue thermometer-style FROST band on the right of every section diagram. Linear-gradient fill (light → deep blue) with snowflake icon, "FROST X.X″" label, and pill-style status badge below ("✓ in pavement" green / "⚠ subgrade risk" red). ViewBox extended 360×180 → 430×200 to fit. Frost depth from NOAA Climate Normals 1991-2020 + modified Berggren equation, looked up per airport from `frost_data.json`.
- `ProjectSummaryUnified.jsx` — multiple iterations:
  - Verdict badge text now adapts: `3/3 OVER` (green) / `4/4 UNDER` (red) / `1 OVER · 1 UNDER` (mixed) instead of always `X/Y OVER`.
  - Soil-tan themed Subgrade card matching cross-section subgrade band color.
  - Renamed "Open →" button → "Read details ▾" (in-place expand) + "Design Tool →" (navigate); later removed Design Tool button from airport-level row entirely so it only appears on per-section cards.
  - Added "ctrl: PCC Fatigue" italic label so it reads as metadata, not a button.
  - Same convention applied to per-section card row.
- `PerSectionDetail.jsx` — top-aircraft table capped at top 10 (was 20). Gear column simplified: shows library value only (no more "≠excel" mismatch indicator).
- `DesignTool.jsx`, `GearFootprintTopView.jsx`, `SummaryTable.jsx` — gear label simplified consistently across all per-aircraft views.
- `KeyFindings.jsx` — "Design Recommendations" panel hidden via `{false && …}` wrapper (preserved in source for future re-enable).
- `Hero.jsx` — added co-authors Can Atakan Ozturk and Kai Halland; mobile-responsive layout (`grid-cols-1 lg:grid-cols-12`, badges stack 2-col on mobile).
- `App.jsx` — header padding responsive (`px-3 sm:px-8`), main padding `px-3 sm:px-6 lg:px-8`.

**CDF-vs-PCI scatter rebuild** ([CdfVsPciScatter.jsx](../../../../../../temp/aeropave/src/components/CdfVsPciScatter.jsx)):
- Removed Load-adjusted/Total toggle; Y-axis is now raw PCI (0–100, higher=better).
- Y-axis ticks: 0, 10, 20, …, 100 (clean round numbers; PCI=70 falls on a gridline).
- Quadrant tints flipped: green tint upper-left (predicted+observed adequate), red tint lower-right (predicted+observed under).
- "PCI = 70 (FAA M&R trigger)" label moved to `insideTopLeft` (was `insideBottomRight`, overlapping KMWH dots).
- "CDF = 1" label kept at top (vertical reference line).
- Dot label auto-staggering: lane-assignment algorithm clusters points within 0.5 log-decade and 8 PCI; offsets via 6-lane scheme (24, -20, 44, -40, 64, -60). Edge-aware: PCI > 88 forces all-below lanes (no collision with CDF=1 top label); PCI < 12 forces all-above. Faint dashed connector lines for offsets > 24 px.

**Distress breakdown improvements** ([DistressBreakdownChart.jsx](../../../../../../temp/aeropave/src/components/DistressBreakdownChart.jsx)):
- "Other" category color changed gray → green (load=red / climate=blue / other=green).
- Severity legend swatches now use neutral grayscale (`#e5e7eb` → `#6b7280` → `#1f2937`) so saturation = severity is unambiguous and independent of category hue.
- Load-vs-Non-Load deduct-share bar pill text: widened pill (96 px), `whitespace-nowrap`, lower text-display thresholds for narrow segments.
- Always-visible "Load X.X% / Non-load Y.Y%" labels below the bar regardless of segment width.

**FrostPanel chart**:
- Was all blue (sky-300/400/600/900) for both bars — visually indistinguishable.
- Now: Berggren frost depth = solid blue (`#1d4ed8`) · Total pavement section = solid gray (`#9ca3af`). Caption updated to reference the new colors.

**Mobile-responsive layout pass**:
- All key components now use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`).
- Hero stacks vertically on mobile; airport rows wrap with non-essential text hidden (`hidden sm:inline`, `hidden md:inline`).
- Section card row: `Design Tool →` compacts to `Tool →` on mobile.
- PerSectionDetail: `grid-cols-1 lg:grid-cols-12` so CDF breakdown stacks above top-aircraft table on mobile; per-aircraft table wrapped in `overflow-x-auto`.

**GitHub deployment**:
- Created **`Pleesudjai/Aeropave`** new repo specifically for Netlify deploy. Frontend-only mirror — no backend, no notes, no specs, no results. Includes `netlify.toml` with build settings and SPA-friendly redirects + cache headers. 6 commits to date covering all the late-afternoon UI changes:
  1. `38e1904` Initial commit
  2. `8ecfc50` Clarify airport row buttons (Read details / Design Tool →)
  3. `1adee47` Apply convention to per-section card row
  4. `8335563` Remove Design Tool button from airport row
  5. `c23255f` Add team co-authors to Hero byline
  6. `65aa3ad` Mobile-responsive layout pass
- Pushed full session work to **`Pleesudjai/cee598-airport-final`** main branch (commit `fb1d216`): 40 files changed including all backend + frontend + notes + specs + scripts + results.

### Current State

#### Working end-to-end
- Backend `FaarfieldApi.exe` running at localhost:5100 with new `/api/diag/gear-trace` endpoint.
- Frontend Vite dev server at localhost:5173 with all current visual polish applied.
- 13/13 sections render correctly with frost-band overlay; verdict badges show dominant condition; gear labels uniform across views.
- CDF-vs-PCI scatter renders cleanly with no overlapping labels and PCI=70 reference label fully visible.
- ProjectSummaryUnified airport rows + section cards render mobile-responsive (verified at 375 px wide via Tailwind classes).
- Two GitHub repos in sync: `cee598-airport-final` (full project) + `Aeropave` (frontend-only Netlify mirror).

#### Built but untested
- **Netlify deploy** of `Pleesudjai/Aeropave` repo — `netlify.toml` is in place, but the user has not yet connected the repo to Netlify. Should auto-deploy on push once connected.
- **Multi-machine git pull workflow** — pushed to `cee598-airport-final` from this machine; the other machine has not been tested yet.

#### Broken / Incomplete
- **Pre-bake stress endpoints** (LEAF grid + LEAF point + FEM3D mesh) — not done; stress visualizations only work when backend is running. Remains optional Netlify enhancement (~3.5 hr).
- **KMQJ 8662 desktop FAARFIELD CDF cross-check** — recipe at `results/KMQJ_8662_desktop_crosscheck.md`; not executed (Phase D FEM-stress crosscheck did pass at 4580/4580 elements within 0.1% — that's the validated parity claim).

### Next Steps (priority order)
1. **(User task) Connect `Pleesudjai/Aeropave` to Netlify** — sign in at https://app.netlify.com/, "Add new site" → "Import from GitHub" → pick the repo. `netlify.toml` auto-fills build command (`npm run build`) and publish directory (`dist`). Free tier supports private repos with GitHub auth.
2. **(User task) Practice the presentation** — `results/CEE598_Final_Slides_PleesudjaiC.pptx` (18 slides, 16:9). Suggested ~15-min flow: scope (3) → CDF intro (4) → why AeroPave (5) → architecture (6) → CDF math (7-9) → verdicts (10) → headlines (11-12) → field validation (13) → methodology evidence (14-15) → limitations + conclusions (16-17).
3. **(User task) Test multi-machine workflow** — on the other computer: `git clone https://github.com/Pleesudjai/cee598-airport-final.git` → robocopy `website/` → `c:/temp/aeropave/` → install FAARFIELD .msi (one-time) → msbuild → npm install → run two terminals.
4. **Optional: Pre-bake stress endpoints** for full Netlify static deploy (LEAF grid + LEAF point + FEM3D mesh JSONs). ~3.5 hr; would make stress visualizations work without backend.

### Key Decisions (with WHY)

- **Library gear is authoritative; UI shows ONLY the library value.** Reason: the CDF computation uses the library's wheel coords regardless of the Excel `gear` column. Showing both with a "≠excel" indicator was confusing the user. Mismatch is documented in `note_claude/2026-04-24_Gear_Mismatch_Excel_vs_FAARFIELD_Library.md` instead.
- **Removed Design Tool button from airport-level row.** Reason: the airport-level button opened the FIRST section, which isn't always what the user wanted. Per-section cards have their own Design Tool button that goes to the EXACT section.
- **CDF-vs-PCI scatter uses raw PCI on Y-axis, not deduct.** Reason: easier to reason about (higher = better), and the M&R trigger lines up at PCI=70.
- **Quadrant tints flipped to green-upper-left + red-lower-right.** Reason: matches the new Y-axis (high PCI = good = green; low PCI = bad = red).
- **"Other" distress category = green.** Reason: distinct from red (load) and blue (climate); avoids confusion with the gray severity ramp in the legend.
- **Severity legend swatches use grayscale.** Reason: visually unambiguous that "saturation = severity, hue = category". Original used red ramp (load.L/M/H) which conflated the two axes.
- **Frost band as side thermometer (not bracket).** Reason: more visualization-y per user request; looks like a depth gauge with snowflake + gradient + status pill.
- **Created separate Aeropave repo for Netlify** instead of pointing Netlify at cee598-airport-final/website. Reason: cleaner deploy story (no .vb files in the public deploy repo), and the cee598-airport-final repo's website folder is a SUBFOLDER which Netlify build config handles awkwardly.

### Dead Ends to Avoid

- **Don't push frontend changes to Aeropave repo from another machine without first updating cee598-airport-final/website/.** The two repos are NOT auto-mirrored. Editing Aeropave directly would create divergence. Treat cee598-airport-final as the single source of truth; Aeropave is a one-way deploy mirror.
- **Don't use Dropbox alone for the .git folder sync between machines.** Dropbox can sync mid-write and corrupt the .git/objects/ tree. Always use GitHub as the canonical history; Dropbox only for files outside .git (FAARFIELD installer, datasets, scratch notes).
- **Don't sum m and m² distress quantities together.** Header counts in DistressBreakdownChart now split by unit; previously summed them which is meaningless (linear cracks vs area distress are different physical quantities).
- **Don't use Recharts default `<Legend />` with per-cell custom-colored bars.** Recharts can't infer a single legend swatch when each bar has a different fill via `<Cell>`; renders blank dark squares. Use a custom HTML legend block instead.
- **Don't pass position="left" / "insideBottomRight" for ReferenceLine labels in regions with dots.** They overflow the plot or overlap data. Use `insideTopLeft` for empty quadrants.

### Open Questions / Blockers

- [ ] User to confirm Netlify deploy URL once `Pleesudjai/Aeropave` is connected. Suggest renaming the auto-generated subdomain to something like `aeropave-cee598.netlify.app`.
- [ ] User to verify mobile layout on actual iPhone (Tailwind responsive classes are tested by spec; physical-device confirmation is good practice).
- [ ] Should the `mendeley_import_refs/` folder (12 MB of FRC research PDFs in Dropbox) be tracked in cee598-airport-final? Current decision: NOT tracked (unrelated to the airport project; scratch reference material).

### Files Modified This Session

**Frontend** (`c:/temp/aeropave/src/`):
- `App.jsx` — responsive header/main padding
- `components/Hero.jsx` — co-authors + mobile-responsive grid
- `components/ProjectSummaryUnified.jsx` — verdict badge text, button labels, soil-tan subgrade, mobile-wrap, removed Design Tool button at airport level
- `components/PerSectionDetail.jsx` — capped at top 10 aircraft, gear label simplified, mobile-responsive grid
- `components/CrossSectionSmall.jsx` — frost band thermometer visualization
- `components/CdfVsPciScatter.jsx` — Y-axis = raw PCI, lane-stagger labels, edge-aware lanes, label position
- `components/DistressBreakdownChart.jsx` — other=green, grayscale severity legend, pill-bar text fix
- `components/FrostPanel.jsx` — blue/gray bars (was all-blue)
- `components/GearFootprintTopView.jsx` — gear label simplified
- `components/KeyFindings.jsx` — Design Recommendations panel hidden
- `components/SummaryTable.jsx` — gear label simplified (legacy file)
- `tabs/DesignTool.jsx` — gear label simplified
- `lib/distressClassification.js` — other category palette = green; SEVERITY_GRAYSCALE export

**Repo:** `Pleesudjai/Aeropave` (new this session):
- 6 commits cumulative; latest = `65aa3ad` "Mobile-responsive layout pass"

**Repo:** `Pleesudjai/cee598-airport-final` (synced this session):
- Commit `fb1d216` "Session 2026-04-25: gear-trace audit + unified panel + field validation + final report/slides"
- 40 files changed (3 new backend, 7 new frontend, 3 notes, 4 specs, 3 deliverables, 14 modifications)

---

## Earlier session 2026-04-25 — afternoon (gear-trace audit + unified panel + final deliverables)
*(Original heading was "This session (2026-04-25 afternoon/evening)" — re-titled when the late-evening session was added above.)*

### Goal

---

### Afternoon detail (preserved from earlier draft)

### Goal
Produce the final report deliverable for the upcoming CEE 598 class presentation; finish the field-validation UI; close out remaining methodology specs.

### What was completed

**1. Gear-coordinate trace audit (specs/gear-coordinate-trace-audit.md fully executed)**
- New backend endpoint `POST /api/diag/gear-trace` ([c:/temp/aeropave/faarfield-api/GearTraceWrapper.vb](../../../../../../temp/aeropave/faarfield-api/GearTraceWrapper.vb), Dto/GearTraceRequest.vb, Dto/GearTraceResponse.vb).
- New public delegate `Fem3dWrapper.RunPrepDiagnostic` for snapshotting Stages 6/7 without triggering a full FEM solve.
- Added route + handler in HttpRouter.vb; updated FaarfieldApi.vbproj compile list. Clean rebuild.
- Driver script [scripts/audit_gear_coordinate_trace.py](../scripts/audit_gear_coordinate_trace.py) iterates the top 10 aircraft × 13 sections (130 rows) and writes the Excel.
- **Output:** [results/gear_coordinate_trace_audit.xlsx](../results/gear_coordinate_trace_audit.xlsx) — 5 sheets (Summary, WheelByWheel, Discrepancies, Provenance, MethodologyEvidence). **0 LEAF/CDF/FEM-pre divergences across 130 rows at 1×10⁻⁶″ tolerance.**

**2. Unified ProjectSummary panel (specs/unified-project-summary-panel.md fully executed)**
- New `src/components/ProjectSummaryUnified.jsx` replaces `SummaryTable` + `Per-Airport Detail` with one airport-grouped expandable panel.
- Extracted `src/components/CrossSectionSmall.jsx` and `src/components/PerSectionDetail.jsx` as shared subcomponents.
- Section cards: cross-section diagram inline, click to drill down (CDF breakdown + top-10 aircraft + PCI history + distress breakdown).
- Visual polish: chevrons, expand-all/collapse-all, sticky widths, soil-tan Subgrade card matching the SVG.
- Per user feedback: chart row ordered ABOVE per-section detail; per-section table capped at top 10 aircraft.

**3. Field-validation panel (specs/distress-trend-vs-cdf-panel.md fully executed with ASTM D5340 framing)**
- New `src/lib/distressClassification.js` — categorizes the 10 codes that actually appear in the project data (codes 41–57, AC overlay distresses) into load / climate / other; ASTM D5340 7-band reference areas.
- New `src/components/PciHistoryChart.jsx` — Recharts line chart with the 7 D5340 bands, construction-date marker, dots colored by `pct_load`.
- New `src/components/DistressBreakdownChart.jsx` — stacked-severity bar chart with category color (red/blue/green) × saturation (severity). Header now splits totals by unit (m vs m²) since they cannot be summed. Includes Load-vs-Non-Load deduct-share bar (Option A from the load-vs-climate discussion) and a 2-axis legend (category × severity in grayscale).
- New `src/components/CdfVsPciScatter.jsx` — the field-validation centerpiece. X = predicted CDF (log scale), Y = load-adjusted deduct = `(100 − PCI) × pct_load/100`. 13 dots, color = OVER/UNDER, amber outline = rehab artifact (KOTM 27450/27641) or special note (KMWH 37325/37508). Quadrant tints, CDF=1 reference line, deduct=30 line.
- New `src/components/FieldValidationPanel.jsx` — wraps the scatter with paste-ready methodology paragraph citing ASTM D5340-12 + FAA AC 150/5380-6C/7B.
- Wired into `tabs/ProjectReport.jsx` (panel above DataSources) and into ProjectSummaryUnified expanded section detail.

**4. Distress classification audit + bug fix**
- Audited the actual distress codes in `pci_distress_data.json` — only 10 codes appear (41 alligator cr, 42 bleeding, 45 depression, 47 jt-ref cr, 48 l/t cr, 50 patch/ut cut, 52 raveling, 54 shoving, 56 swelling, 57 weathering). The library JSON's `distress_codes` dict uses different (incorrect) labels for these codes.
- Replaced `DISTRESS_CATEGORY` in distressClassification.js with the audited correct mapping (7 of 10 codes had been mis-categorized as "other" before).
- Added `CODE_LABELS` override using the records' actual `desc` field; chart x-axis now shows readable names (Alligator Cr, JT Ref Cr, Weathering, …) instead of numeric codes.
- Header counts split by unit (m linear cracks vs m² area distress) — these were being summed together which is meaningless.

**5. Methodology notes added to `note_claude/`**
- [`2026-04-25_Gear_Coordinate_Trace_Audit_Results.md`](../note_claude/2026-04-25_Gear_Coordinate_Trace_Audit_Results.md) — 130-row audit results, AeroPave-vs-desktop superiority section, FAA_ACD provenance handling section, paste-ready report paragraphs.
- [`2026-04-25_PCI_vs_CDF_Field_Validation_Analysis.md`](../note_claude/2026-04-25_PCI_vs_CDF_Field_Validation_Analysis.md) — per-section CDF vs PCI table, why most sections are climate-dominated, 5 narrative categories (direct validation / partial / rehab artifact / cleanest negative / sub-surface lag), suggested methodology + limitations paragraphs.
- [`2026-04-25_Per_Section_Traffic_and_Layer_Tabulation_Findings.md`](../note_claude/2026-04-25_Per_Section_Traffic_and_Layer_Tabulation_Findings.md) — KMWH 37325/37508 traffic allocation analysis (C-17 identical at 895.5/yr at both; secondary aircraft differ), KMQJ 8881 layer label inconsistency, combined data-quality methodology paragraph.

**6. Final deliverables — report + slides**
- [scripts/generate_final_report.py](../scripts/generate_final_report.py) → [results/CEE598_Final_Report_PleesudjaiC.docx](../results/CEE598_Final_Report_PleesudjaiC.docx) — 12 numbered sections + 2 appendices. CDF flowchart (input→output ASCII art) is § 2; the three Nf equations are § 3; per-section verdict table is § 5; field validation is § 7; data-quality observations § 8; AeroPave-vs-desktop comparison § 9. **§ 6.2 expanded** per user request to detail the 4 proxy tiers that fired (xml / proxy_override / family_proxy / nearest_proxy), the 4-component scoring formula (gear +20, ICAO +30, manufacturer +8, family +5, MTOW tie-breaker), pseudocode of the selection loop, and 8 concrete examples.
- [scripts/generate_final_slides.py](../scripts/generate_final_slides.py) → [results/CEE598_Final_Slides_PleesudjaiC.pptx](../results/CEE598_Final_Slides_PleesudjaiC.pptx) — **18 slides 16:9** mirroring the report. Includes a dedicated "Why AeroPave? Why not just FAARFIELD desktop?" slide (#5) per user request, with 3 problem/solution panels (library coverage, audit trail, speed). Both scripts are re-runnable and rebuild from `cdf_results.json` + `note_claude/` automatically.

### Current state on this machine

| Path | Purpose | Status |
|---|---|---|
| `c:\temp\aeropave\` | Frontend dev tree (Vite + React) | Running on port 5173 |
| `c:\temp\aeropave\faarfield-api\bin\x86\Release\FaarfieldApi.exe` | Backend with new gear-trace endpoint | Running on port 5100 |
| `c:\temp\aeropave\src\components\ProjectSummaryUnified.jsx` | Unified report panel | NEW |
| `c:\temp\aeropave\src\components\CrossSectionSmall.jsx`, `PerSectionDetail.jsx` | Shared subcomponents | NEW |
| `c:\temp\aeropave\src\components\PciHistoryChart.jsx`, `DistressBreakdownChart.jsx`, `CdfVsPciScatter.jsx`, `FieldValidationPanel.jsx` | Field-validation panels | NEW |
| `c:\temp\aeropave\src\lib\distressClassification.js` | ASTM D5340 categorization helper | NEW |
| `c:\temp\aeropave\src\data\pci_distress.json` | Field PCI/distress data (49 KB, 13 sections, 58 inspections, 187 records) | NEW |
| `c:\temp\aeropave\faarfield-api\GearTraceWrapper.vb` + `Dto\GearTrace*.vb` | Diagnostic trace endpoint backend | NEW |
| `results/CEE598_Final_Report_PleesudjaiC.docx` | Final report (55 KB) | NEW — review before submission |
| `results/CEE598_Final_Slides_PleesudjaiC.pptx` | 18-slide deck (69 KB) | NEW — review before presentation |
| `results/gear_coordinate_trace_audit.xlsx` | 130-row methodology audit (70 KB) | NEW |

### Specs status

| Spec | Status |
|---|---|
| [embed-faarfield-source-projectref.md](../specs/embed-faarfield-source-projectref.md) | **deferred** (Roslyn vbc blocker; pivoted to .msi this morning) |
| [gear-coordinate-trace-audit.md](../specs/gear-coordinate-trace-audit.md) | **executed** (this session) |
| [unified-project-summary-panel.md](../specs/unified-project-summary-panel.md) | **executed** (this session) |
| [distress-trend-vs-cdf-panel.md](../specs/distress-trend-vs-cdf-panel.md) | **executed** (this session) — spec updated with ASTM D5340 framing before execution |

### What's pending

1. **Open report + slides in Word/PowerPoint and review narrative.** Both files were written from scratch by Python scripts; the engineer should read through and make any wording adjustments directly in the editors. Re-running the scripts overwrites manual edits.
2. **Practice the presentation.** Deck flow is: scope (3) → CDF intro (4) → why AeroPave (5) → architecture (6) → flow + math (7–9) → verdicts (10) → headlines (11–12) → field validation (13) → methodology evidence (14–15) → limitations + conclusions (16–17). Suggested ~15 min budget.
3. **Optional polish before presentation:**
   - Tonight's deferred task: pre-bake stress endpoints (LEAF grid, LEAF point, FEM3D mesh) into `src/data/precal/` so the entire site works offline → enables Netlify static deploy as a permanent shareable URL. ~3.5 hr.
   - Run KMQJ 8662 desktop FAARFIELD cross-check (recipe at [results/KMQJ_8662_desktop_crosscheck.md](../results/KMQJ_8662_desktop_crosscheck.md)) for an additional CDF-level parity check beyond Phase D's stress-field check.

### Class-presentation startup recipe (next time)

```cmd
:: Terminal 1 — backend
c:\temp\aeropave\faarfield-api\bin\x86\Release\FaarfieldApi.exe

:: Terminal 2 — frontend
cd /d c:\temp\aeropave && npm run dev
```

Open `http://localhost:5173` in browser. Both files in `results/` are also self-contained for the presentation if you don't want to demo the live tool.

### Decisions made (with WHY)

- **Excel-vs-library gear mismatches: don't fix the Excel.** Reason: the mismatch IS the methodology finding — both FAARFIELD desktop and AeroPave key on ICAO and ignore the Excel `gear` column at the analysis stage; "fixing" the Excel hides the finding and changes the input data that future runs use.
- **Use ASTM D5340 (NOT D6433).** Reason: this is an airport project; D5340 is the airport-specific standard. Verified by the actual distress codes in the dataset (codes 21–38 PCC slab distresses are D5340-only). Cited in [`2026-04-25_PCI_vs_CDF_Field_Validation_Analysis.md`](../note_claude/2026-04-25_PCI_vs_CDF_Field_Validation_Analysis.md).
- **Use load-adjusted deduct (not raw PCI) as the CDF-validation metric.** Reason: FAARFIELD predicts load damage only; PCI captures total surface deterioration including climate and other. The right comparison is `(100 − PCI) × pct_load/100`, the load-attributable share — which is what the airport's PMS computes via D5340 deduct curves. Documented + paste-ready paragraph in the audit-results note.
- **Header counts in Distress Breakdown chart split by unit (m vs m²).** Reason: linear meters of cracking cannot be summed with square meters of area distress — different physical quantities. Header was originally summing them, producing meaningless totals like "Other 5844". Now displays separately.
- **Chart row above section cards in Unified panel.** Reason: airport-level summary (CDF chart + soil + traffic) gives context BEFORE drilling into per-section detail. Top-down narrative.
- **Other category color = green.** Reason: distinct from red (load) and blue (climate); avoids confusion with the gray severity ramp.

### Dead ends to avoid

- **Don't modify the FAA source code at `c:\temp\faarfield-source\`.** Methodology claim depends on "untouched FAARFIELD source." Wrapper code in `c:\temp\aeropave\faarfield-api\` is fair game (we wrote it).
- **Don't bypass the Excel `gear` column inconsistencies by editing the input data.** Both tools ignore that column at runtime; "fixing" the Excel obscures the finding documented in the gear-mismatch note.
- **Don't add a Recharts default `<Legend />` to the DistressBreakdownChart.** Bars use per-cell custom fills; Recharts can't infer a single legend swatch and renders 3 squares all in default dark color (the bug surfaced in the morning). Use the custom legend block instead.
- **Don't try to add `pct_climate` and `pct_other` separately to the load-fraction bar.** The PMS only emits `pct_load` (load vs non-load); splitting non-load into climate vs other would require recomputing deduct values from raw distress records using ASTM D5340 deduct curves (not in scope).

---

## Earlier session 2026-04-25 — fresh-machine bring-up

### Goal
Bring up AeroPave on this fresh Windows machine for the upcoming class presentation.

### What was attempted first — and why it failed
Followed [specs/embed-faarfield-source-projectref.md](../specs/embed-faarfield-source-projectref.md) (Plan B: build FAARFIELD from source, no .msi install). Phases 0–3 went cleanly — staged source at `c:/temp/faarfield-source/`, edited `FaarfieldApi.vbproj` to ProjectReferences, created `FaarfieldApi.sln`, added `Directory.Build.targets` to handle the AMClassLib FAAMeshClassLib HintPath quirk. **Phase 4 (build) hit a hard tooling blocker:** the FAA source uses `NameOf(...)` (VB.NET 14+) but this machine has only legacy `Framework\v4.0.30319\vbc.exe` (pre-Roslyn). Build failed with `error BC30451: 'NameOf' is not declared` across ~50 sites in `FaarFieldModel`.

Cure would be installing .NET SDK 8 (~250 MB) or VS Build Tools (~2–5 GB). Decision: **pivot to FAARFIELD .msi install** instead — comparable install friction, *stronger* methodology claim (bit-identical FAA binaries vs. self-compiled), and rolls back cleanly. Spec marked `status: deferred` with full context preserved for a future no-FAARFIELD-install machine that has the SDK.

### What's now working

**FAARFIELD installed at `C:\Program Files (x86)\FAARFIELD\`** — 34 DLLs, including the 8 referenced by `FaarfieldApi.vbproj` plus the FF2 desktop GUI.

**Backend built and running:**
- `c:\temp\aeropave\faarfield-api\bin\x86\Release\FaarfieldApi.exe` — clean build (`exit=0`, only late-bound resolution warnings on Object types)
- `GET http://localhost:5100/api/health` returns:
  ```
  {"status":"ok","version":"0.3.0",
   "leafAvailable":true,"femAvailable":true,
   "fem3dAvailable":true,"analysisAvailable":true,
   "nike3dAvailable":false,
   "aircraftCount":1310,"aircraftWithGeometry":136}
  ```
- All 4 engines available; enriched aircraft library loaded.

**Frontend built and running:**
- `npm install` clean (381 packages, 0 vulnerabilities)
- `npm run dev` → Vite 8.0.8 ready in 244 ms at `http://localhost:5173/`
- Returns HTTP 200

### A + B architecture verified

The user's intent — pre-cal'd 13 sections (instant) + live recompute for any other airport (with spinner) — is the *current* design and now operational on this machine. Project airports load from `cdf_results.json` instantly; arbitrary airports / slider drags / FEM toggles route to the live backend.

### Current local state on this machine

| Path | Purpose | Status |
|---|---|---|
| `C:\Program Files (x86)\FAARFIELD\` | FAA DLLs | Installed via .msi |
| `c:\temp\aeropave\` | Frontend dev tree (vite + React) | Active, `npm run dev` running |
| `c:\temp\aeropave\faarfield-api\` | Backend source + bin | Built, `FaarfieldApi.exe` running |
| `c:\temp\aeropave\faarfield-api\FaarfieldApi.vbproj` | Active wrapper project (binary HintPaths) | Restored from .bak-msi-hintpaths backup |
| `c:\temp\aeropave\faarfield-api\FaarfieldApi.vbproj.bak-msi-hintpaths` | Pre-edit backup (audit trail) | Preserved |
| `c:\temp\aeropave\faarfield-api\FaarfieldApi.sln` | Solution file from Plan B work | Preserved (unused for .msi build) |
| `c:\temp\faarfield-source\` | Staged FAA source (Plan B) | Preserved (unused; resume here on a future SDK-equipped machine) |
| `c:\temp\faarfield-source\Directory.Build.targets` | Plan B msbuild customization | Preserved |
| Background processes | `FaarfieldApi.exe` (port 5100), `vite dev` (port 5173) | Running; logs at `c:\temp\faarfield-api.log`, `c:\temp\vite.log` |

### Specs written this session (under `specs/`)

| Spec | Status | Use |
|---|---|---|
| [embed-faarfield-source-projectref.md](../specs/embed-faarfield-source-projectref.md) | **deferred** | Plan B for future no-FAARFIELD-install + SDK-equipped machine. All Phase 0–3 artifacts already on this machine. |
| [gear-coordinate-trace-audit.md](../specs/gear-coordinate-trace-audit.md) | **planned** | Pipeline-coord audit Excel deliverable for the report. Top 10 aircraft × 13 sections × 7 stages. ~3.5 hr. Can run today against the live .msi-built backend. |

### What's still pending

1. **Run the gear-coordinate-trace-audit** (the deliverable Excel). All prerequisites are now in place — backend running, library loaded.
2. **Pre-bake remaining endpoints for full-static deploy** (Netlify path discussed but not committed). Would let the entire site work without any backend, including LEAF stress contour and 3D FEM mesh viewer for the 13 baselines. ~3.5 hr.
3. **Final report deliverable** (Word .docx via `engineering-report` skill or PPT). Material consolidated in `note_claude/` from previous session.
4. **Optional: run rebuild + re-mirror** to update Dropbox `website/` snapshot if any client-side fixes happen this session.

### Class-presentation readiness — verified

For the upcoming CEE 598 final-project presentation, the simplest demo is:
```cmd
:: Terminal 1
c:\temp\aeropave\faarfield-api\bin\x86\Release\FaarfieldApi.exe

:: Terminal 2
cd /d c:\temp\aeropave && npm run dev
```
Open `http://localhost:5173`. Project airports show instant pre-cal verdicts (A); any custom airport / slider drag / FEM toggle routes to the live backend (B). No deploy / tunnel / Netlify needed for in-room presentation.

---

## Previous session — 2026-04-24 (afternoon)
**Focus:** KMWH 37508 split rerun → website pre-cal hardening → gear-classification audit/UI fixes → CDF profile chart redesign → panel reordering → backend resilience → **first GitHub push** → fresh-machine setup guide

---

## Completed

### Data layer
- **`scripts/rerun_kmwh_37508_split.py`** — created and executed; 2-half alternating (47+47 aircraft) with backend restart between halves, then linear merge of per-offset CDF arrays. Produced CDF=2.42e+04 (PCC Fatigue, controlling at offset 140"), cdf_profile_* fully populated (41 points), top_aircraft_full has 10 entries with C-17 at #1 (libGear=2T, 12 wheels, geomSrc=xml).
- All 13 sections now have schema-complete pre-cal data: 41-point profile arrays, 10-aircraft top contributor lists with full per-aircraft fields (libGear, geometrySource, nWheels, tireWidth, wheelX/Y, cdfProfile).
- Website `cdf_results.json` and project `results/cdf_results.json` are in lockstep — verified 13/13 sections match exactly.
- Verdict: **4 OVER / 9 UNDER** preserved.

### Gear-classification audit
- Audited Excel vs FAARFIELD library gear across all 859 traffic rows: **38 mismatches in 11 unique aircraft**.
- High-confidence (xml-direct): BE9L, C130, C17, C750, DC10, E190, FA50.
- Lower-confidence (nearest_proxy substitution): BE19, BE9T, C30J, SW3.
- Most consequential: **C-17A** (Excel: 2D → Library: **2T**, 12 wheels not 8) — 7,207 deps across KCIU, KMWH, KPUB, KLHX. Drives the under-design verdict on KMWH 37325/37508 + KPUB 6948.

### Website (React) — code changes pushed, all live at http://localhost:5173

| File | Change |
|---|---|
| `src/components/GearFootprintTopView.jsx` | (1) Removed per-row wander envelope (now shown ONCE in header strip with edge labels `−60.87″`/`+60.87″`, label `±2σ wander envelope`, taller and more readable). (2) Fixed wheel-rendering bug: unit mismatch between left-edge offset (inches) and width (pixels) was shifting every wheel ~3" right; now both use pixel-space. (3) Mismatch label split into two lines: `library gear: X (used for analysis)` + `traffic-sheet gear: Y (overridden)`. |
| `src/components/CdfProfileChart.jsx` | Stripped the mm/in toggle and log/linear toggle. Inches + linear only. Top-N expanded from 5 → **10**, palette extended to 10 colors. Header right shows static `inches · linear scale · top 10 aircraft`. Chart height 320 → 360. |
| `src/components/SummaryTable.jsx` | Per-aircraft expansion now joins `top_aircraft` ↔ `top_aircraft_full` by ICAO to surface `libGear`. Cell shows library gear in **red bold** with `≠excel` suffix when they differ; tooltip spells out `Library: X · Traffic supplied: Y (library overrides for analysis)`. |
| `src/components/TrafficHints.jsx` | Hardcoded quick-add presets corrected: **C-130 was 2D → now 2S**, **C-17 was 2D → now 2T**. Comment points to the gear-mismatch note. |
| `src/tabs/DesignTool.jsx` | (1) Moved `GearFootprintTopView` and `CdfProfileChart` to sit immediately below verdict card / "Running FAARFIELD engine…" pad (was at the very bottom). (2) Fixed pre-cal-loss bug: auto-fire effect was calling `setNativeCdf(null)` whenever `analysisAvailable=false` or layers/traffic momentarily missing — destroyed the disk-hydrated seed. Now both branches just `return` without nullifying. |
| `src/api/nativeStressClient.js` | Health-check timeout 3 s → **8 s** (was firing false offline flips when backend was busy with a CDF). Returns `null` on timeout/network error (not a fake `{leafAvailable:false}` object). |
| `src/App.jsx` | Added `failStreak` ref. Health check requires **3 consecutive misses** (~24 s) before flipping `nativeAvailable`/`analysisAvailable` to false. Any successful poll resets the streak. Stops the offline-message flicker during normal CDF processing. |

### Notes saved (PhD-level, defensible-in-Q&A)
- **`note_claude/2026-04-24_PCI_Distress_Field_Data.md`** — Found field PCI/distress data in `FAA_Project_Data_4_Grad_Students/02_Pavement_Design_with_Traffic/20260223_Traffic_Filtered_Airport_Data.xlsx` (was NOT in `AO_CEE598_FAARFIELD.xlsx`). 187 distress records + 58 PCI inspections covering all 13 sections, 2005–2023. Includes CDF-vs-PCI validation table, distress-code legend, KOTM 27450/27641 rehab artifact flag, citation block.
- **`note_claude/pci_distress_data.json`** — Structured extract of PCI history + distress records, indexed by `{ICAO}_{SectionID}`.
- **`note_claude/2026-04-24_Gear_Mismatch_Excel_vs_FAARFIELD_Library.md`** — All 11 mismatches with audit traceability. **Section 10 added today**: code-level evidence (`FullAnalysisWrapper.vb:614,626-630,634`, `AircraftLibrary.vb:178`) showing **library gear drives CDF, not Excel gear**. Includes a ready-to-use Q&A talking point and a 3-sentence Methods paragraph for the report.
- **`note_claude/2026-04-24_Fresh_Machine_Setup_Guide.md`** — 12-section step-by-step guide for bringing AeroPave up on a fresh Windows machine, including the FAARFIELD install/license caveat, the why-not-Dropbox warning, msbuild recipe, two-terminal startup, click-through verification on KMWH 37508, troubleshooting, and a backend-less presentation fallback.

### GitHub — first push of the project ever
- **Repo:** https://github.com/Pleesudjai/cee598-airport-final (PRIVATE)
- **Branch:** `main`
- **2 commits:**
  - `ca1fd82` — Initial commit (329 files, 50 MB compressed) with comprehensive `.gitignore` excluding FAA proprietary DLLs, FAARFIELD source/installer, PaveAir (2.1 GB), build artifacts.
  - `68f7813` — Added the fresh-machine setup guide.
- `README.md` and `.gitignore` written for the repo root.

---

## Current State

### Working end-to-end
- All 13 project sections show pre-cal CDF instantly on selection (verdict card, CDF bar chart, profile chart, gear footprint, per-aircraft table) — zero backend round-trip required for project airports.
- Live recompute fires correctly when user changes inputs (layers, MOR, growth rate).
- Library-gear override applied consistently in CDF computation, per-aircraft table (DesignTool), per-aircraft expansion (SummaryTable), gear footprint chart, and quick-add presets.
- Health check is now tolerant — single missed heartbeats no longer flicker the offline message.
- GitHub repo cloneable, with full setup guide for new machines.

### Built but untested
- Setup guide on `2026-04-24_Fresh_Machine_Setup_Guide.md` — has not been validated on a *fresh* machine yet (user plans to do this themselves).
- The 2-half alternating split rerun strategy worked once (KMWH 37508) — would work for any other section that hits backend connection-reset issues, but hasn't been needed elsewhere.

### Broken / Incomplete
- **`FaarfieldApi.exe` PID 6972 was showing "Not Responding" in tasklist** at one point during this session, even though `/api/health` was responding. May or may not still be hung. Recommended: kill + restart at start of next session.
  ```cmd
  taskkill /F /PID 6972
  C:\temp\aeropave\faarfield-api\bin\x86\Release\FaarfieldApi.exe
  ```
- **Final written report (Word .docx) not yet drafted.** All the methodological raw material is in `note_claude/` — frost analysis, gear audit, PCI validation, Nf equations — but no consolidated deliverable.
- **Desktop FAARFIELD GUI cross-check on KMQJ 8662** still outstanding (recipe at `results/KMQJ_8662_desktop_crosscheck.md`). Not blocking the report, but would strengthen the parity claim.

---

## Next Steps (priority order)

1. **At next session start: restart `FaarfieldApi.exe`** if backend is hung. The "Not Responding" tasklist status from this session may persist.
2. **Write the final written deliverable** (Word .docx via the `engineering-report` skill, or a slide deck via PPT). Material to draw from:
   - `note_claude/2026-04-24_Gear_Mismatch_Excel_vs_FAARFIELD_Library.md` § 9 (citation block) and § 10.5 (Methods paragraph)
   - `note_claude/2026-04-24_PCI_Distress_Field_Data.md` § 6 (suggested report sections) and § 8 (citation block)
   - `note_claude/2026-04-23_Frost_Protection_Analysis.md` (full frost methodology)
   - `note_claude/2026-04-22_Nf_equations_per_layer.md` (Nf equations)
   - Verdict table from `cdf_results.json` (the 4-OVER / 9-UNDER summary)
3. **(User task) Set up the new machine** using `note_claude/2026-04-24_Fresh_Machine_Setup_Guide.md`. If anything goes wrong, capture the failure mode and update §9 (Common Issues).
4. **Optional: Desktop FAARFIELD GUI cross-check** on KMQJ 8662 to validate the LEAF + FEM3D parity claim.
5. **Optional: GitHub Pages or Vercel deploy** for a shareable URL of the report-only mode (needs no backend; covers the entire pre-cal verdict story). Repo is private so this requires either a public mirror or a paid GitHub plan.

---

## Key Decisions (with WHY)

- **Library gear is authoritative; Excel gear is audit-only.** Reason: matches FAARFIELD desktop behavior — once an aircraft is selected by ICAO, FAARFIELD reads its own `AircraftGeometry.xml` for wheel layout. The Excel gear column is a label, not a structural input. Documented in §10 of the gear-mismatch note.
- **Pre-cal CDF results take priority over backend recompute on initial section load.** Reason: instant verdict for project sections (no spinner), and importantly, the disk-hydrated data survives transient backend outages so the user always sees the answer.
- **Health check tolerates 3 consecutive misses.** Reason: the .NET `HttpListener` is single-threaded — a `/api/health` poll behind an in-flight CDF request can wait 30+ s. A single missed heartbeat is normal during analysis, not an outage.
- **Top 10 contributors (not top 5) on the CDF profile chart.** Reason: `top_aircraft_full` already carries all 10; showing only 5 hid valuable context like which mid-CDF aircraft were close to the verdict line.
- **±2σ wander envelope shown ONCE in legend strip, not on every row.** Reason: it applies identically to every aircraft; repeating it 10× was visual noise. The single labeled band still tells the "why is ω* at 140" not at 0?" story.
- **GitHub repo private, FAA DLLs excluded.** Reason: private repo so the project isn't visible publicly during/before grading. FAA DLL exclusion regardless because their license forbids redistribution; the README explains how to install FAARFIELD locally.
- **Website source mirrored from `c:/temp/aeropave/` into `…/03 Final Project/website/` for git tracking.** Reason: active development needs a non-Dropbox path (Vite/.NET don't tolerate cloud sync), but git tracking lives in the Dropbox-synced project folder. Manual `robocopy` syncs the snapshot when there's something worth pushing.

---

## Dead Ends to Avoid

- **Don't try to mirror to GitHub via a `git submodule`** — would require a SECOND repo for `aeropave/`, defeating the user's "one combined repo" choice. The `robocopy` snapshot approach is simpler and sufficient.
- **Don't increase health-check polling frequency to fix offline flickers** — root cause is the timeout, not the rate. Bumping rate just multiplies false flips.
- **Don't try `setNativeCdf(null)` defensively in the auto-fire effect** — it destroys the pre-cal seed. Just `return` early when conditions aren't met for a recompute.
- **Don't trust `robocopy /XF *.dll` to exclude nested DLLs** — it only matches at top-level. Nested `faarfield-api/bin/x86/Release/*.dll` got copied. Worked around by `rm -rf bin obj` post-mirror, then `.gitignore` defense in depth.
- **Don't try to rerun KMWH 37508 in one batch** — the 94-aircraft mix overwhelms the FEM state and triggers `ConnectionResetError [WinError 10054]`. The 2-half alternating split with backend restart between halves is the proven workaround.

---

## Open Questions / Blockers

- [ ] Is the `FaarfieldApi.exe` PID 6972 actually hung, or just unresponsive in tasklist due to its long-running CDF queue? Health endpoint was responding so it's probably fine — but worth a fresh restart.
- [ ] What's the final report format requested by the instructor — Word .docx, PDF, slide deck, or all three? `note_claude/` has the raw material for any of these but they need to be consolidated.
- [ ] Should the existing Dropbox `website/` snapshot be kept indefinitely, or removed once the user is comfortable cloning from GitHub on the new machine? It currently duplicates 31 MB.

---

## Files Modified This Session

### Website (`c:/temp/aeropave/src/`)
- `components/GearFootprintTopView.jsx` — single-band legend, wheel-render fix, two-line mismatch label
- `components/CdfProfileChart.jsx` — inch-only, linear-only, top-10
- `components/SummaryTable.jsx` — libGear with mismatch indicator
- `components/TrafficHints.jsx` — C-130 → 2S, C-17 → 2T
- `tabs/DesignTool.jsx` — panel reorder, pre-cal preservation fix
- `api/nativeStressClient.js` — 8 s timeout, null-on-error
- `App.jsx` — failStreak (3-consecutive-miss tolerance)

### Project root (`c:/Users/chidc/.../03 Final Project/`)
- `.gitignore` — created (FAA proprietary, PaveAir, build artifacts excluded)
- `README.md` — created (project overview, repo layout, what's NOT in repo)
- `note_claude/2026-04-24_PCI_Distress_Field_Data.md` — created
- `note_claude/2026-04-24_Gear_Mismatch_Excel_vs_FAARFIELD_Library.md` — created and extended (§10 added today)
- `note_claude/2026-04-24_Fresh_Machine_Setup_Guide.md` — created
- `note_claude/pci_distress_data.json` — created
- `website/` — full snapshot refreshed via robocopy from `c:/temp/aeropave/`

### Scripts
- `scripts/rerun_kmwh_37508_split.py` — created (2-half split + linear merge)

### Git
- Initialized repo at `…/03 Final Project/`
- Configured user.name + user.email locally (no global change)
- Pushed 2 commits to https://github.com/Pleesudjai/cee598-airport-final
