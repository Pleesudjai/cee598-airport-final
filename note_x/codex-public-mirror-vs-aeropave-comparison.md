# Codex Note: Public FAARFIELD Mirror Vs AeroPave

Date: 2026-04-19

## Purpose

This note compares the public GitHub FAARFIELD mirror with our current AeroPave work.

The goal is to answer one simple question:

**What do they have that is specialized, what do we have that is specialized, and what is still missing in both?**

## Compared Repositories

### Public mirror

- `Johann-Cardenas/FAARFIELD-2.1.1`
- https://github.com/Johann-Cardenas/FAARFIELD-2.1.1

### Our local FAA source snapshot

- `FAARFIELD_2.1.1_SourceCode/FAARFIELD`

### Our AeroPave web/backend work

- `website/`
- `website/faarfield-api/`

## Short Answer

The public mirror is more specialized in:

- desktop UI modernization
- HTML/SVG/PDF reporting
- documentation and repo curation
- research-oriented desktop customization

AeroPave is more specialized in:

- managed backend integration
- HTTP/API exposure of FAARFIELD computations
- browser-based 3D mesh visualization
- aircraft-library-to-web workflow integration

What is still missing in both:

- a clean public web-ready export of real FEM stress fields
- a true backend-driven 3D FEM heatmap for the browser

## Comparison Table

| Area | Public FAARFIELD mirror | AeroPave / our work | Who is ahead |
|------|--------------------------|---------------------|--------------|
| **Original FAA source coverage** | Full mirrored FAA-style source tree with `AMClassLib`, `FEMClassLib`, `FAAMeshClassLib`, `FF2`, `LEAFClassLib`, etc. | Local FAA source snapshot also has the core source tree | Tie |
| **Repository documentation** | Very strong: large README, modification log, curated architecture notes, example reports | More fragmented across specs, notes, and working files | Public mirror |
| **Desktop report generation** | Strong specialization: custom `HtmlReportGenerator.vb`, SVG/PDF report pipeline, report-quality improvements | Not the main focus of AeroPave | Public mirror |
| **Desktop UI polish** | Strong specialization: theming, WPF UX cleanup, gear drawing modernization, PDF/report visuals | AeroPave is focused on web UI, not desktop FF2 polish | Public mirror |
| **Aircraft-library desktop handling** | Includes customized `FF2/Libs/AircraftLibrary.vb` and signed-library utilities | AeroPave also has strong aircraft-library work and managed resolver logic | Mixed |
| **Web backend / API layer** | No sign of `HttpRouter.vb`, `FullAnalysisWrapper.vb`, or web backend files | Real backend API exists in `website/faarfield-api/` | AeroPave |
| **Managed FAARFIELD wrapper for web use** | No sign of `Fem3dWrapper.vb` or equivalent web-exposed FEM wrapper | Real managed wrapper exists in AeroPave | AeroPave |
| **HTTP-accessible analysis pipeline** | Not visible | Present: API endpoints and backend orchestration | AeroPave |
| **Browser mesh visualization** | Not visible | Present: web mesh viewer and panel logic | AeroPave |
| **Approximate browser heatmap** | Not visible | Present, but currently LEAF-derived and not true FEM field output | AeroPave, but still immature |
| **Real FEM field export for browser heatmap** | No evidence found | Not complete yet | Missing in both |
| **Desktop-side FEM printout/interpolation source files** | Present: `cls.PrintOut.vb`, `cls.stnod.vb`, `cls.tecstress.vb` | Present in local FAA source snapshot too | Tie |
| **Ready-made solution for Option 3** | No evidence | No finished solution yet | Missing in both |

## What They Have That We Do Not

These are the most meaningful specialized advantages in the public mirror.

### 1. Better packaging and documentation

They have a repo that is easier for a new engineer to understand quickly:

- big architecture README
- modification history
- curated explanation of modules
- example computation reports

That makes onboarding easier than our current mix of local notes and experiments.

### 2. Stronger desktop reporting pipeline

They appear to have invested heavily in:

- HTML/SVG report generation
- vector PDF export
- improved report readability
- chart rendering and documentation output

One concrete sign is that they include:

- `FF2/Libs/HtmlReportGenerator.vb`

Our local clean FAA source snapshot does not currently include that file.

### 3. Stronger desktop UX polish

The public mirror README claims many desktop-focused enhancements:

- UI theming
- interaction cleanup
- better GDI+ gear drawing
- improved PDF/display quality
- more polished FF2 experience

That is a different specialization than ours.

## What We Have That They Do Not

These are the most meaningful specialized strengths in AeroPave.

### 1. Web-native backend integration

This is the biggest difference.

We have a real web/backend layer around FAARFIELD:

- `website/faarfield-api/`

with files like:

- `Fem3dWrapper.vb`
- `FullAnalysisWrapper.vb`
- `HttpRouter.vb`

Those are not visible in the public mirror.

### 2. HTTP/API-accessible analysis

We are turning FAARFIELD into something that a browser app can call through endpoints.

That is a major architectural specialization beyond the desktop app.

### 3. Browser-based 3D mesh workflow

We already have:

- mesh DTO work
- mesh panel rendering
- wheel-load overlay in the browser
- shell/surface rendering logic

The public mirror does not appear to have a browser visualization stack at all.

### 4. Aircraft-library-to-web runtime flow

We already have active work around:

- JSON library integration
- backend aircraft resolution
- proxy geometry fallback
- FEM geometry sufficiency checks
- blocking `dual_fallback` from running FEM

That is a real web-analysis specialization the public mirror does not show.

## What Is Still Missing In Both

This is the important engineering gap.

### 1. A clean public FEM stress export for web use

Neither side appears to already provide:

- a public DTO/API that exposes real FEM stress fields to a browser or service layer

### 2. A true browser heatmap based on FEM data

The public mirror does not appear to have any browser heatmap system.

Our current AeroPave heatmap exists, but it is still:

- LEAF-derived approximation over a real mesh

That is not the same as native FEM contour output.

### 3. A finished Option 3 path

Neither repo appears to already solve:

- clean stress extraction from solver memory
- backend DTO packaging of the field
- validated browser rendering of that field

That still has to be built.

## Best Practical Reading

### Public mirror = good for

Use it for:

1. source provenance
2. desktop FF2 customization ideas
3. report-generation ideas
4. confirming where solver printout/interpolation logic lives

### AeroPave = good for

Use our own code for:

1. backend architecture
2. web API orchestration
3. runtime aircraft resolution
4. FEM mesh exposure to the browser
5. future real FEM heatmap implementation

## Final Verdict

The public mirror is more specialized as a **customized desktop FAARFIELD research/workstation repo**.

AeroPave is more specialized as a **web-connected engineering platform trying to expose FAARFIELD analysis through APIs and interactive browser visualization**.

So if the question is:

**Which repo is more advanced for desktop FAARFIELD polish?**

Answer:

- the public mirror

If the question is:

**Which repo is more advanced for managed backend integration and browser-based FEM workflow?**

Answer:

- AeroPave

If the question is:

**Which repo already has the finished professional real-FEM browser heatmap?**

Answer:

- neither one
