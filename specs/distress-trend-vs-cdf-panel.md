---
spec: distress-trend-vs-cdf-panel
status: planned
owner: Chidchanok Pleesudjai
date: 2026-04-25
last-updated: 2026-04-25
related: unified-project-summary-panel.md
standards: ASTM D5340-12 (airport pavements), FAA AC 150/5380-6C, FAA AC 150/5380-7B
---

# Distress Trend Chart + CDF-vs-PCI Validation Panel

## Goal

Add field-distress data to the Report tab so the user can visually correlate
**FAARFIELD's predicted CDF** with **observed PCI history and distress severity**
for each of the 13 project sections.

This delivers the strongest piece of methodology validation possible: "the
FAARFIELD prediction matches what's happening in the field, except where there's
a documented rehab artifact (KOTM 27450/27641)."

## Standards (locked in)

PCI inspections in the dataset follow **ASTM D5340-12** *Standard Test Method
for Airport Pavement Condition Index Surveys* (NOT D6433 which is for roads).
The distress catalog in `pci_distress_data.json` is unambiguously D5340 — codes
21–38 cover PCC slab distresses (BLOW-UP/SHATTER, CORNER BREAK, DIVIDED SLAB,
DURABILITY CRACKING, FAULTING, PUNCHOUT, CORNER SPALLING) which appear only in
airport PCC inventories.

Citation block for the report:
> "Pavement condition was assessed per ASTM D5340-12 *Standard Test Method for
> Airport Pavement Condition Index Surveys* and FAA Advisory Circular
> 150/5380-6C *Guidelines and Procedures for Maintenance of Airport Pavements*.
> PCI is reported on the standard 0–100 scale with the seven-band rating system
> (Good 86–100; Satisfactory 71–85; Fair 56–70; Poor 41–55; Very Poor 26–40;
> Serious 11–25; Failed 0–10)."

## Why CDF–PCI correlation needs care: load vs climate

FAARFIELD's CDF predicts **load-related** damage only — the cumulative damage
from aircraft passes. The total PCI deterioration captures BOTH load AND
climate/other distresses. Comparing CDF directly to raw PCI is a category
error. The correct comparison is:

- **CDF prediction**       ≈  inverse of remaining load-related life
- **Load-adjusted deduct** = `(100 − PCI) × (pct_load / 100)`
                            ≈  observed load-related damage so far

This is the metric the validation scatter chart must use as Y-axis. The
`pct_load` field per inspection in `pci_distress_data.json` is the load-related
deduct as a percentage of total deduct (per ASTM D5340 deduct categorization).

## Source data

`note_claude/pci_distress_data.json` (already extracted from
`FAA_Project_Data_4_Grad_Students/02_Pavement_Design_with_Traffic/20260223_Traffic_Filtered_Airport_Data.xlsx`):

```
{
  "sections": {
    "CIU_21222": {
      "icao": "CIU", "section_id": 21222, "name": "10", "use": "RUNWAY",
      "construction_date": "2014-07-14",
      "pci_history": [
        {"date":"2014-07-14","pci":100,"pct_load":0,"sample":0},
        {"date":"2016-12-07","pci":92.4,...},
        ...
      ],
      "distress_records": [
        {"date":"2016-12-07","code":47,"desc":"JT REF. CR","severity":"L","qty":3911.87,"unit":"m"},
        ...
      ]
    },
    "LHX_6627": {...},
    ... (13 sections total)
  },
  "distress_codes": { "1": "ALLIGATOR CR", "8": "JOINT REFLECTION CRACKING", ... }
}
```

**Total:** 13 sections, 58 PCI inspection records (2005–2023), 187 distress records.

## Three visualizations

### 1. PCI History Line Chart (per section)

X-axis: inspection date (2005–2023). Y-axis: PCI (0–100, "Failed" to "Good").

Features:
- One line per section, plotted in the section's expanded view
- Vertical reference line at `construction_date` (overlay/rehab year)
- **ASTM D5340 7-band horizontal reference areas** (Recharts `<ReferenceArea>`):

  | Band | PCI range | Band fill color |
  |---|---|---|
  | Good | 86–100 | green-100 |
  | Satisfactory | 71–85 | green-50 |
  | Fair | 56–70 | yellow-100 |
  | Poor | 41–55 | orange-100 |
  | Very Poor | 26–40 | red-100 |
  | Serious | 11–25 | red-200 |
  | Failed | 0–10 | red-400 |

  Threshold lines drawn at the **lower bound** of each band: 86, 71, 56, 41, 26, 11.

- Dots colored by `pct_load` (0=climate-only, 100=load-only) — distinguishes
  load-driven vs environment-driven distress at each inspection point. Use a
  diverging palette: blue (low pct_load = climate) → gray (mixed) → red
  (high pct_load = load).
- Tooltip on hover: full inspection record (date, PCI, pct_load %, sample size)

### 2. Distress Severity Breakdown (per section, most-recent inspection)

X-axis: distress code (e.g., "ALLIGATOR CR", "JT REF. CR", "RUTTING").
Y-axis: total quantity in section units (qty in m or m²).

Stacked bar chart — three severity stacks per code:
- **L** (Low severity) — light fill
- **M** (Medium) — medium fill
- **H** (High) — saturated fill

Each distress code is **categorized** load-related vs climate-related per ASTM
D5340 (the same categorization that `pct_load` aggregates). Bars are visually
grouped:

- **Load-related (red family)** — codes typically: 1 ALLIGATOR CR, 8 JT REF CR,
  13 POTHOLE, 15 RUTTING, 22 CORNER BREAK, 23 DIVIDED SLAB, 25 FAULTING,
  28 LINEAR CRACKING, 34 PUNCHOUT, 38 CORNER SPALLING — **these are what
  FAARFIELD's CDF predicts**
- **Climate-related (gray/blue family)** — codes typically: 2 BLEEDING,
  3 BLOCK CR, 4 BUMPS/SAGS, 6 DEPRESSION, 18 SWELL, 19 RAVELING, 26 JOINT SEAL
  DAMAGE, 31 POLISHED AGGREGATE, 32 POPOUTS, 36 SCALING/CRAZING, 37 SHRINKAGE
  CRACKING — **these are NOT what FAARFIELD predicts**
- **Other** (patches, lane shoulder drop, RR crossing, etc.) — neutral color

Filtered to the most recent inspection date for that section. Click a bar →
tooltip showing all distress records of that code+severity (date, qty, unit).
Legend toggles for "Load-related only" / "Climate-related only" / "All".

The chart's annotation should make explicit: **"Load-related distresses are
what FAARFIELD's CDF predicts. The CDF prediction does NOT account for
climate-related distress, so a low predicted CDF is consistent with significant
climate-related deterioration."**

### 3. CDF vs Load-Adjusted Deduct Scatter (the killer chart)

One panel showing all 13 sections at once. **The Y-axis is load-adjusted, NOT
raw PCI**, because FAARFIELD's CDF predicts load damage only (see "load vs
climate" note above).

X-axis: predicted CDF from `cdf_results.json` (log scale, 0.001 → 1e5).
Y-axis: **Load-Adjusted Deduct** = `(100 − PCI_latest) × (pct_load_latest / 100)`
        (linear scale, 0 → ~70).

Each point:
- Dot color: green if `adequate=true` (CDF<1), red if `adequate=false`
- Dot size: scaled by traffic volume (sum of annual departures)
- Label: section_id (e.g., "37508")
- Hover tooltip:
  - Full ICAO + section_id + section description (e.g., "2.5″ AC + 8″ PCC")
  - max CDF (predicted)
  - controlling layer
  - latest PCI (raw)
  - latest pct_load (%)
  - load-adjusted deduct (computed)
  - inspection date
  - rehab annotation if applicable

Reference zones:
- Vertical line at **CDF = 1** (the design-life threshold)
- Horizontal line at **Load-Adjusted Deduct = 30** (a load-deduct threshold
  worth flagging — corresponds to ~PCI 70 at 100% load distress, which is the
  FAA "begin major M&R planning" trigger)
- Implicit upper-right quadrant (high CDF + high load deduct) = predicted AND
  observed under-design — color this background light red
- Implicit lower-left quadrant (low CDF + low load deduct) = predicted AND
  observed over-design — color this background light green

**Per-section annotation badges:**
- KOTM 27450, KOTM 27641 — labeled "rehab 2018" or similar; explain in the
  hover tooltip that the latest PCI = 100 because of intervening rehab; the
  scatter dot will appear in the lower-left even though the cumulative CDF
  prediction was high
- KMWH 37325, KMWH 37508 — labeled "C-17 dominated" — driven by 12-wheel C-17
  load layout; this is the under-design verdict story

**Secondary toggle (button below the chart):** "Plot raw PCI instead" — shows
the same scatter with Y = (100 − latest_PCI) directly. This shows the
total-deterioration view for completeness; the explanatory paragraph below the
chart is updated to note that the load-adjusted view is the appropriate
validation metric.

This chart **is** the methodology validation argument. If the over-designed
sections cluster lower-left (low predicted CDF, low observed load deduct) and
the under-designed sections cluster upper-right (high predicted CDF, high
observed load deduct), FAARFIELD's prediction is consistent with field
observations on the load-related deterioration that FAARFIELD models.

## Where the visualizations go

| Chart | Location | Purpose |
|---|---|---|
| PCI History Line | Inside **expanded airport group** in `ProjectSummaryUnified` (the new panel from `specs/unified-project-summary-panel.md`) | Per-section validation |
| Distress Severity Bar | Same location, side-by-side with PCI line | Per-section detail |
| **CDF vs PCI Scatter** | **NEW Report-tab section above DataSources** as a standalone "Field Validation" panel | Cross-section validation, the report's centerpiece |

## In scope

- New React components: `PciHistoryChart`, `DistressBreakdownChart`, `CdfVsPciScatter`, `FieldValidationPanel`
- Stage `pci_distress_data.json` into `c:/temp/aeropave/src/data/` so the frontend can import it
- Wire into `ProjectSummaryUnified.jsx` (per the related spec) and `ProjectReport.jsx`
- Light Tailwind styling matching existing chart panels
- Uses Recharts (already a dep)

## Out of scope

- Backend changes (everything is static JSON)
- Editing the source Excel
- Forecasting future PCI from current CDF (would need a deterioration model)
- Per-traffic-aircraft attribution of distress (not in the data)

## Implementation phases

### Phase 1 — Data staging (10 min)
Copy `note_claude/pci_distress_data.json` → `c:/temp/aeropave/src/data/pci_distress.json`.
Also mirror to the Dropbox `website/src/data/` snapshot.

### Phase 2 — `PciHistoryChart.jsx` (30 min)
- Recharts `<LineChart>` wrapping `pci_history` for one section
- Reference line at `construction_date`
- PCI threshold bands (ReferenceArea)
- Tooltip with all fields

### Phase 3 — `DistressBreakdownChart.jsx` (30 min)
- Group `distress_records` by `code` + `severity`
- Recharts `<BarChart>` with stacked bars (L/M/H)
- Use `distress_codes` lookup for labels

### Phase 4 — `CdfVsPciScatter.jsx` (45 min)
- Recharts `<ScatterChart>`
- Each section = one dot
- Log-scale X axis, linear Y
- Reference line at CDF=1
- Color by adequacy, size by traffic volume
- Tooltip with full section details
- Click → `onOpenInTool(icao, sectionId)`

### Phase 5 — `FieldValidationPanel.jsx` (20 min)
- Header + brief explanation paragraph
- Embed `CdfVsPciScatter`
- Bullet-list summary: "X sections show CDF–PCI alignment; Y sections show
  rehab-artifact deviation"

### Phase 6 — Wire into pages (15 min)
- Add `<FieldValidationPanel>` to `ProjectReport.jsx` (above `DataSources`)
- Add `<PciHistoryChart>` + `<DistressBreakdownChart>` inside the expanded
  airport group in `ProjectSummaryUnified.jsx`

### Phase 7 — Smoke test (10 min)
- Click each section in the unified panel → verify PCI line + distress bars render
- Verify scatter shows 13 dots, color/size correct
- Verify rehab-artifact annotation on KOTM 27450/27641
- Tooltip + click-through to Design Tool work

## Total effort: ~2.5 hours

## Discussion points the panel will support

When showing this in the presentation, a few stories the visuals will tell:

1. **KMWH 37325 / 37508** — predicted CDF=2.4e+04 (severely under-designed) →
   field PCI history likely shows accelerated deterioration. Visual proof that
   FAARFIELD's verdict matches reality.

2. **KMQJ 8662 / 8881 / 8640 / 8780** — predicted CDF<1 (over-designed) → field
   PCI history likely shows slow, climate-driven deterioration. Validates the
   FAARFIELD over-design verdict.

3. **KOTM 27450 / 27641 — the rehab artifact** — predicted CDF would suggest
   degraded condition, but PCI is high because of an intervening rehab event.
   The chart shows this as a bright-red dot at unexpected position; the report
   text explains the rehab.

4. **KCIU 21222** — relatively new (2014) construction → PCI starts at 100 and
   has only minor decline. CDF prediction modest. Both consistent.

These narratives turn the panel from "another chart" into "the chart that
validates the entire study."

## Acceptance criteria

1. `c:/temp/aeropave/src/data/pci_distress.json` exists, contains all 13 sections
2. PciHistoryChart renders for any section (4–7 points expected per section)
3. DistressBreakdownChart shows L/M/H stacks for the most recent inspection
4. CdfVsPciScatter shows 13 dots, color-coded by adequacy, with reference line at CDF=1
5. Rehab-artifact callout for KOTM 27450/27641 visible as a labeled dot
6. Click any dot → opens that section in Design Tool tab
7. No layout regressions on Report tab

## Risks

| Risk | Mitigation |
|---|---|
| Some sections may have very few PCI records (only 1–2 inspections) | Render even with sparse data; threshold bands provide context |
| Distress qty units differ across codes (m vs m²) | Display unit in tooltip; normalize Y axis per code if needed |
| Scatter chart may be cluttered if all 13 dots overlap | Manual jitter on overlapping points; or split into "OVER" / "UNDER" sub-panels |
| Some PCI dates may pre-date the construction_date (orphan inspections) | Plot them too; will show up to the left of the construction reference line — flag in tooltip |

## Decision log

- **2026-04-25** — chose Recharts over Plotly for consistency with existing CDF profile chart and gear footprint chart (already use Recharts). No new dep.
- **2026-04-25** — chose to keep CDF-vs-PCI scatter at the Report-tab level (above `DataSources`) rather than inside individual airport groups. Reason: cross-section comparison is the validation argument; needs to show all 13 in one view.

---

*End of spec.*
