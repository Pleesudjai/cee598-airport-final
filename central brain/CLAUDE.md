# CEE 598 Airport Design - Final Project Central Brain

## Project Goal
Use FAARFIELD 2.1.1 to calculate stresses in existing airport pavement layers, then determine if each section is **under-designed or over-designed** for its traffic.

## Key Files
- `AO_CEE598_FAARFIELD.xlsx` - All given data (pavement sections, traffic, growth rates, soil)
- `FAARFIELD_2.1.1_SourceCode/` - FAA's FAARFIELD program source (VB.NET)
- `FAARFIELD_2.1.1_Installation Files/` - Installer for the program
- `FAARFIELD 2.1 readme.pdf` - Program documentation

---

## Airports & Sections (6 airports, 13 sections)

| # | Airport | ICAO | NetworkID | Sections | Use |
|---|---------|------|-----------|----------|-----|
| 1 | La Junta Municipal, CO | KLHX | 346 | 6627, 7347 | Taxiway |
| 2 | Pueblo Memorial, CO | KPUB | 364 | 6948 | Taxiway |
| 3 | Indianapolis Regional, IN | KMQJ | 378 | 8662, 8881, 8640, 8780 | Taxiway |
| 4 | Chippewa County Intl, MI | KCIU | 1017 | 21222 | Runway |
| 5 | Ottumwa Regional, IA | KOTM | 1356 | 28171, 27450, 27641 | Taxiway + Runway |
| 6 | Grant County Intl, WA | KMWH | 1863 | 37325, 37508 | Runway |

## Current Pavement Sections (All "HMA Overlay on Rigid")

Every section is a composite: original PCC construction with AC overlay on top.

### La Junta (346)
- **Sec 6627** (Taxiway): 2.5" AC + 6" PCC
- **Sec 7347** (Taxiway): 2" AC + 10" PCC

### Pueblo (364)
- **Sec 6948** (Taxiway): 2.5" AC + 7" PCC + 6" P-154 Subbase

### Indianapolis (378)
- **Sec 8662** (Taxiway TWA2): 3.5" AC + 8" PCC + 6" Stabilized Base (Econocrete)
- **Sec 8881** (Taxiway TWA1): 3.5" AC + 8" PCC + 6" Stabilized Subbase (Econocrete)
- **Sec 8640** (Taxiway TWA3): 3.5" AC + 8" PCC + 6" Stabilized Base (Econocrete)
- **Sec 8780** (Taxiway TWA4): 3.5" AC + 8" PCC + 6" Stabilized Base (Econocrete)

### Chippewa County (1017)
- **Sec 21222** (Runway RW1634): 2.5" AC + 24" PCC

### Ottumwa (1356)
- **Sec 28171** (Taxiway TBOT): 2.5" AC + 8" PCC
- **Sec 27450** (Runway R04): 3" AC + 9" PCC
- **Sec 27641** (Runway R04): 3" AC + 8" PCC

### Grant County (1863)
- **Sec 37325** (Runway R14L): 2" AC + 6" PCC + 12" Aggregate Base
- **Sec 37508** (Runway R14L): 2" AC + 6" PCC + 12" Aggregate Base

---

## Traffic Data Available

Detailed year-by-year aircraft departure counts per airport (2014-2021+):
- **Traffic346**: 217 records (light GA: C172, DV20, PA28; some military C130)
- **Traffic364**: 1,229 records (heavy mix: B737/B738, C130, C17, many GA)
- **Traffic378**: 885 records (mid-range GA, business jets)
- **Traffic1017**: 468 records (commuter CRJ2, SF34, some GA)
- **Traffic1356**: 395 records (GA dominated)
- **Traffic1863**: 2,293 records (heavy military C17, KC135; commercial)

Each record: Aircraft Type, Year, MTOW (lbs), Main Gear Config (S/D/2D), Yearly Departure Count

## Growth Rates (CAGR at 20-year design life)

| Airport | CAGR | Trend |
|---------|------|-------|
| La Junta | +3.2% | Growing |
| Pueblo | -0.7% | Slightly declining |
| Indianapolis | +0.5% | Stable |
| Chippewa | -0.1% | Flat |
| Ottumwa | -2.2% | Declining |
| Grant County | -0.5% | Slightly declining |

---

## FAARFIELD Input Parameters

### What We HAVE
- Pavement layer types (AC, PCC P-501, Base, Subbase)
- Layer thicknesses (all in inches)
- Layer moduli (auto-assigned by FAARFIELD per material type)
- Aircraft mix with MTOW, gear config, annual departures
- Growth rates (CAGR)
- Design life options (10-20 years)
- Analysis type: HMA Overlay on Rigid

### What We NEED (Partially Resolved)
1. **Subgrade CBR / k-value / E-modulus** - RESOLVED via USDA NRCS Soil Data Access API (see NRCS_Soil_Data.md)
   - KLHX: CBR ~6-8 (Minnequa loam, AASHTO A-6)
   - KPUB: CBR ~3-5 (Midway clay/bedrock, AASHTO A-7-6)
   - KMQJ: CBR ~4-7 (Crosby silt loam, AASHTO A-6/A-7-6)
   - KCIU: CBR ~15-25 (Liminga fine sand, AASHTO A-3)
   - KOTM: CBR ~3-5 (Taintor silty clay, AASHTO A-7-6)
   - KMWH: CBR ~20-40 (Malaga stony sand, AASHTO A-1-b/A-2-4)
2. **PCC Flexural Strength (R)** - Not provided (default ~700 psi, range 500-1000 psi)
3. **SCI (Slab Condition Index)** - Not provided (default 80, range 0-100)

### FAARFIELD Material Defaults (from source code)
| Material | Modulus (psi) | Notes |
|----------|---------------|-------|
| P-401/P-403 AC Surface/Overlay | 200,000 | Fixed |
| P-501 PCC | 4,000,000 | Range 300K-5M |
| P-154 Uncrushed Aggregate | 40,000 | Fixed |
| P-208/P-209 Crushed Aggregate | 75,000 | Fixed |
| Econocrete/Stabilized | 250,000-700,000 | Varies by type |
| Subgrade | 1,000-50,000 | From CBR/k-value |

### Subgrade Conversion Formulas
- Default: E = 1500 x CBR; k = (E/20.15)^(1/1.28405)
- NCHRP: E = 2555 x CBR^0.64

---

## How to Determine Over/Under-Design

FAARFIELD computes **CDF (Cumulative Damage Factor)**:
- **CDF < 1.0** = Pavement adequate = **over-designed**
- **CDF = 1.0** = Exactly meets design life
- **CDF > 1.0** = **Under-designed** (will fail before design life)

Can also compare FAARFIELD's **required thickness** vs actual thickness.

---

## FAARFIELD Source Code Architecture
- Written in VB.NET (.sln solution)
- `FaarFieldModel/` - Section, Material, AirplaneInfo, DesignOptions classes
- `FaarFieldAnalysis/` - CDF computation, flexible/rigid design iteration
- `FAAMeshClassLib/` - 3D mesh generation support for FEM workflows
- `FEMClassLib/` - 3D FEM stress/strain solver
- `LEAFClassLib/` - Layered Elastic Analysis (LEAF) engine
- `ACNClassLib/` / `ACRClassLib` - Aircraft classification / ACR support library
- `FF2/` - Main WPF desktop application and full-analysis orchestrator

## LLM Tool-Selection Guidance For Calculations

### Core Rule
- Do **not** assume FAARFIELD has a Python script for full analysis.
- The authoritative full-analysis path is the VB/.NET application logic in `FF2/`, especially `RunAnalysis.vb`, which coordinates the calculation flow.
- Use Python for preprocessing, traffic cleanup, sensitivity studies, result parsing, plotting, and approximate replications only when exact FAARFIELD execution is not required.

### What "Calculation Choice" Means In FAARFIELD
There are **3 separate decision layers** that should not be mixed together:

1. **Run mode** - what the user wants as the final calculation output
   - Thickness Design
   - Life Analysis
   - Life/Compaction Analysis
   - PCR

2. **Internal pavement/design type** - what pavement structure is being analyzed internally
   - `NewFlex`
   - `FlexOnFlex`
   - `PCCOnFlex`
   - `NewRigid`
   - `UnbondOnRigid`
   - `PartBondOnRigid`
   - `FlexOnRigid`

3. **Structural solver approach** - what engine is used for structural response
   - `NIKE3D`
   - `LEAF`

### How The LLM Should Choose Tools
- If the task needs **exact FAARFIELD behavior**, use the VB/.NET source and FAARFIELD application logic as the reference standard.
- If the task needs **required pavement thickness**, map it to **Thickness Design**.
- If the task needs **damage accumulation / adequacy of an existing section**, map it to **Life Analysis** or **Life/Compaction Analysis**.
- If the task needs **PCR / ACR-style output**, map it to **PCR** and inspect the aircraft classification libraries.
- If the task is a **custom project workflow** outside the official FAARFIELD executable, Python is acceptable, but the output must be labeled as a project-specific approximation unless it is validated against FAARFIELD.

### Practical Interpretation For This Project
- Most project sections are currently treated as **HMA Overlay on Rigid**, which should usually map to the internal `FlexOnRigid` family unless the source logic shows a different branch.
- `PCR` is an output/run mode, **not** a separate structural solver.
- `FAAMeshClassLib` supports mesh generation; it is **not** a separate top-level pavement design family.
- The user-facing pavement label in the GUI may differ from the internal `DesignType`, so always check the source-code mapping before reproducing calculations in another tool.

### What These Libraries Really Are
- Do **not** describe `LEAFClassLib`, `FAAMeshClassLib`, or `FEMClassLib` as mere file names or placeholder projects. They contain real engineering calculation logic.
- `LEAFClassLib` is a real layered-elastic solver. It computes deflection, strain, and stress responses and should be treated as a valid backend calculation engine for flexible/layered response analysis.
- `FAAMeshClassLib` is **not** the stress-equation solver itself. It is the mesh generator for the 3D model and builds nodes, brick elements, spring elements, sliding elements, and nodal loads for the rigid/FEM workflow.
- `FEMClassLib` is the real 3D FEM solver and should be treated as the core numerical engine for native 3D rigid/composite response analysis.
- `AMClassLib` is the higher-level rigid/composite wrapper that ties the mesh-generation and FEM workflow together and is the more useful integration point for rigid website/backend features.

### Website / Visualization Guidance
- If the goal is **native FAARFIELD stress analysis or stress visualization**, do **not** recommend direct browser execution.
- The native FAARFIELD stress path is old VB.NET / .NET Framework desktop code and some rigid-analysis workflows depend on Windows-specific behavior and `Nike3d.dll`.
- For website use, the correct architecture is:
  - frontend sends pavement layers, aircraft load, geometry, and solver choice
  - Windows backend service runs the FAARFIELD-based solver
  - backend returns JSON with coordinates, stress values, strain values, deflections, and layer/depth metadata
  - frontend visualizes the JSON as contours, heatmaps, slices, depth profiles, or other engineering plots
- If the website only needs a **fast approximate CDF tool**, browser-side JS is acceptable, but it must be labeled as an approximation rather than the native FAARFIELD stress engine.

### Website Tool Choice Rules
- If the user wants **fast response at selected points or depths** for flexible/layered structures, prefer `LEAFClassLib`.
- If the user wants **rigid pavement or composite 3D stress response**, prefer `AMClassLib` + `FAAMeshClassLib` + `FEMClassLib` / `Nike3d.dll`.
- If the user asks for a browser-only solution while also asking for native FAARFIELD stress output, explicitly explain that the native solver belongs on the backend, not in frontend JavaScript.
- For project planning and implementation details, use `specs/website-faarfield-native-backend.md` as the reference architecture for the website's native-stress mode.

### LLM Communication Rules
- When answering calculation questions, state whether the answer is based on:
  - FAARFIELD VB/.NET source logic
  - FAARFIELD GUI workflow
  - Python approximation / external replication
- When answering website/visualization questions, also state whether the proposal is:
  - browser-side approximation
  - native FAARFIELD backend
  - hybrid architecture
- When using Python instead of the original FAARFIELD logic, explicitly say that the method is **not the native FAARFIELD engine**.
- When describing `LEAFClassLib`, `FAAMeshClassLib`, `FEMClassLib`, or `AMClassLib`, explain their engineering role, not just their folder or project name.
- When uncertainty exists, separate:
  - the selected **run mode**
  - the likely internal **design type**
  - the likely **solver**
- When uncertainty exists for website integration, separate:
  - the requested **user-facing feature**
  - the required **backend solver**
  - the achievable **output format** such as point response, depth profile, contour field, or approximate browser result
- For auditability, cite the relevant FAARFIELD module or folder when making tool-choice recommendations.

## Next Steps
1. Obtain subgrade data (CBR or k-value) for each airport
2. Decide on PCC flexural strength and SCI values
3. Set up each section in FAARFIELD with the layer structure
4. Input aircraft traffic mix with growth rates
5. Run analysis for each section
6. Compare CDF results to determine over/under-design
