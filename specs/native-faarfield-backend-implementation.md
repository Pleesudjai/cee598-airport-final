# Feature Spec: Native FAARFIELD Backend + Stress Visualization
Date: 2026-04-16
Layer: native-backend | website-frontend

## What We're Building
A .NET 4.8 backend wrapping FAARFIELD's LEAF solver (`LEAFClassLib.dll`) to serve real stress field data via HTTP, plus Plotly-based frontend components to visualize stress contours and depth profiles in the Design Tool tab.

## Inputs / Outputs
- Input: Pavement layers (type, thickness, E, nu), subgrade (E, nu), aircraft (gear load, tire count, tire pressure, tire spacing), evaluation depth, grid size
- Output: 2D stress/strain/deflection grids (contour maps), depth profiles (stress vs depth line charts), solver health status, solver mode badge

## Files to Create or Edit

### Backend (c:/temp/aeropave/faarfield-api/) — 10 new files
- `FaarfieldApi.vbproj` — MSBuild project: .NET 4.8, x86, references LEAFClassLib.dll from `C:\Program Files (x86)\FAARFIELD\`
- `Program.vb` — HttpListener on localhost:5100, async request loop, solver availability probe
- `HttpRouter.vb` — Route dispatch (GET /api/health, POST /api/leaf/grid, POST /api/leaf/point), CORS headers, OPTIONS preflight
- `JsonHelper.vb` — JavaScriptSerializer wrapper (Serialize/Deserialize, MaxJsonLength=MaxValue)
- `LeafSolverWrapper.vb` — Core: translates DTOs to LEAFStrParms/LEAFACParms, calls clsLEAF.ComputeResponse, returns grid/profile data
- `Dto/HealthResponse.vb` — {status, version, leafAvailable, nike3dAvailable}
- `Dto/LeafGridRequest.vb` — {layers[], subgrade, aircraft, evalDepthIn, gridExtentIn, gridPoints}
- `Dto/LeafGridResponse.vb` — {xCoords[], yCoords[], stressZ[][], stressX[][], deflZ[][], meta{}}
- `Dto/LeafPointRequest.vb` — {layers[], subgrade, aircraft, evalDepths[], evalX, evalY}
- `Dto/ErrorResponse.vb` — {error, detail}

### Frontend (c:/temp/aeropave/src/) — 5 new files
- `src/api/nativeStressClient.js` — checkHealth(), fetchLeafGrid(), fetchLeafProfile() with graceful degradation
- `src/components/StressContourPanel.jsx` — Plotly contour/heatmap, field dropdown (StressZ/X/Y/DeflZ/MaxShear), loading spinner
- `src/components/RigidStressProfile.jsx` — Plotly line chart: stress vs depth, layer boundaries as dashed lines
- `src/components/SolverComparisonCard.jsx` — Side-by-side: JS engine vs Native LEAF stress, percentage difference
- `src/components/SolverModeBadge.jsx` — Green "Native FAARFIELD (LEAF)" / Gray "Approximate (JS Engine)" pill

### Modified files — 3 existing files
- `vite.config.js` — Add proxy: `/api` -> `http://localhost:5100`
- `src/App.jsx` — Add nativeAvailable state, health-check polling every 30s, pass to DesignTool
- `src/tabs/DesignTool.jsx` — Add SolverModeBadge, StressContourPanel, RigidStressProfile below CDF results (conditional on nativeAvailable)

## Implementation Steps

### Phase 0: Backend Foundation
1. [ ] Create `faarfield-api/` directory structure
2. [ ] Write `FaarfieldApi.vbproj` (target .NET 4.8, x86, reference LEAFClassLib.dll + ACClassLib.dll + FaarFieldModel.dll from `C:\Program Files (x86)\FAARFIELD\`)
3. [ ] Write `Program.vb` (HttpListener on localhost:5100, async dispatch, startup banner with solver status)
4. [ ] Write `HttpRouter.vb` (CORS on every response, OPTIONS->204, route table: health/grid/point/404)
5. [ ] Write `JsonHelper.vb` (JavaScriptSerializer wrapper, MaxJsonLength=MaxValue)
6. [ ] Write all 5 DTO classes (HealthResponse, LeafGridRequest, LeafGridResponse, LeafPointRequest, ErrorResponse)
7. [ ] Build with MSBuild: `"C:/Windows/Microsoft.NET/Framework/v4.0.30319/msbuild.exe" FaarfieldApi.vbproj /p:Configuration=Release /p:Platform=x86 /v:m`
8. [ ] Test: `curl http://localhost:5100/api/health` returns `{"leafAvailable":true}`

### Phase 1: LEAF Solver Integration
9. [ ] Write `LeafSolverWrapper.vb` — build LEAFStrParms (NLayers, Thick, Modulus, Poisson, InterfaceParm=[1,0,1,...], EvalDepth, EvalLayer)
10. [ ] Write LEAFACParms builder (GearLoad, NTires, TirePress, TireX/Y from spacing, NEvalPoints=gridPoints^2, EvalX/Y grid arrays) — NOTE: VB.NET arrays are 1-based
11. [ ] Wire grid endpoint: POST body -> LeafGridRequest -> LeafSolverWrapper.ComputeGrid() -> LeafGridResponse -> JSON 200
12. [ ] Wire point endpoint: POST body -> LeafPointRequest -> LeafSolverWrapper.ComputeProfile() -> JSON 200
13. [ ] Rebuild and test with KLHX section 6627: `curl -X POST http://localhost:5100/api/leaf/grid -H "Content-Type: application/json" -d '{"layers":[{"type":"AC","h":2.5,"E":200000,"nu":0.35},{"type":"PCC","h":6.0,"E":4000000,"nu":0.15}],"subgrade":{"E":10500,"nu":0.4},"aircraft":{"name":"EA50","gearLoad":18789,"nTires":2,"tirePressure":120,"tireSpacingIn":20},"evalDepthIn":8.5,"gridExtentIn":80,"gridPoints":15}'`
14. [ ] Verify: non-zero stress values, peak under load center, StressZ compressive (negative) under wheel

### Phase 2: Frontend Components
15. [ ] Install Plotly: `cd c:/temp/aeropave && npm install react-plotly.js plotly.js-dist-min`
16. [ ] Write `src/api/nativeStressClient.js` (checkHealth, fetchLeafGrid, fetchLeafProfile — returns `{data:null, source:'unavailable'}` on failure)
17. [ ] Write `src/components/SolverModeBadge.jsx` (green/gray pill, Tailwind styling matching existing badges)
18. [ ] Write `src/components/StressContourPanel.jsx` (Plotly contour, field dropdown, viridis color scale, tire position markers, 500ms debounce on fetch, loading spinner, "backend unavailable" fallback)
19. [ ] Write `src/components/RigidStressProfile.jsx` (Plotly line chart, inverted Y-axis, dashed layer boundary lines with labels)
20. [ ] Write `src/components/SolverComparisonCard.jsx` (side-by-side bars, percentage diff, compact card)

### Phase 3: Wire Into Existing App
21. [ ] Edit `vite.config.js` — add `server.proxy: { '/api': { target: 'http://localhost:5100', changeOrigin: true } }`
22. [ ] Edit `src/App.jsx` — add `nativeAvailable` state, `useEffect` with `checkHealth()` on mount + 30s interval, pass as prop to DesignTool
23. [ ] Edit `src/tabs/DesignTool.jsx` — add SolverModeBadge next to title, add StressContourPanel (col-span-7) + RigidStressProfile (col-span-5) below CDF results, conditional on `nativeAvailable && modifiedResult`, top aircraft = `modifiedResult.details[0]`
24. [ ] Test graceful degradation: stop backend -> gray badge, contour says "unavailable", JS CDF still works
25. [ ] Test slider interaction: adjust PCC thickness -> contour updates after 500ms debounce

### Phase 4: Caching & Polish
26. [ ] Add server-side LRU cache in LeafSolverWrapper (Dictionary keyed by SHA256 of request, 50-entry limit)
27. [ ] Add frontend response cache in nativeStressClient.js (Map keyed by JSON.stringify)
28. [ ] Add "Native LEAF Solver" section to MethodologyTab.jsx (LEAF = layered elastic interior stress, FAARFIELD uses max(NIKE3D, LEAF*0.95), Nike3d.dll unavailable so LEAF-only with clear label)

## Demo Test
1. Start backend: `cd c:/temp/aeropave/faarfield-api/bin/x86/Release && FaarfieldApi.exe` — banner shows "LEAF: OK | Nike3d: MISSING"
2. Start frontend: `cd c:/temp/aeropave && npx vite --host --port 3000 --force`
3. Open Design Tool tab -> green badge says "Native FAARFIELD (LEAF)"
4. Select KLHX section 6627 -> Plotly contour shows stress bowl under wheel load
5. Click depth profile -> line chart shows stress through AC (2.5") -> PCC (6") -> subgrade
6. Adjust PCC thickness slider -> contour updates after brief delay
7. Stop FaarfieldApi.exe -> badge turns gray, contour shows "unavailable", CDF results still work
8. Check Methodology tab -> "Native LEAF Solver" section explains what LEAF provides vs full FAARFIELD

## Out of Scope
- Nike3d.dll / FEM / NIKE3D rigid solver (DLL missing from system, cannot be sourced)
- Full 3D voxel stress volume visualization
- Multi-user queuing or remote deployment
- Replacing the browser-side JS CDF engine (it stays as the primary fast tool)
- Aircraft gear geometry from aircraft.csv (Phase 1 uses simplified dual-wheel)
- Production deployment (this is localhost-only for the class demo)
