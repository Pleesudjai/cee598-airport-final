# Spec: KLHX (La Junta) CDF Analysis in Python

## What / Why
Replicate FAARFIELD's CDF calculation in Python for La Junta Municipal Airport (KLHX) — 2 pavement sections. Determine if each section is over-designed or under-designed by computing CDF for the existing layer structure under the given traffic.

## Inputs Available

### Section 6627 (Taxiway TALJ)
- Layer 1 (top): AC overlay — 2.5" — E = 200,000 psi — v = 0.35
- Layer 2: PCC P-501 — 6.0" — E = 4,000,000 psi — v = 0.15
- Subgrade: Silt Loam — E = 10,500 psi (CBR 7) — v = 0.35

### Section 7347 (Taxiway TALJ)
- Layer 1 (top): AC overlay — 2.0" — E = 200,000 psi — v = 0.35
- Layer 2: PCC P-501 — 10.0" — E = 4,000,000 psi — v = 0.15
- Subgrade: Silt Loam — E = 10,500 psi (CBR 7) — v = 0.35

### Traffic (79 aircraft types, 3,504 total departures over 2014-2021)
Top contributors by weight x departures:
- DV20: 1,764 lbs, S gear, 2,940 deps (negligible — 84% of departures but tiny plane)
- C130: 155,000 lbs, 2D gear, 5 deps (heaviest — drives design)
- EA50: 39,595 lbs, S gear, 7 deps
- CL30: 37,478 lbs, D gear, 1 dep
- CRJ9: 80,500 lbs, D gear, 1 dep
- SW4: 14,500 lbs, D gear, 23 deps
- BE20: 12,500 lbs, D gear, 11 deps
- BE9L: 10,097 lbs, D gear, 10 deps
- Most other aircraft: under 6,000 lbs (negligible)

### Growth Rate
CAGR ~3.2% (at 20-year design life from 2014 base)
Design life: 20 years

## Outputs Expected
1. CDF for Section 6627 (AC fatigue + subgrade rutting)
2. CDF for Section 7347 (AC fatigue + subgrade rutting)
3. Which failure mode controls (AC fatigue or subgrade rutting)
4. Over-designed (CDF < 1) or Under-designed (CDF > 1) determination
5. Summary table with per-aircraft CDF contribution

## Architecture Plan

### Module 1: Layered Elastic Analysis (LEAF substitute)
Since implementing the full Burmister multi-layer elastic solution is complex, use one of:
- **Option A:** `pynumeric` or `scipy` to solve Burmister equations for 3-layer system
- **Option B:** Use the closed-form Odemark-Boussinesq approximation (simpler, ~90% accuracy)
- **Option C:** Use the `pavement` Python package if available (pip install pavement)

**Recommended: Option B (Odemark method)** — Transforms multi-layer system into equivalent single layer, then uses Boussinesq. Good enough for CDF estimation.

**Odemark Method:**
```
h_eq = sum(h_i * (E_i / E_subgrade)^(1/3)) for each layer i above subgrade
Vertical strain at subgrade: eps_z = (3 * P) / (2 * pi * E_sg * (h_eq + z)^2)
  where P = tire load, z = 0 (top of subgrade)
Horizontal strain at AC bottom: eps_h from Burmister 2-layer or 3-layer tables
```

### Module 2: Failure Models (from FAARFIELD source)

**AC Fatigue (Traditional FAARFIELD model):**
```python
log10_Nf = 2.68 - 5.0 * log10(eps_h) - 2.665 * log10(E_ac)
Nf_ac = 10 ** log10_Nf
```

**Subgrade Rutting (Standard model):**
```python
AA = 0.000247 + 0.000245 * log10(E_subgrade)
BB = 0.0658 * (E_subgrade ** 0.559)
Nf_sub = 10000 * (AA / eps_v) ** BB
```

### Module 3: CDF Computation

**Per aircraft:**
```python
# Convert annual departures to design departures over 20 years
design_deps = annual_deps * ((1 + growth_rate)^20 - 1) / growth_rate

# Tire load
tire_load = MTOW * mg_percent / n_tires

# Coverage-to-pass ratio (simplified — single wander width)
# Using standard FAARFIELD wander: sigma = 30.435 inches
ctp = tire_width / (sqrt(2*pi) * sigma_wander)  # simplified Gaussian

# CDF contribution per aircraft
cdf_i = design_deps * ctp / Nf
```

**Total CDF:**
```python
CDF_total = sum(cdf_i for each aircraft)
```

### Module 4: Results

Compare CDF against 1.0:
- CDF < 1.0 → over-designed
- CDF > 1.0 → under-designed

## Implementation Steps

1. **Set up Python script structure** (`scripts/klhx_cdf_analysis.py`)
   - Import numpy, math
   - Define constants (material properties, failure model coefficients)

2. **Define pavement sections** (layer thicknesses, moduli, Poisson ratios)
   - Section 6627: [2.5" AC, 6" PCC, subgrade]
   - Section 7347: [2" AC, 10" PCC, subgrade]

3. **Load traffic data** from Excel
   - Read Traffic346 sheet
   - Aggregate by aircraft type (sum departures, get MTOW/gear)
   - Filter: only aircraft with MTOW > 6,000 lbs (skip negligible light GA)
   - Compute average annual departures

4. **Implement Odemark equivalent thickness method**
   - Transform multi-layer to equivalent depth
   - Compute vertical strain at subgrade (eps_z)
   - Compute horizontal strain at AC bottom (eps_h)

5. **Implement failure models**
   - AC fatigue: Nf = 10^(2.68 - 5.0*log(eps_h) - 2.665*log(E_ac))
   - Subgrade rutting: Nf = 10000 * (AA/eps_v)^BB

6. **Compute CDF for each section**
   - Loop over significant aircraft
   - Calculate tire load, contact area, strain response
   - Calculate Nf for both failure modes
   - Sum CDF contributions
   - Report controlling failure mode

7. **Generate results table and over/under determination**

8. **Save results** to `central brain/KLHX_CDF_Results.md`

## Open Questions
1. For HMA Overlay on Rigid — should we check PCC fatigue (slab stress) in addition to AC fatigue and subgrade rutting? FAARFIELD source suggests both are checked for overlays.
2. The Odemark method is an approximation. For a class project, this should be acceptable. For exact FAARFIELD replication, we'd need the full Burmister numerical solution.
3. Main gear percentage: the Excel provides gear config (S/D/2D) but not exact mg%. Use FAA ACD default ~95% for most aircraft.

## Out of Scope
- Full FAARFIELD GUI replication
- Rigid pavement stress (Westergaard) — all sections are flexible analysis
- Design thickness iteration (we only need CDF at existing thickness)
- Multiple lateral offsets (use single critical offset for simplicity)

## Execution
Run: `/execute specs/klhx-cdf-analysis.md`
Output: `scripts/klhx_cdf_analysis.py` + `central brain/KLHX_CDF_Results.md`
