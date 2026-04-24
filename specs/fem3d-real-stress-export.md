# Feature Spec: Native FEM Stress Export (Real Per-Element Field on the 3D Mesh)

Date: 2026-04-19
Layer: native-backend + website-frontend
Related: `note_x/codex-claude-fem3d-heatmap-professional-fix.md` (the directive), `specs/fem3d-mesh-visualization.md` (geometry foundation), `specs/native-faarfield-backend-implementation-v2.md` (backend baseline)

## What We're Building

Replace the current LEAF-bilinear "stress" overlay on the 3D FEM mesh viewer with a **real FEM-derived stress field** extracted directly from `FEMClassLib.clsFEM → objSolve → objPrintout.st(,,,)` after FAARFIELD's managed FAASR3D solve. The frontend then colors each surface triangle by its parent brick's stress aggregate (max-of-8-Gauss or centroid), with a proper engineering legend (component selector: σx / σy / σz / τmax / σ1 / Mises) sourced entirely from FEM output — no LEAF interpolation in the color path.

This is Step 4 of the codex note's professional fix path. Steps 1, 2, 5 (UI honesty) shipped 2026-04-19 morning.

## Inputs / Outputs

- **Input (request):** existing `POST /api/fem3d/mesh` payload, with one new optional field: `includeStressField: Boolean` (default `true`). When `false`, behaves exactly like today (geometry only) for low-overhead callers.
- **Output (response):** existing `Fem3dMesh` DTO + new fields:
  - `elementStress: Single[]` — flat array, length = `numHexElements`, scalar (chosen aggregation) per brick element in psi.
  - `elementStressTensor: Single[][]` — optional, length = `numHexElements`, each row = `[σx, σy, σz, τxy, τyz, τxz]` in psi. Only sent if `request.includeStressTensor = true` (extra ~150 KB).
  - `surfaceTriStress: Single[]` — derived from `elementStress` via `surfaceTriBrickIds` (already populated). Length = `numTriangles`. This is what the frontend colors by.
  - `stressFieldMeta: { component, aggregation, units, range[min,max] }` — for the legend.
- **Frontend:** `Fem3dMeshPanel.jsx` rewires `colorMode === 'stress'` to read `meshData.surfaceTriStress` directly (skipping `computeTriangleStress` / LEAF grid fetch entirely), with a new component picker (σx/σy/σz/τmax/σ1/Mises) — backend computes all six on demand.

## The Hard Part: Reflection Lifecycle

`clsAM.ComputeResponse` at [clsAM.vb:1179](FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/clsAM.vb#L1179) creates `Dim RunFEM As New FEMClassLib.clsFEM()` as a **local** variable, calls `RunFEM.FAASR3D(...)`, then lets RunFEM go out of scope. The mesh survives because `modPG.Nd / BrickElement` are module globals; the stress array does **not** survive because it lives on the discarded `RunFEM.objSolve.objPrintout` chain.

**Solution path (chosen): re-run FAASR3D in our wrapper with a retained clsFEM instance.**

After `amRunner.ComputeResponse(...)` returns (CDF + mesh state populated), we:
1. Create our own `Dim femRunner As New FEMClassLib.clsFEM()` and keep the reference on the `Fem3dWrapper` stack.
2. Call `femRunner.FAASR3D(IPC, Stress1, Stress8, StopFEDFAA, FEDFAAStopped, CShort(gDesignType), iSymCase, WorkingDir0, JobName, 0, ct)` — same args the desktop uses (modPG globals already set by ComputeResponse).
3. Reflect: `femRunner.objSolve` (public) → `objSolve.objPrintout` (private — `BindingFlags.NonPublic Or BindingFlags.Instance`) → `objPrintout.st` (public, type `Double(,,,)`).
4. Aggregate `st(elem, comp, gp, time)` across `gp = 1..8` and `time = ntime` (last load step) to per-element scalar.

**Cost:** ~12s extra per mesh build (one extra FEM solve). Mitigated by:
- Cached on input hash same as the existing CDF FEM result.
- Only fires when `colorMode === 'stress'` is active and stress field not already in the cached mesh response.
- Hide behind the `includeStressField` request flag so the geometry-only fast path is unaffected.

**Why not fork ComputeResponse:** clsAM.ComputeResponse is ~1500 lines of LEAF + mesh + FEM coupling. Replicating just the FEM-call setup risks divergence. Re-running FAASR3D against the same modPG state is a 5-line addition.

## Files to Create or Edit

### Backend (`c:/temp/aeropave/faarfield-api/`)

- `Dto/LeafGridRequest.vb` — add `Public Property includeStressField As Boolean = True` and `Public Property includeStressTensor As Boolean = False` and `Public Property stressComponent As String = "sigma1"` (`sigma1` | `sigmax` | `sigmay` | `sigmaz` | `tauMax` | `mises`) and `Public Property stressAggregation As String = "max"` (`max` | `mean` | `centroid`).
- `Dto/Fem3dMesh.vb` — add `Public Property elementStress As Single()`, `Public Property elementStressTensor As Single()()`, `Public Property surfaceTriStress As Single()`, `Public Property stressFieldMeta As StressFieldMeta`. New nested DTO `Public Class StressFieldMeta` with `component`, `aggregation`, `units`, `rangeMin`, `rangeMax`.
- `Fem3dWrapper.vb` — primary surgical site:
  - New private function `ExtractStressField(femRunner, component, aggregation) As (elementStress, tensor)` — performs the reflection chain into `objSolve.objPrintout.st`, aggregates Gauss points, returns `Single()` and optional `Single()()`.
  - New private function `ComputeDerivedScalar(sx, sy, sz, txy, tyz, txz, component) As Double` — computes σ1 (max principal) / Mises / τmax from the 6-component tensor; pass-through for σx/σy/σz.
  - Modify `ComputePccStress(...)` to accept new args `includeStressField`, `includeStressTensor`, `stressComponent`, `stressAggregation`. After existing `amRunner.ComputeResponse(...)` returns and **before** `SnapshotMesh`, run a second FAASR3D against a freshly-constructed `clsFEM` and hold the reference. Then call `ExtractStressField` and stash on `result.mesh`.
  - Map per-element stress to `surfaceTriStress`: each surface triangle already carries its source brick ID in `surfaceTriBrickIds` — direct lookup.
  - Cache key (`BuildCacheKey`): include `includeStressField`, `includeStressTensor`, `stressComponent`, `stressAggregation`. Different stress modes → different cache entries.
- `HttpRouter.vb` — `HandleFem3dMesh` and `HandleFem3dStress` forward the four new fields to the wrapper. No new route needed.

### Frontend (`c:/temp/aeropave/src/`)

- `api/nativeStressClient.js` — `fetchFem3dMesh(...)` accepts `{ includeStressField, includeStressTensor, stressComponent, stressAggregation }` opts; defaults preserve current behavior.
- `components/Fem3dMeshPanel.jsx`:
  - **Delete** `computeTriangleStress(...)` (lines 56-106) and the LEAF-grid plumbing (`leafGridData`, `leafLoading`, `ensureLeafGrid`, the `useEffect` that triggers it, the `triStress`/`stressRange` useMemo that calls computeTriangleStress).
  - **Replace** with: `triStress = meshData?.mesh?.surfaceTriStress` directly. `stressRange` from `meshData?.mesh?.stressFieldMeta?.rangeMin/rangeMax`.
  - **Stress component selector** (currently σx/σy/σz/τmax/δz from LEAF) becomes σ1/σx/σy/σz/τmax/Mises — synced to backend `stressComponent` request param. Selector change → re-fetch (cached after first hit per component).
  - **Aggregation selector** (new): `Max | Mean | Centroid` — synced to `stressAggregation`.
  - **Disclaimer rewrite** (the amber callout shipped this morning): change to a green "Native FEM stress" callout describing component, aggregation, range, source field path. Drop the "visualization only" warning.
  - **Toggle button** "LEAF overlay" renames back to "Stress" with primary-blue active state (no longer amber/warning) — it's authoritative now.
  - **Subtitle** reverts to: `Computed by FAARFIELD FEM (mesh + stress field) — managed-path solve`.

## Implementation Steps

### Phase A — Spike (1 day): prove the reflection lifecycle works

1. [ ] Write `Fem3dStressSpike.vb` — a one-shot harness that:
   - Constructs a minimal layered section + B738 aircraft.
   - Calls `amRunner.ComputeResponse(...)` (existing path).
   - Then constructs `Dim femRunner As New FEMClassLib.clsFEM()` and calls `FAASR3D` with the same args.
   - Reflects into `femRunner.objSolve.objPrintout.st` and prints `st.GetLength(0..3)` and a single `st(1, 1, 1, 1)` value.
2. [ ] Ship as a `GET /api/diag/fem-spike` endpoint or a console one-shot; confirm `st` array is populated with non-zero stresses after the second FAASR3D.
3. [ ] **Decision gate:** if step 2 fails (e.g. modPG state contaminated by second pass, or objSolve null) → switch to Path B (fork ComputeResponse). Document why in `docs/decisions.md` and update spec.

### Phase B — Backend wiring (1.5 days)

4. [ ] DTO additions to `Dto/LeafGridRequest.vb` and `Dto/Fem3dMesh.vb`.
5. [ ] Implement `ExtractStressField` and `ComputeDerivedScalar` in `Fem3dWrapper.vb`. Unit-spot-check σ1 / Mises / τmax against a known test case.
6. [ ] Wire the second FAASR3D call into `ComputePccStress`. Verify `result.computeTimeMs` ≈ original + 12s.
7. [ ] Map `elementStress` → `surfaceTriStress` via `surfaceTriBrickIds`.
8. [ ] Update `BuildCacheKey` and `HandleFem3dMesh` / `HandleFem3dStress`.
9. [ ] Smoke test all six stress components for B738 / A320 / B748 via curl. Confirm σz peaks under wheels, σx/σy peak at PCC bottom edges.

### Phase C — Frontend wiring (0.5 day)

10. [ ] Strip `computeTriangleStress` + LEAF-grid plumbing from `Fem3dMeshPanel.jsx`.
11. [ ] Wire `triStress` from backend DTO. Update component picker to backend-list. Add aggregation picker.
12. [ ] Update legend / colorbar units, range display, callout copy.
13. [ ] Re-style toggle: amber → primary-blue. Update colorBadge copy. Update subtitle.

### Phase D — Validation against desktop FAARFIELD (1 day) — *user has FAARFIELD 2.1.1 installed*

14. [ ] Pick 3 reference cases: KLHX taxiway section (single B738), KMWH runway (B788 mix), KCIU runway (heavy single-aisle mix). Take per-section pavement structure as-is from `c:/temp/aeropave/src/data/`.
15. [ ] In **desktop FAARFIELD**: open each section, run analysis with `Output Files = ON`, locate `PrintOut-{JobName}/Output-Hexahedron Element-Step {n}.txt`. Extract σx, σy, σz at:
    - Element directly under the wheel center
    - Element at PCC bottom under the wheel
    - Element at slab edge
16. [ ] In **AeroPave**: hit `/api/fem3d/mesh?...&stressComponent=sigmax` etc. for the same section + aircraft. Look up the same elements by spatial position.
17. [ ] **Acceptance:** AeroPave values within ±5% of desktop printout for all 9 spot-checks (3 sections × 3 elements). Document the comparison table in `docs/decisions.md`.
18. [ ] Visual sanity: render the heatmap, eyeball that σz peaks under wheels, σx is highest at PCC bottom, edge-of-slab elements show expected gradient.

### Phase E — Cutover (0.5 day)

19. [ ] Delete the dead LEAF-overlay code paths and dead disclaimer copy in `Fem3dMeshPanel.jsx`.
20. [ ] Update CLAUDE.md / docs/decisions.md / `central brain/CLAUDE.md` to reflect new authoritative-color status.
21. [ ] Capture before/after screenshots for the report (LEAF overlay vs native FEM, same aircraft + section).
22. [ ] `/handoff` then `/commit`.

**Total: ~5 days** (1 spike + 1.5 backend + 0.5 frontend + 1 validation + 0.5 cutover + 0.5 buffer).

## Demo Test

In the Design Tool with KLHX section + B738 aircraft:

1. Click **Build 3D model** → wait ~24s (one extra FEM pass).
2. Switch to **Stress** mode. Pick **σz**. See blue-to-yellow contour with peak directly under wheel footprint, ranging ~0 to ~−180 psi.
3. Switch component to **Mises**. Range jumps to 0–250 psi, peak shifts slightly off-axis.
4. Switch aggregation to **Centroid**. Smoother field, slightly lower peaks (Gauss-pt max suppressed).
5. Tooltip on a single brick face shows the actual element stress value (not interpolated).
6. Side-by-side with desktop FAARFIELD printout for the same section: peak values match within 5%.
7. Header chip reads `Computed by FAARFIELD FEM (mesh + stress field)`. No "visualization only" disclaimer anywhere.

## Out of Scope

- **NIKE3D path.** Nike3d.dll is missing — we stay on the FAASR3D managed path. If FAA ever ships Nike3d.dll, this work needs revisit.
- **Per-Gauss-point detail in the UI.** Aggregation to per-element scalar is the deliverable. No 8-points-per-brick visualization.
- **Time-history.** FAARFIELD runs multiple time steps (`ntime`); we use the last step only (peak load). Time scrubber is future work.
- **Deformed mesh (`un1..un6`).** Carryover from prior handoff — separate spec.
- **Strain field, displacement field.** Tensor → derived scalar covers this project's needs. If user wants displacement contours later, separate spec.
- **Per-load-case decomposition.** Multi-aircraft mixes show the FEM result for the analyzed aircraft only (current behavior unchanged).
- **Recompiling FAARFIELD source.** All work happens in our wrapper via reflection. FAARFIELD DLLs untouched.

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Spike fails — modPG globals contaminated by second FAASR3D | Medium | Path B fallback (fork ComputeResponse). Adds 1-2 days. |
| `objSolve.objPrintout.st` empty after second pass (Solve clears state internally) | Medium | Reflect into `objPrintout` BEFORE the FAASR3D call to register a hook, OR find the corresponding method that doesn't clear (read clsSolveMain.vb more carefully). Adds 0.5 day. |
| 6-component → derived-scalar formulas have sign-convention bugs (FAARFIELD: +Z down, conventional: +Z up) | High | Phase D validation catches this; explicit comment in `ComputeDerivedScalar` documenting the convention. |
| 12s extra solve time annoys users on every mesh-build | Low | Cache hit is instant; only first-time component picks pay the cost. Could parallelize component pre-compute (all six in one solve) — already covered by tensor export. |
| Desktop FAARFIELD printout format has changed between versions | Low | User has 2.1.1 installed; backend wraps 2.1.1 DLLs; same version. |
| Per-element max-of-Gauss visually noisy (each brick shows worst Gauss pt → patchy heatmap) | Medium | Aggregation picker exposes Mean/Centroid as smoother alternatives. Default to Centroid for production, Max for diagnostics. |

## Decision Gates

- **After Phase A:** spike passes → continue. Spike fails → re-evaluate (Path B fork, or pull the toggle entirely per the codex note's Step 5 fallback).
- **After Phase D:** values within 5% of desktop → ship. Out of band → diagnose (likely Gauss aggregation choice or sign convention) before cutover.

## Notes for Future Sessions

- The note `note_x/codex-claude-fem3d-heatmap-professional-fix.md` is the canonical directive. Don't drift from its acceptance criteria.
- Steps 1/2/5 of that note shipped 2026-04-19 (UI honesty). This spec is Step 4 only. Step 3 (research) was completed by an Explore agent — see `docs/decisions.md` 2026-04-19 entry.
- If future-Claude is reading this and the spike already failed, jump to Path B (fork the FEM branch from ComputeResponse) — the FAASR3D arg list is documented in `clsAM.vb:1181`.
