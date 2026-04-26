---
spec: embed-faarfield-source-projectref
status: deferred
owner: Chidchanok Pleesudjai
date: 2026-04-25
last-updated: 2026-04-25
---

# Embed FAARFIELD Source as ProjectReference (No-Install Build)

> ## ⏸ Status: DEFERRED (2026-04-25)
>
> Phases 0–3 executed cleanly (source staged, vbproj edited, .sln created, FAAMeshClassLib quirk handled).
> Phase 4 (first build) hit a hard tooling blocker on this machine:
>
> **Blocker:** the FAA source uses VB.NET 14 features (e.g., `NameOf(...)` in `FaarFieldModel\AirplaneInfo.vb`) which require a **Roslyn-based VB compiler** (Visual Studio 2015+ era). The only `vbc.exe` on this machine is `Framework\v4.0.30319\vbc.exe` (pre-Roslyn). The build fails with `error BC30451: 'NameOf' is not declared` across ~50 sites in `FaarFieldModel`.
>
> **Cure:** install one of (a) .NET SDK 8 (~250 MB, no admin), (b) Visual Studio Build Tools 2022 (~2–5 GB, admin), or (c) Visual Studio 2022 Community (~5+ GB, admin). Any of these provides the modern VBC compiler that resolves the blocker.
>
> **Decision (2026-04-25):** instead of installing build tooling, pivot back to FAARFIELD .msi install. Reasoning:
> - The .msi is on disk already; install is one admin click vs. ~250 MB+ download.
> - The methodology claim is *stronger* with .msi (bit-identical FAA binaries, hash-verifiable against any reviewer's install) than with a self-compiled source build.
> - The "no FAARFIELD install" benefit no longer outweighs the friction once tooling install is required either way.
>
> **Plan B retained:** all 4 phases of work (source staging at `c:/temp/faarfield-source`, edited vbproj, FaarfieldApi.sln, Directory.Build.targets, vbproj backup at `FaarfieldApi.vbproj.bak-msi-hintpaths`) remain in place. Resuming this spec on a future machine that already has the .NET SDK or VS Build Tools is straightforward — start at Phase 4 with the modern msbuild.
>
> **Audit-trail backup:** the original FaarfieldApi.vbproj (with binary HintPaths to `C:\Program Files (x86)\FAARFIELD\`) is preserved at `c:\temp\aeropave\faarfield-api\FaarfieldApi.vbproj.bak-msi-hintpaths`. This is the file restored by the rollback step.

---


## Goal

Replace 8 binary DLL references in `FaarfieldApi.vbproj` (which currently HintPath into `C:\Program Files (x86)\FAARFIELD\`) with `<ProjectReference>` entries pointing at the FAA-shipped FAARFIELD 2.1.1 source projects. After this change, `msbuild` compiles the entire stack (FAA libraries + AeroPave wrapper) in one pass — no FAARFIELD .msi install needed on this or any future machine.

## Methodology Claim After This Change

> "FAARFIELD 2.1.1's source code is used unmodified. The compiled `FaarfieldApi.exe` and the FAA library DLLs it depends on (`LEAFClassLib.dll`, `FaarFieldAnalysis.dll`, etc.) are produced by `msbuild` from the FAA-published `.vbproj` and `.vb` files at `FAARFIELD_2.1.1_SourceCode/FAARFIELD/` — same source code that produces the FAA's official binaries. No FAA source code is modified; the only data-layer modification is the enriched aircraft library (`combined_aircraft_library.json`)."

**Trade-off acknowledged:** The compiled output bytes will not be bit-identical to the FAA installer's official DLLs (different compiler version, build flags). The *math* is identical. For PhD/class-level review this is fine; for FAA-submission peer review the official-binary claim from running the .msi is marginally stronger.

## In Scope

- Edits to `c:/temp/aeropave/faarfield-api/FaarfieldApi.vbproj` (and the Dropbox `website/` snapshot of the same).
- Creation of a new solution file `FaarfieldApi.sln` co-located with the wrapper.
- Optional msbuild target to handle the AMClassLib → FAAMeshClassLib build-order quirk.
- Build/runtime/parity verification on this machine.
- Documentation updates: `note_claude/2026-04-24_Fresh_Machine_Setup_Guide.md`, project `CLAUDE.md`, `README.md`.

## Out of Scope (do NOT touch)

- Any file under `FAARFIELD_2.1.1_SourceCode/FAARFIELD/**/*.vb` or `*.vbproj` — preserving the no-touch claim.
- `FullAnalysisWrapper.vb` (the parity-port CDF engine stays as-is).
- `combined_aircraft_library.json` schema or content.
- React frontend (`src/`).

---

## Discovery Findings (already verified)

### Library inventory and build metadata

| AeroPave reference | Source folder | .vbproj filename | TargetFramework | PlatformTarget | ProjectGuid |
|---|---|---|---|---|---|
| LEAFClassLib | `LEAFClassLib/` | `LEAFClassLib.vbproj` | v4.8 | x86 | `{C12214C6-D7FC-4C18-8DE4-FF9B74920FD4}` |
| ACClassLib | `ACClassLib/` | `ACClassLib.vbproj` | v4.8 | x86 | `{81BE712B-13B6-4018-A274-5759E45BE2C0}` |
| FaarFieldModel | `FaarFieldModel/` | `FaarFieldModel.vbproj` | v4.8 | (Any CPU) | `{F9D10D5E-DCFB-4393-B95B-EF6B57CE54FC}` |
| FaarFieldAnalysis | `FaarFieldAnalysis/` | `FaarFieldAnalysis.vbproj` | v4.8 | (Any CPU) | `{BC3720B2-C019-4216-8DF1-9A6FF91C7397}` |
| AMClassLib | `AMClassLib/` | `AMClassLib.vbproj` | v4.8 | x86 | `{A6106882-F23E-4EE6-814D-2D7A45A6E2DD}` |
| FAAMeshClassLib | `FAAMeshClassLib/` | `FAAMeshClassLib.vbproj` | v4.8 | x86 | `{25F8C881-0FF8-43D7-90EB-903CCB066943}` |
| FEMClassLib | `FEMClassLib/` | `FEMClassLib.vbproj` | v4.8 | (Any CPU) | `{8C23CBF8-9C32-47F3-A5AE-3672B935C486}` |
| **ACRClassLib** | `ACNClassLib/` ⚠ | `ACRClassLib.vbproj` ⚠ | v4.8 | x86 | `{DEE608EA-D0E4-49C8-BC9E-A0503BF25717}` |

⚠ Note: ACR project name ≠ folder name — the `ACRClassLib.vbproj` lives inside the `ACNClassLib/` folder.

### Inter-project dependency graph

```
LEAFClassLib       (no FAA deps)
FAAMeshClassLib    (no FAA deps)
FEMClassLib        (no FAA deps)
FaarFieldModel     (no FAA deps, but Telerik refs — see below)
ACRClassLib        (no FAA deps)
ACClassLib         → FaarFieldModel
AMClassLib         → LEAFClassLib, FEMClassLib, FAAMeshClassLib (binary HintPath, see Risk 1)
FaarFieldAnalysis  → ACRClassLib, ACClassLib, AMClassLib, FaarFieldModel
FaarfieldApi       → all 8 above
```

msbuild resolves ProjectReference order automatically; explicit ordering not required.

### Telerik dependency — already shipped with source

`FaarFieldModel.vbproj` references `Telerik.Windows.Controls` (commercial WPF library) at HintPath `..\lib\RCWPF\2021.3.1109.45\Telerik.Windows.Controls.dll`. **The DLLs are present in the source tree** — no Telerik license/install required for build:

```
FAARFIELD_2.1.1_SourceCode/FAARFIELD/lib/RCWPF/2021.3.1109.45/Telerik.Windows.Controls.dll
                                                              Telerik.Windows.Controls.Input.dll
```

Telerik usage in `FaarFieldModel/*.vb` is a single commented-out line (`'Imports Telerik.Windows.Controls`). At runtime the wrapper never instantiates UI controls, so Telerik is effectively a build-time-only dependency. Confirmed harmless.

### AircraftGeometry.xml / runtime data

The wrapper loads aircraft geometry from `combined_aircraft_library.json` only. FAARFIELD's stock `AircraftGeometry.xml` is NOT consulted at runtime by any of the three engines (LEAF, CDF, FEM3D) for the AeroPave call paths — verified in Phase 0 audit (transcript 2026-04-25). No FAARFIELD runtime data files need to be staged into the build output.

---

## Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | `AMClassLib.vbproj` has a binary `<Reference>` to `..\FAAMeshClassLib\bin\FAAMeshClassLib.dll` (NOT a ProjectReference). If FAAMeshClassLib's actual output path is `bin\Release\` or `bin\x86\Release\`, the binary HintPath fails to resolve. | High | Build fails at AMClassLib | Add a `BeforeTargets="ResolveAssemblyReferences"` MSBuild target in `FaarfieldApi.vbproj` that copies `FAAMeshClassLib\bin\Release\FAAMeshClassLib.dll` → `FAAMeshClassLib\bin\FAAMeshClassLib.dll` before AMClassLib resolves references. **Does NOT touch FAA source.** Alternative: build FAAMeshClassLib first via explicit msbuild call, then build the rest. |
| 2 | 3 of 8 FAA projects don't pin `<PlatformTarget>x86`; default Any CPU could produce mixed-mode output | Medium | Runtime BadImageFormatException (LEAFClassLib is x86-only PE32) | Override at command line: `msbuild ... /p:Platform=x86 /p:PlatformTarget=x86`. If override is ignored by Any CPU projects, fall back to `Directory.Build.props` in the FAA source root that sets `<PlatformTarget>x86</PlatformTarget>` globally — `.props` is additive, not a source modification. |
| 3 | FAARFIELD source is in Dropbox path; msbuild incremental builds may be slow or hit file-lock conflicts | Medium | Slow rebuilds, occasional flaky errors | Robocopy `FAARFIELD_2.1.1_SourceCode/FAARFIELD/` → `c:/temp/faarfield-source/` once at setup; point `FaarfieldApi.sln` ProjectReferences at the local copy. Same pattern as `c:/temp/aeropave/`. |
| 4 | Strong-name signing — if FAA ships their DLLs with strong names but our project-built output isn't signed, runtime InternalsVisibleTo or signed-friend assertions could fail | Low | Runtime exception | The wrapper doesn't use InternalsVisibleTo. AssemblyKeyFile not present in any FAA .vbproj inspected. Confirm by clean build; address only if it fails. |
| 5 | `BadImageFormatException` if some intermediate DLL is built Any CPU and loaded into x86 process | Medium | Runtime crash on first FAARFIELD call | Risk 2 mitigation handles this. Verify post-build with `corflags FAARFIELD_DLL` — should show 32BIT preferred. |
| 6 | `FaarFieldModel` Telerik HintPath is relative `..\lib\RCWPF\2021.3.1109.45\` — that path is relative to FaarFieldModel.vbproj, not the new solution. If we copy FaarFieldModel out of the source tree, Telerik DLLs won't be found. | Low | Build fails at FaarFieldModel | Don't copy individual projects — copy the entire `FAARFIELD/` source tree wholesale (preserves all relative paths). |
| 7 | The Dropbox `website/faarfield-api/` snapshot also has the binary HintPaths and would need the same edits. Manually keeping both in sync risks drift. | Low | Snapshot diverges from running code | Update both copies; rely on the existing robocopy mirror workflow. |

---

## Plan (phased)

### Phase 0 — One-time source staging (5 min)

```cmd
robocopy "C:\Users\chidc\ASU Dropbox\Chidchanok Pleesudjai\PhD COURSES\2026 Spring\CEE 598 Topic Airport Design\03 Final Project\FAARFIELD_2.1.1_SourceCode\FAARFIELD" "C:\temp\faarfield-source" /E /NFL /NDL
```

**Acceptance:** `dir C:\temp\faarfield-source\LEAFClassLib\LEAFClassLib.vbproj` returns the file. `dir C:\temp\faarfield-source\lib\RCWPF\2021.3.1109.45\Telerik.Windows.Controls.dll` returns the file.

**Deliverable:** local non-Dropbox copy of FAA source.

### Phase 1 — Edit `FaarfieldApi.vbproj` (15 min)

Backup first: `copy FaarfieldApi.vbproj FaarfieldApi.vbproj.bak-msi-hintpaths`.

For each of the 8 references, replace the `<Reference Include="X"><HintPath>C:\Program Files (x86)\FAARFIELD\X.dll</HintPath></Reference>` block with:

```xml
<ProjectReference Include="C:\temp\faarfield-source\<folder>\<projfile>.vbproj">
  <Project>{<guid from discovery table>}</Project>
  <Name><AeroPave reference name></Name>
</ProjectReference>
```

Use the GUIDs from the discovery table above. Note `ACRClassLib`'s folder is `ACNClassLib/`.

**Acceptance:** `FaarfieldApi.vbproj` no longer mentions `C:\Program Files (x86)\FAARFIELD`.

**Deliverable:** edited project file.

### Phase 2 — Create `FaarfieldApi.sln` (5 min)

Generate a new solution file at `c:/temp/aeropave/faarfield-api/FaarfieldApi.sln` containing 9 project entries: FaarfieldApi + the 8 FAA libraries. Use the existing GUIDs from discovery. Set `Configuration|Platform = Release|x86` for all projects.

**Acceptance:** `msbuild FaarfieldApi.sln /t:Restore` succeeds; `msbuild FaarfieldApi.sln /p:Configuration=Release /p:Platform=x86 /t:Build` enters the build phase (whether or not it succeeds — that's Phase 3).

**Deliverable:** `FaarfieldApi.sln`.

### Phase 3 — Add msbuild target for FAAMeshClassLib HintPath (10 min)

Inside `FaarfieldApi.vbproj`, add an MSBuild target that runs before the AMClassLib reference resolution. After FAAMeshClassLib builds, copy its output DLL to the location `AMClassLib.vbproj` expects (`..\FAAMeshClassLib\bin\FAAMeshClassLib.dll`):

```xml
<Target Name="StageFAAMeshDll" AfterTargets="ResolveProjectReferences"
        BeforeTargets="ResolveAssemblyReferences"
        Condition="Exists('C:\temp\faarfield-source\FAAMeshClassLib\bin\Release\FAAMeshClassLib.dll')">
  <Copy SourceFiles="C:\temp\faarfield-source\FAAMeshClassLib\bin\Release\FAAMeshClassLib.dll"
        DestinationFiles="C:\temp\faarfield-source\FAAMeshClassLib\bin\FAAMeshClassLib.dll"
        SkipUnchangedFiles="true" />
</Target>
```

**Acceptance:** During Phase 4 build, the AMClassLib reference resolves successfully.

**Deliverable:** msbuild target added (may be moved or refined depending on actual FAAMeshClassLib output path; verify with the first build).

### Phase 4 — First clean build (15 min)

```cmd
cd /d c:\temp\aeropave\faarfield-api
msbuild FaarfieldApi.sln /p:Configuration=Release /p:Platform=x86 /v:m
```

Expected outcome: `0 Warning(s)` `0 Error(s)`, with `bin\x86\Release\FaarfieldApi.exe` plus 8 FAA DLLs and 2 Telerik DLLs co-located.

If errors occur, common categories and fixes:

| Error pattern | Likely cause | Fix |
|---|---|---|
| `MetadataFile "...FAAMeshClassLib.dll" could not be found` | Phase 3 target not firing or wrong path | Adjust target's `AfterTargets`/`Condition`; verify FAAMeshClassLib's actual `OutputPath` |
| `BadImageFormatException` at runtime | Mixed-mode binaries | Add `Directory.Build.props` to force `<PlatformTarget>x86</PlatformTarget>` |
| `Telerik.Windows.Controls could not be found` | HintPath relative anchor wrong (Phase 0 staging incomplete?) | Verify lib/RCWPF tree present at the staged path |
| `error VBNC30002` syntax errors | .NET 4.8 Developer Pack not installed | One-off; install developer pack |

**Acceptance:** Build succeeds; `corflags bin\x86\Release\LEAFClassLib.dll` shows `32BITREQ : 1`.

**Deliverable:** working binaries built entirely from source, no .msi install required.

### Phase 5 — Smoke test (10 min)

```cmd
:: Terminal 1
c:\temp\aeropave\faarfield-api\bin\x86\Release\FaarfieldApi.exe

:: Terminal 2 (verify health)
curl http://localhost:5100/api/health
```

Expected console output:
```
LEAF: available
FEM: available
FEM3D: available
Analysis: available  (or "compatibility-only" — irrelevant since FullAnalysisWrapper is the CDF path)
Aircraft library: 1310 records, 136 with geometry
```

**Acceptance:** All four engine availability flags = available; aircraft library count = 1310.

**Deliverable:** running native backend, source-built.

### Phase 6 — Frontend integration test (10 min)

Start `npm run dev` from `c:/temp/aeropave/`. Open `http://localhost:5173` and validate:

1. **Pre-cal hydration** — KMWH 37508 verdict shows CDF=2.42e+04 instantly on selection.
2. **Live recompute** — change AC overlay slider → spinner appears → CDF re-renders within ~600 ms.
3. **3D FEM mesh** — toggle "Use 3D FEM" → mesh renders with stress field within 30 s.
4. **Stress contour panel** — LEAF heatmap renders.
5. **Per-aircraft contribution table** — 10 rows with σ_LEAF, σ_FEM, FEM/LEAF ratio.

**Acceptance:** all 5 panels work end-to-end; no "FAARFIELD backend offline" badge.

**Deliverable:** confirmation that the source-built binaries are functionally equivalent to the .msi binaries.

### Phase 7 — Numerical parity check (30 min)

Run all 13 sections through the source-built backend and compare CDF results to the existing `results/cdf_results.json` baseline (which was produced by the .msi-based build on 2026-04-24).

```cmd
py scripts/all_airports_cdf_native.py --output results/cdf_results_sourcebuild.json
py scripts/diff_cdf_baselines.py results/cdf_results.json results/cdf_results_sourcebuild.json
```

(Second script may need to be created — small diff utility comparing per-section CDF, controlling layer, top-aircraft list.)

**Expected:** 13/13 sections numerically identical (or within float-rounding noise — same source code in, same numbers out).

**Acceptance:** verdict (OVER/UNDER) matches 13/13; CDF magnitudes within 0.1%; controlling layer agrees 13/13.

**Deliverable:** parity report `results/sourcebuild_vs_msi_parity.md`.

### Phase 8 — Documentation + commit (15 min)

Update:
- `note_claude/2026-04-24_Fresh_Machine_Setup_Guide.md` § 2.4 — "FAARFIELD .msi install" → marked optional; add new § 2.5 "FAARFIELD source build" referencing Phase 0–4 here.
- `note_claude/2026-04-24_Gear_Mismatch_Excel_vs_FAARFIELD_Library.md` § 10.5 (Methods paragraph) — update "loaded directly via .NET interop from FAA's compiled DLLs at C:\Program Files (x86)\FAARFIELD" → "compiled from FAA's published 2.1.1 source tree via msbuild".
- `03 Final Project/CLAUDE.md` "Native FAARFIELD Backend" section — replace the binary HintPath note with the source ProjectReference architecture.
- `README.md` — update setup section.

Commit:
- Spec file (this doc).
- Updated `FaarfieldApi.vbproj`, `FaarfieldApi.sln`.
- Parity report.
- Doc updates.
- Backup `.bak-msi-hintpaths` file (keep, for the audit trail showing the change).

**Acceptance:** docs read consistently; git history shows the methodology change.

**Deliverable:** committed migration.

---

## Estimated Effort

| Phase | Time | Cumulative |
|---|---|---|
| 0 — staging | 5 min | 5 min |
| 1 — vbproj edits | 15 min | 20 min |
| 2 — sln file | 5 min | 25 min |
| 3 — msbuild target | 10 min | 35 min |
| 4 — first build (incl. iteration) | 15–45 min | 1h–1h20m |
| 5 — smoke test | 10 min | 1h10m–1h30m |
| 6 — frontend test | 10 min | 1h20m–1h40m |
| 7 — parity check | 30 min | 1h50m–2h10m |
| 8 — docs + commit | 15 min | 2h05m–2h25m |

Realistic total: **2–3 hours** including Phase 4 build-error iteration. If Phase 4 is clean on first try (possible — the source is FAA's own and well-formed), closer to 90 minutes.

---

## Decision Log (this spec)

- **2026-04-25** — chose ProjectReference over .msi install. Rationale: user wants no admin install; aircraft-library-only modification claim is preserved either way; source is fully self-contained on disk including Telerik dependencies.
- **2026-04-25** — chose to copy FAA source to `c:/temp/faarfield-source/` rather than build from Dropbox in-place. Rationale: Dropbox sync interferes with msbuild file locks (same reason `c:/temp/aeropave/` exists).
- **2026-04-25** — chose msbuild target for AMClassLib HintPath quirk over editing AMClassLib.vbproj. Rationale: preserves no-touch claim on FAA source.

---

## Open Questions to Resolve During Execution

1. Does `FAAMeshClassLib.vbproj` output to `bin\Release\` or `bin\x86\Release\`? Determines exact path in Phase 3 target.
2. Do any Any-CPU projects produce x86-incompatible binaries that x86 LEAF can't load? `Directory.Build.props` is the fallback if so.
3. Does FAARFIELD's CDF code (`FullAnalysisWrapper.vb` calls into LEAFClassLib only, but if anything in FaarFieldAnalysis is reached) require any external data files that the .msi installer would have placed in `C:\Program Files (x86)\FAARFIELD\` (defaults\, aircraft.csv, etc.)? Phase 5/6 will surface any missing-file errors.

---

## Rollback Plan

If Phase 4–7 reveal blockers we can't resolve in <2 hours of focused work:

1. `copy FaarfieldApi.vbproj.bak-msi-hintpaths FaarfieldApi.vbproj`
2. Run the FAARFIELD .msi installer (the file is sitting at `FAARFIELD_2.1.1_Installation Files/Release/FAARFIELD.Installer.msi`).
3. `msbuild FaarfieldApi.vbproj /p:Configuration=Release /p:Platform=x86` — this returns to the original known-good binary-HintPath build.
4. Total rollback time: ~10 minutes.

---

*End of spec.*
