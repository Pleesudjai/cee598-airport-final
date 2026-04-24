# NRCS Web Soil Survey Data for Airport Subgrade

## API Used
**USDA NRCS Soil Data Access (SDA) REST API**
- Web Soil Survey: https://websoilsurvey.nrcs.usda.gov/app/WebSoilSurvey.aspx
- API Endpoint: `https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest`
- Source: SSURGO (Soil Survey Geographic Database)
- No authentication required

## Airport Coordinates (Decimal Degrees, from FAA ArcGIS)

| ICAO | Airport | Latitude | Longitude |
|------|---------|----------|-----------|
| KLHX | La Junta Municipal | 38.05000 | -103.50975 |
| KPUB | Pueblo Memorial | 38.28994 | -104.49803 |
| KMQJ | Indianapolis Regional | 39.84314 | -85.89773 |
| KCIU | Chippewa County Intl | 46.25075 | -84.47239 |
| KOTM | Ottumwa Regional | 41.10722 | -92.44717 |
| KMWH | Grant County Intl | 47.20858 | -119.31914 |

---

## CRITICAL: Which Layer Is the Subgrade?

The NRCS gives soil horizons from the **natural ground surface down**. The subgrade for FAARFIELD is the soil directly **below the bottom of all pavement layers**. The correct subgrade layer depends on total pavement thickness.

### Three Methods for Selecting the Subgrade Layer

FAARFIELD models the subgrade as a **single semi-infinite layer** — it represents everything below the pavement structure. In practice there are three approaches:

| Method | Description | When to Use |
|--------|-------------|-------------|
| **1. Single layer at pavement bottom** | Use the NRCS horizon where the pavement ends | Most common for a quick estimate. **We use this method.** |
| **2. Weighted average of all layers below pavement** | Average properties of all horizons below the pavement, weighted by layer thickness | More representative if soil varies significantly with depth |
| **3. Weakest layer within ~1.5x pavement depth** | Use the horizon with the lowest CBR within 1.5x the total pavement depth below the surface | Most conservative — accounts for stress influence zone extending below the direct subgrade |

**Decision: We go with Method 1** (single layer at pavement bottom) because FAARFIELD treats subgrade as one uniform layer, aircraft stress concentrates in the first 1-2 ft below the pavement, and the NRCS data is already approximate (survey data, not actual borings). If results are borderline, Methods 2 or 3 can be used as sensitivity checks.

| Section | Total Pavement | Depth to Subgrade | NRCS Horizon at That Depth |
|---------|---------------|-------------------|-----------------------------|
| KLHX-6627 | 8.5" (22 cm) | ~22 cm | **Bw: Silt Loam** (15-51 cm) |
| KLHX-7347 | 12.0" (30 cm) | ~31 cm | **Bw: Silt Loam** (15-51 cm) |
| KPUB-6948 | 15.5" (39 cm) | ~39 cm | **Cr: Bedrock** (starts at 25 cm) |
| KMQJ (all 4) | 17.5" (44 cm) | ~45 cm | **2Bt: Silty Clay** (36-71 cm) |
| KCIU-21222 | 26.5" (67 cm) | ~67 cm | **BC: Fine Sand** (56-79 cm) |
| KOTM-28171 | 10.5" (27 cm) | ~27 cm | **A1: Silty Clay Loam** (23-41 cm) |
| KOTM-27450 | 12.0" (30 cm) | ~31 cm | **A1: Silty Clay Loam** (23-41 cm) |
| KOTM-27641 | 11.0" (28 cm) | ~28 cm | **A1: Silty Clay Loam** (23-41 cm) |
| KMWH (both) | 20.0" (51 cm) | ~51 cm | **H4: Ext. Gravelly Coarse Sand** (46-152 cm) |

---

## Complete Soil Profiles with Sieve Data

### KLHX — La Junta Municipal (CO)

**Map Unit: Minnequa loam, dry, 1-5% slopes (85% of area)**
- Taxonomy: Fine-silty, mixed, superactive, mesic Ustic Haplocalcids
- Hydrologic Group: **C**
- Drainage: Well drained

| Hz | Depth (cm) | USDA Texture | Sand% | Silt% | Clay% | LL | PI | #4 | #10 | #40 | #200 | Ksat (um/s) | Bulk D (g/cm3) | OM% | LEP |
|----|-----------|-------------|-------|-------|-------|----|----|-----|------|------|------|-------------|---------------|------|------|
| A | 0–15 | Loam (L) | 35 | 44 | 21 | 33 | 13 | 100 | 100 | 100 | 81 | 23 | 1.44 | 1.25 | 2.4 |
| **Bw** | **15–51** | **Silt Loam (SIL)** | **10** | **67** | **23** | **33** | **14** | **98** | **96** | **96** | **90** | **9** | **1.42** | **0.5** | **2.5** |
| Bk | 51–89 | Loam (L) | 35 | 42 | 23 | 32 | 13 | 96 | 91 | 91 | 73 | 9 | 1.48 | 0.25 | 2.2 |
| Cr | 89–152 | Bedrock (BR) | - | - | - | - | - | - | - | - | - | 3 | - | - | - |

**Bold = Subgrade layer for sections 6627 and 7347**

NRCS Engineering Ratings:
- Local Roads and Streets: **Somewhat limited** (frost action, low strength)
- Unpaved Roads: **Somewhat limited** (frost action, dusty, low strength)
- Roadfill: **Poor** (depth to bedrock, low strength)
- Construction Materials - Sand/Gravel Source: **Poor**

**AASHTO Classification:** #200 = 90%, LL = 33, PI = 14 → **A-6(9)** (clayey silt loam)

---

### KPUB — Pueblo Memorial (CO)

**Map Unit: Midway, dry - Rock outcrop complex (60% Midway)**
- Taxonomy: Shallow clay over shale bedrock
- Hydrologic Group: **D**
- Drainage: Well drained

| Hz | Depth (cm) | USDA Texture | Sand% | Silt% | Clay% | LL | PI | #4 | #10 | #40 | #200 | Ksat (um/s) | Bulk D | OM% | LEP |
|----|-----------|-------------|-------|-------|-------|----|----|-----|------|------|------|-------------|--------|------|------|
| A | 0–5 | Clay Loam (CL) | 32 | 31 | 37 | 50 | 26 | 100 | 100 | 99 | 78 | 3 | 1.42 | 1.5 | 6.3 |
| C | 5–25 | Clay (C) | 26 | 29 | 45 | 54 | 31 | 100 | 100 | 98 | 82 | 1 | 1.30 | 0.25 | 7.6 |
| **Cr** | **25–200** | **Bedrock (BR/Shale)** | **-** | **-** | **-** | **-** | **-** | **-** | **-** | **-** | **-** | **0.2** | **-** | **-** | **-** |

Minor component: Razor (10%) — Clay Loam/Silty Clay/Clay over bedrock at 76 cm. Same pattern: high-plasticity clay over shallow shale.

**Bold = Subgrade layer. Bedrock starts at 25 cm (10"). Total pavement is 15.5" (39 cm). Pavement sits ON bedrock.**

NRCS Engineering Ratings:
- Local Roads and Streets: **Very limited** (depth to soft bedrock, low strength)
- Unpaved Roads: **Somewhat limited** (depth to bedrock, dusty)
- Small Commercial Buildings: **Very limited** (depth to soft bedrock)
- Roadfill: **Poor** (depth to bedrock, low strength)
- Shallow Excavations: **Very limited** (depth to soft bedrock)

**AASHTO Classification of overburden:** #200 = 82%, LL = 54, PI = 31 → **A-7-6(20)**
**But subgrade is BEDROCK (shale)** — in FAARFIELD, treat as high-strength subgrade. However, the shale is **soft bedrock** (weathered), so effective CBR may be moderate. Conservative estimate: **CBR ~10-15** for weathered shale.

---

### KMQJ — Indianapolis Regional (IN)

**Map Unit: Crosby silt loam, New Castle Till Plain (80%)**
- Taxonomy: Fine, mixed, active, mesic Aeric Epiaqualfs
- Hydrologic Group: **C/D**
- Drainage: Somewhat poorly drained

| Hz | Depth (cm) | USDA Texture | Sand% | Silt% | Clay% | LL | PI | #4 | #10 | #40 | #200 | Ksat (um/s) | Bulk D | OM% | LEP |
|----|-----------|-------------|-------|-------|-------|----|----|-----|------|------|------|-------------|--------|------|------|
| Ap | 0–20 | Silt Loam (SIL) | 18 | 64 | 18 | 33 | 12 | 100 | 100 | 96 | 85 | 9.17 | 1.45 | 2.5 | 1.5 |
| BE | 20–28 | Silt Loam (SIL) | 20 | 63 | 17 | 30 | 11 | 96 | 91 | 86 | 75 | 9.17 | 1.45 | 1.5 | 1.4 |
| Bt | 28–36 | Silt Loam (SIL) | 20 | 55 | 25 | 36 | 17 | 97 | 92 | 85 | 75 | 9.17 | 1.55 | 0.75 | 2.4 |
| **2Bt** | **36–71** | **Silty Clay (SIC)** | **18** | **42** | **40** | **50** | **28** | **95** | **86** | **82** | **72** | **9.17** | **1.55** | **0.75** | **5.0** |
| 2BCt | 71–91 | Loam (L) | 33.5 | 40.5 | 26 | 35 | 16 | 88 | 85 | 75 | 60 | 0.92 | 1.65 | 0.25 | 2.2 |
| 2Cd | 91–200 | Loam (L) | 42 | 40.5 | 17.5 | 27 | 10 | 93 | 84 | 75 | 54 | 0.216 | 1.85 | 0.25 | 1.1 |

**Bold = Subgrade layer for all 4 Indianapolis sections (pavement depth ~45 cm falls in 2Bt horizon)**

NRCS Engineering Ratings:
- Local Roads and Streets: **Very limited** (depth to saturated zone, frost action, low strength)
- Unpaved Roads: **Very limited** (depth to saturated zone, frost action, low strength, shrink-swell)
- Dwellings W/O Basements: **Very limited** (depth to saturated zone)
- Roadfill: **Poor** (wetness, low strength, shrink-swell)
- Haul Roads: **Somewhat limited** (somewhat low strength, wetness)
- Road Suitability (Natural Surface): **Moderately suited** (wetness, low strength)

**AASHTO Classification (2Bt layer):** #200 = 72%, LL = 50, PI = 28 → **A-7-6(17)** (high-plasticity clay)
**Estimated CBR: 3–5** (poor subgrade — high clay, high plasticity, poorly drained)

---

### KCIU — Chippewa County International (MI)

**Map Unit: Rousseau, dark subsoil - Urban land complex (60% Liminga)**
- Taxonomy: Sandy, isotic, frigid Typic Haplorthods
- Hydrologic Group: **A**
- Drainage: Well drained

| Hz | Depth (cm) | USDA Texture | Sand% | Silt% | Clay% | LL | PI | #4 | #10 | #40 | #200 | Ksat (um/s) | Bulk D | OM% | LEP |
|----|-----------|-------------|-------|-------|-------|----|----|-----|------|------|------|-------------|--------|------|------|
| Oe | 0–3 | Mucky Peat (MPM) | 5 | 90 | 5 | - | - | 100 | 100 | 100 | 95 | 14 | 0.15 | 75 | - |
| E | 3–18 | Fine Sand (FS) | 94 | 5 | 1 | 0 | NP | 100 | 100 | 70 | 15 | 92 | 1.40 | 1 | 0 |
| Bhs | 18–23 | Fine Sand (FS) | 93 | 4 | 3 | 0 | NP | 100 | 100 | 70 | 15 | 92 | 1.45 | 3 | 0 |
| Bs | 23–56 | Fine Sand (FS) | 95 | 3 | 2 | 0 | NP | 100 | 100 | 70 | 12 | 92 | 1.50 | 2 | 0 |
| **BC** | **56–79** | **Fine Sand (FS)** | **98** | **1.5** | **0.5** | **0** | **NP** | **100** | **100** | **70** | **10** | **92** | **1.55** | **0.25** | **0** |
| C | 79–203 | Fine Sand (FS) | 99 | 0.8 | 0.2 | 0 | NP | 100 | 100 | 70 | 10 | 92 | 1.60 | 0.2 | 0 |

**Bold = Subgrade layer for section 21222 (pavement depth ~67 cm falls in BC horizon)**

NRCS Engineering Ratings:
- Local Roads and Streets: **Not limited**
- Unpaved Roads: **Not limited**
- Dwellings W/O Basements: **Not limited**
- Small Commercial Buildings: **Not limited**
- Roadfill: **Good**
- Sand Source: **Good**
- Haul Roads: **Somewhat limited** (sandiness only)
- Road Suitability (USFS): **Very well suited**

**AASHTO Classification (BC layer):** #200 = 10%, NP → **A-3** (fine sand)
**Estimated CBR: 15–25** (good subgrade — clean sand, well drained, no plasticity)

---

### KOTM — Ottumwa Regional (IA)

**Map Unit: Taintor silty clay loam, 0-2% slopes (90%)**
- Taxonomy: Fine, smectitic, mesic Vertic Argiaquolls
- Hydrologic Group: **D**
- Drainage: Poorly drained

| Hz | Depth (cm) | USDA Texture | Sand% | Silt% | Clay% | LL | PI | #4 | #10 | #40 | #200 | Ksat (um/s) | Bulk D | OM% | LEP |
|----|-----------|-------------|-------|-------|-------|----|----|-----|------|------|------|-------------|--------|------|------|
| Ap | 0–23 | Silty Clay Loam (SICL) | 2 | 68 | 30 | 48 | 21 | 100 | 100 | 100 | 99 | 3 | 1.35 | 4 | 4.2 |
| **A1** | **23–41** | **Silty Clay Loam (SICL)** | **2** | **64** | **34** | **50** | **24** | **100** | **100** | **100** | **99** | **3** | **1.35** | **3** | **5.0** |
| A2 | 41–51 | Silty Clay Loam (SICL) | 2 | 61 | 37 | 52 | 26 | 100 | 100 | 100 | 99 | 0.7 | 1.35 | 2.5 | 6.7 |
| Btg1 | 51–61 | Silty Clay (SIC) | 2 | 57 | 41 | 52 | 30 | 100 | 100 | 100 | 99 | 0.09 | 1.38 | 0.5 | 7.4 |
| Btg2 | 61–71 | Silty Clay (SIC) | 2 | 58 | 40 | 51 | 29 | 100 | 100 | 100 | 99 | 0.09 | 1.38 | 0.5 | 7.1 |
| Btg3 | 71–91 | Silty Clay Loam (SICL) | 2 | 62 | 36 | 47 | 26 | 100 | 100 | 100 | 99 | 0.7 | 1.38 | 0.5 | 6.2 |
| Btg4 | 91–117 | Silty Clay Loam (SICL) | 2 | 65 | 33 | 44 | 23 | 100 | 100 | 100 | 99 | 3 | 1.45 | 0.5 | 4.6 |
| Cg | 117–152 | Silty Clay Loam (SICL) | 2 | 70 | 28 | 39 | 19 | 100 | 100 | 100 | 99 | 3 | 1.45 | 0.5 | 3.6 |

**Bold = Subgrade layer for all 3 Ottumwa sections (pavement 27-31 cm falls in A1 horizon)**

NRCS Engineering Ratings:
- Local Roads and Streets: **Very limited** (depth to saturated zone, shrink-swell, frost action, low strength)
- Unpaved Roads: **Very limited** (saturated zone, shrink-swell, frost action, low strength)
- Dwellings W/O Basements: **Very limited** (saturated zone, shrink-swell)
- Small Commercial Buildings: **Very limited** (saturated zone, shrink-swell)
- Roadfill: **Poor** (wetness, low strength, shrink-swell)
- Haul Roads: **Very limited** (low strength, wetness)
- Road Suitability (Natural Surface): **Poorly suited** (low strength, wetness)

**AASHTO Classification (A1 layer):** #200 = 99%, LL = 50, PI = 24 → **A-7-6(20)** (high-plasticity silty clay)
**Estimated CBR: 3–5** (poor subgrade — very high fines, high plasticity, poorly drained, shrink-swell)

---

### KMWH — Grant County International (WA)

**Map Unit: Malaga stony sandy loam, 0-15% slopes (100%)**
- Taxonomy: Loamy-skeletal, mixed, superactive, mesic Xeric Haplocambids
- Hydrologic Group: **B**
- Drainage: Somewhat excessively drained

| Hz | Depth (cm) | USDA Texture | Sand% | Silt% | Clay% | LL | PI | #4 | #10 | #40 | #200 | Ksat (um/s) | Bulk D | OM% | LEP |
|----|-----------|-------------|-------|-------|-------|----|----|-----|------|------|------|-------------|--------|------|------|
| H1 | 0–15 | Stony Sandy Loam (ST-SL) | 66.6 | 23.4 | 10 | 25 | 2.5 | 87.5 | 82.5 | 72.5 | 42.5 | 9 | 1.30 | 0.75 | 1.5 |
| H2 | 15–28 | Gravelly Sandy Loam (GR-SL) | 66.6 | 23.4 | 10 | 25 | 2.5 | 80 | 65 | 52.5 | 37.5 | 9 | 1.40 | 0.75 | 1.5 |
| H3 | 28–46 | V. Gravelly Sandy Loam (GRV-SL) | 66.6 | 23.4 | 10 | 25 | 2.5 | 45 | 37.5 | 27.5 | 20 | 28 | 1.40 | 0.25 | 1.5 |
| **H4** | **46–152** | **Ext. Gravelly Coarse Sand (GRX-COS)** | **91** | **6.5** | **2.5** | **-** | **NP** | **45** | **37.5** | **22.5** | **5** | **300** | **1.45** | **0.25** | **1.5** |

**Bold = Subgrade layer for both sections (pavement depth ~51 cm falls in H4 horizon)**

NRCS Engineering Ratings:
- Local Roads and Streets: **Not limited**
- Unpaved Roads: **Somewhat limited** (dusty only)
- Dwellings W/O Basements: **Not limited**
- Roadfill: **Fair** (dusty, stones)
- Sand Source: **Fair**
- Gravel Source: **Fair**
- Haul Roads: **Not limited**
- Road Suitability (Natural Surface): **Well suited**
- Road Construction/Maintenance (USFS): **Well suited**

**AASHTO Classification (H4 layer):** #200 = 5%, NP, 55% retained on #4 → **A-1-a** (gravelly coarse sand)
**Estimated CBR: 30–50** (excellent subgrade — coarse gravel, well drained, no plasticity)

---

## Final Summary: Corrected Subgrade Properties for FAARFIELD

| ICAO | Subgrade Layer | Texture | Clay% | LL | PI | #200 | AASHTO | Est. CBR | Est. E (psi) | Est. k (pci) | Quality |
|------|---------------|---------|-------|----|----|------|--------|----------|-------------|-------------|---------|
| **KLHX** | Bw (15-51cm) | Silt Loam | 23 | 33 | 14 | 90 | A-6(9) | **6–8** | 9,000–12,000 | 60–80 | Fair |
| **KPUB** | Cr (25+cm) | Bedrock/Shale | - | - | - | - | Rock | **10–15** | 15,000–22,500 | 100–150 | Good (weathered shale) |
| **KMQJ** | 2Bt (36-71cm) | Silty Clay | 40 | 50 | 28 | 72 | A-7-6(17) | **3–5** | 4,500–7,500 | 35–55 | Poor |
| **KCIU** | BC (56-79cm) | Fine Sand | 0.5 | 0 | NP | 10 | A-3 | **15–25** | 22,500–37,500 | 130–200 | Good |
| **KOTM** | A1 (23-41cm) | Silty Clay Loam | 34 | 50 | 24 | 99 | A-7-6(20) | **3–5** | 4,500–7,500 | 35–55 | Poor |
| **KMWH** | H4 (46-152cm) | Grav. Coarse Sand | 2.5 | - | NP | 5 | A-1-a | **30–50** | 45,000–75,000 | 200–350 | Excellent |

### Conversion Formulas Used
- E (psi) = 1500 x CBR (FAARFIELD default)
- k (pci) = (E / 20.15)^(1/1.28405) (FAARFIELD default)

### Recommended Values for FAARFIELD Input (Conservative)

| ICAO | Use CBR | Use E (psi) | Use k (pci) |
|------|---------|-------------|-------------|
| **KLHX** | 7 | 10,500 | 70 |
| **KPUB** | 12 | 18,000 | 120 |
| **KMQJ** | 4 | 6,000 | 45 |
| **KCIU** | 20 | 30,000 | 170 |
| **KOTM** | 4 | 6,000 | 45 |
| **KMWH** | 40 | 50,000 | 300 |

### Important Caveats
1. NRCS data is from **natural soil surveys**, not geotechnical borings at the airport. Actual subgrade may differ due to grading, compaction, fill, and drainage improvements during construction.
2. For **Pueblo (KPUB)**, bedrock starts at only 25 cm (10"). The pavement section (15.5") extends into bedrock. Weathered shale CBR varies widely (5-50+); 10-15 is conservative for soft/weathered shale.
3. For **Indianapolis (KMQJ)** and **Ottumwa (KOTM)**, the high water table (poorly/somewhat poorly drained) significantly reduces bearing capacity. The CBR of 3-5 already reflects wet conditions.
4. For conservative FAARFIELD analysis, use the **lower bound** of CBR range.

---

## SQL Query Used (Reusable)

```sql
SELECT co.compname, co.comppct_r, ch.hzname,
       ch.hzdept_r AS TopCm, ch.hzdepb_r AS BotCm,
       ctg.texture, ch.sandtotal_r AS Sand,
       ch.silttotal_r AS Silt, ch.claytotal_r AS Clay,
       ch.ll_r AS LL, ch.pi_r AS PI,
       ch.ksat_r AS Ksat, ch.dbthirdbar_r AS BulkD,
       ch.sieveno4_r AS Pass4, ch.sieveno10_r AS Pass10,
       ch.sieveno40_r AS Pass40, ch.sieveno200_r AS Pass200,
       ch.om_r AS OM, ch.lep_r AS LEP
FROM component co
INNER JOIN chorizon ch ON co.cokey = ch.cokey
INNER JOIN chtexturegrp ctg ON ch.chkey = ctg.chkey
  AND ctg.rvindicator = 'Yes'
WHERE co.cokey IN (
    SELECT co2.cokey FROM mapunit mu
    INNER JOIN component co2 ON mu.mukey = co2.mukey
    WHERE mu.mukey IN (
        SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84(
            'POINT(LON LAT)')
    ) AND co2.comppct_r >= 10
)
ORDER BY co.comppct_r DESC, ch.hzdept_r ASC
```

### API Call
```bash
curl -X POST "https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest" \
  -H "Content-Type: application/json" \
  -d '{"query":"YOUR SQL HERE","format":"JSON"}'
```

### Engineering Interpretations Query
```sql
SELECT co.compname, ci.mrulename, ci.interplr, ci.interplrc
FROM component co
INNER JOIN cointerp ci ON co.cokey = ci.cokey
WHERE co.cokey IN (
    SELECT co2.cokey FROM mapunit mu
    INNER JOIN component co2 ON mu.mukey = co2.mukey
    WHERE mu.mukey IN (
        SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84(
            'POINT(LON LAT)')
    ) AND co2.comppct_r >= 50
)
AND ci.mrulename LIKE '%ENG%'
```
