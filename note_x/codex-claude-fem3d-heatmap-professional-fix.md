# Codex Note For Claude: Fix The FEM3D Heatmap Professionally

Date: 2026-04-19

## Purpose

This note is the clean step-by-step fix path for the current AeroPave FEM3D heatmap.

The short version:

The current 3D mesh is real FEM geometry, but the color contour is not a native FAARFIELD FEM stress field. Right now the browser is painting a LEAF-derived approximation onto the mesh. That is useful as a temporary visual aid, but it is not professional to present it like a true 3D FEM stress result.

Claude should fix this in two stages:

1. Make the current UI honest and professional right now.
2. Only bring back a true stress heatmap after the backend can return real FEM-derived stress data.

## Bottom Line

Do not fake a 3D FEM contour.

If the backend does not export real FEM element or nodal stresses, the frontend should not invent them from LEAF and present them like FAARFIELD 3D output.

For now, the professional default is:

- show the mesh geometry
- show layer colors
- show wheel loads
- show real scalar results such as PCC-bottom stress and overlay stress
- clearly say when a view is visualization-only

## What The Code Is Doing Today

### 1. The frontend heatmap is LEAF interpolation, not FEM stress output

Current file:

- `website/src/components/Fem3dMeshPanel.jsx`

Key evidence:

- `bilinear(...)` at line 32
- `computeTriangleStress(...)` at line 56
- the current UI disclaimer at lines 700-704

What that function does today:

1. It takes the LEAF stress grid.
2. It finds each surface triangle centroid on the FEM mesh.
3. It translates that centroid from slab coordinates into gear-centered LEAF coordinates using `gearOriginInMesh`.
4. It bilinearly interpolates the LEAF grid at that point.
5. It scales the result by a heuristic layer factor:
   - AC uses `overlayStress / pccBottom`
   - PCC uses `1.0`
   - base/stabilized layers use about `0.35`
   - subgrade uses about `0.10`

That is a visualization approximation. It is not a solver-exported FEM field.

### 2. The backend FEM route returns real mesh geometry, but not a stress field

Current files:

- `website/faarfield-api/Fem3dWrapper.vb`
- `website/faarfield-api/Dto/Fem3dMesh.vb`

Key evidence:

- `ComputePccStress(...)` in `Fem3dWrapper.vb` at line 174
- mesh DTO population near lines 808-829
- `Fem3dMesh` DTO fields in `Dto/Fem3dMesh.vb`

The backend currently returns:

- `nodeCoords`
- `surfaceTriNodes`
- `surfaceTriLayerIds`
- `wheelLoads`
- `gearOriginInMesh`
- layer metadata

It does not currently return:

- per-triangle FEM stress
- per-node FEM stress
- a real stress contour field from the FEM solver

So the frontend has no native FEM stress field to color by.

### 3. The current CDF logic uses a scalar FEM stress, not a full field

Current file:

- `website/faarfield-api/FullAnalysisWrapper.vb`

Key evidence:

- comment at line 630: `stress_eff = max(FEM, LEAF x 0.95)`
- scalar usage around lines 634-637

What the backend is really doing for design:

1. Run LEAF.
2. Run FEM to get a controlling PCC-bottom stress scalar when available.
3. Use `max(FEM, LEAF x 0.95)` for the effective PCC stress in CDF.

That is a real engineering rule.

But it is not the same thing as exporting a full 3D stress contour for every visible triangle.

### 4. The managed FEM path is already simplified for some gear cases

Current file:

- `website/faarfield-api/Fem3dWrapper.vb`

Key evidence:

- gear normalization warning around line 216

The wrapper already warns that some complex gears are normalized to a single main-gear truck for the managed visualization path. That is another reason the frontend must be careful not to overclaim what the colored plot means.

## Why The Current Heatmap Is Not Professional

It is not wrong to use an approximate overlay during development.

What is not professional is letting users read that color field as if it were native FAARFIELD 3D FEM stress. A civil or mechanical engineer will reasonably assume that a color contour painted on a 3D FEM mesh came from the FEM solver unless the UI is very explicit otherwise.

Right now the current note:

`Heatmap is an approximation: per-triangle stress is bilinearly interpolated from the LEAF horizontal-stress grid ...`

is more honest than no warning, but it still leaves too much room for confusion because:

- the mesh itself is real FEM geometry
- the panel still looks like a FEM stress post-processor
- the wording says CDF uses the "full FEM solution", but this view itself is not full FEM stress output

## The Professional Fix Order

Follow this order. Do not jump to cosmetic changes first.

## Step 1: Stop Overstating What The Heatmap Means

### Goal

Make the UI truthful immediately.

### File To Touch First

- `website/src/components/Fem3dMeshPanel.jsx`

### What Claude Should Change

1. Change the default color mode from approximate stress coloring to plain layer-color rendering.
2. Rename the current heatmap mode to something explicit like:
   - `Approx. LEAF Stress Overlay`
   - or `Visualization Only`
3. Replace the current disclaimer with stronger wording such as:

`Mesh geometry is from the FEM model. Color contours in this view are not native FEM stresses; they are LEAF-derived visualization only and are not used directly for design checks.`

4. Remove wording that implies the visible contour itself is FAARFIELD FEM output.
5. Keep the real scalar outputs visible:
   - PCC bottom stress
   - overlay stress
   - mesh size
   - compute time

### Acceptance Check

If a new user can look at the panel and still easily think "this is true element-by-element FEM stress", Step 1 is not done.

## Step 2: Make Geometry-Only View The Professional Baseline

### Goal

The mesh viewer should still look useful and polished even without a heatmap.

### Files

- `website/src/components/Fem3dMeshPanel.jsx`
- `website/faarfield-api/Fem3dWrapper.vb`
- `website/faarfield-api/Dto/Fem3dMesh.vb`

### What Claude Should Do

1. Keep shell rendering crisp and readable.
2. Keep layer colors authoritative and consistent.
3. Keep wheel loads visible but not oversized.
4. Make camera presets easy:
   - Iso
   - Top
   - Longitudinal
   - Transverse
5. Add a small subtitle like:

`FEM mesh geometry from FAARFIELD-managed analysis`

6. If FEM is blocked because geometry falls to `dual_fallback`, surface that clearly in the panel instead of showing a misleading mesh/stress result.

This gives the user a respectable engineering viewer even before real FEM contour export exists.

## Step 3: Add Real FEM Stress Export In The Backend

### Goal

Only after this step should Claude reintroduce a true stress heatmap.

### Files To Investigate

- `website/faarfield-api/Fem3dWrapper.vb`
- `website/faarfield-api/Dto/Fem3dMesh.vb`
- `FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/clsAM.vb`
- `FAARFIELD_2.1.1_SourceCode/FAARFIELD/FEMClassLib`

### What Claude Needs To Find Out

Claude must answer this question first:

Can the managed FAARFIELD path expose real FEM stresses per node, per element, or per evaluation point without scraping a printout file?

Likely starting points:

1. `clsAM.ComputeResponse(...)`
2. `clsAM.GetFEMStress(...)`
3. printout/export classes inside `FEMClassLib`

### Preferred Backend Result

Extend `Dto.Fem3dMesh` so it can return one of these real fields:

1. `surfaceTriStress()` if stress is computed directly per visible triangle
2. `nodeStress()` if nodal FEM stress can be exported and interpolated on the frontend
3. `surfacePointStress()` if the solver exposes stress at face centers or evaluation points

The best option is the simplest one that is truly FEM-derived.

### Important Rule

Do not continue using LEAF bilinear interpolation once a real FEM field exists.

The frontend should color from backend FEM data only.

## Step 4: Rebuild The Frontend Heatmap Around Backend FEM Data

### Goal

Make the color map technically honest.

### File

- `website/src/components/Fem3dMeshPanel.jsx`

### What Claude Should Change

1. Delete or bypass `computeTriangleStress(...)` for real FEM heatmap mode.
2. Read stress values directly from the backend DTO.
3. Use a proper engineering legend:
   - quantity name
   - unit
   - sign convention if needed
   - min/max range
4. Let the user choose what is being viewed if the backend can provide more than one scalar:
   - horizontal stress
   - principal stress
   - strain
   - displacement

If the backend only exposes one trustworthy quantity, keep the UI simple and only show that one.

## Step 5: Keep The CDF Story Separate From The Viewer Story

### Goal

Do not confuse design logic with display logic.

Current design logic is still valid:

- LEAF provides the stress grid used in the 2D side of the workflow.
- FEM provides the controlling PCC-bottom scalar stress when available.
- CDF uses `max(FEM, LEAF x 0.95)`.

That does not mean the viewer can color a whole 3D model from LEAF and call it FEM.

So Claude should keep two statements clearly separate:

1. `Design result logic`
2. `Viewer color source`

Those are not the same thing.

## If Real FEM Field Export Is Too Hard Right Now

Then the professional choice is simple:

1. Remove the stress heatmap toggle for now.
2. Keep a clean geometry-only mesh viewer.
3. Keep real scalar outputs and warnings.
4. Add a backlog note that true heatmap mode depends on backend FEM field export.

That is better than shipping a pretty but misleading contour plot.

## Suggested Replacement UI Copy

Use something closer to this:

`Mesh geometry is generated from the managed FAARFIELD FEM model. Color-by-layer is exact to the rendered mesh. If an approximate stress overlay is shown, it is LEAF-derived visualization only and is not native FEM contour output.`

If Claude removes the approximation mode entirely, even better:

`This view shows the FEM mesh geometry and wheel layout used by the backend analysis. Stress design checks are reported separately in the result summary.`

## Practical Acceptance Criteria

Claude is done when all of the following are true:

1. The default mesh panel no longer implies that the visible color field is native FEM stress when it is not.
2. The UI clearly distinguishes real FEM scalar results from any visualization-only overlay.
3. The user can still inspect the 3D mesh professionally without relying on a fake contour field.
4. If a heatmap mode exists, it is backed by real FEM-derived data from the backend DTO.

## Final Guidance

The right fix is not "make the approximation look better."

The right fix is:

1. be honest now
2. export real FEM field data next
3. only then show a true heatmap

That is the professional engineering path.
