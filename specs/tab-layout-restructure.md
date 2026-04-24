# Spec: Tab Layout — Project Report + Design Tool + Methodology

## What / Why
Separate the website into 3 tabs. The professor wants to see the project report. An engineer wants to use the design tool. Mixing them in one scroll is confusing.

## Tab Structure

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ✈ AeroPave   [📋 Project Report] [🔧 Design Tool] [📊 Methodology]   CEE 598│
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Project Report** = default tab (what the professor grades)
- **Design Tool** = interactive analysis for any airport
- **Methodology** = shared reference (equations, data sources, about)

## Tab 1: Project Report (default)

### Purpose
Present the FAARFIELD CDF analysis results for the 6 project airports (13 sections). This is the final deliverable for CEE 598. Read-only — no sliders, no editing.

### Sections (scroll order)

#### 1.1 Hero
- Title: "Airport Pavement Structural Evaluation using FAARFIELD"
- Subtitle: CEE 598 Airport Design — Spring 2026 — Chidchanok Pleesudjai
- Stat cards: 10 under-designed / 3 over-designed

#### 1.2 Airport Map (read-only)
- MapLibre with 6 markers (green/red by verdict)
- Click marker → popup with airport name, sections, quick verdict
- NO search bar on this tab

#### 1.3 Grand Summary Table
- All 13 sections in one table
- Columns: Airport, Section, Use, Layers, CDF (max), Controlling Mode, Verdict badge
- Sortable by any column
- Click row → expands to show per-airport detail below

#### 1.4 Per-Airport Detail (expandable accordion)
One accordion panel per airport (6 total). Each contains:

**Header bar** (always visible):
- ICAO + Name + State
- Number of sections
- Overall verdict (all adequate / X under-designed)

**Expanded content:**
- **Pavement Cross-Section diagram** (SVG, layers to scale for each section)
- **CDF Results Table**: Section | Layers | CDF_AC | CDF_Sub | CDF_PCC | CDF_max | Verdict
- **CDF Stacked Bar Chart** (all sections for this airport, threshold line at 1.0)
- **Top 5 Aircraft** contributing to CDF (per section)
- **Subgrade info card**: Soil type, AASHTO, CBR, E, k, quality badge
- **Traffic summary card**: Total types, total dep/yr, heaviest aircraft, base year, growth rate

#### 1.5 Subgrade Comparison
- CBR bar chart (6 airports, color by quality)
- Soil properties table (ICAO, soil, AASHTO, CBR, E, k, quality)
- Source note: USDA NRCS Web Soil Survey

#### 1.6 Traffic Overview
- Summary cards per airport: types count, total dep/yr, heaviest, growth rate
- Bar chart: top 10 aircraft by CDF contribution across ALL airports
- Note about data source (FAA traffic records, base year 2021)

#### 1.7 Key Findings
- Bullet list of main conclusions:
  - "PCC fatigue controls 12 of 13 sections"
  - "Section 6627 (KLHX) has only 6" PCC — CDF = 10.15, fails at 10% of design life"
  - "Section 21222 (KCIU) has 24" PCC — CDF = 0.00015, massively over-designed"
  - "Thin PCC (6-7") with heavy aircraft (C-130, B737) consistently fails"
  - "Grant County (KMWH) with C-17 military traffic has the highest CDF (11,000)"
- Table: design recommendations (increase PCC to X inches for adequate CDF)

#### 1.8 Data Sources
- Freshness table: 🟢 Live / 🔵 Pre-loaded badges
- Links to all APIs and data files
- PAVEAIR note: layer data requires login

---

## Tab 2: Design Tool

### Purpose
Interactive FAARFIELD CDF analysis for ANY US airport. User searches an airport, defines pavement, builds traffic mix, runs CDF. Full control over all inputs.

### Sections (scroll order)

#### 2.1 Airport Search + Map
- **Search bar** (top) with autocomplete from FAA ArcGIS
- **MapLibre map** showing:
  - 6 project airports (green/red markers, always visible)
  - Searched airports (blue markers, added on search)
  - Click any marker → selects that airport for analysis
- **Search result card** below map:
  - Airport name, ICAO, location, elevation
  - Runways (designator, length, width, surface)
  - Live/Cached badge
  - "Start Analysis" button → scrolls to analysis panel

#### 2.2 Airport Selector
- **Dropdown** to switch between:
  - 6 project airports (pre-loaded data)
  - Any searched airports (live data)
- **Section selector** (for project airports that have multiple sections)
- For searched airports: no pre-defined sections — user creates the pavement

**AUTO-FILL BEHAVIOR when selecting a project airport:**
When user picks KLHX, KPUB, KMQJ, KCIU, KOTM, or KMWH in the Design Tool:
1. **Layer Builder** → auto-fills with the actual pavement layers from `sections.json` (editable)
2. **Soil Horizon Picker** → auto-loads NRCS data from `subgrade.json` with pre-selected CBR
3. **Traffic Builder** → auto-loads full aircraft mix from `traffic.json` (79 types for KLHX, etc.)
4. **Growth Rate** → auto-fills from TAF data
5. **Design Parameters** → auto-fills: PCC thickness, AC thickness, CBR, flexural strength 700 psi, 20yr life
6. **CDF Results** → shows both Original (pre-computed from `cdf_results.json`) and Modified (live engine)

All auto-filled values are **editable** — user can change any input and see CDF update live.

**AUTO-FILL BEHAVIOR when selecting a searched airport:**
1. **Layer Builder** → empty (user must add layers manually, or pick a preset)
2. **Soil Horizon Picker** → auto-loads from live NRCS API call
3. **Traffic Builder** → empty + TAF Hints panel with quick-fill suggestions
4. **Growth Rate** → auto-computed from TAF historical trend
5. **Design Parameters** → defaults only (700 psi, 20yr)
6. **CDF Results** → single result (no "Original" to compare against)

#### 2.3 Pavement Structure — Layer Builder (from searched-airport-analysis.md spec)
- **For project airports:** auto-filled from `sections.json`, fully editable. Shows "Pre-loaded from course data" badge.
- **For searched airports:** empty LayerBuilder, user adds layers manually. Shows "No pavement data — define layers below" message.

**Layer Builder UI:**
```
┌─────────────────────────────────────────────────────────────┐
│ PAVEMENT STRUCTURE                    [Preset: AC on PCC ▼] │
│                                                             │
│  # │ Type              │ Thick (in) │ E (psi)    │ ν    │  │
│  1 │ [P-401 AC      ▼] │ [3.0     ] │ 200,000    │ 0.35 │ ×│
│  2 │ [P-501 PCC     ▼] │ [8.0     ] │ 4,000,000  │ 0.15 │ ×│
│  3 │ [P-209 Agg Base▼] │ [6.0     ] │ 75,000     │ 0.35 │ ×│
│                                                             │
│ Subgrade: CBR = 7 → E = 10,500 psi → k = 70 pci          │
│                                                             │
│ [+ Add Layer]                    [↑↓ Reorder] [🗑 Clear All]│
└─────────────────────────────────────────────────────────────┘
```

**Presets dropdown:**
- AC Overlay on Rigid (HMA on PCC) → 2.5" AC + 8" PCC
- AC Overlay on Rigid + Base → 2.5" AC + 8" PCC + 6" Agg Base
- AC Overlay on Rigid + Stabilized → 3" AC + 8" PCC + 6" Stabilized
- New Flexible → 4" AC + 8" P-209 Aggregate
- New Rigid → 10" PCC + 6" P-209 Aggregate
- Heavy Duty Rigid → 3" AC + 16" PCC + 6" Stabilized
- Blank → clear all layers

**Cross-section SVG** updates live as user changes layers.

#### 2.4 Soil Horizon Picker
- **For project airports:** pre-loaded from NRCS data
- **For searched airports:** auto-loaded from live NRCS API call
- 3 selection methods (at pavement bottom / weighted avg / weakest 1.5x)
- Conservative warning
- Manual CBR override

#### 2.5 Traffic Mix Builder
- **For project airports:** pre-loaded aircraft list from Excel data
- **For searched airports:** empty + TAF hints

**TAF Hints Panel** (for searched airports):
```
┌─────────────────────────────────────────────────────────────┐
│ SUGGESTED AIRCRAFT MIX (based on FAA TAF for OTZ)          │
│                                                             │
│ Annual Operations (2024):                                   │
│   Air Carrier:  2,000    Air Taxi:   20,000                │
│   GA Itinerant: 30,000   Military:   1,000                 │
│   GA Local:     7,000    Mil Local:  0                     │
│                                                             │
│ Based Aircraft: 37 single-engine, 6 multi-engine           │
│ Growth Rate: -1.2% (from TAF 10-yr trend)                  │
│                                                             │
│ Quick-fill suggestions (click to add):                      │
│ [+ Air Carrier]  B737-800 (500/yr) + A320 (500/yr)        │
│ [+ Air Taxi]     C208 (5000/yr) + DHC6 (3333/yr) +        │
│                  BE20 (1667/yr)                              │
│ [+ GA]           C172 (10000/yr) + PA28 (5000/yr)          │
│ [+ Military]     C130 (250/yr) + C17 (250/yr)             │
│                                                             │
│ ⚠ Estimates from TAF category totals (ops ÷ 2 = deps).    │
│   Actual aircraft mix may differ. Edit as needed.           │
└─────────────────────────────────────────────────────────────┘
```

**Aircraft Mix Table** (same as current, with gear diagrams, model names, data badges)

#### 2.6 Design Parameters
- PCC Thickness slider (4-30")
- AC Thickness slider (1-6")
- Subgrade CBR slider (1-50) — linked to Soil Picker
- PCC Flexural Strength slider (400-1000 psi)
- Growth Rate slider (-5% to +10%) — linked to TAF
- Design Life slider (5-40 years)
- E and k auto-computed from CBR

#### 2.7 CDF Results (live)
- **Verdict cards**: Original vs Modified (for project airports) OR single result (for searched)
- **CDF stacked bar chart** by failure mode
- **CDF threshold line** at 1.0
- **Controlling mode** label
- **Top aircraft table** by CDF contribution

#### 2.8 What-If Comparison
- **Project airports:** Side-by-side: Original (locked, from pre-computed `cdf_results.json`) vs Modified (live engine with user changes)
  - Highlights what changed: "PCC thickness: 6" → 10" (+4")" 
  - Shows CDF delta: "CDF: 10.15 → 0.009 (−99.9%)"
  - Verdict change: "UNDER → OVER"
- **Searched airports:** Single result only (no "Original" to compare)
  - Instead, show a **"Design Target" indicator**: CDF = 1.0 line
  - Message: "Adjust layers/traffic until CDF ≤ 1.0 for adequate design"

---

## Tab 3: Methodology

### Purpose
Reference page for the analysis methodology. Shared between both tabs.

### Sections

#### 3.1 Analysis Flow Diagram
```
Input Data → LEAF Analysis → Failure Models → CDF → Verdict
```
Visual flow with icons for each step.

#### 3.2 FAARFIELD Methodology
- Brief explanation of FAARFIELD 2.1.1
- HMA Overlay on Rigid analysis type
- How CDF determines over/under-design

#### 3.3 Failure Model Equations
Three cards with exact formulas:
- **AC Fatigue:** `log₁₀(Nf) = 2.68 − 5.0·log₁₀(εₕ) − 2.665·log₁₀(E_ac)`
- **Subgrade Rutting:** `Nf = 10000·(AA/εᵥ)^BB`
- **PCC Fatigue:** `log₁₀(Nf) = 11.737 − 12.077·SR`
- Constants and variable definitions for each

#### 3.4 Stress/Strain Calculation Methods
- Odemark equivalent thickness (subgrade vertical strain)
- Westergaard interior loading (PCC bending stress)
- Burmister 2-layer (AC horizontal strain)
- FAARFIELD growth formula: `Reps = [1 + Life·g·0.5] × Annual × Life`

#### 3.5 Subgrade Selection Methods
- Method 1: At pavement bottom
- Method 2: Weighted average
- Method 3: Weakest within 1.5x depth (conservative)
- AASHTO classification table
- CBR → E → k conversion formulas

#### 3.6 Data Sources & Freshness
Full table with all sources:

| Source | URL | Type | What it provides |
|--------|-----|------|-----------------|
| FAA ArcGIS | services6.arcgis.com | 🟢 Live | Airport locations + runways |
| NRCS SDA | SDMDataAccess.sc.egov.usda.gov | 🟢 Live | Soil profile by lat/lon |
| FAA TAF | taf.faa.gov | 🔵 FY2025 | Operations + forecast (3,319 airports) |
| FAA ACD | faa.gov/airports/engineering | 🔵 v2024 | Aircraft library (388 types) |
| FAA PAVEAIR | faapaveair.faa.gov | 🔒 Login required | Pavement layers (Network/Branch/Section) |
| Course Data | Excel | 🔵 2014-2021 | 6 airports, aircraft-level traffic |

#### 3.7 About
- Student: Chidchanok Pleesudjai
- Course: CEE 598 Topic Airport Design, ASU, Spring 2026
- Built with: React + Vite + Tailwind + Recharts + MapLibre
- Engine: FAARFIELD 2.1.1 methodology ported to JavaScript
- Source: FAARFIELD constants from modCDF.vb

---

## Technical Implementation

### Tab Component (App.jsx)
```jsx
const [activeTab, setActiveTab] = useState('report') // 'report' | 'tool' | 'methodology'

// Header nav
<nav>
  <button onClick={() => setActiveTab('report')}
    className={activeTab === 'report' ? 'active' : ''}>
    📋 Project Report
  </button>
  <button onClick={() => setActiveTab('tool')}
    className={activeTab === 'tool' ? 'active' : ''}>
    🔧 Design Tool
  </button>
  <button onClick={() => setActiveTab('methodology')}
    className={activeTab === 'methodology' ? 'active' : ''}>
    📊 Methodology
  </button>
</nav>

// Content
{activeTab === 'report' && <ProjectReport />}
{activeTab === 'tool' && <DesignTool />}
{activeTab === 'methodology' && <MethodologyTab />}
```

### New Components Needed

| Component | Tab | Description |
|-----------|-----|-------------|
| **TabNav.jsx** | All | Tab navigation bar in header |
| **ProjectReport.jsx** | Report | Container for all report sections |
| **AirportAccordion.jsx** | Report | Expandable per-airport detail panel |
| **KeyFindings.jsx** | Report | Bullet conclusions + design recommendations |
| **TrafficOverview.jsx** | Report | Cross-airport traffic comparison chart |
| **DesignTool.jsx** | Tool | Container for all design tool sections |
| **LayerBuilder.jsx** | Tool | Pavement layer editor with presets |
| **TrafficHints.jsx** | Tool | TAF-based aircraft suggestions |
| **MethodologyTab.jsx** | Methodology | Container with all methodology sections |

### Existing Components — Tab Assignment

| Component | Tab 1 (Report) | Tab 2 (Tool) | Tab 3 (Methodology) |
|-----------|:-:|:-:|:-:|
| Hero | ✓ | | |
| AirportMap | ✓ (no search) | ✓ (with search) | |
| AirportSearch | | ✓ | |
| SummaryTable | ✓ | | |
| AnalysisPanel | | ✓ | |
| SoilHorizonPicker | | ✓ | |
| TrafficBuilder | | ✓ | |
| SubgradeChart | ✓ | | |
| Methodology | | | ✓ |
| DataSources | ✓ | | ✓ |
| Footer | ✓ | ✓ | ✓ |

### State Sharing Between Tabs
- `selectedAirport` — shared (clicking in Report tab can open in Tool tab)
- `searchedAirport` — Tool tab only
- `customTraffic` — Tool tab only
- `customLayers` — Tool tab only (new state for LayerBuilder)

### URL Hash Routing (optional)
- `#report` → Project Report tab
- `#tool` → Design Tool tab
- `#tool/KPHX` → Design Tool with KPHX pre-selected
- `#methodology` → Methodology tab

## Implementation Steps

1. **Create TabNav + restructure App.jsx** — 3 tab containers
2. **Build ProjectReport.jsx** — move existing Hero, SummaryTable, SubgradeChart into it
3. **Build AirportAccordion.jsx** — expandable per-airport detail (new component)
4. **Build KeyFindings.jsx** — conclusions + recommendations (new component)
5. **Build DesignTool.jsx** — move AirportSearch, AnalysisPanel, TrafficBuilder into it
6. **Build LayerBuilder.jsx** — pavement layer editor (from searched-airport-analysis.md)
7. **Build TrafficHints.jsx** — TAF suggestions (from searched-airport-analysis.md)
8. **Build MethodologyTab.jsx** — expand existing Methodology + DataSources
9. **Wire tab state** — selectedAirport shared, customTraffic/customLayers per tool
10. **Polish** — tab transitions, active tab styling, URL hash routing

## Out of Scope
- Saving/loading analysis sessions (no backend)
- PDF export of report tab (use browser Ctrl+P with print CSS)
- Multiple simultaneous analyses (one airport at a time in tool tab)

## Execution
Run: `/execute specs/tab-layout-restructure.md`
Output: Restructured App.jsx + 5 new components + updated existing components
