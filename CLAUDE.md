# CEE 598 Airport Design — Final Project

## Project
**Goal:** Use FAARFIELD 2.1.1 to calculate stresses in existing airport pavement layers for 6 airports, then determine if each section is under-designed or over-designed.
**Course:** CEE 598 Topic Airport Design, ASU, Spring 2026
**Student:** Chidchanok Pleesudjai (cpleesud@asu.edu)
**Date started:** 2026-04-15

## Airports (6 airports, 13 pavement sections)

| # | Airport | ICAO | NetworkID | Sections | Use |
|---|---------|------|-----------|----------|-----|
| 1 | La Junta Municipal, CO | KLHX | 346 | 6627, 7347 | Taxiway |
| 2 | Pueblo Memorial, CO | KPUB | 364 | 6948 | Taxiway |
| 3 | Indianapolis Regional, IN | KMQJ | 378 | 8662, 8881, 8640, 8780 | Taxiway |
| 4 | Chippewa County Intl, MI | KCIU | 1017 | 21222 | Runway |
| 5 | Ottumwa Regional, IA | KOTM | 1356 | 28171, 27450, 27641 | Taxiway+Runway |
| 6 | Grant County Intl, WA | KMWH | 1863 | 37325, 37508 | Runway |

## Analysis Type
All sections: **HMA Overlay on Rigid** (AC over PCC composite)

## Key Inputs for FAARFIELD

### Pavement Layers (from Excel Pavement sheet)
All sections have: AC overlay (top) + PCC P-501 + optional base/subbase

### Subgrade (from NRCS Web Soil Survey API — Method 1: single layer at pavement bottom)

| ICAO | Subgrade Soil | AASHTO | CBR | E (psi) | k (pci) |
|------|--------------|--------|-----|---------|---------|
| KLHX | Silt Loam | A-6(9) | 7 | 10,500 | 70 |
| KPUB | Bedrock/Shale | Rock | 12 | 18,000 | 120 |
| KMQJ | Silty Clay | A-7-6(17) | 4 | 6,000 | 45 |
| KCIU | Fine Sand | A-3 | 20 | 30,000 | 170 |
| KOTM | Silty Clay Loam | A-7-6(20) | 4 | 6,000 | 45 |
| KMWH | Gravelly Coarse Sand | A-1-a | 40 | 50,000 | 300 |

### Traffic (from Excel Traffic sheets)
- 229 unique ICAO aircraft codes across all airports
- 208 matched in FAA Aircraft Characteristics Database
- Key FAARFIELD inputs: MTOW, gear config, annual departures, growth rate
- Aircraft <6,000 lbs cause negligible damage — skip or use Generic S-5

### Still Needed
- **PCC Flexural Strength:** Use default ~700 psi (range 500-1000)
- **SCI (Slab Condition Index):** Use default 80 (range 0-100)

## File Organization

```
03 Final Project/
  AO_CEE598_FAARFIELD.xlsx        <- Given data (pavement, traffic, growth rates)
  FAARFIELD_2.1.1_SourceCode/     <- Program source code (VB.NET)
  FAARFIELD_2.1.1_Installation/   <- Program installer
  central brain/                  <- Research notes, API data, downloaded files
  .claude/commands/               <- Slash commands (WISC)
  .claude/rules/                  <- Domain rules (path-scoped)
  .claude/docs/                   <- Heavy reference docs (sub-agent only)
  specs/                          <- Feature/task specs
  docs/                           <- Decisions log, handoff notes
  scripts/                        <- Python helper scripts

c:/temp/aeropave/                 <- Website (run from here, NOT Dropbox)
  src/                            <- React 19 + Vite 8 + Recharts + Plotly + Tailwind
  faarfield-api/                  <- .NET 4.8 backend wrapping FAARFIELD LEAF solver
    bin/x86/Release/FaarfieldApi.exe <- Built backend executable
```

## Native FAARFIELD Backend
- **Location:** `c:/temp/aeropave/faarfield-api/`
- **Runtime:** .NET Framework 4.8, Platform x86 (matching LEAFClassLib.dll PE32)
- **Port:** localhost:5100
- **Endpoints:** GET /api/health, POST /api/leaf/grid, POST /api/leaf/point, POST /api/fem3d/mesh (incl. `includeStressField`), POST /api/fem3d/stress, POST /api/analysis/cdf, POST /api/analysis/design, GET /api/aircraft/resolve/{icao}, GET /api/diag/fem-spike (Phase D crosscheck harness, optional `writePrintout=1`)
- **Build:** `cmd //c "cd /d c:\temp\aeropave\faarfield-api & C:\Windows\Microsoft.NET\Framework\v4.0.30319\msbuild.exe FaarfieldApi.vbproj /p:Configuration=Release /p:Platform=x86 /v:m"`
- **DLLs:** References LEAFClassLib.dll, ACClassLib.dll, FaarFieldModel.dll, AMClassLib.dll, FAAMeshClassLib.dll, FEMClassLib.dll, FaarFieldAnalysis.dll from `C:\Program Files (x86)\FAARFIELD\`
- **Nike3d.dll:** MISSING — LEAF-only mode for the NIKE3D branch; FEM3D uses the managed FAASR3D path (Nike3d.dll is not needed for our work).
- **Native FEM stress export (since 2026-04-19):** `Fem3dWrapper.ExtractElementStressTensor` re-runs `clsFEM.FAASR3D` with a Conversion()-refreshed `modAutoMesh.IPC`, then reflects into `objSolve.objPrintout.st(elem, comp, gp, time)` to deliver real per-element σx/σy/σz/τxy/τyz/τxz on the 3D mesh viewer. **Validated against FAARFIELD's own printout file: 4580/4580 elements within 0.1% of peak (Phase D PASS, see `Crosscheck FAARFIELD Desktop/REPORT.md`).** The 3D mesh viewer's stress mode is now authoritative — no LEAF interpolation in the color path.

## Over/Under-Design Criteria
FAARFIELD computes **CDF (Cumulative Damage Factor)**:
- CDF < 1.0 = pavement adequate = **over-designed**
- CDF = 1.0 = exactly meets design life
- CDF > 1.0 = **under-designed** (fails before design life)

## Key APIs (no auth required)
- **FAA ArcGIS:** `https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/`
- **NRCS Soil Data:** `https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest`
- **FAA ACD:** `https://www.faa.gov/airports/engineering/aircraft_char_database`

## Commands
- `/prime` — Full session start
- `/prime-data` — Data collection focused start
- `/prime-analysis` — FAARFIELD analysis focused start
- `/plan-feature` — Plan a task before executing
- `/execute` — Implement from a spec
- `/handoff` — End-of-session summary
- `/commit` — Log decisions + git commit

## Coding Standards
- Python scripts in `scripts/` — use `py` command (not python3)
- Paths use forward slashes in bash
- Excel via pandas/openpyxl
- API calls via curl or requests
