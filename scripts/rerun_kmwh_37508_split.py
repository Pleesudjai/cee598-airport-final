"""Split KMWH 37508's 94-aircraft traffic into 2 halves, run CDF on each with
FEM enabled, then merge linearly.

CDF is a linear sum over aircraft (each aircraft contributes independently):
    CDF_total(offset) = Σ_i designDeps_i · C/P_i(offset) / Nf_i
so splitting into 2 batches and summing the per-offset profiles yields
exactly the full-batch CDF.  Same trick used by FAARFIELD's internal
`LeafCDFRigid_2014` per-aircraft loop.

The backend has a bug where heavy FEM workloads corrupt per-aircraft
metadata and sometimes force a connection reset.  KMWH 37508 has 94
aircraft including many triple-tandem widebodies (B779, B77W, B748)
that hit FEM hardest; running as a single batch has failed 3 times.
Split strategy: alternate heaviest↔lightest so each half has a mixed
load profile.  Backend restarted fresh before each half.

Writes the merged record into cdf_results.json (and the 2 sister paths)
with a diagnostic note recording that the CDF profile came from a
merged 2-half run.
"""
import json
import os
import shutil
import sys
import time
import importlib.util
import ast

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS = os.path.join(PROJECT, 'results')
WEB_DATA = r'c:/temp/aeropave/src/data'
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

import pandas as pd
import requests

BASE = 'http://localhost:5100'
BACKEND_EXE = r'c:/temp/aeropave/faarfield-api/bin/x86/Release/FaarfieldApi.exe'
MAIN_PATH = os.path.join(RESULTS, 'cdf_results.json')
WEB_PATH = os.path.join(WEB_DATA, 'cdf_results.json')
SISTER_PATH = os.path.join(RESULTS, 'cdf_results_sci_history.json')


def restart_backend():
    print('  [backend] killing...', flush=True)
    os.system('taskkill /IM FaarfieldApi.exe /F >NUL 2>&1')
    time.sleep(3)
    os.system(f'start /B "" "{BACKEND_EXE}"')
    for i in range(30):
        try:
            requests.get(f'{BASE}/api/health', timeout=2).raise_for_status()
            print(f'  [backend] up after {i+1} sec', flush=True)
            return True
        except Exception:
            time.sleep(1)
    return False


def load_kmwh_traffic():
    """Aggregate KMWH Traffic1863 sheet into unique aircraft records."""
    df = pd.read_excel(EXCEL, sheet_name='Traffic1863', header=0)
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


def alternating_split(aircraft_list):
    """Sort by MTOW desc, then alternate into two halves.
    Heaviest → half A; 2nd → half B; 3rd → half A; etc."""
    by_mtow = sorted(aircraft_list, key=lambda a: -(a['mtow'] or 0))
    half_a = by_mtow[0::2]
    half_b = by_mtow[1::2]
    return half_a, half_b


def merge_responses(resp_a, resp_b):
    """Merge two CDF responses linearly (per-offset element-wise sum)."""
    # Per-offset arrays: cdf_profile_ac, _sub, _pcc, _total
    def arr_sum(a, b):
        if not a: return b or []
        if not b: return a or []
        if len(a) != len(b): return a
        return [a[i] + b[i] for i in range(len(a))]

    offsets = resp_a.get('cdfProfileOffsetsIn') or resp_b.get('cdfProfileOffsetsIn') or []
    cdf_ac  = arr_sum(resp_a.get('cdfProfileAc'),  resp_b.get('cdfProfileAc'))
    cdf_sub = arr_sum(resp_a.get('cdfProfileSub'), resp_b.get('cdfProfileSub'))
    cdf_pcc = arr_sum(resp_a.get('cdfProfilePcc'), resp_b.get('cdfProfilePcc'))
    cdf_total = [max(ac, sub, pcc) for ac, sub, pcc in zip(cdf_ac, cdf_sub, cdf_pcc)]

    # Section-level sums
    merged = {
        'cdf_ac':       (resp_a.get('cdf_ac')  or 0) + (resp_b.get('cdf_ac')  or 0),
        'cdf_sub':      (resp_a.get('cdf_sub') or 0) + (resp_b.get('cdf_sub') or 0),
        'cdf_pcc':      (resp_a.get('cdf_pcc') or 0) + (resp_b.get('cdf_pcc') or 0),
        'cdfProfileOffsetsIn': offsets,
        'cdfProfileAc':  cdf_ac,
        'cdfProfileSub': cdf_sub,
        'cdfProfilePcc': cdf_pcc,
        'cdfProfileTotal': cdf_total,
    }
    merged['cdf_max'] = max(merged['cdf_ac'], merged['cdf_sub'], merged['cdf_pcc'])
    # Controlling mode
    if merged['cdf_pcc'] >= max(merged['cdf_ac'], merged['cdf_sub']):
        merged['controlling'] = 'PCC Fatigue'
    elif merged['cdf_ac'] >= merged['cdf_sub']:
        merged['controlling'] = 'AC Fatigue'
    else:
        merged['controlling'] = 'Subgrade Rutting'
    # Control offset = argmax of cdf_profile_total
    if cdf_total and offsets:
        best_i = max(range(len(cdf_total)), key=lambda i: cdf_total[i])
        merged['controlOffsetIn'] = offsets[best_i]
    else:
        merged['controlOffsetIn'] = None
    merged['adequate'] = merged['cdf_max'] <= 1.0

    # Merge per-aircraft
    per_ac = list(resp_a.get('perAircraft') or []) + list(resp_b.get('perAircraft') or [])
    per_ac.sort(key=lambda a: -(a.get('cdfContribution', a.get('cdf', 0))))
    merged['perAircraft'] = per_ac

    # FEM3D summary (sum the counts, take max ratio)
    fa = (resp_a.get('femAircraftCount') or 0) + (resp_b.get('femAircraftCount') or 0)
    merged['femUsed']             = resp_a.get('femUsed') or resp_b.get('femUsed') or False
    merged['femAircraftCount']    = fa
    merged['femComputeTimeMs']    = (resp_a.get('femComputeTimeMs') or 0) + (resp_b.get('femComputeTimeMs') or 0)
    if (resp_a.get('femMaxRatio') or 0) >= (resp_b.get('femMaxRatio') or 0):
        merged['femMaxRatio']         = resp_a.get('femMaxRatio') or 0
        merged['femMaxRatioAircraft'] = resp_a.get('femMaxRatioAircraft')
    else:
        merged['femMaxRatio']         = resp_b.get('femMaxRatio') or 0
        merged['femMaxRatioAircraft'] = resp_b.get('femMaxRatioAircraft')
    return merged


def build_top10(per_ac_sorted):
    return [{
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


def main():
    target = ('KMWH', '37508')
    apt = next(a for a in AIRPORTS if a['icao'] == target[0])
    sec = next(s for s in apt['sections'] if s['id'] == target[1])
    hist = HISTORY.get(target, {})
    pcc_age = 2026 - hist.get('pcc', 2026)
    mor = mor_for_pcc_age(pcc_age)

    traffic_df = load_kmwh_traffic()
    aircraft = build_aircraft(traffic_df, annual_scale=1.0)
    print(f'Target: {target[0]} {target[1]}  ({sec["use"]})')
    print(f'Aircraft total (>= 6000 lb): {len(aircraft)}')
    print(f'MOR = {mor} psi  |  SCI = 80  |  growth = {apt["growth"]*100:+.3f}%/yr')

    half_a, half_b = alternating_split(aircraft)
    print(f'Split:  half A = {len(half_a)} aircraft   half B = {len(half_b)} aircraft')

    # --- Run half A ---
    print('\n--- Half A ---')
    if not restart_backend():
        print('Backend failed to restart; aborting'); sys.exit(1)
    t0 = time.time()
    try:
        resp_a = post_cdf(sec['layers'], sec['subgrade'], half_a,
                          growth=apt['growth'], sci=80, flex_str=mor,
                          design_type='FlexOnRigid', use_fem=True)
    except Exception as e:
        print(f'Half A FAILED: {e}'); sys.exit(2)
    print(f'Half A done in {time.time() - t0:.0f} s  CDF={resp_a["cdf_max"]:.3e}')

    # --- Run half B ---
    print('\n--- Half B ---')
    if not restart_backend():
        print('Backend failed to restart; aborting'); sys.exit(1)
    t0 = time.time()
    try:
        resp_b = post_cdf(sec['layers'], sec['subgrade'], half_b,
                          growth=apt['growth'], sci=80, flex_str=mor,
                          design_type='FlexOnRigid', use_fem=True)
    except Exception as e:
        print(f'Half B FAILED: {e}'); sys.exit(3)
    print(f'Half B done in {time.time() - t0:.0f} s  CDF={resp_b["cdf_max"]:.3e}')

    # --- Merge ---
    print('\n--- Merging (linear per-offset sum) ---')
    merged = merge_responses(resp_a, resp_b)
    top10_full = build_top10(merged['perAircraft'])
    per_ac_sorted = merged['perAircraft']
    top_legacy = [{
        'ac': a.get('icao'), 'mtow': a.get('mtow'), 'gear': a.get('gear'),
        'cdf_total': a.get('cdfContribution', a.get('cdf', 0)),
        'cdf_contribution': a.get('cdfContribution', a.get('cdf', 0)),
        'cdf_max_aircraft': a.get('cdfMax', a.get('cdfContribution', a.get('cdf', 0))),
        'wheelSource': 'xml', 'wheelSourceNote': '',
    } for a in per_ac_sorted[:20]]

    rec = {
        'icao': target[0], 'airport': apt['name'],
        'section_id': target[1], 'use': sec['use'], 'desc': sec['desc'],
        'subgrade': apt['subgrade_desc'], 'growth': apt['growth'],
        'cdf_ac': merged['cdf_ac'], 'cdf_sub': merged['cdf_sub'],
        'cdf_pcc': merged['cdf_pcc'], 'cdf_max': merged['cdf_max'],
        'controlling': merged['controlling'],
        'control_offset_in': merged['controlOffsetIn'],
        'adequate': bool(merged['adequate']),
        'top_aircraft': top_legacy,
        'top_aircraft_full': top10_full,
        'cdf_profile_offsets_in': merged['cdfProfileOffsetsIn'],
        'cdf_profile_ac':  merged['cdfProfileAc'],
        'cdf_profile_sub': merged['cdfProfileSub'],
        'cdf_profile_pcc': merged['cdfProfilePcc'],
        'cdf_profile_total': merged['cdfProfileTotal'],
        'fem_used': merged['femUsed'],
        'fem_aircraft_count': merged['femAircraftCount'],
        'fem_compute_time_ms': merged['femComputeTimeMs'],
        'fem_max_ratio': merged['femMaxRatio'],
        'fem_max_ratio_aircraft': merged['femMaxRatioAircraft'],
        'engine': 'FAARFIELD_desktop_parity_split_merge',
        'aircraftResolvedBy': 'backend_library',
        'simplifiedGearCount': 0,
        'sci': 80, 'mor_psi': mor, 'pcc_age_yrs': pcc_age,
        'pcc_year': hist.get('pcc'), 'overlay_year': hist.get('overlay'),
        'pre_overlay_cdfu': None,
        'rerun_method': '2-half-alternating-split',
    }
    print(f'\nMerged CDF_max = {rec["cdf_max"]:.3e}   ({rec["controlling"]}   peak offset {rec["control_offset_in"]}")')
    print(f'cdf_profile len = {len(rec["cdf_profile_offsets_in"])}')
    print(f'top_aircraft_full len = {len(rec["top_aircraft_full"])}')

    # --- Merge into cdf_results.json ---
    data = json.load(open(MAIN_PATH))
    data = [r for r in data if not (r['icao'] == target[0] and r['section_id'] == target[1])]
    data.append(rec)
    project_order = ['KLHX', 'KPUB', 'KMQJ', 'KCIU', 'KOTM', 'KMWH']
    data.sort(key=lambda r: (project_order.index(r['icao']) if r['icao'] in project_order else 99,
                             str(r['section_id'])))
    json.dump(data, open(MAIN_PATH, 'w'), indent=2)
    shutil.copy2(MAIN_PATH, WEB_PATH)
    shutil.copy2(MAIN_PATH, SISTER_PATH)
    print(f'Merged into {MAIN_PATH} + website copy + sister sci_history')


if __name__ == '__main__':
    main()
