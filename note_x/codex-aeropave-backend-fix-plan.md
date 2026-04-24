# Feature Spec: Aeropave Backend Parity Fix Plan
Date: 2026-04-17
Layer: native-backend | website-frontend

## What We're Building
Close the two biggest parity gaps between the live `c:\temp\aeropave` backend and the FAARFIELD desktop workflow:
1. aircraft gear geometry should use the best available FAARFIELD wheel layout, not a universal dual-wheel fallback
2. native thickness design should be reachable from the website and moved closer to the real FF2 design loop

This is a **fix plan only**. It is meant to guide the next implementation session.

## Inputs / Outputs
- Input: current `c:\temp\aeropave` backend and frontend, FAARFIELD desktop source, combined aircraft library JSON, airport traffic records using `type/icao + mtow + gear`
- Output: a backend/frontend path that uses exact FAARFIELD wheel geometry wherever possible, exposes native thickness design in the website, and reduces the gap between native results and desktop FF2 behavior

## Files to Create or Edit
- `c:\temp\aeropave\faarfield-api\AircraftLibrary.vb` - replace the current first-match-by-ICAO lookup with a resolver that can choose the best FAARFIELD aircraft record
- `c:\temp\aeropave\faarfield-api\LeafSolverWrapper.vb` - stop building tire layouts only from `nTires` and `tireSpacingIn`; use resolved library wheel coordinates for grid/profile runs
- `c:\temp\aeropave\faarfield-api\FullAnalysisWrapper.vb` - use the same shared geometry resolver and improve native design iteration behavior
- `c:\temp\aeropave\faarfield-api\Dto\FullAnalysisRequest.vb` - allow passing a selected aircraft record id or resolved geometry metadata if needed
- `c:\temp\aeropave\faarfield-api\HttpRouter.vb` - keep `/api/analysis/design`, and add any geometry-debug route only if needed
- `c:\temp\aeropave\src\api\nativeStressClient.js` - add `fetchDesign()` and, if useful, an aircraft lookup helper
- `c:\temp\aeropave\src\tabs\DesignTool.jsx` - actually call native design and show required thickness separately from native CDF
- `c:\temp\aeropave\faarfield-api\combined_aircraft_library.json` - rebuild only if new resolver fields are needed
- `c:\temp\aeropave\src\data\aircraft_library.json` - keep in sync with backend library if rebuild happens

## Implementation Steps
1. [ ] **Fix aircraft record resolution**
Create a real resolver in `AircraftLibrary.vb` instead of storing only the first record per ICAO.
The resolver should rank candidates using:
`same ICAO + compatible gear -> exact gear + same manufacturer + same family -> exact gear + same manufacturer -> exact gear -> compatible gear-group + same manufacturer + same family -> compatible gear-group`, then break ties by closest MTOW.
The goal is to stop collapsing multiple possible FAARFIELD records into one weak default.

2. [ ] **Preserve and expose FAARFIELD record identity**
If the JSON does not already carry a stable FAARFIELD record key, rebuild it so each record can be selected directly.
The frontend traffic mix can still send ICAO, but the backend should be able to trace which exact aircraft-library record was used.

3. [ ] **Use exact geometry in LEAF grid/profile endpoints**
Refactor `LeafSolverWrapper.vb` so `ComputeGrid()` and `ComputeProfile()` use the same aircraft resolver as `FullAnalysisWrapper.vb`.
Right now the stress endpoints still synthesize tires from `nTires` and spacing; that should become a last-resort fallback only.

4. [ ] **Replace the universal dual-wheel fallback with gear templates**
For aircraft without exact XML wheel coordinates, do not always fall back to `(-17, +17)`.
Add fallback templates based on gear type such as:
`S`, `D`, `2D`, `2T`, `tridem`, and similar.
This will make the non-XML cases less wrong even before full FAARFIELD matching is available.

5. [ ] **Unify geometry handling across backend modules**
Both `LeafSolverWrapper.vb` and `FullAnalysisWrapper.vb` should call one shared helper that returns:
selected aircraft record, `wheel_coords`, tire pressure, tire width, track width, and fallback status.
That removes the current split where the CDF path knows about the library but the LEAF stress path does not.

6. [ ] **Wire the website to native design**
Add `fetchDesign()` in `nativeStressClient.js` for `/api/analysis/design`.
Update `DesignTool.jsx` so the UI can request:
- native CDF
- native required thickness
Right now the site only calls native CDF and still uses the JS engine for the main modified design result.

7. [ ] **Show native design output clearly in the UI**
Add a dedicated display for:
- `requiredThickness`
- controlling mode
- solver label
- warnings when simplified geometry was used
Do not hide native design behind the same card used for JS-only approximate CDF.

8. [ ] **Bring `RunDesign()` closer to the desktop rigid/flexible design loop**
The current `RunDesign()` already iterates, but it is still a simplified custom loop.
Improve it with desktop-inspired behavior:
- choose the design layer based on `designType`, not always `layers(0)`
- respect realistic minimum thickness values instead of only `0.5`
- handle overflow and low-sensitivity cases more explicitly
- preserve and report convergence status

9. [ ] **Decide on the parity target for native design**
Pick one of two implementation targets before deeper work:
- **Practical demo parity:** keep the current custom `RunCdfAnalysis()` / `RunDesign()` structure, but improve geometry and guards
- **Desktop parity:** construct a true FAARFIELD `Job/Section` path and call the real desktop setup + design flow
For the class demo, the practical path is faster. For publishable parity, the desktop path is stronger.

10. [ ] **Add side-by-side validation cases**
Choose 2-3 benchmark sections and compare:
- backend native CDF vs website JS
- backend native CDF/design vs desktop FAARFIELD
At minimum use one rigid/composite case and one flexible case.
Store the exact aircraft match chosen for each traffic aircraft so mismatches are explainable.

## Demo Test
1. `GET /api/aircraft/B738` returns a resolved aircraft record with exact wheel coordinates and metadata showing which FAARFIELD record was chosen.
2. `POST /api/leaf/grid` for a geometry-backed aircraft uses exact tire positions instead of generic spacing.
3. `POST /api/analysis/cdf` returns warnings only for aircraft that truly used fallback geometry.
4. `POST /api/analysis/design` returns a `requiredThickness` value and converges in a bounded number of iterations.
5. The website shows both:
   - JS approximate result
   - native FAARFIELD CDF
   - native FAARFIELD required thickness
6. For one benchmark section, the native result trend matches desktop FAARFIELD and the aircraft geometry source is auditable.

## Out of Scope
- Fixing `LeafCDFFlex` global-state hang in this pass
- Full FF2 `Job/Section` integration unless the team explicitly chooses the desktop-parity path
- Perfect exact wheel coordinates for every aircraft in the merged library
- Full AM/FEM rigid stress parity in the same session
- Remote deployment or multi-user concurrency work

## Key Cross-Check Notes
- Desktop FAARFIELD initializes aircraft and section state through `SetCurrentSectData()` and `UpdateCurrentSectData()`, then uses library geometry in the CDF coverage routines:
  - [RunAnalysis.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FF2/Models/RunAnalysis.vb:381>)
  - [modFedfaaGbl.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/modFedfaaGbl.vb:846>)
  - [modFedfaaGbl.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/modFedfaaGbl.vb:1161>)
  - [modCDF.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/modCDF.vb:1346>)
- Current backend issues:
  - first ICAO match wins in [AircraftLibrary.vb](</C:/temp/aeropave/faarfield-api/AircraftLibrary.vb:45>)
  - universal dual-wheel fallback in [AircraftLibrary.vb](</C:/temp/aeropave/faarfield-api/AircraftLibrary.vb:111>) and [FullAnalysisWrapper.vb](</C:/temp/aeropave/faarfield-api/FullAnalysisWrapper.vb:580>)
  - LEAF stress endpoints still synthesize tire positions in [LeafSolverWrapper.vb](</C:/temp/aeropave/faarfield-api/LeafSolverWrapper.vb:68>) and [LeafSolverWrapper.vb](</C:/temp/aeropave/faarfield-api/LeafSolverWrapper.vb:121>)
  - frontend calls native CDF only in [nativeStressClient.js](</C:/temp/aeropave/src/api/nativeStressClient.js:27>) and [DesignTool.jsx](</C:/temp/aeropave/src/tabs/DesignTool.jsx:181>)
  - backend does have a custom native design loop in [FullAnalysisWrapper.vb](</C:/temp/aeropave/faarfield-api/FullAnalysisWrapper.vb:727>), but the website is not using it yet

## Handoff
Open a fresh session, run `/prime`, then `/execute` using this plan plus the live backend folder `c:\temp\aeropave`.
