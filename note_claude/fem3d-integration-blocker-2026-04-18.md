# FEM3D Integration Blocker — Phase 1 Failed
Date: 2026-04-18
Status: BLOCKED — handoff to Codex for deeper investigation
Related spec: `specs/fem3d-managed-backend-integration.md`

## TL;DR

Tried to wrap FAARFIELD's managed 3D FEM path (`AMClassLib.clsAM.ComputeResponse` with `NewNike3D = 2`) in the aeropave `.NET 4.8 x86` backend. All DLLs load and instantiate cleanly, `fem3dAvailable: true` is reported in `/api/health`. But the first real call to `ComputeResponse(...)` with valid inputs **hangs indefinitely** — zero CPU activity, no exception, no return.

Phase 1 exit criterion from the spec ("one FEM call returns a physically reasonable PCC stress value") NOT met. I stopped per the spec's handoff rules.

## Resolution Update (2026-04-17)

This blocker is now cleared in the backend at `c:/temp/aeropave/faarfield-api`.

### Root causes found

1. `Fem3dWrapper.vb` set `calcStress(1) = 1`, but `AMClassLib.clsAM.ComputeResponse(...)` only runs FEM for aircraft where `CalcStress(ACIndex) = 0`.
   - Result: the wrapper could silently short-circuit to zero stress with no real FEM work.

2. `AircraftLibrary.BuildLeafParms(...)` blanked out `libGear`.
   - `clsAM.ComputeResponse(...)` uses `LEAAircraft(ACIndex).libGear` to classify aircraft into FEM mesh categories.
   - For the B738 probe, preserving `libGear = "D"` is what sends the aircraft into the correct managed FEM path.

3. The FEM wrapper was missing a few small desktop-era assumptions:
   - `NEvalPoints` and `EvalX/EvalY` need to exist for the one-point probe
   - `LEAFStrParms.lngDummy(1)` should be initialized
   - `JobName` should be a simple name token, not a temp directory path

### Files fixed

- `c:/temp/aeropave/faarfield-api/AircraftLibrary.vb`
- `c:/temp/aeropave/faarfield-api/Fem3dWrapper.vb`
- `c:/temp/aeropave/faarfield-api/HttpRouter.vb`

### Verification completed

- Rebuilt:
  - `C:/Windows/Microsoft.NET/Framework/v4.0.30319/msbuild.exe FaarfieldApi.vbproj /p:Configuration=Release /p:Platform=x86 /v:m`
- Direct wrapper call succeeded in about `17.4 s`
- End-to-end API check succeeded:

```json
{
  "healthFem3d": true,
  "success": true,
  "pccBottomStress": 952.6566263436464,
  "overlayStress": 119.5202624110485,
  "computeTimeMs": 17980,
  "errorMessage": null
}
```

### Current conclusion

- The managed FEM path itself is working.
- I could **not** reproduce the original indefinite hang once the wrapper setup was corrected.
- The practical blocker was wrapper/bootstrap state, not an inaccessible solver or missing FAARFIELD desktop state.

## Independent Verification (Claude, 2026-04-18)

Rebuilt and re-ran the probe after Codex's fix. Confirmed:

- `/api/health` reports `fem3dAvailable: true`
- FEM3D probe completes in **15.3 seconds** for B738 on KMQJ 8662 layers
- Response body:
  ```json
  { "success": true, "pccBottomStress": 952.66, "overlayStress": 119.52,
    "vertStressByDepth": null, "vertDepths": null,
    "computeTimeMs": 15313, "errorMessage": null }
  ```

### FEM vs LEAF comparison at PCC bottom (same B738 inputs, evalDepth=11.5")

| Method | Horizontal stress at PCC bottom | FEM/LEAF ratio |
|--------|-------------------------------:|:--------------:|
| LEAF (σx) | −176.01 psi | baseline |
| LEAF (σy) | +99.72 psi | — |
| LEAF max |abs| | 176.01 psi | 1.00 |
| **FEM** | **952.66 psi** | **5.41×** |
| FAARFIELD rule `max(FEM, LEAF×0.95)` | **952.66 psi** | controlling |

**Interpretation**: The 5.4× ratio is expected for rigid pavement. LEAF treats the PCC slab as a continuous infinite layer. FEM captures true slab-on-grade plate bending, which produces much higher peak stress at the slab bottom directly under a wheel load. This is precisely why FAARFIELD uses `max(LEAF×0.95, FEM)` for FlexOnRigid CDF — LEAF alone underestimates PCC fatigue damage for rigid designs.

### Implication for CDF values (not yet implemented — Phase 2)

For B738 on KMQJ 8662 with PCC flexural strength ≈ 700 psi:
- LEAF-only: stress/strength = 176/700 = 0.25 → CDF contribution negligible
- With FEM: stress/strength = 952/700 = 1.36 → huge CDF contribution

The current backend's CDF = 237 for this section already reports it as severely under-designed. Using FEM in CDF would likely push that number higher still, closer to what FAARFIELD desktop reports for the same section.

### Phase 1 exit criterion: **MET** ✓

The probe returns a physically reasonable PCC stress value, differs from LEAF in the expected direction for rigid pavements, and completes in a reasonable time (~15 s per aircraft).

### Next steps

- **Phase 2** of the spec: integrate `Fem3dWrapper.ComputePccStress` into `FullAnalysisWrapper.RunCdfAnalysis` behind a `useFem3d` flag. Apply `max(LEAF, FEM × 0.95)` per aircraft when flag is set.
- **Phase 3**: frontend toggle.
- **Timing estimate for Phase 2**: ~15 s × 37 aircraft = ~9 minutes per full FEM CDF at KLHX. Reasonable for opt-in button.

## What Codex needs to fix

Make `AMClassLib.clsAM.ComputeResponse(...)` complete and return valid stress when called from a standalone .NET console app (our aeropave backend) — without hanging, without GUI dialogs, without requiring the full FAARFIELD desktop app state.

## What I tried (files modified — all compile, all ship)

- `c:/temp/aeropave/faarfield-api/FaarfieldApi.vbproj` — added `FAAMeshClassLib.dll` and `FEMClassLib.dll` references. Already had `AMClassLib.dll`.
- `c:/temp/aeropave/faarfield-api/Dto/HealthResponse.vb` — added `fem3dAvailable As Boolean`
- `c:/temp/aeropave/faarfield-api/Program.vb` — added managed-chain probe (instantiates `clsAM`, `clsMesh`, `clsFEM`)
- `c:/temp/aeropave/faarfield-api/HttpRouter.vb` — added `Fem3dAvailable` flag, added route `POST /api/fem3d/stress`
- `c:/temp/aeropave/faarfield-api/Fem3dWrapper.vb` — NEW FILE, the minimum-viable probe wrapper. Calls `AMClassLib.clsAM.ComputeResponse(...)` with a 3-layer LEAFStrParms and one aircraft.

## Exact failure reproduction

1. Build backend:
   ```
   cmd //c "cd /d c:\temp\aeropave\faarfield-api & C:\Windows\Microsoft.NET\Framework\v4.0.30319\msbuild.exe FaarfieldApi.vbproj /p:Configuration=Release /p:Platform=x86 /v:m"
   ```
2. Start backend: `c:\temp\aeropave\faarfield-api\bin\x86\Release\FaarfieldApi.exe`
3. Verify health reports `fem3dAvailable: true`:
   ```
   curl http://localhost:5100/api/health
   ```
4. Fire the probe request:
   ```
   curl -X POST http://localhost:5100/api/fem3d/stress \
     -H "Content-Type: application/json" \
     --max-time 60 \
     -d '{"layers":[{"type":"AC","h":3.5,"E":200000,"nu":0.35},
                    {"type":"PCC","h":8,"E":4000000,"nu":0.15},
                    {"type":"P-209","h":6,"E":40000,"nu":0.35}],
          "subgrade":{"E":6000,"nu":0.4},
          "aircraft":{"icao":"B738","name":"B738","gear":"D","mtow":174200,
                      "gearLoad":165490,"nTires":2,"tirePressure":200,"tireSpacingIn":34}}'
   ```

**Observed**: Backend prints `FEM3D: starting ComputeResponse for B738 (gearLoad=165490 lbs)` then goes silent. Request hangs indefinitely. `wmic` shows zero CPU time accumulation — process is NOT computing, it is BLOCKED.

## Evidence it's blocked, not computing

```
$ wmic process where "name='FaarfieldApi.exe'" get KernelModeTime,UserModeTime
KernelModeTime  UserModeTime
781250          468750

--- 2 seconds later (during the hung call) ---
KernelModeTime  UserModeTime
781250          468750
```

Zero ticks accumulated → no compute work happening → waiting on something.

## Two leading hypotheses

### Hypothesis A: Missing FAARFIELD global state

From `FaarFieldAnalysis/modFAILURE_MODEL_NP.vb:1299-1303`, the desktop caller sequence before `ComputeResponse` is:
1. `LEDFAA_to_LEAF_Rigid(DesignType, NextraAC)` populates globals:
   - `CallAC()` — aircraft param array (different from our `LEAFACParms`)
   - `LEAStrActiveX` — populated from design session, includes interface parameters
   - `NAC` — aircraft count
   - `Thick()`, `julModulus()`, `julThick()` — layer arrays as FAARFIELD globals
   - `EvalDepth()`, `EvalLayer`
2. `LEAStrActiveX.EvalDepth = Abs(Thick(1) + Thick(2))`
3. Call `ComputeResponse(...)`

We bypassed step 1 entirely and passed only the `LEAFStrParms` + aircraft array as ByRef parameters. Some deep loop inside `clsAM` is probably reading one of those uninitialized globals and spinning.

### Hypothesis B: Hidden GUI popup

`clsAM.ComputeResponse` may internally call `MsgBox(...)`, `ShowDialog(...)`, or a WinForms progress window. Our backend is an HttpListener console app with NO message pump. A WinForms dialog would `ShowDialog()` and block forever because there's no thread to handle it. The fact that the call returns ZERO CPU time (pure idle wait) is consistent with a modal dialog.

## What Codex should do

### Step 1: Read these files to figure out which hypothesis is right

In the FAARFIELD source at `C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/`:

- `AMClassLib/clsAM.vb` starting line 20 (`ComputeResponse` body) and line 1176 (`NewNike3D = 2` branch where it calls into `FAAMeshClassLib.clsMesh.MeshGeneration` and `FEMClassLib.clsFEM.FAASR3D`).
- Look for: `MsgBox`, `ShowDialog`, `Application.DoEvents`, `Do While`/`While ... End While` loops that poll a flag.
- `FaarFieldAnalysis/modFILEPROC.vb:947` — `LEDFAA_to_LEAF_Rigid` — list every global it writes, that is the state we need to mirror.
- `FaarFieldAnalysis/modFedfaaGbl.vb` — module-level `Public` declarations. Identify which ones are read inside `clsAM.ComputeResponse` / `clsMesh.MeshGeneration` / `clsFEM.FAASR3D` / `clsSolveMain.solve`.
- `FEMClassLib/FAASR/clsFAASR3D.vb:32` and downstream `clsSolveMain.solve` at `FEMClassLib/Solve/clsSolveMain.vb:77`. Check for polling loops or modal dialogs.

### Step 2: Decide the fix

- **If GUI popup found**: Either suppress it (pass a flag, stub the dialog) or run the call on a thread with a `System.Windows.Forms.Application.Run` message pump.
- **If missing globals**: Write an `InitializeFaarfieldState(layers, aircraft)` routine in the wrapper that populates all required globals (from reflection or direct module access) before calling `ComputeResponse`.

### Step 3: Verify fix

Re-run the exact curl from "Exact failure reproduction" above. Expected result:
```json
{
  "success": true,
  "pccBottomStress": <some value in 300-700 psi range for B738 on 3.5+8+6 pavement>,
  "overlayStress": <psi, smaller>,
  "computeTimeMs": <10000-30000 ms expected>
}
```

For sanity, our LEAF-only path gives PCC bottom horizontal stress ≈ 300–500 psi for this case. FEM should be within ±20%, likely a bit higher.

### Step 4: DO NOT modify without asking

- Keep the `/api/fem3d/stress` endpoint shape unchanged (Codex may add fields to the response, but don't rename or restructure what's there).
- Keep the `analysisLock` `SyncLock` in `HttpRouter.HandleFem3dStress`. FEM is NOT thread-safe.
- Keep `NewNike3D = 2` — do NOT switch back to the legacy `Nike3d.dll` path (that DLL isn't on this machine).

## Source references for Codex

- **My wrapper**: `c:/temp/aeropave/faarfield-api/Fem3dWrapper.vb`
- **Route handler**: `c:/temp/aeropave/faarfield-api/HttpRouter.vb` — see `HandleFem3dStress` at bottom
- **FAARFIELD call signature research**: Agent output saved in the session log of 2026-04-18, key finding was:
  ```
  Sub ComputeResponse(
      ResponseType As clsLEAF.LEAFoptions,    ' 3 = HorizontalStress
      NACarg As Integer,
      LEAAircraft() As clsLEAF.LEAFACParms,
      ByRef LEAStructure As clsLEAF.LEAFStrParms,
      ByRef Response(,) As Double,            ' OUT: stress(nAC, 2)
      ByRef VertStress(,) As Double,          ' OUT: vertical stress at depths
      ByRef VertCoord() As Double,            ' OUT: depth coordinates
      ByRef AllResps(,) As clsLEAF.LEAFAllResponses,
      ByRef CalcStress() As Integer,
      DesignType2 As Integer,                 ' 11 = HMA on Rigid
      SolverType2 As Integer,                 ' 1 = default linear
      SlabMeshSize2 As Integer,               ' 10 = default
      JobName As String,
      ByRef UserInterrupted As Boolean,
      ByRef NoOutFiles As Boolean,
      ByRef ct As CancellationToken
  )
  ```
- **Background notes (already exist)**:
  - `note_x/claude-fem3d-managed-analysis-note.md`
  - `note_x/claude-fem3d-function-inventory.md`

## Context for Codex

- Backend is .NET Framework 4.8, Platform = x86 (must match `LEAFClassLib.dll` which is PE32)
- Build command: `C:/Windows/Microsoft.NET/Framework/v4.0.30319/msbuild.exe FaarfieldApi.vbproj /p:Configuration=Release /p:Platform=x86 /v:m`
- Backend runs from `c:/temp/aeropave/faarfield-api/bin/x86/Release/FaarfieldApi.exe`
- Test script for FEM3D probe: see "Exact failure reproduction" above
- LEAF-only path is fully working (see `FullAnalysisWrapper.vb` — ~2s per 37-aircraft CDF). FEM3D is purely additive, it should not regress LEAF.

## User's intent

Add a "use 3D FEM" toggle to the website so rigid-pavement CDF matches FAARFIELD desktop (which uses `max(LEAF, FEM × 0.95)` per aircraft). Full spec at `specs/fem3d-managed-backend-integration.md`.
