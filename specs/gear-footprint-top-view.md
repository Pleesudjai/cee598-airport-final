# Feature Spec: Top-View Gear Footprint Plot + C/P Column

Date: 2026-04-22
Layer: native-backend + website-frontend

## What We're Building

A top-down pavement view of the **10 highest-CDF-contributing aircraft** rendered below the existing per-aircraft table in the Design Tool, plus a numeric **C/P column** added to that table. Each row in the new visual shows one aircraft's wheel footprints at the controlling lateral offset ω*, with the FAARFIELD wander envelope (±2σ = ±60.87 in) shaded behind, so the user can sanity-check that the **tier-matched gear coordinates from `combined_aircraft_library.json`** are physically sensible and that the displayed C/P traces back to those coordinates.

## Inputs / Outputs

- **Input:**
  - Existing CDF response (`POST /api/analysis/cdf` → `Dto.FullAnalysisResponse`)
  - Aircraft library JSON at `c:/temp/aeropave/faarfield-api/bin/x86/Release/combined_aircraft_library.json` (Apr 17 14:44, the live file `Program.vb:56` resolves)
  - Tier-matched gear coordinates already produced by `AircraftLibrary.ResolveGeometry` → `FindProxyGeometryRecord` (tiers 0–6)
- **Output:**
  - Extended `AircraftCdfResult` JSON with 5 new fields (`geometrySource`, `nWheels`, `tireWidth`, `wheelX[]`, `wheelY[]`)
  - New "C/P" column in the **Top Aircraft by CDF Contribution** table
  - New `GearFootprintTopView` SVG component rendered below that table

## Files to Create or Edit

- **Backend (rebuild required):**
  - `c:/temp/aeropave/faarfield-api/Dto/FullAnalysisResponse.vb` — extend `AircraftCdfResult` class with 5 new properties (after line 52, before `cdfProfile`)
  - `c:/temp/aeropave/faarfield-api/FullAnalysisWrapper.vb` — capture `geo.Source` per aircraft into a new `geomSourceArr` (parallel to `wheelXArr`, populated in the loop at line 612-622); set the 5 new fields when building `acResults` (line 842-852)
  - Rebuild via `cmd //c "cd /d c:\temp\aeropave\faarfield-api & C:\Windows\Microsoft.NET\Framework\v4.0.30319\msbuild.exe FaarfieldApi.vbproj /p:Configuration=Release /p:Platform=x86 /v:m"`
  - Kill + restart `FaarfieldApi.exe`

- **Frontend:**
  - `c:/temp/aeropave/src/components/GearFootprintTopView.jsx` — **NEW**, pure SVG, no external deps. Props: `perAircraft[]`, `controlOffsetIn`, `controllingMode`. Renders top-10 stacked rows.
  - `c:/temp/aeropave/src/tabs/DesignTool.jsx` — (a) add `<th>C/P</th>` column header and `<td>{a.coverageToPass?.toFixed(3)}</td>` data cell to the per-aircraft table around line 920-947; (b) import + mount `<GearFootprintTopView nativeCdf={nativeCdf} />` immediately after the table closes (around line 967-976).

## Implementation Steps

### Backend

1. [ ] **Edit `Dto/FullAnalysisResponse.vb`** — add to `AircraftCdfResult` (after line 52, before `cdfProfile`):
   ```vb
   ' Tier-matched aircraft library traceability (added 2026-04-22)
   Public Property geometrySource As String   ' xml | icao_proxy | family_proxy | nearest_proxy | gear_template | dual_fallback
   Public Property nWheels As Integer
   Public Property tireWidth As Double         ' inches, from BuildLeafParms
   Public Property wheelX As Double()          ' 0-based wheel X coords (inches), from tier-matched record
   Public Property wheelY As Double()          ' 0-based wheel Y coords (inches)
   ```

2. [ ] **Edit `FullAnalysisWrapper.vb`** — at the per-aircraft array declarations (line 583-589) add:
   ```vb
   Dim geomSourceArr(nAC - 1) As String
   ```

3. [ ] **Edit `FullAnalysisWrapper.vb`** — in the loop at line 612, immediately after `geo = AircraftLibrary.ResolveGeometry(...)` add:
   ```vb
   geomSourceArr(ia) = If(geo.Source, "unknown")
   ```

4. [ ] **Edit `FullAnalysisWrapper.vb`** — at line 842 `acResults.Add(...)`, append the 5 new fields:
   ```vb
   .geometrySource = geomSourceArr(ia),
   .nWheels = nWheelsArr(ia),
   .tireWidth = tireWidthArr(ia),
   .wheelX = wheelXArr(ia),
   .wheelY = wheelYArr(ia),
   ```

5. [ ] **Build:** `cmd //c "cd /d c:\temp\aeropave\faarfield-api & C:\Windows\Microsoft.NET\Framework\v4.0.30319\msbuild.exe FaarfieldApi.vbproj /p:Configuration=Release /p:Platform=x86 /v:m"` — must show `0 Error(s)`.

6. [ ] **Restart:** `taskkill //IM FaarfieldApi.exe //F` then start `c:/temp/aeropave/faarfield-api/bin/x86/Release/FaarfieldApi.exe` in background; poll `/api/health` until 200.

### Frontend

7. [ ] **Create `c:/temp/aeropave/src/components/GearFootprintTopView.jsx`** with this contract:
   - Props: `nativeCdf` (the full backend response). Pulls `nativeCdf.perAircraft.slice(0, 10)`, `nativeCdf.controlOffsetIn`, `nativeCdf.controlling`. Returns `null` if no perAircraft data.
   - **Coordinate system:** X = lateral position from runway centerline (in), Y = row index (1 row per aircraft). Domain X: [-100, +100] inches by default; auto-widen to fit widest aircraft + margin.
   - **Per-row rendering:**
     - Translucent grey rectangle for the wander envelope, width = 4σ = 121.74 in (i.e., ±2σ), centered on the gear's centroid + ω*.
     - For each `(wheelX[j], wheelY[j])` in the resolved geometry, draw a filled rectangle of width = `tireWidth` and height = `tireWidth × 0.6` (FAARFIELD's typical tire contact aspect). Position: shift the entire gear by ω* so that the wheels land where the controlling-offset case sits.
     - Color saturation of wheels: HSL hue ramped 120° (green) → 0° (red) by aircraft rank (1 = darkest red, 10 = darkest green). Or use `cdf` value mapped to viridis-like scale.
   - **Row label** (left margin, fixed-width): `#{rank}  {icao}  C/P={coverageToPass.toFixed(3)}  CDF={cdf.toExponential(2)}  gear={gear}  src={geometrySource}`
   - **Reference lines:**
     - Centerline at x = 0 (dashed black, full canvas height)
     - ω* annotation as a small green arrow + label at top
   - **Caption** (below SVG): "Top 10 CDF contributors at controlling lateral offset ω* = {N}". Wheel coordinates from the tier-matched aircraft library (geomSource per row). Wander envelope shaded grey at ±2σ = ±60.87 in. **C/P shown above is the same value that multiplies design departures in the CDF sum** at this offset."

8. [ ] **Edit `DesignTool.jsx`** — in the Top Aircraft by CDF table (around line 920-947):
   - Add `<th className="text-right py-2 px-3">C/P</th>` between the existing **Annual** and **Design Deps** columns (line 926).
   - Add `<td className="py-2 px-3 text-right font-mono">{a.coverageToPass?.toFixed(3) ?? '—'}</td>` in the matching position in the row template (line 938).

9. [ ] **Edit `DesignTool.jsx`** — `import GearFootprintTopView from '../components/GearFootprintTopView'` near the other component imports (line 17ish). After the per-aircraft table renders (around line 951-952, inside the same `(() => {...})()` block, return both the table AND the new component, OR return them as siblings). Cleanest: hoist the GearFootprintTopView call out of the IIFE, put it right after, gated on `nativeCdf?.perAircraft?.length > 0`.

### Verification

10. [ ] **Backend health:** `curl http://localhost:5100/api/health` returns 200 with `analysisAvailable: true`.

11. [ ] **DTO smoke test:** From the running website, click any project airport with traffic (e.g., KMQJ 8662), wait for the FEM CDF to complete, then in browser DevTools console:
   ```js
   await fetch('/api/analysis/cdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({...lastReq}) }).then(r => r.json()).then(j => j.perAircraft[0])
   ```
   Confirm `geometrySource`, `nWheels`, `tireWidth`, `wheelX`, `wheelY` are all present and non-empty.

12. [ ] **Visual:** Reload the Design Tool, scroll to the per-aircraft table, confirm "C/P" column shows numeric values (typically 0.05 – 0.50 range). Below the table the new SVG renders 10 rows of gear footprints with row labels including `src=xml` for in-library aircraft and `src=nearest_proxy` for proxied ones.

## Demo Test

Open KMQJ 8662 in the Design Tool. The per-aircraft table now shows a C/P column; the largest CDF aircraft (probably a CRJ2 or B738) has C/P ≈ 0.10–0.20. Below the table, a top-down view shows 10 stacked gear footprints. The professor can immediately see (a) which aircraft has the widest track (B748 etc.), (b) which is most concentrated near centerline, (c) any aircraft on a low-tier proxy (`src=family_proxy` or `nearest_proxy`) flagged for hand-check. Each row's C/P number in the row label matches the table column above — proving the same value enters the CDF integrand.

## Out of Scope

- Animating the wander distribution (just shade the ±2σ band, don't draw the PDF curve).
- Showing all 41 lateral offsets — only ω* is rendered.
- Multi-aircraft overlay on a single shared centerline. Stacked rows only (clearer engineering picture).
- Re-running the 13-section batch — this is a Design Tool-only visualization; project-report numbers in `cdf_results.json` are unchanged.
- Updating the existing in-table columns (MTOW, Gear, etc.) — only adding C/P.
- Adding new CDF math — purely a visualization + traceability change.
- Plotly. Pure SVG keeps the bundle small and avoids the dynamic-import hop.

## Risks & Mitigations

- **Library staleness:** the spec assumes the Apr 17 14:44 file at `bin/x86/Release/combined_aircraft_library.json` is current. If user has a newer library, copy it over before rebuilding the backend (or the geometrySource values may not reflect the latest tier matches).
- **Build failure:** if msbuild errors out, do not bypass with `--no-verify`; fix the VB.NET property syntax. Common gotcha: VB.NET array-typed properties need `Public Property X As Double()` syntax exactly (not `Double[]`).
- **Wide gears off-canvas:** B777 / B748 / A380 wheel coordinates can extend ±170". Auto-widen the SVG viewBox to `[xMin - margin, xMax + margin]` based on actual rendered aircraft, not a fixed window.
- **Field naming consistency:** the response JSON serializer is case-sensitive. Confirm new fields appear as `geometrySource`, `nWheels`, etc. (lowercase first letter) in the JSON output, matching the existing `coverageToPass` pattern.

## Estimated Effort

- Backend edits + rebuild + restart: 15 min
- Frontend SVG component: 60–90 min (most of the work — tire scaling, color ramp, row layout)
- Integration + table column: 15 min
- Visual QA in browser: 15 min
- **Total: ~2 hours**
