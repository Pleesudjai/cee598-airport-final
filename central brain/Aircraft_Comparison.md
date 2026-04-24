# Aircraft Comparison: Excel Traffic Data vs FAARFIELD Library

## Data Sources

1. **Excel traffic data**: 229 unique ICAO aircraft codes across all 6 airports
2. **FAARFIELD built-in library**: 252 aircraft in `FF2/Defaults/Aircraft/aircraft.csv` (uses full names, not ICAO codes)
3. **FAA Aircraft Characteristics Database (ACD)**: 388 aircraft with ICAO codes, MTOW, gear config, dimensions
   - Downloaded from: https://www.faa.gov/airports/engineering/aircraft_char_database
   - Saved as: `FAA_Aircraft_Characteristics_Database.xlsx` (2 sheets: ACD_Data + Data_Dictionary)
   - 56 columns including: ICAO_Code, MTOW_lb, MALW_lb, Main_Gear_Config, ADG, TDG, Wheelbase_ft, Main_Gear_Width_ft

## Summary

### Excel vs FAA ACD (updated official database)

| | Count |
|---|---|
| Unique aircraft in Excel | **229** |
| Matched in FAA ACD by ICAO | **208** (91%) |
| NOT in FAA ACD | **21** (9%) — mostly obscure/retired types |

### Excel vs FAARFIELD Built-in Library

| | Count |
|---|---|
| Matched to FAARFIELD library | **124** (54%) |
| NOT in FAARFIELD library | **105** (46%) — use Generic aircraft by weight |

**FAARFIELD uses full names** (B737-800, Skyhawk-172) not ICAO codes (B738, C172).
The FAA ACD provides the **official ICAO-to-characteristics mapping** including MTOW, gear config, wheelbase, and gear width needed for FAARFIELD input.

## FAA ACD Key Columns for FAARFIELD Input

| ACD Column | FAARFIELD Use |
|-----------|---------------|
| ICAO_Code | Match to Excel traffic data |
| MTOW_lb | Gross weight input |
| Main_Gear_Config | Gear type (S, D, 2D, 2T, 3D, etc.) |
| Wheelbase_ft | Wheel spacing |
| Main_Gear_Width_ft | Track width |
| ADG | Aircraft Design Group |
| TDG | Taxiway Design Group |

## ACD Load Configuration — What's Available vs What's Derived

The FAA ACD is the best public source for aircraft load configuration. It has most of what FAARFIELD needs, with a few items derived from defaults:

| Parameter | In ACD? | ACD Column | If Missing — Default |
|-----------|---------|------------|---------------------|
| MTOW (lbs) | YES | `MTOW_lb` | — |
| Max Landing Weight | YES | `MALW_lb` | — |
| Gear Config | YES | `Main_Gear_Config` | — |
| Wheelbase (ft) | YES | `Wheelbase_ft` | — |
| Gear Width (ft) | YES | `Main_Gear_Width_ft` | — |
| ADG / TDG | YES | `ADG`, `TDG` | — |
| **Tire Pressure (psi)** | **NO** | — | S=100, D=170, 2D=190, 3D=200 |
| **Number of Tires** | **NO** | — | S=2, D=4, 2D=8, 3D=12, 2D/2D2=16, 5D=20 |
| **Main Gear %** | **NO** | — | 95% (FAARFIELD standard) |
| **Wheel Spacing (in gear)** | **NO** | — | FAARFIELD defaults per gear type |

13 gear configurations in database: S (200), D (135), 2D (24), 3D (8), 2D/2D2 (6), 2S (4), 2D/D1 (4), 2D/2D1 (2), 5D (1), 2D/3D2 (1), D2 (1), 2T (1), Q2 (1)

Website allows user to accept all defaults OR override any parameter with their own input.

## Key Finding

Most unmatched aircraft are **light GA planes under 12,500 lbs** that cause **negligible pavement damage**. The heavy aircraft that matter for design (B737s, B777s, C-130, C-17, etc.) are all in FAARFIELD.

### Breakdown of 105 Unmatched Aircraft

| Weight Category | Count | Impact | Recommendation |
|----------------|-------|--------|---------------|
| Under 3,000 lbs (negligible) | 22 | Zero damage | Skip or use S-3 |
| 3,000 - 6,000 lbs (light GA) | 21 | Negligible | Use Generic S-5 |
| 6,000 - 12,500 lbs (utility/turboprop) | 30 | Minor | Use Generic S-10 or S-12.5 |
| 12,500 - 20,000 lbs (light twin/biz jet) | 10 | Low-moderate | Use Generic S-15/S-20 or D-15/D-20 |
| 20,000 - 50,000 lbs (medium biz jet) | 10 | Moderate | Use Generic D-25 to D-35 |
| 50,000 - 100,000 lbs (regional jet) | 7 | Significant | Use Generic D-50 to D-100 |
| Over 100,000 lbs | 1 (A4 Skyhawk misclassified?) | Depends | Check manually |
| Unknown | 4 | Unknown | Need data |

---

## Unmatched Aircraft — Full List with Recommendations

### Negligible Damage (under 3,000 lbs) — Skip These

| Code | MTOW (lbs) | Gear | Aircraft Type |
|------|-----------|------|--------------|
| AA5 | 2,400 | S | Grumman AA-5 Tiger |
| BE23 | 2,250 | S | Beech Musketeer |
| BE24 | 2,750 | S | Beech Sierra |
| BE9T | 1,543 | D | Beech (variant) |
| C140 | 1,450 | S | Cessna 140 |
| C150 | 1,543 | S | Cessna 150 |
| C162 | 1,320 | S | Cessna Skycatcher |
| C177 | 2,500 | S | Cessna Cardinal |
| CH7A | 1,300 | S | Bellanca Citabria |
| DA20 | 1,764 | S | Diamond DA20 |
| DA40 | 2,888 | S | Diamond DA40 Star |
| DV20 | 1,764 | S | Diamond DV20 Katana |
| ERCO | 1,261 | S | ERCO Ercoupe |
| LEG2 | 2,200 | S | Lancair Legacy |
| LGEZ | 1,425 | S | Lancair/Legend |
| M20P | 2,579 | S | Mooney M20 |
| PA22 | 1,950 | S | Piper Tri-Pacer |
| RV10 | 2,700 | S | Van's RV-10 |
| RV12 | 1,320 | S | Van's RV-12 |
| RV6 | 1,650 | S | Van's RV-6 |
| RV7 | 1,600 | S | Van's RV-7 |
| Unknown | -1 | ? | Unknown/missing data |

### Light GA — Use Generic S-5 (3,000 - 6,000 lbs)

| Code | MTOW (lbs) | Gear | Aircraft Type |
|------|-----------|------|--------------|
| AC11 | 3,262 | S | Aero Commander 100 |
| AT3P | 5,000 | S | AT-3 (military trainer) |
| B06 | 3,200 | S | Bell 206 (helicopter) |
| BE56 | 5,990 | S | Beech Baron 56 |
| BE65 | 3,368 | S | Beech Queen Air |
| BL17 | 3,325 | S | Bellanca Viking |
| C152 | 5,732 | S | Cessna 152 (high MTOW variant?) |
| C185 | 3,348 | S | Cessna Skywagon |
| C195 | 3,350 | S | Cessna 195 |
| C240 | 3,600 | S | Cessna TTx |
| C310 | 4,600 | S | Cessna 310 |
| C335 | 5,990 | S | Cessna 335 |
| C337 | 4,850 | S | Cessna Skymaster |
| C340 | 5,974 | S | Cessna 340 |
| COL4 | 3,600 | S | Columbia 400 |
| DA42 | 4,407 | S | Diamond DA42 Twin Star |
| DG15 | 4,350 | S | DG-15 (glider?) |
| LNC4 | 3,086 | S | Lancair IV |
| PA24 | 3,200 | S | Piper Comanche |
| PA27 | 5,200 | S | Piper Apache/Aztec |
| PA30 | 3,725 | S | Piper Twin Comanche |
| PA44 | 3,798 | S | Piper Seminole |
| SR20 | 3,000 | S | Cirrus SR20 |
| T34P | 4,300 | S | Beech T-34 Mentor |
| T6 | 5,617 | S | T-6 Texan II |

### Utility/Turboprop — Use Generic S-10 or S-12.5 (6,000 - 12,500 lbs)

| Code | MTOW (lbs) | Gear | FAARFIELD Generic |
|------|-----------|------|-------------------|
| AC50 | 6,750 | S | S-10 |
| AC68 | 8,000 | S | S-10 |
| AC6L | 9,000 | S | S-10 |
| AC80 | 9,400 | S | S-10 |
| AC90 | 10,700 | S | S-10 or S-12.5 |
| AC95 | 11,750 | S | S-12.5 |
| AEST | 6,850 | S | S-10 |
| AT5T | 10,480 | S | S-10 or S-12.5 |
| BE10 | 11,800 | D | S-12.5 or D-15 |
| BE60 | 6,775 | S | S-10 |
| BE99 | 10,400 | D | S-10 or D-15 |
| C25A | 12,125 | S | S-12.5 |
| C25C | 10,361 | S | S-10 or S-12.5 |
| C402 | 6,850 | S | S-10 |
| C404 | 8,400 | S | S-10 |
| C421 | 7,450 | S | S-10 |
| C425 | 8,598 | S | S-10 |
| C510 | 7,716 | S | S-10 |
| E50P | 10,471 | S | S-10 or S-12.5 |
| EPIC | 7,500 | S | S-10 |
| HDJT | 9,963 | S | S-10 |
| M600 | 6,000 | S | S-10 |
| MO20 | 11,799 | S | S-12.5 |
| MU2 | 11,574 | S | S-12.5 |
| P180 | 12,100 | S | S-12.5 |
| PAY1 | 8,699 | S | S-10 |
| PAY2 | 9,479 | S | S-10 |
| PRM1 | 8,800 | S | S-10 |
| SF50 | 6,000 | S | S-10 |
| TBM7 | 6,613 | S | S-10 |
| TBM8 | 7,495 | S | S-10 |
| TBM9 | 7,394 | S | S-10 |
| TEX2 | 6,500 | S | S-10 |

### Light Biz Jet — Use Generic S-15/S-20 or D-15/D-20 (12,500 - 20,000 lbs)

| Code | MTOW (lbs) | Gear | FAARFIELD Generic |
|------|-----------|------|-------------------|
| AT8T | 16,000 | S | S-15 or S-20 |
| BE19 | 17,120 | D | D-15 or D-20 |
| C25B | 13,870 | S | S-15 |
| C25M | 13,870 | S | S-15 |
| C501 | 13,227 | S | S-15 |
| E55P | 17,528 | S | S-15 or S-20 |
| G280 | 12,566 | D | D-15 |
| M20T | 12,500 | S | S-12.5 or S-15 |
| PC24 | 18,300 | D | D-15 or D-20 |
| S22T | 15,100 | S | S-15 |

### Medium Biz Jet — Use Generic D-25 to D-35 (20,000 - 50,000 lbs)

| Code | MTOW (lbs) | Gear | FAARFIELD Generic |
|------|-----------|------|-------------------|
| ASTR | 35,650 | D | D-35 |
| C55B | 42,300 | S | S-35 HTP or S-45 |
| C680 | 30,000 | D | D-25 or D-30 |
| C68A | 30,800 | D | D-30 or D-35 |
| EA50 | 39,595 | S | S-35 HTP or S-40 HTP |
| F2TH | 34,833 | D | D-35 |
| G150 | 26,100 | D | D-25 |
| GALX | 33,289 | D | D-35 |
| J328 | 34,524 | D | D-35 |

### Regional/Heavy — Use Generic D-50+ (50,000+ lbs)

| Code | MTOW (lbs) | Gear | FAARFIELD Generic |
|------|-----------|------|-------------------|
| CVLT | 57,000 | D | D-50 or D-75 |
| E45X | 53,131 | D | D-50 |
| E75L | 89,000 | D | D-75 or D-100 |
| E75S | 89,000 | D | D-75 or D-100 |
| GLEX | 95,901 | D | D-75 or D-100 |
| MRJ9 | 85,980 | D | D-75 or D-100 |

---

## Matched Aircraft — Full Mapping Table (124 matches)

| Excel ICAO | FAARFIELD Name | MTOW (lbs) | Gear |
|-----------|---------------|-----------|------|
| A10 | F-16C (proxy) | 50,044 | S |
| A124 | An-124 | 886,258 | 5D |
| A319 | A319-100 std | 168,653 | D |
| A320 | A320-200 Twin std | 174,165 | D |
| A321 | A321-200 std | 206,132 | D |
| A332 | A330-200 std | 533,519 | 2D |
| B190 | SuperKingAir-B200 | 17,120 | D |
| B350 | SuperKingAir-350 | 16,500 | D |
| B38M | B737-900 ER | 181,200 | D |
| B39M | B737-900 ER | 194,668 | D |
| B461 | BAe 146 | 84,000 | D |
| B462 | BAe 146 | 93,000 | D |
| B703 | B707-320C | 333,600 | 2D |
| B722 | B707-320C | 209,500 | D |
| B733 | B737-300 | 139,500 | D |
| B734 | B737-400 | 150,000 | D |
| B735 | B737-500 | 136,000 | D |
| B736 | B737-600 | 144,500 | D |
| B737 | B737-700 | 154,500 | D |
| B738 | B737-800 | 174,200 | D |
| B739 | B737-900 | 187,700 | D |
| B744 | B747-400 | 910,000 | 2D/2D2 |
| B748 | B747-8 | 987,000 | 2D/2D2 |
| B752 | B757-200 | 255,500 | 2D |
| B762 | B767-200 | 395,000 | 2D |
| B763 | B767-300 | 412,000 | 2D |
| B772 | B777-200 | 766,000 | 3D |
| B773 | B777-300 | 766,800 | 3D |
| B779 | B777-300 ER | 775,000 | 3D |
| B77L | B777-200 LR | 775,000 | 3D |
| B77W | B777-300 ER | 775,000 | 3D |
| B788 | B787-8 | 502,500 | 2D |
| B789 | B787-9 | 560,000 | 2D |
| BCS1 | A319-100 std (A220-100) | 134,000 | D |
| BCS3 | A320-200 Twin std (A220-300) | 149,000 | D |
| BE20 | SuperKingAir-B200 | 12,500 | D |
| BE30 | SuperKingAir-300 | 14,000 | D |
| BE33 | Bonanza-F-33A | 3,500 | S |
| BE35 | Bonanza-F-33A | 3,400 | S |
| BE36 | Bonanza-F-33A | 3,650 | S |
| BE40 | BeechJet-400A | 16,100 | S |
| BE55 | Baron-E-55 | 5,300 | S |
| BE58 | Baron-E-55 | 5,500 | S |
| BE90 | KingAir-C-90 | 10,097 | S |
| BE9L | KingAir-C-90 | 10,097 | D |
| C130 | C-130 | 155,000 | 2D |
| C17 | C-17A | 585,000 | 2D |
| C172 | Skyhawk-172 | 2,450 | S |
| C182 | Skylane-1-82 | 2,550 | S |
| C206 | Stationair-206 | 3,600 | S |
| C208 | GrnCaravan-CE-208B | 7,800 | S |
| C210 | Centurion-210 | 3,100 | S |
| C30J | C-130 (C-130J) | 155,000 | 2D |
| C414 | Chancellor-414 | 6,750 | S |
| C441 | Conquest-441 | 9,850 | S |
| C525 | Citation-525 | 10,700 | S |
| C550 | Citation-550B | 14,800 | S |
| C560 | Citation-VI/VII | 16,300 | S |
| C56X | Citation-X | 15,000 | S |
| C650 | Citation-VI/VII | 22,002 | D |
| C750 | Citation-X | 35,699 | S |
| CL30 | Challenger-CL-604 | 37,478 | D |
| CL35 | Challenger-CL-604 | 40,600 | D |
| CL60 | Challenger-CL-604 | 48,200 | D |
| CRJ2 | RegionalJet-200 | 53,000 | D |
| CRJ7 | RegionalJet-700 | 84,500 | D |
| CRJ9 | RegionalJet-700 | 80,500 | D |
| DC10 | DC10-10 | 430,000 | 2D |
| DC91 | DC9-32 | 90,700 | D |
| DC93 | DC9-32 | 110,098 | D |
| DH8A | Dash 7 | 34,392 | D |
| DH8D | Dash 7 (proxy for Q400) | 63,052 | D |
| E135 | ERJ-135 | 44,070 | D |
| E145 | ERJ-145 ER | 53,131 | D |
| E170 | EMB-170 STD | 85,098 | D |
| E190 | EMB-190 STD | 105,358 | 2D |
| F15 | F-15C | 68,000 | S |
| F16 | F-16C | 3,306 | S |
| F18 | F/A-18C | 51,900 | S |
| F900 | Falcon-900 | 45,503 | D |
| FA20 | Falcon-2000 | 30,325 | D |
| FA50 | Falcon-50 | 38,801 | S |
| FA7X | Falcon-900 (proxy for 7X) | 70,000 | D |
| GLF4 | Gulfstream-G-IV | 73,200 | D |
| GLF5 | Gulfstream-G-V | 88,846 | D |
| GLF6 | Gulfstream-G-V (proxy for G650) | 99,600 | D |
| H25B | Hawker-800 | 28,000 | D |
| HA4T | Hawker-800XP | 39,500 | D |
| K35R | KC-10 (KC-135R) | 322,500 | 2D |
| LJ31 | Learjet-35A/65A | 17,698 | D |
| LJ35 | Learjet-35A/65A | 18,000 | D |
| LJ45 | Learjet-55 (proxy) | 21,500 | D |
| LJ60 | Learjet-55 (proxy) | 23,500 | D |
| MD82 | MD83 | 149,499 | D |
| MD83 | MD83 | 149,500 | D |
| MD90 | MD90-30 ER | 172,500 | D |
| P28A | Chk.Arrow-PA-28-200 | 2,548 | S |
| P3 | P-3 | 135,000 | D |
| PA28 | Chk.Arrow-PA-28-200 | 2,150 | S |
| PA32 | Chk.Six-PA-32 | 3,400 | S |
| PA34 | Seneca-II | 4,629 | S |
| PA46 | Malibu-PA-46-350P | 4,299 | S |
| SF34 | Shorts-360 (proxy for SF340) | 29,000 | D |

---

## FAARFIELD Aircraft Library Location

**CSV file (252 entries):** `FAARFIELD_2.1.1_SourceCode/FAARFIELD/FF2/Defaults/Aircraft/aircraft.csv`
**XML file (408 variants):** `FAARFIELD_2.1.1_SourceCode/FAARFIELD/FF2/Defaults/Aircraft/aircraft.xml`

### CSV Format
```
Manufacturer, Aircraft Name, Gross Weight (lbs), Contact Pressure Ratio, Tire Pressure (psi), Gear Type, ...
```

### Gear Type Codes in FAARFIELD
- S = Single wheel
- D = Dual wheel
- 2D = Dual tandem (two dual wheels in tandem)
- 3D = Triple dual tandem
- Other specialized configurations
