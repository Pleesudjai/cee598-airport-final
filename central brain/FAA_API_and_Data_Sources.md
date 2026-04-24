# FAA API & Data Sources for Airport Pavement Project

## 1. FAA ArcGIS REST API (Public, No Auth Required)

Base URL: `https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/`

### 1a. Airport Locations — US_Airport Service

**Endpoint:**
```
https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/US_Airport/FeatureServer/0/query
```

**Fields:** OBJECTID, GLOBAL_ID, IDENT, NAME, LATITUDE, LONGITUDE, ELEVATION, ICAO_ID, TYPE_CODE, SERVCITY, STATE, COUNTRY, OPERSTATUS, PRIVATEUSE, IAPEXISTS, DODHIFLIP, FAR91, FAR93, MIL_CODE, AIRANAL, US_HIGH, US_LOW, AK_HIGH, AK_LOW, US_AREA, PACIFIC

**Example query (our 6 airports):**
```
?where=ICAO_ID IN ('KLHX','KPUB','KMQJ','KCIU','KOTM','KMWH')&outFields=*&f=json
```

**Results for our airports:**

| ICAO | Name | Lat | Lon | Elevation (ft) | City | State |
|------|------|-----|-----|----------------|------|-------|
| KLHX | La Junta Muni | 38-03-00.0N | 103-30-35.1W | 4,228.6 | LA JUNTA | CO |
| KPUB | Pueblo Meml | 38-17-23.8N | 104-29-52.9W | 4,729.3 | PUEBLO | CO |
| KMQJ | Indianapolis Rgnl | 39-50-35.3N | 085-53-51.8W | 862.3 | INDIANAPOLIS | IN |
| KCIU | Chippewa County Intl | 46-15-02.7N | 084-28-20.6W | 799.3 | SAULT STE MARIE | MI |
| KOTM | Ottumwa Rgnl | 41-06-26.0N | 092-26-49.8W | 845.6 | OTTUMWA | IA |
| KMWH | Grant County Intl | 47-12-30.9N | 119-19-08.9W | 1,188.6 | MOSES LAKE | WA |

**GLOBAL_IDs (needed to link to Runways service):**

| ICAO | GLOBAL_ID |
|------|-----------|
| KLHX | FD2218E3-CB52-4F72-BED0-AC2F220362C8 |
| KPUB | 445FDC04-FBE0-4C81-BFF1-BC7C794A3C00 |
| KMQJ | 6ADB82AE-A49C-4680-96FC-0C855C01A70B |
| KCIU | 95963ABA-9C9C-49D9-B9AA-0DE244A5F6D2 |
| KOTM | 5EF83A12-A6DE-4652-9B97-B6026E266AB0 |
| KMWH | 49277B3A-D818-4E3D-A6AD-73EDAF5AAF2F |

---

### 1b. Runway Data — Runways Service

**Endpoint:**
```
https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/Runways/FeatureServer/0/query
```

**Fields:** OBJECTID, GLOBAL_ID, AIRPORT_ID, DESIGNATOR, LENGTH, WIDTH, DIM_UOM, COMP_CODE, LIGHTACTV, LIGHTINTNS

**Note:** AIRPORT_ID links to US_Airport.GLOBAL_ID

**Example query:**
```
?where=AIRPORT_ID IN ('445FDC04-FBE0-4C81-BFF1-BC7C794A3C00','FD2218E3-CB52-4F72-BED0-AC2F220362C8','5EF83A12-A6DE-4652-9B97-B6026E266AB0','6ADB82AE-A49C-4680-96FC-0C855C01A70B','95963ABA-9C9C-49D9-B9AA-0DE244A5F6D2','49277B3A-D818-4E3D-A6AD-73EDAF5AAF2F')&outFields=*&f=json
```

**Results (20 runways total):**

| Airport | Runway | Length (ft) | Width (ft) | Surface |
|---------|--------|-------------|------------|---------|
| KLHX | 08/26 | 6,849 | 75 | ASPH |
| KLHX | 12/30 | 5,803 | 60 | CONC+ASPH |
| KLHX | H1 | 145 | 145 | ASPH |
| KPUB | 08L/26R | 4,690 | 75 | ASPH |
| KPUB | 08R/26L | 10,498 | 150 | ASPH |
| KPUB | 17/35 | 8,310 | 150 | ASPH |
| KMQJ | 07/25 | 6,005 | 100 | ASPH |
| KMQJ | 16/34 | 3,902 | 75 | CONC |
| KMQJ | H1 | 40 | 40 | ASPH |
| KCIU | 10/28 | 5,001 | 75 | ASPH |
| KCIU | 16/34 | 7,203 | 150 | CONC+ASPH |
| KOTM | 04/22 | 4,601 | 100 | CONC+ASPH |
| KOTM | 13/31 | 6,001 | 100 | CONC |
| KMWH | 04/22 | 10,000 | 100 | CONC |
| KMWH | 09/27 | 3,500 | 90 | CONC |
| KMWH | 14L/32R | 13,503 | 200 | CONC |
| KMWH | 14R/32L | 2,936 | 75 | CONC |
| KMWH | 18/36 | 3,327 | 75 | ASPH |
| KMWH | H1 | 50 | 50 | ASPH |
| KMWH | H2 | 50 | 50 | ASPH |

---

### 1c. Other Available ArcGIS Services (selected relevant ones)

| Service Name | Description |
|-------------|-------------|
| `RunwayArea` | Runway polygon geometries with ADHP_ID, length, width, designator, surface characteristic |
| `RunwayLine` | Runway centerlines |
| `AM_Runway` | Airport Mapping runway features |
| `AM_Taxiway` | Airport Mapping taxiway features |
| `AM_Apron` | Airport Mapping apron features |
| `ADHP` | Aerodrome/Heliport point locations with ICAO, elevation, type |

Full service catalog:
```
https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services?f=json
```

---

## 2. FAA AIP Grant History Data (Public Download)

### Download URLs

| Fiscal Year | Excel Download URL |
|-------------|-------------------|
| FY2021 | https://www.faa.gov/sites/faa.gov/files/2023-07/FY2021-AIP-grants.xlsx |
| FY2022 | https://www.faa.gov/sites/faa.gov/files/2022-12/FY2022-AIP-grants.xlsx |
| FY2023 | https://www.faa.gov/sites/faa.gov/files/2023-10/FY2023-AIP-grants.xlsx |
| FY2024 | https://www.faa.gov/sites/faa.gov/files/2024-10/FY2024-AIP-grants.xlsx |

**How to find download URLs for any year:**
```bash
curl -sL "https://www.faa.gov/airports/aip/grant_histories/YYYY" | grep -oP 'href="[^"]*\.xlsx"'
```

### Pavement-Related AIP Grants for Our Airports (FY2021-2024)

| FY | Airport | Code | Grant Number | Work Description | Total Amount |
|----|---------|------|-------------|-----------------|-------------|
| 2021 | Pueblo Memorial | PUB | 3-08-0046-041-2021 | Reconstruct Taxilane, Seal Taxiway Pavement Surface/Joints | $1,014,613 |
| 2021 | Pueblo Memorial | PUB | 3-08-0046-042-2021 | CRRSA Act Funds | $1,004,173 |
| 2021 | Pueblo Memorial | PUB | 3-08-0046-043-2021 | CRRSA Act Concessions | $2,619 |
| 2021 | La Junta Municipal | LHX | 3-08-0035-016-2021 | CRRSA Act Funds | $13,000 |
| 2021 | La Junta Municipal | LHX | 3-08-0035-017-2021 | General ARPA | $32,000 |
| 2021 | Ottumwa Regional | OTM | 3-19-0073-023-2021 | Seal Runway Pavement Surface/Joints, Seal Taxiway | $474,000 |
| 2021 | Ottumwa Regional | OTM | 3-19-0073-024-2021 | CRRSA Act Funds | $13,000 |
| 2021 | Ottumwa Regional | OTM | 3-19-0073-025-2021 | General ARPA | $32,000 |
| 2021 | Indianapolis Regional | MQJ | 3-18-0037-023-2021 | CRRSA Act Funds | $23,000 |
| 2021 | Indianapolis Regional | MQJ | 3-18-0037-024-2021 | General ARPA | $59,000 |
| 2021 | Chippewa County Intl | CIU | 3-26-0139-043-2021 | Reconstruct Terminal, Rehabilitate Runway, Rehabilitate Taxiway | $596,491 |
| 2021 | Chippewa County Intl | CIU | 3-26-0139-044-2021 | CRRSA Act Funds | $1,008,321 |
| 2021 | Chippewa County Intl | CIU | 3-26-0139-045-2021 | CRRSA Act Concessions | $5,224 |
| 2021 | Chippewa County Intl | CIU | 3-26-0139-046-2021 | Expand/Reconstruct Terminal Building | $5,271,043 |
| 2021 | Chippewa County Intl | CIU | 3-26-0139-047-2021 | General ARPA | $1,120,210 |
| 2021 | Grant County Intl | MWH | 3-53-0039-047-2021 | ARFF Equipment, Reconstruct | $346,624 |
| 2021 | Grant County Intl | MWH | 3-53-0039-048-2021 | CRRSA Act Funds | $13,000 |
| 2021 | Grant County Intl | MWH | 3-53-0039-049-2021 | General ARPA | $32,000 |
| 2022 | Pueblo Memorial | PUB | 3-08-0046-044-2022 | General ARPA | $1,060,278 |
| 2022 | Pueblo Memorial | PUB | 3-08-0046-046-2022 | Acquire Snow Removal Equipment | $336,672 |
| 2022 | Pueblo Memorial | PUB | 3-08-0046-047-2022 | Rehabilitate Runway | $292,877 |
| 2022 | Indianapolis Regional | MQJ | 3-18-0037-025-2022 | Rehabilitate Runway | $301,442 |
| 2022 | Chippewa County Intl | CIU | 3-26-0139-048-2022 | Rehabilitate Runway | $841,767 |
| 2023 | La Junta Municipal | LHX | 3-08-0035-018-2023 | Install Runway Guidance System, Lighting | $272,000 |
| 2023 | Pueblo Memorial | PUB | 3-08-0046-048-2023 | Reconstruct Runway Lighting, Rehabilitate Runway | $9,316,522 |
| 2023 | Pueblo Memorial | PUB | 3-08-0046-049-2023 | Reconstruct Runway Lighting | $571,290 |
| 2023 | Indianapolis Regional | MQJ | 3-18-0037-026-2023 | Rehabilitate Runway | $612,300 |
| 2023 | Chippewa County Intl | CIU | 3-26-0139-051-2023 | Rehabilitate Taxiway, Seal Runway Pavement | $1,526,054 |
| 2024 | Pueblo Memorial | PUB | 3-08-0046-050-2024 | Rehabilitate Apron | $253,073 |
| 2024 | Pueblo Memorial | PUB | 3-08-0046-051-2024 | Construct/Expand Hangar, Rehabilitate Taxilane | $239,529 |
| 2024 | Ottumwa Regional | OTM | 3-19-0073-026-2024 | Reconstruct Apron | $158,310 |
| 2024 | Chippewa County Intl | CIU | 3-26-0139-052-2024 | Reseal Apron Pavement | $582,516 |

---

## 3. FAA Tableau AIP Dashboard (Interactive, Public)

**URL:**
```
https://explore.dot.gov/t/FAA/views/AIPTableauDashboard-Public_16287828377070/Start
```

- Search by individual airport, state, or airport size/grant type
- Covers FY2005-2025
- Shows AIP, COVID relief, and IIJA grant data

---

## 4. FAA ADIP Portal (Requires Authentication)

**URL:** https://adip.faa.gov/agis/public/#/public

### What's behind the login (NOT publicly accessible via API):
- Airport Master Record (Form 5010) with PCN values
- Pavement Condition Index (PCI) data
- Detailed pavement layer construction history
- Soil/subgrade data (CBR, k-value)
- SCI (Slab Condition Index) for existing pavement

### Airport Master Records Data Dictionary:
```
https://adip.faa.gov/agis/public/data/onlineHelp/pdf/amr/AirportMasterRecordsDataDictionary.pdf
```

---

## 5. Other FAA Data Portals

| Portal | URL | What's There |
|--------|-----|-------------|
| FAA Data Portal | https://www.faa.gov/data | Central hub for all FAA public data |
| FAA AIS Open Data | https://adds-faa.opendata.arcgis.com/ | GIS layers (airports, runways, airspace) |
| FAA API Portal | https://api.faa.gov/s/ | Developer APIs (requires API key) |
| AIP Grant Histories | https://www.faa.gov/airports/aip/grant_histories | Annual grant data downloads |
| AIP Grant/Apportionment | https://www.faa.gov/airports/aip/grantapportion_data | Funding allocation data |
| ACIP (internal) | https://www.faa.gov/airports/aip/acip | Capital Improvement Plans (internal FAA) |
| Pavement Maintenance Guidance | https://www.faa.gov/airports/central/airport_compliance/pavement_maintenance | Compliance requirements |

---

## 6. FAA 5010 Airport Master Record — Pavement Data Elements

Source: FAA AC 150/5200-35A "Submitting the Airport Master Record"

### Pavement-Related Data Elements in Form 5010

| Data Element | Name | Description |
|---|---|---|
| **33** | Surface Condition | Two-part: surface type + condition. Types: ASPH, CONC, ASPH-CONC, TURF, GRVL, etc. Condition: E=Excellent (new, no cracks), G=Good (some cracking, 50+ ft spacing), F=Fair (cracks 5-50 ft apart, spalling), P=Poor (extensive cracking, vegetation) |
| **34** | Surface Treatment | PFC=Porous Friction Course, AFSC=Aggregate Friction Seal Coat, RFSC=Rubberized Friction Seal Coat, WC=Wire Comb/Wire Tine, NONE=No Treatment |
| **35** | Single Wheel Gross Weight | Landing gear gross weight strength of runway in thousands of pounds (single wheel gear) |
| **36** | Dual Wheel Gross Weight | Landing gear gross weight strength (dual wheel gear) in thousands of pounds |
| **37** | Dual Tandem Gross Weight | Two dual wheels in tandem type gross weight strength in thousands of pounds |
| **38** | DDT/DDT Body Gear Weight | Two dual tandem / two dual tandem body gear gross weight strength in thousands of pounds |
| **39** | PCN | ICAO standard pavement strength. 5-part code (see below) |

### PCN (Data Element 39) — Pavement Classification Number

Format: `XX/T/S/P/M` — Example: `80/R/B/W/T`

| Part | Code | Meaning |
|------|------|---------|
| **Pavement Class** | Numerical (up to 3 digits) | Relative load-bearing capacity |
| **Pavement Type** | R = Rigid, F = Flexible | Pavement structure type |
| **Subgrade Strength** | A = High, B = Medium, C = Low, D = Ultra-low | Subgrade category |
| **Tire Pressure** | W = High (no limit), X = Medium, Y = Low, Z = Very Low | Allowable tire pressure |
| **Rating Method** | T = Technical evaluation, U = Using aircraft experience | How PCN was determined |

### Subgrade Strength Categories → CBR / k-value Mapping

| Category | Description | CBR Range | k-value (pci) |
|----------|-------------|-----------|---------------|
| **A** | High | CBR > 13 | k > 120 |
| **B** | Medium | CBR 8–13 | k = 80–120 |
| **C** | Low | CBR 4–8 | k = 40–80 |
| **D** | Ultra-low | CBR < 4 | k < 40 |

### What Form 5010 Does NOT Contain

- Individual pavement layer thicknesses
- Layer material types (P-501, P-401, P-154, etc.)
- Exact CBR or k-value numbers (only A/B/C/D category)
- Construction/rehabilitation dates by layer
- Soil boring logs or geotechnical data
- PCC flexural strength
- Slab Condition Index (SCI)

### Bottom Line for This Project

The Pavement sheet in the Excel spreadsheet already has MORE detail than any public FAA source (layer types, thicknesses, material codes, work history). The only missing pieces — exact subgrade CBR/k-value, PCC flexural strength, and SCI — are not available from any public FAA API or database. They require either ADIP authenticated access or airport-specific engineering reports.

---

## 7. FAA PAVEAIR — Pavement Management System (Layer Data — Login Required)

**URL:** https://faapaveair.faa.gov/
**What it is:** FAA's web-based Airport Pavement Management System. Stores pavement inventory with full layer structure (type, thickness, material, construction date) organized as Network → Branch → Section — the same hierarchy used in our Excel data.

**CONFIRMED:** The Excel "Pavement" sheet (NetworkID, BranchID, SectionID, layer types, thicknesses) is a PAVEAIR data export. The professor obtained this from PAVEAIR.

**Public modules:** PCI scores can be browsed without login.
**Member-only modules:** Inventory (layer structure/thickness), Work history, Inventory Update — all require FAA-authenticated account.

**Tested 2026-04-16:** Inventory.aspx redirects to login page. No public API or data export endpoint for layer data.

**For airports without pavement data:** User must input layer structure manually in the website. PAVEAIR is the authoritative source but requires login.

---

## 8. What Data is NOT Available via Any Public API/Database (Updated)

These require either ADIP login or direct contact with airport/FAA:

1. **Subgrade CBR / k-value / E-modulus** -- the critical missing piece for FAARFIELD
2. **PCI (Pavement Condition Index)** scores
3. **Detailed layer-by-layer construction records** (thicknesses, materials)
4. **Soil boring logs / geotechnical reports**
5. **PCN (Pavement Classification Number)** breakdown details
6. **SCI (Slab Condition Index)** for existing rigid pavement
7. **PCC Flexural Strength** values

---

## 8. FAA Terminal Area Forecast (TAF) — Traffic Operations Data

**Download URL:** `https://taf.faa.gov/Downloads/APO100_TAF_Final_2025.zip` (15 MB)
**Saved at:** `central brain/TAF_2025.zip`

Contains 5 Excel files for **3,319 US airports** covering **1990-2055**:

| File | What it has |
|------|-------------|
| Airports.xlsx | LOCID, name, city, state, lat/lon, hub size, facility class (3,319 airports) |
| AirportsOperations.xlsx | Annual operations by category: itn_Ac (Air Carrier), itn_at (Air Taxi), itn_ga (GA itinerant), itn_mil (Military itinerant), loc_ga (GA local), loc_mil (Military local). Scenario 0 = actual (1990-2024), Scenario 1 = forecast (2025-2055). 209,911 rows. |
| BasedAircraft.xlsx | Based aircraft by type: single, jet, multi, helo, other |
| Enplanements.xlsx | Passenger enplanements: air carrier, air taxi, commuter, US flag, foreign flag |
| Tracon.xlsx | TRACON operations by category |

**LOCID format:** 3-letter FAA code (e.g. LHX, PUB, MQJ) — NOT ICAO (no K prefix). Strip trailing spaces when querying.

**Useful for FAARFIELD:** Total operations + growth rate forecast. Does NOT have individual aircraft types — only category totals.

### VERIFIED: Excel Growth Rate Sheet = TAF Data (Identical)

All 6 airports, all 21 years (2014-2034) — every single number matches.
The Excel Growth Rate sheet IS the TAF data, just copy-pasted by the professor.

| | Excel "Course Data" | TAF Download |
|---|---|---|
| Source | Professor copied from TAF | Downloaded from taf.faa.gov |
| Content | **Identical** (same numbers) | **Identical** (same numbers) |
| Coverage | Only 6 project airports | **3,319 airports** (all US) |
| Years | 2014-2034 | **1990-2055** (wider range) |

The TAF supersedes the Excel Growth Rate sheet — same data plus 3,313 more airports and 40+ more years of history/forecast. However, the Excel Traffic sheets (Traffic346, Traffic364, etc.) have **aircraft-level detail** (ICAO type, MTOW, gear config, per-flight counts) that the TAF does NOT have — TAF only provides category totals (Air Carrier, Air Taxi, GA, Military).

---

## 9. USDA NRCS Soil Data Access API (Subgrade Data) — see also NRCS_Soil_Data.md

**Endpoint:** `https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest`
**Method:** POST with JSON body `{"query":"SQL","format":"JSON"}`
**No auth required.**

Returns SSURGO soil survey data by lat/lon including: texture, sand/silt/clay %, LL, PI, Ksat, bulk density, hydrologic group, drainage class. These properties allow AASHTO classification and CBR estimation for subgrade input to FAARFIELD.

Full soil profiles and estimated CBR values for all 6 airports saved in: **NRCS_Soil_Data.md**

---

## 10. Python Script to Query FAA ArcGIS API

```python
import requests, json

BASE = "https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services"
ICAO_CODES = ['KLHX', 'KPUB', 'KMQJ', 'KCIU', 'KOTM', 'KMWH']

# 1. Get airport locations
url = f"{BASE}/US_Airport/FeatureServer/0/query"
params = {
    "where": f"ICAO_ID IN ({','.join(repr(c) for c in ICAO_CODES)})",
    "outFields": "*",
    "f": "json"
}
resp = requests.get(url, params=params)
airports = resp.json()["features"]

# 2. Get runway data using GLOBAL_IDs
global_ids = [a["attributes"]["GLOBAL_ID"] for a in airports]
url = f"{BASE}/Runways/FeatureServer/0/query"
params = {
    "where": f"AIRPORT_ID IN ({','.join(repr(g) for g in global_ids)})",
    "outFields": "*",
    "f": "json"
}
resp = requests.get(url, params=params)
runways = resp.json()["features"]

# 3. Print results
for apt in airports:
    a = apt["attributes"]
    print(f"{a['ICAO_ID']} - {a['NAME']}, {a['SERVCITY']}, {a['STATE']}")
    print(f"  Location: {a['LATITUDE']}, {a['LONGITUDE']}, Elev: {a['ELEVATION']} ft")
    for rwy in runways:
        r = rwy["attributes"]
        if r["AIRPORT_ID"] == a["GLOBAL_ID"]:
            print(f"  Rwy {r['DESIGNATOR']}: {r['LENGTH']}x{r['WIDTH']} ft, {r['COMP_CODE']}")
    print()
```
