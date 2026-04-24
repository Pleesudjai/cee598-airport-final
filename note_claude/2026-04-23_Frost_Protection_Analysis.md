# Frost Protection Analysis — Project Airports

**Date:** 2026-04-23
**Author:** Chidchanok Pleesudjai (CEE 598 Final Project)
**Reference standard:** FAA AC 150/5320-6F, Chapter 3 — *Frost Considerations*
**Climate data source:** NOAA NCEI Climate Normals 1991–2020 (daily TAVG per GHCN-D station)
**Computation script:** `scripts/fetch_climate_normals.py`
**Per-airport data:** `results/airport_frost_data.json`

---

## 1. Why this analysis

The FAARFIELD CDF analysis evaluates **structural fatigue** under repeated wheel loading — it does not capture **freeze-induced subgrade damage**, which is governed by a separate FAA design path (AC 150/5320-6F Chapter 3). For airports with cold winters and frost-susceptible subgrade, the pavement section must extend deep enough below the surface to either fully prevent or substantially limit frost penetration into the subgrade, otherwise heave and thaw-weakening will degrade the slab independently of fatigue.

The two analyses are **complementary**:

- CDF flags structural fatigue from traffic
- Frost analysis flags freeze damage from climate

A section can be adequate on one and inadequate on the other.

---

## 2. Methodology

### 2.1 Air Freezing Index (AFI)

The Air Freezing Index is the cumulative magnitude of below-freezing daily mean air temperature over the year:

$$
\text{AFI} = \sum_{d=1}^{365} \max\!\bigl(0,\; 32 - T_{\text{avg},d}\bigr) \quad\text{[°F·days]}
$$

`T_avg,d` is the daily mean temperature normal (30-year average, 1991–2020) at the nearest NOAA NCEI GHCN-D station to each project airport.

### 2.2 Frost penetration depth — modified Berggren (simplified)

The full Berggren equation requires site-specific soil thermal conductivity, latent heat of fusion (a function of dry density and moisture content), and a Stefan/correction factor. For preliminary design without geotechnical lab data, the FAA accepts a simplified empirical form:

$$
X = K \cdot \sqrt{\text{AFI}} \quad\text{[in]}
$$

where `K` is a soil-thermal coefficient that bundles thermal conductivity and latent heat for a typical airport AC-over-PCC composite section. Values used:

| FAA frost class | Soil character | K (in / √°F·days) |
|---|---|---|
| FG-1 | Negligible (gravels, < 3 % finer than 0.02 mm) | 1.40 |
| FG-2 | Possible (sandy gravels, sandy loams) | 1.30 |
| FG-3 | Medium (silty sands, low-PI clays) | 1.20 |
| FG-4 | High (silts, silty clays, organics) | 1.10 |

(Higher K for coarse-grained soils because they have higher thermal conductivity and lower latent heat — frost penetrates faster into clean gravel than into a silty clay.)

### 2.3 FAA AC 150/5320-6F treatment tiers

The AC defines three pavement-design approaches with respect to frost:

| Tier | Criterion | Action |
|---|---|---|
| **Complete frost protection** | `pavement_total ≥ frost_depth` | No frost-induced damage expected; standard FAARFIELD design holds |
| **Limited subgrade frost penetration** | `pavement_total ≥ 0.65 · frost_depth` (and frost class FG-2 / FG-3 / FG-4) | Some frost penetration into subgrade is acceptable |
| **Inadequate** | `pavement_total < 0.65 · frost_depth` | Recommend extending non-frost-susceptible base/subbase to at least 65 % of frost depth, OR full reconstruction to the complete frost depth |

For **FG-1 subgrade** the AC states no special treatment is required regardless of frost depth, because the subgrade itself is not frost-susceptible (no significant heave or thaw-weakening).

### 2.4 Subgrade frost classification

Per AC 150/5320-6F Table 3-2, mapped from the NRCS-derived AASHTO classification we used in the CDF analysis:

| ICAO | NRCS soil | AASHTO | CBR | **FG class** | Rationale |
|---|---|---|---|---|---|
| KLHX | Silt Loam | A-6 | 7 | **FG-3** | Silty soils with moderate PI |
| KPUB | Bedrock / Shale | Rock | 12 | **FG-1** | Bedrock substrate — negligible frost susceptibility |
| KMQJ | Silty Clay | A-7-6 | 4 | **FG-4** | Silty clay with high PI — most frost-susceptible class |
| KCIU | Fine Sand | A-3 | 20 | **FG-2** | Clean sand, low susceptibility but shallow water table possible |
| KOTM | Silty Clay Loam | A-7-6 | 4 | **FG-4** | Silty clay loam, high PI |
| KMWH | Gravelly Coarse Sand | A-1-a | 40 | **FG-1** | Coarse gravelly sand — negligible frost susceptibility |

---

## 3. Per-airport climate data and frost-protection results

### 3.1 NOAA station mapping

| Project airport | NOAA GHCN-D station | Station name | Distance / note |
|---|---|---|---|
| KLHX (La Junta, CO) | `USC00054834` | Las Animas, CO | ~20 mi east; closest available climate-normals station to La Junta |
| KPUB (Pueblo, CO) | `USW00093058` | Pueblo Memorial Airport | Co-located with KPUB |
| KMQJ (Indianapolis Reg., IN) | `USW00093819` | Indianapolis Intl, IN | ~12 mi west of KMQJ; same climate region |
| KCIU (Sault Ste Marie, MI) | `USW00014847` | Sault Ste Marie Sanderson Fld, MI | Same airfield complex as KCIU |
| KOTM (Ottumwa, IA) | `USW00014931` | Burlington Muni AP, IA | ~80 mi east of KOTM at the same latitude (similar SE-Iowa continental climate); used as proxy because Ottumwa Industrial AP does not have its own NOAA climate-normals station |
| KMWH (Moses Lake, WA) | `USW00024110` | Moses Lake Grant Co AP, WA | Co-located with KMWH |

### 3.2 Computed AFI, frost depth, and treatment tier

| ICAO | Climate (AFI / frozen-days/yr / coldest day TAVG) | FG class | Frost depth | Total pavement | **Verdict** |
|---|---|---|---|---|---|
| **KLHX** | 39.4 °F·days · few · ~32 °F | FG-3 | **7.53″** | 12.0″ | ✅ Complete frost protection |
| **KPUB** | 29.7 °F·days · 36 days · 30.7 °F (12-21) | FG-1 | 7.63″ | 15.5″ | ✅ No special treatment (FG-1 subgrade) |
| **KMQJ** | 143.0 °F·days · 55 days · 28.0 °F (01-17) | FG-4 | 13.15″ | 17.5″ | ✅ Complete frost protection |
| **KCIU** | **1326.4 °F·days · 127 days · 15.1 °F (01-25)** | FG-2 | **47.35″** | 26.5″ | 🔴 **INADEQUATE — frost ≈ 1.8 × pavement** |
| **KOTM** | 408.4 °F·days · ~88 days · ~22 °F | FG-4 | **22.23″** | 12.0″ | 🔴 **INADEQUATE — frost ≈ 1.85 × pavement** |
| **KMWH** | 126.5 °F·days · 59 days · 28.7 °F (12-25) | FG-1 | 15.75″ | 20.0″ | ✅ No special treatment (FG-1 subgrade) |

**Headline:** 4 compliant, **2 inadequate** (KCIU and KOTM).

---

## 4. Sections flagged as inadequate

### 4.1 KCIU — Chippewa County International, MI

**The most severe frost case in the study.** Sault Ste Marie sits on the Upper Peninsula at the Great Lakes' northern edge — 127 days/year with mean temperature below freezing, and the coldest normal day (Jan 25) averages only 15 °F. The cumulative AFI of 1,326 °F·days yields a Berggren frost depth of **47.35 inches** for FG-2 fine-sand subgrade.

The existing pavement section is **2.5″ AC overlay + 24″ PCC = 26.5″ total**. This covers only **56 %** of the computed frost depth — below the FAA's 65 % threshold.

**Recommended treatment per AC 150/5320-6F:**
- **Limited frost penetration option:** extend non-frost-susceptible base/subbase to at least **30.8″ depth** (= 0.65 · 47.35″)
- **Complete protection option:** extend to the full **47.4″** of non-frost-susceptible material (additional ~21″ of NFS subbase)

**Note:** This section was **also flagged UNDER on the FAARFIELD CDF analysis (CDF = 11.4)**. The two failure modes are independent — addressing CDF alone (e.g., by thickening the PCC) would not solve the frost problem; addressing frost alone (NFS subbase extension) would not solve the CDF problem. Both treatments are required.

### 4.2 KOTM — Ottumwa Regional, IA (sections 28171 / 27450 / 27641)

Burlington (proxy station, 80 miles east of Ottumwa) shows AFI = 408 °F·days. With the FG-4 silty-clay-loam subgrade (the most frost-susceptible class), the modified Berggren depth is **22.23 inches**.

The existing pavement sections are 2.5″ AC + 8″ PCC (12.0″ total) for taxiway 28171, or 3″ AC + 8–9″ PCC (~12″) for the runways. All three are below the 65 % threshold (which would require 14.5″ minimum) and far below complete protection (22.2″).

**Recommended treatment per AC 150/5320-6F:**
- Extend non-frost-susceptible base/subbase to at least **14.5″ depth** for limited frost penetration; or **22.2″** for complete protection.

**Note:** All three KOTM sections passed the CDF analysis comfortably (CDF = 0.47–0.96). Frost is the design-controlling failure mode for KOTM, not fatigue. This is a finding that would not have surfaced from the FAARFIELD CDF analysis alone.

---

## 5. Why KMWH and KPUB do not need frost treatment despite cold winters

KMWH has 59 freezing days/year and AFI = 127 °F·days (modest cold but not extreme). Berggren depth is 15.75″ — but the **subgrade is gravelly coarse sand (FG-1)**, which is not frost-susceptible: water cannot draw up by capillary action through the coarse pores, no ice lenses form, no heave occurs. Per AC 150/5320-6F the pavement section can be designed without frost considerations for FG-1 subgrade regardless of climate.

KPUB has only 36 freezing days/year and AFI = 30 °F·days — the mildest climate among the project's six airports. Combined with FG-1 bedrock-shale subgrade, no frost treatment is required.

---

## 6. Combined assessment — CDF + frost

| ICAO | CDF status | Frost status | Combined verdict |
|---|---|---|---|
| KLHX 7347 | OVER | OK | Both adequate |
| KLHX 6627 | UNDER | OK | Structural rehab only |
| KPUB 6948 | UNDER | OK (FG-1) | Structural rehab only |
| KMQJ 8662 / 8881 / 8640 / 8780 | UNDER | OK | Structural rehab only (frost OK) |
| **KCIU 21222** | **UNDER** | **INADEQUATE** | **Both — structural + frost rehab required** |
| KOTM 27450 | OVER | INADEQUATE | **Frost rehab only (CDF OK)** |
| KOTM 27641 | OVER (borderline 0.96) | INADEQUATE | **Frost rehab + watch CDF margin** |
| KOTM 28171 | OVER (borderline 0.94) | INADEQUATE | **Frost rehab + watch CDF margin** |
| KMWH 37325 / 37508 | UNDER | OK (FG-1) | Structural rehab only |

The frost analysis adds three sections to the rehab list (the three KOTM sections) that the CDF analysis missed, and confirms that the most exposed section (KCIU) needs a two-pronged design fix.

---

## 7. Limitations and caveats

1. **Berggren K coefficients are typical pavement values, not site-specific.** For final design, conduct site-specific frost-heave tests (ASTM D5918) and apply the complete Berggren formula with measured soil thermal conductivity (frozen and unfrozen), volumetric latent heat from dry density and moisture content, and the Stefan / mean annual temperature correction. The simplified `X = K · √AFI` is appropriate for screening; expected accuracy ±20–30 %.
2. **Climate normals are 30-year averages.** Single severe winters can produce frost depths 1.5–2× the normals-based estimate. AC 150/5320-6F frost depth design is deliberately conservative to handle this.
3. **Subgrade frost class FG-2 for KCIU** assumes the fine sand is well-drained. Shallow groundwater or capillary fringe can elevate frost susceptibility to FG-3 or FG-4. Site investigation should verify drainage class.
4. **KOTM uses Burlington as climate proxy** because Ottumwa Industrial Airport does not have a NOAA GHCN-D climate-normals station. Burlington (~80 mi east at same latitude) is in the same southeastern Iowa climate region; expected discrepancy <10 % AFI.
5. **Total pavement section** uses the AC + PCC + base layers from the project's existing structures; if the design intent is for the BASE alone to provide frost protection (with the PCC slab on top), only the base/subbase layers should be counted toward the protection depth. For these airports, the PCC layer thickness dominates and was included in `total_pavement_in`.

---

## 8. References

1. **FAA Advisory Circular 150/5320-6F (2016)** — *Airport Pavement Design and Evaluation*, Chapter 3 "Frost Considerations" and Table 3-2 (Frost Susceptibility Classification).
2. **NOAA NCEI Climate Normals 1991–2020** — daily TAVG normals per GHCN-D station, public-domain CSV downloads at `https://www.ncei.noaa.gov/data/normals-daily/1991-2020/access/<station>.csv`.
3. **U.S. Army Corps of Engineers TM 5-852-6 (1988)** — *Calculation Methods for Determination of Depths of Freeze and Thaw in Soils*, source of the modified Berggren equation.
4. **Aldrich, H. P. & Paynter, H. M. (1953)** — *Frost Investigations 1952-1953: First Interim Report on Studies in the Frost Investigations*, ACFEL Technical Report 42 — original derivation of the modified Berggren formulation.

---

_Generated 2026-04-23 from `scripts/fetch_climate_normals.py` running against the NOAA NCEI Climate Normals public dataset._
