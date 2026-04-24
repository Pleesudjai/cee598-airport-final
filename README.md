# CEE 598 Topic: Airport Design — Final Project

**Course:** CEE 598 Topic Airport Design, Arizona State University, Spring 2026
**Student:** Chidchanok Pleesudjai (`cpleesud@asu.edu`)
**Instructor:** TBD

## Project goal

Use FAARFIELD 2.1.1 to evaluate pavement adequacy (CDF — Cumulative Damage Factor) for **6 airports** across **13 pavement sections**. Determine which sections are over-designed (CDF < 1.0) versus under-designed (CDF > 1.0).

**Verdict:** 4 over-designed / 9 under-designed.

## Airports analyzed

| # | Airport | ICAO | NetworkID | Sections | Use |
|---|---|---|---|---|---|
| 1 | La Junta Municipal, CO | KLHX | 346 | 6627, 7347 | Taxiway |
| 2 | Pueblo Memorial, CO | KPUB | 364 | 6948 | Taxiway |
| 3 | Indianapolis Regional, IN | KMQJ | 378 | 8662, 8881, 8640, 8780 | Taxiway |
| 4 | Chippewa County Intl, MI | KCIU | 1017 | 21222 | Runway |
| 5 | Ottumwa Regional, IA | KOTM | 1356 | 28171, 27450, 27641 | Taxiway+Runway |
| 6 | Grant County Intl, WA | KMWH | 1863 | 37325, 37508 | Runway |

All sections are **HMA Overlay on Rigid** (AC over PCC composite).

## Repo layout

```
03 Final Project/
├─ AO_CEE598_FAARFIELD.xlsx      Project input data (pavement, traffic, growth)
├─ Crosscheck FAARFIELD Desktop/ FAARFIELD-desktop reference outputs for parity
├─ Presentation/                 Slides
├─ central brain/                Research notes, API responses, downloaded data
├─ docs/                         Decision log, handoff notes
├─ note_claude/                  PhD-level analysis notes (frost, gear, distress, …)
├─ note.md, note_x/              Working notes
├─ results/                      Generated CSV/JSON outputs (audit, frost, CDF)
├─ scripts/                      Python automation (CDF batch, audit, NOAA fetch)
├─ specs/                        Feature specs
├─ website/                      AeroPave web tool (React 19 + .NET FAARFIELD backend)
├─ .claude/                      Project-specific Claude commands and rules
├─ CLAUDE.md                     Project instructions for Claude Code
└─ README.md                     This file
```

## What's in `note_claude/`

PhD-level analysis notes that explain methodology, decisions, and findings:

| Note | Topic |
|---|---|
| `2026-04-22_Nf_equations_per_layer.md` | Fatigue Nf equations used per layer |
| `2026-04-23_Frost_Protection_Analysis.md` | Modified Berggren depth + FAA frost class per section |
| `2026-04-24_PCI_Distress_Field_Data.md` | Field PCI/distress data → CDF validation |
| `2026-04-24_Gear_Mismatch_Excel_vs_FAARFIELD_Library.md` | Aircraft gear classification audit + library override rationale |
| `faarfield-parity-gaps-remaining.md` | Open backend-vs-desktop parity items |
| `fem3d-integration-blocker-2026-04-18.md` | FEM3D integration history |

## Website (AeroPave)

The `website/` folder is a **snapshot** of the live tool at `c:/temp/aeropave/`. See [website/README.md](website/README.md) for rehydration instructions on a fresh machine.

**Stack:**
- Frontend: React 19 + Vite 8 + Recharts + Plotly + Tailwind
- Backend: .NET Framework 4.8 (x86), wraps FAARFIELD's `LEAFClassLib`, `AMClassLib`, `FaarFieldAnalysis` DLLs

**Why the website is in a separate dev location:** Dropbox sync interferes with Vite's hot-reload and the .NET build cache. Active development happens at `c:/temp/aeropave/` and snapshots get mirrored here for git tracking.

## What's NOT in this repo (excluded by `.gitignore`)

| Excluded | Reason | Where to find |
|---|---|---|
| `FAARFIELD_2.1.1_SourceCode/` (156 MB) | Proprietary FAA source — license forbids redistribution | FAA Office of Airports |
| `FAARFIELD_2.1.1_Installation Files/` (52 MB) | Proprietary FAA installer | FAA Office of Airports |
| `PaveAir/` (2.1 GB) | Reference archive, not part of project deliverable | FAA PaveAir |
| `*.dll`, `*.pdb` (in website/faarfield-api/) | FAARFIELD-licensed DLLs | Install FAARFIELD locally, build from source |
| `website/node_modules/`, `website/dist/` | Build artifacts | `npm install` regenerates |

## Standards referenced

| Document | Use |
|---|---|
| FAA AC 150/5300-13B | Airport Design |
| FAA AC 150/5325-4B | Runway Length |
| FAA AC 150/5320-6G | Airport Pavement Design |
| FAA AC 150/5320-6F | PCC fatigue equations + frost protection (FG-1 to FG-4) |
| FAARFIELD 2.1.1 | Reference implementation (`AircraftGeometry.xml`, LEAF, FAASR3D) |
| NRCS Web Soil Survey | Subgrade properties (CBR, E, k) |
| NOAA NCEI Climate Normals 1991-2020 | Air Freezing Index for frost analysis |

## Key APIs used (no auth required)

- FAA ArcGIS: `https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/`
- NRCS Soil Data: `https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest`
- NOAA Climate Normals: `https://www.ncei.noaa.gov/data/normals-daily/1991-2020/`

## License / use

Coursework deliverable for CEE 598. Not for redistribution. FAARFIELD libraries used under the FAA's standard terms; FAA-supplied data under the grad-student dataset terms.

---

*Initialized: 2026-04-24*
