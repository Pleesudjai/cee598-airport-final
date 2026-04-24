# Aircraft Audit — Excel vs FAARFIELD Library

_Generated 2026-04-23 16:21 via `scripts/audit_excel_vs_library.py`_

Source data: `AO_CEE598_FAARFIELD.xlsx` (project Excel, 6 airport sheets)  
Reference library: `combined_aircraft_library.json` resolved via `/api/aircraft/resolve/<icao>` on the live backend  
Total unique aircraft entries audited: **859**

## Severity legend

| Tag | Meaning |
|---|---|
| 🟢 OK | Excel matches library; geometry comes from exact-ICAO XML |
| 🟦 PROXY | Geometry borrowed from a sibling aircraft (`icao_proxy` / `family_proxy` / `nearest_proxy`); informational only |
| 🟨 GEAR_MISMATCH | Excel gear classification ≠ library gear classification (e.g. C-17 Excel=2D, library=2T) |
| 🟨 MTOW_MISMATCH | Excel MTOW differs from library MTOW by ≥ 5% (currently rare since backend does not echo library MTOW) |
| 🟧 GEAR_TEMPLATE | No real-aircraft donor; fell back to a generic gear-type template — CDF reliability is reduced |
| 🟥 DUAL_FALLBACK | No library data at all; generic dual-wheel default — CDF is approximate, FEM3D blocked |

## Summary

| Severity | Count |
|---|---|
| 🟢 OK | 278 |
| 🟦 PROXY | 550 |
| 🟨 GEAR_MISMATCH | 38 |
| 🟥 DUAL_FALLBACK | 5 |

## Gear mismatches (Excel ≠ library) — 38 aircraft entries

These aircraft have an Excel-supplied gear classification that disagrees with FAARFIELD's library. The CDF computation uses the library's wheel coordinates regardless, so the math is correct — but the Excel data is misclassified and any per-aircraft "gear" label echoed from the request is misleading.

| Airport | ICAO | Excel gear | **Library gear** | n_wheels | Geometry source | Resolved ICAO | FAARFIELD name |
|---|---|---|---|---|---|---|---|
| KCIU | **BE9L** | `D` | **`S`** | 2 | xml | BE9L | Beechcraft King Air C90 |
| KCIU | **C130** | `2D` | **`2S`** | 4 | xml | C130 | C-130-70 |
| KCIU | **C17** | `2D` | **`2T`** | 12 | xml | C17 | C-17A |
| KCIU | **C30J** | `2D` | **`2S`** | 8 | nearest_proxy | B752 | B757-200 |
| KCIU | **C750** | `S` | **`D`** | 4 | xml | C750 | Cessna Citation X |
| KCIU | **E190** | `2D` | **`D`** | 4 | xml | E190 | EMB-190 STD |
| KCIU | **FA50** | `S` | **`D`** | 4 | xml | FA50 | Dassault Falcon 50/50EX |
| KCIU | **SW3** | `S` | **`D`** | 2 | nearest_proxy | PA32 | PA-32-300 Cherokee Six |
| KLHX | **BE9L** | `D` | **`S`** | 2 | xml | BE9L | Beechcraft King Air C90 |
| KLHX | **C130** | `2D` | **`2S`** | 4 | xml | C130 | C-130-70 |
| KMQJ | **BE9L** | `D` | **`S`** | 2 | xml | BE9L | Beechcraft King Air C90 |
| KMQJ | **BE9T** | `D` | **`S`** | 4 | nearest_proxy | BE10 | Beechcraft King Air B100 |
| KMQJ | **C750** | `S` | **`D`** | 4 | xml | C750 | Cessna Citation X |
| KMQJ | **FA50** | `S` | **`D`** | 4 | xml | FA50 | Dassault Falcon 50/50EX |
| KMQJ | **SW3** | `S` | **`D`** | 2 | nearest_proxy | PA32 | PA-32-300 Cherokee Six |
| KMWH | **BE19** | `D` | **`S`** | 4 | nearest_proxy | LJ35 | Learjet 35/36/35A/36A |
| KMWH | **BE9L** | `D` | **`S`** | 2 | xml | BE9L | Beechcraft King Air C90 |
| KMWH | **BE9T** | `D` | **`S`** | 4 | nearest_proxy | BE10 | Beechcraft King Air B100 |
| KMWH | **C130** | `2D` | **`2S`** | 4 | xml | C130 | C-130-70 |
| KMWH | **C17** | `2D` | **`2T`** | 12 | xml | C17 | C-17A |
| KMWH | **C30J** | `2D` | **`2S`** | 8 | nearest_proxy | B752 | B757-200 |
| KMWH | **C750** | `S` | **`D`** | 4 | xml | C750 | Cessna Citation X |
| KMWH | **DC10** | `2D` | **`2D/D1`** | 8 | xml | DC10 | KC-10 |
| KMWH | **FA50** | `S` | **`D`** | 4 | xml | FA50 | Dassault Falcon 50/50EX |
| KMWH | **SW3** | `S` | **`D`** | 2 | nearest_proxy | PA32 | PA-32-300 Cherokee Six |
| KOTM | **BE9L** | `D` | **`S`** | 2 | xml | BE9L | Beechcraft King Air C90 |
| KOTM | **FA50** | `S` | **`D`** | 4 | xml | FA50 | Dassault Falcon 50/50EX |
| KPUB | **BE19** | `D` | **`S`** | 4 | nearest_proxy | LJ35 | Learjet 35/36/35A/36A |
| KPUB | **BE9L** | `D` | **`S`** | 2 | xml | BE9L | Beechcraft King Air C90 |
| KPUB | **BE9T** | `D` | **`S`** | 4 | nearest_proxy | BE10 | Beechcraft King Air B100 |
| KPUB | **C130** | `2D` | **`2S`** | 4 | xml | C130 | C-130-70 |
| KPUB | **C17** | `2D` | **`2T`** | 12 | xml | C17 | C-17A |
| KPUB | **C30J** | `2D` | **`2S`** | 8 | nearest_proxy | B752 | B757-200 |
| KPUB | **C750** | `S` | **`D`** | 4 | xml | C750 | Cessna Citation X |
| KPUB | **DC10** | `2D` | **`2D/D1`** | 8 | xml | DC10 | KC-10 |
| KPUB | **E190** | `2D` | **`D`** | 4 | xml | E190 | EMB-190 STD |
| KPUB | **FA50** | `S` | **`D`** | 4 | xml | FA50 | Dassault Falcon 50/50EX |
| KPUB | **SW3** | `S` | **`D`** | 2 | nearest_proxy | PA32 | PA-32-300 Cherokee Six |

## Gear-template fallback — 0 aircraft entries

_(none — every aircraft in the project traffic resolves to either an exact XML match or a real-aircraft proxy)_

## Dual-fallback (no library data) — 5 aircraft entries

These aircraft have NO library entry at all. Their CDF contribution uses a generic dual-wheel approximation; FEM3D is blocked. Consider excluding from final design or using a manual proxy.

| Airport | ICAO | Excel gear | Excel MTOW | Excel count |
|---|---|---|---|---|
| KCIU | **UNKNOWN** | `UNKNOWN` | -1 lb | 725 |
| KMQJ | **UNKNOWN** | `UNKNOWN` | -1 lb | 9309 |
| KMWH | **UNKNOWN** | `UNKNOWN` | -1 lb | 8148 |
| KOTM | **UNKNOWN** | `UNKNOWN` | -1 lb | 2228 |
| KPUB | **UNKNOWN** | `UNKNOWN` | -1 lb | 8564 |

## Proxy geometry — 550 aircraft entries (informational)

These aircraft don't have an exact-ICAO XML entry in FAARFIELD's library, so the wheel coordinates are borrowed from a tier-matched donor (sibling ICAO / same family / closest geometry). Acceptable for design but worth flagging in any per-aircraft audit.

| Airport | ICAO | Donor (resolved_icao) | Tier | FAARFIELD name | Library gear | n_wheels |
|---|---|---|---|---|---|---|
| KCIU | **AA5** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KCIU | **AC50** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KCIU | **AEST** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KCIU | **B190** | B350 | nearest_proxy | Beechcraft King Air 350 | `D` | 4 |
| KCIU | **B462** | B463 | family_proxy | BAe 146-300/300QC/300QT | `D` | 4 |
| KCIU | **BE20** | BE10 | nearest_proxy | Beechcraft King Air B100 | `D` | 4 |
| KCIU | **BE30** | B350 | nearest_proxy | Beechcraft King Air 350 | `D` | 4 |
| KCIU | **BE35** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KCIU | **BE36** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KCIU | **BE58** | BE55 | nearest_proxy | Beechcraft Baron 55 | `S` | 2 |
| KCIU | **BE99** | BE10 | nearest_proxy | Beechcraft King Air B100 | `D` | 4 |
| KCIU | **BL17** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KCIU | **C177** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KCIU | **C240** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KCIU | **C25A** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KCIU | **C25B** | C550 | nearest_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KCIU | **C25C** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KCIU | **C25M** | C525 | family_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KCIU | **C30J** | B752 | nearest_proxy | B757-200 | `2S` | 8 |
| KCIU | **C310** | C210 | nearest_proxy | Cessna C210 Centurion | `S` | 2 |
| KCIU | **C340** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KCIU | **C402** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KCIU | **C421** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KCIU | **C425** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KCIU | **C510** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KCIU | **C56X** | C560 | family_proxy | Cessna Citation V | `S` | 2 |
| KCIU | **C680** | C750 | family_proxy | Cessna Citation X | `D` | 4 |
| KCIU | **C68A** | C750 | family_proxy | Cessna Citation X | `D` | 4 |
| KCIU | **CL30** | CL60 | nearest_proxy | Bombardier CL-604/605 | `D` | 4 |
| KCIU | **CL35** | CL60 | nearest_proxy | Bombardier CL-604/605 | `D` | 4 |
| KCIU | **COL4** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KCIU | **DA40** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KCIU | **DHC6** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KCIU | **E120** | E135 | nearest_proxy | ERJ-135 | `D` | 4 |
| KCIU | **EA50** | F16 | nearest_proxy | F-16C | `S` | 2 |
| KCIU | **FA20** | F2TH | nearest_proxy | Dassault Falcon 2000 | `D` | 4 |
| KCIU | **FA7X** | F900 | nearest_proxy | Dassault Falcon 900B/C | `D` | 4 |
| KCIU | **G150** | H25B | nearest_proxy | Hawker-800/800XP | `D` | 4 |
| KCIU | **GLEX** | CRJ7 | nearest_proxy | CRJ700 | `D` | 4 |
| KCIU | **GLF6** | GLF5 | nearest_proxy | Gulfstream G-V/G500/G550 | `D` | 4 |
| KCIU | **HDJT** | C441 | nearest_proxy | Cessna C441 Conquest II | `S` | 2 |
| KCIU | **K35R** | B753 | nearest_proxy | B757-300 | `2D` | 8 |
| KCIU | **LEG2** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KCIU | **LJ31** | LJ35 | nearest_proxy | Learjet 35/36/35A/36A | `D` | 4 |
| KCIU | **LJ45** | LJ55 | nearest_proxy | Learjet 45/55B | `D` | 4 |
| KCIU | **LJ60** | LJ55 | nearest_proxy | Learjet 45/55B | `D` | 4 |
| KCIU | **M20P** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KCIU | **MU2** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KCIU | **P28A** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KCIU | **P28R** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KCIU | **P46T** | PA46 | family_proxy | PA-46-350P Malibu Mirage | `S` | 2 |
| KCIU | **PA28** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KCIU | **PA30** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KCIU | **PA44** | PA46 | nearest_proxy | PA-46-350P Malibu Mirage | `S` | 2 |
| KCIU | **PAY1** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KCIU | **PC12** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KCIU | **PRM1** | BE9L | nearest_proxy | Beechcraft King Air C90 | `S` | 2 |
| KCIU | **S22T** | C550 | nearest_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KCIU | **SF50** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KCIU | **SR20** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KCIU | **SW3** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `D` | 2 |
| KCIU | **SW4** | B350 | nearest_proxy | Beechcraft King Air 350 | `D` | 4 |
| KCIU | **TBM7** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KCIU | **TBM8** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KCIU | **TBM9** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KLHX | **A10** | F18S | nearest_proxy | F/A-18C | `S` | 2 |
| KLHX | **AA5** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KLHX | **AC11** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KLHX | **AC90** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KLHX | **AEST** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KLHX | **BE20** | BE10 | nearest_proxy | Beechcraft King Air B100 | `D` | 4 |
| KLHX | **BE35** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KLHX | **BE36** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KLHX | **BE58** | BE55 | nearest_proxy | Beechcraft Baron 55 | `S` | 2 |
| KLHX | **BE60** | BE55 | nearest_proxy | Beechcraft Baron 55 | `S` | 2 |
| KLHX | **BE90** | C441 | nearest_proxy | Cessna C441 Conquest II | `S` | 2 |
| KLHX | **BL17** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KLHX | **C150** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KLHX | **C152** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KLHX | **C177** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KLHX | **C185** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KLHX | **C25A** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KLHX | **C25B** | C550 | nearest_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KLHX | **C25M** | C525 | family_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KLHX | **C310** | C210 | nearest_proxy | Cessna C210 Centurion | `S` | 2 |
| KLHX | **C340** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KLHX | **C402** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KLHX | **C404** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KLHX | **C421** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KLHX | **C56X** | C560 | family_proxy | Cessna Citation V | `S` | 2 |
| KLHX | **CL30** | CL60 | nearest_proxy | Bombardier CL-604/605 | `D` | 4 |
| KLHX | **COL4** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KLHX | **DA20** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KLHX | **DA40** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KLHX | **DA42** | PA34 | nearest_proxy | PA-34-220T Seneca II/ III/ IV/V | `S` | 2 |
| KLHX | **DHC6** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KLHX | **DV20** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KLHX | **EA50** | F16 | nearest_proxy | F-16C | `S` | 2 |
| KLHX | **LJ45** | LJ55 | nearest_proxy | Learjet 45/55B | `D` | 4 |
| KLHX | **LNC4** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KLHX | **M20P** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KLHX | **M20T** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KLHX | **P180** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KLHX | **P28A** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KLHX | **P28B** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KLHX | **P28R** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KLHX | **P46T** | PA46 | family_proxy | PA-46-350P Malibu Mirage | `S` | 2 |
| KLHX | **PA22** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KLHX | **PA24** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KLHX | **PA28** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KLHX | **PA30** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KLHX | **PAY2** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KLHX | **PC12** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KLHX | **RV6** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KLHX | **RV7** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KLHX | **SR20** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KLHX | **SW4** | B350 | nearest_proxy | Beechcraft King Air 350 | `D` | 4 |
| KLHX | **T6** | BE55 | nearest_proxy | Beechcraft Baron 55 | `S` | 2 |
| KLHX | **TBM7** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KLHX | **TBM8** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KMQJ | **A10** | F18S | nearest_proxy | F/A-18C | `S` | 2 |
| KMQJ | **AA5** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMQJ | **AC11** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KMQJ | **AC50** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KMQJ | **AC6L** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KMQJ | **AC90** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMQJ | **AC95** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMQJ | **AEST** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KMQJ | **ASTR** | C750 | nearest_proxy | Cessna Citation X | `D` | 4 |
| KMQJ | **AT43** | DH8B | nearest_proxy | Q200/Dash 8 Series 200 | `D` | 4 |
| KMQJ | **B190** | B350 | nearest_proxy | Beechcraft King Air 350 | `D` | 4 |
| KMQJ | **BE20** | BE10 | nearest_proxy | Beechcraft King Air B100 | `D` | 4 |
| KMQJ | **BE23** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KMQJ | **BE24** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KMQJ | **BE30** | B350 | nearest_proxy | Beechcraft King Air 350 | `D` | 4 |
| KMQJ | **BE35** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KMQJ | **BE36** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KMQJ | **BE58** | BE55 | nearest_proxy | Beechcraft Baron 55 | `S` | 2 |
| KMQJ | **BE60** | BE55 | nearest_proxy | Beechcraft Baron 55 | `S` | 2 |
| KMQJ | **BE90** | C441 | nearest_proxy | Cessna C441 Conquest II | `S` | 2 |
| KMQJ | **BE99** | BE10 | nearest_proxy | Beechcraft King Air B100 | `D` | 4 |
| KMQJ | **BE9T** | BE10 | nearest_proxy | Beechcraft King Air B100 | `S` | 4 |
| KMQJ | **BL17** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KMQJ | **C140** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMQJ | **C150** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMQJ | **C152** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KMQJ | **C162** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMQJ | **C177** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMQJ | **C185** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KMQJ | **C195** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KMQJ | **C240** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KMQJ | **C25A** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMQJ | **C25B** | C550 | nearest_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KMQJ | **C25C** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMQJ | **C25M** | C525 | family_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMQJ | **C310** | C210 | nearest_proxy | Cessna C210 Centurion | `S` | 2 |
| KMQJ | **C335** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KMQJ | **C337** | C210 | nearest_proxy | Cessna C210 Centurion | `S` | 2 |
| KMQJ | **C340** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KMQJ | **C402** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KMQJ | **C404** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KMQJ | **C421** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KMQJ | **C425** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KMQJ | **C500** | C441 | nearest_proxy | Cessna C441 Conquest II | `S` | 2 |
| KMQJ | **C501** | C550 | family_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KMQJ | **C510** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KMQJ | **C55B** | C550 | family_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KMQJ | **C56X** | C560 | family_proxy | Cessna Citation V | `S` | 2 |
| KMQJ | **C680** | C750 | family_proxy | Cessna Citation X | `D` | 4 |
| KMQJ | **C68A** | C750 | family_proxy | Cessna Citation X | `D` | 4 |
| KMQJ | **CH7A** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMQJ | **CL30** | CL60 | nearest_proxy | Bombardier CL-604/605 | `D` | 4 |
| KMQJ | **CL35** | CL60 | nearest_proxy | Bombardier CL-604/605 | `D` | 4 |
| KMQJ | **COL4** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KMQJ | **CVLT** | E145 | nearest_proxy | ERJ-145 XR | `D` | 4 |
| KMQJ | **DA20** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMQJ | **DA40** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KMQJ | **DA42** | PA34 | nearest_proxy | PA-34-220T Seneca II/ III/ IV/V | `S` | 2 |
| KMQJ | **DV20** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMQJ | **E120** | E135 | nearest_proxy | ERJ-135 | `D` | 4 |
| KMQJ | **EA50** | F16 | nearest_proxy | F-16C | `S` | 2 |
| KMQJ | **FA20** | F2TH | nearest_proxy | Dassault Falcon 2000 | `D` | 4 |
| KMQJ | **FA7X** | F900 | nearest_proxy | Dassault Falcon 900B/C | `D` | 4 |
| KMQJ | **G150** | H25B | nearest_proxy | Hawker-800/800XP | `D` | 4 |
| KMQJ | **GLEX** | CRJ7 | nearest_proxy | CRJ700 | `D` | 4 |
| KMQJ | **GLF6** | GLF5 | nearest_proxy | Gulfstream G-V/G500/G550 | `D` | 4 |
| KMQJ | **HA4T** | H25B | nearest_proxy | Hawker-800/800XP | `D` | 4 |
| KMQJ | **HDJT** | C441 | nearest_proxy | Cessna C441 Conquest II | `S` | 2 |
| KMQJ | **J328** | DH8A | nearest_proxy | Q100/Dash 8 Series 100 | `D` | 4 |
| KMQJ | **LEG2** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMQJ | **LJ31** | LJ35 | nearest_proxy | Learjet 35/36/35A/36A | `D` | 4 |
| KMQJ | **LJ45** | LJ55 | nearest_proxy | Learjet 45/55B | `D` | 4 |
| KMQJ | **LJ60** | LJ55 | nearest_proxy | Learjet 45/55B | `D` | 4 |
| KMQJ | **LNC4** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KMQJ | **M20P** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMQJ | **M20T** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMQJ | **M600** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KMQJ | **MO20** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMQJ | **MU2** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMQJ | **P180** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMQJ | **P28A** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KMQJ | **P28B** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KMQJ | **P28R** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KMQJ | **P46T** | PA46 | family_proxy | PA-46-350P Malibu Mirage | `S` | 2 |
| KMQJ | **PA22** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KMQJ | **PA24** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KMQJ | **PA28** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMQJ | **PA30** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KMQJ | **PA44** | PA46 | nearest_proxy | PA-46-350P Malibu Mirage | `S` | 2 |
| KMQJ | **PAY1** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KMQJ | **PAY2** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KMQJ | **PC12** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KMQJ | **PC24** | LJ35 | nearest_proxy | Learjet 35/36/35A/36A | `D` | 4 |
| KMQJ | **PRM1** | BE9L | nearest_proxy | Beechcraft King Air C90 | `S` | 2 |
| KMQJ | **RV10** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMQJ | **RV6** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMQJ | **RV7** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMQJ | **S22T** | C550 | nearest_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KMQJ | **SF50** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KMQJ | **SR20** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KMQJ | **SW3** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `D` | 2 |
| KMQJ | **SW4** | B350 | nearest_proxy | Beechcraft King Air 350 | `D` | 4 |
| KMQJ | **T6** | BE55 | nearest_proxy | Beechcraft Baron 55 | `S` | 2 |
| KMQJ | **TBM7** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KMQJ | **TBM8** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KMQJ | **TBM9** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KMWH | **A10** | F18S | nearest_proxy | F/A-18C | `S` | 2 |
| KMWH | **A4** | A400 | nearest_proxy | A400M TLL2 | `3D` | 12 |
| KMWH | **AA5** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMWH | **AC11** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KMWH | **AC50** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KMWH | **AC80** | BE9L | nearest_proxy | Beechcraft King Air C90 | `S` | 2 |
| KMWH | **AC90** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMWH | **AC95** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMWH | **AEST** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KMWH | **ASTR** | C750 | nearest_proxy | Cessna Citation X | `D` | 4 |
| KMWH | **AT3P** | PA27 | nearest_proxy | PA-23-250 Aztec | `S` | 2 |
| KMWH | **AT43** | DH8B | nearest_proxy | Q200/Dash 8 Series 200 | `D` | 4 |
| KMWH | **AT8T** | BE40 | nearest_proxy | BeechJet-400/400A | `S` | 2 |
| KMWH | **B06** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KMWH | **B190** | B350 | nearest_proxy | Beechcraft King Air 350 | `D` | 4 |
| KMWH | **B461** | B463 | family_proxy | BAe 146-300/300QC/300QT | `D` | 4 |
| KMWH | **B462** | B463 | family_proxy | BAe 146-300/300QC/300QT | `D` | 4 |
| KMWH | **B703** | B762 | nearest_proxy | B767-200 ER | `2D` | 8 |
| KMWH | **BE19** | LJ35 | nearest_proxy | Learjet 35/36/35A/36A | `S` | 4 |
| KMWH | **BE20** | BE10 | nearest_proxy | Beechcraft King Air B100 | `D` | 4 |
| KMWH | **BE23** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KMWH | **BE24** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KMWH | **BE30** | B350 | nearest_proxy | Beechcraft King Air 350 | `D` | 4 |
| KMWH | **BE35** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KMWH | **BE36** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KMWH | **BE58** | BE55 | nearest_proxy | Beechcraft Baron 55 | `S` | 2 |
| KMWH | **BE60** | BE55 | nearest_proxy | Beechcraft Baron 55 | `S` | 2 |
| KMWH | **BE90** | C441 | nearest_proxy | Cessna C441 Conquest II | `S` | 2 |
| KMWH | **BE99** | BE10 | nearest_proxy | Beechcraft King Air B100 | `D` | 4 |
| KMWH | **BE9T** | BE10 | nearest_proxy | Beechcraft King Air B100 | `S` | 4 |
| KMWH | **BL17** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KMWH | **C140** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMWH | **C150** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMWH | **C152** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KMWH | **C162** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMWH | **C177** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMWH | **C185** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KMWH | **C240** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KMWH | **C25A** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMWH | **C25B** | C550 | nearest_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KMWH | **C25C** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMWH | **C25M** | C525 | family_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMWH | **C30J** | B752 | nearest_proxy | B757-200 | `2S` | 8 |
| KMWH | **C310** | C210 | nearest_proxy | Cessna C210 Centurion | `S` | 2 |
| KMWH | **C335** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KMWH | **C337** | C210 | nearest_proxy | Cessna C210 Centurion | `S` | 2 |
| KMWH | **C340** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KMWH | **C402** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KMWH | **C421** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KMWH | **C425** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KMWH | **C500** | C441 | nearest_proxy | Cessna C441 Conquest II | `S` | 2 |
| KMWH | **C501** | C550 | family_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KMWH | **C510** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KMWH | **C55B** | C550 | family_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KMWH | **C56X** | C560 | family_proxy | Cessna Citation V | `S` | 2 |
| KMWH | **C680** | C750 | family_proxy | Cessna Citation X | `D` | 4 |
| KMWH | **C68A** | C750 | family_proxy | Cessna Citation X | `D` | 4 |
| KMWH | **CH7A** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMWH | **CL30** | CL60 | nearest_proxy | Bombardier CL-604/605 | `D` | 4 |
| KMWH | **CL35** | CL60 | nearest_proxy | Bombardier CL-604/605 | `D` | 4 |
| KMWH | **COL4** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KMWH | **CVLT** | E145 | nearest_proxy | ERJ-145 XR | `D` | 4 |
| KMWH | **D328** | SF34 | nearest_proxy | Saab 340B | `D` | 4 |
| KMWH | **DA40** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KMWH | **DA42** | PA34 | nearest_proxy | PA-34-220T Seneca II/ III/ IV/V | `S` | 2 |
| KMWH | **DC91** | DC93 | nearest_proxy | DC9-32 | `D` | 4 |
| KMWH | **DG15** | PA34 | nearest_proxy | PA-34-220T Seneca II/ III/ IV/V | `S` | 2 |
| KMWH | **DHC6** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMWH | **E120** | E135 | nearest_proxy | ERJ-135 | `D` | 4 |
| KMWH | **EA50** | F16 | nearest_proxy | F-16C | `S` | 2 |
| KMWH | **EPIC** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KMWH | **F18** | F15 | nearest_proxy | F-15C | `S` | 2 |
| KMWH | **FA20** | F2TH | nearest_proxy | Dassault Falcon 2000 | `D` | 4 |
| KMWH | **FA7X** | F900 | nearest_proxy | Dassault Falcon 900B/C | `D` | 4 |
| KMWH | **G150** | H25B | nearest_proxy | Hawker-800/800XP | `D` | 4 |
| KMWH | **GLEX** | CRJ7 | nearest_proxy | CRJ700 | `D` | 4 |
| KMWH | **GLF6** | GLF5 | nearest_proxy | Gulfstream G-V/G500/G550 | `D` | 4 |
| KMWH | **HA4T** | H25B | nearest_proxy | Hawker-800/800XP | `D` | 4 |
| KMWH | **HDJT** | C441 | nearest_proxy | Cessna C441 Conquest II | `S` | 2 |
| KMWH | **K35R** | B753 | nearest_proxy | B757-300 | `2D` | 8 |
| KMWH | **LEG2** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMWH | **LGEZ** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMWH | **LJ31** | LJ35 | nearest_proxy | Learjet 35/36/35A/36A | `D` | 4 |
| KMWH | **LJ45** | LJ55 | nearest_proxy | Learjet 45/55B | `D` | 4 |
| KMWH | **LJ60** | LJ55 | nearest_proxy | Learjet 45/55B | `D` | 4 |
| KMWH | **LNC4** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KMWH | **M20P** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMWH | **M20T** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMWH | **MO20** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMWH | **MRJ9** | CRJ9 | nearest_proxy | CRJ900 | `D` | 4 |
| KMWH | **MU2** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMWH | **P180** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMWH | **P28A** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KMWH | **P28B** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KMWH | **P28R** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KMWH | **P46T** | PA46 | family_proxy | PA-46-350P Malibu Mirage | `S` | 2 |
| KMWH | **PA22** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KMWH | **PA24** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KMWH | **PA28** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMWH | **PA30** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KMWH | **PA44** | PA46 | nearest_proxy | PA-46-350P Malibu Mirage | `S` | 2 |
| KMWH | **PAY1** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KMWH | **PAY2** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KMWH | **PC12** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KMWH | **PC24** | LJ35 | nearest_proxy | Learjet 35/36/35A/36A | `D` | 4 |
| KMWH | **PRM1** | BE9L | nearest_proxy | Beechcraft King Air C90 | `S` | 2 |
| KMWH | **RJ85** | B463 | nearest_proxy | BAe 146-300/300QC/300QT | `D` | 4 |
| KMWH | **RV10** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMWH | **RV12** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMWH | **RV6** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMWH | **RV7** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KMWH | **S22T** | C550 | nearest_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KMWH | **SF50** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KMWH | **SR20** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KMWH | **SW3** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `D` | 2 |
| KMWH | **SW4** | B350 | nearest_proxy | Beechcraft King Air 350 | `D` | 4 |
| KMWH | **T38** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KMWH | **T6** | BE55 | nearest_proxy | Beechcraft Baron 55 | `S` | 2 |
| KMWH | **TBM7** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KMWH | **TBM8** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KMWH | **TBM9** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KOTM | **A10** | F18S | nearest_proxy | F/A-18C | `S` | 2 |
| KOTM | **AA5** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KOTM | **AC11** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KOTM | **AC50** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KOTM | **AC90** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KOTM | **AC95** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KOTM | **AEST** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KOTM | **B190** | B350 | nearest_proxy | Beechcraft King Air 350 | `D` | 4 |
| KOTM | **BE20** | BE10 | nearest_proxy | Beechcraft King Air B100 | `D` | 4 |
| KOTM | **BE23** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KOTM | **BE30** | B350 | nearest_proxy | Beechcraft King Air 350 | `D` | 4 |
| KOTM | **BE35** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KOTM | **BE36** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KOTM | **BE58** | BE55 | nearest_proxy | Beechcraft Baron 55 | `S` | 2 |
| KOTM | **BL17** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KOTM | **C140** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KOTM | **C150** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KOTM | **C152** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KOTM | **C177** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KOTM | **C185** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KOTM | **C195** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KOTM | **C240** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KOTM | **C25A** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KOTM | **C25B** | C550 | nearest_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KOTM | **C25C** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KOTM | **C310** | C210 | nearest_proxy | Cessna C210 Centurion | `S` | 2 |
| KOTM | **C337** | C210 | nearest_proxy | Cessna C210 Centurion | `S` | 2 |
| KOTM | **C340** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KOTM | **C402** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KOTM | **C421** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KOTM | **C425** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KOTM | **C501** | C550 | family_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KOTM | **C510** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KOTM | **C56X** | C560 | family_proxy | Cessna Citation V | `S` | 2 |
| KOTM | **C680** | C750 | family_proxy | Cessna Citation X | `D` | 4 |
| KOTM | **C68A** | C750 | family_proxy | Cessna Citation X | `D` | 4 |
| KOTM | **CL30** | CL60 | nearest_proxy | Bombardier CL-604/605 | `D` | 4 |
| KOTM | **CL35** | CL60 | nearest_proxy | Bombardier CL-604/605 | `D` | 4 |
| KOTM | **COL4** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KOTM | **DA40** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KOTM | **DA42** | PA34 | nearest_proxy | PA-34-220T Seneca II/ III/ IV/V | `S` | 2 |
| KOTM | **DG15** | PA34 | nearest_proxy | PA-34-220T Seneca II/ III/ IV/V | `S` | 2 |
| KOTM | **EA50** | F16 | nearest_proxy | F-16C | `S` | 2 |
| KOTM | **ERCO** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KOTM | **G150** | H25B | nearest_proxy | Hawker-800/800XP | `D` | 4 |
| KOTM | **HDJT** | C441 | nearest_proxy | Cessna C441 Conquest II | `S` | 2 |
| KOTM | **LJ45** | LJ55 | nearest_proxy | Learjet 45/55B | `D` | 4 |
| KOTM | **LJ60** | LJ55 | nearest_proxy | Learjet 45/55B | `D` | 4 |
| KOTM | **LNC4** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KOTM | **M20P** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KOTM | **M20T** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KOTM | **MO20** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KOTM | **MU2** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KOTM | **P180** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KOTM | **P28A** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KOTM | **P28B** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KOTM | **P28R** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KOTM | **P46T** | PA46 | family_proxy | PA-46-350P Malibu Mirage | `S` | 2 |
| KOTM | **PA24** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KOTM | **PA28** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KOTM | **PA30** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KOTM | **PA44** | PA46 | nearest_proxy | PA-46-350P Malibu Mirage | `S` | 2 |
| KOTM | **PAY1** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KOTM | **PAY2** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KOTM | **PC12** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KOTM | **PRM1** | BE9L | nearest_proxy | Beechcraft King Air C90 | `S` | 2 |
| KOTM | **R135** | B753 | nearest_proxy | B757-300 | `2D` | 8 |
| KOTM | **RV10** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KOTM | **RV6** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KOTM | **RV7** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KOTM | **S22T** | C550 | nearest_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KOTM | **SR20** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KOTM | **TBM7** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KOTM | **TBM8** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KOTM | **TBM9** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KPUB | **A10** | F18S | nearest_proxy | F/A-18C | `S` | 2 |
| KPUB | **AA5** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KPUB | **AC11** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KPUB | **AC50** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KPUB | **AC68** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KPUB | **AC80** | BE9L | nearest_proxy | Beechcraft King Air C90 | `S` | 2 |
| KPUB | **AC90** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KPUB | **AC95** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KPUB | **AEST** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KPUB | **ASTR** | C750 | nearest_proxy | Cessna Citation X | `D` | 4 |
| KPUB | **AT5T** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KPUB | **AT8T** | BE40 | nearest_proxy | BeechJet-400/400A | `S` | 2 |
| KPUB | **B190** | B350 | nearest_proxy | Beechcraft King Air 350 | `D` | 4 |
| KPUB | **B462** | B463 | family_proxy | BAe 146-300/300QC/300QT | `D` | 4 |
| KPUB | **BE19** | LJ35 | nearest_proxy | Learjet 35/36/35A/36A | `S` | 4 |
| KPUB | **BE20** | BE10 | nearest_proxy | Beechcraft King Air B100 | `D` | 4 |
| KPUB | **BE23** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KPUB | **BE24** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KPUB | **BE30** | B350 | nearest_proxy | Beechcraft King Air 350 | `D` | 4 |
| KPUB | **BE35** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KPUB | **BE36** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KPUB | **BE56** | BE55 | nearest_proxy | Beechcraft Baron 55 | `S` | 2 |
| KPUB | **BE58** | BE55 | nearest_proxy | Beechcraft Baron 55 | `S` | 2 |
| KPUB | **BE60** | BE55 | nearest_proxy | Beechcraft Baron 55 | `S` | 2 |
| KPUB | **BE65** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KPUB | **BE90** | C441 | nearest_proxy | Cessna C441 Conquest II | `S` | 2 |
| KPUB | **BE99** | BE10 | nearest_proxy | Beechcraft King Air B100 | `D` | 4 |
| KPUB | **BE9T** | BE10 | nearest_proxy | Beechcraft King Air B100 | `S` | 4 |
| KPUB | **BL17** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KPUB | **C140** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KPUB | **C150** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KPUB | **C152** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KPUB | **C162** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KPUB | **C177** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KPUB | **C185** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KPUB | **C195** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KPUB | **C240** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KPUB | **C25A** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KPUB | **C25B** | C550 | nearest_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KPUB | **C25C** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KPUB | **C25M** | C525 | family_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KPUB | **C30J** | B752 | nearest_proxy | B757-200 | `2S` | 8 |
| KPUB | **C310** | C210 | nearest_proxy | Cessna C210 Centurion | `S` | 2 |
| KPUB | **C335** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KPUB | **C337** | C210 | nearest_proxy | Cessna C210 Centurion | `S` | 2 |
| KPUB | **C340** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KPUB | **C402** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KPUB | **C404** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KPUB | **C421** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KPUB | **C425** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KPUB | **C500** | C441 | nearest_proxy | Cessna C441 Conquest II | `S` | 2 |
| KPUB | **C501** | C550 | family_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KPUB | **C510** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KPUB | **C55B** | C550 | family_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KPUB | **C56X** | C560 | family_proxy | Cessna Citation V | `S` | 2 |
| KPUB | **C680** | C750 | family_proxy | Cessna Citation X | `D` | 4 |
| KPUB | **C68A** | C750 | family_proxy | Cessna Citation X | `D` | 4 |
| KPUB | **CH7A** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KPUB | **CL30** | CL60 | nearest_proxy | Bombardier CL-604/605 | `D` | 4 |
| KPUB | **CL35** | CL60 | nearest_proxy | Bombardier CL-604/605 | `D` | 4 |
| KPUB | **COL4** | C206 | nearest_proxy | Cessna 206 Stationair | `S` | 2 |
| KPUB | **D328** | SF34 | nearest_proxy | Saab 340B | `D` | 4 |
| KPUB | **DA20** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KPUB | **DA40** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KPUB | **DA42** | PA34 | nearest_proxy | PA-34-220T Seneca II/ III/ IV/V | `S` | 2 |
| KPUB | **DC91** | DC93 | nearest_proxy | DC9-32 | `D` | 4 |
| KPUB | **DHC6** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KPUB | **DV20** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KPUB | **E120** | E135 | nearest_proxy | ERJ-135 | `D` | 4 |
| KPUB | **E45X** | E145 | family_proxy | ERJ-145 XR | `D` | 4 |
| KPUB | **E75L** | E75S | family_proxy | EMB-175 STD | `D` | 4 |
| KPUB | **EA50** | F16 | nearest_proxy | F-16C | `S` | 2 |
| KPUB | **EPIC** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KPUB | **F18** | F15 | nearest_proxy | F-15C | `S` | 2 |
| KPUB | **FA20** | F2TH | nearest_proxy | Dassault Falcon 2000 | `D` | 4 |
| KPUB | **FA7X** | F900 | nearest_proxy | Dassault Falcon 900B/C | `D` | 4 |
| KPUB | **G150** | H25B | nearest_proxy | Hawker-800/800XP | `D` | 4 |
| KPUB | **GLEX** | CRJ7 | nearest_proxy | CRJ700 | `D` | 4 |
| KPUB | **GLF6** | GLF5 | nearest_proxy | Gulfstream G-V/G500/G550 | `D` | 4 |
| KPUB | **HA4T** | H25B | nearest_proxy | Hawker-800/800XP | `D` | 4 |
| KPUB | **HDJT** | C441 | nearest_proxy | Cessna C441 Conquest II | `S` | 2 |
| KPUB | **J328** | DH8A | nearest_proxy | Q100/Dash 8 Series 100 | `D` | 4 |
| KPUB | **K35R** | B753 | nearest_proxy | B757-300 | `2D` | 8 |
| KPUB | **LEG2** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KPUB | **LGEZ** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KPUB | **LJ31** | LJ35 | nearest_proxy | Learjet 35/36/35A/36A | `D` | 4 |
| KPUB | **LJ45** | LJ55 | nearest_proxy | Learjet 45/55B | `D` | 4 |
| KPUB | **LJ60** | LJ55 | nearest_proxy | Learjet 45/55B | `D` | 4 |
| KPUB | **LNC4** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KPUB | **M20P** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KPUB | **M20T** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KPUB | **M600** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KPUB | **MD82** | MD83 | nearest_proxy | MD-83 | `D` | 4 |
| KPUB | **MO20** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KPUB | **MU2** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KPUB | **P180** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KPUB | **P28A** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KPUB | **P28B** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KPUB | **P28R** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KPUB | **P46T** | PA46 | family_proxy | PA-46-350P Malibu Mirage | `S` | 2 |
| KPUB | **PA22** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KPUB | **PA24** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KPUB | **PA28** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KPUB | **PA30** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `S` | 2 |
| KPUB | **PA44** | PA46 | nearest_proxy | PA-46-350P Malibu Mirage | `S` | 2 |
| KPUB | **PAY1** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KPUB | **PAY2** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KPUB | **PC12** | C208 | nearest_proxy | Cessna 208B Grand Caravan EX | `S` | 2 |
| KPUB | **PC24** | LJ35 | nearest_proxy | Learjet 35/36/35A/36A | `D` | 4 |
| KPUB | **PRM1** | BE9L | nearest_proxy | Beechcraft King Air C90 | `S` | 2 |
| KPUB | **R135** | B753 | nearest_proxy | B757-300 | `2D` | 8 |
| KPUB | **RJ85** | B463 | nearest_proxy | BAe 146-300/300QC/300QT | `D` | 4 |
| KPUB | **RV10** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KPUB | **RV12** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KPUB | **RV6** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KPUB | **RV7** | C172 | nearest_proxy | Cessna 172 Skyhawk | `S` | 2 |
| KPUB | **S22T** | C550 | nearest_proxy | Cessna Citation II/Bravo C550/551 | `S` | 2 |
| KPUB | **SF50** | C414 | nearest_proxy | Cessna 414/414A Chancellor | `S` | 2 |
| KPUB | **SR20** | C182 | nearest_proxy | Cessna 182 Skylane | `S` | 2 |
| KPUB | **SW3** | PA32 | nearest_proxy | PA-32-300 Cherokee Six | `D` | 2 |
| KPUB | **SW4** | B350 | nearest_proxy | Beechcraft King Air 350 | `D` | 4 |
| KPUB | **T34P** | BE33 | nearest_proxy | Beechcraft Bonanza F33A | `S` | 2 |
| KPUB | **T38** | C525 | nearest_proxy | Cessna Citation M2 C525 | `S` | 2 |
| KPUB | **T6** | BE55 | nearest_proxy | Beechcraft Baron 55 | `S` | 2 |
| KPUB | **TBM7** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KPUB | **TBM8** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KPUB | **TBM9** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |
| KPUB | **TEX2** | PA31 | nearest_proxy | PA-31-325 Navajo C/R | `S` | 2 |

## Full per-airport listing

### KLHX — 79 unique aircraft

| Sev | ICAO | Excel gear | Lib gear | Excel MTOW | n_wheels | Source | FAARFIELD name | Excel count |
|---|---|---|---|---|---|---|---|---|
| 🟦 | **DV20** | `S` | `S` | 1,764 | 2 | nearest_proxy | Cessna 172 Skyhawk | 2940 |
| 🟢 | **C172** | `S` | `S` | 2,450 | 2 | xml | Cessna 172 Skyhawk | 177 |
| 🟢 | **C182** | `S` | `S` | 2,550 | 2 | xml | Cessna 182 Skylane | 48 |
| 🟦 | **PA28** | `S` | `S` | 2,150 | 2 | nearest_proxy | Cessna 172 Skyhawk | 25 |
| 🟦 | **SW4** | `D` | `D` | 14,500 | 4 | nearest_proxy | Beechcraft King Air 350 | 23 |
| 🟦 | **BE35** | `S` | `S` | 3,400 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 16 |
| 🟦 | **P28A** | `S` | `S` | 2,548 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 15 |
| 🟦 | **C177** | `S` | `S` | 2,500 | 2 | nearest_proxy | Cessna 172 Skyhawk | 14 |
| 🟦 | **BE36** | `S` | `S` | 3,650 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 12 |
| 🟦 | **BE20** | `D` | `D` | 12,500 | 4 | nearest_proxy | Beechcraft King Air B100 | 11 |
| 🟦 | **M20P** | `S` | `S` | 2,579 | 2 | nearest_proxy | Cessna 172 Skyhawk | 11 |
| 🟨 | **BE9L** | `D` | `S` | 10,097 | 2 | xml | Beechcraft King Air C90 | 10 |
| 🟢 | **C210** | `S` | `S` | 3,100 | 2 | xml | Cessna C210 Centurion | 10 |
| 🟦 | **DA40** | `S` | `S` | 2,888 | 2 | nearest_proxy | Cessna 182 Skylane | 10 |
| 🟦 | **SR20** | `S` | `S` | 3,000 | 2 | nearest_proxy | Cessna 182 Skylane | 8 |
| 🟢 | **BE33** | `S` | `S` | 3,500 | 2 | xml | Beechcraft Bonanza F33A | 7 |
| 🟦 | **DA20** | `S` | `S` | 1,764 | 2 | nearest_proxy | Cessna 172 Skyhawk | 7 |
| 🟦 | **EA50** | `S` | `S` | 39,595 | 2 | nearest_proxy | F-16C | 7 |
| 🟢 | **PA32** | `S` | `S` | 3,400 | 2 | xml | PA-32-300 Cherokee Six | 7 |
| 🟢 | **PA46** | `S` | `S` | 4,299 | 2 | xml | PA-46-350P Malibu Mirage | 7 |
| 🟦 | **C185** | `S` | `S` | 3,348 | 2 | nearest_proxy | Cessna 206 Stationair | 6 |
| 🟦 | **C25A** | `S` | `S` | 12,125 | 2 | nearest_proxy | Cessna Citation M2 C525 | 6 |
| 🟦 | **PA24** | `S` | `S` | 3,200 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 6 |
| 🟦 | **AA5** | `S` | `S` | 2,400 | 2 | nearest_proxy | Cessna 172 Skyhawk | 5 |
| 🟨 | **C130** | `2D` | `2S` | 155,000 | 4 | xml | C-130-70 | 5 |
| 🟢 | **C206** | `S` | `S` | 3,600 | 2 | xml | Cessna 206 Stationair | 5 |
| 🟦 | **C340** | `S` | `S` | 5,974 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 5 |
| 🟦 | **DHC6** | `S` | `S` | 12,500 | 2 | nearest_proxy | Cessna Citation M2 C525 | 5 |
| 🟢 | **F16** | `S` | `S` | 3,306 | 2 | xml | F-16C | 5 |
| 🟦 | **P28R** | `S` | `S` | 2,866 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 5 |
| 🟦 | **BL17** | `S` | `S` | 3,325 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 4 |
| 🟦 | **C150** | `S` | `S` | 1,543 | 2 | nearest_proxy | Cessna 172 Skyhawk | 4 |
| 🟦 | **C310** | `S` | `S` | 4,600 | 2 | nearest_proxy | Cessna C210 Centurion | 4 |
| 🟦 | **C404** | `S` | `S` | 8,400 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 4 |
| 🟦 | **PC12** | `S` | `S` | 9,039 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 4 |
| 🟦 | **AEST** | `S` | `S` | 6,850 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 3 |
| 🟦 | **BE58** | `S` | `S` | 5,500 | 2 | nearest_proxy | Beechcraft Baron 55 | 3 |
| 🟦 | **PA30** | `S` | `S` | 3,725 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 3 |
| 🟦 | **TBM7** | `S` | `S` | 6,613 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 3 |
| 🟢 | **BE55** | `S` | `S` | 5,300 | 2 | xml | Beechcraft Baron 55 | 2 |
| 🟢 | **C208** | `S` | `S` | 7,800 | 2 | xml | Cessna 208B Grand Caravan EX | 2 |
| 🟦 | **C25B** | `S` | `S` | 13,870 | 2 | nearest_proxy | Cessna Citation II/Bravo C550/551 | 2 |
| 🟦 | **C402** | `S` | `S` | 6,850 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 2 |
| 🟢 | **C414** | `S` | `S` | 6,750 | 2 | xml | Cessna 414/414A Chancellor | 2 |
| 🟢 | **C525** | `S` | `S` | 10,700 | 2 | xml | Cessna Citation M2 C525 | 2 |
| 🟢 | **C550** | `S` | `S` | 14,800 | 2 | xml | Cessna Citation II/Bravo C550/551 | 2 |
| 🟢 | **C560** | `S` | `S` | 16,300 | 2 | xml | Cessna Citation V | 2 |
| 🟦 | **C56X** | `S` | `S` | 15,000 | 2 | family_proxy | Cessna Citation V | 2 |
| 🟦 | **COL4** | `S` | `S` | 3,600 | 2 | nearest_proxy | Cessna 206 Stationair | 2 |
| 🟢 | **E50P** | `S` | `S` | 10,471 | 2 | proxy_override | BeechJet-400/400A | 2 |
| 🟦 | **LNC4** | `S` | `S` | 3,086 | 2 | nearest_proxy | Cessna 182 Skylane | 2 |
| 🟦 | **M20T** | `S` | `S` | 12,500 | 2 | nearest_proxy | Cessna Citation M2 C525 | 2 |
| 🟦 | **PA22** | `S` | `S` | 1,950 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 2 |
| 🟦 | **A10** | `S` | `S` | 50,044 | 2 | nearest_proxy | F/A-18C | 1 |
| 🟦 | **AC11** | `S` | `S` | 3,262 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 1 |
| 🟦 | **AC90** | `S` | `S` | 10,700 | 2 | nearest_proxy | Cessna Citation M2 C525 | 1 |
| 🟦 | **BE60** | `S` | `S` | 6,775 | 2 | nearest_proxy | Beechcraft Baron 55 | 1 |
| 🟦 | **BE90** | `S` | `S` | 10,097 | 2 | nearest_proxy | Cessna C441 Conquest II | 1 |
| 🟦 | **C152** | `S` | `S` | 5,732 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 1 |
| 🟦 | **C25M** | `S` | `S` | 13,870 | 2 | family_proxy | Cessna Citation M2 C525 | 1 |
| 🟦 | **C421** | `S` | `S` | 7,450 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 1 |
| 🟢 | **C441** | `S` | `S` | 9,850 | 2 | xml | Cessna C441 Conquest II | 1 |
| 🟢 | **C650** | `D` | `D` | 22,002 | 4 | xml | Cessna Citation VI/VII | 1 |
| 🟦 | **CL30** | `D` | `D` | 37,478 | 4 | nearest_proxy | Bombardier CL-604/605 | 1 |
| 🟢 | **CRJ9** | `D` | `D` | 80,500 | 4 | xml | CRJ900 | 1 |
| 🟦 | **DA42** | `S` | `S` | 4,407 | 2 | nearest_proxy | PA-34-220T Seneca II/ III/ IV/V | 1 |
| 🟢 | **F2TH** | `D` | `D` | 34,833 | 4 | xml | Dassault Falcon 2000 | 1 |
| 🟢 | **H25B** | `D` | `D` | 28,000 | 4 | xml | Hawker-800/800XP | 1 |
| 🟦 | **LJ45** | `D` | `D` | 21,500 | 4 | nearest_proxy | Learjet 45/55B | 1 |
| 🟦 | **P180** | `S` | `S` | 12,100 | 2 | nearest_proxy | Cessna Citation M2 C525 | 1 |
| 🟦 | **P28B** | `S` | `S` | 2,150 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 1 |
| 🟢 | **P32R** | `S` | `S` | 3,615 | 2 | xml | PA-32R-301 Saratoga | 1 |
| 🟦 | **P46T** | `S` | `S` | 4,850 | 2 | family_proxy | PA-46-350P Malibu Mirage | 1 |
| 🟢 | **PA34** | `S` | `S` | 4,629 | 2 | xml | PA-34-220T Seneca II/ III/ IV/V | 1 |
| 🟦 | **PAY2** | `S` | `S` | 9,479 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 1 |
| 🟦 | **RV6** | `S` | `S` | 1,650 | 2 | nearest_proxy | Cessna 172 Skyhawk | 1 |
| 🟦 | **RV7** | `S` | `S` | 1,600 | 2 | nearest_proxy | Cessna 172 Skyhawk | 1 |
| 🟦 | **T6** | `S` | `S` | 5,617 | 2 | nearest_proxy | Beechcraft Baron 55 | 1 |
| 🟦 | **TBM8** | `S` | `S` | 7,495 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 1 |

### KPUB — 201 unique aircraft

| Sev | ICAO | Excel gear | Lib gear | Excel MTOW | n_wheels | Source | FAARFIELD name | Excel count |
|---|---|---|---|---|---|---|---|---|
| 🟦 | **DV20** | `S` | `S` | 1,764 | 2 | nearest_proxy | Cessna 172 Skyhawk | 79884 |
| 🟥 | **UNKNOWN** | `UNKNOWN` | `UNKNOWN` | -1 | 2 | dual_fallback |  | 8564 |
| 🟢 | **C172** | `S` | `S` | 2,450 | 2 | xml | Cessna 172 Skyhawk | 4238 |
| 🟢 | **CRJ2** | `D` | `D` | 53,000 | 4 | xml | CRJ100LR/200LR | 2841 |
| 🟦 | **SW4** | `D` | `D` | 14,500 | 4 | nearest_proxy | Beechcraft King Air 350 | 2369 |
| 🟨 | **BE9L** | `D` | `S` | 10,097 | 2 | xml | Beechcraft King Air C90 | 2329 |
| 🟢 | **C182** | `S` | `S` | 2,550 | 2 | xml | Cessna 182 Skylane | 1397 |
| 🟦 | **BE20** | `D` | `D` | 12,500 | 4 | nearest_proxy | Beechcraft King Air B100 | 1333 |
| 🟦 | **C56X** | `S` | `S` | 15,000 | 2 | family_proxy | Cessna Citation V | 926 |
| 🟦 | **B190** | `D` | `D` | 17,120 | 4 | nearest_proxy | Beechcraft King Air 350 | 924 |
| 🟢 | **C525** | `S` | `S` | 10,700 | 2 | xml | Cessna Citation M2 C525 | 914 |
| 🟦 | **P28A** | `S` | `S` | 2,548 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 850 |
| 🟢 | **BE40** | `S` | `S` | 16,100 | 2 | xml | BeechJet-400/400A | 803 |
| 🟦 | **PC12** | `S` | `S` | 9,039 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 793 |
| 🟦 | **E120** | `D` | `D` | 25,353 | 4 | nearest_proxy | ERJ-135 | 785 |
| 🟦 | **LJ45** | `D` | `D` | 21,500 | 4 | nearest_proxy | Learjet 45/55B | 614 |
| 🟢 | **C560** | `S` | `S` | 16,300 | 2 | xml | Cessna Citation V | 604 |
| 🟦 | **TEX2** | `S` | `S` | 6,500 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 604 |
| 🟢 | **C550** | `S` | `S` | 14,800 | 2 | xml | Cessna Citation II/Bravo C550/551 | 510 |
| 🟦 | **PA28** | `S` | `S` | 2,150 | 2 | nearest_proxy | Cessna 172 Skyhawk | 487 |
| 🟦 | **P46T** | `S` | `S` | 4,850 | 2 | family_proxy | PA-46-350P Malibu Mirage | 477 |
| 🟢 | **C210** | `S` | `S` | 3,100 | 2 | xml | Cessna C210 Centurion | 448 |
| 🟢 | **E50P** | `S` | `S` | 10,471 | 2 | proxy_override | BeechJet-400/400A | 408 |
| 🟨 | **C130** | `2D` | `2S` | 155,000 | 4 | xml | C-130-70 | 392 |
| 🟢 | **LJ35** | `D` | `D` | 18,000 | 4 | xml | Learjet 35/36/35A/36A | 388 |
| 🟦 | **PRM1** | `S` | `S` | 8,800 | 2 | nearest_proxy | Beechcraft King Air C90 | 380 |
| 🟦 | **C25B** | `S` | `S` | 13,870 | 2 | nearest_proxy | Cessna Citation II/Bravo C550/551 | 368 |
| 🟦 | **BE35** | `S` | `S` | 3,400 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 365 |
| 🟦 | **C510** | `S` | `S` | 7,716 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 335 |
| 🟦 | **C25A** | `S` | `S` | 12,125 | 2 | nearest_proxy | Cessna Citation M2 C525 | 328 |
| 🟦 | **SR20** | `S` | `S` | 3,000 | 2 | nearest_proxy | Cessna 182 Skylane | 309 |
| 🟦 | **BE36** | `S` | `S` | 3,650 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 305 |
| 🟢 | **PA46** | `S` | `S` | 4,299 | 2 | xml | PA-46-350P Malibu Mirage | 297 |
| 🟢 | **H25B** | `D` | `D` | 28,000 | 4 | xml | Hawker-800/800XP | 293 |
| 🟦 | **EA50** | `S` | `S` | 39,595 | 2 | nearest_proxy | F-16C | 285 |
| 🟦 | **M20P** | `S` | `S` | 2,579 | 2 | nearest_proxy | Cessna 172 Skyhawk | 279 |
| 🟦 | **PA24** | `S` | `S` | 3,200 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 276 |
| 🟢 | **E55P** | `S` | `S` | 17,528 | 4 | proxy_override | Cessna Citation VI/VII | 272 |
| 🟦 | **DA20** | `S` | `S` | 1,764 | 2 | nearest_proxy | Cessna 172 Skyhawk | 268 |
| 🟢 | **B350** | `D` | `D` | 16,500 | 4 | xml | Beechcraft King Air 350 | 267 |
| 🟢 | **C650** | `D` | `D` | 22,002 | 4 | xml | Cessna Citation VI/VII | 250 |
| 🟦 | **P28R** | `S` | `S` | 2,866 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 218 |
| 🟢 | **C206** | `S` | `S` | 3,600 | 2 | xml | Cessna 206 Stationair | 215 |
| 🟦 | **TBM8** | `S` | `S` | 7,495 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 192 |
| 🟢 | **C441** | `S` | `S` | 9,850 | 2 | xml | Cessna C441 Conquest II | 186 |
| 🟢 | **PA32** | `S` | `S` | 3,400 | 2 | xml | PA-32-300 Cherokee Six | 176 |
| 🟦 | **C25C** | `S` | `S` | 10,361 | 2 | nearest_proxy | Cessna Citation M2 C525 | 175 |
| 🟦 | **MU2** | `S` | `S` | 11,574 | 2 | nearest_proxy | Cessna Citation M2 C525 | 170 |
| 🟦 | **LJ60** | `D` | `D` | 23,500 | 4 | nearest_proxy | Learjet 45/55B | 167 |
| 🟦 | **PA44** | `S` | `S` | 3,798 | 2 | nearest_proxy | PA-46-350P Malibu Mirage | 163 |
| 🟦 | **TBM7** | `S` | `S` | 6,613 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 162 |
| 🟦 | **C310** | `S` | `S` | 4,600 | 2 | nearest_proxy | Cessna C210 Centurion | 155 |
| 🟦 | **PAY2** | `S` | `S` | 9,479 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 155 |
| 🟦 | **C425** | `S` | `S` | 8,598 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 147 |
| 🟦 | **BE30** | `D` | `D` | 14,000 | 4 | nearest_proxy | Beechcraft King Air 350 | 132 |
| 🟨 | **C750** | `S` | `D` | 35,699 | 4 | xml | Cessna Citation X | 132 |
| 🟦 | **C680** | `D` | `D` | 30,000 | 4 | family_proxy | Cessna Citation X | 130 |
| 🟦 | **PA30** | `S` | `S` | 3,725 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 130 |
| 🟦 | **DA40** | `S` | `S` | 2,888 | 2 | nearest_proxy | Cessna 182 Skylane | 129 |
| 🟢 | **F18S** | `S` | `S` | 55,997 | 2 | xml | F/A-18C | 128 |
| 🟦 | **S22T** | `S` | `S` | 15,100 | 2 | nearest_proxy | Cessna Citation II/Bravo C550/551 | 124 |
| 🟦 | **C340** | `S` | `S` | 5,974 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 123 |
| 🟦 | **C421** | `S` | `S` | 7,450 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 120 |
| 🟦 | **LJ31** | `D` | `D` | 17,698 | 4 | nearest_proxy | Learjet 35/36/35A/36A | 116 |
| 🟦 | **TBM9** | `S` | `S` | 7,394 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 112 |
| 🟢 | **C414** | `S` | `S` | 6,750 | 2 | xml | Cessna 414/414A Chancellor | 108 |
| 🟦 | **BE58** | `S` | `S` | 5,500 | 2 | nearest_proxy | Beechcraft Baron 55 | 106 |
| 🟦 | **C25M** | `S` | `S` | 13,870 | 2 | family_proxy | Cessna Citation M2 C525 | 106 |
| 🟦 | **M20T** | `S` | `S` | 12,500 | 2 | nearest_proxy | Cessna Citation M2 C525 | 106 |
| 🟢 | **BE33** | `S` | `S` | 3,500 | 2 | xml | Beechcraft Bonanza F33A | 104 |
| 🟦 | **C185** | `S` | `S` | 3,348 | 2 | nearest_proxy | Cessna 206 Stationair | 104 |
| 🟦 | **SF50** | `S` | `S` | 6,000 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 104 |
| 🟢 | **BE55** | `S` | `S` | 5,300 | 2 | xml | Beechcraft Baron 55 | 103 |
| 🟢 | **B734** | `D` | `D` | 150,000 | 4 | xml | B737-400 | 102 |
| 🟢 | **CL60** | `D` | `D` | 48,200 | 4 | xml | Bombardier CL-604/605 | 100 |
| 🟦 | **DHC6** | `S` | `S` | 12,500 | 2 | nearest_proxy | Cessna Citation M2 C525 | 100 |
| 🟢 | **B738** | `D` | `D` | 174,200 | 4 | xml | B737 BBJ2 | 98 |
| 🟦 | **HDJT** | `S` | `S` | 9,963 | 2 | nearest_proxy | Cessna C441 Conquest II | 94 |
| 🟦 | **FA20** | `D` | `D` | 30,325 | 4 | nearest_proxy | Dassault Falcon 2000 | 92 |
| 🟦 | **C501** | `S` | `S` | 13,227 | 2 | family_proxy | Cessna Citation II/Bravo C550/551 | 90 |
| 🟦 | **C177** | `S` | `S` | 2,500 | 2 | nearest_proxy | Cessna 172 Skyhawk | 87 |
| 🟢 | **F2TH** | `D` | `D` | 34,833 | 4 | xml | Dassault Falcon 2000 | 85 |
| 🟦 | **AA5** | `S` | `S` | 2,400 | 2 | nearest_proxy | Cessna 172 Skyhawk | 83 |
| 🟦 | **P180** | `S` | `S` | 12,100 | 2 | nearest_proxy | Cessna Citation M2 C525 | 75 |
| 🟦 | **CL35** | `D` | `D` | 40,600 | 4 | nearest_proxy | Bombardier CL-604/605 | 71 |
| 🟦 | **AC90** | `S` | `S` | 10,700 | 2 | nearest_proxy | Cessna Citation M2 C525 | 69 |
| 🟢 | **PA31** | `S` | `S` | 6,500 | 2 | xml | PA-31-325 Navajo C/R | 67 |
| 🟢 | **PA27** | `S` | `S` | 5,200 | 2 | xml | PA-23-250 Aztec | 66 |
| 🟦 | **C68A** | `D` | `D` | 30,800 | 4 | family_proxy | Cessna Citation X | 64 |
| 🟦 | **CL30** | `D` | `D` | 37,478 | 4 | nearest_proxy | Bombardier CL-604/605 | 62 |
| 🟢 | **CRJ7** | `D` | `D` | 84,500 | 4 | xml | CRJ700 | 59 |
| 🟢 | **C208** | `S` | `S` | 7,800 | 2 | xml | Cessna 208B Grand Caravan EX | 58 |
| 🟦 | **COL4** | `S` | `S` | 3,600 | 2 | nearest_proxy | Cessna 206 Stationair | 53 |
| 🟢 | **B737** | `D` | `D` | 154,500 | 4 | xml | B737 BBJ | 50 |
| 🟢 | **PA34** | `S` | `S` | 4,629 | 2 | xml | PA-34-220T Seneca II/ III/ IV/V | 50 |
| 🟦 | **C150** | `S` | `S` | 1,543 | 2 | nearest_proxy | Cessna 172 Skyhawk | 48 |
| 🟨 | **BE9T** | `D` | `S` | 1,543 | 4 | nearest_proxy | Beechcraft King Air B100 | 47 |
| 🟢 | **GALX** | `D` | `D` | 33,289 | 4 | proxy_override | Cessna Citation VI/VII | 47 |
| 🟦 | **RV7** | `S` | `S` | 1,600 | 2 | nearest_proxy | Cessna 172 Skyhawk | 47 |
| 🟦 | **AEST** | `S` | `S` | 6,850 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 44 |
| 🟨 | **C17** | `2D` | `2T` | 585,000 | 12 | xml | C-17A | 42 |
| 🟦 | **BL17** | `S` | `S` | 3,325 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 41 |
| 🟢 | **GLF4** | `D` | `D` | 73,200 | 4 | xml | Gulfstream-G-IV | 41 |
| 🟢 | **F900** | `D` | `D` | 45,503 | 4 | xml | Dassault Falcon 900B/C | 40 |
| 🟦 | **C152** | `S` | `S` | 5,732 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 39 |
| 🟦 | **MO20** | `S` | `S` | 11,799 | 2 | nearest_proxy | Cessna Citation M2 C525 | 39 |
| 🟢 | **GLF5** | `D` | `D` | 88,846 | 4 | xml | Gulfstream G-V/G500/G550 | 36 |
| 🟦 | **LNC4** | `S` | `S` | 3,086 | 2 | nearest_proxy | Cessna 182 Skylane | 34 |
| 🟢 | **E145** | `D` | `D` | 53,131 | 4 | xml | ERJ-145 XR | 32 |
| 🟦 | **PC24** | `D` | `D` | 18,300 | 4 | nearest_proxy | Learjet 35/36/35A/36A | 32 |
| 🟨 | **C30J** | `2D` | `2S` | 155,000 | 8 | nearest_proxy | B757-200 | 31 |
| 🟦 | **T6** | `S` | `S` | 5,617 | 2 | nearest_proxy | Beechcraft Baron 55 | 31 |
| 🟦 | **RV6** | `S` | `S` | 1,650 | 2 | nearest_proxy | Cessna 172 Skyhawk | 30 |
| 🟢 | **F16** | `S` | `S` | 3,306 | 2 | xml | F-16C | 29 |
| 🟢 | **P32R** | `S` | `S` | 3,615 | 2 | xml | PA-32R-301 Saratoga | 28 |
| 🟦 | **C500** | `S` | `S` | 9,502 | 2 | nearest_proxy | Cessna C441 Conquest II | 27 |
| 🟦 | **P28B** | `S` | `S` | 2,150 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 27 |
| 🟦 | **PAY1** | `S` | `S` | 8,699 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 27 |
| 🟦 | **BE60** | `S` | `S` | 6,775 | 2 | nearest_proxy | Beechcraft Baron 55 | 26 |
| 🟦 | **ASTR** | `D` | `D` | 35,650 | 4 | nearest_proxy | Cessna Citation X | 25 |
| 🟨 | **SW3** | `S` | `D` | 3,368 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 25 |
| 🟢 | **BE10** | `D` | `D` | 11,800 | 4 | xml | Beechcraft King Air B100 | 24 |
| 🟦 | **C240** | `S` | `S` | 3,600 | 2 | nearest_proxy | Cessna 206 Stationair | 24 |
| 🟦 | **C55B** | `S` | `S` | 42,300 | 2 | family_proxy | Cessna Citation II/Bravo C550/551 | 24 |
| 🟦 | **D328** | `D` | `D` | 30,842 | 4 | nearest_proxy | Saab 340B | 23 |
| 🟢 | **G280** | `D` | `D` | 12,566 | 4 | proxy_override | Bombardier CL-604/605 | 23 |
| 🟦 | **BE65** | `S` | `S` | 3,368 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 22 |
| 🟦 | **C404** | `S` | `S` | 8,400 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 22 |
| 🟢 | **E135** | `D` | `D` | 44,070 | 4 | xml | ERJ-135 | 22 |
| 🟦 | **G150** | `D` | `D` | 26,100 | 4 | nearest_proxy | Hawker-800/800XP | 21 |
| 🟨 | **FA50** | `S` | `D` | 38,801 | 4 | xml | Dassault Falcon 50/50EX | 20 |
| 🟦 | **AC50** | `S` | `S` | 6,750 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 19 |
| 🟦 | **DA42** | `S` | `S` | 4,407 | 2 | nearest_proxy | PA-34-220T Seneca II/ III/ IV/V | 18 |
| 🟦 | **GLEX** | `D` | `D` | 95,901 | 4 | nearest_proxy | CRJ700 | 18 |
| 🟦 | **BE90** | `S` | `S` | 10,097 | 2 | nearest_proxy | Cessna C441 Conquest II | 17 |
| 🟢 | **DC93** | `D` | `D` | 110,098 | 4 | xml | DC9-32 | 17 |
| 🟦 | **PA22** | `S` | `S` | 1,950 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 17 |
| 🟦 | **C337** | `S` | `S` | 4,850 | 2 | nearest_proxy | Cessna C210 Centurion | 16 |
| 🟦 | **AC11** | `S` | `S` | 3,262 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 15 |
| 🟦 | **E45X** | `D` | `D` | 53,131 | 4 | family_proxy | ERJ-145 XR | 15 |
| 🟦 | **F18** | `S` | `S` | 51,900 | 2 | nearest_proxy | F-15C | 15 |
| 🟦 | **AC95** | `S` | `S` | 11,750 | 2 | nearest_proxy | Cessna Citation M2 C525 | 13 |
| 🟦 | **BE23** | `S` | `S` | 2,250 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 13 |
| 🟦 | **C140** | `S` | `S` | 1,450 | 2 | nearest_proxy | Cessna 172 Skyhawk | 13 |
| 🟦 | **C402** | `S` | `S` | 6,850 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 13 |
| 🟢 | **MD83** | `D` | `D` | 149,500 | 4 | xml | MD-83 | 13 |
| 🟦 | **EPIC** | `S` | `S` | 7,500 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 12 |
| 🟦 | **M600** | `S` | `S` | 6,000 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 12 |
| 🟦 | **DC91** | `D` | `D` | 90,700 | 4 | nearest_proxy | DC9-32 | 11 |
| 🟢 | **E170** | `D` | `D` | 85,098 | 4 | xml | EMB-170 STD | 11 |
| 🟦 | **A10** | `S` | `S` | 50,044 | 2 | nearest_proxy | F/A-18C | 10 |
| 🟢 | **B722** | `D` | `D` | 209,500 | 4 | xml | B727-200 Advanced Option | 10 |
| 🟢 | **B733** | `D` | `D` | 139,500 | 4 | xml | B737-300 | 10 |
| 🟨 | **E190** | `2D` | `D` | 105,358 | 4 | xml | EMB-190 STD | 10 |
| 🟦 | **B462** | `D` | `D` | 93,000 | 4 | family_proxy | BAe 146-300/300QC/300QT | 9 |
| 🟦 | **C335** | `S` | `S` | 5,990 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 9 |
| 🟦 | **GLF6** | `D` | `D` | 99,600 | 4 | nearest_proxy | Gulfstream G-V/G500/G550 | 9 |
| 🟦 | **J328** | `D` | `D` | 34,524 | 4 | nearest_proxy | Q100/Dash 8 Series 100 | 9 |
| 🟦 | **RV10** | `S` | `S` | 2,700 | 2 | nearest_proxy | Cessna 172 Skyhawk | 9 |
| 🟢 | **A320** | `D` | `D` | 174,165 | 8 | xml | A320-200 WV000 Bogie | 8 |
| 🟢 | **A319** | `D` | `D` | 168,653 | 4 | xml | A319-100 opt | 7 |
| 🟦 | **CH7A** | `S` | `S` | 1,300 | 2 | nearest_proxy | Cessna 172 Skyhawk | 7 |
| 🟨 | **DC10** | `2D` | `2D/D1` | 430,000 | 8 | xml | KC-10 | 7 |
| 🟢 | **DH8D** | `D` | `D` | 63,052 | 4 | xml | Q400/Dash 8 Series 400 | 7 |
| 🟦 | **E75L** | `D` | `D` | 89,000 | 4 | family_proxy | EMB-175 STD | 7 |
| 🟦 | **LEG2** | `S` | `S` | 2,200 | 2 | nearest_proxy | Cessna 172 Skyhawk | 7 |
| 🟦 | **BE24** | `S` | `S` | 2,750 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 6 |
| 🟦 | **BE99** | `D` | `D` | 10,400 | 4 | nearest_proxy | Beechcraft King Air B100 | 6 |
| 🟦 | **C195** | `S` | `S` | 3,350 | 2 | nearest_proxy | Cessna 206 Stationair | 6 |
| 🟦 | **FA7X** | `D` | `D` | 70,000 | 4 | nearest_proxy | Dassault Falcon 900B/C | 6 |
| 🟦 | **RJ85** | `D` | `D` | 97,000 | 4 | nearest_proxy | BAe 146-300/300QC/300QT | 6 |
| 🟦 | **RV12** | `S` | `S` | 1,320 | 2 | nearest_proxy | Cessna 172 Skyhawk | 6 |
| 🟦 | **AT8T** | `S` | `S` | 16,000 | 2 | nearest_proxy | BeechJet-400/400A | 5 |
| 🟢 | **DH8A** | `D` | `D` | 34,392 | 4 | xml | Q100/Dash 8 Series 100 | 5 |
| 🟦 | **HA4T** | `D` | `D` | 39,500 | 4 | nearest_proxy | Hawker-800/800XP | 5 |
| 🟦 | **T38** | `S` | `S` | 12,093 | 2 | nearest_proxy | Cessna Citation M2 C525 | 5 |
| 🟢 | **A321** | `D` | `D` | 206,132 | 4 | xml | A321-200 opt | 4 |
| 🟦 | **AC80** | `S` | `S` | 9,400 | 2 | nearest_proxy | Beechcraft King Air C90 | 4 |
| 🟦 | **BE56** | `S` | `S` | 5,990 | 2 | nearest_proxy | Beechcraft Baron 55 | 4 |
| 🟢 | **SH36** | `S` | `S` | 27,099 | 2 | xml | Shorts 360 | 4 |
| 🟦 | **LGEZ** | `S` | `S` | 1,425 | 2 | nearest_proxy | Cessna 172 Skyhawk | 3 |
| 🟦 | **T34P** | `S` | `S` | 4,300 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 3 |
| 🟢 | **B739** | `D` | `D` | 187,700 | 4 | xml | B737-900 ER | 2 |
| 🟢 | **BCS3** | `D` | `D` | 149,000 | 4 | xml | A220-300 | 2 |
| 🟨 | **BE19** | `D` | `S` | 17,120 | 4 | nearest_proxy | Learjet 35/36/35A/36A | 2 |
| 🟦 | **C162** | `S` | `S` | 1,320 | 2 | nearest_proxy | Cessna 172 Skyhawk | 2 |
| 🟦 | **K35R** | `2D` | `2D` | 322,500 | 8 | nearest_proxy | B757-300 | 2 |
| 🟦 | **MD82** | `D` | `D` | 149,499 | 4 | nearest_proxy | MD-83 | 2 |
| 🟦 | **AC68** | `S` | `S` | 8,000 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 1 |
| 🟦 | **AT5T** | `S` | `S` | 10,480 | 2 | nearest_proxy | Cessna Citation M2 C525 | 1 |
| 🟢 | **B38M** | `D` | `D` | 181,200 | 4 | xml | B737-8/8-200/BBJ MAX 8 | 1 |
| 🟢 | **B735** | `D` | `D` | 136,000 | 4 | xml | B737-500 | 1 |
| 🟢 | **B752** | `2D` | `2D` | 255,500 | 8 | xml | B757-200 | 1 |
| 🟢 | **B762** | `2D` | `2D` | 395,000 | 8 | xml | B767-200 ER | 1 |
| 🟢 | **BCS1** | `D` | `D` | 134,000 | 4 | xml | A220-100 | 1 |
| 🟢 | **CRJ9** | `D` | `D` | 80,500 | 4 | xml | CRJ900 | 1 |
| 🟢 | **E75S** | `D` | `D` | 89,000 | 4 | xml | EMB-175 STD | 1 |
| 🟢 | **MD90** | `D` | `D` | 172,500 | 4 | xml | MD-90-30 ER | 1 |
| 🟢 | **P3** | `D` | `D` | 135,000 | 4 | xml | P-3C | 1 |
| 🟦 | **R135** | `2D` | `2D` | 321,874 | 8 | nearest_proxy | B757-300 | 1 |
| 🟢 | **SF34** | `D` | `D` | 29,000 | 4 | xml | Saab 340B | 1 |

### KMQJ — 153 unique aircraft

| Sev | ICAO | Excel gear | Lib gear | Excel MTOW | n_wheels | Source | FAARFIELD name | Excel count |
|---|---|---|---|---|---|---|---|---|
| 🟥 | **UNKNOWN** | `UNKNOWN` | `UNKNOWN` | -1 | 2 | dual_fallback |  | 9309 |
| 🟦 | **C56X** | `S` | `S` | 15,000 | 2 | family_proxy | Cessna Citation V | 3628 |
| 🟢 | **C550** | `S` | `S` | 14,800 | 2 | xml | Cessna Citation II/Bravo C550/551 | 1490 |
| 🟢 | **C525** | `S` | `S` | 10,700 | 2 | xml | Cessna Citation M2 C525 | 1389 |
| 🟢 | **C172** | `S` | `S` | 2,450 | 2 | xml | Cessna 172 Skyhawk | 1021 |
| 🟦 | **DA40** | `S` | `S` | 2,888 | 2 | nearest_proxy | Cessna 182 Skylane | 719 |
| 🟢 | **C182** | `S` | `S` | 2,550 | 2 | xml | Cessna 182 Skylane | 696 |
| 🟦 | **PC12** | `S` | `S` | 9,039 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 509 |
| 🟢 | **C560** | `S` | `S` | 16,300 | 2 | xml | Cessna Citation V | 498 |
| 🟨 | **C750** | `S` | `D` | 35,699 | 4 | xml | Cessna Citation X | 485 |
| 🟢 | **BE40** | `S` | `S` | 16,100 | 2 | xml | BeechJet-400/400A | 432 |
| 🟢 | **C208** | `S` | `S` | 7,800 | 2 | xml | Cessna 208B Grand Caravan EX | 426 |
| 🟦 | **BE36** | `S` | `S` | 3,650 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 395 |
| 🟢 | **H25B** | `D` | `D` | 28,000 | 4 | xml | Hawker-800/800XP | 395 |
| 🟢 | **C414** | `S` | `S` | 6,750 | 2 | xml | Cessna 414/414A Chancellor | 392 |
| 🟦 | **P28A** | `S` | `S` | 2,548 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 319 |
| 🟦 | **C680** | `D` | `D` | 30,000 | 4 | family_proxy | Cessna Citation X | 303 |
| 🟢 | **E55P** | `S` | `S` | 17,528 | 4 | proxy_override | Cessna Citation VI/VII | 295 |
| 🟦 | **P46T** | `S` | `S` | 4,850 | 2 | family_proxy | PA-46-350P Malibu Mirage | 274 |
| 🟢 | **PA32** | `S` | `S` | 3,400 | 2 | xml | PA-32-300 Cherokee Six | 256 |
| 🟨 | **BE9T** | `D` | `S` | 1,543 | 4 | nearest_proxy | Beechcraft King Air B100 | 252 |
| 🟦 | **C25B** | `S` | `S` | 13,870 | 2 | nearest_proxy | Cessna Citation II/Bravo C550/551 | 235 |
| 🟢 | **CL60** | `D` | `D` | 48,200 | 4 | xml | Bombardier CL-604/605 | 233 |
| 🟦 | **BE20** | `D` | `D` | 12,500 | 4 | nearest_proxy | Beechcraft King Air B100 | 213 |
| 🟦 | **C501** | `S` | `S` | 13,227 | 2 | family_proxy | Cessna Citation II/Bravo C550/551 | 211 |
| 🟢 | **C650** | `D` | `D` | 22,002 | 4 | xml | Cessna Citation VI/VII | 201 |
| 🟦 | **BE35** | `S` | `S` | 3,400 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 195 |
| 🟦 | **ASTR** | `D` | `D` | 35,650 | 4 | nearest_proxy | Cessna Citation X | 193 |
| 🟦 | **C68A** | `D` | `D` | 30,800 | 4 | family_proxy | Cessna Citation X | 190 |
| 🟦 | **LJ45** | `D` | `D` | 21,500 | 4 | nearest_proxy | Learjet 45/55B | 182 |
| 🟦 | **C421** | `S` | `S` | 7,450 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 177 |
| 🟢 | **F900** | `D` | `D` | 45,503 | 4 | xml | Dassault Falcon 900B/C | 167 |
| 🟢 | **PA34** | `S` | `S` | 4,629 | 2 | xml | PA-34-220T Seneca II/ III/ IV/V | 162 |
| 🟢 | **B350** | `D` | `D` | 16,500 | 4 | xml | Beechcraft King Air 350 | 152 |
| 🟦 | **C310** | `S` | `S` | 4,600 | 2 | nearest_proxy | Cessna C210 Centurion | 138 |
| 🟢 | **C441** | `S` | `S` | 9,850 | 2 | xml | Cessna C441 Conquest II | 133 |
| 🟦 | **SR20** | `S` | `S` | 3,000 | 2 | nearest_proxy | Cessna 182 Skylane | 129 |
| 🟢 | **C206** | `S` | `S` | 3,600 | 2 | xml | Cessna 206 Stationair | 127 |
| 🟦 | **C25A** | `S` | `S` | 12,125 | 2 | nearest_proxy | Cessna Citation M2 C525 | 124 |
| 🟢 | **F2TH** | `D` | `D` | 34,833 | 4 | xml | Dassault Falcon 2000 | 124 |
| 🟦 | **PC24** | `D` | `D` | 18,300 | 4 | nearest_proxy | Learjet 35/36/35A/36A | 118 |
| 🟦 | **DA42** | `S` | `S` | 4,407 | 2 | nearest_proxy | PA-34-220T Seneca II/ III/ IV/V | 111 |
| 🟦 | **CL30** | `D` | `D` | 37,478 | 4 | nearest_proxy | Bombardier CL-604/605 | 109 |
| 🟦 | **TBM7** | `S` | `S` | 6,613 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 107 |
| 🟢 | **GLF4** | `D` | `D` | 73,200 | 4 | xml | Gulfstream-G-IV | 106 |
| 🟦 | **PA28** | `S` | `S` | 2,150 | 2 | nearest_proxy | Cessna 172 Skyhawk | 102 |
| 🟨 | **BE9L** | `D` | `S` | 10,097 | 2 | xml | Beechcraft King Air C90 | 91 |
| 🟦 | **COL4** | `S` | `S` | 3,600 | 2 | nearest_proxy | Cessna 206 Stationair | 88 |
| 🟨 | **FA50** | `S` | `D` | 38,801 | 4 | xml | Dassault Falcon 50/50EX | 87 |
| 🟦 | **AA5** | `S` | `S` | 2,400 | 2 | nearest_proxy | Cessna 172 Skyhawk | 84 |
| 🟦 | **M20P** | `S` | `S` | 2,579 | 2 | nearest_proxy | Cessna 172 Skyhawk | 81 |
| 🟦 | **LJ60** | `D` | `D` | 23,500 | 4 | nearest_proxy | Learjet 45/55B | 73 |
| 🟦 | **P28R** | `S` | `S` | 2,866 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 73 |
| 🟦 | **C25C** | `S` | `S` | 10,361 | 2 | nearest_proxy | Cessna Citation M2 C525 | 69 |
| 🟢 | **PA46** | `S` | `S` | 4,299 | 2 | xml | PA-46-350P Malibu Mirage | 66 |
| 🟦 | **FA20** | `D` | `D` | 30,325 | 4 | nearest_proxy | Dassault Falcon 2000 | 63 |
| 🟢 | **PA31** | `S` | `S` | 6,500 | 2 | xml | PA-31-325 Navajo C/R | 63 |
| 🟦 | **PRM1** | `S` | `S` | 8,800 | 2 | nearest_proxy | Beechcraft King Air C90 | 62 |
| 🟦 | **BE30** | `D` | `D` | 14,000 | 4 | nearest_proxy | Beechcraft King Air 350 | 60 |
| 🟢 | **BE55** | `S` | `S` | 5,300 | 2 | xml | Beechcraft Baron 55 | 60 |
| 🟦 | **PA30** | `S` | `S` | 3,725 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 60 |
| 🟢 | **BE10** | `D` | `D` | 11,800 | 4 | xml | Beechcraft King Air B100 | 58 |
| 🟦 | **RV10** | `S` | `S` | 2,700 | 2 | nearest_proxy | Cessna 172 Skyhawk | 58 |
| 🟦 | **BE58** | `S` | `S` | 5,500 | 2 | nearest_proxy | Beechcraft Baron 55 | 56 |
| 🟦 | **CL35** | `D` | `D` | 40,600 | 4 | nearest_proxy | Bombardier CL-604/605 | 56 |
| 🟦 | **C510** | `S` | `S` | 7,716 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 54 |
| 🟦 | **C150** | `S` | `S` | 1,543 | 2 | nearest_proxy | Cessna 172 Skyhawk | 53 |
| 🟦 | **C500** | `S` | `S` | 9,502 | 2 | nearest_proxy | Cessna C441 Conquest II | 52 |
| 🟦 | **BE24** | `S` | `S` | 2,750 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 51 |
| 🟢 | **GALX** | `D` | `D` | 33,289 | 4 | proxy_override | Cessna Citation VI/VII | 49 |
| 🟢 | **E50P** | `S` | `S` | 10,471 | 2 | proxy_override | BeechJet-400/400A | 48 |
| 🟦 | **P180** | `S` | `S` | 12,100 | 2 | nearest_proxy | Cessna Citation M2 C525 | 48 |
| 🟢 | **P32R** | `S` | `S` | 3,615 | 2 | xml | PA-32R-301 Saratoga | 48 |
| 🟨 | **SW3** | `S` | `D` | 3,368 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 46 |
| 🟢 | **LJ35** | `D` | `D` | 18,000 | 4 | xml | Learjet 35/36/35A/36A | 45 |
| 🟢 | **PA27** | `S` | `S` | 5,200 | 2 | xml | PA-23-250 Aztec | 44 |
| 🟦 | **C25M** | `S` | `S` | 13,870 | 2 | family_proxy | Cessna Citation M2 C525 | 43 |
| 🟢 | **BE33** | `S` | `S` | 3,500 | 2 | xml | Beechcraft Bonanza F33A | 40 |
| 🟦 | **LJ31** | `D` | `D` | 17,698 | 4 | nearest_proxy | Learjet 35/36/35A/36A | 40 |
| 🟦 | **TBM8** | `S` | `S` | 7,495 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 40 |
| 🟦 | **B190** | `D` | `D` | 17,120 | 4 | nearest_proxy | Beechcraft King Air 350 | 39 |
| 🟦 | **FA7X** | `D` | `D` | 70,000 | 4 | nearest_proxy | Dassault Falcon 900B/C | 38 |
| 🟢 | **C210** | `S` | `S` | 3,100 | 2 | xml | Cessna C210 Centurion | 36 |
| 🟦 | **EA50** | `S` | `S` | 39,595 | 2 | nearest_proxy | F-16C | 27 |
| 🟢 | **GLF5** | `D` | `D` | 88,846 | 4 | xml | Gulfstream G-V/G500/G550 | 26 |
| 🟦 | **P28B** | `S` | `S` | 2,150 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 26 |
| 🟦 | **C340** | `S` | `S` | 5,974 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 25 |
| 🟦 | **G150** | `D` | `D` | 26,100 | 4 | nearest_proxy | Hawker-800/800XP | 25 |
| 🟦 | **PA24** | `S` | `S` | 3,200 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 24 |
| 🟦 | **S22T** | `S` | `S` | 15,100 | 2 | nearest_proxy | Cessna Citation II/Bravo C550/551 | 23 |
| 🟦 | **BE23** | `S` | `S` | 2,250 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 22 |
| 🟦 | **TBM9** | `S` | `S` | 7,394 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 22 |
| 🟦 | **C335** | `S` | `S` | 5,990 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 21 |
| 🟦 | **M20T** | `S` | `S` | 12,500 | 2 | nearest_proxy | Cessna Citation M2 C525 | 21 |
| 🟦 | **SF50** | `S` | `S` | 6,000 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 21 |
| 🟦 | **C185** | `S` | `S` | 3,348 | 2 | nearest_proxy | Cessna 206 Stationair | 19 |
| 🟦 | **C404** | `S` | `S` | 8,400 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 18 |
| 🟦 | **C177** | `S` | `S` | 2,500 | 2 | nearest_proxy | Cessna 172 Skyhawk | 16 |
| 🟦 | **C195** | `S` | `S` | 3,350 | 2 | nearest_proxy | Cessna 206 Stationair | 14 |
| 🟢 | **CRJ2** | `D` | `D` | 53,000 | 4 | xml | CRJ100LR/200LR | 14 |
| 🟢 | **E135** | `D` | `D` | 44,070 | 4 | xml | ERJ-135 | 14 |
| 🟦 | **PAY2** | `S` | `S` | 9,479 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 14 |
| 🟦 | **E120** | `D` | `D` | 25,353 | 4 | nearest_proxy | ERJ-135 | 13 |
| 🟢 | **G280** | `D` | `D` | 12,566 | 4 | proxy_override | Bombardier CL-604/605 | 13 |
| 🟦 | **PAY1** | `S` | `S` | 8,699 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 13 |
| 🟦 | **RV6** | `S` | `S` | 1,650 | 2 | nearest_proxy | Cessna 172 Skyhawk | 13 |
| 🟦 | **MO20** | `S` | `S` | 11,799 | 2 | nearest_proxy | Cessna Citation M2 C525 | 12 |
| 🟦 | **MU2** | `S` | `S` | 11,574 | 2 | nearest_proxy | Cessna Citation M2 C525 | 12 |
| 🟦 | **SW4** | `D` | `D` | 14,500 | 4 | nearest_proxy | Beechcraft King Air 350 | 12 |
| 🟦 | **C152** | `S` | `S` | 5,732 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 11 |
| 🟦 | **C425** | `S` | `S` | 8,598 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 11 |
| 🟦 | **RV7** | `S` | `S` | 1,600 | 2 | nearest_proxy | Cessna 172 Skyhawk | 11 |
| 🟦 | **AEST** | `S` | `S` | 6,850 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 10 |
| 🟦 | **HDJT** | `S` | `S` | 9,963 | 2 | nearest_proxy | Cessna C441 Conquest II | 10 |
| 🟦 | **GLEX** | `D` | `D` | 95,901 | 4 | nearest_proxy | CRJ700 | 9 |
| 🟦 | **C240** | `S` | `S` | 3,600 | 2 | nearest_proxy | Cessna 206 Stationair | 8 |
| 🟦 | **AC11** | `S` | `S` | 3,262 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 7 |
| 🟦 | **BL17** | `S` | `S` | 3,325 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 7 |
| 🟦 | **DA20** | `S` | `S` | 1,764 | 2 | nearest_proxy | Cessna 172 Skyhawk | 6 |
| 🟦 | **AC95** | `S` | `S` | 11,750 | 2 | nearest_proxy | Cessna Citation M2 C525 | 5 |
| 🟦 | **C55B** | `S` | `S` | 42,300 | 2 | family_proxy | Cessna Citation II/Bravo C550/551 | 5 |
| 🟦 | **J328** | `D` | `D` | 34,524 | 4 | nearest_proxy | Q100/Dash 8 Series 100 | 5 |
| 🟦 | **C162** | `S` | `S` | 1,320 | 2 | nearest_proxy | Cessna 172 Skyhawk | 4 |
| 🟢 | **SH36** | `S` | `S` | 27,099 | 2 | xml | Shorts 360 | 4 |
| 🟦 | **AC50** | `S` | `S` | 6,750 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 3 |
| 🟦 | **AC90** | `S` | `S` | 10,700 | 2 | nearest_proxy | Cessna Citation M2 C525 | 3 |
| 🟦 | **BE99** | `D` | `D` | 10,400 | 4 | nearest_proxy | Beechcraft King Air B100 | 3 |
| 🟦 | **CH7A** | `S` | `S` | 1,300 | 2 | nearest_proxy | Cessna 172 Skyhawk | 3 |
| 🟦 | **DV20** | `S` | `S` | 1,764 | 2 | nearest_proxy | Cessna 172 Skyhawk | 3 |
| 🟦 | **M600** | `S` | `S` | 6,000 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 3 |
| 🟦 | **PA22** | `S` | `S` | 1,950 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 3 |
| 🟢 | **B77L** | `3D` | `3D` | 775,000 | 12 | xml | B777-200 LR | 2 |
| 🟦 | **BE90** | `S` | `S` | 10,097 | 2 | nearest_proxy | Cessna C441 Conquest II | 2 |
| 🟦 | **C140** | `S` | `S` | 1,450 | 2 | nearest_proxy | Cessna 172 Skyhawk | 2 |
| 🟦 | **C337** | `S` | `S` | 4,850 | 2 | nearest_proxy | Cessna C210 Centurion | 2 |
| 🟢 | **E170** | `D` | `D` | 85,098 | 4 | xml | EMB-170 STD | 2 |
| 🟦 | **GLF6** | `D` | `D` | 99,600 | 4 | nearest_proxy | Gulfstream G-V/G500/G550 | 2 |
| 🟦 | **HA4T** | `D` | `D` | 39,500 | 4 | nearest_proxy | Hawker-800/800XP | 2 |
| 🟦 | **PA44** | `S` | `S` | 3,798 | 2 | nearest_proxy | PA-46-350P Malibu Mirage | 2 |
| 🟦 | **A10** | `S` | `S` | 50,044 | 2 | nearest_proxy | F/A-18C | 1 |
| 🟢 | **A320** | `D` | `D` | 174,165 | 8 | xml | A320-200 WV000 Bogie | 1 |
| 🟦 | **AC6L** | `S` | `S` | 9,000 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 1 |
| 🟦 | **AT43** | `D` | `D` | 36,825 | 4 | nearest_proxy | Q200/Dash 8 Series 200 | 1 |
| 🟢 | **B738** | `D` | `D` | 174,200 | 4 | xml | B737 BBJ2 | 1 |
| 🟢 | **B748** | `2D/2D2` | `2D/2D2` | 987,000 | 8 | xml | B747-8F | 1 |
| 🟢 | **B752** | `2D` | `2D` | 255,500 | 8 | xml | B757-200 | 1 |
| 🟦 | **BE60** | `S` | `S` | 6,775 | 2 | nearest_proxy | Beechcraft Baron 55 | 1 |
| 🟦 | **C402** | `S` | `S` | 6,850 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 1 |
| 🟢 | **CRJ7** | `D` | `D` | 84,500 | 4 | xml | CRJ700 | 1 |
| 🟦 | **CVLT** | `D` | `D` | 57,000 | 4 | nearest_proxy | ERJ-145 XR | 1 |
| 🟦 | **LEG2** | `S` | `S` | 2,200 | 2 | nearest_proxy | Cessna 172 Skyhawk | 1 |
| 🟦 | **LNC4** | `S` | `S` | 3,086 | 2 | nearest_proxy | Cessna 182 Skylane | 1 |
| 🟦 | **T6** | `S` | `S` | 5,617 | 2 | nearest_proxy | Beechcraft Baron 55 | 1 |

### KCIU — 123 unique aircraft

| Sev | ICAO | Excel gear | Lib gear | Excel MTOW | n_wheels | Source | FAARFIELD name | Excel count |
|---|---|---|---|---|---|---|---|---|
| 🟢 | **CRJ2** | `D` | `D` | 53,000 | 4 | xml | CRJ100LR/200LR | 3666 |
| 🟢 | **C208** | `S` | `S` | 7,800 | 2 | xml | Cessna 208B Grand Caravan EX | 2671 |
| 🟦 | **SW4** | `D` | `D` | 14,500 | 4 | nearest_proxy | Beechcraft King Air 350 | 841 |
| 🟥 | **UNKNOWN** | `UNKNOWN` | `UNKNOWN` | -1 | 2 | dual_fallback |  | 725 |
| 🟢 | **DH8D** | `D` | `D` | 63,052 | 4 | xml | Q400/Dash 8 Series 400 | 270 |
| 🟦 | **BE20** | `D` | `D` | 12,500 | 4 | nearest_proxy | Beechcraft King Air B100 | 151 |
| 🟢 | **H25B** | `D` | `D` | 28,000 | 4 | xml | Hawker-800/800XP | 93 |
| 🟦 | **AC50** | `S` | `S` | 6,750 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 87 |
| 🟢 | **BE40** | `S` | `S` | 16,100 | 2 | xml | BeechJet-400/400A | 83 |
| 🟦 | **PC12** | `S` | `S` | 9,039 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 70 |
| 🟢 | **B350** | `D` | `D` | 16,500 | 4 | xml | Beechcraft King Air 350 | 69 |
| 🟦 | **C56X** | `S` | `S` | 15,000 | 2 | family_proxy | Cessna Citation V | 58 |
| 🟨 | **BE9L** | `D` | `S` | 10,097 | 2 | xml | Beechcraft King Air C90 | 57 |
| 🟢 | **C560** | `S` | `S` | 16,300 | 2 | xml | Cessna Citation V | 49 |
| 🟢 | **C172** | `S` | `S` | 2,450 | 2 | xml | Cessna 172 Skyhawk | 39 |
| 🟦 | **B190** | `D` | `D` | 17,120 | 4 | nearest_proxy | Beechcraft King Air 350 | 34 |
| 🟦 | **BE36** | `S` | `S` | 3,650 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 28 |
| 🟦 | **BE58** | `S` | `S` | 5,500 | 2 | nearest_proxy | Beechcraft Baron 55 | 28 |
| 🟢 | **DH8A** | `D` | `D` | 34,392 | 4 | xml | Q100/Dash 8 Series 100 | 28 |
| 🟦 | **LJ60** | `D` | `D` | 23,500 | 4 | nearest_proxy | Learjet 45/55B | 28 |
| 🟢 | **C182** | `S` | `S` | 2,550 | 2 | xml | Cessna 182 Skylane | 27 |
| 🟦 | **C680** | `D` | `D` | 30,000 | 4 | family_proxy | Cessna Citation X | 27 |
| 🟢 | **E55P** | `S` | `S` | 17,528 | 4 | proxy_override | Cessna Citation VI/VII | 26 |
| 🟦 | **BE99** | `D` | `D` | 10,400 | 4 | nearest_proxy | Beechcraft King Air B100 | 24 |
| 🟢 | **C550** | `S` | `S` | 14,800 | 2 | xml | Cessna Citation II/Bravo C550/551 | 24 |
| 🟨 | **C750** | `S` | `D` | 35,699 | 4 | xml | Cessna Citation X | 23 |
| 🟦 | **C310** | `S` | `S` | 4,600 | 2 | nearest_proxy | Cessna C210 Centurion | 21 |
| 🟢 | **C210** | `S` | `S` | 3,100 | 2 | xml | Cessna C210 Centurion | 16 |
| 🟦 | **M20P** | `S` | `S` | 2,579 | 2 | nearest_proxy | Cessna 172 Skyhawk | 16 |
| 🟦 | **CL30** | `D` | `D` | 37,478 | 4 | nearest_proxy | Bombardier CL-604/605 | 15 |
| 🟢 | **GLF4** | `D` | `D` | 73,200 | 4 | xml | Gulfstream-G-IV | 15 |
| 🟦 | **C421** | `S` | `S` | 7,450 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 14 |
| 🟦 | **LJ45** | `D` | `D` | 21,500 | 4 | nearest_proxy | Learjet 45/55B | 14 |
| 🟦 | **MU2** | `S` | `S` | 11,574 | 2 | nearest_proxy | Cessna Citation M2 C525 | 14 |
| 🟦 | **PA44** | `S` | `S` | 3,798 | 2 | nearest_proxy | PA-46-350P Malibu Mirage | 13 |
| 🟦 | **PRM1** | `S` | `S` | 8,800 | 2 | nearest_proxy | Beechcraft King Air C90 | 13 |
| 🟦 | **BE35** | `S` | `S` | 3,400 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 11 |
| 🟢 | **C525** | `S` | `S` | 10,700 | 2 | xml | Cessna Citation M2 C525 | 11 |
| 🟢 | **F2TH** | `D` | `D` | 34,833 | 4 | xml | Dassault Falcon 2000 | 11 |
| 🟢 | **LJ35** | `D` | `D` | 18,000 | 4 | xml | Learjet 35/36/35A/36A | 11 |
| 🟦 | **BE30** | `D` | `D` | 14,000 | 4 | nearest_proxy | Beechcraft King Air 350 | 10 |
| 🟢 | **C441** | `S` | `S` | 9,850 | 2 | xml | Cessna C441 Conquest II | 10 |
| 🟢 | **BE10** | `D` | `D` | 11,800 | 4 | xml | Beechcraft King Air B100 | 9 |
| 🟢 | **CL60** | `D` | `D` | 48,200 | 4 | xml | Bombardier CL-604/605 | 9 |
| 🟦 | **C25A** | `S` | `S` | 12,125 | 2 | nearest_proxy | Cessna Citation M2 C525 | 8 |
| 🟦 | **C340** | `S` | `S` | 5,974 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 8 |
| 🟦 | **C68A** | `D` | `D` | 30,800 | 4 | family_proxy | Cessna Citation X | 8 |
| 🟦 | **CL35** | `D` | `D` | 40,600 | 4 | nearest_proxy | Bombardier CL-604/605 | 8 |
| 🟢 | **B738** | `D` | `D` | 174,200 | 4 | xml | B737 BBJ2 | 7 |
| 🟢 | **C650** | `D` | `D` | 22,002 | 4 | xml | Cessna Citation VI/VII | 7 |
| 🟢 | **GLF5** | `D` | `D` | 88,846 | 4 | xml | Gulfstream G-V/G500/G550 | 7 |
| 🟢 | **PA32** | `S` | `S` | 3,400 | 2 | xml | PA-32-300 Cherokee Six | 7 |
| 🟦 | **FA20** | `D` | `D` | 30,325 | 4 | nearest_proxy | Dassault Falcon 2000 | 6 |
| 🟢 | **PA27** | `S` | `S` | 5,200 | 2 | xml | PA-23-250 Aztec | 6 |
| 🟢 | **PA31** | `S` | `S` | 6,500 | 2 | xml | PA-31-325 Navajo C/R | 6 |
| 🟢 | **C414** | `S` | `S` | 6,750 | 2 | xml | Cessna 414/414A Chancellor | 5 |
| 🟦 | **COL4** | `S` | `S` | 3,600 | 2 | nearest_proxy | Cessna 206 Stationair | 5 |
| 🟢 | **E50P** | `S` | `S` | 10,471 | 2 | proxy_override | BeechJet-400/400A | 5 |
| 🟦 | **HDJT** | `S` | `S` | 9,963 | 2 | nearest_proxy | Cessna C441 Conquest II | 5 |
| 🟦 | **LJ31** | `D` | `D` | 17,698 | 4 | nearest_proxy | Learjet 35/36/35A/36A | 5 |
| 🟦 | **P28A** | `S` | `S` | 2,548 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 5 |
| 🟢 | **PA34** | `S` | `S` | 4,629 | 2 | xml | PA-34-220T Seneca II/ III/ IV/V | 5 |
| 🟢 | **BE55** | `S` | `S` | 5,300 | 2 | xml | Beechcraft Baron 55 | 4 |
| 🟦 | **C177** | `S` | `S` | 2,500 | 2 | nearest_proxy | Cessna 172 Skyhawk | 4 |
| 🟦 | **C25B** | `S` | `S` | 13,870 | 2 | nearest_proxy | Cessna Citation II/Bravo C550/551 | 4 |
| 🟦 | **C425** | `S` | `S` | 8,598 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 4 |
| 🟢 | **F900** | `D` | `D` | 45,503 | 4 | xml | Dassault Falcon 900B/C | 4 |
| 🟦 | **PA30** | `S` | `S` | 3,725 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 4 |
| 🟦 | **S22T** | `S` | `S` | 15,100 | 2 | nearest_proxy | Cessna Citation II/Bravo C550/551 | 4 |
| 🟦 | **SR20** | `S` | `S` | 3,000 | 2 | nearest_proxy | Cessna 182 Skylane | 4 |
| 🟨 | **SW3** | `S` | `D` | 3,368 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 4 |
| 🟢 | **A320** | `D` | `D` | 174,165 | 8 | xml | A320-200 WV000 Bogie | 3 |
| 🟢 | **A321** | `D` | `D` | 206,132 | 4 | xml | A321-200 opt | 3 |
| 🟢 | **C206** | `S` | `S` | 3,600 | 2 | xml | Cessna 206 Stationair | 3 |
| 🟦 | **C25C** | `S` | `S` | 10,361 | 2 | nearest_proxy | Cessna Citation M2 C525 | 3 |
| 🟦 | **C402** | `S` | `S` | 6,850 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 3 |
| 🟦 | **E120** | `D` | `D` | 25,353 | 4 | nearest_proxy | ERJ-135 | 3 |
| 🟦 | **EA50** | `S` | `S` | 39,595 | 2 | nearest_proxy | F-16C | 3 |
| 🟦 | **P46T** | `S` | `S` | 4,850 | 2 | family_proxy | PA-46-350P Malibu Mirage | 3 |
| 🟦 | **SF50** | `S` | `S` | 6,000 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 3 |
| 🟦 | **TBM8** | `S` | `S` | 7,495 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 3 |
| 🟦 | **AA5** | `S` | `S` | 2,400 | 2 | nearest_proxy | Cessna 172 Skyhawk | 2 |
| 🟦 | **AEST** | `S` | `S` | 6,850 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 2 |
| 🟢 | **B734** | `D` | `D` | 150,000 | 4 | xml | B737-400 | 2 |
| 🟢 | **B737** | `D` | `D` | 154,500 | 4 | xml | B737 BBJ | 2 |
| 🟢 | **B763** | `2D` | `2D` | 412,000 | 8 | xml | B767-300 ER/Freighter | 2 |
| 🟢 | **BE33** | `S` | `S` | 3,500 | 2 | xml | Beechcraft Bonanza F33A | 2 |
| 🟨 | **C130** | `2D` | `2S` | 155,000 | 4 | xml | C-130-70 | 2 |
| 🟦 | **C510** | `S` | `S` | 7,716 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 2 |
| 🟢 | **CRJ9** | `D` | `D` | 80,500 | 4 | xml | CRJ900 | 2 |
| 🟨 | **FA50** | `S` | `D` | 38,801 | 4 | xml | Dassault Falcon 50/50EX | 2 |
| 🟦 | **GLEX** | `D` | `D` | 95,901 | 4 | nearest_proxy | CRJ700 | 2 |
| 🟦 | **P28R** | `S` | `S` | 2,866 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 2 |
| 🟦 | **PA28** | `S` | `S` | 2,150 | 2 | nearest_proxy | Cessna 172 Skyhawk | 2 |
| 🟢 | **PA46** | `S` | `S` | 4,299 | 2 | xml | PA-46-350P Malibu Mirage | 2 |
| 🟦 | **PAY1** | `S` | `S` | 8,699 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 2 |
| 🟦 | **TBM7** | `S` | `S` | 6,613 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 2 |
| 🟢 | **A332** | `2D` | `2D` | 533,519 | 8 | xml | A330-200F WV001 | 1 |
| 🟢 | **B38M** | `D` | `D` | 181,200 | 4 | xml | B737-8/8-200/BBJ MAX 8 | 1 |
| 🟦 | **B462** | `D` | `D` | 93,000 | 4 | family_proxy | BAe 146-300/300QC/300QT | 1 |
| 🟢 | **B732** | `D` | `D` | 128,100 | 4 | xml | B737-200 | 1 |
| 🟢 | **B752** | `2D` | `2D` | 255,500 | 8 | xml | B757-200 | 1 |
| 🟢 | **B772** | `3D` | `3D` | 766,000 | 12 | xml | B777-200 | 1 |
| 🟢 | **B77L** | `3D` | `3D` | 775,000 | 12 | xml | B777-200 LR | 1 |
| 🟢 | **B77W** | `3D` | `3D` | 775,000 | 12 | xml | B777-300 ER | 1 |
| 🟦 | **BL17** | `S` | `S` | 3,325 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 1 |
| 🟨 | **C17** | `2D` | `2T` | 585,000 | 12 | xml | C-17A | 1 |
| 🟦 | **C240** | `S` | `S` | 3,600 | 2 | nearest_proxy | Cessna 206 Stationair | 1 |
| 🟦 | **C25M** | `S` | `S` | 13,870 | 2 | family_proxy | Cessna Citation M2 C525 | 1 |
| 🟨 | **C30J** | `2D` | `2S` | 155,000 | 8 | nearest_proxy | B757-200 | 1 |
| 🟢 | **CRJ7** | `D` | `D` | 84,500 | 4 | xml | CRJ700 | 1 |
| 🟦 | **DA40** | `S` | `S` | 2,888 | 2 | nearest_proxy | Cessna 182 Skylane | 1 |
| 🟦 | **DHC6** | `S` | `S` | 12,500 | 2 | nearest_proxy | Cessna Citation M2 C525 | 1 |
| 🟨 | **E190** | `2D` | `D` | 105,358 | 4 | xml | EMB-190 STD | 1 |
| 🟦 | **FA7X** | `D` | `D` | 70,000 | 4 | nearest_proxy | Dassault Falcon 900B/C | 1 |
| 🟦 | **G150** | `D` | `D` | 26,100 | 4 | nearest_proxy | Hawker-800/800XP | 1 |
| 🟢 | **G280** | `D` | `D` | 12,566 | 4 | proxy_override | Bombardier CL-604/605 | 1 |
| 🟦 | **GLF6** | `D` | `D` | 99,600 | 4 | nearest_proxy | Gulfstream G-V/G500/G550 | 1 |
| 🟦 | **K35R** | `2D` | `2D` | 322,500 | 8 | nearest_proxy | B757-300 | 1 |
| 🟦 | **LEG2** | `S` | `S` | 2,200 | 2 | nearest_proxy | Cessna 172 Skyhawk | 1 |
| 🟢 | **P3** | `D` | `D` | 135,000 | 4 | xml | P-3C | 1 |
| 🟢 | **P32R** | `S` | `S` | 3,615 | 2 | xml | PA-32R-301 Saratoga | 1 |
| 🟦 | **TBM9** | `S` | `S` | 7,394 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 1 |

### KOTM — 107 unique aircraft

| Sev | ICAO | Excel gear | Lib gear | Excel MTOW | n_wheels | Source | FAARFIELD name | Excel count |
|---|---|---|---|---|---|---|---|---|
| 🟥 | **UNKNOWN** | `UNKNOWN` | `UNKNOWN` | -1 | 2 | dual_fallback |  | 2228 |
| 🟦 | **P28A** | `S` | `S` | 2,548 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 171 |
| 🟢 | **GALX** | `D` | `D` | 33,289 | 4 | proxy_override | Cessna Citation VI/VII | 143 |
| 🟢 | **C172** | `S` | `S` | 2,450 | 2 | xml | Cessna 172 Skyhawk | 128 |
| 🟦 | **PA28** | `S` | `S` | 2,150 | 2 | nearest_proxy | Cessna 172 Skyhawk | 78 |
| 🟢 | **C550** | `S` | `S` | 14,800 | 2 | xml | Cessna Citation II/Bravo C550/551 | 72 |
| 🟢 | **C182** | `S` | `S` | 2,550 | 2 | xml | Cessna 182 Skylane | 63 |
| 🟢 | **C525** | `S` | `S` | 10,700 | 2 | xml | Cessna Citation M2 C525 | 47 |
| 🟦 | **BE36** | `S` | `S` | 3,650 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 37 |
| 🟦 | **BE35** | `S` | `S` | 3,400 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 35 |
| 🟢 | **PA46** | `S` | `S` | 4,299 | 2 | xml | PA-46-350P Malibu Mirage | 35 |
| 🟦 | **C680** | `D` | `D` | 30,000 | 4 | family_proxy | Cessna Citation X | 31 |
| 🟦 | **COL4** | `S` | `S` | 3,600 | 2 | nearest_proxy | Cessna 206 Stationair | 28 |
| 🟦 | **C421** | `S` | `S` | 7,450 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 24 |
| 🟨 | **BE9L** | `D` | `S` | 10,097 | 2 | xml | Beechcraft King Air C90 | 21 |
| 🟦 | **C56X** | `S` | `S` | 15,000 | 2 | family_proxy | Cessna Citation V | 21 |
| 🟦 | **BE20** | `D` | `D` | 12,500 | 4 | nearest_proxy | Beechcraft King Air B100 | 18 |
| 🟢 | **BE55** | `S` | `S` | 5,300 | 2 | xml | Beechcraft Baron 55 | 17 |
| 🟢 | **H25B** | `D` | `D` | 28,000 | 4 | xml | Hawker-800/800XP | 17 |
| 🟦 | **PC12** | `S` | `S` | 9,039 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 17 |
| 🟦 | **C177** | `S` | `S` | 2,500 | 2 | nearest_proxy | Cessna 172 Skyhawk | 16 |
| 🟦 | **P28R** | `S` | `S` | 2,866 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 16 |
| 🟦 | **SR20** | `S` | `S` | 3,000 | 2 | nearest_proxy | Cessna 182 Skylane | 16 |
| 🟢 | **B350** | `D` | `D` | 16,500 | 4 | xml | Beechcraft King Air 350 | 14 |
| 🟢 | **BE40** | `S` | `S` | 16,100 | 2 | xml | BeechJet-400/400A | 13 |
| 🟢 | **C414** | `S` | `S` | 6,750 | 2 | xml | Cessna 414/414A Chancellor | 13 |
| 🟢 | **PA32** | `S` | `S` | 3,400 | 2 | xml | PA-32-300 Cherokee Six | 13 |
| 🟢 | **BE33** | `S` | `S` | 3,500 | 2 | xml | Beechcraft Bonanza F33A | 12 |
| 🟦 | **C310** | `S` | `S` | 4,600 | 2 | nearest_proxy | Cessna C210 Centurion | 12 |
| 🟢 | **C560** | `S` | `S` | 16,300 | 2 | xml | Cessna Citation V | 12 |
| 🟦 | **M20P** | `S` | `S` | 2,579 | 2 | nearest_proxy | Cessna 172 Skyhawk | 12 |
| 🟦 | **S22T** | `S` | `S` | 15,100 | 2 | nearest_proxy | Cessna Citation II/Bravo C550/551 | 12 |
| 🟦 | **BE58** | `S` | `S` | 5,500 | 2 | nearest_proxy | Beechcraft Baron 55 | 11 |
| 🟢 | **C206** | `S` | `S` | 3,600 | 2 | xml | Cessna 206 Stationair | 11 |
| 🟢 | **C210** | `S` | `S` | 3,100 | 2 | xml | Cessna C210 Centurion | 11 |
| 🟦 | **P46T** | `S` | `S` | 4,850 | 2 | family_proxy | PA-46-350P Malibu Mirage | 11 |
| 🟦 | **TBM8** | `S` | `S` | 7,495 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 11 |
| 🟢 | **P32R** | `S` | `S` | 3,615 | 2 | xml | PA-32R-301 Saratoga | 10 |
| 🟦 | **C150** | `S` | `S` | 1,543 | 2 | nearest_proxy | Cessna 172 Skyhawk | 9 |
| 🟦 | **C340** | `S` | `S` | 5,974 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 8 |
| 🟢 | **C441** | `S` | `S` | 9,850 | 2 | xml | Cessna C441 Conquest II | 8 |
| 🟦 | **AA5** | `S` | `S` | 2,400 | 2 | nearest_proxy | Cessna 172 Skyhawk | 7 |
| 🟦 | **C185** | `S` | `S` | 3,348 | 2 | nearest_proxy | Cessna 206 Stationair | 7 |
| 🟦 | **C25A** | `S` | `S` | 12,125 | 2 | nearest_proxy | Cessna Citation M2 C525 | 7 |
| 🟦 | **C25C** | `S` | `S` | 10,361 | 2 | nearest_proxy | Cessna Citation M2 C525 | 7 |
| 🟦 | **C425** | `S` | `S` | 8,598 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 7 |
| 🟦 | **PA24** | `S` | `S` | 3,200 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 7 |
| 🟢 | **E55P** | `S` | `S` | 17,528 | 4 | proxy_override | Cessna Citation VI/VII | 6 |
| 🟦 | **C195** | `S` | `S` | 3,350 | 2 | nearest_proxy | Cessna 206 Stationair | 5 |
| 🟦 | **EA50** | `S` | `S` | 39,595 | 2 | nearest_proxy | F-16C | 5 |
| 🟢 | **PA31** | `S` | `S` | 6,500 | 2 | xml | PA-31-325 Navajo C/R | 5 |
| 🟦 | **PRM1** | `S` | `S` | 8,800 | 2 | nearest_proxy | Beechcraft King Air C90 | 5 |
| 🟦 | **C152** | `S` | `S` | 5,732 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 4 |
| 🟢 | **C208** | `S` | `S` | 7,800 | 2 | xml | Cessna 208B Grand Caravan EX | 4 |
| 🟦 | **C402** | `S` | `S` | 6,850 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 4 |
| 🟦 | **CL30** | `D` | `D` | 37,478 | 4 | nearest_proxy | Bombardier CL-604/605 | 4 |
| 🟦 | **DA42** | `S` | `S` | 4,407 | 2 | nearest_proxy | PA-34-220T Seneca II/ III/ IV/V | 4 |
| 🟢 | **E50P** | `S` | `S` | 10,471 | 2 | proxy_override | BeechJet-400/400A | 4 |
| 🟦 | **LJ60** | `D` | `D` | 23,500 | 4 | nearest_proxy | Learjet 45/55B | 4 |
| 🟢 | **PA27** | `S` | `S` | 5,200 | 2 | xml | PA-23-250 Aztec | 4 |
| 🟦 | **BE30** | `D` | `D` | 14,000 | 4 | nearest_proxy | Beechcraft King Air 350 | 3 |
| 🟦 | **C140** | `S` | `S` | 1,450 | 2 | nearest_proxy | Cessna 172 Skyhawk | 3 |
| 🟦 | **C501** | `S` | `S` | 13,227 | 2 | family_proxy | Cessna Citation II/Bravo C550/551 | 3 |
| 🟢 | **LJ35** | `D` | `D` | 18,000 | 4 | xml | Learjet 35/36/35A/36A | 3 |
| 🟦 | **P28B** | `S` | `S` | 2,150 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 3 |
| 🟦 | **PA30** | `S` | `S` | 3,725 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 3 |
| 🟢 | **PA34** | `S` | `S` | 4,629 | 2 | xml | PA-34-220T Seneca II/ III/ IV/V | 3 |
| 🟦 | **PAY1** | `S` | `S` | 8,699 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 3 |
| 🟦 | **RV7** | `S` | `S` | 1,600 | 2 | nearest_proxy | Cessna 172 Skyhawk | 3 |
| 🟦 | **TBM7** | `S` | `S` | 6,613 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 3 |
| 🟦 | **TBM9** | `S` | `S` | 7,394 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 3 |
| 🟦 | **AC50** | `S` | `S` | 6,750 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 2 |
| 🟦 | **AC95** | `S` | `S` | 11,750 | 2 | nearest_proxy | Cessna Citation M2 C525 | 2 |
| 🟦 | **BE23** | `S` | `S` | 2,250 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 2 |
| 🟦 | **BL17** | `S` | `S` | 3,325 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 2 |
| 🟦 | **C25B** | `S` | `S` | 13,870 | 2 | nearest_proxy | Cessna Citation II/Bravo C550/551 | 2 |
| 🟢 | **C650** | `D` | `D` | 22,002 | 4 | xml | Cessna Citation VI/VII | 2 |
| 🟦 | **C68A** | `D` | `D` | 30,800 | 4 | family_proxy | Cessna Citation X | 2 |
| 🟦 | **DA40** | `S` | `S` | 2,888 | 2 | nearest_proxy | Cessna 182 Skylane | 2 |
| 🟦 | **DG15** | `S` | `S` | 4,350 | 2 | nearest_proxy | PA-34-220T Seneca II/ III/ IV/V | 2 |
| 🟦 | **HDJT** | `S` | `S` | 9,963 | 2 | nearest_proxy | Cessna C441 Conquest II | 2 |
| 🟦 | **LJ45** | `D` | `D` | 21,500 | 4 | nearest_proxy | Learjet 45/55B | 2 |
| 🟦 | **M20T** | `S` | `S` | 12,500 | 2 | nearest_proxy | Cessna Citation M2 C525 | 2 |
| 🟦 | **MU2** | `S` | `S` | 11,574 | 2 | nearest_proxy | Cessna Citation M2 C525 | 2 |
| 🟦 | **P180** | `S` | `S` | 12,100 | 2 | nearest_proxy | Cessna Citation M2 C525 | 2 |
| 🟦 | **PAY2** | `S` | `S` | 9,479 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 2 |
| 🟦 | **RV6** | `S` | `S` | 1,650 | 2 | nearest_proxy | Cessna 172 Skyhawk | 2 |
| 🟦 | **A10** | `S` | `S` | 50,044 | 2 | nearest_proxy | F/A-18C | 1 |
| 🟦 | **AC11** | `S` | `S` | 3,262 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 1 |
| 🟦 | **AC90** | `S` | `S` | 10,700 | 2 | nearest_proxy | Cessna Citation M2 C525 | 1 |
| 🟦 | **AEST** | `S` | `S` | 6,850 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 1 |
| 🟦 | **B190** | `D` | `D` | 17,120 | 4 | nearest_proxy | Beechcraft King Air 350 | 1 |
| 🟢 | **BE10** | `D` | `D` | 11,800 | 4 | xml | Beechcraft King Air B100 | 1 |
| 🟦 | **C240** | `S` | `S` | 3,600 | 2 | nearest_proxy | Cessna 206 Stationair | 1 |
| 🟦 | **C337** | `S` | `S` | 4,850 | 2 | nearest_proxy | Cessna C210 Centurion | 1 |
| 🟦 | **C510** | `S` | `S` | 7,716 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 1 |
| 🟦 | **CL35** | `D` | `D` | 40,600 | 4 | nearest_proxy | Bombardier CL-604/605 | 1 |
| 🟦 | **ERCO** | `S` | `S` | 1,261 | 2 | nearest_proxy | Cessna 172 Skyhawk | 1 |
| 🟢 | **F2TH** | `D` | `D` | 34,833 | 4 | xml | Dassault Falcon 2000 | 1 |
| 🟨 | **FA50** | `S` | `D` | 38,801 | 4 | xml | Dassault Falcon 50/50EX | 1 |
| 🟦 | **G150** | `D` | `D` | 26,100 | 4 | nearest_proxy | Hawker-800/800XP | 1 |
| 🟦 | **LNC4** | `S` | `S` | 3,086 | 2 | nearest_proxy | Cessna 182 Skylane | 1 |
| 🟦 | **MO20** | `S` | `S` | 11,799 | 2 | nearest_proxy | Cessna Citation M2 C525 | 1 |
| 🟦 | **PA44** | `S` | `S` | 3,798 | 2 | nearest_proxy | PA-46-350P Malibu Mirage | 1 |
| 🟦 | **R135** | `2D` | `2D` | 321,874 | 8 | nearest_proxy | B757-300 | 1 |
| 🟦 | **RV10** | `S` | `S` | 2,700 | 2 | nearest_proxy | Cessna 172 Skyhawk | 1 |
| 🟢 | **SH36** | `S` | `S` | 27,099 | 2 | xml | Shorts 360 | 1 |

### KMWH — 196 unique aircraft

| Sev | ICAO | Excel gear | Lib gear | Excel MTOW | n_wheels | Source | FAARFIELD name | Excel count |
|---|---|---|---|---|---|---|---|---|
| 🟥 | **UNKNOWN** | `UNKNOWN` | `UNKNOWN` | -1 | 2 | dual_fallback |  | 8148 |
| 🟨 | **C17** | `2D` | `2T` | 585,000 | 12 | xml | C-17A | 7164 |
| 🟦 | **BE23** | `S` | `S` | 2,250 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 3994 |
| 🟨 | **BE19** | `D` | `S` | 17,120 | 4 | nearest_proxy | Learjet 35/36/35A/36A | 3951 |
| 🟢 | **B738** | `D` | `D` | 174,200 | 4 | xml | B737 BBJ2 | 2610 |
| 🟢 | **C172** | `S` | `S` | 2,450 | 2 | xml | Cessna 172 Skyhawk | 2194 |
| 🟦 | **P28A** | `S` | `S` | 2,548 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 2147 |
| 🟦 | **PC12** | `S` | `S` | 9,039 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 2095 |
| 🟢 | **P3** | `D` | `D` | 135,000 | 4 | xml | P-3C | 1759 |
| 🟢 | **C208** | `S` | `S` | 7,800 | 2 | xml | Cessna 208B Grand Caravan EX | 1758 |
| 🟦 | **BE99** | `D` | `D` | 10,400 | 4 | nearest_proxy | Beechcraft King Air B100 | 1154 |
| 🟢 | **B350** | `D` | `D` | 16,500 | 4 | xml | Beechcraft King Air 350 | 859 |
| 🟦 | **MRJ9** | `D` | `D` | 85,980 | 4 | nearest_proxy | CRJ900 | 648 |
| 🟢 | **B789** | `2D` | `2D` | 560,000 | 8 | xml | B787-9 | 564 |
| 🟢 | **C182** | `S` | `S` | 2,550 | 2 | xml | Cessna 182 Skylane | 505 |
| 🟦 | **BE20** | `D` | `D` | 12,500 | 4 | nearest_proxy | Beechcraft King Air B100 | 475 |
| 🟢 | **B739** | `D` | `D` | 187,700 | 4 | xml | B737-900 ER | 423 |
| 🟢 | **F18S** | `S` | `S` | 55,997 | 2 | xml | F/A-18C | 422 |
| 🟦 | **C152** | `S` | `S` | 5,732 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 414 |
| 🟢 | **B737** | `D` | `D` | 154,500 | 4 | xml | B737 BBJ | 403 |
| 🟢 | **B788** | `2D` | `2D` | 502,500 | 8 | xml | B787-8 | 375 |
| 🟢 | **BE33** | `S` | `S` | 3,500 | 2 | xml | Beechcraft Bonanza F33A | 362 |
| 🟢 | **B38M** | `D` | `D` | 181,200 | 4 | xml | B737-8/8-200/BBJ MAX 8 | 288 |
| 🟦 | **K35R** | `2D` | `2D` | 322,500 | 8 | nearest_proxy | B757-300 | 275 |
| 🟢 | **C550** | `S` | `S` | 14,800 | 2 | xml | Cessna Citation II/Bravo C550/551 | 273 |
| 🟢 | **B77W** | `3D` | `3D` | 775,000 | 12 | xml | B777-300 ER | 272 |
| 🟦 | **T38** | `S` | `S` | 12,093 | 2 | nearest_proxy | Cessna Citation M2 C525 | 247 |
| 🟨 | **BE9L** | `D` | `S` | 10,097 | 2 | xml | Beechcraft King Air C90 | 238 |
| 🟨 | **DC10** | `2D` | `2D/D1` | 430,000 | 8 | xml | KC-10 | 205 |
| 🟦 | **BE35** | `S` | `S` | 3,400 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 192 |
| 🟦 | **BE30** | `D` | `D` | 14,000 | 4 | nearest_proxy | Beechcraft King Air 350 | 189 |
| 🟦 | **F18** | `S` | `S` | 51,900 | 2 | nearest_proxy | F-15C | 188 |
| 🟢 | **C560** | `S` | `S` | 16,300 | 2 | xml | Cessna Citation V | 185 |
| 🟢 | **B762** | `2D` | `2D` | 395,000 | 8 | xml | B767-200 ER | 183 |
| 🟢 | **B779** | `3D` | `3D` | 775,000 | 12 | xml | B777-9 | 176 |
| 🟦 | **RJ85** | `D` | `D` | 97,000 | 4 | nearest_proxy | BAe 146-300/300QC/300QT | 172 |
| 🟦 | **CVLT** | `D` | `D` | 57,000 | 4 | nearest_proxy | ERJ-145 XR | 163 |
| 🟦 | **PA44** | `S` | `S` | 3,798 | 2 | nearest_proxy | PA-46-350P Malibu Mirage | 163 |
| 🟢 | **C210** | `S` | `S` | 3,100 | 2 | xml | Cessna C210 Centurion | 154 |
| 🟨 | **C30J** | `2D` | `2S` | 155,000 | 8 | nearest_proxy | B757-200 | 154 |
| 🟨 | **C130** | `2D` | `2S` | 155,000 | 4 | xml | C-130-70 | 153 |
| 🟦 | **LJ45** | `D` | `D` | 21,500 | 4 | nearest_proxy | Learjet 45/55B | 152 |
| 🟦 | **SW4** | `D` | `D` | 14,500 | 4 | nearest_proxy | Beechcraft King Air 350 | 152 |
| 🟦 | **RV7** | `S` | `S` | 1,600 | 2 | nearest_proxy | Cessna 172 Skyhawk | 150 |
| 🟦 | **PA28** | `S` | `S` | 2,150 | 2 | nearest_proxy | Cessna 172 Skyhawk | 135 |
| 🟢 | **B748** | `2D/2D2` | `2D/2D2` | 987,000 | 8 | xml | B747-8F | 132 |
| 🟢 | **C206** | `S` | `S` | 3,600 | 2 | xml | Cessna 206 Stationair | 95 |
| 🟦 | **C56X** | `S` | `S` | 15,000 | 2 | family_proxy | Cessna Citation V | 95 |
| 🟢 | **B773** | `3D` | `3D` | 766,800 | 12 | xml | B777-300 | 88 |
| 🟢 | **BE10** | `D` | `D` | 11,800 | 4 | xml | Beechcraft King Air B100 | 87 |
| 🟢 | **PA34** | `S` | `S` | 4,629 | 2 | xml | PA-34-220T Seneca II/ III/ IV/V | 85 |
| 🟦 | **C150** | `S` | `S` | 1,543 | 2 | nearest_proxy | Cessna 172 Skyhawk | 81 |
| 🟢 | **B78X** | `2D` | `2D` | 502,500 | 8 | xml | B787-10 | 79 |
| 🟦 | **AC90** | `S` | `S` | 10,700 | 2 | nearest_proxy | Cessna Citation M2 C525 | 77 |
| 🟢 | **B39M** | `D` | `D` | 194,668 | 4 | xml | B737-9 MAX | 77 |
| 🟦 | **P28R** | `S` | `S` | 2,866 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 76 |
| 🟦 | **C680** | `D` | `D` | 30,000 | 4 | family_proxy | Cessna Citation X | 75 |
| 🟨 | **SW3** | `S` | `D` | 3,368 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 74 |
| 🟢 | **B744** | `2D/2D2` | `2D/2D2` | 910,000 | 8 | xml | B747-400ER | 69 |
| 🟢 | **C525** | `S` | `S` | 10,700 | 2 | xml | Cessna Citation M2 C525 | 69 |
| 🟦 | **M20P** | `S` | `S` | 2,579 | 2 | nearest_proxy | Cessna 172 Skyhawk | 69 |
| 🟢 | **CL60** | `D` | `D` | 48,200 | 4 | xml | Bombardier CL-604/605 | 66 |
| 🟢 | **PA32** | `S` | `S` | 3,400 | 2 | xml | PA-32-300 Cherokee Six | 66 |
| 🟢 | **B763** | `2D` | `2D` | 412,000 | 8 | xml | B767-300 ER/Freighter | 65 |
| 🟦 | **PRM1** | `S` | `S` | 8,800 | 2 | nearest_proxy | Beechcraft King Air C90 | 60 |
| 🟢 | **B77L** | `3D` | `3D` | 775,000 | 12 | xml | B777-200 LR | 59 |
| 🟦 | **GLEX** | `D` | `D` | 95,901 | 4 | nearest_proxy | CRJ700 | 59 |
| 🟦 | **LJ60** | `D` | `D` | 23,500 | 4 | nearest_proxy | Learjet 45/55B | 59 |
| 🟢 | **E55P** | `S` | `S` | 17,528 | 4 | proxy_override | Cessna Citation VI/VII | 53 |
| 🟦 | **B703** | `2D` | `2D` | 333,600 | 8 | nearest_proxy | B767-200 ER | 50 |
| 🟦 | **BE36** | `S` | `S` | 3,650 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 49 |
| 🟦 | **AA5** | `S` | `S` | 2,400 | 2 | nearest_proxy | Cessna 172 Skyhawk | 47 |
| 🟦 | **GLF6** | `D` | `D` | 99,600 | 4 | nearest_proxy | Gulfstream G-V/G500/G550 | 46 |
| 🟦 | **B462** | `D` | `D` | 93,000 | 4 | family_proxy | BAe 146-300/300QC/300QT | 45 |
| 🟦 | **C337** | `S` | `S` | 4,850 | 2 | nearest_proxy | Cessna C210 Centurion | 45 |
| 🟦 | **CL30** | `D` | `D` | 37,478 | 4 | nearest_proxy | Bombardier CL-604/605 | 45 |
| 🟢 | **PA31** | `S` | `S` | 6,500 | 2 | xml | PA-31-325 Navajo C/R | 45 |
| 🟢 | **B772** | `3D` | `3D` | 766,000 | 12 | xml | B777-200 | 44 |
| 🟨 | **C750** | `S` | `D` | 35,699 | 4 | xml | Cessna Citation X | 42 |
| 🟦 | **C185** | `S` | `S` | 3,348 | 2 | nearest_proxy | Cessna 206 Stationair | 41 |
| 🟦 | **P180** | `S` | `S` | 12,100 | 2 | nearest_proxy | Cessna Citation M2 C525 | 39 |
| 🟦 | **LJ31** | `D` | `D` | 17,698 | 4 | nearest_proxy | Learjet 35/36/35A/36A | 38 |
| 🟢 | **P32R** | `S` | `S` | 3,615 | 2 | xml | PA-32R-301 Saratoga | 38 |
| 🟦 | **B190** | `D` | `D` | 17,120 | 4 | nearest_proxy | Beechcraft King Air 350 | 37 |
| 🟦 | **S22T** | `S` | `S` | 15,100 | 2 | nearest_proxy | Cessna Citation II/Bravo C550/551 | 37 |
| 🟦 | **C25B** | `S` | `S` | 13,870 | 2 | nearest_proxy | Cessna Citation II/Bravo C550/551 | 36 |
| 🟢 | **E50P** | `S` | `S` | 10,471 | 2 | proxy_override | BeechJet-400/400A | 36 |
| 🟦 | **P46T** | `S` | `S` | 4,850 | 2 | family_proxy | PA-46-350P Malibu Mirage | 36 |
| 🟦 | **C25A** | `S` | `S` | 12,125 | 2 | nearest_proxy | Cessna Citation M2 C525 | 33 |
| 🟢 | **B752** | `2D` | `2D` | 255,500 | 8 | xml | B757-200 | 32 |
| 🟢 | **C414** | `S` | `S` | 6,750 | 2 | xml | Cessna 414/414A Chancellor | 31 |
| 🟢 | **LJ35** | `D` | `D` | 18,000 | 4 | xml | Learjet 35/36/35A/36A | 31 |
| 🟦 | **PA30** | `S` | `S` | 3,725 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 31 |
| 🟦 | **C177** | `S` | `S` | 2,500 | 2 | nearest_proxy | Cessna 172 Skyhawk | 30 |
| 🟢 | **H25B** | `D` | `D` | 28,000 | 4 | xml | Hawker-800/800XP | 30 |
| 🟢 | **PA46** | `S` | `S` | 4,299 | 2 | xml | PA-46-350P Malibu Mirage | 30 |
| 🟢 | **BE40** | `S` | `S` | 16,100 | 2 | xml | BeechJet-400/400A | 29 |
| 🟦 | **D328** | `D` | `D` | 30,842 | 4 | nearest_proxy | Saab 340B | 29 |
| 🟢 | **GLF5** | `D` | `D` | 88,846 | 4 | xml | Gulfstream G-V/G500/G550 | 29 |
| 🟢 | **G280** | `D` | `D` | 12,566 | 4 | proxy_override | Bombardier CL-604/605 | 28 |
| 🟦 | **SR20** | `S` | `S` | 3,000 | 2 | nearest_proxy | Cessna 182 Skylane | 28 |
| 🟨 | **FA50** | `S` | `D` | 38,801 | 4 | xml | Dassault Falcon 50/50EX | 27 |
| 🟦 | **C510** | `S` | `S` | 7,716 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 26 |
| 🟢 | **GLF4** | `D` | `D` | 73,200 | 4 | xml | Gulfstream-G-IV | 24 |
| 🟦 | **PA24** | `S` | `S` | 3,200 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 23 |
| 🟢 | **F900** | `D` | `D` | 45,503 | 4 | xml | Dassault Falcon 900B/C | 22 |
| 🟦 | **MO20** | `S` | `S` | 11,799 | 2 | nearest_proxy | Cessna Citation M2 C525 | 22 |
| 🟦 | **C140** | `S` | `S` | 1,450 | 2 | nearest_proxy | Cessna 172 Skyhawk | 21 |
| 🟦 | **DA40** | `S` | `S` | 2,888 | 2 | nearest_proxy | Cessna 182 Skylane | 21 |
| 🟦 | **C25C** | `S` | `S` | 10,361 | 2 | nearest_proxy | Cessna Citation M2 C525 | 20 |
| 🟦 | **C310** | `S` | `S` | 4,600 | 2 | nearest_proxy | Cessna C210 Centurion | 20 |
| 🟢 | **F2TH** | `D` | `D` | 34,833 | 4 | xml | Dassault Falcon 2000 | 20 |
| 🟦 | **EA50** | `S` | `S` | 39,595 | 2 | nearest_proxy | F-16C | 19 |
| 🟢 | **C441** | `S` | `S` | 9,850 | 2 | xml | Cessna C441 Conquest II | 18 |
| 🟢 | **DH8D** | `D` | `D` | 63,052 | 4 | xml | Q400/Dash 8 Series 400 | 17 |
| 🟢 | **GALX** | `D` | `D` | 33,289 | 4 | proxy_override | Cessna Citation VI/VII | 17 |
| 🟢 | **B732** | `D` | `D` | 128,100 | 4 | xml | B737-200 | 16 |
| 🟦 | **C340** | `S` | `S` | 5,974 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 16 |
| 🟦 | **CL35** | `D` | `D` | 40,600 | 4 | nearest_proxy | Bombardier CL-604/605 | 16 |
| 🟦 | **RV6** | `S` | `S` | 1,650 | 2 | nearest_proxy | Cessna 172 Skyhawk | 16 |
| 🟦 | **BE58** | `S` | `S` | 5,500 | 2 | nearest_proxy | Beechcraft Baron 55 | 15 |
| 🟦 | **FA7X** | `D` | `D` | 70,000 | 4 | nearest_proxy | Dassault Falcon 900B/C | 14 |
| 🟦 | **AC50** | `S` | `S` | 6,750 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 13 |
| 🟢 | **C650** | `D` | `D` | 22,002 | 4 | xml | Cessna Citation VI/VII | 13 |
| 🟦 | **LGEZ** | `S` | `S` | 1,425 | 2 | nearest_proxy | Cessna 172 Skyhawk | 13 |
| 🟨 | **BE9T** | `D` | `S` | 1,543 | 4 | nearest_proxy | Beechcraft King Air B100 | 12 |
| 🟦 | **M20T** | `S` | `S` | 12,500 | 2 | nearest_proxy | Cessna Citation M2 C525 | 12 |
| 🟢 | **BE55** | `S` | `S` | 5,300 | 2 | xml | Beechcraft Baron 55 | 11 |
| 🟦 | **EPIC** | `S` | `S` | 7,500 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 11 |
| 🟦 | **DA42** | `S` | `S` | 4,407 | 2 | nearest_proxy | PA-34-220T Seneca II/ III/ IV/V | 10 |
| 🟦 | **G150** | `D` | `D` | 26,100 | 4 | nearest_proxy | Hawker-800/800XP | 10 |
| 🟢 | **PA27** | `S` | `S` | 5,200 | 2 | xml | PA-23-250 Aztec | 10 |
| 🟦 | **AEST** | `S` | `S` | 6,850 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 9 |
| 🟦 | **ASTR** | `D` | `D` | 35,650 | 4 | nearest_proxy | Cessna Citation X | 9 |
| 🟢 | **B735** | `D` | `D` | 136,000 | 4 | xml | B737-500 | 9 |
| 🟦 | **C501** | `S` | `S` | 13,227 | 2 | family_proxy | Cessna Citation II/Bravo C550/551 | 9 |
| 🟦 | **LNC4** | `S` | `S` | 3,086 | 2 | nearest_proxy | Cessna 182 Skylane | 9 |
| 🟦 | **E120** | `D` | `D` | 25,353 | 4 | nearest_proxy | ERJ-135 | 8 |
| 🟦 | **SF50** | `S` | `S` | 6,000 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 8 |
| 🟦 | **TBM7** | `S` | `S` | 6,613 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 8 |
| 🟦 | **TBM8** | `S` | `S` | 7,495 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 8 |
| 🟦 | **AC95** | `S` | `S` | 11,750 | 2 | nearest_proxy | Cessna Citation M2 C525 | 7 |
| 🟦 | **C421** | `S` | `S` | 7,450 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 7 |
| 🟦 | **DHC6** | `S` | `S` | 12,500 | 2 | nearest_proxy | Cessna Citation M2 C525 | 7 |
| 🟦 | **P28B** | `S` | `S` | 2,150 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 7 |
| 🟦 | **PAY1** | `S` | `S` | 8,699 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 7 |
| 🟦 | **TBM9** | `S` | `S` | 7,394 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 7 |
| 🟦 | **PAY2** | `S` | `S` | 9,479 | 2 | nearest_proxy | PA-31-325 Navajo C/R | 6 |
| 🟦 | **A4** | `3D` | `3D` | 310,852 | 12 | nearest_proxy | A400M TLL2 | 5 |
| 🟦 | **AT43** | `D` | `D` | 36,825 | 4 | nearest_proxy | Q200/Dash 8 Series 200 | 5 |
| 🟢 | **B733** | `D` | `D` | 139,500 | 4 | xml | B737-300 | 5 |
| 🟦 | **COL4** | `S` | `S` | 3,600 | 2 | nearest_proxy | Cessna 206 Stationair | 5 |
| 🟢 | **F15** | `S` | `S` | 68,000 | 2 | xml | F-15C | 5 |
| 🟦 | **FA20** | `D` | `D` | 30,325 | 4 | nearest_proxy | Dassault Falcon 2000 | 5 |
| 🟦 | **BE90** | `S` | `S` | 10,097 | 2 | nearest_proxy | Cessna C441 Conquest II | 4 |
| 🟦 | **C25M** | `S` | `S` | 13,870 | 2 | family_proxy | Cessna Citation M2 C525 | 4 |
| 🟢 | **DC93** | `D` | `D` | 110,098 | 4 | xml | DC9-32 | 4 |
| 🟢 | **F16** | `S` | `S` | 3,306 | 2 | xml | F-16C | 4 |
| 🟦 | **BE24** | `S` | `S` | 2,750 | 2 | nearest_proxy | Beechcraft Bonanza F33A | 3 |
| 🟦 | **BE60** | `S` | `S` | 6,775 | 2 | nearest_proxy | Beechcraft Baron 55 | 3 |
| 🟦 | **BL17** | `S` | `S` | 3,325 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 3 |
| 🟦 | **C335** | `S` | `S` | 5,990 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 3 |
| 🟦 | **C402** | `S` | `S` | 6,850 | 2 | nearest_proxy | Cessna 414/414A Chancellor | 3 |
| 🟦 | **C425** | `S` | `S` | 8,598 | 2 | nearest_proxy | Cessna 208B Grand Caravan EX | 3 |
| 🟦 | **C500** | `S` | `S` | 9,502 | 2 | nearest_proxy | Cessna C441 Conquest II | 3 |
| 🟦 | **C55B** | `S` | `S` | 42,300 | 2 | family_proxy | Cessna Citation II/Bravo C550/551 | 3 |
| 🟦 | **CH7A** | `S` | `S` | 1,300 | 2 | nearest_proxy | Cessna 172 Skyhawk | 3 |
| 🟦 | **HA4T** | `D` | `D` | 39,500 | 4 | nearest_proxy | Hawker-800/800XP | 3 |
| 🟦 | **PC24** | `D` | `D` | 18,300 | 4 | nearest_proxy | Learjet 35/36/35A/36A | 3 |
| 🟦 | **C240** | `S` | `S` | 3,600 | 2 | nearest_proxy | Cessna 206 Stationair | 2 |
| 🟦 | **C68A** | `D` | `D` | 30,800 | 4 | family_proxy | Cessna Citation X | 2 |
| 🟢 | **CRJ2** | `D` | `D` | 53,000 | 4 | xml | CRJ100LR/200LR | 2 |
| 🟦 | **DG15** | `S` | `S` | 4,350 | 2 | nearest_proxy | PA-34-220T Seneca II/ III/ IV/V | 2 |
| 🟢 | **E145** | `D` | `D` | 53,131 | 4 | xml | ERJ-145 XR | 2 |
| 🟦 | **RV10** | `S` | `S` | 2,700 | 2 | nearest_proxy | Cessna 172 Skyhawk | 2 |
| 🟦 | **RV12** | `S` | `S` | 1,320 | 2 | nearest_proxy | Cessna 172 Skyhawk | 2 |
| 🟦 | **A10** | `S` | `S` | 50,044 | 2 | nearest_proxy | F/A-18C | 1 |
| 🟢 | **A124** | `5D` | `5D` | 886,258 | 20 | xml | An-124 | 1 |
| 🟦 | **AC11** | `S` | `S` | 3,262 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 1 |
| 🟦 | **AC80** | `S` | `S` | 9,400 | 2 | nearest_proxy | Beechcraft King Air C90 | 1 |
| 🟦 | **AT3P** | `S` | `S` | 5,000 | 2 | nearest_proxy | PA-23-250 Aztec | 1 |
| 🟦 | **AT8T** | `S` | `S` | 16,000 | 2 | nearest_proxy | BeechJet-400/400A | 1 |
| 🟦 | **B06** | `S` | `S` | 3,200 | 2 | nearest_proxy | Cessna 206 Stationair | 1 |
| 🟦 | **B461** | `D` | `D` | 84,000 | 4 | family_proxy | BAe 146-300/300QC/300QT | 1 |
| 🟢 | **B722** | `D` | `D` | 209,500 | 4 | xml | B727-200 Advanced Option | 1 |
| 🟢 | **B736** | `D` | `D` | 144,500 | 4 | xml | B737-600 | 1 |
| 🟦 | **C162** | `S` | `S` | 1,320 | 2 | nearest_proxy | Cessna 172 Skyhawk | 1 |
| 🟦 | **DC91** | `D` | `D` | 90,700 | 4 | nearest_proxy | DC9-32 | 1 |
| 🟢 | **DH8A** | `D` | `D` | 34,392 | 4 | xml | Q100/Dash 8 Series 100 | 1 |
| 🟢 | **E135** | `D` | `D` | 44,070 | 4 | xml | ERJ-135 | 1 |
| 🟦 | **HDJT** | `S` | `S` | 9,963 | 2 | nearest_proxy | Cessna C441 Conquest II | 1 |
| 🟦 | **LEG2** | `S` | `S` | 2,200 | 2 | nearest_proxy | Cessna 172 Skyhawk | 1 |
| 🟢 | **MD83** | `D` | `D` | 149,500 | 4 | xml | MD-83 | 1 |
| 🟦 | **MU2** | `S` | `S` | 11,574 | 2 | nearest_proxy | Cessna Citation M2 C525 | 1 |
| 🟦 | **PA22** | `S` | `S` | 1,950 | 2 | nearest_proxy | PA-32-300 Cherokee Six | 1 |
| 🟦 | **T6** | `S` | `S` | 5,617 | 2 | nearest_proxy | Beechcraft Baron 55 | 1 |

