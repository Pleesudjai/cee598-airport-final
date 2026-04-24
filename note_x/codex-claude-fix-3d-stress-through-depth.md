# Codex Note For Claude: Fix 3D Stress So It Makes Civil-Engineering Sense

Date: 2026-04-19

## Problem

The current 3D stress viewer is mechanically confusing.

Why:

- the backend collapses each brick to **one averaged stress tensor**
- the frontend paints every triangle from that brick with that same value
- so stress looks too uniform through the thickness of a layer

That is not how a civil engineer expects rigid-pavement stress to read.

For pavement mechanics, we expect:

- **PCC bending stress** to change through slab depth
  - top face often compression
  - bottom face often tension
- **vertical stress** to attenuate with depth
- **subgrade response** to be strongest near the top of subgrade, not constant through the whole lower domain

Right now the viewer is closer to a **brick-average diagnostic field** than a true engineering post-processor.

## Root Cause

### Backend

The backend currently aggregates the 8 Gauss points to one tensor per brick in:

- [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb:1254>) through [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb:1267>)

That means one brick gets one row:

- `[sigmaX, sigmaY, sigmaZ, tauXY, tauYZ, tauXZ]`

### Frontend

The frontend then maps each rendered triangle to its parent brick and uses that one brick tensor for the whole face:

- [Fem3dMeshPanel.jsx](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/src/components/Fem3dMeshPanel.jsx:84>) through [Fem3dMeshPanel.jsx](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/src/components/Fem3dMeshPanel.jsx:90>)

So:

- top triangles and bottom triangles of the same brick can easily get the same color
- that destroys the visual through-depth stress change engineers expect

## Another Important Bug

The backend DTO says:

- `Z positive downward` in [Fem3dMesh.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Dto/Fem3dMesh.vb:10>)

But the frontend axis label says:

- `Z (in) — up` in [Fem3dMeshPanel.jsx](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/src/components/Fem3dMeshPanel.jsx:369>)

That must be fixed before telling users to interpret top/bottom stress physically.

## What The Viewer Should Show Instead

The engineering-friendly view should be face-aware.

The viewer should let the user ask questions like:

1. `PCC top face σy`
2. `PCC bottom face σy`
3. `PCC top face σx`
4. `Subgrade top σz`
5. `All visible faces Mises` for diagnostics only

Default engineering view should **not** be Mises.

Default should be something physically interpretable, such as:

- `PCC bottom σy` for slab fatigue discussion
- or `Subgrade top σz` for subgrade/rutting discussion

## Fix Strategy

Do this in 3 stages.

## Stage 1: Stop Pretending Brick-Average = Through-Depth Stress

### Goal

Make the current viewer honest right away.

### Changes

1. In [Fem3dMeshPanel.jsx](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/src/components/Fem3dMeshPanel.jsx:658>), change the note so it says:

`Current colors are brick-averaged FEM stresses. They are useful for trend inspection, but they do not resolve top-vs-bottom stress variation within a brick.`

2. In [Fem3dMeshPanel.jsx](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/src/components/Fem3dMeshPanel.jsx:231>), do not default to `mises`.

Use:

- `sigmaY` for rigid slab flexural review

3. Fix the axis label:

- change `Z (in) — up`
- to either `Z (in) — positive downward`
- or flip the plotted sign and then label it `up`

Do not leave backend and frontend disagreeing.

## Stage 2: Add Face-Resolved Stress, Not Just Brick-Resolved Stress

This is the real fix.

### Goal

Give each visible face its own stress value.

### Backend change

Extend the mesh DTO in [Fem3dMesh.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Dto/Fem3dMesh.vb:13>) with face metadata.

Add fields like:

- `surfaceTriFaceKinds As String()`
- `surfaceTriFaceZ As Double()`
- `surfaceTriFaceStress As Double()()` or per-component arrays

At minimum, every rendered triangle should know whether it came from:

- `top`
- `bottom`
- `side`
- `interface`

### How to classify face kind

Inside [SnapshotMesh(...) in Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb:540>), each quad face already has:

- 4 node coordinates
- mean Z
- brick id
- layer id

Add face classification:

1. compute the face normal or simply compare the 4 z-values
2. if all 4 z-values are near the layer `zTop`, classify as `top`
3. if all 4 z-values are near the layer `zBot`, classify as `bottom`
4. otherwise classify as `side` or `interface`

You already have layer bounds here:

- [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb:714>)
- [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb:715>)

Use them.

### Important point

Do **not** keep using one stress tensor for all faces of a brick if the UI is trying to show top vs bottom behavior.

Instead, compute a stress value per visible face.

## Stage 3: Derive Face Stress From The FEM Tensor In A Physically Meaningful Way

### Minimum acceptable version

For each visible face:

1. start from the brick tensor already extracted from `clsPrintOut.st(,,, )`
2. use that tensor only as a temporary bridge
3. assign that value only to face groups intentionally selected by the user

But this is still limited.

### Better version

Use the element stress information together with face position:

- top-face triangles should use stress associated with the upper integration-point region
- bottom-face triangles should use stress associated with the lower integration-point region

The current backend mean across all 8 Gauss points hides that difference.

So in [ExtractElementStressTensor(...) in Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb:1233>), stop exposing only one aggregation.

Support at least:

- `mean_all`
- `mean_top_gp`
- `mean_bottom_gp`

If FAARFIELD brick integration-point ordering is known, map the upper 4 and lower 4 Gauss points consistently.

If the ordering is not yet fully proven, do this carefully:

1. inspect one element in a known bending case
2. compare sign patterns across gp indices
3. identify which gp set belongs to top and bottom
4. write the mapping down in comments

Do not guess silently.

## What The Frontend Should Offer

In [Fem3dMeshPanel.jsx](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/src/components/Fem3dMeshPanel.jsx:534>), replace the single component-only dropdown with two selectors:

1. **Stress component**
- `σx`
- `σy`
- `σz`
- `σ1`
- `τmax`
- `Mises`

2. **Face filter / depth selector**
- `All visible faces`
- `Top faces only`
- `Bottom faces only`
- `Side faces only`
- `Top + bottom only`

Then filter `surfaceTri*` before plotting.

### Default combinations

For civil-engineering use:

- default component: `σy`
- default face filter for PCC: `Bottom faces only`

For subgrade review:

- component: `σz`
- face filter: `Top faces only`
- selected layer: `subgrade`

## What The User Should Be Able To See

After the fix, the viewer should make these mechanics obvious:

### PCC slab bending

- `σy` on PCC top faces and bottom faces should not be the same
- one side may be compressive and the other tensile
- that is the slab-bending story civil engineers expect

### Vertical stress attenuation

- `σz` at upper faces should be larger near the loaded surface
- `σz` should reduce deeper in the structure
- subgrade-top values should be more meaningful than "whole-layer average"

## Validation Steps

Use one simple validated aircraft first:

- `B738` or `A320`

Use one test section first:

- AC over PCC over subgrade

Then verify:

1. `σy` top and bottom PCC faces have different signs or at least different magnitudes
2. `σz` decreases with depth overall
3. face filtering changes the plot meaningfully
4. the Z-axis label matches the real coordinate convention

If the top and bottom plots still look nearly identical, the aggregation is still too crude.

## What Not To Do

1. Do not keep Mises as the default "engineering" view.
2. Do not average the full brick and then claim through-depth behavior.
3. Do not leave the Z-axis sign ambiguous.
4. Do not tell users the viewer shows slab bending correctly until top/bottom faces are actually separated.

## Final Instruction To Claude

The problem is **not** that civil engineers are misunderstanding the plot.

The problem is that the current 3D stress post-processing is too coarse.

Fix the post-processing so the picture matches the mechanics:

- face-aware
- depth-aware
- component-aware
- sign-consistent

Only then will the 3D FEM stress field read like a real pavement-engineering result instead of a strange uniform color block through the layer thickness.
