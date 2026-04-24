---
paths:
  - "central brain/**"
  - "scripts/**"
  - "AO_CEE598_FAARFIELD.xlsx"
---

# Data Collection Rules

## Data Sources
- Excel: AO_CEE598_FAARFIELD.xlsx (given data — pavement, traffic, growth rates)
- FAA ArcGIS REST API (airport locations, runway dimensions — no auth)
- NRCS SDA API (soil/subgrade data — no auth)
- FAA ACD (aircraft characteristics — downloadable xlsx)
- FAA AIP grants (maintenance history — downloadable xlsx per year)

## Subgrade Method
Using **Method 1: Single layer at pavement bottom** (NRCS horizon where pavement ends).
Two alternatives available if needed: weighted average, or weakest layer within 1.5x depth.

## Aircraft Matching
- Excel uses ICAO codes (B738, C172)
- FAARFIELD uses full names (B737-800, Skyhawk-172)
- FAA ACD provides the bridge (ICAO -> MTOW, gear, dimensions)
- Aircraft under 6,000 lbs: negligible damage, use Generic S-5 or skip

## File Conventions
- Research notes: central brain/*.md
- Downloaded data: central brain/*.xlsx, *.json
- Python scripts: scripts/*.py
- Use `py` not `python3` on this Windows machine
