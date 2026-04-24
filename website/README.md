# AeroPave Website — Dropbox Snapshot

This folder is a **source-only mirror** of the live website at `c:/temp/aeropave/` on the original development machine. It is intended for rehydration on a fresh machine, code review, and archival.

> **Do not run the app from this folder.** Dropbox path lengths, sync latency, and case-sensitivity issues will break the Vite dev server and .NET build. Always rehydrate into a local non-synced path (e.g. `c:/temp/aeropave/`) first.

---

## Rehydration (fresh machine)

1. **Copy the snapshot** to a local path outside any cloud-synced folder:
   ```
   robocopy "<this folder>" "c:\temp\aeropave" /E /XD node_modules bin obj dist .vite .git .cache
   ```
2. **Install frontend deps** (`c:\temp\aeropave`):
   ```
   npm install
   ```
3. **Install FAARFIELD 2.1.1** from the installer in the project's `FAARFIELD_2.1.1_Installation Files/` folder. This populates `C:\Program Files (x86)\FAARFIELD\` with `LEAFClassLib.dll`, `ACClassLib.dll`, `FaarFieldModel.dll`, `AMClassLib.dll`, `FAAMeshClassLib.dll`, `FEMClassLib.dll` — all required by the native backend.
4. **Build the backend** (x86, .NET 4.8) — no Visual Studio or NuGet required:
   ```
   cd c:\temp\aeropave\faarfield-api
   C:\Windows\Microsoft.NET\Framework\v4.0.30319\msbuild.exe FaarfieldApi.vbproj /p:Configuration=Release /p:Platform=x86 /v:m
   ```
   Output: `bin/x86/Release/FaarfieldApi.exe`.
5. **Run both processes** (two shells):
   ```
   # Shell 1 — backend
   c:\temp\aeropave\faarfield-api\bin\x86\Release\FaarfieldApi.exe

   # Shell 2 — frontend
   cd c:\temp\aeropave
   npm run dev
   ```
6. Open http://localhost:5173 — the Design Tool tab should connect to the native solver via the Vite proxy at `/api/*` → `localhost:5100`.

---

## Architecture

```
c:/temp/aeropave/
├── src/                    React 19 + Vite 8 + Tailwind + Recharts + Plotly
│   ├── App.jsx             3-tab shell (Project Report · Design Tool · Methodology)
│   ├── tabs/               One file per top-level tab
│   ├── components/         ~20 panels: layers, traffic, subgrade, stress views, etc.
│   ├── engine/             JS fallback CDF engine (used when backend is offline)
│   ├── api/                Thin clients: nativeStressClient.js, aircraftClient.js
│   └── data/               Pre-computed airport JSON, soil JSON, aircraft library
├── faarfield-api/          .NET Framework 4.8 backend (x86, HttpListener)
│   ├── Program.vb          Entry point, binds localhost:5100
│   ├── HttpRouter.vb       All /api/* route handlers
│   ├── LeafSolverWrapper.vb  LEAF elastic-layer solver, grid + point endpoints
│   ├── Fem3dWrapper.vb     3D FEM mesh snapshot, stress, surface dedup, coarse filter
│   ├── FullAnalysisWrapper.vb  CDF + Newton-Raphson design loop
│   ├── AircraftLibrary.vb  ICAO → geometry resolver (XML · proxy · template · dual)
│   └── Dto/                JSON request/response shapes
└── public/, vite.config.js, package.json, index.html
```

### Graceful degradation
The website works **without** the native backend — the JS engine in `src/engine/` covers the CDF path. A green/gray badge in the Design Tool indicates whether the native solver is reachable. FEM3D stress heatmaps require the backend.

### Missing DLL
`Nike3d.dll` is not installed on the development machine, so the backend runs in **LEAF-only mode**. For flexible-on-rigid designs, FAARFIELD desktop computes `max(NIKE3D, LEAF·0.95)` — LEAF alone is a conservative lower bound, clearly labeled in the UI.

---

## Backend API

Base URL: `http://localhost:5100`

| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/health` | Solver availability, aircraft library count |
| POST | `/api/leaf/grid` | LEAF stresses on a 2D grid (for heatmaps) |
| POST | `/api/leaf/point` | LEAF stresses at a single (x, y, z) |
| GET  | `/api/aircraft/list` | Full aircraft library (name, ICAO, gear, MTOW) |
| GET  | `/api/aircraft/{icao}` | Single aircraft resolved geometry |
| POST | `/api/analysis/cdf` | Full CDF for one traffic mix |
| POST | `/api/analysis/design` | Newton-Raphson PCC thickness design |
| POST | `/api/fem3d/stress` | 3D FEM bottom-of-PCC stress (no mesh) |
| POST | `/api/fem3d/mesh` | 3D FEM mesh snapshot + stress (for panel) |

Responses are plain JSON. Error responses use `{ "error": "...", "detail": "..." }`. FEM3D returns `422 Insufficient FEM3D geometry` if the aircraft resolves to only a generic dual-wheel fallback.

---

## Aircraft geometry resolution

`AircraftLibrary.ResolveGeometry(icao, gear, mtow, tirePressure)` applies a tiered fallback:

1. **Exact FAARFIELD XML** — 136 aircraft have published `wheel_coords`.
2. **Proxy donor** — scored by shared ICAO · gear compatibility · manufacturer · family · MTOW distance. Labeled `icao_proxy`, `family_proxy`, or `nearest_proxy`.
3. **Gear-type template** — S, D, 2D, 2T, 3D, 2D/2D2, 5D (with aliases for D1/D2/Q2/2S/2D/D1/2D/2D1/2D/3D2).
4. **Dual-wheel fallback** — last resort, blocks FEM3D (which requires meaningful geometry).

Provenance is exposed via `AircraftGeometry.Source` and `.ResolvedIcao`.

---

## Build notes

- **Target:** .NET Framework 4.8, Platform = **x86** (must match FAARFIELD's `LEAFClassLib.dll` PE32).
- **No NuGet.** All dependencies resolve from the GAC or from `C:\Program Files (x86)\FAARFIELD\`.
- MSBuild ships with the .NET Framework runtime (`C:\Windows\Microsoft.NET\Framework\v4.0.30319\msbuild.exe`) — no Visual Studio install needed.
- JSON serialization uses the built-in `System.Web.Script.Serialization.JavaScriptSerializer`.
- HTTP uses `System.Net.HttpListener` (no ASP.NET, no Kestrel).

---

## Known limitations

- **Nike3d.dll missing** → LEAF-only mode (documented above).
- **Complex-gear FEM mesh** is rendered with a single-truck synthetic dual pair at `(0, ±17")` — FAARFIELD's FEM input only accepts S/D. Stress magnitudes for 2D/2D2, 3D, 2S, etc. are **indicative**, not per-gear authoritative.
- **True per-element FEM stress field** is not exposed (`clsPrintOut.st(,,,)` is an ephemeral instance inside `clsAM.ComputeResponse`). The mesh heatmap is a LEAF-grid bilinear interpolation, clearly labeled.
- **Deformed-mesh visualization** (Phase 3) is not implemented — same reflection barrier as per-element stress.
