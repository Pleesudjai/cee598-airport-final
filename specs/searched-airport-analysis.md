# Spec: Searched Airport Analysis Workflow

## What / Why
When a user searches any US airport (not one of the 6 project airports), enable them to run a full FAARFIELD CDF analysis. The website must guide them through providing the missing data and auto-fill everything that's available from public APIs.

## Data Availability for Searched Airports

| Input | Source | Auto? | User action |
|-------|--------|-------|-------------|
| Airport location + runways | FAA ArcGIS (live) | **AUTO** | None |
| Soil profile + CBR | NRCS SDA (live) | **AUTO** | Pick horizon in Soil Picker |
| Total operations by category | FAA TAF (pre-loaded) | **AUTO** | None |
| Operations forecast + growth rate | FAA TAF (pre-loaded) | **AUTO** | Can override |
| Based aircraft count | FAA TAF (pre-loaded) | **AUTO** | None |
| Aircraft library (MTOW, gear) | FAA ACD (pre-loaded) | **AUTO** on select | Pick from dropdown |
| **Aircraft mix (which types, how many)** | **NOT AVAILABLE** | **NO** | **User builds from ACD + TAF hints** |
| **Pavement layers (type, thickness)** | **NOT AVAILABLE** (PAVEAIR login required) | **NO** | **User inputs manually** |
| PCC flexural strength | Not available | **NO** | Default 700 psi, user can override |
| Design life | User choice | **NO** | Default 20 yr, user can override |

## User Workflow (Step-by-Step)

### Step 1: Search Airport
- User types ICAO code or name in search bar
- Auto-complete dropdown from FAA ArcGIS
- Click result → fetches: location, runways, soil profile, TAF data

### Step 2: Review Auto-Filled Data
Website shows a **"New Airport Analysis"** panel with:
- Airport info card (name, location, elevation, runways)
- Soil Horizon Picker (auto-loaded from NRCS, user picks design layer)
- TAF summary card (total ops by category, based aircraft, growth rate)
- All auto-filled, user can override any value

### Step 3: Define Pavement Structure (MANUAL — required)
User must input pavement layers. Provide a **Layer Builder** with:
- **"Add Layer" button** — adds a row
- Each layer row has:
  - Type dropdown: P-401 AC, P-501 PCC, P-154 Subbase, P-209 Agg Base, Stabilized Base, User Defined
  - Thickness input (inches)
  - Modulus auto-fills from type (editable)
  - Poisson ratio auto-fills from type (editable)
- **Preset templates** for common configurations:
  - "AC on PCC" → 3" AC + 8" PCC
  - "AC on PCC + Base" → 3" AC + 8" PCC + 6" Aggregate
  - "Flexible (AC only)" → 4" AC + 8" Aggregate Base
  - "Heavy Duty Rigid" → 3" AC + 16" PCC + 6" Stabilized Base
- Subgrade auto-fills from Soil Horizon Picker CBR
- **Drag to reorder** layers (or move up/down buttons)

Material defaults (from FAARFIELD):
| Type | E (psi) | Poisson |
|------|---------|---------|
| P-401 AC | 200,000 | 0.35 |
| P-501 PCC | 4,000,000 | 0.15 |
| P-154 Aggregate | 40,000 | 0.35 |
| P-209 Crushed Aggregate | 75,000 | 0.35 |
| Stabilized Base (Econocrete) | 500,000 | 0.20 |
| P-301 Soil Cement | 250,000 | 0.20 |
| P-304 Cement Treated | 500,000 | 0.20 |
| P-306 Lean Concrete | 700,000 | 0.20 |

### Step 4: Build Aircraft Mix (SEMI-AUTO)
User builds aircraft mix with help from TAF data. Provide:
- **TAF hints panel** showing:
  - "This airport has ~2,000 Air Carrier ops/yr → suggest B737/A320 class"
  - "This airport has ~20,000 Air Taxi ops/yr → suggest C208/DHC6/BE20 class"
  - "This airport has ~30,000 GA ops/yr → suggest C172/PA28 class"
  - "Based aircraft: 37 single, 6 multi → mostly light GA"
- **Quick-fill buttons** based on TAF categories:
  - "Add typical Air Carrier fleet" → adds B737-800 + A320 split evenly
  - "Add typical Air Taxi fleet" → adds C208 + DHC6 + BE20
  - "Add typical GA fleet" → adds C172 + PA28 + BE36
  - "Add typical Military" → adds C130 + C17
- Each button calculates departures from TAF category totals:
  - e.g. 2,000 Air Carrier ops ÷ 2 types = 1,000 dep/yr each (÷ 2 for departures = 500)
- User can then edit individual aircraft counts
- User can add/remove any aircraft from ACD library

### Step 5: Run Analysis
- All inputs defined → "Run CDF Analysis" button
- faarfieldEngine.js computes CDF instantly
- Results show: 3 failure mode CDFs, verdict, top aircraft, comparison chart
- User can tweak any input → live re-analysis

## New Components Needed

### LayerBuilder.jsx
```
┌─────────────────────────────────────────────────────────────┐
│ PAVEMENT STRUCTURE                                          │
│                                                             │
│ Preset: [AC on PCC ▼]  [Apply]                             │
│                                                             │
│  # │ Type              │ Thickness │ E (psi)    │ ν     │  │
│  1 │ [P-401 AC      ▼] │ [3.0  ]"  │ 200,000    │ 0.35  │ ×│
│  2 │ [P-501 PCC     ▼] │ [8.0  ]"  │ 4,000,000  │ 0.15  │ ×│
│  3 │ [P-209 Agg Base▼] │ [6.0  ]"  │ 75,000     │ 0.35  │ ×│
│                                                             │
│ Subgrade: CBR = 7 (from Soil Picker) → E = 10,500 psi      │
│                                                             │
│ [+ Add Layer]                                               │
└─────────────────────────────────────────────────────────────┘
```

### TrafficHints.jsx
```
┌─────────────────────────────────────────────────────────────┐
│ SUGGESTED AIRCRAFT MIX (based on TAF data)                  │
│                                                             │
│ TAF shows: AC=2,000  AT=20,000  GA=30,000  Mil=1,000      │
│ Based: 37 single, 6 multi, 0 jet                           │
│                                                             │
│ [+ Add Air Carrier fleet]  → B737 (1000/yr) + A320 (1000/yr)│
│ [+ Add Air Taxi fleet]     → C208 (6667/yr) + BE20 (3333/yr)│
│ [+ Add GA fleet]           → C172 (20000/yr) + PA28 (10000/yr)│
│ [+ Add Military]           → C130 (500/yr)                  │
│                                                             │
│ ⚠ These are estimates from TAF category totals.             │
│   Actual aircraft mix may differ. Edit as needed.           │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Steps

1. **Build LayerBuilder.jsx**
   - Layer type dropdown with auto-fill modulus/Poisson
   - Add/remove layer rows
   - Preset templates dropdown
   - Cross-section SVG updates live

2. **Build TrafficHints.jsx**
   - Reads TAF data for searched airport
   - Shows category breakdown + based aircraft
   - Quick-fill buttons that add aircraft to TrafficBuilder
   - Departure estimates from category totals

3. **Update AnalysisPanel** to detect searched vs project airport
   - Project airports (6): load pre-built layers + traffic from JSON
   - Searched airports: show LayerBuilder + TrafficHints instead
   - Both paths feed into the same CDF engine

4. **Update App.jsx** to pass searched airport data through the full chain
   - searchedAirport → AnalysisPanel → LayerBuilder + SoilPicker + TrafficHints → CDF engine

5. **Add "New Analysis" flow** triggered from AirportSearch result
   - After search completes, show "Start Analysis" button
   - Scrolls to AnalysisPanel with searched airport selected
   - LayerBuilder empty (or with preset), SoilPicker auto-filled, TrafficHints showing

## TAF Category → Aircraft Type Mapping

| TAF Category | Suggested Aircraft | Typical MTOW | Gear |
|-------------|-------------------|-------------|------|
| Air Carrier (itn_ac) | B737-800, A320, B757 | 150,000-255,000 | D, 2D |
| Air Taxi (itn_at) | C208, BE20, DHC6, B190 | 9,000-17,000 | S, D |
| GA Itinerant (itn_ga) | C172, PA28, BE36, C182 | 2,000-4,000 | S |
| Military Itinerant (itn_mil) | C130, C17, F16, KC135 | 42,000-585,000 | 2D, S |
| GA Local (loc_ga) | C172, PA28 (training) | 2,000-2,500 | S |
| Military Local (loc_mil) | F16, T38 | 12,000-42,000 | S |

**Departure calculation:** TAF counts operations (landings + takeoffs). FAARFIELD uses departures only. Divide TAF ops by 2 for departures.

## Out of Scope
- Auto-fetching pavement layers (PAVEAIR requires login — confirmed)
- Aircraft mix from actual flight records (TFMS not public)
- Auto-detecting pavement type from runway surface code (ASPH/CONC only tells surface, not full structure)

## Execution
Run: `/execute specs/searched-airport-analysis.md`
Output: `LayerBuilder.jsx`, `TrafficHints.jsx`, updated `AnalysisPanel.jsx`
