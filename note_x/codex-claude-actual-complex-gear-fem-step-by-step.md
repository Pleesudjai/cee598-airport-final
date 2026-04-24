# Codex Note For Claude: Actual Complex-Gear 3D FEM, Step By Step

Date: 2026-04-19

## Goal

The goal is **not** to make complex-gear aircraft look better.

The goal is:

**run 3D FEM with the real complex gear, not the fake synthetic dual-wheel `D` fallback.**

That means:

- do not silently collapse `B77L`, `B748`, `A359`, `C130`, etc. into one generic `D`
- do not claim "actual complex-gear FEM" unless the full wheel group is really preserved
- keep the work split into two paths:
  1. native FAARFIELD family experiment first
  2. manual nodal-load path second if native family does not preserve the full wheel group

## Hard Rules

1. Do **not** leave the current silent synthetic-`D` fallback as the default for complex-gear testing.
2. Do **not** change three things at once.
3. Do **not** use the design-effective FEM scalar for complex gears until the wheel group is proven real.
4. Do **not** tell the UI or report "actual complex-gear FEM" unless the proof is in the logs.

## Why This Note Exists

The current simplification is here:

- [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb:95>) through [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb:138>)

The real FAARFIELD complex-gear family logic exists here:

- 747 family at [clsAC.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/ACClassLib/clsAC.vb:625>)
- 777 family at [clsAC.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/ACClassLib/clsAC.vb:710>)
- A350-1000 special branch at [clsAC.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/ACClassLib/clsAC.vb:673>)
- the current load short-circuit is in [modPG.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/modPG.vb:955>) and [modPG.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/modPG.vb:984>)
- the real wheel-to-node load allocation logic lives in [clsMesh.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FAAMeshClassLib/clsMesh.vb:2067>) through [clsMesh.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FAAMeshClassLib/clsMesh.vb:2288>)

## The Current Aircraft To Use As Test Cases

Use these exact test aircraft first because they already exist in the combined library with geometry:

- `B77L`
  - current library gear = `3D`
  - current FAARFIELD name = `B777-200 LR`
  - current likely native family candidate = `N`
- `B748`
  - current library gear = `2D/2D2`
  - current FAARFIELD name = `B747-8F`
  - current likely native family candidate = `J`
- `A359`
  - current library gear = `2D`
  - current FAARFIELD name = `A350-900`
  - current likely native family candidate = `N` as a 777-style experiment
- `C130`
  - current library gear = `2S`
  - current FAARFIELD name = `C-130-70`
  - this one is **not** a clean native-family candidate from the current evidence, so treat it as a manual-load-path aircraft unless a better native code is proven

## Phase 1: Native FAARFIELD Family Experiment

This is the first thing to do.

It is cheaper and cleaner than jumping straight into manual nodal loads.

### Step 1. Pass the full resolved geometry object into the FEM wrapper

Right now `Fem3dWrapper.ComputePccStress(...)` only receives `acParms`.

That loses useful metadata such as:

- `geo.FaarfieldName`
- `geo.ResolvedIcao`
- `geo.GearType`
- `geo.Source`

Change the function signature in [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb:174>) so it also accepts:

`Optional geo As AircraftLibrary.AircraftGeometry = Nothing`

Then update these call sites:

- [HttpRouter.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/HttpRouter.vb:352>)
- [HttpRouter.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/HttpRouter.vb:443>)
- [FullAnalysisWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/FullAnalysisWrapper.vb:640>)

Do not skip this.

Without `geo`, the wrapper cannot make a smart native-family decision.

### Step 2. Replace `PrepareAircraftForFem3d(...)` with a two-stage preparation flow

In [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb:95>), stop doing this logic:

- `if not S/D -> synthesize fake dual pair -> libGear = "D"`

Replace it with this order:

1. If original gear is already simple `S` or `D`, leave it alone.
2. If gear is complex, try native-family mapping first.
3. If native-family mapping is not available, do **not** silently collapse to fake `D` during the experiment.
4. Return an explicit status such as:
   - `simple_native`
   - `complex_native_attempt`
   - `complex_native_unavailable`
   - `synthetic_dual_fallback`

Use a small result structure if needed.

Do not keep this as a plain string return if the meaning is becoming muddy.

### Step 3. Add a native-family mapping helper

Create a helper in [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb>) such as:

`Private Function TryApplyNativeComplexGearFamily(ByRef acParms As clsLEAF.LEAFACParms, geo As AircraftLibrary.AircraftGeometry, ByRef note As String) As Boolean`

The helper should:

1. inspect `geo.ResolvedIcao`
2. inspect `geo.FaarfieldName`
3. inspect `geo.GearType`
4. preserve the real `TireX`, `TireY`, `TirePress`, and `NTires`
5. only change `libGear` and, if needed, `ACname`

### Step 4. Use these first mapping attempts

Start with these exact mappings:

- `B77L` and other 777-like complex gears:
  - set `libGear = "N"`
  - keep `ACname = geo.FaarfieldName` if available, otherwise current aircraft name
- `B748` and other 747-like complex gears:
  - set `libGear = "J"`
  - keep `ACname = geo.FaarfieldName`
- `A359`:
  - first try `libGear = "N"`
  - keep `ACname = "A350-900"` if that is `geo.FaarfieldName`
  - this is an experiment because only `A350-1000` is explicitly special-cased in the FAARFIELD source
- `C130`:
  - do **not** guess a native family code unless the source proves one
  - leave this aircraft for the manual path if native-family proof is not clear

### Step 5. Add explicit proof logging

Add temporary but structured logs in [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb>) before and after the FEM run.

Log all of these:

1. original `geo.GearType`
2. attempted native family code
3. `acParms.ACname`
4. `acParms.libGear`
5. `acParms.NTires`
6. first 6 wheel coordinates from `TireX/TireY`
7. stress result
8. `IPC.nload` after `Conversion()`
9. warning text or failure mode

This proof matters more than pretty code comments.

### Step 6. Run the 4 target aircraft one by one

Do **not** test all aircraft at once and get confused.

Run this order:

1. `B77L`
2. `B748`
3. `A359`
4. `C130`

For each aircraft, compare:

- current synthetic-`D` result
- native-family attempt result
- wheel count entering the wrapper
- `IPC.nload` after conversion
- whether the stress and hotspot pattern actually change

### Step 7. Define success correctly

The native-family experiment is a success only if **all** of these are true:

1. the real complex wheel group is preserved going into the path
2. `IPC.nload` is clearly not the same collapsed pattern as the synthetic `D`
3. `B77L`, `B748`, and `A359` no longer all return the same stress signature
4. the result is stable and not a near-zero short-circuit

If those things do not happen, the native-family path is **not** enough.

Do not rationalize it.

### Step 8. If native-family works for some aircraft, keep it narrow

If `B77L -> N` works but `A359 -> N` does not, keep only the working case.

Do not generalize a family mapping just because it "seems close."

The acceptable result is:

- 747 family support improved
- 777 family support improved
- A350 and C130 still need manual path

That is still progress.

## Phase 2: Manual Exact Wheel-Load Path

If Phase 1 does not preserve the real wheel group, this is the real path.

This is the path for "actual complex gear" in the strict sense.

### Step 9. Create a separate backend path instead of hacking the simple path

Do **not** bury the manual exact logic inside the simple-gear code.

Create a separate method in [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb>) such as:

`Private Sub TryBuildExactComplexGearStressField(...)`

or

`Private Function ComputePccStressComplexExact(...) As Fem3dResult`

Keep it separate.

### Step 10. First make the mesh, then manually apply the loads

The manual path should do this in order:

1. build the pavement and mesh state
2. preserve the real wheel coordinates from `AircraftLibrary.BuildLeafParms(...)`
3. do **not** let the path normalize to fake `D`
4. populate `modAutoMesh.NodalLoad(...)` manually using the real wheel set
5. call `modAutoMesh.Conversion()`
6. run `FAASR3D(...)`
7. extract stress from `clsPrintOut.st(,,, )`

Do not change the order.

### Step 11. Replicate the wheel-to-node load allocation from `clsMesh.vb`

The main reference is:

- [clsMesh.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FAAMeshClassLib/clsMesh.vb:2067>) through [clsMesh.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FAAMeshClassLib/clsMesh.vb:2288>)

Copy the algorithm carefully.

The algorithm is not just "assign the nearest node."

It uses:

- tire footprint extents
- node tributary area
- slab clipping
- joint-edge clipping
- accumulation into `NodalLoad(iAC).Load(j)`

### Step 12. Start with the easiest exact case only

Do **not** start with every scenario.

Only support this first:

- interior loading
- gear angle = `0` or `90`
- no joint crossing special cases beyond what the copied routine already handles
- one aircraft at a time
- one offset = `0`

That is enough to prove the concept.

### Step 13. Write the loads into `modPG.NodalLoad`

The destination path is:

- `AMClassLib.modPG.NodalLoad`
- then [modPG.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/modPG.vb:4390>) `Conversion()`

What you need to populate:

- `NodalLoad(iAC).Node()`
- `NodalLoad(iAC).Load()`
- `NodalLoad(iAC).NNodalLoad`

Then call:

- [modPG.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/modPG.vb:4390>) `Conversion()`

Then run:

- `FEMClassLib.clsFEM.FAASR3D(...)`

### Step 14. Prove total load conservation

After manual nodal-load build, compute:

- total nodal load applied
- expected total wheel load from the wheel set

These two should be close.

If load conservation fails, stop and fix that before looking at stress contours.

### Step 15. Reuse the existing stress extraction path

Do **not** invent a second stress-export system.

Reuse the existing second-pass extraction path already in [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb:1105>) through [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb:1177>).

The thing to change is the **load application**, not the tensor extraction.

## Phase 3: Validation

### Step 16. Validate with aircraft that should now differ

If the exact complex-gear path is working, these aircraft should no longer collapse toward one generic pattern:

- `B77L`
- `B748`
- `A359`
- `C130`

The proof should include:

1. different applied nodal-load maps
2. different hotspot geometry
3. different stress magnitudes
4. wheel-group placement matching the real library coordinates

### Step 17. Add a result mode label

Return an explicit mode in the FEM result:

- `simple_native`
- `complex_native_family`
- `complex_exact_manual`
- `synthetic_dual_approx`
- `blocked`

Do not make the UI guess from warning strings.

### Step 18. Gate design usage by mode

Until the exact or proven native-family path is validated, do this:

- `simple_native` can influence design-effective FEM stress
- `complex_native_family` should be treated cautiously until proven
- `complex_exact_manual` can be considered for design after validation
- `synthetic_dual_approx` must not influence design

## What Not To Waste Time On First

Do not do these first:

1. fancy frontend heatmap polish
2. deformed mesh
3. multiple stress invariants
4. wide family generalization
5. C130 special-case guessing with no proof

First prove the wheel group is real.

## The Exact Order Claude Should Follow

1. Pass `geo` into `Fem3dWrapper.ComputePccStress(...)`.
2. Replace the automatic synthetic-`D` collapse with a two-stage prep flow.
3. Add `TryApplyNativeComplexGearFamily(...)`.
4. Test `B77L -> N`.
5. Test `B748 -> J`.
6. Test `A359 -> N`.
7. Do not guess `C130` yet.
8. If any native-family case truly preserves the wheel group, keep it.
9. If not, build the manual `NodalLoad` path.
10. Copy the wheel-to-node load allocation from `clsMesh.vb`.
11. Re-call `Conversion()`.
12. Re-run `FAASR3D(...)`.
13. Reuse existing `st(,,,)` extraction.
14. Validate load conservation.
15. Validate that the aircraft no longer collapse to the same response.

## Final Instruction

If you cannot prove the full complex wheel group survived the FEM setup, you must say:

`This is still approximate.`

Do not call it actual complex-gear FEM until the proof is in the logs and in the response field metadata.
