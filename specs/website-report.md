# Spec: Airport Pavement Analysis — Interactive Website with Live Re-Analysis

## What / Why
Build an interactive single-page website that presents FAARFIELD CDF results for all 6 airports (13 sections) AND allows users to change inputs and re-run the CDF calculation live in the browser. Same tech as CarbonLens hackathon. This is the CEE 598 final project deliverable.

## Key Difference from Static Report
The FAARFIELD engine (Odemark + Westergaard + failure models + CDF) is **ported to JavaScript** and runs client-side. Users can:
- Adjust CBR / subgrade modulus with a slider → CDF updates instantly
- Change PCC thickness → see how much concrete is needed
- Change PCC flexural strength → see sensitivity
- Toggle aircraft on/off → see which ones drive the design
- Change growth rate / design life
- Compare original vs modified scenario side by side

No backend needed — all computation in the browser (pure math, runs in <100ms).

**NEW: Hybrid data approach** — live APIs for airport/soil + pre-loaded JSON for traffic/aircraft.

**Override for native-stress mode:** When the website needs native FAARFIELD stress visualization through `LEAFClassLib`, `AMClassLib`, `FAAMeshClassLib`, `FEMClassLib`, and `Nike3d.dll`, use the Windows backend architecture in `specs/website-faarfield-native-backend.md`. The browser-only flow in this spec applies only to the approximate client-side CDF mode.

## Data Freshness Strategy (Hybrid)

| Source | Type | Freshness | Badge on UI |
|--------|------|-----------|-------------|
| FAA ArcGIS (Airport + Runways) | **Live API** — fetched on demand | Always current | 🟢 **Live** |
| NRCS SDA (Soil) | **Live API** — fetched on demand | Always current | 🟢 **Live** |
| FAA TAF (Operations + Forecast) | **Pre-loaded JSON** — converted from downloaded Excel | Frozen at build time | 🔵 **TAF FY2025 (updated Feb 2025)** |
| FAA ACD (Aircraft Library) | **Pre-loaded JSON** — converted from downloaded Excel | Frozen at build time | 🔵 **ACD v2024** |
| Project Traffic (6 airports) | **Pre-loaded JSON** — from given Excel | Aircraft-level detail (2014-2021) | 🔵 **Course Data (aircraft detail)** |

**Verified:** The Excel Growth Rate sheet is **identical** to the TAF download for all 6 airports (21 years, every number matches). The TAF supersedes the Excel with 3,319 airports and 1990-2055 coverage. However, the Excel Traffic sheets have **aircraft-level detail** (ICAO type, MTOW, gear, per-flight counts) that the TAF does NOT have — TAF only has category totals (GA, Military, etc.).

**Why hybrid?** TAF and ACD have no query API — FAA only provides downloadable files. ArcGIS and NRCS have true REST endpoints. The website uses live APIs where possible and clearly labels pre-loaded data with its vintage date.

## Tech Stack

| Tool | Purpose |
|------|---------|
| **React 18** | Component framework |
| **Vite** | Build tool |
| **Tailwind CSS** | Styling |
| **MapLibre GL JS** | Airport map with markers |
| **Recharts** | Charts (stacked bar, bar, radar) |
| **Plotly.js** | Stress contours, heatmaps, and depth-profile charts |
| **faarfieldEngine.js** | FAARFIELD CDF engine ported to JS (client-side) |

## Live API & Data Connections (no auth required)

### API 1: FAA ArcGIS — Airport Lookup
- **Endpoint:** `https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/US_Airport/FeatureServer/0/query`
- **Use:** User types ICAO code → fetch airport name, lat/lon, elevation, state
- **Query:** `?where=ICAO_ID='KXXX'&outFields=*&f=json`
- **Returns:** NAME, LATITUDE, LONGITUDE, ELEVATION, SERVCITY, STATE, GLOBAL_ID

### API 2: FAA ArcGIS — Runway Data
- **Endpoint:** `https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/Runways/FeatureServer/0/query`
- **Use:** After airport lookup, fetch runways using GLOBAL_ID linkage
- **Query:** `?where=AIRPORT_ID='GUID'&outFields=*&f=json`
- **Returns:** DESIGNATOR, LENGTH, WIDTH, COMP_CODE (surface type)

### API 3: USDA NRCS Soil Data Access — Subgrade Properties
- **Endpoint:** `https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest`
- **Method:** POST with JSON body `{"query":"SQL","format":"JSON"}`
- **Use:** After getting lat/lon from FAA, query soil profile at airport location

### Data 4: FAA Terminal Area Forecast (TAF) — Traffic Operations
- **Download:** `https://taf.faa.gov/Downloads/APO100_TAF_Final_2025.zip` (15 MB)
- **Contains 5 files for 3,319 US airports (1990-2055):**
  - `Airports.xlsx` — LOCID, name, lat/lon, hub size, facility class
  - `AirportsOperations.xlsx` — Annual operations by category (Air Carrier, Air Taxi, GA, Military) + forecast through 2055
  - `BasedAircraft.xlsx` — Based aircraft by type (single, jet, multi, helo)
  - `Enplanements.xlsx` — Passenger boarding data
  - `Tracon.xlsx` — TRACON operations
- **Use in website:** Pre-loaded as static JSON. When user searches an airport:
  - Auto-fill total annual operations by category
  - Auto-compute growth rate from historical trend
  - Show forecast operations through 2055
  - Show based aircraft mix (single vs jet vs multi)
- **Limitation:** TAF gives category totals (GA, Military, etc.) but NOT individual aircraft types. The aircraft-level detail (ICAO type, MTOW, gear) comes from FAA ACD library.

### Data 5: FAA Aircraft Characteristics Database (ACD) — Aircraft Library
- **Download:** `https://www.faa.gov/airports/engineering/aircraft_char_database/aircraft_data`
- **Format:** Excel file, 388 aircraft, 56 columns
- **Key columns:** ICAO_Code, MTOW_lb, MALW_lb, Main_Gear_Config, Wheelbase_ft, Main_Gear_Width_ft, ADG, TDG
- **Use in website:** Pre-loaded as JSON aircraft library. User selects aircraft from dropdown → MTOW, gear, tire pressure auto-fill.
- **Saved at:** `central brain/FAA_Aircraft_Characteristics_Database.xlsx`
- **SQL Query:**
```sql
SELECT co.compname, co.comppct_r, ch.hzname,
       ch.hzdept_r AS TopCm, ch.hzdepb_r AS BotCm,
       ctg.texture, ch.sandtotal_r AS Sand,
       ch.silttotal_r AS Silt, ch.claytotal_r AS Clay,
       ch.ll_r AS LL, ch.pi_r AS PI,
       ch.sieveno200_r AS Pass200
FROM component co
INNER JOIN chorizon ch ON co.cokey = ch.cokey
INNER JOIN chtexturegrp ctg ON ch.chkey = ctg.chkey AND ctg.rvindicator = 'Yes'
WHERE co.cokey IN (
    SELECT co2.cokey FROM mapunit mu
    INNER JOIN component co2 ON mu.mukey = co2.mukey
    WHERE mu.mukey IN (
        SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('POINT(LON LAT)')
    ) AND co2.comppct_r >= 50
)
ORDER BY co.comppct_r DESC, ch.hzdept_r ASC
```
- **Returns:** Full soil profile (all horizons) → user picks design layer → JS classifies → estimates CBR

### API Flow (User types ICAO code):
```
1. User types "KPHX" in search box
2. → Fetch FAA ArcGIS: get name, lat/lon, elevation, runways
3. → Fetch NRCS SDA: get FULL soil profile (all horizons with depths)
4. → Look up TAF data: get annual operations by category + forecast + based aircraft
5. → Display Soil Horizon Picker (see below)
6. → User selects which horizon to use as subgrade
7. → JS auto-classifies: LL, PI, #200 → AASHTO group → CBR estimate
8. → Auto-fills subgrade CBR slider (user can still override)
9. → Auto-fills traffic summary from TAF (operations by category, growth rate)
10. → User defines pavement layers manually (or picks from presets)
11. → User builds aircraft mix from ACD library (dropdown with MTOW/gear auto-fill)
12. → faarfieldEngine.js runs CDF → results display instantly
```

### Soil Horizon Picker (interactive component)

After NRCS returns the soil profile, display ALL horizons in a visual table:

```
┌─────────────────────────────────────────────────────────────────┐
│  Soil Profile at KPHX (33.4373, -112.0078)                     │
│  Dominant: Gilman loam (85%)                                    │
│                                                                 │
│  ○  A    0-15 cm   Loam       Sand=42 Clay=18 LL=30 PI=10     │
│  ○  Bw  15-51 cm   Clay Loam  Sand=35 Clay=28 LL=38 PI=18     │
│  ●  Bk  51-89 cm   Loam       Sand=40 Clay=22 LL=32 PI=12  ← RECOMMENDED │
│  ○  Cr  89-152 cm  Bedrock    —                                │
│                                                                 │
│  Selection Method:                                              │
│  ○ Method 1: Layer at pavement bottom (auto-selects by depth)   │
│  ○ Method 2: Weighted average of all layers below pavement      │
│  ● Method 3: Weakest layer within 1.5x pavement depth (CONSERVATIVE) │
│                                                                 │
│  Pavement depth: [17.5] inches  (used for auto-selection)       │
│                                                                 │
│  Selected: Bk (51-89 cm) → AASHTO A-6 → CBR ≈ 7               │
│  ⚠ Conservative recommendation: Bw (15-51 cm) → A-7-6 → CBR ≈ 4 │
└─────────────────────────────────────────────────────────────────┘
```

**Three selection methods available** (from NRCS_Soil_Data.md):

| Method | What it does | When to use |
|--------|-------------|-------------|
| **1. At pavement bottom** | Picks horizon at total pavement depth | Quick estimate (most common) |
| **2. Weighted average** | Averages all horizons below pavement weighted by thickness | When soil varies a lot |
| **3. Weakest layer (1.5x depth)** | Picks horizon with lowest CBR within 1.5x pavement depth | **Most conservative — RECOMMENDED** |

**Conservative recommendation logic (shown with ⚠ icon):**
- Always highlight the weakest horizon within 1.5x total pavement depth
- If user picks Method 1 or 2, show a warning: "Conservative estimate (Method 3) gives CBR = X, which is lower"
- Let user override to any value — the recommendation is guidance, not forced

**The horizon picker lets user:**
- Click any horizon row to select it manually
- Choose between the 3 methods via radio buttons
- See the auto-selected horizon update when pavement thickness changes
- Override CBR with manual input after selection

### AASHTO Auto-Classification (in JS)
```javascript
function classifyAASHTO(pass200, ll, pi) {
    if (pass200 <= 35) {
        if (pass200 <= 15 && pi <= 6) return { group: 'A-1-a', cbr: 30 };
        if (pass200 <= 25 && pi <= 6) return { group: 'A-1-b', cbr: 25 };
        if (ll <= 40 && pi <= 10) return { group: 'A-2-4', cbr: 20 };
        return { group: 'A-2-6', cbr: 15 };
    }
    if (pass200 > 35 && ll <= 40 && pi <= 10) return { group: 'A-4', cbr: 8 };
    if (pass200 > 35 && ll > 40 && pi <= 10) return { group: 'A-5', cbr: 5 };
    if (pass200 > 35 && ll <= 40 && pi > 10) return { group: 'A-6', cbr: 7 };
    return { group: 'A-7-6', cbr: 4 };
}
```

## Architecture

```
Browser (React SPA)
  │
  ├── Live APIs (fetch on demand when searching new airport)
  │   ├── FAA ArcGIS → airport name, lat/lon, runways
  │   └── NRCS SDA → soil profile → auto CBR
  │
  ├── Pre-loaded Static Data (JSON, bundled with app)
  │   ├── airports.json — 6 project airports with sections & pre-computed CDF
  │   ├── sections.json — 13 sections with layers
  │   ├── traffic.json — per-airport aircraft lists
  │   ├── cdf_results.json — pre-computed results (from Python)
  │   ├── taf_operations.json — TAF data for 3,319 airports (operations + forecast)
  │   ├── taf_based_aircraft.json — based aircraft by type for all airports
  │   └── aircraft_library.json — FAA ACD 388 aircraft (ICAO, MTOW, gear, dimensions)
  │
  ├── faarfieldEngine.js — pure JS CDF engine (no dependencies)
  │   ├── odemarkSubgradeStrain()
  │   ├── westergaardPccStress()
  │   ├── burmisterAcStrain()
  │   ├── acFatigueLife(), subgradeRuttingLife(), pccFatigueLife()
  │   └── analyzeSection() → { cdf_ac, cdf_sub, cdf_pcc, cdf_max }
  │
  ├── apiClient.js — FAA + NRCS live fetch wrappers
  │   ├── fetchAirport(icao) → { name, lat, lon, elevation, runways }
  │   ├── fetchSoilProfile(lat, lon) → { horizons[], aashto, cbr }
  │   ├── classifyAASHTO(pass200, ll, pi) → { group, cbr }
  │   └── parseDMS(dmsString) → decimal degrees
  │
  ├── tafClient.js — TAF data lookup (from pre-loaded JSON)
  │   ├── getOperations(locid) → { yearly ops by category, 1990-2024 }
  │   ├── getForecast(locid) → { forecast ops, 2025-2055 }
  │   ├── getBasedAircraft(locid) → { single, jet, multi, helo }
  │   └── computeGrowthRate(locid, startYear, endYear) → CAGR %
  │
  └── React Components — display + controls
```

**Data flow:**
- 6 project airports: load instantly from static JSON (CDF pre-computed)
- Any US airport search: FAA ArcGIS (live) → NRCS (live) → TAF (pre-loaded) → ACD (pre-loaded) → CDF engine (instant)
- Input changes: `analyzeSection()` re-runs → charts update in <100ms

## Pages / Sections

### Section 1: Hero
- Title: "Airport Pavement Structural Evaluation using FAARFIELD"
- Subtitle: CEE 598 Airport Design — Spring 2026 — Chidchanok Pleesudjai
- Key stat: "10 of 13 sections are under-designed"

### Section 2: Airport Map + Search
- MapLibre with 6 project markers (lat/lon from FAA data)
- Color: green = all adequate, red = at least one under-designed
- Click marker → scrolls to that airport's detail panel
- **NEW: Search bar** — type any US ICAO code (e.g. "KPHX")
  - Calls FAA ArcGIS API → gets location, adds marker to map
  - Calls NRCS SDA API → gets soil profile, auto-classifies CBR
  - Opens Analysis Panel pre-filled with that airport's soil data
  - User then defines layers + traffic to run CDF

### Section 3: Grand Summary Table
- All 13 sections in one table
- Columns: Airport, Section, Use, Layers, CDF, Controlling Mode, Verdict badge
- Sortable columns
- Color-coded rows (green/red)

### Section 4: Interactive Analysis Panel (MAIN FEATURE)
- **Airport selector** dropdown (pick one of 6)
- **Section selector** (sections for that airport)
- Shows:
  - Pavement cross-section diagram (SVG, layers drawn to scale)
  - Current input parameters in editable fields
  - CDF results with stacked bar chart

#### Editable Inputs (sliders + number fields):
| Input | Range | Default |
|-------|-------|---------|
| PCC Thickness | 4-30 inches | Actual from data |
| AC Thickness | 1-6 inches | Actual from data |
| Subgrade CBR | 1-50 | From NRCS data |
| PCC Flexural Strength | 400-1000 psi | 700 |
| Growth Rate | -5% to +10% | From TAF data |
| Design Life | 5-40 years | 20 |

#### Live Outputs (update on any input change):
- CDF (AC Fatigue) — bar
- CDF (Subgrade Rutting) — bar
- CDF (PCC Fatigue) — bar
- CDF (Maximum) — highlighted
- Controlling mode label
- Verdict badge: OVER / UNDER
- Top 5 aircraft by damage contribution (mini table)

#### What-If Comparison:
- "Original" column (locked to actual data) vs "Modified" column (user inputs)
- Side-by-side bar chart showing both scenarios

### Section 5: Traffic Builder (powered by TAF + ACD)
- **TAF Operations Panel** (auto-filled when airport is selected):
  - Historical operations chart (1990-2024) by category (AC, AT, GA, Mil)
  - Forecast operations (2025-2055) shown as dashed line
  - Auto-computed CAGR from TAF data
  - Based aircraft breakdown (single, jet, multi, helo)
- **Aircraft Mix Builder** (for CDF analysis):
  - Searchable dropdown from FAA ACD library (388 aircraft)
  - User picks aircraft → auto-fills from ACD: MTOW, gear config, wheelbase, gear width
  - **Advanced Load Configuration panel** (expandable per aircraft):
    - Each field shows: `[Default] [User Override]` toggle
    - Fields:

    | Parameter | Auto-filled from | Default | User can override? |
    |-----------|-----------------|---------|-------------------|
    | MTOW (lbs) | ACD `MTOW_lb` | From ACD | YES — slider + number input |
    | Gear Config | ACD `Main_Gear_Config` | From ACD | YES — dropdown (S, D, 2D, 3D, etc.) |
    | Tire Pressure (psi) | Estimated from gear type | S=100, D=170, 2D=190 | YES — number input |
    | Number of Tires | Derived from gear config | S=2, D=4, 2D=8, 3D=12 | YES — number input |
    | Main Gear % | FAARFIELD default | 95% | YES — slider (80-100%) |
    | Wheelbase (ft) | ACD `Wheelbase_ft` | From ACD | YES — number input |
    | Gear Width (ft) | ACD `Main_Gear_Width_ft` | From ACD | YES — number input |
    | Annual Departures | User input (required) | — | YES — number input |

    - "Reset to defaults" button per aircraft
    - "Reset all" button for entire mix
    - Visual indicator: blue = default, orange = user override
  - "Quick fill" presets for common mixes (Light GA, Regional, Commercial, Military)
  - For the 6 project airports: traffic pre-loaded from Excel data with all defaults
- **Growth Rate**: auto-computed from TAF, user can override

### Section 6: Subgrade Data
- Bar chart: CBR across 6 airports (color = quality)
- Table: soil type, AASHTO, CBR, E, k, quality
- Data source note: USDA NRCS Web Soil Survey API

### Section 7: Methodology
- Flow diagram: Inputs → LEAF → Failure Models → CDF → Verdict
- Equations shown with FAARFIELD constants
- Three failure mode descriptions with formulas
- Data sources: NRCS, FAA ArcGIS, FAA ACD

### Section 8: Data Sources & Freshness
- Table listing all 5 data sources with links
- Freshness badges: 🟢 Live (ArcGIS, NRCS) vs 🔵 Pre-loaded (TAF, ACD) vs 📋 Course Data
- "Last fetched" timestamps for live APIs
- "Data vintage" dates for pre-loaded (TAF FY2025, ACD v2024)
- Download links for raw data files
- Note: "TAF and ACD can be refreshed by re-downloading from FAA and rebuilding the app"

### Section 9: Footer
- Student, course, professor, date
- Data source links
- "Built with React + FAARFIELD methodology"

## Folder Structure

```
website/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx
    ├── index.css
    ├── App.jsx                    ← Main layout + scroll sections
    ├── engine/
    │   └── faarfieldEngine.js     ← FAARFIELD CDF engine (pure JS, no deps)
    ├── api/
    │   ├── apiClient.js           ← FAA ArcGIS + NRCS SDA live fetch wrappers
    │   └── tafClient.js           ← TAF data lookup from pre-loaded JSON
    ├── data/
    │   ├── airports.json          ← 6 project airports with lat/lon
    │   ├── sections.json          ← 13 sections with layers
    │   ├── subgrade.json          ← 6 soil profiles
    │   ├── traffic.json           ← per-airport aircraft lists (from Excel)
    │   ├── cdf_results.json       ← pre-computed CDF results (from Python)
    │   ├── taf_operations.json    ← TAF operations for 3,319 airports (1990-2055)
    │   ├── taf_based_aircraft.json ← based aircraft by type (all airports)
    │   └── aircraft_library.json  ← FAA ACD 388 aircraft (ICAO, MTOW, gear, dims)
    └── components/
        ├── Hero.jsx
        ├── AirportMap.jsx         ← MapLibre + search bar
        ├── AirportSearch.jsx     ← ICAO search → live API fetch
        ├── SoilHorizonPicker.jsx ← Soil profile display + horizon selection + 3 methods
        ├── SummaryTable.jsx       ← Grand summary (all 13)
        ├── AnalysisPanel.jsx      ← MAIN: interactive CDF re-analysis
        ├── InputControls.jsx      ← Sliders + fields for editable params
        ├── CDFChart.jsx           ← Recharts stacked bar (live updating)
        ├── ComparisonView.jsx     ← Original vs Modified side-by-side
        ├── CrossSection.jsx       ← SVG pavement layer diagram
        ├── AircraftTable.jsx      ← Top aircraft by damage
        ├── TrafficBuilder.jsx    ← TAF ops chart + ACD aircraft picker
        ├── TAFChart.jsx          ← Historical + forecast operations chart
        ├── AircraftPicker.jsx    ← Searchable ACD dropdown with auto-fill
        ├── SubgradeChart.jsx      ← CBR comparison
        ├── Methodology.jsx        ← Flow diagram + equations
        └── Footer.jsx
```

## Implementation Steps

### Phase 1: Engine + API + Data (do first)
1. **Port faarfield_engine.py to faarfieldEngine.js**
   - Same functions, same constants, same math
   - Pure JS (no numpy/scipy needed — all basic math)
   - Export: `analyzeSection(layers, traffic, growth, life, flexuralStrength)`
   - Returns: `{ cdf_ac, cdf_sub, cdf_pcc, cdf_max, controlling, adequate, details[] }`

2. **Build apiClient.js** — live API fetch wrappers
   - `fetchAirport(icao)` → calls FAA ArcGIS → returns `{ name, lat, lon, elevation, state, runways[] }`
   - `fetchSoilProfile(lat, lon)` → calls NRCS SDA with SQL → returns `{ horizons[], dominant soil, texture, LL, PI, pass200 }`
   - `classifyAASHTO(pass200, ll, pi)` → returns `{ group, estimatedCBR }`
   - `parseDMS(dmsString)` → converts FAA lat/lon format to decimal degrees
   - Handle CORS: NRCS and FAA ArcGIS both allow cross-origin requests
   - Error handling: show user-friendly message if API is down or airport not found

3. **Generate JSON data files** from Python
   - Script: `scripts/generate_website_data.py`
   - Reads Excel + results → outputs airports.json, sections.json, subgrade.json, traffic.json
   - cdf_results.json already exists from all_airports_cdf.py
   - Convert TAF Excel files (from TAF_2025.zip) → taf_operations.json, taf_based_aircraft.json
   - Convert FAA ACD Excel → aircraft_library.json (388 aircraft with ICAO, MTOW, gear, wheelbase, ADG, TDG)
   - Sources: `central brain/TAF_2025.zip`, `central brain/FAA_Aircraft_Characteristics_Database.xlsx`

### Phase 2: Scaffold + Static Components
3. **Scaffold React + Vite + Tailwind**
   - `npm create vite@latest website -- --template react`
   - Install: tailwindcss, recharts, maplibre-gl

4. **Build static components**
   - Hero, Footer, Methodology, SummaryTable
   - These just render from JSON data

### Phase 3: Interactive Components
5. **Build AnalysisPanel** (the main feature)
   - Airport/section selector
   - InputControls with sliders
   - Wire to faarfieldEngine.js
   - CDFChart that re-renders on input change

6. **Build ComparisonView**
   - Original (locked) vs Modified (user) side-by-side

7. **Build CrossSection SVG**
   - Draws layers to scale, updates when thickness changes

### Phase 4: Map + Search + Charts
8. **AirportMap** with MapLibre markers
9. **AirportSearch** — ICAO search bar wired to apiClient.js
   - Type ICAO → fetch airport + soil → add marker → open analysis panel
   - Loading spinner while APIs respond
   - Display: airport name, location, runways, soil profile, auto-CBR
10. **SubgradeChart** + **TrafficSummary** with Recharts

### Phase 5: Polish
10. **Desktop-only layout, print mode, final testing**
    - Desktop-first (no mobile breakpoints needed — presentation is on laptop)
    - Print-friendly mode for professor (Ctrl+P renders clean)

## Design / Styling — AeroPave Pro Style

**Reference:** `C:\Users\chidc\Downloads\stitch_airport_pavement_fea_portal` (metric_slate theme)

**Design Philosophy:** "The Architectural Blueprint"
- Professional engineering aesthetic (not generic SaaS)
- Hyper-legible, dense data presentation
- **"No-Line Rule"** — boundaries via background color shifts, not borders
- Intentional asymmetry, glassmorphism on floating panels
- Tonal shadows (never black), ghost borders at 20% opacity

### Color Palette (Material Design 3 derived)
```
Primary:              #00327d (Deep Navy Blue — CTAs, highlights)
Primary Container:    #0047ab (Brighter Blue — gradients)
Secondary:            #4e5e85 (Slate Blue — secondary accents)
Secondary Container:  #c1d1ff (Light blue tint)
Tertiary:             #651f00 (Dark Orange — warnings only)
Error:                #ba1a1a (Critical alerts — red)
Surface:              #f9f9fd (Main canvas — near white)
Surface Lowest:       #ffffff (Card surfaces)
Surface Low:          #f3f3f7 (Navigation, sidebar backgrounds)
Surface High:         #e7e8eb (Hover states)
Outline:              #737784 (Text labels)
Outline Variant:      #c3c6d5 (Subtle borders at 20% opacity)
```

**Verdict colors (custom for this project):**
- Over-designed: `emerald-600` on `emerald-50` background
- Under-designed: Error red `#ba1a1a` on `#ffdad6` background
- Borderline (CDF 0.8-1.2): Tertiary `#651f00` on `#8b2e01/10` background

### Typography
- **Font:** Inter (Google Fonts, weights 100-900)
- **Icons:** Material Symbols Outlined (variable weight)
- Page headers: `text-4xl font-extrabold tracking-tighter`
- Section headers: `text-3xl font-extrabold`
- Card titles: `text-xl font-bold`
- Labels: `text-[10px] font-bold uppercase tracking-widest`
- Body: `text-sm font-medium`
- Numbers/equations: `font-mono`

### Layout
- 12-column grid system (`grid-cols-12`)
- Fixed left sidebar (w-64) for navigation
- Sticky top header (h-16) for logo + search
- Main content: `max-w-[1600px]` centered
- Cards: `rounded-xl` with tonal shadow `shadow-[0px_12px_32px_rgba(25,28,30,0.06)]`
- Glassmorphism: `backdrop-filter: blur(24px)` on floating panels

### Component Patterns
- **Cards:** `bg-white rounded-xl p-6` — no border, use shadow only
- **Buttons (primary):** `bg-gradient-to-r from-[#00327d] to-[#0047ab] text-white rounded-full px-6 py-3`
- **Buttons (secondary):** `bg-surface-container-high text-on-surface rounded-full`
- **Inputs:** `bg-[#f3f3f7] border-none rounded-lg focus:ring-2 focus:ring-[#00327d]`
- **Tables:** No row borders — hover state `hover:bg-[#f3f3f7]`, dividers at 20% opacity
- **Status dots:** Green (adequate), Red (failing), Yellow (borderline)
- **Badges:** `text-[9px] px-2 py-0.5 rounded uppercase tracking-widest`

### Tailwind Config Extension
```javascript
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#00327d',
        'primary-container': '#0047ab',
        secondary: '#4e5e85',
        'secondary-container': '#c1d1ff',
        tertiary: '#651f00',
        'tertiary-container': '#8b2e01',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        surface: '#f9f9fd',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f3f3f7',
        'surface-container-high': '#e7e8eb',
        outline: '#737784',
        'outline-variant': '#c3c6d5',
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
}
```

### Custom CSS
```css
body { font-family: 'Inter', sans-serif; }
.glass-panel {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #c3c6d5; border-radius: 10px; }
```

### Design Rules
- **DO:** Use surface-container tiers for grouping, embrace high density, use tertiary/error sparingly
- **DON'T:** Use 100% opaque borders, rounded pills for data, pure black shadows

## Codex Review Fixes (applied)

### Fix 1: "Any US airport" workflow clarified
For searched airports (not the 6 project airports):
- FAA ArcGIS provides: airport location + runways
- NRCS provides: soil profile → auto-CBR
- TAF provides: total operations by category + growth rate
- TAF does NOT have aircraft-level detail (no ICAO types, no MTOW per flight)
- **User must build aircraft mix manually** from ACD library dropdown
- The 6 project airports have pre-loaded aircraft-level traffic from Excel

### Fix 2: Aircraft Mix Editor is IN scope
Renamed from "traffic builder" — it is a full editor with per-aircraft overrides. Not out of scope.

### Fix 3: JS/Python engine parity test
Before building UI, validate JS engine against Python:
- Run both on KLHX Section 6627 with identical inputs
- CDF values must match within **0.1% tolerance**
- If drift: fix JS engine before proceeding
- Parity test script: `scripts/engine_parity_test.js` vs `scripts/klhx_cdf_analysis.py`

### Fix 4: Data model schema (one definition per file)
```
airports.json: [{ icao, name, state, lat, lon, elevation, sections: [section_id, ...] }]
sections.json: [{ section_id, icao, use, desc, layers: [{type, h, E, nu}], subgrade: {E, cbr} }]
traffic.json:  { "KLHX": [{ type, mtow, gear, annual_deps }], "KPUB": [...], ... }
subgrade.json: { "KLHX": { soil, aashto, cbr, E, k, horizons: [...] }, ... }
cdf_results.json: [{ icao, section_id, cdf_ac, cdf_sub, cdf_pcc, cdf_max, controlling, adequate, top_aircraft: [...] }]
taf_operations.json: { "LHX": { historical: [{year, ac, at, ga, mil, loc_ga, loc_mil}], forecast: [...] }, ... }
taf_based_aircraft.json: { "LHX": [{year, single, jet, multi, helo}], ... }
aircraft_library.json: [{ icao, manufacturer, model, mtow, malw, gear, wheelbase, gear_width, adg, tdg }]
```

### Fix 5: Growth rate logic specified
- **Base year:** Last year of historical data in the traffic sheet (2021 for most airports)
- **Growth applied:** Uniformly to ALL aircraft in the mix (same CAGR for every type)
- **Source:** CAGR computed from TAF historical data (or user override)
- **Formula:** `design_deps = annual_deps * ((1 + growth)^life - 1) / growth`
- For searched airports: CAGR auto-computed from TAF last 10 years, user can override

### Fix 6: Soil → E, k formulas specified
After CBR is determined (from horizon picker or manual input):
```
E_subgrade (psi) = 1500 * CBR          (FAARFIELD default)
k (pci) = (E / 20.15) ^ (1 / 1.28405)  (FAARFIELD default)
```
Both E and k shown on UI. User can override CBR → E and k auto-update. Or override E directly.

### Fix 7: API failure fallback
- On first successful fetch, cache response in `localStorage`
- If API call fails: use cached data + show warning badge "⚠ Using cached data (last fetched: DATE)"
- If no cache exists: show error "API unavailable — enter data manually"
- For the 6 project airports: all data is pre-loaded, no API dependency

### Fix 8: TAF bundle size — keep all 3,319 airports
- Full TAF data (~3,319 airports) pre-loaded as JSON
- Estimated bundle: ~3-5 MB compressed (acceptable for localhost)
- Lazy-parse on search (don't parse entire file on load — index by LOCID)

## Out of Scope
- Backend / serverless (all client-side, APIs called directly from browser)
- Deployment to hosting (localhost dev server for presentation)
- Mobile layout (desktop presentation only)
- Creating custom aircraft not in FAA ACD (user picks from 388 existing aircraft only)

## Execution
Run: `/execute specs/website-report.md`
Output: `website/` folder → `npm run dev` to present
