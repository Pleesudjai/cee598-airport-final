# Spec: CDF Analysis for All 6 Airports (13 Sections)

## What / Why
Extend the KLHX Python script to analyze all remaining 5 airports (11 sections). Produce CDF results for every section so the website report has complete data. Same methodology as KLHX — no simplifications.

## Airports & Sections

### KLHX — La Junta Municipal (DONE)
- Section 6627: 2.5" AC + 6" PCC → CDF = 10.15 → UNDER-DESIGNED
- Section 7347: 2" AC + 10" PCC → CDF = 0.0096 → OVER-DESIGNED

### KPUB — Pueblo Memorial (TODO)
- Section 6948: 2.5" AC + 7" PCC + 6" P-154 Subbase
- Subgrade: Bedrock/Shale, CBR = 12, E = 18,000 psi
- Traffic sheet: Traffic364 (1,229 records — heavy mix: B737/B738, C-130, C-17, many GA)
- Growth rate: -0.7% CAGR

### KMQJ — Indianapolis Regional (TODO)
- Section 8662: 3.5" AC + 8" PCC + 6" Stabilized Base (Econocrete)
- Section 8881: 3.5" AC + 8" PCC + 6" Stabilized Subbase (Econocrete)
- Section 8640: 3.5" AC + 8" PCC + 6" Stabilized Base (Econocrete)
- Section 8780: 3.5" AC + 8" PCC + 6" Stabilized Base (Econocrete)
- Subgrade: Silty Clay, CBR = 4, E = 6,000 psi
- Traffic sheet: Traffic378 (885 records — mid-range GA, business jets)
- Growth rate: +0.5% CAGR
- Note: All 4 sections have identical layer structure (3.5" AC + 8" PCC + 6" Stab). CDF will differ only if traffic differs per section. Use same traffic for all 4.

### KCIU — Chippewa County International (TODO)
- Section 21222: 2.5" AC + 24" PCC
- Subgrade: Fine Sand, CBR = 20, E = 30,000 psi
- Traffic sheet: Traffic1017 (468 records — commuter CRJ2, SF34, some GA)
- Growth rate: -0.1% CAGR

### KOTM — Ottumwa Regional (TODO)
- Section 28171: 2.5" AC + 8" PCC (Taxiway)
- Section 27450: 3" AC + 9" PCC (Runway)
- Section 27641: 3" AC + 8" PCC (Runway)
- Subgrade: Silty Clay Loam, CBR = 4, E = 6,000 psi
- Traffic sheet: Traffic1356 (395 records — GA dominated)
- Growth rate: -2.2% CAGR

### KMWH — Grant County International (TODO)
- Section 37325: 2" AC + 6" PCC + 12" Aggregate Base (Runway, width 15.24m)
- Section 37508: 2" AC + 6" PCC + 12" Aggregate Base (Runway, width 45.72m)
- Subgrade: Gravelly Coarse Sand, CBR = 40, E = 50,000 psi (was 60,000 in CLAUDE.md, using conservative)
- Traffic sheet: Traffic1863 (2,293 records — heavy military C-17, KC-135, commercial)
- Growth rate: -0.5% CAGR

## Layer Definitions (for the script)

### KPUB Section 6948
```python
layers = [
    {'type': 'P-401 AC Overlay',   'h': 2.5,  'E': 200_000,   'nu': 0.35},
    {'type': 'P-501 PCC',          'h': 7.0,  'E': 4_000_000, 'nu': 0.15},
    {'type': 'P-154 Subbase',      'h': 6.0,  'E': 40_000,    'nu': 0.35},
    {'type': 'Subgrade',           'h': 9999, 'E': 18_000,    'nu': 0.40},
]
```

### KMQJ Sections 8662/8881/8640/8780 (all identical structure)
```python
layers = [
    {'type': 'P-401 AC Overlay',   'h': 3.5,  'E': 200_000,   'nu': 0.35},
    {'type': 'P-501 PCC',          'h': 8.0,  'E': 4_000_000, 'nu': 0.15},
    {'type': 'Stabilized Base',    'h': 6.0,  'E': 500_000,   'nu': 0.20},
    {'type': 'Subgrade',           'h': 9999, 'E': 6_000,     'nu': 0.45},
]
```
Note: Econocrete is a cement-treated base. FAARFIELD default for P-304 Cement Treated Base = 500,000 psi. Poisson = 0.20.

### KCIU Section 21222
```python
layers = [
    {'type': 'P-401 AC Overlay',   'h': 2.5,  'E': 200_000,   'nu': 0.35},
    {'type': 'P-501 PCC',          'h': 24.0, 'E': 4_000_000, 'nu': 0.15},
    {'type': 'Subgrade',           'h': 9999, 'E': 30_000,    'nu': 0.35},
]
```

### KOTM Section 28171 (Taxiway)
```python
layers = [
    {'type': 'P-401 AC Overlay',   'h': 2.5,  'E': 200_000,   'nu': 0.35},
    {'type': 'P-501 PCC',          'h': 8.0,  'E': 4_000_000, 'nu': 0.15},
    {'type': 'Subgrade',           'h': 9999, 'E': 6_000,     'nu': 0.45},
]
```

### KOTM Section 27450 (Runway)
```python
layers = [
    {'type': 'P-401 AC Overlay',   'h': 3.0,  'E': 200_000,   'nu': 0.35},
    {'type': 'P-501 PCC',          'h': 9.0,  'E': 4_000_000, 'nu': 0.15},
    {'type': 'Subgrade',           'h': 9999, 'E': 6_000,     'nu': 0.45},
]
```

### KOTM Section 27641 (Runway)
```python
layers = [
    {'type': 'P-401 AC Overlay',   'h': 3.0,  'E': 200_000,   'nu': 0.35},
    {'type': 'P-501 PCC',          'h': 8.0,  'E': 4_000_000, 'nu': 0.15},
    {'type': 'Subgrade',           'h': 9999, 'E': 6_000,     'nu': 0.45},
]
```

### KMWH Section 37325 (Runway, narrow)
```python
layers = [
    {'type': 'P-401 AC Overlay',   'h': 2.0,  'E': 200_000,   'nu': 0.35},
    {'type': 'P-501 PCC',          'h': 6.0,  'E': 4_000_000, 'nu': 0.15},
    {'type': 'P-209 Aggregate Base','h': 12.0, 'E': 75_000,    'nu': 0.35},
    {'type': 'Subgrade',           'h': 9999, 'E': 50_000,    'nu': 0.30},
]
```

### KMWH Section 37508 (Runway, wide)
```python
layers = [
    {'type': 'P-401 AC Overlay',   'h': 2.0,  'E': 200_000,   'nu': 0.35},
    {'type': 'P-501 PCC',          'h': 6.0,  'E': 4_000_000, 'nu': 0.15},
    {'type': 'P-209 Aggregate Base','h': 12.0, 'E': 75_000,    'nu': 0.35},
    {'type': 'Subgrade',           'h': 9999, 'E': 50_000,    'nu': 0.30},
]
```

## Traffic Sheet Mapping

| Airport | Excel Sheet | Growth Rate |
|---------|------------|-------------|
| KLHX | Traffic346 | +3.2% |
| KPUB | Traffic364 | -0.7% |
| KMQJ | Traffic378 | +0.5% |
| KCIU | Traffic1017 | -0.1% |
| KOTM | Traffic1356 | -2.2% |
| KMWH | Traffic1863 | -0.5% |

## Defaults (same for all)
- PCC Flexural Strength: 700 psi
- Design Life: 20 years
- Wander Sigma: 30.435 inches
- All aircraft included (no weight filter)

## Implementation Steps

1. **Refactor KLHX script into reusable module**
   - Extract `analyze_section()` and all failure/strain functions into `scripts/faarfield_engine.py`
   - Keep KLHX-specific data in `scripts/klhx_cdf_analysis.py` (already done)

2. **Create master analysis script** (`scripts/all_airports_cdf.py`)
   - Import engine from `faarfield_engine.py`
   - Define all 13 sections with layer structures (from this spec)
   - Load traffic from each Excel sheet
   - Map traffic sheet to sections:
     - Traffic346 → KLHX sections (6627, 7347)
     - Traffic364 → KPUB section (6948)
     - Traffic378 → KMQJ sections (8662, 8881, 8640, 8780)
     - Traffic1017 → KCIU section (21222)
     - Traffic1356 → KOTM sections (28171, 27450, 27641)
     - Traffic1863 → KMWH sections (37325, 37508)

3. **Run analysis for each section**
   - Loop over all 13 sections
   - Call `analyze_section()` with correct layers + traffic + growth rate
   - Collect results

4. **Generate output files**
   - `results/ALL_CDF_Summary.md` — one-page summary table (all 13 sections)
   - `results/[ICAO]_CDF_Results.md` — per-airport detail (same format as KLHX)
   - `results/[ICAO]_CDF_Full_Output.txt` — full console output per airport
   - `results/cdf_results.json` — machine-readable for website consumption

5. **Verify results**
   - Check that KLHX results match previous run
   - Sanity check: airports with thick PCC (KCIU 24") should have very low CDF
   - Sanity check: airports with heavy traffic + thin PCC should have high CDF
   - Sanity check: negative growth rate airports may have lower CDF than positive growth

## Expected Results (educated guesses)

| Airport | Section | PCC Thick | Subgrade | Heavy Traffic? | Expected CDF |
|---------|---------|-----------|----------|---------------|-------------|
| KLHX | 6627 | 6" | Fair | Light + C-130 | ~10 (UNDER) — confirmed |
| KLHX | 7347 | 10" | Fair | Light + C-130 | ~0.01 (OVER) — confirmed |
| KPUB | 6948 | 7" | Good (rock) | Heavy (B737s, C-130) | Likely UNDER — thin PCC + heavy jets |
| KMQJ | all 4 | 8" | Poor | Medium (GA/biz) | Borderline — poor soil but lighter traffic |
| KCIU | 21222 | 24" | Good (sand) | Medium (CRJ, commuter) | Very OVER — massive 24" PCC |
| KOTM | 28171 | 8" | Poor | Light GA | Likely OVER — light traffic |
| KOTM | 27450 | 9" | Poor | Light GA | Likely OVER — light traffic |
| KOTM | 27641 | 8" | Poor | Light GA | Likely OVER — light traffic |
| KMWH | 37325 | 6" | Excellent | Heavy (C-17, KC-135) | Likely UNDER — thin PCC + very heavy military |
| KMWH | 37508 | 6" | Excellent | Heavy (C-17, KC-135) | Likely UNDER — same |

## Out of Scope
- Re-running KLHX (already done — reuse results)
- Design thickness iteration (only CDF at existing thickness)
- Sensitivity analysis (could be added later)

## Execution
Run: `/execute specs/all-airports-cdf.md`
Output: `results/` with all 13 section results + summary + JSON for website
