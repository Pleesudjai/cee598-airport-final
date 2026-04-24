# Feature Spec: Native FAARFIELD Backend + Stress Visualization V2
Date: 2026-04-17
Layer: native-backend | website-frontend

## What We're Building
Build a localhost-only .NET 4.8 x86 backend that wraps FAARFIELD's native `LEAFClassLib` and exposes real stress-response data over HTTP for the website's Design Tool. This Phase 1 spec intentionally delivers native `LEAF` stress contours and depth profiles now, while keeping rigid/composite native integration through `AMClassLib + FAAMeshClassLib + FEMClassLib` as deferred work because `Nike3d.dll` is not present on this machine and the managed rigid path needs separate validation.

## Inputs / Outputs
- Input: Pavement layers (type, thickness, modulus `E`, Poisson `nu`), subgrade properties, aircraft load data, evaluation depth, grid extent/grid resolution, and the current Design Tool scenario.
- Output: A localhost HTTP API that returns native `LEAF` stress/strain/deflection JSON for contour maps and point/depth profiles, plus frontend UI components that visualize those results and clearly label them as native `LEAF` rather than browser-side approximation.

## Files to Create or Edit
- `c:/temp/aeropave/faarfield-api/FaarfieldApi.vbproj` - Create the .NET 4.8 x86 backend project and reference installed FAARFIELD DLLs.
- `c:/temp/aeropave/faarfield-api/Program.vb` - Start `HttpListener`, print solver health, and run the request loop.
- `c:/temp/aeropave/faarfield-api/HttpRouter.vb` - Route `/api/health`, `/api/leaf/grid`, and `/api/leaf/point` with CORS and error handling.
- `c:/temp/aeropave/faarfield-api/JsonHelper.vb` - Serialize and deserialize request/response DTOs safely.
- `c:/temp/aeropave/faarfield-api/LeafSolverWrapper.vb` - Translate DTOs into `LEAFStrParms` / `LEAFACParms` and call `clsLEAF.ComputeResponse(...)`.
- `c:/temp/aeropave/faarfield-api/Dto/HealthResponse.vb` - Report `leafAvailable`, `femAvailable`, and `nike3dDllAvailable`.
- `c:/temp/aeropave/faarfield-api/Dto/LeafGridRequest.vb` - Define request shape for 2D field evaluation.
- `c:/temp/aeropave/faarfield-api/Dto/LeafGridResponse.vb` - Define response shape for stress/strain/deflection grids.
- `c:/temp/aeropave/faarfield-api/Dto/LeafPointRequest.vb` - Define request shape for point/depth evaluation.
- `c:/temp/aeropave/faarfield-api/Dto/LeafPointResponse.vb` - Define response shape for depth profiles at a point.
- `c:/temp/aeropave/faarfield-api/Dto/ErrorResponse.vb` - Standardize backend error responses.
- `c:/temp/aeropave/src/api/nativeStressClient.js` - Add frontend API helpers for health, grid, and point requests with graceful fallback.
- `c:/temp/aeropave/src/components/StressContourPanel.jsx` - Render Plotly stress contours or heatmaps from native `LEAF` grid data.
- `c:/temp/aeropave/src/components/StressDepthProfile.jsx` - Render Plotly depth profiles from native point/depth data.
- `c:/temp/aeropave/src/components/SolverComparisonCard.jsx` - Compare browser-side approximate output vs native `LEAF` output at a compact summary level.
- `c:/temp/aeropave/src/components/SolverModeBadge.jsx` - Show whether the current visualization is native `LEAF` or approximate JS.
- `c:/temp/aeropave/vite.config.js` - Proxy `/api` calls to the local backend.
- `c:/temp/aeropave/src/App.jsx` - Poll solver health and pass backend availability into the Design Tool.
- `c:/temp/aeropave/src/tabs/DesignTool.jsx` - Add native stress panels under the existing CDF results.
- `c:/temp/aeropave/src/tabs/MethodologyTab.jsx` - Explain what native `LEAF` provides and what remains deferred.

## Implementation Steps
1. [ ] Create `c:/temp/aeropave/faarfield-api/` and scaffold the .NET 4.8 x86 project.
2. [ ] Reference installed FAARFIELD assemblies from `C:\Program Files (x86)\FAARFIELD\`, including `LEAFClassLib.dll`, `AMClassLib.dll`, `FAAMeshClassLib.dll`, `FEMClassLib.dll`, `FaarFieldAnalysis.dll`, and `FaarFieldModel.dll`.
3. [ ] Write `Program.vb` and `HttpRouter.vb` so the backend serves `GET /api/health`, `POST /api/leaf/grid`, and `POST /api/leaf/point`.
4. [ ] Add `JsonHelper.vb` and all request/response DTOs for health, grid, point, and error payloads.
5. [ ] Implement health probing so the backend reports:
   - `leafAvailable=true` when `LEAFClassLib` loads
   - `femAvailable=true` when `FEMClassLib` loads
   - `nike3dDllAvailable=false` when `Nike3d.dll` is absent
6. [ ] Write `LeafSolverWrapper.vb` to build `LEAFStrParms` and `LEAFACParms` from the request payload using the correct FAARFIELD/VB array conventions.
7. [ ] Implement `POST /api/leaf/grid` so it returns regular `x/y` coordinates plus requested stress/strain/deflection fields for Plotly.
8. [ ] Implement `POST /api/leaf/point` so it returns stress/strain/deflection versus depth at a specified point.
9. [ ] Build the backend with MSBuild and verify `GET /api/health` responds successfully.
10. [ ] Test the backend with a known project section such as KLHX Section 6627 and verify non-zero `LEAF` results, compressive `StressZ` under load, and peak response near the load center.
11. [ ] Install Plotly in the frontend and create `nativeStressClient.js` with graceful fallback when the backend is unavailable.
12. [ ] Build `SolverModeBadge.jsx`, `StressContourPanel.jsx`, `StressDepthProfile.jsx`, and `SolverComparisonCard.jsx`.
13. [ ] Update `vite.config.js` to proxy `/api` to `http://localhost:5100`.
14. [ ] Update `src/App.jsx` to poll backend health on load and on an interval, then pass `nativeAvailable` and solver-health metadata into the Design Tool.
15. [ ] Update `src/tabs/DesignTool.jsx` to render the native `LEAF` panels below the existing CDF results without breaking the browser-side JS workflow.
16. [ ] Update `src/tabs/MethodologyTab.jsx` so it explains that:
   - native `LEAF` is a real FAARFIELD engine
   - this Phase 1 feature does not yet expose the full rigid/composite workflow
   - direct `Nike3d.dll` integration is unavailable on this machine
17. [ ] Add lightweight request caching on the backend and frontend only if needed after the basic flow works.
18. [ ] Confirm graceful degradation: if the backend is down, the existing JS CDF engine still works and the UI clearly marks native stress as unavailable.

## Demo Test
1. Start the backend from `c:/temp/aeropave/faarfield-api/bin/x86/Release/`.
2. Confirm the backend health output shows `LEAF: OK` and `Nike3d DLL: Missing`.
3. Start the frontend from `c:/temp/aeropave/`.
4. Open the Design Tool tab and verify the native solver badge shows native `LEAF` when the backend is running.
5. Select KLHX Section 6627 and confirm a Plotly stress contour renders from native backend data.
6. Use the point/depth view and confirm the stress profile changes through AC, PCC, and subgrade.
7. Adjust an input like PCC thickness and confirm the native view refreshes without breaking the existing browser-side CDF panel.
8. Stop the backend and confirm the UI falls back gracefully: the native panel shows unavailable, but the JS CDF tool still runs.

## Out of Scope
- Direct external `Nike3d.dll` integration, since the DLL is not present on this machine.
- Managed rigid/composite endpoints through `AMClassLib + FAAMeshClassLib + FEMClassLib` for this Phase 1 deliverable; that path is deferred and needs separate validation.
- Full 3D voxel stress volume visualization.
- Multi-user queuing, remote hosting, or production deployment.
- Replacing the browser-side JS CDF engine as the primary fast classroom tool.
- Full aircraft gear geometry ingestion from `aircraft.csv`; Phase 1 may continue using simplified dual-wheel assumptions where needed.
