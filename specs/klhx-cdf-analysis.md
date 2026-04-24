# Spec: KLHX (La Junta) CDF Analysis in Python

## What / Why
Replicate FAARFIELD's CDF calculation in Python for La Junta Municipal Airport (KLHX) — 2 pavement sections. Determine if each section is over-designed or under-designed by computing CDF for the existing layer structure under the given traffic. Must match FAARFIELD methodology exactly — no simplifications or shortcuts.

## Inputs Available

### Section 6627 (Taxiway TALJ)
- Layer 1 (top): AC overlay — 2.5" — E = 200,000 psi — v = 0.35
- Layer 2: PCC P-501 — 6.0" — E = 4,000,000 psi — v = 0.15
- Subgrade: Silt Loam — E = 10,500 psi (CBR 7) — v = 0.40

### Section 7347 (Taxiway TALJ)
- Layer 1 (top): AC overlay — 2.0" — E = 200,000 psi — v = 0.35
- Layer 2: PCC P-501 — 10.0" — E = 4,000,000 psi — v = 0.15
- Subgrade: Silt Loam — E = 10,500 psi (CBR 7) — v = 0.40

### Traffic (79 aircraft types, 3,504 total departures over 2014-2021)
**All aircraft included — no weight filter.** Same as FAARFIELD.

Top contributors by weight x departures:
- DV20: 1,764 lbs, S gear, 2,940 deps (84% of departures)
- C130: 155,000 lbs, 2D gear, 5 deps (heaviest)
- EA50: 39,595 lbs, S gear, 7 deps
- CL30: 37,478 lbs, D gear, 1 dep
- CRJ9: 80,500 lbs, D gear, 1 dep
- SW4: 14,500 lbs, D gear, 23 deps
- BE20: 12,500 lbs, D gear, 11 deps
- BE9L: 10,097 lbs, D gear, 10 deps
- Plus 71 more aircraft types of all weights

### Growth Rate
CAGR ~3.2% (at 20-year design life from 2014 base)
Design life: 20 years

### Defaults
- PCC Flexural Strength: 700 psi
- SCI: 80

## Outputs Expected
1. CDF for Section 6627 — **all three failure modes:**
   - AC fatigue (horizontal tensile strain at AC bottom)
   - Subgrade rutting (vertical compressive strain at subgrade)
   - PCC fatigue (bending stress in concrete slab)
2. CDF for Section 7347 — same three failure modes
3. Which failure mode controls (maximum CDF)
4. Over-designed (CDF < 1) or Under-designed (CDF > 1) determination
5. Summary table with per-aircraft CDF contribution
6. Save results to `results/`

## Architecture Plan

### Module 1: Layered Elastic Analysis (LEAF)
Use **hybrid approach** matching FAARFIELD's methodology for HMA Overlay on Rigid:
- **Odemark equivalent thickness** for subgrade vertical strain (eps_z)
- **Westergaard slab theory** for PCC bending stress (sigma_pcc)
- **Burmister 2-layer** for AC horizontal strain (eps_h)

This matches FAARFIELD's approach for overlay sections: Odemark for subgrade response, Westergaard for rigid slab stress.

**Odemark (subgrade strain):**
```
h_eq = sum(0.9 * h_i * (E_i / E_subgrade)^(1/3)) for each layer above subgrade
sigma_z = q * [1 - 1/(1 + (a/h_eq)^2)^1.5]
eps_z = sigma_z / E_subgrade
```

**Westergaard (PCC stress):**
```
ell = (E_pcc * h_pcc^3 / (12 * (1-nu^2) * k))^0.25   (radius of relative stiffness)
sigma_pcc = 3*(1+nu)*P / (pi*h^2) * (ln(ell/a) + 0.6159)   (interior loading)
```

**AC strain (Burmister-based):**
```
eps_h at AC bottom from modulus ratio and geometry of AC on stiff PCC support
```

### Module 2: Failure Models (exact FAARFIELD constants from source code)

**AC Fatigue (FAARFIELD Traditional — modCDF.vb):**
```python
log10(Nf) = 2.68 - 5.0 * log10(eps_h) - 2.665 * log10(E_ac)
Nf_ac = 10 ** log10_Nf
```

**Subgrade Rutting (FAARFIELD Standard — modCDF.vb):**
```python
AA = 0.000247 + 0.000245 * log10(E_subgrade)
BB = 0.0658 * (E_subgrade ** 0.559)
Nf_sub = 10000 * (AA / eps_v) ** BB
```

**PCC Fatigue (FAA standard):**
```python
SR = sigma_pcc / flexural_strength
if SR < 0.45: Nf = unlimited (infinite life)
if SR >= 0.45: log10(Nf) = 11.737 - 12.077 * SR
```

### Module 3: Coverage-to-Pass Ratio (FAARFIELD standard)

```python
# Standard FAARFIELD wander: sigma = 30.435 inches
ctp = tire_width / (sqrt(2*pi) * 30.435)
```

### Module 4: CDF Computation

**Per aircraft (all aircraft, no filter):**
```python
# Design departures over life with growth
design_deps = annual_deps * ((1 + growth_rate)^20 - 1) / growth_rate

# Tire load
tire_load = MTOW * mg_percent / n_tires

# CDF contribution
coverages = design_deps * coverage_to_pass
cdf_ac_i = coverages / Nf_ac
cdf_sub_i = coverages / Nf_sub
cdf_pcc_i = coverages / Nf_pcc
```

**Total CDF:**
```python
CDF_ac = sum(cdf_ac_i for all aircraft)
CDF_sub = sum(cdf_sub_i for all aircraft)
CDF_pcc = sum(cdf_pcc_i for all aircraft)
CDF_max = max(CDF_ac, CDF_sub, CDF_pcc)
```

### Module 5: Aircraft Parameters
- Gear config mapping: S, D, 2D, etc. → n_tires, tire_pressure
- Main gear percentage: 95% default (FAARFIELD standard)
- Special cases for known aircraft (C-130, C-17, etc.)

### Module 6: Results Output
- Print full per-aircraft table (all aircraft, sorted by CDF contribution)
- Print summary: CDF per failure mode, controlling mode, verdict
- Save to `results/KLHX_CDF_Results.md` and `results/KLHX_CDF_Full_Output.txt`

## Implementation Steps

1. **Set up Python script structure** (`scripts/klhx_cdf_analysis.py`)
   - Import numpy, scipy, pandas
   - Define FAARFIELD constants (failure model coefficients, material defaults)

2. **Define pavement sections** (layer thicknesses, moduli, Poisson ratios)
   - Section 6627: [2.5" AC, 6" PCC, subgrade]
   - Section 7347: [2" AC, 10" PCC, subgrade]

3. **Load traffic data** from Excel
   - Read Traffic346 sheet
   - Aggregate by aircraft type (sum departures, get MTOW/gear)
   - **Include ALL aircraft — no MTOW filter** (same as FAARFIELD)
   - Compute average annual departures (total deps / 8 years)

4. **Implement strain calculations**
   - Odemark equivalent thickness → subgrade vertical strain
   - Westergaard slab analysis → PCC bending stress
   - Burmister-based → AC horizontal strain

5. **Implement all three failure models**
   - AC fatigue (FAARFIELD Traditional constants)
   - Subgrade rutting (FAARFIELD Standard constants)
   - PCC fatigue (FAA stress ratio model)

6. **Compute CDF for each section**
   - Loop over ALL aircraft
   - Calculate tire load, contact area, strain/stress responses
   - Calculate Nf for all three failure modes
   - Sum CDF contributions
   - Report maximum CDF and controlling failure mode

7. **Generate results** and save to `results/`

## Out of Scope
- Full FAARFIELD GUI replication
- Design thickness iteration (we only need CDF at existing thickness)
- Multiple lateral offsets (use single critical offset — conservative)
- Full Burmister transfer matrix (hybrid Odemark/Westergaard matches FAARFIELD overlay approach)

## Execution
Run: `/execute specs/klhx-cdf-analysis.md`
Output: `scripts/klhx_cdf_analysis.py` + `results/KLHX_CDF_Results.md` + `results/KLHX_CDF_Full_Output.txt`
