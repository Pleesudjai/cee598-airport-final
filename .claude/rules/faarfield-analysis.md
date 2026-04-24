---
paths:
  - "FAARFIELD_2.1.1_SourceCode/**"
  - "specs/**"
---

# FAARFIELD Analysis Rules

## Analysis Type
All 13 sections are **HMA Overlay on Rigid** (AC over PCC composite, classified as Flexible).

## Required Inputs per Section
1. Layer structure: type, thickness, modulus (auto-assigned by material)
2. Subgrade: CBR or k-value or E-modulus (from NRCS data)
3. Aircraft mix: type, MTOW, gear config, annual departures
4. Growth rate: CAGR from TAF data
5. Design life: 20 years (standard)
6. PCC flexural strength: default 700 psi
7. SCI: default 80

## FAARFIELD Material Defaults
- P-401/P-403 AC: E = 200,000 psi
- P-501 PCC: E = 4,000,000 psi
- P-154 Aggregate: E = 40,000 psi
- P-209 Crushed Aggregate: E = 75,000 psi
- Econocrete/Stabilized: E = 250,000-700,000 psi

## Subgrade Conversions
- E = 1500 x CBR (default)
- k = (E / 20.15)^(1/1.28405)

## Output Interpretation
- CDF < 1.0 = over-designed (adequate)
- CDF = 1.0 = exactly meets design life
- CDF > 1.0 = under-designed (fails before design life)

## Source Code Key Files
- Aircraft library: FF2/Defaults/Aircraft/aircraft.csv (252 entries)
- Aircraft XML: FF2/Defaults/Aircraft/aircraft.xml (408 variants)
- Section model: FaarFieldModel/Section.vb
- CDF computation: FaarFieldAnalysis/modCDF.vb
- LEAF solver: LEAFClassLib/clsLEAF.vb
