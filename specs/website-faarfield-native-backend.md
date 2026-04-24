# Spec Addendum: Native FAARFIELD Backend for Website Stress Visualization

## Goal
Use the real FAARFIELD engineering solvers behind the website when the user wants to visualize or analyze stress distribution, instead of relying only on a browser-side approximation.

This addendum is specifically for:
- stress contours
- stress/strain response at selected depths
- rigid/composite edge stress comparison
- vertical stress versus depth plots

It is not the same as the lightweight browser-side CDF engine in `website-report.md`.

## Reality Check
- `LEAFClassLib`, `AMClassLib`, `FAAMeshClassLib`, and `FEMClassLib` contain real engineering calculation code, not just file labels.
- The rigid 3D path depends on Windows/.NET Framework and a native DLL call to `Nike3d.dll`.
- Because of that, the FAARFIELD-native stress engine should run as a Windows backend service, not directly in the browser.
- The browser-side JS engine is still useful for fast approximate CDF updates, but it should be labeled as an approximation when compared to native FAARFIELD stress output.

## Solver Mapping

| Website need | Recommended entry point | Supporting code | What the UI gets back |
|--------------|-------------------------|-----------------|-----------------------|
| Flexible / layered pavement stress contour at a chosen depth | `LEAFClassLib.clsLEAF.ComputeResponse(...)` with `LEAFoptions.AllResponses` | `Numerical.vb` and LEAF internal response routines | Stress, strain, and deflection on a sampled grid of evaluation points |
| Rigid / composite pavement edge stress and depth response | `AMClassLib.clsAM.ComputeResponse(...)` | `FAAMeshClassLib.clsMesh`, `FEMClassLib.clsFEM`, `Nike3d.dll`, and `LEAFClassLib.clsLEAF` | Overlay stress, underlay stress, vertical stress profile, governing solver |
| Low-level custom meshing research workflow | `FAAMeshClassLib.clsMesh.MeshGeneration(...)` | internal mesh/node/element generation | Mesh data for backend use only |
| Low-level custom FEM run | `FEMClassLib.clsFEM.FAASR3D(...)` | `clsSolve`, `clsInitial`, `clsInput` | Lower-level solver output for advanced backend workflows |

## What To Call First

### 1. Flexible / layered response visualization
Use `LEAFClassLib.clsLEAF.ComputeResponse(...)` as the primary backend call.

Why:
- It already exposes `StressX`, `StressY`, `StressZ`, `StressXY`, `StrainX`, `StrainY`, `DeflZ`, and related outputs.
- It is the cleanest way to generate a 2D contour/heatmap in the website.
- The backend can create a regular `x-y` grid of evaluation points, pass those into LEAF, then return a field ready for plotting.

### 2. Rigid / HMA-overlay-on-rigid visualization
Use `AMClassLib.clsAM.ComputeResponse(...)` as the main backend call.

Why:
- It is the higher-level rigid/composite wrapper already used by FAARFIELD logic.
- It coordinates mesh generation and FEM/NIKE3D solving.
- It also compares rigid stress responses against LEAF in some FAARFIELD workflows.

Important limitation:
- Phase 1 should expect critical rigid outputs and depth profiles, not a fully arbitrary 3D voxel field.
- The rigid wrapper already returns `Response`, `VertStress`, and `VertCoord`, which are enough for:
  - per-aircraft edge stress comparison
  - overlay versus underlay stress
  - vertical stress versus depth plots

## Recommended Website Architecture

```text
Browser (React SPA)
  |
  |-- Live public APIs
  |    |-- FAA ArcGIS
  |    `-- NRCS SDA
  |
  |-- Static JSON
  |    |-- traffic, sections, aircraft library, summary results
  |    `-- optional cached native solver results
  |
  |-- Approximate browser-side engine
  |    `-- faarfieldEngine.js for instant CDF exploration
  |
  `-- Native stress API (Windows only)
       |-- /api/leaf/grid
       |    `-- LEAFClassLib.clsLEAF
       |
       |-- /api/rigid/critical
       |    `-- AMClassLib.clsAM
       |         |-- FAAMeshClassLib.clsMesh
       |         |-- FEMClassLib.clsFEM
       |         `-- Nike3d.dll / LEAF comparison logic
       |
       `-- /api/rigid/profile
            `-- AMClassLib.clsAM
```

## Backend Recommendation

### Recommended deployment model
- `website/` remains a React/Vite frontend.
- Add a new Windows-only backend project, for example `faarfield-api/`.
- Host the backend on a Windows machine because the native rigid path depends on `Nike3d.dll`.

### Recommended backend style
- Use a .NET Framework 4.8 Web API project or another Windows-hosted HTTP wrapper that can directly reference the existing FAARFIELD VB.NET libraries.
- Keep the backend in the same overall repo/workspace so the website and solver stay in sync.

### Why not browser-only
- The real solver stack is not browser-native.
- `AMClassLib` uses Windows-specific behavior and a native DLL declaration for `Nike3d.dll`.
- The frontend should only consume JSON returned by the backend.

## API Contract

### `POST /api/leaf/grid`
Purpose:
- Generate a stress/strain/deflection field on a 2D evaluation grid for flexible or layered elastic visualization.

Request:
```json
{
  "solver": "LEAF",
  "responseType": "AllResponses",
  "structure": {
    "layers": [
      { "thicknessIn": 4.0, "modulusPsi": 200000, "poisson": 0.35, "interface": 1.0 },
      { "thicknessIn": 8.0, "modulusPsi": 4000000, "poisson": 0.15, "interface": 1.0 },
      { "thicknessIn": 999.0, "modulusPsi": 12000, "poisson": 0.40, "interface": 1.0 }
    ],
    "evalDepthIn": 4.0
  },
  "aircraft": {
    "name": "B737-800",
    "gearLoadLb": 32000,
    "tires": [
      { "pressurePsi": 200, "xIn": -18, "yIn": 0 },
      { "pressurePsi": 200, "xIn": 18, "yIn": 0 }
    ]
  },
  "grid": {
    "xMinIn": -120,
    "xMaxIn": 120,
    "yMinIn": -120,
    "yMaxIn": 120,
    "stepIn": 4
  }
}
```

Response:
```json
{
  "solverUsed": "LEAF",
  "units": { "length": "in", "stress": "psi" },
  "grid": {
    "x": [-120, -116, -112],
    "y": [-120, -116, -112],
    "nx": 61,
    "ny": 61
  },
  "fields": {
    "stressX": [[0.0, 1.2], [1.5, 2.1]],
    "stressY": [[0.0, 1.0], [1.0, 2.0]],
    "stressZ": [[0.0, -5.0], [-4.8, -8.2]],
    "strainX": [[0.0, 0.0], [0.0, 0.0]],
    "deflZ": [[0.0, -0.001], [-0.002, -0.003]]
  },
  "critical": {
    "maxAbsStressZPsi": 82.1,
    "location": { "xIn": 12, "yIn": -8 }
  }
}
```

Backend note:
- The API should build the `EvalX` / `EvalY` arrays from the requested grid and map them into `LEAFACParms`.

### `POST /api/rigid/critical`
Purpose:
- Return rigid/composite critical stress results for overlay and underlay response, using the FAARFIELD-native rigid workflow.

Request:
```json
{
  "solver": "AM",
  "designType": "FlexOnRigid",
  "solverMode": "governing",
  "slabMeshSize": "standard",
  "structure": {
    "layers": [
      { "type": "AC", "thicknessIn": 2.5, "modulusPsi": 200000, "poisson": 0.35 },
      { "type": "PCC", "thicknessIn": 8.0, "modulusPsi": 4000000, "poisson": 0.15 },
      { "type": "Subgrade", "thicknessIn": 999.0, "modulusPsi": 12000, "poisson": 0.40 }
    ]
  },
  "aircraft": [
    { "name": "B737-800", "gearLoadLb": 32000 },
    { "name": "C17", "gearLoadLb": 90000 }
  ]
}
```

Response:
```json
{
  "solverUsed": "AM",
  "governingRule": "max(NIKE3D, LEAF)",
  "perAircraft": [
    {
      "name": "B737-800",
      "overlayStressPsi": 215.3,
      "underlayStressPsi": 184.9,
      "governingSolver": "NIKE3D"
    },
    {
      "name": "C17",
      "overlayStressPsi": 288.1,
      "underlayStressPsi": 241.2,
      "governingSolver": "LEAF"
    }
  ]
}
```

### `POST /api/rigid/profile`
Purpose:
- Return vertical stress versus depth for rigid/composite visualization.

Response shape:
```json
{
  "solverUsed": "AM",
  "units": { "length": "in", "stress": "psi" },
  "profiles": [
    {
      "name": "B737-800",
      "points": [
        { "zIn": 0.0, "stressPsi": 0.0 },
        { "zIn": 4.0, "stressPsi": -22.5 },
        { "zIn": 8.0, "stressPsi": -35.1 }
      ]
    }
  ]
}
```

## Frontend Visualization Mapping

| UI component | Data source | Recommended chart library |
|--------------|-------------|---------------------------|
| Stress contour map | `/api/leaf/grid` | `Plotly.js` contour or heatmap |
| Stress-depth profile | `/api/rigid/profile` | `Plotly.js` line chart |
| Overlay vs underlay comparison | `/api/rigid/critical` | `Recharts` bar chart or table |
| CDF summary and scenario comparison | browser-side JS or precomputed results | `Recharts` |

## Recommended Frontend Additions

Add these frontend modules to the website:
- `src/api/nativeStressClient.js`
- `src/components/StressContourPanel.jsx`
- `src/components/RigidStressProfile.jsx`
- `src/components/SolverComparisonCard.jsx`
- `src/components/SolverModeBadge.jsx`

Suggested behavior:
- Let the user choose between:
  - `Approximate CDF`
  - `Native LEAF Stress`
  - `Native Rigid Stress`
- Show a badge:
  - `Approximate`
  - `Native FAARFIELD`
  - `Native FAARFIELD + NIKE3D`

## Implementation Phases

### Phase 0: Backend foundation
1. Create `faarfield-api/` as a Windows-only backend.
2. Add DTOs for layers, aircraft, tire positions, grid requests, and solver results.
3. Add a health endpoint to confirm `Nike3d.dll` and FAARFIELD libraries are available.

### Phase 1: LEAF visualization
1. Wrap `LEAFClassLib.clsLEAF.ComputeResponse(...)`.
2. Implement `/api/leaf/grid`.
3. Build `StressContourPanel.jsx` with Plotly contours and heatmaps.

### Phase 2: Rigid/composite visualization
1. Wrap `AMClassLib.clsAM.ComputeResponse(...)`.
2. Implement `/api/rigid/critical` and `/api/rigid/profile`.
3. Build rigid stress comparison cards and depth-profile charts.

### Phase 3: UI integration
1. Add a solver-mode switch in the analysis panel.
2. Keep browser-side CDF for instant interaction.
3. Add a clear label explaining whether the current chart is approximate or native.

### Phase 4: Performance and caching
1. Cache solver outputs by normalized input hash.
2. Queue heavy rigid jobs if multiple users are expected.
3. Save recent native outputs as JSON snapshots for demo reliability.

## Key Limitations
- Phase 1 native rigid integration is best for:
  - edge stress
  - overlay versus underlay comparison
  - vertical stress versus depth
- A full arbitrary 3D volume-stress viewer is a later step and would require deeper extraction from the FEM workflow than the current website needs.
- The native rigid backend should be treated as Windows-only unless the solver dependency chain is reworked.

## Recommended Decision Rule For The Website
- Use browser-side JS when the goal is fast classroom interaction and approximate CDF sensitivity.
- Use `LEAF` backend when the goal is flexible/layered stress visualization.
- Use `AM + FAAMesh + FEM/NIKE3D` backend when the goal is rigid/composite stress visualization.
- Do not claim that browser-only plots are the native FAARFIELD stress engine.
