# Remaining Work — FAARFIELD Native Backend
Date: 2026-04-17
Author: Claude (Session 5-6)

## What Is Done

### Backend (c:/temp/aeropave/faarfield-api/)
- **FaarfieldApi.exe** — .NET 4.8 x86 HttpListener on localhost:5100
- **LEAF solver** — Real LEAFClassLib.dll, identical to FF2.exe
- **CDF engine** — FAARFIELD_desktop_parity solver label:
  - SCI-dependent PCC fatigue equation with FSlopeComp
  - RDEC AC fatigue model (PV formula with material defaults)
  - StraightLine + Bleasdale subgrade models (auto-trigger at >5M departures)
  - FSlope compensation (CompforStab) for stabilized base
  - 41-offset lateral sweep (0-400" in 10" steps)
  - Exact GaussArea (Euler-McLaurin 4-point integration)
  - Full C/P with bottom-wheel extraction, tandem multipliers, NotBelly dual-gear, gear print merging
  - Tandem alternating damage (1800 longitudinal nodes, extrema detection, alternating-sign accumulation)
  - C-5 Galaxy special case (AREA * 2)
  - Thickness design iteration (Newton-Raphson, converges at |ln(CDF)| < 0.005)
- **Aircraft library** — 1,310 aircraft, 136 with exact XML wheel coordinates from aircraft.xml v1.1.2
- **Endpoints:**
  - GET /api/health
  - GET /api/aircraft/{icao}
  - GET /api/aircraft/list
  - POST /api/leaf/grid (stress contour)
  - POST /api/leaf/point (depth profile)
  - POST /api/analysis/cdf
  - POST /api/analysis/design

### Frontend (c:/temp/aeropave/src/)
- SolverModeBadge (3 modes: Full FAARFIELD / Native LEAF / Approximate JS)
- StressContourPanel (Plotly contour with 5 field types)
- RigidStressProfile (Plotly depth-profile with layer boundaries)
- SolverComparisonCard
- nativeStressClient.js (health, grid, point, fullCdf)
- DesignTool.jsx wired with native CDF card alongside JS card
- MethodologyTab with Native LEAF Solver section
- Vite proxy /api -> localhost:5100

---

## What Is NOT Done

### Gap 3: Rigid FEM via AMClassLib (HIGH priority for full parity)

**What:** FAARFIELD takes `max(LEAF_stress, FEM_stress)` for FlexOnRigid. We only use LEAF.

**Why blocked:** `AMClassLib.clsAM.ComputeResponse` requires:
- Working directory for FEM temp files (`My FAARFIELD/` folder)
- Mesh generation via FAAMeshClassLib.clsMesh.MeshGeneration() with 14+ parameter arrays (NodeCharacteristics, BrickElementCharacteristics, SpringTypeCharacteristics, etc.)
- Conversion() call to prepare InputCards for FAASR3D
- CancellationToken for async support
- DesignType2=13 (FlexOnRigid), SolverType2, SlabMeshSize2

**What's needed:**
1. Create working directory: `My FAARFIELD/` in user's Documents
2. Set AMClassLib.modWorld globals: gDesignType, iSymCase, gNACarg, SolverType, SlabMeshSize
3. Prepare material/part/load structures for mesh generation
4. Call clsAM.ComputeResponse with all 16 parameters
5. Extract Response(,) and compare with LEAF stress

**Estimated effort:** 2-3 sessions. This is the biggest remaining integration.

**Source files:**
- `AMClassLib/clsAM.vb:20` — ComputeResponse signature
- `AMClassLib/clsAM.vb:1144` — NewNike3D=2 routing to managed FEM
- `FAAMeshClassLib/clsMesh.vb:181` — MeshGeneration entry
- `FEMClassLib/FAASR/clsFAASR3D.vb:32` — FAASR3D solver entry

---

### Gap 9: Life Analysis + SCI Progression (MEDIUM priority)

**What:** For overlay analysis, FAARFIELD models SCI degrading from initial value (e.g., 80) down to 0 in NSection=16 increments. Computes remaining overlay life at each SCI level.

**Why blocked:** Requires:
- `pre_LifeTotal_PCConRigid2014` function (modDesignRigid_Adj.vb:815-1356)
- PCC surface modulus adjustment: `E_pcc = E0 * (0.02 + 0.0064*SCI + (0.00584*SCI)^2)`
- Multiple CDF computations at different SCI levels
- ZFindLife class for Newton-Raphson life iteration

**What's needed:**
1. Implement `ComputeOverlayLife(req) -> remaining_life`
2. Loop through NSection=16 SCI decrements
3. At each SCI level, adjust PCC modulus and re-run CDF
4. Accumulate life consumed until sum >= 1.0
5. Return total overlay life

**Estimated effort:** 1 session. The formulas are known; it's a loop around existing CDF code.

**Source files:**
- `FaarFieldAnalysis/modDesignRigid_Adj.vb:815-1356`
- `FaarFieldAnalysis/modFedfaaGbl.vb:7944-8200` (ZFindLife)

---

### Gap 2 (partial): ComputeResponse2 First-Pass X Offset

**What:** FAARFIELD's ComputeResponse2 does a two-pass approach:
1. First pass: LEAF with original eval points → find max-strain X offset (offsetMax)
2. Second pass: 1800 Y-nodes at X=offsetMax

**Current state:** We do pass 2 at X=0 (center), skipping pass 1. For symmetric single-gear aircraft this is fine. For multi-gear or asymmetric configurations, offsetMax may differ from 0.

**What's needed:** Add a preliminary LEAF call with ~41 X-offsets to find offsetMax, then use that X for the 1800-node Y sweep.

**Estimated effort:** Small — add one LEAF call per tandem aircraft.

---

### Frontend Gaps

1. **Plotly contour rendering** — Not visually verified in browser. CDN loaded, data flows correct (tested via curl), but need to open localhost:3000 and confirm charts render.

2. **Native CDF in VerdictCard** — Shows alongside JS card but may need formatting fixes (large CDF values, scientific notation).

3. **Growth formula re-run** — CDF results in `cdf_results.json` still use the old compound growth formula. Need to re-run `scripts/all_airports_cdf.py` with the fixed linear formula.

4. **Screenshots** — Needed for final presentation. Not taken yet.

5. **SolverComparisonCard** — Component exists but not wired into DesignTool.jsx.

---

### Data Gaps

1. **PAVEAIR login required** — Cannot auto-fill pavement layers for searched airports. Must be entered manually.

2. **TAF 2025 data** — Downloaded as zip but not extracted/parsed for forecasted operations.

3. **FAARFIELD aircraft library v1.2.0** — PAVEAIR remote has newer version (1.2.0/2.1.1) vs our installed v1.1.2. Could be downloaded from `http://faapaveair.faa.gov/DOMService.svc/DownloadNewAircraftLibrary`.

---

## Priority Order for Remaining Work

1. **Visual verification** — Open browser, confirm Plotly renders, fix any display issues
2. **Re-run CDF** with fixed growth formula for all 13 sections
3. **Screenshots** for final presentation
4. **Gap 3 (Rigid FEM)** — If pursuing full parity beyond class project
5. **Gap 9 (SCI progression)** — If overlay life analysis is needed
6. **Gap 2 partial (offsetMax)** — Minor accuracy improvement for tandem aircraft

---

## How To Run

```bash
# Terminal 1: Backend
cd c:/temp/aeropave/faarfield-api/bin/x86/Release && FaarfieldApi.exe

# Terminal 2: Frontend
cd c:/temp/aeropave && npx vite --host --port 3000 --force
```

## How To Rebuild Backend

```bash
# Kill old process
taskkill /f /im FaarfieldApi.exe

# Copy aircraft library
cp c:/temp/aeropave/src/data/aircraft_library.json c:/temp/aeropave/faarfield-api/bin/x86/Release/combined_aircraft_library.json

# Build
cmd /c "cd /d c:\temp\aeropave\faarfield-api & C:\Windows\Microsoft.NET\Framework\v4.0.30319\msbuild.exe FaarfieldApi.vbproj /p:Configuration=Release /p:Platform=x86 /v:m"
```
