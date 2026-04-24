"""Audit every aircraft in the backend library for asymmetric wheel coords.

Scans `combined_aircraft_library.json` and reports any aircraft whose
wheel coordinates have a geometric centroid significantly off-zero — i.e.
those stored in a gear-local frame instead of a gear-symmetric frame.

This mirrors the BE9L issue: FAARFIELD's library is inconsistent about
whether wheel coords are stored centered on the runway centerline
(symmetric, centroid ≈ 0) or relative to a local gear origin (one wheel
at X=0, the other at the full track-width offset).

The CDF computation itself is robust — `CoverageToPassFull` recomputes
xCenter from the wheel positions internally — but anything that *visualizes*
or *exports* the raw wheel coords (like our GearFootprintTopView, the
project XLSX export, or the per-section markdown decks) needs to know
which library entries are stored in the asymmetric local-frame format.
"""
import json
import os

LIB_PATH = r'c:/temp/aeropave/faarfield-api/bin/x86/Release/combined_aircraft_library.json'
OUTDIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'results')
OUT_PATH = os.path.join(OUTDIR, 'aircraft_centroid_audit.json')
MD_PATH = os.path.join(OUTDIR, 'aircraft_centroid_audit.md')

# Project-traffic ICAOs (so we can flag which anomalies actually affect this study).
PROJECT_ICAOS = set()
for tdir, _, files in os.walk(os.path.join(OUTDIR, 'aircraft_groups')):
    for fn in files:
        if fn.endswith('.csv'):
            with open(os.path.join(tdir, fn)) as f:
                next(f, None)
                for line in f:
                    parts = line.strip().split(',')
                    if len(parts) >= 2:
                        PROJECT_ICAOS.add(parts[1].upper())


def centroid(coords):
    if not coords:
        return None
    return sum(coords) / len(coords)


def half_track_extent(coords):
    if not coords:
        return None
    return (max(coords) - min(coords)) / 2.0


def main():
    lib = json.load(open(LIB_PATH))
    print(f"Loaded {len(lib)} aircraft from {LIB_PATH}")

    geom_count = 0
    anomalous = []   # centroid_x is meaningfully non-zero
    asymmetric_y = [] # centroid_y is meaningfully non-zero (less common, less impactful)
    fine = []
    no_geom = 0

    for entry in lib:
        if not entry.get('has_tire_geometry'):
            no_geom += 1
            continue
        wheel_coords = entry.get('wheel_coords') or entry.get('wheel_coordinates') or entry.get('wheelCoords') or entry.get('wheel_coords_in')
        if not wheel_coords:
            no_geom += 1
            continue
        # wheel_coords may be a list of {x, y} dicts
        try:
            if isinstance(wheel_coords[0], dict):
                xs = [w.get('x', 0) for w in wheel_coords]
                ys = [w.get('y', 0) for w in wheel_coords]
            elif isinstance(wheel_coords[0], (list, tuple)):
                xs = [w[0] for w in wheel_coords]
                ys = [w[1] if len(w) > 1 else 0 for w in wheel_coords]
            else:
                # Probably a flat list — skip
                continue
        except (IndexError, TypeError):
            continue
        geom_count += 1
        cx = centroid(xs)
        cy = centroid(ys)
        track = half_track_extent(xs)
        # Anomaly: centroid > 5 in (a real centroid offset; 0.001 tolerance for fp noise)
        is_anom_x = cx is not None and abs(cx) > 5
        is_anom_y = cy is not None and abs(cy) > 5
        rec = {
            'icao': entry.get('icao'),
            'manufacturer': entry.get('manufacturer'),
            'model': entry.get('model'),
            'mtow': entry.get('mtow'),
            'gear': entry.get('gear'),
            'n_wheels': len(xs),
            'wheelX': xs,
            'wheelY': ys,
            'centroid_x': round(cx, 3) if cx is not None else None,
            'centroid_y': round(cy, 3) if cy is not None else None,
            'half_track_in': round(track, 2) if track is not None else None,
            'in_project_traffic': (entry.get('icao') or '').upper() in PROJECT_ICAOS,
        }
        if is_anom_x or is_anom_y:
            if is_anom_x:
                anomalous.append(rec)
            else:
                asymmetric_y.append(rec)
        else:
            fine.append(rec)

    summary = {
        'total': len(lib),
        'with_geometry': geom_count,
        'no_geometry': no_geom,
        'symmetric (centroid ≈ 0)': len(fine),
        'anomalous_x (|centroid_x| > 5 in)': len(anomalous),
        'anomalous_y_only (|centroid_y| > 5 in)': len(asymmetric_y),
        'project_traffic_aircraft_with_geom': sum(1 for r in fine + anomalous + asymmetric_y if r['in_project_traffic']),
    }

    out = {
        'summary': summary,
        'anomalous_x': sorted(anomalous, key=lambda r: -abs(r['centroid_x'])),
        'anomalous_y_only': sorted(asymmetric_y, key=lambda r: -abs(r['centroid_y'])),
    }
    json.dump(out, open(OUT_PATH, 'w'), indent=2)

    # Markdown summary
    with open(MD_PATH, 'w', encoding='utf-8') as f:
        f.write("# Aircraft Library Centroid Audit\n\n")
        f.write("Scans `combined_aircraft_library.json` for aircraft whose wheel coordinates have an off-zero geometric centroid — i.e. stored in a gear-local frame rather than a gear-symmetric frame.\n\n")
        f.write("**The CDF computation is unaffected** — `CoverageToPassFull` in `FullAnalysisWrapper.vb` recomputes `xCenter` from the wheel positions internally before applying the wander integration. The asymmetric-frame entries only affect *visualization* code (GearFootprintTopView, XLSX exports, markdown decks) that previously took the raw centroid as the gear position.  After 2026-04-23 the GearFootprintTopView re-centers each gear on its centroid before plotting, so all aircraft now display correctly.\n\n")
        f.write("## Summary\n\n")
        f.write("| Statistic | Count |\n|---|---|\n")
        for k, v in summary.items():
            f.write(f"| {k} | {v} |\n")
        f.write("\n")

        f.write(f"## Anomalous in X-centroid ({len(anomalous)} aircraft)\n\n")
        f.write("These have `|centroid_x| > 5 in` — wheel coords stored in a gear-local frame.  ⚠ flag = appears in the project's traffic.\n\n")
        f.write("| ICAO | Manufacturer | Model | MTOW | Gear | n_wheels | centroid_x (in) | half_track (in) | wheelX | In project? |\n")
        f.write("|---|---|---|---|---|---|---|---|---|---|\n")
        for r in out['anomalous_x']:
            flag = '⚠️' if r['in_project_traffic'] else ''
            wx_short = str(r['wheelX'])[:60]
            f.write(f"| **{r['icao']}** | {r['manufacturer'] or ''} | {r['model'] or ''} | {r['mtow'] or '?'} | {r['gear'] or '?'} | {r['n_wheels']} | **{r['centroid_x']:.2f}** | {r['half_track_in']} | `{wx_short}` | {flag} |\n")
        f.write("\n")

        if asymmetric_y:
            f.write(f"## Asymmetric in Y-centroid only ({len(asymmetric_y)} aircraft)\n\n")
            f.write("These have `|centroid_y| > 5 in` (longitudinal asymmetry) but `|centroid_x| ≤ 5 in`.  Less impactful — Y is the runway-direction axis, not lateral.\n\n")
            f.write("| ICAO | Manufacturer | Model | n_wheels | centroid_y (in) | wheelY | In project? |\n")
            f.write("|---|---|---|---|---|---|---|\n")
            for r in out['anomalous_y_only']:
                flag = '⚠️' if r['in_project_traffic'] else ''
                wy_short = str(r['wheelY'])[:60]
                f.write(f"| **{r['icao']}** | {r['manufacturer'] or ''} | {r['model'] or ''} | {r['n_wheels']} | **{r['centroid_y']:.2f}** | `{wy_short}` | {flag} |\n")
            f.write("\n")

    print()
    print("=" * 80)
    print("Aircraft library centroid audit:")
    print("=" * 80)
    for k, v in summary.items():
        print(f"  {k:<50} {v}")
    print()
    if anomalous:
        print(f"Anomalous-X aircraft (|centroid_x| > 5 in):  {len(anomalous)} found")
        in_proj = [r for r in anomalous if r['in_project_traffic']]
        print(f"  → {len(in_proj)} of them appear in this project's traffic mix:")
        for r in in_proj:
            print(f"    {r['icao']:<6}  {(r['manufacturer'] or '?')[:30]:<30}  centroid_x={r['centroid_x']:>8.2f} in  ({r['n_wheels']} wheels)")
    else:
        print("No X-centroid anomalies found.")

    print()
    print(f"Full report:  {MD_PATH}")
    print(f"JSON output:  {OUT_PATH}")


if __name__ == '__main__':
    main()
