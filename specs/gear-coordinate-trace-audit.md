---
spec: gear-coordinate-trace-audit
status: planned
owner: Chidchanok Pleesudjai
date: 2026-04-25
related: embed-faarfield-source-projectref.md
---

# Gear-Coordinate Trace Audit (Top 10 Aircraft × 13 Sections)

## Goal

Produce **defensible evidence** that the wheel coordinates supplied by `combined_aircraft_library.json` flow through every analysis engine **unchanged**. For each of the top 10 aircraft in each of the 13 project sections (130 aircraft × section combinations), capture the gear geometry as it appears at every pipeline stage and write a side-by-side comparison to Excel.

## What this proves

The audit answers one specific question for any reviewer:

> "The CDF and stress numbers in this report depend on wheel coordinates supplied by my enriched aircraft library. Did those wheel coordinates actually reach the LEAF and FEM solvers untouched, or did some intermediate FAARFIELD code silently override them?"

A pass result establishes that the only place wheel geometry is decided is the user's `combined_aircraft_library.json` — no FAARFIELD library lookup ever overrides it at runtime.

## Pipeline stages to capture

For each (section, aircraft) pair:

| # | Stage | What we capture | Source of truth |
|---|---|---|---|
| 1 | **Traffic input (Excel)** | ICAO, gear type label, MTOW, annual departures, growth | `AO_CEE598_FAARFIELD.xlsx` Traffic sheet |
| 2 | **Combined library record** | provenance (`source` field), `has_tire_geometry`, raw `wheel_coords[]` from JSON, `n_wheels_per_gear`, `n_gear`, `tire_pressure_psi`, `tire_width_in`, library `gear`, `faarfield_name` | `combined_aircraft_library.json` |
| 3 | **AircraftLibrary.ResolveGeometry output** | `WheelX[]`, `WheelY[]`, `NWheels`, `Source` (xml / icao_proxy / family_proxy / nearest_proxy / gear_template / dual_fallback / proxy_override), `GearType`, `LibraryGearType`, `TirePressure`, `GearLoad`, `ResolvedIcao` | `AircraftLibrary.vb` |
| 4 | **LEAF call (LEAFACParms)** | `parms.TireX[1..N]`, `parms.TireY[1..N]`, `parms.NTires`, `parms.TirePress[1..N]`, `parms.GearLoad`, `parms.libGear`, `parms.LibGearOrientation` — exactly what was passed to `clsLEAF.GetResponses` | `LeafSolverWrapper.vb` & `FullAnalysisWrapper.vb` |
| 5 | **CDF call** | Same `LEAFACParms` consumed by `FullAnalysisWrapper` (parity-port CDF reuses the LEAF parms — no separate aircraft input). Also capture: per-offset CDF profile, controlling layer | `FullAnalysisWrapper.vb` |
| 6 | **3D FEM call (pre-transform)** | `acParms.TireX/TireY/NTires/libGear` as they enter `Fem3dWrapper.PrepareAircraftForFem3d` | `Fem3dWrapper.vb` (input snapshot) |
| 7 | **3D FEM call (post-transform)** | Same fields after `TryApplyNativeComplexGearFamily` / synthetic-dual fallback / no-op. Also capture: `prepStatus.mode` ("native_complex_family", "synthetic_dual_approx", "preserved_real_gear", "leaf_only_no_fem"), `prepStatus.originalGear`, `prepStatus.finalGear`, the FEM mesh dimensions and bounding box | `Fem3dWrapper.vb` (post-transform snapshot) |

## Verification logic (per aircraft)

Compare wheel coordinates across stages 2 → 3 → 4 → 5 → 6 → 7. Flag each row:

| Flag | Meaning |
|---|---|
| ✅ **EXACT** | Library `wheel_coords` ≡ ResolveGeometry ≡ LEAF.TireX/Y ≡ CDF.TireX/Y ≡ FEM.TireX/Y(post). Exact pass-through. |
| 🟡 **NATIVE_RELABEL** | Coords identical at every stage; `libGear` was relabeled in stage 7 (e.g. 3D→N, 2D/2D2→J) to bypass FAARFIELD's modPG.vb gear-symmetry guard. **Documented in [Fem3dWrapper.vb:226-228](website/faarfield-api/Fem3dWrapper.vb#L226-L228) — preserves wheel positions, only changes the symmetry hint.** Acceptable. |
| 🟠 **SYNTHETIC_DUAL** | Stage 7 replaced TireX/Y with synthetic 2-wheel dual approximation because the gear is unsupported by the managed FEM path. **CDF still uses real coords (stages 4/5); only the FEM stress visualization is approximated.** Per [Fem3dWrapper.vb:338](website/faarfield-api/Fem3dWrapper.vb#L338): "this path must NOT be trusted for design checks." Acceptable as long as CDF coords match. |
| 🔴 **DIVERGENCE** | LEAF or CDF coords differ from library coords. **This would be a bug.** Should never happen given current code paths; audit catches regressions. |
| ⚪ **NO_GEOMETRY** | Stage 3's `Source` is `dual_fallback` — library has no usable geometry, fell back to ±17″ dual template. CDF runs with the template; FEM is blocked per `IsFem3dGeometrySufficient`. Aircraft contributes correctly via gear-template path. |

A clean audit shows the 130 rows distributed across ✅ / 🟡 / 🟠 / ⚪ only — zero 🔴 rows.

## Deliverable

Excel workbook `results/gear_coordinate_trace_audit.xlsx` with 5 sheets:

### Sheet 1 — `Summary` (130 rows × ~25 cols)
One row per (section, aircraft). Flat columns covering all stages at the aggregate level: section ID, ICAO, traffic gear label, library provenance, `Source`, `nWheels`, gear type at every stage, tire pressure, gear load, FEM mode, verification flag, CDF contribution rank, per-aircraft CDF.

### Sheet 2 — `WheelByWheel` (exploded; ~1300+ rows)
One row per wheel of each aircraft. Columns: section, ICAO, wheel index, `X_library`, `Y_library`, `X_LEAF`, `Y_LEAF`, `X_FEM_pre`, `Y_FEM_pre`, `X_FEM_post`, `Y_FEM_post`, `agree_LEAF` (bool), `agree_FEM_post` (bool), `delta_X_FEM`, `delta_Y_FEM`. Lets a reviewer eyeball any single-wheel discrepancy.

### Sheet 3 — `Discrepancies` (filter)
Auto-filter of Sheet 2 where `agree_LEAF == False` OR (`agree_FEM_post == False` AND `mode != "synthetic_dual_approx"`). Should be empty for a pass.

### Sheet 4 — `Provenance` (~10 rows)
Distribution of `Source` field across the 130 aircraft entries. Shows how many use `xml` (most authoritative), `icao_proxy`, `family_proxy`, `nearest_proxy`, `gear_template`, `dual_fallback`, `proxy_override`. Supports the "FAARFIELD-supplied geometry whenever available" claim.

### Sheet 5 — `MethodologyEvidence`
Static text block (one row per paragraph) summarizing: what was audited, what passed, what flags appeared, the count distribution, citation back to source files. Designed to be copy-pasted into the report's methodology section.

## Implementation

### Backend change — new diagnostic endpoint

Add `POST /api/diag/gear-trace` to `HttpRouter.vb` and a new file `GearTraceWrapper.vb`. The endpoint:

- Accepts: same payload shape as `/api/analysis/cdf` plus an `includeFem3d: bool` flag.
- Internally calls the same code paths as a normal CDF run (so the trace reflects production behavior), but populates a new response object capturing all 7 stages.
- Returns: JSON with `library`, `resolved`, `leaf_parms`, `cdf_parms`, `fem3d_pre`, `fem3d_post` blocks per aircraft.

```vb
' Pseudocode in GearTraceWrapper.vb
Public Function TraceAircraft(req As CdfRequest, ac As AircraftInput) As GearTraceResponse
    Dim trace As New GearTraceResponse() With {.icao = ac.icao, .traffic_gear = ac.gear, .traffic_mtow = ac.mtow}

    ' Stage 2: library lookup
    Dim libRec = AircraftLibrary.GetByIcao(ac.icao)
    trace.library = SnapshotLibraryRecord(libRec)

    ' Stage 3: ResolveGeometry
    Dim geo = AircraftLibrary.ResolveGeometry(ac.icao, ac.gear, ac.mtow, ac.tirePressure)
    trace.resolved = SnapshotGeometry(geo)

    ' Stage 4: BuildLeafParms (used by both LEAF and CDF)
    Dim leafParms = AircraftLibrary.BuildLeafParms(geo, ac.icao)
    trace.leaf_parms = SnapshotLeafParms(leafParms)
    trace.cdf_parms = trace.leaf_parms  ' identical reference

    ' Stage 6 & 7: FEM pre/post transform
    If req.includeFem3d Then
        trace.fem3d_pre = SnapshotLeafParms(leafParms)  ' before transform
        Dim femParms = leafParms.Clone()
        Dim prepStatus = Fem3dWrapper.PrepareAircraftForFem3d(femParms, geo:=geo)
        trace.fem3d_post = SnapshotLeafParms(femParms)
        trace.fem3d_mode = prepStatus.mode
        trace.fem3d_original_gear = prepStatus.originalGear
        trace.fem3d_final_gear = prepStatus.finalGear
    End If

    Return trace
End Function
```

This requires **no FAA source modification** — only additions to the AeroPave wrapper.

### Driver script — `scripts/audit_gear_coordinate_trace.py`

```
1. Load results/cdf_results.json — get the 13 sections and top-10 lists
2. For each section:
     a. Read pavement structure (layers + subgrade)
     b. For each top-10 aircraft (icao, annualDeps, gear, mtow):
          - POST to /api/diag/gear-trace with the section + this aircraft alone
          - Receive JSON trace
          - Append to in-memory rows[]
3. Compute verification flags per aircraft (✅ / 🟡 / 🟠 / 🔴 / ⚪) by comparing
   stages 2–7 with float tolerance 1e-6.
4. Write Excel via openpyxl with the 5 sheets described above.
5. Print summary to stdout: counts per flag, any 🔴 rows highlighted.
```

Total runtime: ~130 backend calls × ~2 s each = ~5 min wall-clock.

## Phases

| Phase | Task | Time |
|---|---|---|
| A | Add Dto types: `GearTraceRequest`, `GearTraceResponse`, `WheelCoord`, `LeafParmsSnapshot` | 15 min |
| B | Implement `GearTraceWrapper.vb` with `TraceAircraft` and snapshot helpers | 30 min |
| C | Wire route `POST /api/diag/gear-trace` in `HttpRouter.vb` | 10 min |
| D | Build & smoke test on one section/aircraft via curl | 15 min |
| E | Write `scripts/audit_gear_coordinate_trace.py` (data fetch + flagging logic) | 45 min |
| F | Write the openpyxl Excel writer (5 sheets, formatting, conditional highlighting on flags) | 45 min |
| G | Run on all 13 sections × 10 aircraft, review the 130 rows | 30 min |
| H | If any 🔴 appears: investigate (it should not, but the audit is meaningful precisely because it could). If clean: snapshot Excel into `results/`, commit, write a 1-page summary in `note_claude/` | 30 min |

**Estimated total: ~3.5 hours** for a clean run with no 🔴 surprises.

## Acceptance criteria

1. `results/gear_coordinate_trace_audit.xlsx` exists with all 5 sheets populated.
2. Sheet 1 has 130 rows (13 sections × 10 aircraft).
3. Sheet 3 (Discrepancies) is **empty** OR every row in it is justified by a `mode = synthetic_dual_approx` cell (acceptable per spec).
4. Sheet 4 (Provenance) shows zero `dual_fallback` for any aircraft contributing more than 1% of section CDF (i.e., the engine is not running on generic dual-wheel geometry for any consequential aircraft — except where physics fundamentally requires the gear template, e.g. for aircraft with no XML in the library).
5. Methodology paragraph in Sheet 5 reads cleanly and is paste-able into the report.

## When to run

- **Recommended:** after Phase 7 of [embed-faarfield-source-projectref.md](embed-faarfield-source-projectref.md) (the source-build migration), so the audit doubles as a parity check between build modes.
- **Alternative:** can run today against the existing .msi-based build — results will be identical because the audit observes data flow, not which compiled DLL did the math.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `LEAFACParms.Clone()` doesn't exist as a method | Implement a manual deep-copy helper in `GearTraceWrapper.vb`; arrays are 1-based scalars, trivial to copy. |
| `Fem3dWrapper.PrepareAircraftForFem3d` is `Private` | Either change to `Friend` (touches wrapper code only — acceptable, our code) or add a public `Friend Function PrepareAircraftForFem3d_Diag(...)` that delegates. **Do not modify FAA source.** |
| Some top-10 aircraft are absent from the library | The flag system already covers this (`dual_fallback` flagged ⚪). Audit reports it; not a failure. |
| 130 backend calls saturate the single-threaded HttpListener | Run sequentially with a 200 ms delay between calls; total runtime ~5 min, no need for concurrency. |
| Float tolerance for "agreement" too tight | Use 1e-6 inches absolute tolerance (well below mesh resolution). Library values are `Double`s → LEAF uses `Double` arrays — exact agreement is expected. |

## Open Questions

1. Should the audit also check that **CDF profile arrays** for each aircraft match between two independent CDF runs (deterministic build verification)? Probably out of scope; mention in a follow-up if needed.
2. Should aircraft below the top-10 cutoff be included for completeness? Decision: no — their contribution is small and the file would balloon. Top 10 covers the aircraft driving each section's verdict.
3. Should the Excel embed the actual values from `combined_aircraft_library.json` (raw `wheel_coords` field) or only the values *as deserialized by the backend*? Decision: backend-deserialized values, since that's what the engines actually consumed. Raw library can be cross-referenced manually if needed.

---

## Note for future-me

This audit is a **one-time deliverable** for the report. It does not need to run on every CDF analysis. Once the Excel is generated and reviewed, the spec-and-script live in the repo for reproducibility but are not part of any CI/auto-pipeline.

*End of spec.*
