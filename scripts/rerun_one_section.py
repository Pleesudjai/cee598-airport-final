"""Re-run a single project section against the live backend and merge the
result into results/cdf_results.json (preserving every other section).

Used to recover from individual-section timeouts in the main 2.5-hr batch
without forcing a full re-run.

Usage (Windows):
  py scripts/rerun_one_section.py KMQJ 8881
"""
import json
import os
import sys
import time
import importlib.util
import ast

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(PROJECT, 'scripts'))

# Pull AIRPORTS, HISTORY, post_cdf, build_aircraft, mor_for_pcc_age from the batch script
spec_path = os.path.join(PROJECT, 'scripts', 'all_airports_cdf_with_sci_history.py')
src = open(spec_path).read()
tree = ast.parse(src)
keep_names = ('mor_for_pcc_age', 'build_aircraft', 'post_cdf')
keep_assigns = ('FLEX_STR', 'AGED_MOR', 'AGED_THRESHOLD_YRS', 'DESIGN_LIFE',
                'MIN_MTOW', 'CURRENT_YEAR', 'BASE', 'PROJECT', 'EXCEL',
                'RESULTS', 'WEBSITE_DATA', 'HISTORY', 'AIRPORTS')
keep = ast.Module(body=[
    n for n in tree.body
    if (isinstance(n, ast.FunctionDef) and n.name in keep_names)
       or (isinstance(n, ast.Assign)
           and any(isinstance(t, ast.Name) and t.id in keep_assigns for t in n.targets))
       or isinstance(n, (ast.Import, ast.ImportFrom))
], type_ignores=[])
ns = {'__name__': '__import__', '__file__': spec_path}
exec(compile(keep, spec_path, 'exec'), ns)

AIRPORTS = ns['AIRPORTS']
HISTORY = ns['HISTORY']
post_cdf = ns['post_cdf']
build_aircraft = ns['build_aircraft']
mor_for_pcc_age = ns['mor_for_pcc_age']
EXCEL = ns['EXCEL']
RESULTS = ns['RESULTS']
WEBSITE_DATA = ns['WEBSITE_DATA']

import pandas as pd
import shutil


def load_traffic_local(sheet, _years_span):
    df = pd.read_excel(EXCEL, sheet_name=sheet, header=0)
    cols = list(df.columns)
    df = df.dropna(subset=[cols[0], cols[5]])
    grouped = df.groupby(cols[0]).agg(
        MTOW=(cols[5], 'first'),
        Gear=(cols[6], 'first'),
        TotalCount=(cols[7], 'sum'),
        Years=(cols[1], 'nunique'),
    ).reset_index().rename(columns={cols[0]: 'Type'})
    grouped['AnnualDeps'] = grouped['TotalCount'] / grouped['Years'].clip(lower=1)
    return grouped[['Type', 'MTOW', 'Gear', 'AnnualDeps']]


def main():
    if len(sys.argv) != 3:
        print('Usage: py scripts/rerun_one_section.py <ICAO> <SECTION_ID>')
        sys.exit(2)
    target_icao, target_sid = sys.argv[1].upper(), sys.argv[2]

    # Locate section in AIRPORTS dict
    apt = next((a for a in AIRPORTS if a['icao'] == target_icao), None)
    if apt is None:
        print(f'ERROR: airport {target_icao} not in AIRPORTS table')
        sys.exit(1)
    sec = next((s for s in apt['sections'] if s['id'] == target_sid), None)
    if sec is None:
        print(f'ERROR: section {target_sid} not in {target_icao}')
        sys.exit(1)

    hist = HISTORY.get((target_icao, target_sid), {})
    pcc_age = (2026 - hist['pcc']) if hist.get('pcc') else None
    mor = mor_for_pcc_age(pcc_age)

    print(f'Re-running {target_icao} {target_sid}  ({sec["use"]})')
    print(f'  Structure:    {sec["desc"]}')
    print(f'  Subgrade:     {apt["subgrade_desc"]}')
    print(f'  PCC age:      {pcc_age} yr   ->   MOR = {mor} psi')
    print(f'  Growth:       {apt["growth"]*100:+.3f} %/yr')
    print(f'  SCI:          80')
    print(f'  useFem3d:     True')

    traffic_df = load_traffic_local(apt['sheet'], apt['years_span'])
    aircraft = build_aircraft(traffic_df, annual_scale=1.0)
    print(f'  Aircraft:     {len(aircraft)} (>= 6,000 lb filter)')
    print()
    print('  Calling backend (this may take 10-25 minutes with FEM)...', flush=True)

    t0 = time.time()
    resp = post_cdf(sec['layers'], sec['subgrade'], aircraft,
                    growth=apt['growth'], sci=80, flex_str=mor,
                    design_type='FlexOnRigid', use_fem=True)
    dt = time.time() - t0
    print(f'  Done in {dt:.0f} s.  CDF_max = {resp["cdf_max"]:.4e}  ({resp["controlling"]})')

    # Build the per-section record matching the batch-script schema
    per_ac = resp.get('perAircraft') or []
    per_ac_sorted = sorted(per_ac, key=lambda a: a.get('cdfContribution', a.get('cdf', 0)), reverse=True)
    top = [{
        'ac': a['icao'], 'mtow': a['mtow'], 'gear': a['gear'],
        'cdf_total': a.get('cdfContribution', a['cdf']),
        'cdf_contribution': a.get('cdfContribution', a['cdf']),
        'cdf_max_aircraft': a.get('cdfMax', a.get('cdfContribution', a['cdf'])),
        'wheelSource': 'xml',
        'wheelSourceNote': '',
    } for a in per_ac_sorted[:20]]
    top10_full = [{
        'icao': a.get('icao'), 'name': a.get('name'),
        'mtow': a.get('mtow'), 'gear': a.get('gear'),
        'libGear': a.get('libGear'),
        'annualDeps': a.get('annualDeps'), 'designDeps': a.get('designDeps'),
        'cdf': a.get('cdf'), 'cdfMax': a.get('cdfMax'),
        'coverageToPass': a.get('coverageToPass'),
        'leafPccStress': a.get('leafPccStress'),
        'femPccStress': a.get('femPccStress'),
        'effectivePccStress': a.get('effectivePccStress'),
        'femRatio': a.get('femRatio'),
        'geometrySource': a.get('geometrySource'),
        'nWheels': a.get('nWheels'),
        'tireWidth': a.get('tireWidth'),
        'wheelX': a.get('wheelX'),
        'wheelY': a.get('wheelY'),
        'cdfProfile': a.get('cdfProfile'),
    } for a in per_ac_sorted[:10]]

    rec = {
        'icao': target_icao, 'airport': apt['name'],
        'section_id': target_sid, 'use': sec['use'], 'desc': sec['desc'],
        'subgrade': apt['subgrade_desc'], 'growth': apt['growth'],
        'cdf_ac': resp['cdf_ac'], 'cdf_sub': resp['cdf_sub'],
        'cdf_pcc': resp['cdf_pcc'], 'cdf_max': resp['cdf_max'],
        'controlling': resp['controlling'], 'control_offset_in': resp.get('controlOffsetIn'),
        'adequate': bool(resp['adequate']),
        'top_aircraft': top,
        'top_aircraft_full': top10_full,
        'cdf_profile_offsets_in': resp.get('cdfProfileOffsetsIn'),
        'cdf_profile_ac':         resp.get('cdfProfileAc'),
        'cdf_profile_sub':        resp.get('cdfProfileSub'),
        'cdf_profile_pcc':        resp.get('cdfProfilePcc'),
        'cdf_profile_total':      resp.get('cdfProfileTotal'),
        'fem_used':               resp.get('femUsed'),
        'fem_aircraft_count':     resp.get('femAircraftCount'),
        'fem_compute_time_ms':    resp.get('femComputeTimeMs'),
        'fem_max_ratio':          resp.get('femMaxRatio'),
        'fem_max_ratio_aircraft': resp.get('femMaxRatioAircraft'),
        'engine': 'FAARFIELD_desktop_parity',
        'aircraftResolvedBy': 'backend_library',
        'simplifiedGearCount': 0,
        'sci': 80,
        'mor_psi': mor,
        'pcc_age_yrs': pcc_age,
        'pcc_year': hist.get('pcc'),
        'overlay_year': hist.get('overlay'),
        'pre_overlay_cdfu': None,    # not recomputed in this single-section rerun
    }

    # Merge into cdf_results.json
    main_path = os.path.join(RESULTS, 'cdf_results.json')
    web_path = os.path.join(WEBSITE_DATA, 'cdf_results.json')
    data = json.load(open(main_path))
    # Remove any stale entry, append fresh
    data = [r for r in data if not (r['icao'] == target_icao and r['section_id'] == target_sid)]
    data.append(rec)

    # Re-sort to project order (KLHX, KPUB, KMQJ, KCIU, KOTM, KMWH; section_id ascending)
    project_order = ['KLHX', 'KPUB', 'KMQJ', 'KCIU', 'KOTM', 'KMWH']
    data.sort(key=lambda r: (project_order.index(r['icao']) if r['icao'] in project_order else 99,
                             str(r['section_id'])))

    json.dump(data, open(main_path, 'w'), indent=2)
    shutil.copy2(main_path, web_path)

    # Mirror to sister files for back-compat
    shutil.copy2(main_path, os.path.join(RESULTS, 'cdf_results_sci_history.json'))

    print()
    print(f'Merged into:')
    print(f'  {main_path}')
    print(f'  {web_path}')
    print(f'  {os.path.join(RESULTS, "cdf_results_sci_history.json")}')
    over = sum(1 for r in data if r['adequate'])
    under = len(data) - over
    print(f'New verdict (all sections): {over} OVER / {under} UNDER ({len(data)} total)')


if __name__ == '__main__':
    main()
