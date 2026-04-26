---
spec: unified-project-summary-panel
status: planned
owner: Chidchanok Pleesudjai
date: 2026-04-25
---

# Unified Project Summary — Merge "All 13 Sections" + "Per-Airport Detail"

## Goal

Combine two currently-separate panels on the **Report tab** into a single panel:

- **Top:** "All 13 Sections — CDF Summary" (`SummaryTable`, 283 lines, flat 13-row table)
- **Bottom:** "Per-Airport Detail" (`AirportAccordion` × 6 airports, 177 lines, expandable per-airport cards)

→ One panel with **airport-grouped rows that expand inline** to show their sections + visual detail.

## Why merge

- Users currently scroll back and forth between the flat 13-row table and the per-airport accordion to correlate one airport's verdict with its section detail.
- The two panels show ~70% overlapping information (verdicts, CDF magnitudes, controlling layer).
- The flat table is good for cross-airport comparison; the accordion is good for per-airport drill-down. A single grouped table delivers both.
- Removes ~20% of vertical scroll on the Report tab.

## Out of scope

- Changing the cross-section SVG diagram (`CrossSectionSmall`) — keep as-is, render inside the expanded section detail
- Removing the existing per-section CDF profile / gear footprint panels in the Design Tool tab
- Backend / data shape changes — uses existing `cdfResults`, `sections`, `airports`, `subgradeData`, `traffic` arrays

## Design — single grouped panel

```
┌─ Project Summary ──────────────────────────────────────────────────────┐
│  ICON  All 6 Airports · 13 Sections · 4 OVER / 9 UNDER                 │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ [▶] KLHX · La Junta Municipal, CO  · 0/2 OVER ·  max CDF 1.4e2 │   │
│  │ [▶] KPUB · Pueblo Memorial, CO     · 0/1 OVER ·  max CDF 4.7e3 │   │
│  │ [▼] KMQJ · Indianapolis Regional   · 4/4 OVER ·  max CDF 0.18  │   │
│  │     ┌─ KMQJ sections ────────────────────────────────────────┐ │   │
│  │     │ 8662  Taxiway · 3.5″ AC + 8″ PCC · CDF 0.18 · OVER     │ │   │
│  │     │ 8881  Taxiway · 3.5″ AC + 8″ PCC · CDF 0.16 · OVER     │ │   │
│  │     │ 8640  Taxiway · 3.5″ AC + 8″ PCC · CDF 0.14 · OVER     │ │   │
│  │     │ 8780  Taxiway · 3.5″ AC + 8″ PCC · CDF 0.12 · OVER     │ │   │
│  │     │   [click any row → opens in Design Tool tab]            │ │   │
│  │     └────────────────────────────────────────────────────────┘ │   │
│  │ [▶] KCIU · Chippewa County Intl    · 0/1 OVER ·  max CDF 6.2e1 │   │
│  │ [▶] KOTM · Ottumwa Regional        · 0/3 OVER ·  max CDF 23    │   │
│  │ [▶] KMWH · Grant County Intl       · 0/2 OVER ·  max CDF 2.4e4 │   │
│  └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

Each collapsed airport row shows:
- ICAO + name
- Section count + over/under tally (e.g., "0/2 OVER" = 0 over-designed of 2 sections)
- Max CDF across the airport's sections (in scientific notation)
- Worst-controlling-layer badge (e.g., "PCC Fatigue")

Each expanded airport reveals:
- Full per-section table (section_id, desc, CDF, controlling, OVER/UNDER badge)
- Per-aircraft expansion (already in `SummaryTable`) — preserved
- Cross-section SVG diagram (already in `AirportAccordion`) — preserved
- Click any section row → `onOpenInTool(icao, sectionId)` (current behavior)

## Default state

- All 6 airports **collapsed** on first load — maximum at-a-glance comparison
- "Expand all" / "Collapse all" toggle in the panel header
- State persisted in component-local React state (no localStorage needed for class demo)

## Implementation

### Phase 1 — New component `ProjectSummaryUnified.jsx` (45 min)
Create `src/components/ProjectSummaryUnified.jsx`. Props:
```jsx
<ProjectSummaryUnified
  airports={airports}
  sections={sections}
  cdfResults={cdfResults}
  onOpenInTool={onOpenInTool}
/>
```

Internally:
- Group `cdfResults` by `icao`
- Render outer container with header + group rows
- Each group row: `<AirportGroup>` sub-component (collapsed/expanded states)
- Reuses `CrossSectionSmall` from `AirportAccordion.jsx` (move to a shared file or import directly)
- Reuses per-aircraft expansion JSX from `SummaryTable.jsx` (extract to a shared `<PerAircraftDetails>` sub-component)

### Phase 2 — Wire into `ProjectReport.jsx` (10 min)
Replace lines 18–34 of `ProjectReport.jsx`:
```jsx
{/* OLD */}
<SummaryTable ... />
<section>
  <h3>Per-Airport Detail</h3>
  {airports.map(apt => <AirportAccordion ... />)}
</section>

{/* NEW */}
<ProjectSummaryUnified
  airports={airports} sections={sections}
  cdfResults={cdfResults} onOpenInTool={onOpenInTool}
/>
```

### Phase 3 — Extract shared sub-components (20 min)
Move into `src/components/`:
- `CrossSectionSmall.jsx` (currently in `AirportAccordion.jsx`)
- `PerAircraftDetails.jsx` (currently in `SummaryTable.jsx` lines ~150–283)

This avoids duplicating the JSX in the new unified component.

### Phase 4 — Visual polish (15 min)
- Header with expand-all/collapse-all toggle
- Smooth `<details>`-style chevron rotation on group expand
- Color-coded over/under badge on the airport-level summary (matching the existing summary colors: green for OVER, red for UNDER)
- Sticky table header inside expanded sections (so column labels remain visible while scrolling a long airport)

### Phase 5 — Manual smoke test (10 min)
- Click each of 6 airports — expand, collapse, verify counts
- Click a section in expanded view — should open in Design Tool with that section selected
- Click "Expand all" — all 6 expand
- Click "Collapse all" — all 6 collapse
- Mobile view (responsive) — table collapses to stacked rows

## Total effort: ~1.5 hours

Doable in one focused sitting. No backend changes. Pure React/JSX work.

## Acceptance criteria

1. Single panel renders on Report tab with all 6 airports as groups
2. Collapsed view shows airport summary line (counts + max CDF + worst layer)
3. Expanded view shows full per-section table + per-aircraft expansion + cross-section diagram
4. Click any section row → `onOpenInTool(icao, sectionId)` fires (verified by Design Tool tab opening with correct section)
5. Old `SummaryTable.jsx` and `Per-Airport Detail` section block removed from `ProjectReport.jsx`
6. No console errors, no layout breakage at standard widths (1280, 1600, 1920)

## Rollback

If UX regression: revert `ProjectReport.jsx` lines 18–34 to the original two-block form, leave `ProjectSummaryUnified.jsx` in place but unused. Old components stay untouched throughout the migration.

## Decision log

- **2026-04-25** — chose airport-grouped table with inline-expand (Option C from the discussion) over tabbed view (Option B) and master-detail (Option A). Reason: preserves the at-a-glance view of all 13 sections for cross-airport comparison while folding the per-airport drill-down into the same visual container. No tab-switching cognitive cost.

---

*End of spec.*
