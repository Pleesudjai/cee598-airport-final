# Aircraft Library Centroid Audit

Scans `combined_aircraft_library.json` for aircraft whose wheel coordinates have an off-zero geometric centroid — i.e. stored in a gear-local frame rather than a gear-symmetric frame.

**The CDF computation is unaffected** — `CoverageToPassFull` in `FullAnalysisWrapper.vb` recomputes `xCenter` from the wheel positions internally before applying the wander integration. The asymmetric-frame entries only affect *visualization* code (GearFootprintTopView, XLSX exports, markdown decks) that previously took the raw centroid as the gear position.  After 2026-04-23 the GearFootprintTopView re-centers each gear on its centroid before plotting, so all aircraft now display correctly.

## Summary

| Statistic | Count |
|---|---|
| total | 1310 |
| with_geometry | 136 |
| no_geometry | 1174 |
| symmetric (centroid ≈ 0) | 127 |
| anomalous_x (|centroid_x| > 5 in) | 1 |
| anomalous_y_only (|centroid_y| > 5 in) | 8 |
| project_traffic_aircraft_with_geom | 25 |

## Anomalous in X-centroid (1 aircraft)

These have `|centroid_x| > 5 in` — wheel coords stored in a gear-local frame.  ⚠ flag = appears in the project's traffic.

| ICAO | Manufacturer | Model | MTOW | Gear | n_wheels | centroid_x (in) | half_track (in) | wheelX | In project? |
|---|---|---|---|---|---|---|---|---|---|
| **BE9L** | Beechcraft | King Air 90 (A90) | 9710.0 | S | 2 | **-76.50** | 76.5 | `[0.0, -153.0]` | ⚠️ |

## Asymmetric in Y-centroid only (8 aircraft)

These have `|centroid_y| > 5 in` (longitudinal asymmetry) but `|centroid_x| ≤ 5 in`.  Less impactful — Y is the runway-direction axis, not lateral.

| ICAO | Manufacturer | Model | n_wheels | centroid_y (in) | wheelY | In project? |
|---|---|---|---|---|---|---|
| **A388** | Airbus | A380-800 | 8 | **129.00** | `[95.55, 162.45, 95.55, 162.45, 95.55, 162.45, 95.55, 162.45]` |  |
| **B744** | Boeing | 747-400 DOMESTIC | 8 | **121.00** | `[92.0, 150.0, 92.0, 150.0, 92.0, 150.0, 92.0, 150.0]` |  |
| **B748** | Boeing | 747-8 | 8 | **121.00** | `[92.75, 149.25, 92.75, 149.25, 92.75, 149.25, 92.75, 149.25]` |  |
| **B74S** | Boeing | 747-SP | 8 | **121.00** | `[94.0, 148.0, 94.0, 148.0, 94.0, 148.0, 94.0, 148.0]` |  |
| **IL76** | Ilyushin | IL-76 | 16 | **50.79** | `[101.5718, 101.5718, 101.5718, 101.5718, 0.0, 0.0, 0.0, 0.0,` |  |
| **A342** | Airbus | A340-200 | 8 | **39.00** | `[0.0, 78.0, 0.0, 78.0, 0.0, 78.0, 0.0, 78.0]` |  |
| **A343** | Airbus | A340-300 | 8 | **39.00** | `[0.0, 78.0, 0.0, 78.0, 0.0, 78.0, 0.0, 78.0]` |  |
| **C5** | Lockheed | C-5B | 24 | **-10.83** | `[-142.5, -142.5, -142.5, -142.5, -77.5, -77.5, 77.5, 77.5, 7` |  |

