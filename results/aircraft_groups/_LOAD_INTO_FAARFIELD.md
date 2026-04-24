# How to load the per-section Traffic Library XMLs into FAARFIELD desktop

**Step 1.** Copy the .xml files in this folder to:

```
C:\Users\<your-username>\Documents\My FAARFIELD\TrafficLibrary\
```

**Step 2.** In FAARFIELD desktop:
1. File -> New Job (any name)
2. Section -> Add Section -> set Design Type = **HMA Overlay on Existing Rigid (Flex on Rigid)** + Life = **20 yr**
3. Build the layer structure manually using the values in the section's companion `.md` file (3-4 layers, easy to enter)
4. Set PCC Flexural Strength = **360 psi** (per FAA AC 150/5320-6F lower bound for >20-yr aged PCC) and SCI = **80**
5. Click the Aircraft tab -> click the Traffic Library dropdown -> select the section's library name (e.g., `KMQJ_8662`)
6. Click **Analysis -> Life** to compute CDF

**Per-section files in this folder:**

| ICAO | Section | XML file (load this) | Markdown deck (read this) | Aircraft loaded | Skipped (add manually) |
|---|---|---|---|---|---|
| KLHX | 6627 | [`KLHX_6627.xml`](KLHX_6627.xml) | [`KLHX_6627.md`](KLHX_6627.md) | 9/10 | C404 |
| KLHX | 7347 | [`KLHX_7347.xml`](KLHX_7347.xml) | [`KLHX_7347.md`](KLHX_7347.md) | 8/10 | C404, DHC6 |
| KPUB | 6948 | [`KPUB_6948.xml`](KPUB_6948.xml) | [`KPUB_6948.md`](KPUB_6948.md) | 7/10 | CRJ7, E120, B190 |
| KMQJ | 8662 | [`KMQJ_8662.xml`](KMQJ_8662.xml) | [`KMQJ_8662.md`](KMQJ_8662.md) | 10/10 | _(none)_ |
| KMQJ | 8881 | [`KMQJ_8881.xml`](KMQJ_8881.xml) | [`KMQJ_8881.md`](KMQJ_8881.md) | 10/10 | _(none)_ |
| KMQJ | 8640 | [`KMQJ_8640.xml`](KMQJ_8640.xml) | [`KMQJ_8640.md`](KMQJ_8640.md) | 10/10 | _(none)_ |
| KMQJ | 8780 | [`KMQJ_8780.xml`](KMQJ_8780.xml) | [`KMQJ_8780.md`](KMQJ_8780.md) | 10/10 | _(none)_ |
| KCIU | 21222 | [`KCIU_21222.xml`](KCIU_21222.xml) | [`KCIU_21222.md`](KCIU_21222.md) | 9/10 | AC50 |
| KOTM | 28171 | [`KOTM_28171.xml`](KOTM_28171.xml) | [`KOTM_28171.md`](KOTM_28171.md) | 6/10 | R135, GALX, B190, BE30 |
| KOTM | 27450 | [`KOTM_27450.xml`](KOTM_27450.xml) | [`KOTM_27450.md`](KOTM_27450.md) | 6/10 | R135, GALX, B190, BE30 |
| KOTM | 27641 | [`KOTM_27641.xml`](KOTM_27641.xml) | [`KOTM_27641.md`](KOTM_27641.md) | 6/10 | R135, GALX, B190, BE30 |
| KMWH | 37325 | [`KMWH_37325.xml`](KMWH_37325.xml) | [`KMWH_37325.md`](KMWH_37325.md) | 8/10 | BE99, MRJ9 |
| KMWH | 37508 | [`KMWH_37508.xml`](KMWH_37508.xml) | [`KMWH_37508.md`](KMWH_37508.md) | 8/10 | BE99, MRJ9 |

## Caveats

- These XML files contain only the **traffic mix** (aircraft + annual departures). The pavement structure must be built manually per the markdown deck — FAARFIELD does not have a single-file format for both.
- Aircraft listed in the 'Skipped' column above had no good FAARFIELD-library match (typically very small props, military types, or new bizjets the library doesn't include). They are usually low-CDF-contribution and can be safely omitted, OR you can manually pick a similar aircraft from the FAARFIELD library and add it.
- The ICAO codes in our analysis (e.g., `B738`, `GLF5`) are mapped to FAARFIELD library names (e.g., `B737-800`, `Gulfstream G-V/G500/G550`) automatically. The mapping uses the backend's `combined_aircraft_library.json` for tier-1 matches and a manual override dict for the remainder.

_Generated 2026-04-22 21:08 by `scripts/generate_faarfield_traffic_libraries.py`._
