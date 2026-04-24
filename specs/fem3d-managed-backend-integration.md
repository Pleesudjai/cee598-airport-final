# Feature Spec: FEM3D Managed Backend Integration
Date: 2026-04-18
Layer: native-backend + website-frontend

## What We're Building

Wire the FAARFIELD **managed 3D FEM solver** (`AMClassLib + FAAMeshClassLib + FEMClassLib`) into the aeropave backend, so rigid-pavement stress and CDF use real 3D FEM — not just LEAF layered-elastic. Exposed to the frontend as an opt-in toggle: **LEAF only** (fast, current) vs **LEAF+FEM** (matches desktop FAARFIELD FlexOnRigid exactly: stress = max(LEAF, FEM × 0.95)).

This closes **Gap 3** from the earlier handoff, which was incorrectly labeled as blocked by missing `Nike3d.dll`. The managed VB.NET path is fully present in source and all DLLs exist on the system.

## Inputs / Outputs

- **Input**: same `FullAnalysisRequest` (layers + subgrade + aircraft + traffic + growth/life/flexStr/sci) — nothing new on the wire.
- **Output**: extra fields on `FullAnalysisResponse`:
  - `femStressPcc` — FEM-computed PCC bottom stress at controlling offset (psi, one value)
  - `femStressByDepth[]` — optional: vertical stress at up to 25 foundation depths
  - `femComputeTimeMs` — separate timing
  - `solver` string updates from `FAARFIELD_desktop_parity` → `FAARFIELD_desktop_parity+FEM` when FEM ran
- **New endpoint**: `POST /api/fem3d/stress` — rigid-slab FEM stress for visualization (single eval point per request, NOT a grid — that's a FEM limitation, not ours).
- **Health**: `/api/health` reports `fem3dAvailable: true/false` separately from the existing `femAvailable`.

## Files to Create or Edit

### New backend files
- `c:/temp/aeropave/faarfield-api/Fem3dWrapper.vb` — mirrors `LeafSolverWrapper.vb` pattern: calls `AMClassLib.clsAM.ComputeResponse` with `NewNike3D = 2` forced, handles state setup + stress extraction
- `c:/temp/aeropave/faarfield-api/Dto/Fem3dRequest.vb` — single-point request DTO
- `c:/temp/aeropave/faarfield-api/Dto/Fem3dResponse.vb` — stress1, stress8, stress33[], depths[], computeTimeMs

### Modified backend files
- `c:/temp/aeropave/faarfield-api/FaarfieldApi.vbproj` — add DLL refs: `FAAMeshClassLib.dll`, `FEMClassLib.dll` (`AMClassLib.dll` already referenced)
- `c:/temp/aeropave/faarfield-api/Program.vb` — probe FEM3D availability at startup; set `Fem3dAvailable` flag
- `c:/temp/aeropave/faarfield-api/HttpRouter.vb` — route `/api/fem3d/stress` under the existing `analysisLock` (FEM is not thread-safe)
- `c:/temp/aeropave/faarfield-api/FullAnalysisWrapper.vb` — after LEAF PCC stress is computed, optionally call `Fem3dWrapper.ComputePccStress` and take the max. Controlled by `req.useFem3d` flag (default false).
- `c:/temp/aeropave/faarfield-api/Dto/FullAnalysisRequest.vb` — add `useFem3d As Boolean`
- `c:/temp/aeropave/faarfield-api/Dto/FullAnalysisResponse.vb` — add `femStressPcc`, `femComputeTimeMs`, update solver label
- `c:/temp/aeropave/faarfield-api/Dto/HealthResponse.vb` — add `fem3dAvailable As Boolean`

### Modified frontend files
- `c:/temp/aeropave/src/api/nativeStressClient.js` — add `fetchFem3dStress()`; pass `useFem3d` through `fetchFullCdf()` / `fetchDesign()`
- `c:/temp/aeropave/src/tabs/DesignTool.jsx` — add toggle **"Use 3D FEM (slow ~30s, matches desktop)"** next to the Analysis card. Default OFF. Badge shows "LEAF only" vs "LEAF+FEM" in the card title.
- `c:/temp/aeropave/src/components/SolverModeBadge.jsx` — add a 4th mode: `Full FAARFIELD+FEM3D`

## Implementation Steps

### Phase 1 — Probe & Validate (one session)

1. [ ] Add `FAAMeshClassLib.dll` and `FEMClassLib.dll` as references in `FaarfieldApi.vbproj`. Build. Confirm it links.
2. [ ] In `Program.vb`, add `Try { Dim am As New AMClassLib.clsAM(); Fem3dAvailable = True } Catch { Fem3dAvailable = False }`. Start backend, check `/api/health` reports `fem3dAvailable: true`.
3. [ ] Write minimal `Fem3dWrapper.ComputePccStress()` that:
   - Takes layers + subgrade + one aircraft (same shape as existing code)
   - Sets `NewNike3D = 2` global in `AMClassLib.modWorld`
   - Sets `gDesignType = 11` (HMA on PCC) in `modFedfaaGbl`
   - Calls `AMClassLib.clsAM.ComputeResponse()` with one aircraft at offset 0
   - Reads back `stress33(0, :)` for vertical stress under load
   - Returns psi value
4. [ ] Test it from curl with the KMQJ 8662 section (3.5" AC + 8" PCC + 6" base) + B738. Expect PCC bottom stress somewhere in the range 400–800 psi (Westergaard predicts ~600 psi for that load on that pavement).
5. [ ] Compare against LEAF's PCC stress for the same inputs. FEM should be within ±20% of LEAF for interior load. If it's way off (> 2× or negative), something is wrong with state setup — escalate before continuing.

**Exit criterion for Phase 1**: one FEM call returns a physically reasonable PCC stress value.

### Phase 2 — Integrate into CDF (one session)

6. [ ] Add `useFem3d` Boolean to `FullAnalysisRequest`. Default false.
7. [ ] In `FullAnalysisWrapper.RunCdfAnalysis()`, when `useFem3d = True`:
   - After computing `sigPcc` from LEAF, also call `Fem3dWrapper.ComputePccStress(leafStr, leafAC(1))` and get `sigPccFem`.
   - PCC fatigue life uses `sigPccEff = max(|sigPcc|, |sigPccFem| * 0.95)` — matches desktop FAARFIELD FlexOnRigid rule.
   - Record both values in `warnings` (e.g., "FEM/LEAF ratio = 1.12 for B738").
8. [ ] Add `femStressPcc` and `femComputeTimeMs` to `FullAnalysisResponse`; populate when FEM ran.
9. [ ] Timing: expect ~1–5s per aircraft for FEM. For 37 significant aircraft at KLHX, that's ~60–180s total. Acceptable for an opt-in toggle; NOT acceptable for auto-run on every slider change.

**Exit criterion for Phase 2**: `/api/analysis/cdf` with `useFem3d: true` returns a CDF that differs from LEAF-only by < 5% for an interior-load-dominated section, AND > 5% for an edge-load-dominated section. Warnings list FEM/LEAF ratio for each aircraft.

### Phase 3 — Frontend toggle (half session)

10. [ ] Add `fetchFem3dStress()` to `nativeStressClient.js`.
11. [ ] Add `useFem3d` state in `DesignTool.jsx`, wired to a checkbox next to the CDF card. Default unchecked.
12. [ ] Pass `useFem3d` through `fetchFullCdf()` and `fetchDesign()`.
13. [ ] When checked, disable the auto-rerun debouncer (too slow). Add a **"Run 3D FEM Analysis"** button instead.
14. [ ] Update `SolverModeBadge` to show "LEAF+FEM3D" when the last result used FEM.
15. [ ] Add a small results row: "FEM PCC stress: 847 psi | LEAF PCC stress: 792 psi | Effective: 847 psi" so user can see the comparison.

### Phase 4 — Optional, if time permits

- [ ] Expose `stress33[]` by depth through `/api/fem3d/stress` and plot it alongside the LEAF depth profile, so the user can see where FEM and LEAF diverge by depth.
- [ ] Validation case: one section from the FAARFIELD user manual where FEM and LEAF are known to differ, compare.

## Demo Test

The feature is successful at demo time when:

1. Open the Design Tool for KMQJ section 8662.
2. Observe CDF from LEAF only (default): **CDF ≈ 237** (current value, PCC Fatigue controlling).
3. Check the "Use 3D FEM" box → click "Run 3D FEM Analysis" → wait ~30s.
4. CDF updates to a new value. PCC stress from FEM appears alongside LEAF stress. FEM/LEAF ratio shown in warnings.
5. The result is closer to what FAARFIELD desktop would report for the same section (we don't have desktop here to compare directly, but the stress values should be in the expected physical range).
6. Presentation line: "Backend now uses the same managed 3D FEM code as FAARFIELD desktop — not just layered-elastic LEAF approximation."

## Out of Scope

- **Full CDF speedup** — 30s per aircraft is just the cost. No attempt to cache or parallelize FEM runs in this spec.
- **Grid FEM stress contour** — FEM output is one eval point per call. Computing a 21×21 grid = 441 × 30s = 3.7 hours. Not doing it. The stress contour panel stays LEAF-only.
- **Thickness design with FEM** — `RunDesign()` Newton-Raphson iterates 5–25 times; with FEM each iteration is ~60s × 37 aircraft = too slow. Stays LEAF-only for design mode.
- **Fixing TODO stubs in `clsSolveMain`** — they don't fire for static rigid-slab analysis. If they ever do, we'll see an exception and document it; no proactive fix.
- **Flexible (NewFlex) FEM** — the desktop also uses FEM for flexible pavements, but only for compaction (subgrade rutting). Defer.
- **NIKE3D external DLL** — that path stays dead. We only use the managed path.

## Risks & Unknowns

| Risk | Impact | Mitigation |
|------|--------|-----------|
| `clsAM.ComputeResponse` needs more global state than I can enumerate from static code reading | Phase 1 fails at step 4 (stress value nonsense or exception) | Phase 1 is designed to catch this early. If it fails, report back with the stack trace and we can do a deeper source-code study before writing more code. |
| FEM is slower than 30s per aircraft | Demo is annoying | Make it opt-in with a button, document the expected time |
| `clsSolveMain` TODO stubs fire unexpectedly | Exception in FEM call | Wrap in Try/Catch per aircraft. If one aircraft FEM fails, use LEAF for that aircraft only and warn. |
| Thread safety | Concurrent requests corrupt state (we saw this with LEAF already) | Keep under `analysisLock`. Already done for existing endpoints. |
| Mesh size for large aircraft (A380, B748) | FEM runs hours | Cap mesh size via `SlabMeshSize` global, or limit FEM to interior stress only (no edge-mesh refinement) |

## Handoff

Open a fresh session, run `/prime-analysis`, then `/execute` using this spec plus the research notes at:
- `note_x/claude-fem3d-function-inventory.md`
- `note_x/claude-fem3d-managed-analysis-note.md`

Start with **Phase 1 only**. Do NOT attempt Phases 2–3 in the same session until Phase 1's exit criterion is confirmed.
