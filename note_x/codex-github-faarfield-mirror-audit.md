# Codex Note: GitHub Audit Of Public FAARFIELD Repos

Date: 2026-04-19

## Purpose

This note summarizes the GitHub deep dive for public FAARFIELD-related repositories and explains what is useful for our work versus what is not.

## Bottom Line

Yes, there is now a real public GitHub mirror of the FAARFIELD 2.1.1 source.

The important one is:

- `Johann-Cardenas/FAARFIELD-2.1.1`
  - https://github.com/Johann-Cardenas/FAARFIELD-2.1.1

There is also a separate wrapper/optimizer repo:

- `jared-aguilera/GA-FAARFIELD-Optimizer`
  - https://github.com/jared-aguilera/GA-FAARFIELD-Optimizer

But I did **not** find public GitHub evidence that someone has already published:

- an AeroPave-style web backend
- `Fem3dWrapper.vb`
- `FullAnalysisWrapper.vb`
- `HttpRouter.vb`
- a real FEM heatmap export path for the web

So the public mirror is useful for source provenance and desktop-side ideas, but it does **not** solve the current AeroPave FEM visualization problem for us.

## What I Verified

### 1. The public FAARFIELD mirror is real source, not just documentation

Using GitHub's public repository API, the repo `Johann-Cardenas/FAARFIELD-2.1.1` shows the core FAA-style source tree:

- `ACClassLib`
- `ACNClassDriver`
- `ACNClassLib`
- `AMClassLib`
- `CreateSignedAircraftLibrary`
- `FAAMeshClassLib`
- `FAARFIELD.Installer`
- `FaarFieldAnalysis`
- `FaarFieldModel`
- `FAARFIELDUnitTests`
- `FEMClassLib`
- `FF2`
- `LEAFClassLib`
- `FAARFIELD.sln`

That means it is not just notes or packaged binaries. It is a genuine source mirror.

### 2. The mirror includes custom desktop modifications

Its README explicitly says it contains customizations beyond the original FAA-published source and should be treated as a beta/customized version.

From the tree and README, the extra/custom focus areas are mainly:

- report generation and PDF export
- desktop UI modernization
- aircraft-library handling
- documentation and engineering guardrails

The repo includes:

- `FF2/Libs/AircraftLibrary.vb`
- `FF2/Libs/HtmlReportGenerator.vb`
- `FF2/Libs/ModuleDrawProfile.vb`

and still includes the original FEM-side printout/interpolation files:

- `FEMClassLib/PrintOut/cls.PrintOut.vb`
- `FEMClassLib/PrintOut/cls.stnod.vb`
- `FEMClassLib/PrintOut/cls.tecstress.vb`

### 3. The mirror does not contain the AeroPave web backend layer

I checked the recursive tree of the public mirror and did **not** find any paths matching:

- `Fem3d`
- `FullAnalysisWrapper`
- `HttpRouter`
- `nativeStress`
- `MeshPanel`
- `heatmap`

That is the critical finding.

This means the public GitHub mirror is **not** already doing the web-based FEM mesh/heatmap work we are building in AeroPave.

## Local Source Snapshot Vs Public Mirror

### Local FAA source snapshot

Local path:

- `FAARFIELD_2.1.1_SourceCode/FAARFIELD`

Local top-level items currently visible:

- 15 directories + `FAARFIELD.sln` + `README.md`

Local recursive file count from `rg --files`:

- `721`

### Public mirror

Public mirror recursive tree count from GitHub API:

- `1519`

Public mirror root also includes additional items not present in the local FAA snapshot, for example:

- `.claude`
- `.github`
- `CLAUDE.md`
- `Detailed Computation Report.html`
- `Detailed Computation Report.pdf`
- `Log.md`
- `packages`

That is consistent with a customized working repo, not a clean FAA zip snapshot.

### Important file difference

In our local FAA snapshot under `FF2/Libs`, I confirmed:

- `AircraftLibrary.vb`
- `ModuleDrawProfile.vb`

But not:

- `HtmlReportGenerator.vb`

The public mirror does include `FF2/Libs/HtmlReportGenerator.vb`, which is another sign that it has meaningful report/UI custom work beyond the clean FAA source snapshot.

## What This Means For Claude

### Useful takeaways

Claude can use the public mirror for:

1. confirming file/module provenance in FAARFIELD 2.1.1
2. studying desktop-side customizations to `FF2`
3. borrowing ideas for report generation, aircraft-library handling, and UI cleanup
4. confirming that `cls.PrintOut.vb`, `cls.stnod.vb`, and `cls.tecstress.vb` are the right solver-side places to study for FEM stress-field export

### Not useful as a shortcut

Claude should **not** assume that repo already contains our answer for:

1. web API exposure of FEM stress fields
2. a browser heatmap implementation
3. a JSON DTO for FEM stress contours
4. an AeroPave-compatible backend/frontend integration layer

There is no evidence of that in the public mirror.

## Practical Recommendation

Use the public mirror as:

- a source reference
- a sanity check on the FAARFIELD modules
- a place to inspect desktop reporting and UI patterns

Do **not** treat it as a ready-made implementation of the AeroPave FEM mesh or heatmap stack.

For the real FEM heatmap path, Claude still needs to do the hard local work:

1. expose solver stress data cleanly from the FAARFIELD path
2. move that data into a backend DTO
3. color the web mesh from backend FEM data, not LEAF interpolation

## Evidence Sources

- Public repo search result: `Johann-Cardenas/FAARFIELD-2.1.1`
- Public repo search result: `jared-aguilera/GA-FAARFIELD-Optimizer`
- Public mirror README:
  - https://raw.githubusercontent.com/Johann-Cardenas/FAARFIELD-2.1.1/main/README.md
- Official FAA download/source page cited by the mirror:
  - https://www.airporttech.tc.faa.gov/Products/Airport-Safety-Papers-Publications/Airport-Safety-Detail/ArtMID/3682/ArticleID/2841/FAARFIELD-20

## Caveat

GitHub's unauthenticated code-search API returned `401 Requires authentication`, so this audit is strongest at the repository and file-tree level, not a fully exhaustive cross-GitHub code-text search.

Even with that limitation, the evidence is strong enough to say:

**public FAARFIELD source mirrors now exist, but public AeroPave-style FEM heatmap implementations do not appear to be available.**
