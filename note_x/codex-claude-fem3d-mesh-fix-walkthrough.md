# Codex Note For Claude: Step-by-Step Fix Plan For FEM3D Mesh + 3D Analysis UX

Date: 2026-04-18

## Purpose

This note is a practical walkthrough for Claude on how to fix the current FEM3D mesh viewer step by step.

The main goal is:

Make the mesh panel look like professional engineering software, not a developer diagnostic.

Do **not** jump straight to stress heatmaps or deformation. The current viewer first needs cleaner geometry, better workflow, and clearer presentation.

## Bottom Line

The backend FEM work is real and valuable. The current viewer still looks rough for three main reasons:

1. It renders **whole bricks** in shell mode instead of only the **exposed faces**, so the model looks muddy and overfilled.
2. The mesh panel feels like a **second separate tool** because it reruns a mesh solve after the user already ran FEM CDF.
3. The UI still reads like an **internal alpha** instead of a polished engineering panel.

## Current Evidence In Code

### 1. The frontend is drawing all 12 faces of every selected brick

Current brick-face triangulation lives here:

- [Fem3dMeshPanel.jsx](</C:/temp/aeropave/src/components/Fem3dMeshPanel.jsx:17>)
- [Fem3dMeshPanel.jsx](</C:/temp/aeropave/src/components/Fem3dMeshPanel.jsx:51>)

This is the biggest visual problem.

### 2. The backend selects shell/interface bricks, but not surface faces

The shell-selection logic is already present here:

- [Fem3dWrapper.vb](</C:/temp/aeropave/faarfield-api/Fem3dWrapper.vb:440>)
- [Fem3dWrapper.vb](</C:/temp/aeropave/faarfield-api/Fem3dWrapper.vb:469>)

That is a good start, but it still sends bricks. The frontend then renders every face of those bricks, including many faces that should stay hidden.

### 3. The mesh viewer reruns work after FEM CDF

The FEM CDF button lives here:

- [DesignTool.jsx](</C:/temp/aeropave/src/tabs/DesignTool.jsx:580>)

The mesh panel then separately calls:

- [Fem3dMeshPanel.jsx](</C:/temp/aeropave/src/components/Fem3dMeshPanel.jsx:129>)
- [nativeStressClient.js](</C:/temp/aeropave/src/api/nativeStressClient.js:132>)

That makes the workflow feel disconnected.

### 4. The current rendering defaults still look prototype-level

Current rendering settings that contribute to the rough look:

- opacity, lighting, hover, and per-layer full-node duplication in [Fem3dMeshPanel.jsx](</C:/temp/aeropave/src/components/Fem3dMeshPanel.jsx:69>)
- high opacity in [Fem3dMeshPanel.jsx](</C:/temp/aeropave/src/components/Fem3dMeshPanel.jsx:74>)
- fixed camera and scene layout in [Fem3dMeshPanel.jsx](</C:/temp/aeropave/src/components/Fem3dMeshPanel.jsx:152>)

## Recommended Fix Order

Follow this order. Do not skip ahead.

## Step 1: Fix The Geometry First

### Goal

Make shell mode render only what a human should actually see:

- exterior pavement surfaces
- side faces
- layer interfaces

Do **not** render all faces of every boundary brick.

### Files To Touch First

- [Fem3dMesh.vb](</C:/temp/aeropave/faarfield-api/Dto/Fem3dMesh.vb:1>)
- [Fem3dWrapper.vb](</C:/temp/aeropave/faarfield-api/Fem3dWrapper.vb:276>)
- [Fem3dMeshPanel.jsx](</C:/temp/aeropave/src/components/Fem3dMeshPanel.jsx:1>)

### What Claude Should Change

1. Extend `Dto.Fem3dMesh` so the backend can return **surface triangles or surface quads**, not only brick connectivity.
2. In `SnapshotMesh(...)`, keep the existing shell-brick selection, but add a second pass that extracts only **visible faces**.
3. Use a face map keyed by the four original node IDs of each quad face.
4. If the same face appears twice on two bricks in the same rendered set and same layer, hide it.
5. If the face is shared by two different layers, keep exactly one copy so the interface stays visible.
6. Triangulate each kept quad into two triangles before returning JSON.

### Implementation Hint

The cleanest fix is to move this work to the backend instead of doing heavy face-dedup in the browser.

Why:

- smaller JSON
- less Plotly work
- better control over what counts as a visible surface
- easier path later for stress heatmaps and section cuts

### Acceptance Check

After Step 1, the viewer should look like a crisp layered pavement block, not a dense sawtooth mass.

If the screenshot still looks muddy, Step 1 is not done.

## Step 2: Simplify The Frontend Renderer

### Goal

Make the frontend render the already-clean geometry instead of reconstructing every brick face itself.

### Files

- [Fem3dMeshPanel.jsx](</C:/temp/aeropave/src/components/Fem3dMeshPanel.jsx:1>)

### What Claude Should Change

1. Remove the current assumption that every brick becomes 12 triangles.
2. Replace `BRICK_FACES`-driven rendering with the backend-provided surface triangles.
3. Keep one Plotly trace per layer for color grouping.
4. Continue to overlay wheel markers, but keep them visually smaller and more deliberate.

### UI Cleanup In The Same Pass

While touching the panel:

1. Add camera presets: `Iso`, `Top`, `Longitudinal`, `Transverse`.
2. Reduce empty whitespace around the scene.
3. Keep the legend compact and pinned.
4. Make the top layers more visually readable than the subgrade.
5. Add a small subtitle like:

`Computed by FAARFIELD FEM, rendered as shell view`

### Acceptance Check

The viewer should feel like an engineering viewport, not a raw Plotly dump.

## Step 3: Fix The KPI Row And States

### Goal

Make the bottom information bar trustworthy and professional.

The screenshot currently reads like something is missing or stale.

### Files

- [Fem3dMeshPanel.jsx](</C:/temp/aeropave/src/components/Fem3dMeshPanel.jsx:175>)

### What Claude Should Change

1. Distinguish clearly between:
   - loading
   - no result yet
   - stale result
   - valid result
2. Never show blank-looking KPI values.
3. If a value is unavailable, show `Not available` instead of `0.0`.
4. Show:
   - solver mode
   - render mode
   - rendered element count vs total count
   - aircraft name / gear
   - compute time

### Acceptance Check

A reviewer should be able to read the panel footer and understand exactly what was computed and what was merely rendered.

## Step 4: Make The Mesh Panel Feel Connected To FEM CDF

### Goal

The user should not feel like they are running two unrelated tools.

### Current Problem

`Run FEM CDF` computes one workflow, and `Build 3D mesh` computes another.

That is why the experience does not yet feel polished.

### Files

- [DesignTool.jsx](</C:/temp/aeropave/src/tabs/DesignTool.jsx:563>)
- [DesignTool.jsx](</C:/temp/aeropave/src/tabs/DesignTool.jsx:699>)
- [nativeStressClient.js](</C:/temp/aeropave/src/api/nativeStressClient.js:132>)

### Recommended Short-Term Fix

Do this before building a fancy cache:

1. Keep the mesh panel under the same `useFem3d` path.
2. After a successful FEM CDF run, automatically request the mesh for the current visualization aircraft in the background.
3. Populate the panel without making the user press a second mysterious button.

This still may rerun one FEM solve, but the workflow will already feel much more coherent.

### Recommended Medium-Term Fix

After the above works:

1. Add backend caching for `/api/fem3d/mesh` keyed by pavement stack + aircraft + render detail.
2. If the request hash matches a recent solve, return the cached mesh instantly.

Do **not** let cache work block the visual cleanup.

### Acceptance Check

After the user clicks `Run FEM CDF`, the mesh panel should appear populated or begin auto-populating. It should not feel like a separate experiment.

## Step 5: Make Layer Naming More Trustworthy

### Goal

The legend should not feel guessed.

### Current Problem

Layer names are partly inferred in:

- [Fem3dWrapper.vb](</C:/temp/aeropave/faarfield-api/Fem3dWrapper.vb:546>)

This is acceptable for prototype work, but not ideal for a polished engineering product.

### What Claude Should Change

1. Keep the user-defined layer names where available.
2. Make the FAARFIELD-generated lower layers explicitly labeled as generated assumptions if needed.
3. If exact authoritative material identity cannot be guaranteed, do not overclaim precision.

Example:

- `P-401 AC`
- `P-501 PCC`
- `Generated Base Layer`
- `Subgrade`

That is better than implying exact material identity you cannot prove from the snapshot.

## Step 6: Only Then Add Stress Heatmap

### Goal

After the geometry looks clean, add real analysis value.

### Files

- [Fem3dWrapper.vb](</C:/temp/aeropave/faarfield-api/Fem3dWrapper.vb:1>)
- [specs/fem3d-mesh-visualization.md](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/specs/fem3d-mesh-visualization.md:69>)

### What Claude Should Do

1. Reach into solver stress state after `ComputeResponse(...)`.
2. Collapse each element tensor field to one scalar per element.
3. Render stress colors on the clean surface geometry, not on muddy brick faces.

### Important Rule

Do not start Phase 2 heatmap work while Phase 1 geometry is still visually weak.

Otherwise the panel will become more colorful but not more professional.

## Step 7: Leave Deformation For Last

The deformed mesh is valuable, but it is not the first thing blocking professionalism.

Do deformation only after:

1. geometry is clean
2. panel workflow is coherent
3. stress heatmap is readable

## What Claude Should Not Do Yet

Avoid these until the above steps are complete:

1. Do not spend time fine-tuning colors before fixing visible-face extraction.
2. Do not chase deformation before the static view looks correct.
3. Do not expose extra mesh-density controls in the UI.
4. Do not treat `high detail` as “draw every internal face of every brick.”

## Definition Of "Professional" For This Panel

Claude should treat the panel as successful only when it meets this standard:

1. A civil or mechanical engineer can immediately recognize the pavement stack and wheel position.
2. The panel communicates what FAARFIELD computed versus what the frontend is merely visualizing.
3. The default view is clean and presentation-ready.
4. The user does not need a second manual exploratory action to understand the FEM result.

## Suggested Execution Order For Claude

Use this exact order:

1. Backend visible-face extraction
2. Frontend consumes surface triangles instead of whole bricks
3. KPI / empty / loading state cleanup
4. Auto-populate mesh after FEM CDF
5. Layer naming cleanup
6. Stress heatmap
7. Deformation

If Claude only has time for one session, do Steps 1 and 2 only. Those will give the largest professionalism jump.
