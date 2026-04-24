# Feature Spec: Airport Analysis Report Export
Date: 2026-04-19
Layer: website-frontend
Related: `specs/website-report.md`, `specs/tab-layout-restructure.md`, `note_x/codex-what-they-have-vs-we-have-short.md`

## What We're Building

Add a **professional export workflow** for AeroPave so users can generate:

1. a **single-airport / single-section analysis report** from the Design Tool
2. a **full project report export** from the Project Report tab
3. machine-readable **JSON** and lightweight **CSV** companions for review and archiving

This is meant to close one of the clearest gaps identified in the comparison note:

- the public FAARFIELD mirror is ahead in **report generation and documentation**
- AeroPave is ahead in **web/backend analysis**
- AeroPave now needs a report-export path that feels professional, not "just use Ctrl+P and hope"

## Why This Matters

Right now the website is strong as an interactive tool, but weak as a deliverable.

Problems today:

1. The Report tab is readable on screen, but there is no dedicated export flow.
2. The Design Tool shows rich results, but users cannot capture the **current modified scenario** cleanly.
3. Existing print CSS in `website/src/index.css` is a good baseline, but it is still tied to the live app shell and not a purpose-built export layout.
4. Engineers and professors usually want a PDF or print-ready summary they can email, archive, mark up, or attach to a submittal package.

## Design Principle

Do **not** generate a report by screenshotting the live UI.

Instead:

- build a normalized export payload from the current app state
- render that payload into a dedicated export page
- let the browser print that clean export page to PDF

That gives us a much more stable result than trying to print the whole interactive app.

## Export Types

| Export | Trigger | Scope | Primary use |
|--------|---------|-------|-------------|
| **Airport Analysis PDF** | Design Tool | One airport + one section + current modified scenario | Engineering review, class presentation, scenario comparison |
| **Project Report PDF** | Project Report tab | All project airports + all sections | Final project report / overview |
| **Airport Analysis JSON** | Design Tool | Same as airport analysis PDF | Archive, reproducibility, future backend ingestion |
| **Airport Analysis CSV** | Design Tool | Summary + top-aircraft table | Spreadsheet follow-up |

## V1 Output Strategy

### Primary export format

- **Print-ready HTML -> browser Save as PDF**

This is the main path for v1.

Why:

- no backend PDF service required
- charts already render as printable SVG in many cases
- simpler and more reliable than bringing in a client PDF library too early
- consistent with the existing print CSS direction already in the project

### Companion downloads

- **JSON** for the full export payload
- **CSV** for a compact summary table and top-aircraft contribution table

## Export Scope: Airport Analysis Report

The airport analysis export is the most important part of this spec.

It should capture the current Design Tool state for the selected airport/section, including user modifications.

### Required sections

1. **Cover / Header**
   - AeroPave title
   - airport ICAO, name, state
   - section id, use, description
   - export timestamp
   - solver mode badge
   - note whether results are JS approximation, native backend, or native backend + FEM

2. **Executive Summary**
   - original CDF
   - modified CDF
   - verdict
   - controlling failure mode
   - simple statement like:
     - `Original section is under-designed`
     - `Modified scenario reduces CDF from X to Y`

3. **What Changed**
   - same logic as the current `ChangesSummary`
   - before -> after values
   - clear deltas for:
     - AC thickness
     - PCC thickness
     - subgrade CBR
     - growth rate
     - flexural strength
     - design life if changed

4. **Pavement Structure**
   - layer table
   - cross-section graphic
   - total pavement thickness
   - subgrade modulus / k-value summary

5. **Traffic and Aircraft**
   - annual operations summary
   - growth rate
   - design life
   - top aircraft contribution table
   - if a custom traffic mix is active, show `Custom traffic mix`

6. **Results**
   - CDF by failure mode chart
   - original vs modified comparison
   - life estimate / failure year if available

7. **Native Solver Appendix** (only when available)
   - native solver status
   - native CDF summary
   - FEM used or not
   - backend warnings if present
   - native PCC stress / effective PCC stress if available

8. **Data Sources / Assumptions**
   - source badges and vintage
   - airport lookup source
   - soil source
   - traffic source
   - aircraft library source
   - note if current analysis includes assumptions or approximations

### Optional v1.1 sections

- stress contour snapshot
- FEM mesh snapshot
- methodology appendix
- raw traffic appendix

These are out of v1 unless they are already easy to render.

## Export Scope: Project Report

The full project export is a cleaner export version of the Report tab.

### Required sections

1. Cover page
2. overall findings
3. summary table of all sections
4. per-airport detail
5. subgrade comparison chart
6. key findings
7. data sources / freshness

### Important rule

The project report export should **not** include the live application chrome:

- no sticky header
- no tab navigation
- no search widgets
- no inputs or controls

It should read like a report, not like an app screenshot.

## Files To Create Or Edit

### New frontend files

- `website/src/export/buildAirportAnalysisPayload.js`
  - Normalize Design Tool state into one export object.

- `website/src/export/buildProjectReportPayload.js`
  - Normalize Report tab inputs into a static export object.

- `website/src/export/exportStorage.js`
  - Stores and retrieves export payloads in `sessionStorage`.

- `website/src/export/AirportAnalysisExportPage.jsx`
  - Dedicated print/export layout for one airport analysis.

- `website/src/export/ProjectReportExportPage.jsx`
  - Dedicated print/export layout for the whole project report.

- `website/src/export/ExportToolbar.jsx`
  - Shared export actions:
    - `Print / Save PDF`
    - `Download JSON`
    - `Download CSV`

- `website/src/export/csvExport.js`
  - Converts summary/top-aircraft export data into CSV.

### Modified frontend files

- `website/src/App.jsx`
  - Detect export mode from query string or `sessionStorage` key and render export pages without the normal app shell.

- `website/src/tabs/DesignTool.jsx`
  - Add `Export Analysis` button.
  - Build export payload from current selected airport/section and modified state.

- `website/src/tabs/ProjectReport.jsx`
  - Add `Export Project Report` button.

- `website/src/index.css`
  - Add export-page-specific print rules.
  - Keep existing print rules, but separate generic app print from dedicated export-page print.

### Reused existing components where possible

The export pages should reuse presentation logic where practical, but not by embedding the full interactive components blindly.

Good candidates to reuse:

- `Hero`
- `SummaryTable`
- `KeyFindings`
- simple chart sections
- cross-section SVG logic

Bad candidates to reuse directly:

- interactive tool containers with controls
- panels that depend on live hover/drag behavior
- anything that prints badly because it assumes app chrome is present

## Implementation Plan

### Phase 1: Payload Builder + Airport Analysis Export

Goal:

Ship the single-airport export first.

Steps:

1. Add `buildAirportAnalysisPayload.js`
   - Input:
     - current airport
     - current section
     - original result
     - modified result
     - current layers
     - current traffic
     - cbr, growth, flexStr, designLife
     - native result summaries if present
   - Output:
     - one normalized object with no React-specific state

2. Add `exportStorage.js`
   - `saveExportPayload(type, payload) -> key`
   - `loadExportPayload(key)`

3. Add `AirportAnalysisExportPage.jsx`
   - purpose-built report layout
   - no interactive inputs
   - print-first structure

4. Add `ExportToolbar.jsx`
   - `Print / Save PDF`
   - `Download JSON`
   - `Download CSV`

5. Add `Export Analysis` button in `DesignTool.jsx`
   - saves payload to `sessionStorage`
   - opens a new window like:
     - `/?export=airport-analysis&key=...`

6. Update `App.jsx`
   - if `export=airport-analysis`, render only the export page

### Phase 2: Project Report Export

Goal:

Export the current Project Report as a clean PDF-ready layout.

Steps:

7. Add `buildProjectReportPayload.js`
8. Add `ProjectReportExportPage.jsx`
9. Add `Export Project Report` button in `ProjectReport.jsx`
10. Update `App.jsx`
   - if `export=project-report`, render only the project report export page

### Phase 3: CSV + Polish

Goal:

Make the export workflow useful for engineering follow-up.

Steps:

11. Add `csvExport.js`
12. Export summary CSV for airport analysis:
   - airport metadata
   - section metadata
   - original vs modified CDF
   - top aircraft contribution rows
13. Improve print CSS:
   - page breaks
   - chart sizing
   - typography scale
   - footer / timestamp / page title

### Phase 4: Optional Enhancements

- add a branded cover page
- include stress profile snapshot
- include FEM mesh snapshot when available
- add `Download HTML`
- add engineer signature / reviewer line

## UI Requirements

### Design Tool button

Place a clear export action near the results area, not hidden in the header.

Recommended label:

- `Export Analysis`

Recommended icon:

- `download`
  or
- `picture_as_pdf`

### Project Report button

Place near the top of the Report tab.

Recommended label:

- `Export Project Report`

### Export page header

Every export page should show:

- report title
- airport / section context
- export time
- version or source note

## Acceptance Criteria

### Airport Analysis Export

The feature is successful when:

1. From the Design Tool, clicking `Export Analysis` opens a clean report page in a new window.
2. The report captures the **current modified scenario**, not just the original section defaults.
3. `Print / Save PDF` produces a readable PDF without the app header/tabs.
4. The exported report clearly shows:
   - airport
   - section
   - inputs
   - what changed
   - original vs modified CDF
   - top aircraft table
   - solver/data-source notes
5. `Download JSON` saves the same payload used to render the report.
6. `Download CSV` produces a usable tabular summary.

### Project Report Export

The feature is successful when:

1. From the Report tab, clicking `Export Project Report` opens a dedicated export page.
2. The PDF reads like a project report, not a screenshot of the live app.
3. Major sections page-break cleanly.
4. Summary table and charts remain legible in PDF.

## Demo Test

### Demo 1: Airport Analysis

1. Open the Design Tool for `KMQJ` or another project airport.
2. Modify PCC thickness, CBR, or traffic.
3. Observe updated modified CDF.
4. Click `Export Analysis`.
5. New window opens with a structured report.
6. Click `Print / Save PDF`.
7. Resulting PDF clearly shows the modified scenario and the CDF impact.

### Demo 2: Project Report

1. Open the Project Report tab.
2. Click `Export Project Report`.
3. New window opens with a print layout.
4. Save as PDF.
5. PDF contains project summary, airport detail, charts, and data sources.

## Out of Scope

- backend-generated PDFs
- Word/DOCX export
- exact FAARFIELD desktop "Detailed Computation Report" parity
- digital signing / official seals
- server-side report persistence
- multi-user export history
- exporting live interactive Plotly 3D scenes as true vector graphics

## Risks & Notes

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Printing the live UI gives bad results | Unprofessional PDF | Use dedicated export pages, not app-shell printing |
| Some charts do not print cleanly | Poor readability | Prefer SVG/Recharts sections, simplify charts in export pages if needed |
| Plotly/canvas panels print poorly | Missing figures | Exclude from v1 or replace with textual/native summary blocks |
| Current modified state is lost in a new window | Wrong report | Serialize normalized payload into `sessionStorage` before opening export page |
| Export page drifts from on-screen logic over time | Inconsistent report | Centralize payload-building in shared export builders |

## Professional Positioning

This spec is intentionally more professional than "Ctrl+P the current tab."

It does not try to fully recreate FAARFIELD desktop reporting in one step.

Instead, it gives AeroPave a strong web-native reporting workflow:

- deterministic export payload
- clean dedicated report pages
- reliable PDF printing
- machine-readable JSON/CSV companions

That is the right first report-export milestone for the website.

## Handoff

Run:

- `/execute specs/airport-analysis-report-export.md`

Recommended execution order:

1. Phase 1 first
2. Phase 2 second
3. Phase 3 only after both exports render cleanly
