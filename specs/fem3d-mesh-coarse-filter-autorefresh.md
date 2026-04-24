# Feature Spec: Coarse-Mesh Filter + Auto-Refresh on Soil Change

Date: 2026-04-18
Layer: native-backend + website-frontend
Related: `specs/fem3d-mesh-visualization.md`, `note_x/codex-claude-fem3d-mesh-fix-walkthrough.md`

## What We're Building

Two linked polish passes so the 3D FEM Pavement Model panel reads like a real
engineering plate instead of a raw FAARFIELD mesh dump:

1. **Coarse-mesh filter** — render only the "fine mesh" region that contains
   the AC/PCC layers (i.e. the actual physical slab under the gear). Hide
   FAARFIELD's outer "infinite-slab" mesh extension. Removes the patchy
   orange/brown top caused by elevation steps between fine and coarse regions.
2. **Auto-refresh on soil change** — once the user has built the mesh, any
   subsequent change to CBR (Soil Horizon Picker), aircraft, or pavement
   layers debounces 1000 ms and silently refetches. Cached hits are instant;
   cold solves surface a spinner. Users never need to click Refresh after
   adjusting inputs.

## Inputs / Outputs

- **Input (request)**: existing `POST /api/fem3d/mesh` payload, with one new
  optional field: `filterCoarse: Boolean` (default `true`).
- **Output (response)**: same `Fem3dMesh` DTO shape, but with fewer triangles
  when `filterCoarse=true` (only fine-region bricks survive). No new fields.
- **Frontend trigger**: new debounced `useEffect` in `Fem3dMeshPanel` that
  fires `runMesh()` when the user has previously built a mesh and any input
  has settled for ≥ 1000 ms.

## Files to Create or Edit

### Backend (`c:/temp/aeropave/faarfield-api/`)

- `Dto/LeafGridRequest.vb` — add `Public Property filterCoarse As Boolean`
  (the shared request DTO used by `/api/fem3d/mesh` and `/api/fem3d/stress`).
- `Fem3dWrapper.vb`:
  - Add `Optional filterCoarse As Boolean = True` parameter on
    `ComputePccStress` and `SnapshotMesh`.
  - Add a **Pass 3.5** between the existing face-dedup (Pass 3) and node
    compaction (Pass 4): compute the (x, y) bounding box of all bricks whose
    `IdxMat` matches the topmost user-supplied layer (AC). Reject any
    candidate face whose owning brick's (x, y) centroid falls outside that
    box. Y-mirror pass that already exists then applies to the filtered set.
  - Include `filterCoarse` in `BuildCacheKey` so filtered and unfiltered
    responses don't collide.
- `HttpRouter.vb`:
  - `HandleFem3dMesh` and `HandleFem3dStress` pass `request.filterCoarse` to
    the wrapper.

### Frontend (`c:/temp/aeropave/src/`)

- `api/nativeStressClient.js`:
  - `fetchFem3dMesh(layers, subgrade, aircraft, highDetail, filterCoarse = true)`
    forwards the new flag.
- `components/Fem3dMeshPanel.jsx`:
  - Add a `hasEverRendered` ref — set to `true` once the first mesh resolves.
  - Add a debounced `useEffect` watching `layers`, `subgrade?.E`,
    `aircraft?.type`, `aircraft?.mtow`, `aircraft?.aircraft`. On change:
    - If `!hasEverRendered.current` or `!enabled`, skip.
    - If `loading`, skip (the in-flight request will reflect latest state
      when it returns).
    - Otherwise set a 1000 ms timer that calls `runMesh()`. Clear on unmount
      or re-entry.
  - Add a subtle "Auto-refresh on inputs" status pill in the panel header so
    the user understands why the mesh updates without a click.
  - Remove the `useEffect` block that currently clears `meshData` to `null`
    on input change — auto-refresh supersedes it. Keep the purge of the
    Plotly canvas on `enabled` flip from true to false so a stale canvas
    doesn't linger when FEM is toggled off.

## Implementation Steps

### Part 1 — Coarse-mesh filter (backend)

1. [ ] Add `filterCoarse` to `Dto/LeafGridRequest.vb`.
2. [ ] In `Fem3dWrapper.SnapshotMesh`, after the existing layer-bounds pass
   that populates `layerByIdxMat`, compute the (x, y) bounding box for the
   brick set whose IdxMat matches layer-order index **0** (top user layer).
   If no layer-0 bricks exist (unlikely), skip filtering and emit a warning.
3. [ ] In the face-dedup pass, when `filterCoarse` is true, skip any brick
   whose X-Y centroid is outside that bbox. Keep a small tolerance (~ one
   element width) so boundary faces aren't cut off.
4. [ ] Add `filterCoarse` into the `BuildCacheKey` input so the cache
   doesn't return a full-mesh result for a filtered request.
5. [ ] Rebuild backend, curl-test C130 (should produce a uniform black
   AC pad sitting on a small square slab, no patchy orange/brown).

### Part 2 — Auto-refresh on soil change (frontend)

6. [ ] Add `filterCoarse` parameter to `fetchFem3dMesh` in
   `nativeStressClient.js`, default `true`.
7. [ ] In `Fem3dMeshPanel.jsx`, introduce `hasEverRendered` ref and flip it
   after the first successful mesh load.
8. [ ] Delete the old "clear mesh on change" `useEffect`. Replace with a
   debounced one that kicks `runMesh()` after 1000 ms of input-stability
   when `hasEverRendered` is true.
9. [ ] Add the "Auto-refresh" pill near the state chip.
10. [ ] Verify in the browser that:
    - Changing CBR silently refetches.
    - Changing aircraft silently refetches.
    - Changing layer thickness silently refetches.
    - Cold-cache refetches show the spinner; cached hits stay visually
      steady with no flicker.

## Demo Test

**KMQJ 8662 + C130 + Design Aircraft mode:**
1. Toggle `Use 3D FEM`, click `Build 3D model`. Mesh loads (~13 s first time).
2. Panel shows a clean square pavement plate: central black AC pad on a
   light-gray PCC strip, surrounded by a uniform-colored base, with subgrade
   below. No orange/brown patches on the top surface.
3. Slide CBR from 4 → 15 in the Soil Horizon Picker. Let go. After ~1 s,
   panel silently refetches — cached result is instant, so the new PCC stress
   appears with no visible flicker.
4. Drag CBR back to 7. Auto-refresh fires again, serves from cache.
5. Switch aircraft from C130 to B738. Auto-refresh fires — if first time,
   ~13 s spinner; re-selecting C130 is instant from cache.
6. Switch to Top view. Verify no coarse-mesh artifacts visible.

## Out of Scope

- Editing FAARFIELD's internal mesh generator (we only filter what gets
  rendered; FEM itself still runs on the full mesh for correct BCs).
- Changing the coarse/fine split in FAARFIELD's `Conversion()` —
  architectural change requiring DLL recompile.
- Auto-rerun of the native CDF (`/api/analysis/cdf`) on CBR change —
  separate concern, handled by the existing CDF auto-debounce in
  `DesignTool.jsx`.
- Visual-only transparency / clip-plane view of internal layers —
  nice-to-have but not needed for the "engineering plate" goal.
- Persisted mesh cache across backend restarts — in-memory cache is fine
  for a localhost tool.

## Notes for Implementer

- The "fine mesh" bbox is defined by the AC layer specifically because AC is
  the topmost user-supplied layer in every project section. If a design ever
  uses PCC as the top layer (no AC overlay), fall back to the topmost
  available layer whose IdxMat matches a user-input name.
- Cache-key change invalidates all existing entries — that's fine, cache is
  in-memory and rebuilds on demand.
- Y-mirror pass in `SnapshotMesh` already runs AFTER the face-dedup, so the
  new coarse filter must sit between layer-bounds and face-dedup (or between
  face-dedup and node compaction — either works, but before mirror).
- Keep the `highDetail=true` diagnostic mode honest: it should also ignore
  `filterCoarse` when set (full mesh always, all faces always). Easiest:
  `filterCoarse = filterCoarse AndAlso Not highDetail`.
- Debounce lives client-side; backend already serializes calls under
  `analysisLock`, so a burst of debounced calls is safe but wasteful —
  the 1000 ms window is plenty for a slider.

## Handoff

Open a fresh session, run `/prime`, then `/execute
specs/fem3d-mesh-coarse-filter-autorefresh.md`.

Part 1 (backend) must ship before Part 2 (frontend) — otherwise the
auto-refresh will still produce patchy-looking mesh results.
