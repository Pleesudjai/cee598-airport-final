# Feature Spec: Full FAARFIELD Engine Backend
Date: 2026-04-17
Layer: native-backend | website-frontend

## What We're Building
Upgrade the backend from LEAF-only stress visualization to a **full FAARFIELD engine** that performs real CDF calculation, thickness design, life analysis, and rigid/composite FEM stress — by referencing ALL installed FAARFIELD DLLs and calling the same functions the desktop app uses.

## Key Discoveries

1. **Nike3d.dll is NOT called in FAARFIELD 2.1.1.** The source code (`AMClassLib/clsAM.vb` line 1175) has `NewNike3D = 2`, routing to the **managed FEM solver** (`FEMClassLib.clsFAASR3D`). The entire rigid/composite path runs in pure .NET — no native DLL needed.

2. **aircraft.xml is the authoritative tire geometry source** (not aircraft.csv). The XML has 5,980 entries with 76 fields each including exact `WheelCoordinates`, `TireWidth`, `TireLength`, `TireArea`, `Cp`, `MgPercent`. The CSV only stores one gear pod per aircraft; the XML stores ALL wheels on BOTH sides. See `note_x/claude-faarfield-aircraft-geometry-note.md`.

3. **Combined aircraft library already built.** `scripts/build_aircraft_library.py` merges 3 sources:
   - FAARFIELD `aircraft.xml` (248 non-belly, non-deprecated) — exact wheel X/Y, tire pressure, tire dimensions
   - FAA ACD Excel (1,249 with ICAO codes, MTOW, gear config, wingspan)
   - Existing library (1,306 previously matched)
   - **Result:** 1,310 total, 184 FAARFIELD-matched, **136 with exact wheel coordinates from XML**

## Inputs / Outputs
- Input: Section layers + subgrade + aircraft mix (with full gear geometry from FAARFIELD XML library) + growth rate + design life + PCC flexural strength + SCI
- Output: Real FAARFIELD CDF values, required thickness, estimated life, per-aircraft CDF breakdown, rigid edge stress, stress contours, depth profiles — matching what the desktop FF2.exe produces

## Files to Create or Edit

### Backend — new files
- `faarfield-api/FullAnalysisWrapper.vb` — Core: sets all FAARFIELD globals, calls design/CDF functions, extracts results
- `faarfield-api/AircraftLibrary.vb` — Loads combined aircraft library JSON (built from XML + FAA ACD), provides lookup by ICAO -> full tire geometry
- `faarfield-api/Dto/FullAnalysisRequest.vb` — {layers[], subgrade, aircraft[], growth, life, flexStr, sci, designType, runMode}
- `faarfield-api/Dto/FullAnalysisResponse.vb` — {cdf_ac, cdf_sub, cdf_pcc, cdf_max, controlling, perAircraft[], requiredThickness, estimatedLife, rigidEdgeStress}

### Backend — modified files
- `faarfield-api/FaarfieldApi.vbproj` — Add references to ALL FAARFIELD DLLs (FaarFieldAnalysis, AMClassLib, FAAMeshClassLib, FEMClassLib, ACRClassLib)
- `faarfield-api/HttpRouter.vb` — Add routes: POST /api/analysis/cdf, POST /api/analysis/design, POST /api/analysis/life, GET /api/aircraft/list, GET /api/aircraft/{icao}
- `faarfield-api/LeafSolverWrapper.vb` — Update to use exact wheel coords from XML library instead of simplified dual-wheel
- `faarfield-api/Dto/HealthResponse.vb` — Add femAvailable, analysisAvailable fields
- `faarfield-api/Program.vb` — Probe FEMClassLib and FaarFieldAnalysis availability, load aircraft library at startup

### Frontend — modified files
- `src/api/nativeStressClient.js` — Add fetchFullCDF(), fetchDesign(), fetchLife(), fetchAircraftList()
- `src/tabs/DesignTool.jsx` — Option to use native CDF instead of JS approximate engine
- `src/components/SolverModeBadge.jsx` — Add "Full FAARFIELD Engine" mode
- `src/components/StressContourPanel.jsx` — Use exact wheel coords for tire position markers
- `src/tabs/MethodologyTab.jsx` — Update: explain full engine, remove Nike3d limitation note

### Already completed (Session 5b)
- `scripts/build_aircraft_library.py` — Merges FAARFIELD XML + FAA ACD Excel + existing library
- `central brain/combined_aircraft_library.json` — 1,310 aircraft, 136 with exact XML wheel coordinates
- `c:/temp/aeropave/src/data/aircraft_library.json` — Same, deployed to website

## Implementation Steps

### Phase A: Reference all FAARFIELD DLLs
1. [ ] Add to FaarfieldApi.vbproj: FaarFieldAnalysis.dll, AMClassLib.dll, FAAMeshClassLib.dll, FEMClassLib.dll, ACRClassLib.dll from `C:\Program Files (x86)\FAARFIELD\`
2. [ ] Update Program.vb: probe FEMClassLib and FaarFieldAnalysis availability at startup
3. [ ] Update HealthResponse: add `femAvailable`, `analysisAvailable` fields
4. [ ] Rebuild and test health endpoint reports all solvers available

### Phase B: Aircraft library integration
5. [x] ~~Copy aircraft.csv~~ **Done differently:** Built `combined_aircraft_library.json` from `aircraft.xml` (primary) + FAA ACD Excel + existing library via `scripts/build_aircraft_library.py`
6. [ ] Write `AircraftLibrary.vb`: load `combined_aircraft_library.json` at startup, provide lookup by ICAO code returning full tire geometry:
   - `WheelCoordinates` (exact X/Y from XML — includes BOTH left and right gear assemblies)
   - `TireWidth`, `TireLength`, `TireArea` (inches/sq.in)
   - `Cp` (tire pressure, psi)
   - `MgPercent` (main gear load fraction, typically 0.95)
   - `MTOW` (lbs)
   - `n_wheels_per_gear`, `n_gear`
7. [ ] Expose GET /api/aircraft/list (summary) and GET /api/aircraft/{icao} (full geometry) endpoints
8. [ ] Test: B738 returns 4 wheel coords (X=+/-95.5, +/-129.5), Cp=204 psi, TireW=12.7"
9. [ ] Test: C17 returns 12 wheel coords, A388 returns 8 wheel coords
10. [ ] Update `LeafSolverWrapper.vb`: when aircraft has `has_tire_geometry=true`, use exact XML wheel coords in `LEAFACParms.TireX/TireY` instead of simplified dual-wheel assumption

### Phase C: Full CDF engine wrapper
11. [ ] Write FullAnalysisWrapper.vb with method `RunAnalysis(request) -> response`
12. [ ] Inside RunAnalysis, set all required FAARFIELD globals:
    - FEDFAA1: NAC, ISect, CallAC(), LibIndex(), Reps(), RepsAnnual(), Thick(), Modulus(), LCode(), NPLayers
    - modCDF: SCI, FSlope, gFirstIter=True
    - modWorld: gDesignType (1=NewFlex, 10=NewRigid, 13=FlexOnRigid)
13. [ ] Call the appropriate design function based on designType:
    - FlexOnRigid -> DesignRigidOverlay_NP()
    - NewFlex -> LeafDesignFlex()
    - NewRigid -> DesignRigid_NP()
14. [ ] Extract results from globals: jobCDFtable, jobCDFacrftMaxtable, jobCtoPtable, Section.Result
15. [ ] Return FullAnalysisResponse with per-aircraft CDF, controlling failure mode, required thickness

### Phase D: New API endpoints
16. [ ] Add POST /api/analysis/cdf — runs life analysis (existing section, compute CDF)
17. [ ] Add POST /api/analysis/design — runs thickness design (iterate to CDF=1.0)
18. [ ] Add POST /api/analysis/life — runs life analysis (compute remaining life)
19. [ ] Wire into HttpRouter with error handling and timing

### Phase E: Frontend integration
20. [ ] Update nativeStressClient.js: add fetchFullCDF(), fetchDesign(), fetchAircraftList()
21. [ ] Update DesignTool.jsx: add toggle "Use Native FAARFIELD Engine" vs "JS Approximate"
22. [ ] When native engine is selected, call POST /api/analysis/cdf instead of JS analyzeSection()
23. [ ] Display native CDF results in VerdictCard (same format, real values)
24. [ ] Update SolverModeBadge: "Full FAARFIELD Engine" (blue) when full analysis available
25. [ ] Update MethodologyTab: explain full engine capability, update Nike3d section to clarify managed FEM is used

### Phase F: Rigid FEM stress visualization
26. [ ] Add POST /api/rigid/stress — calls AMClassLib.clsAM.ComputeResponse with managed FEM (FEMClassLib.clsFAASR3D, `NewNike3D=2` path)
27. [ ] Add POST /api/rigid/profile — vertical stress vs depth from AM solver
28. [ ] Update StressContourPanel: option to use AM (rigid FEM) instead of LEAF, show exact tire positions from XML wheel coords
29. [ ] Test with KLHX FlexOnRigid: compare LEAF vs AM+FEM stress values

## Demo Test
1. Start backend -> banner shows "LEAF: OK | FEM: OK | Analysis: OK | Aircraft: 1310 loaded (136 with geometry)"
2. GET /api/aircraft/B738 -> returns 4 wheel coords, Cp=204, TireW=12.7", MTOW=174700
3. POST /api/analysis/cdf with KLHX 6627 data -> returns real CDF matching Python/JS results
4. POST /api/analysis/design with same data -> returns required thickness for CDF=1.0
5. POST /api/rigid/stress -> returns rigid FEM stress from managed solver
6. Open website -> "Full FAARFIELD Engine" badge, native CDF in VerdictCard
7. Toggle native vs JS -> compare results, verify they're close
8. Stop backend -> falls back to JS engine, gray badge
9. Check Methodology -> explains full engine, managed FEM, XML-sourced tire geometry

## Out of Scope
- PCN/ACN rating calculations (ACRClassLib — separate feature)
- Compaction analysis mode
- Thermal loading effects
- Multi-section batch analysis in a single request
- Remote deployment (localhost-only for class demo)
- Downloading updated aircraft library from PAVEAIR DOM service (use installed v1.1.2)

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Global state initialization | Wrong CDF or crash | Test against known KLHX results from Python engine |
| ~20+ globals must be set correctly | Silent wrong results | Wrapper sets ALL globals explicitly, logs values |
| FEMClassLib working dir requirement | FEM may need temp files | Create `My FAARFIELD/` working dir before calls |
| Aircraft without XML geometry (1,174 of 1,310) | Falls back to simplified dual-wheel | Use Generic FAARFIELD aircraft for best match by MTOW/gear |
| Thread safety of FAARFIELD globals | Concurrent requests corrupt state | Serialize analysis requests (one at a time) |

## Aircraft Library Data Flow
```
FAARFIELD aircraft.xml (5,980 entries, 76 fields each)
  |-- Installed: C:\Program Files (x86)\FAARFIELD\Defaults\Aircraft\aircraft.xml
  |-- Version: LibraryVersion="1.1.2", SoftwareVersion="2.1.0"
  |-- PAVEAIR remote: v1.2.0/2.1.1 (newer, not downloaded)
  |
  v
scripts/build_aircraft_library.py
  |-- Parses XML: 248 non-belly, non-deprecated aircraft
  |-- Merges: FAA ACD Excel (1,249 ICAO codes)
  |-- Merges: existing library (1,306 aircraft)
  |-- Maps: FAARFIELD names -> ICAO codes (184 matched)
  |
  v
combined_aircraft_library.json (1,310 aircraft)
  |-- 136 with exact XML wheel coordinates (both gear assemblies)
  |-- 537 with MTOW
  |-- 518 with gear config
  |-- Saved: central brain/ + c:/temp/aeropave/src/data/
  |
  v
AircraftLibrary.vb (backend loader)
  |-- Loads JSON at startup
  |-- Lookup by ICAO -> full tire geometry for LEAFACParms
  |
  v
LeafSolverWrapper / FullAnalysisWrapper
  |-- Uses exact WheelCoordinates in TireX()/TireY()
  |-- Falls back to simplified geometry when XML data missing
```
