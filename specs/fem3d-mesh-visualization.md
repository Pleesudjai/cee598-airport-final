# Feature Spec: FEM3D Mesh Visualization (Option B)
Date: 2026-04-18
Layer: native-backend + website-frontend
Related: `specs/fem3d-managed-backend-integration.md`, `note_claude/fem3d-slab-dimensions-and-leaf-vs-fem.md`

## What We're Building

A **true 3D mesh viewer** in the Design Tool that renders the actual FAARFIELD `AMClassLib` mesh — nodes, brick elements, layer coloring, aircraft wheel load positions, and per-element stress heatmap. Replaces the "invisible black-box FEM" with a publishable engineering visualization suitable for commercial use.

Built in 3 phases. Each phase has an independent exit criterion so we never ship broken intermediate state.

## Inputs / Outputs

- **Input**: same `/api/analysis/cdf` request with `useFem3d: true`. No new client-side inputs required.
- **Output**: augmented `Fem3dResult` with:
  - `mesh.nodes[]` — `{x, y, z}` per node (one shared mesh, not per-aircraft)
  - `mesh.elements[]` — `{nodes[8], layerId, layerName}` per brick
  - `mesh.layers[]` — `{id, name, color, zTop, zBot}` legend
  - `mesh.wheelLoads[]` — `{x, y, pressure}` where tires apply load
  - `mesh.stressField[][]` — per-aircraft, per-element stress (scalar). Phase 2.
  - `mesh.displacements[]` — per-node deflection `{dx, dy, dz}`. Phase 3.
- **New endpoint**: `POST /api/fem3d/mesh` — returns mesh geometry + per-element stress for ONE aircraft. Used by the visualization panel independent of full CDF.

## Files to Create or Edit

### Backend
- `c:/temp/aeropave/faarfield-api/Fem3dWrapper.vb` — MODIFIED. After `ComputeResponse` returns, snapshot `AMClassLib.modPG.Nd`, `modPG.BrickElement` into a new `Fem3dMesh` struct. Phase 2: reach into `FEMClassLib.clsSolve.st()` via reflection. Phase 3: snapshot `clsSolve.un1()-un6()` displacements.
- `c:/temp/aeropave/faarfield-api/Dto/Fem3dMesh.vb` — NEW. DTOs for nodes, elements, layers, stress field, displacements. Optimized for JSON size: nodes as flat `Double[]` not object array.
- `c:/temp/aeropave/faarfield-api/Dto/Fem3dResponse.vb` — MODIFIED. Add `mesh As Fem3dMesh` field.
- `c:/temp/aeropave/faarfield-api/HttpRouter.vb` — MODIFIED. Existing `HandleFem3dStress` returns the mesh when Phase 1 lands. Also add `POST /api/fem3d/mesh` as a lightweight variant that returns mesh without full CDF.

### Frontend
- `c:/temp/aeropave/src/components/Fem3dMeshPanel.jsx` — NEW. Plotly 3D renderer with layer coloring, wheel markers, stress heatmap, deformation slider. Opens below the stress contour panel when FEM is enabled.
- `c:/temp/aeropave/src/api/nativeStressClient.js` — MODIFIED. Add `fetchFem3dMesh()`.
- `c:/temp/aeropave/src/tabs/DesignTool.jsx` — MODIFIED. Render `Fem3dMeshPanel` when `useFem3d === true` and CDF has been run.

## Implementation Steps

### Phase 1 — Geometry only (one session)

**Goal**: Render the actual FAARFIELD 3D mesh with layer colors and wheel positions. No stress coloring, no deformation.

1. [ ] In `Fem3dWrapper.vb`, immediately after `amRunner.ComputeResponse(...)` returns, snapshot mesh:
   - Read `AMClassLib.modPG.Nd()` — for each node store `{x, y, z}` (skip boundary/dummy nodes with `BXYZ < 0`).
   - Read `AMClassLib.modPG.BrickElement()` — for each brick store `{node[8], layerId = IdxMat}`.
   - Build a layer legend by grouping bricks by `IdxMat` and mapping to layer names from the request (AC/PCC/base/subgrade).
   - Extract aircraft wheel positions from the `LEAFACParms` we already pass in.
2. [ ] Add `Fem3dMesh` DTO. Keep JSON compact — nodes as `double[numNodes * 3]` flat array, not array of objects. Element connectivity as `int[numElements * 8]` flat array. Total size target: <2 MB for default mesh.
3. [ ] Include the mesh in the existing `/api/fem3d/stress` response. Frontend consumes it.
4. [ ] Add new endpoint `POST /api/fem3d/mesh` — same as `/api/fem3d/stress` but can be called without running full CDF (just geometry for preview). Reuses the wrapper.
5. [ ] Frontend `Fem3dMeshPanel.jsx`:
   - Plotly `mesh3d` with `i,j,k` triangle indices. Convert each 8-node brick into 12 triangles (6 faces × 2 triangles each).
   - Color triangles by `layerId` via `facecolor`.
   - Add `scatter3d` trace for wheel positions with red cone markers.
   - Add legend with layer names + color swatches.
   - Auto-rotation / orbit controls enabled.
6. [ ] Add to `DesignTool.jsx` below the existing stress panels, conditional on `useFem3d === true && nativeCdf?.femUsed === true`.

**Exit criterion for Phase 1**:
- Running the existing "Run FEM CDF" button produces a response that includes `mesh.nodes`, `mesh.elements`, `mesh.layers`
- The panel renders a recognizable 3D rectangular block of 3–4 colored layer slabs with red wheel markers at the right positions
- Rotate/zoom works smoothly (Plotly FPS ≥ 30)
- **Render performance ≥ 20 FPS on a typical laptop** during rotation/zoom with default settings (requires Phase 4 subsampling to be in place — boundary-shells by default, full mesh opt-in)
- JSON response for one-aircraft mesh is <3 MB uncompressed (gzipped <500 KB on the wire)
- A visible UI badge reports current rendering mode: "FAARFIELD mesh (full)" or "FAARFIELD mesh (layer shells, N elements shown of M total)"

### Phase 2 — Per-element stress heatmap (one session, after Phase 1 works)

**Goal**: Color the mesh by stress magnitude so hotspot under the wheel is visible.

7. [ ] Investigate `FEMClassLib.clsSolve.st()` — is it Public or Friend? If Public, direct access. If Friend, use `Type.GetField("st", BindingFlags.NonPublic Or BindingFlags.Static)` via reflection. Expected shape: `(numelh, 7, 8, ntime)`.
8. [ ] Extract a single scalar per element per aircraft — use von Mises (`st(e, 7, *, t)`) averaged over 8 corners, or max |σzz| across corners. Document choice.
9. [ ] Snapshot stress field immediately after `ComputeResponse` (before next call overwrites).
10. [ ] Serialize as `stressField: { aircraftIndex, values: Double[numElements] }[]`.
11. [ ] Frontend: swap Plotly `facecolor` from layer-based to stress-based. Use a Viridis colorscale with min/max from data. Add colorbar and stress value tooltip on hover.
12. [ ] Add a per-aircraft dropdown ("show stress for which aircraft?") — default: highest CDF aircraft.

**Exit criterion for Phase 2**:
- Heatmap shows concentrated peak stress under the wheel position, fading with distance and depth
- Peak matches the scalar `pccBottomStress` within 5–10%
- JSON response adds <500 KB per aircraft

### Phase 3 — Deformed mesh (one session, optional for v1)

**Goal**: Show slab bending visually via exaggerated displacement.

13. [ ] Extract `un1..un6` from `FEMClassLib.clsSolve` (likely requires reflection).
14. [ ] Map solver DOF indices to node indices. FAARFIELD packs DOFs per node as [ux, uy, uz, θx, θy, θz].
15. [ ] Frontend: add slider "Deformation scale 1×–1000×". Recompute displaced node positions in JS, update Plotly mesh3d in place.
16. [ ] Toggle button: "Undeformed | Deformed | Both (ghost)".

**Exit criterion for Phase 3**:
- With exaggeration 100×–500×, slab bowl under the wheel is visible
- Max displacement in `un1` matches the existing `deflZ` LEAF scalar within ±20% (LEAF and FEM give different deflection but same order of magnitude for a shared load)

### Phase 4 — Performance (REQUIRED with Phase 1, not optional)

**Why required now, not later**: because FAARFIELD ignores our `SlabMeshSize` parameter (see "Phantom compromise" above), the mesh is ALWAYS full-density (~64k bricks for default 20×20×3-layer). A naive full-mesh render will be unusably slow on a mid-range laptop. Phase 4 subsampling is the only performance lever we have, so it ships alongside Phase 1.

Steps marked **1A** are required for Phase 1 exit; the gzip/cache items are still deferrable to post-Phase-1.

17. [ ] **1A**: Mesh subsampling — render only layer-boundary (outer shell) elements by default. Keeps typical render <10 K triangles (FPS ≥ 20 on mid laptop).
18. [ ] **1A**: "High detail" toggle on the panel — when ON, renders full mesh. UI badge indicates shown/total element count.
19. [ ] **1A**: UI mode badge — `FAARFIELD mesh (layer shells, N of M)` or `FAARFIELD mesh (full, M elements)`.
20. [ ] Compress response with gzip (HttpListener supports `Accept-Encoding` — add if not already). *(post-Phase-1)*
21. [ ] Cache mesh on backend: same layers + same aircraft → same mesh, no need to regenerate. Use a hash of the request as key. *(post-Phase-1)*

## Demo Test

1. Open KMQJ Section 8662, toggle "Use 3D FEM", click "Run FEM CDF". After ~30 s, the new 3D mesh panel appears below the stress contour.
2. Rotate with mouse drag. See the layered pavement: AC overlay (dark), PCC slab (light gray), base (orange), subgrade (brown).
3. See red markers at the B738 wheel positions (which for KMQJ's FEM will be at the center of the mesh).
4. Switch to "Show stress heatmap" — mesh recolors. A hot-red blob appears directly under the wheel at the PCC bottom. Peak value matches the reported `pccBottomStress`.
5. Drag the "Deformation scale" slider to 500×. Slab visibly bowls downward under the wheel, subgrade deflects, AC surface bulges at the edge.
6. Switch aircraft dropdown to A320. Heatmap updates; stress peak shifts slightly.

## Desktop-Parity Audit (Compromises Section)

Honest list of what this feature does differently from FAARFIELD desktop, and why. Claude must report any new compromise here as it's introduced in implementation.

### NOT compromised (identical to desktop)

| Behavior | Source citation |
|----------|----------------|
| FEM solver (`AMClassLib.clsAM.ComputeResponse` with `NewNike3D = 2`) | `clsAM.vb:1176` |
| Mesh generator (`FAAMeshClassLib.clsMesh.MeshGeneration`) | `clsMesh.vb:181` |
| Element size | Whatever FAARFIELD's global `gSlabMeshSize` is (empirically matches desktop) |
| Slab domain 20×20 ft + infinite-slab spring BCs | `frmStructure.vb:63-64`, `modPG.vb:121` |
| FEM at offset=0, once per aircraft | `modFAILURE_MODEL_NP.vb:1300` |
| `max(FEM, LEAF × 0.95)` stress combination | `modDesignRigid_Adj.vb:156-168` |
| Skip aircraft < 6000 lbs | AC 150/5320-6 |
| Fatigue life curves (SCI-dependent PCC, RDEC AC) | Already identical in LEAF path |

### Phantom compromise — now resolved

**"Compromise #1" was wrong** (2026-04-18 observation): I initially set `SlabMeshSize2 = 10` in `Fem3dWrapper.vb`, thinking FAARFIELD's default was 5 and I was trading accuracy for speed. Empirical test showed the parameter is **ignored by `clsAM.ComputeResponse`** — mesh sizes of 3, 5, 10, 20 all produce identical stress (952.66 psi at 4 decimal places) and identical compute time. FAARFIELD uses its internal `gSlabMeshSize` global, not the API parameter. So the mesh density has always been desktop-parity. Wrapper now passes 5 for documentation honesty, and the API surface is preserved in case FAARFIELD patches this later.

### API surface decision: `fem3dMeshSize` is a deprecated no-op (Option C)

The `FullAnalysisRequest.fem3dMeshSize` field and the `gridPoints` override on `/api/fem3d/stress` currently have **no effect on FEM output** (FAARFIELD ignores them). We keep the field because:

1. Removing it now would be a breaking API change if any commercial user starts passing it
2. FAARFIELD may honor it in a future patch
3. Forward-compatibility is cheap

But we must label it clearly as a no-op so users aren't misled:

- Response must include `warnings: ["fem3dMeshSize=X accepted but FAARFIELD honors its internal global (~5\"); value ignored for now"]` if a non-default value is supplied
- OpenAPI/docs for the endpoint must say "currently no-op, reserved for future FAARFIELD patch"
- Frontend UI must NOT expose this parameter to users until FAARFIELD actually honors it

If later testing shows FAARFIELD in some mode DOES honor it, re-promote the field to active.

### Visual-only compromises (computation unchanged)

These affect ONLY the 3D mesh renderer. The backend FEM solve and CDF calculation are unaffected.

| # | Compromise | Where | Why | CDF impact |
|---|-----------|-------|-----|------------|
| V1 | **Boundary-only rendering by default** (Phase 4) | Frontend | Naive full-mesh = ~64k bricks, janky rotation. Show layer-boundary shells, opt-in "high detail" toggle. | None |
| V2 | **Scalar per element in heatmap** (Phase 2) | Backend snapshot | FAARFIELD's internal `st()` holds 8 corner tensors per brick. We collapse to von Mises avg or max \|σzz\|. | None — CDF uses scalar `Stress1`/`Stress8` envelope, same as desktop |
| V3 | **LEAF-based heatmap fallback** (Phase 2 risk) | If `clsSolve.st()` is Friend-scoped and reflection fails | Fallback heatmap is LEAF depth profile interpolation, labeled as approximation | None — CDF still uses real FEM `Stress1`/`Stress8` |
| V4 | **Subsampled full mesh at preview** (Phase 4) | Frontend, when user picks "preview quality" | Render every Nth element for smoother FPS | None |

**Required UI labeling**: the panel must display a small badge stating either "Rendering: FAARFIELD mesh (full)" or "Rendering: approximation — CDF uses full FEM" so commercial users are never confused about what they're looking at vs. what was computed.

### Implementation rules

- ANY new compromise Claude introduces during `/execute` MUST be added to this section before commit.
- If a step cannot be done without a new compromise, STOP and ask the user.
- Never silently degrade output without a visible UI indicator.

## Out of Scope

- **Multi-aircraft simultaneous stress**: show one aircraft at a time. Sum/envelope view deferred.
- **Edge/corner load analysis**: FAARFIELD's FEM setup is interior-slab. Changing the mesh domain to simulate edge loading is a separate, larger feature.
- **CDF hotspot visualization across all 41 offsets**: out of scope — FEM runs only at offset=0. The 41-offset sweep is a LEAF-side coverage calculation.
- **Mesh editing**: users cannot change slab dimensions from the UI in this spec. `fem3dMeshSize` API parameter exists but FAARFIELD currently ignores it (see "Phantom compromise" above).
- **Export to 3D file format** (OBJ, STL, glTF): could add later but not in v1.
- **Time-series animation of load sweep**: FEM is static analysis in FAARFIELD. Dynamic not in scope.
- **Mobile device support**: Plotly 3D is desktop-focused. Responsive sizing only.

## Risks & Unknowns

| Risk | Impact | Mitigation |
|------|--------|-----------|
| `Nd()` / `BrickElement()` contain more nodes than expected (60K+), JSON response exceeds 3 MB | Slow load, bad UX | Filter boundary/dummy nodes; subsample for render; gzip response |
| `FEMClassLib.clsSolve.st()` is Friend/private — not directly accessible | Phase 2 needs reflection, more code | Fall back: use `Stress1`/`Stress8` scalar for aircraft-level, approximate heatmap via stress profile at depth (LEAF) |
| Plotly 3D performance poor with 60K+ triangles | Janky rotation | Render only layer-boundary elements by default; subsampling toggle |
| Mesh orientation convention (Z up vs Z down, X fore-aft vs side-side) | Misleading visualization | Validate against known Westergaard deflection pattern |
| Displacement DOF numbering in `un1..un6` | Deformed mesh wrong | Document FAARFIELD's DOF packing convention from `clsSolve.vb`; validate against single-point deflection |
| Thread safety when multiple browser tabs request mesh concurrently | Corrupted state | All FEM calls under `analysisLock` already — keep mesh extraction inside the lock |
| FAARFIELD updates break our reflection path | Future breakage | Document which internal fields we reach into; prefer Public APIs where available |

## Commercial Considerations

Since this is for commercial extension, flag these early:

1. **Licensing**: FAARFIELD is public-domain FAA software. Confirm commercial redistribution rights with the user before shipping (no code change needed, but a note in `docs/`).
2. **Naming**: avoid "FAARFIELD" in product branding — use "3D FEM Pavement Analysis" or similar to avoid trademark issues.
3. **Telemetry**: no data collection in this spec. If later added, opt-in by default.
4. **Offline mode**: current backend is localhost only. Cloud deployment requires different spec (Windows containers, session isolation, FAARFIELD DLL licensing).

## Handoff

Open a fresh session, run `/prime`, then `/execute` with this spec.

**Start with Phase 1 ONLY.** Exit criterion for Phase 1 must be met before Phase 2 is attempted.

If Phase 2 blocks on `clsSolve.st()` being inaccessible, fall back to the simplified heatmap (depth profile + bilinear interpolation) rather than blocking the whole feature.

Phase 3 (deformed mesh) is nice-to-have, can ship without it.

Phase 4 (performance) should only happen after Phase 1 ships — don't optimize prematurely.
