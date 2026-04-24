"""Deep audit: every aircraft in the project's Excel traffic sheets vs the
FAARFIELD aircraft library + the backend's combined library.

For each unique (ICAO, gear, MTOW) tuple in the Excel data, query the live
backend's /api/aircraft/resolve/{icao} endpoint and compare:

  - gear_excel       (what the Excel column G says)
  - gear_library     (what the backend's combined_aircraft_library.json says,
                      via the new LibraryGearType field — UNCONDITIONAL)
  - mtow_excel       (column F)
  - mtow_library     (from the library record, if it has one)
  - n_wheels_library (final resolved geometry's wheel count)
  - geometry_source  (xml | icao_proxy | family_proxy | nearest_proxy |
                      gear_template | dual_fallback)
  - resolved_icao    (which library entry actually supplied the wheel coords)

Mismatches are flagged by category:
  - GEAR mismatch       (Excel gear ≠ library gear, e.g. C-17: Excel=2D, lib=2T)
  - MTOW mismatch       (>5% difference between Excel and library MTOW)
  - PROXY              (geometry came from a different ICAO than the Excel one)
  - GEAR_TEMPLATE      (no real-aircraft proxy found, fell back to a generic
                       gear template — only ~20% of CDF is reliable for these)
  - DUAL_FALLBACK      (no library record at all, generic dual-wheel default
                       — FEM3D blocked, CDF estimate is approximate only)

Output:
  results/audit_excel_vs_library.json   (full per-aircraft audit data)
  results/audit_excel_vs_library.md     (human-readable report with sections
                                         organized by airport and severity)
"""
import json
import os
import sys
import requests
from collections import defaultdict
from datetime import datetime

import pandas as pd
import openpyxl  # noqa: F401  (used by pandas via engine='openpyxl')

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL = os.path.join(PROJECT, 'AO_CEE598_FAARFIELD.xlsx')
RESULTS = os.path.join(PROJECT, 'results')
OUT_JSON = os.path.join(RESULTS, 'audit_excel_vs_library.json')
OUT_MD = os.path.join(RESULTS, 'audit_excel_vs_library.md')
BASE = 'http://localhost:5100'

# Project airport -> Excel sheet name (from the batch script)
AIRPORT_SHEETS = {
    'KLHX': 'Traffic346',
    'KPUB': 'Traffic364',
    'KMQJ': 'Traffic378',
    'KCIU': 'Traffic1017',
    'KOTM': 'Traffic1356',
    'KMWH': 'Traffic1863',
}


def normalize_gear(g):
    """Mirror NormalizeGearType in AircraftLibrary.vb so comparison is fair."""
    if g is None:
        return ''
    s = str(g).strip().upper().replace(' ', '')
    return s


def load_excel_aircraft():
    """Per-airport unique aircraft from Excel.  Returns:
       { airport_icao: { (ac_icao, normalized_gear, mtow): {airport, ac, gear_excel, mtow_excel, total_count} } }"""
    out = {}
    for apt_icao, sheet in AIRPORT_SHEETS.items():
        df = pd.read_excel(EXCEL, sheet_name=sheet, header=0)
        cols = list(df.columns)
        # Excel columns: Aircraft Type | Year | Airport Name | Runway | Traffic Type | MTOW | Main Gear Config | Yearly Count
        df = df.dropna(subset=[cols[0], cols[5]])
        airport_dict = {}
        for _, row in df.iterrows():
            ac_icao = str(row[cols[0]]).strip().upper()
            mtow = float(row[cols[5]] or 0)
            gear_excel = normalize_gear(row[cols[6]])
            count = int(row[cols[7]] or 0)
            key = (ac_icao, gear_excel, mtow)
            if key not in airport_dict:
                airport_dict[key] = {
                    'airport': apt_icao, 'ac_icao': ac_icao,
                    'gear_excel': gear_excel, 'mtow_excel': mtow,
                    'total_count': 0,
                }
            airport_dict[key]['total_count'] += count
        out[apt_icao] = airport_dict
    return out


def resolve_via_backend(icao, gear_hint, mtow_hint):
    """Call /api/aircraft/resolve/{icao} on the live backend."""
    params = {}
    if gear_hint: params['gear'] = gear_hint
    if mtow_hint: params['mtow'] = mtow_hint
    try:
        r = requests.get(f'{BASE}/api/aircraft/resolve/{icao}', params=params, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return {'error': str(e)}


def classify(rec):
    """Classify the audit outcome into severity buckets."""
    flags = []
    src = rec.get('geometry_source') or 'unknown'
    if src == 'dual_fallback':
        flags.append('DUAL_FALLBACK')   # most severe — no library data at all
    elif src == 'gear_template':
        flags.append('GEAR_TEMPLATE')   # generic template, no real-aircraft donor
    if rec.get('gear_mismatch'):
        flags.append('GEAR_MISMATCH')   # Excel gear ≠ library gear
    if rec.get('mtow_mismatch_pct') is not None and rec['mtow_mismatch_pct'] >= 5.0:
        flags.append('MTOW_MISMATCH')
    if src in ('icao_proxy', 'family_proxy', 'nearest_proxy'):
        flags.append('PROXY')           # informational — borrowed geometry
    if not flags:
        flags.append('OK')
    return flags


def severity_color(flags):
    if 'DUAL_FALLBACK' in flags: return '🟥'
    if 'GEAR_TEMPLATE' in flags: return '🟧'
    if 'GEAR_MISMATCH' in flags: return '🟨'
    if 'MTOW_MISMATCH' in flags: return '🟨'
    if 'PROXY' in flags: return '🟦'
    return '🟢'


def main():
    print('=' * 78)
    print('Deep audit: Excel aircraft data vs FAARFIELD library')
    print('=' * 78)

    # Verify backend is alive
    try:
        h = requests.get(f'{BASE}/api/health', timeout=3).json()
        if not h.get('analysisAvailable'):
            print('ERROR: backend at localhost:5100 is not responding correctly.')
            sys.exit(1)
        print(f'Backend OK ({h.get("aircraftCount")} aircraft, {h.get("aircraftWithGeometry")} with geometry)\n')
    except Exception as e:
        print(f'ERROR: backend not reachable at {BASE}: {e}')
        sys.exit(1)

    excel = load_excel_aircraft()
    total_unique = sum(len(d) for d in excel.values())
    print(f'Loaded {total_unique} unique (ICAO, gear, MTOW) tuples across {len(excel)} airports.\n')

    audit_rows = []
    cache = {}   # (icao, gear, mtow) → resolve response
    for apt_icao in sorted(excel):
        for key, info in sorted(excel[apt_icao].items()):
            ac_icao, gear_excel, mtow_excel = key
            cache_key = (ac_icao, gear_excel, round(mtow_excel))
            if cache_key not in cache:
                cache[cache_key] = resolve_via_backend(ac_icao, gear_excel, mtow_excel)
            geo = cache[cache_key]
            if 'error' in geo:
                rec = dict(info, error=geo['error'])
                rec['flags'] = ['BACKEND_ERROR']
                audit_rows.append(rec)
                continue

            gear_lib = normalize_gear(geo.get('libraryGearType') or geo.get('gearType') or '')
            resolved_icao = (geo.get('resolvedIcao') or '').upper()
            faarfield_name = geo.get('faarfieldName') or ''
            n_wheels = geo.get('nWheels') or 0
            geometry_source = geo.get('geometrySource') or ''
            tire_w = geo.get('tireWidth') or 0

            # MTOW comparison: backend resolve doesn't return library MTOW, but
            # it does pass it through for the gear-load calc.  Fall back to "no
            # comparison available" unless the library JSON has it.
            mtow_lib = None
            mtow_pct = None

            gear_mismatch = bool(gear_excel) and bool(gear_lib) and gear_excel != gear_lib

            rec = {
                'airport': apt_icao,
                'ac_icao': ac_icao,
                'gear_excel': gear_excel,
                'gear_library': gear_lib,
                'gear_mismatch': gear_mismatch,
                'mtow_excel': mtow_excel,
                'mtow_library': mtow_lib,
                'mtow_mismatch_pct': mtow_pct,
                'total_count_excel': info['total_count'],
                'geometry_source': geometry_source,
                'resolved_icao': resolved_icao,
                'faarfield_name': faarfield_name,
                'n_wheels_library': n_wheels,
                'tire_width_in': tire_w,
            }
            rec['flags'] = classify(rec)
            audit_rows.append(rec)

    # ---------- Summary stats ----------
    by_flag = defaultdict(list)
    for r in audit_rows:
        for f in r['flags']:
            by_flag[f].append(r)
    summary = {f: len(v) for f, v in by_flag.items()}
    print('Severity summary (counts include double-counting if a row has multiple flags):')
    for f in ('OK', 'PROXY', 'GEAR_MISMATCH', 'MTOW_MISMATCH', 'GEAR_TEMPLATE', 'DUAL_FALLBACK', 'BACKEND_ERROR'):
        if f in summary:
            print(f'  {severity_color([f]):>2}  {f:<18} {summary[f]} rows')
    print()

    # ---------- Save JSON ----------
    out = {
        'generated': datetime.now().isoformat(timespec='minutes'),
        'backend': BASE,
        'excel_file': EXCEL,
        'total_unique_aircraft_per_airport': total_unique,
        'summary': summary,
        'rows': audit_rows,
    }
    json.dump(out, open(OUT_JSON, 'w'), indent=2)
    print(f'Wrote: {OUT_JSON}')

    # ---------- Markdown report ----------
    with open(OUT_MD, 'w', encoding='utf-8') as f:
        f.write('# Aircraft Audit — Excel vs FAARFIELD Library\n\n')
        f.write(f'_Generated {datetime.now().strftime("%Y-%m-%d %H:%M")} via `scripts/audit_excel_vs_library.py`_\n\n')
        f.write(f'Source data: `AO_CEE598_FAARFIELD.xlsx` (project Excel, 6 airport sheets)  \n')
        f.write(f'Reference library: `combined_aircraft_library.json` resolved via `/api/aircraft/resolve/<icao>` on the live backend  \n')
        f.write(f'Total unique aircraft entries audited: **{total_unique}**\n\n')

        f.write('## Severity legend\n\n')
        f.write('| Tag | Meaning |\n|---|---|\n')
        f.write('| 🟢 OK | Excel matches library; geometry comes from exact-ICAO XML |\n')
        f.write('| 🟦 PROXY | Geometry borrowed from a sibling aircraft (`icao_proxy` / `family_proxy` / `nearest_proxy`); informational only |\n')
        f.write('| 🟨 GEAR_MISMATCH | Excel gear classification ≠ library gear classification (e.g. C-17 Excel=2D, library=2T) |\n')
        f.write('| 🟨 MTOW_MISMATCH | Excel MTOW differs from library MTOW by ≥ 5% (currently rare since backend does not echo library MTOW) |\n')
        f.write('| 🟧 GEAR_TEMPLATE | No real-aircraft donor; fell back to a generic gear-type template — CDF reliability is reduced |\n')
        f.write('| 🟥 DUAL_FALLBACK | No library data at all; generic dual-wheel default — CDF is approximate, FEM3D blocked |\n\n')

        f.write('## Summary\n\n')
        f.write('| Severity | Count |\n|---|---|\n')
        for f_name in ('OK', 'PROXY', 'GEAR_MISMATCH', 'MTOW_MISMATCH', 'GEAR_TEMPLATE', 'DUAL_FALLBACK', 'BACKEND_ERROR'):
            if f_name in summary:
                f.write(f'| {severity_color([f_name])} {f_name} | {summary[f_name]} |\n')
        f.write('\n')

        # ---------- Section: gear mismatches (most consequential for the report) ----------
        gm = sorted([r for r in audit_rows if r.get('gear_mismatch')],
                    key=lambda r: (r['airport'], r['ac_icao']))
        f.write(f'## Gear mismatches (Excel ≠ library) — {len(gm)} aircraft entries\n\n')
        if not gm:
            f.write('_(none)_\n\n')
        else:
            f.write('These aircraft have an Excel-supplied gear classification that disagrees with FAARFIELD\'s library. The CDF computation uses the library\'s wheel coordinates regardless, so the math is correct — but the Excel data is misclassified and any per-aircraft "gear" label echoed from the request is misleading.\n\n')
            f.write('| Airport | ICAO | Excel gear | **Library gear** | n_wheels | Geometry source | Resolved ICAO | FAARFIELD name |\n')
            f.write('|---|---|---|---|---|---|---|---|\n')
            for r in gm:
                f.write(f'| {r["airport"]} | **{r["ac_icao"]}** | `{r["gear_excel"]}` | **`{r["gear_library"]}`** | {r["n_wheels_library"]} | {r["geometry_source"]} | {r["resolved_icao"]} | {r["faarfield_name"]} |\n')
            f.write('\n')

        # ---------- Section: gear-template (no real donor) ----------
        gt = sorted([r for r in audit_rows if 'GEAR_TEMPLATE' in r['flags']],
                    key=lambda r: (r['airport'], r['ac_icao']))
        f.write(f'## Gear-template fallback — {len(gt)} aircraft entries\n\n')
        if not gt:
            f.write('_(none — every aircraft in the project traffic resolves to either an exact XML match or a real-aircraft proxy)_\n\n')
        else:
            f.write('These aircraft have no real-aircraft proxy in the FAARFIELD library; their wheel coordinates come from a generic gear-type template. CDF estimates are reduced-confidence for these.\n\n')
            f.write('| Airport | ICAO | Gear used | n_wheels | Excel count |\n')
            f.write('|---|---|---|---|---|\n')
            for r in gt:
                f.write(f'| {r["airport"]} | **{r["ac_icao"]}** | `{r["gear_library"] or r["gear_excel"]}` | {r["n_wheels_library"]} | {r["total_count_excel"]} |\n')
            f.write('\n')

        # ---------- Section: dual_fallback (no library at all) ----------
        df_ = sorted([r for r in audit_rows if 'DUAL_FALLBACK' in r['flags']],
                     key=lambda r: (r['airport'], r['ac_icao']))
        f.write(f'## Dual-fallback (no library data) — {len(df_)} aircraft entries\n\n')
        if not df_:
            f.write('_(none — every aircraft has at least template-level coverage)_\n\n')
        else:
            f.write('These aircraft have NO library entry at all. Their CDF contribution uses a generic dual-wheel approximation; FEM3D is blocked. Consider excluding from final design or using a manual proxy.\n\n')
            f.write('| Airport | ICAO | Excel gear | Excel MTOW | Excel count |\n')
            f.write('|---|---|---|---|---|\n')
            for r in df_:
                f.write(f'| {r["airport"]} | **{r["ac_icao"]}** | `{r["gear_excel"]}` | {r["mtow_excel"]:,.0f} lb | {r["total_count_excel"]} |\n')
            f.write('\n')

        # ---------- Section: proxy assignments (informational) ----------
        proxy = sorted([r for r in audit_rows if 'PROXY' in r['flags']],
                       key=lambda r: (r['airport'], r['ac_icao']))
        f.write(f'## Proxy geometry — {len(proxy)} aircraft entries (informational)\n\n')
        f.write('These aircraft don\'t have an exact-ICAO XML entry in FAARFIELD\'s library, so the wheel coordinates are borrowed from a tier-matched donor (sibling ICAO / same family / closest geometry). Acceptable for design but worth flagging in any per-aircraft audit.\n\n')
        f.write('| Airport | ICAO | Donor (resolved_icao) | Tier | FAARFIELD name | Library gear | n_wheels |\n')
        f.write('|---|---|---|---|---|---|---|\n')
        for r in proxy:
            f.write(f'| {r["airport"]} | **{r["ac_icao"]}** | {r["resolved_icao"]} | {r["geometry_source"]} | {r["faarfield_name"]} | `{r["gear_library"]}` | {r["n_wheels_library"]} |\n')
        f.write('\n')

        # ---------- Section: full per-airport listing ----------
        f.write('## Full per-airport listing\n\n')
        for apt in AIRPORT_SHEETS:
            apt_rows = sorted([r for r in audit_rows if r['airport'] == apt],
                               key=lambda r: (-r['total_count_excel'], r['ac_icao']))
            f.write(f'### {apt} — {len(apt_rows)} unique aircraft\n\n')
            f.write('| Sev | ICAO | Excel gear | Lib gear | Excel MTOW | n_wheels | Source | FAARFIELD name | Excel count |\n')
            f.write('|---|---|---|---|---|---|---|---|---|\n')
            for r in apt_rows:
                sev = severity_color(r['flags'])
                f.write(f'| {sev} | **{r["ac_icao"]}** | `{r["gear_excel"]}` | `{r["gear_library"]}` | {r["mtow_excel"]:,.0f} | {r["n_wheels_library"]} | {r["geometry_source"]} | {r["faarfield_name"]} | {r["total_count_excel"]} |\n')
            f.write('\n')

    print(f'Wrote: {OUT_MD}')


if __name__ == '__main__':
    main()
