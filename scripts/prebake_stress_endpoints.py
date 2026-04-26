"""
Pre-bake LEAF + FEM3D stress endpoints for the 13 project sections.

Spec: specs/prebake-stress-endpoints.md
Locked decisions (2026-04-26): top-5 aircraft per section, hybrid storage,
canary first on KLHX_6627, MOR/SCI structurally absent from cache key.

Outputs:
  c:/temp/aeropave/src/data/precal/index.json                  (manifest, build-time import)
  c:/temp/aeropave/public/data/precal/leaf_grid/*.json         (65 files, runtime fetch)
  c:/temp/aeropave/public/data/precal/leaf_point/*.json        (65 files, runtime fetch)
  c:/temp/aeropave/public/data/precal/fem3d_mesh/*.json        (65 files, runtime fetch)
"""

import argparse
import hashlib
import json
import os
import sys
import time
from datetime import datetime, timezone

import requests

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

import ast

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _load_airports():
    """Extract the AIRPORTS literal from all_airports_cdf_native.py without importing
    its pandas-dependent module body."""
    src_path = os.path.join(PROJECT, 'scripts', 'all_airports_cdf_native.py')
    with open(src_path, encoding='utf-8') as f:
        src = f.read()
    tree = ast.parse(src)
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for tgt in node.targets:
                if isinstance(tgt, ast.Name) and tgt.id == 'AIRPORTS':
                    return ast.literal_eval(node.value)
    raise RuntimeError('AIRPORTS literal not found in all_airports_cdf_native.py')


AIRPORTS = _load_airports()

BASE = 'http://localhost:5100'
AEROPAVE = r'c:\temp\aeropave'
SRC_PRECAL = os.path.join(AEROPAVE, 'src', 'data', 'precal')
PUB_PRECAL = os.path.join(AEROPAVE, 'public', 'data', 'precal')
RESULTS = os.path.join(PROJECT, 'results')

TOP_N = 10
GRID_POINTS = 21
PROACTIVE_RESTART_EVERY = 20
SLEEP_BETWEEN_CALLS = 2.0
FEM_SIZE_WARN_MB = 30
FEM_SIZE_HARD_MB = 50

LEAF_GRID_TIMEOUT = 120
LEAF_POINT_TIMEOUT = 60
FEM3D_TIMEOUT = 900


def log(msg):
    ts = datetime.now().strftime('%H:%M:%S')
    print(f'[{ts}] {msg}', flush=True)


def health_ok(retries=3, wait=8):
    for i in range(retries):
        try:
            r = requests.get(f'{BASE}/api/health', timeout=10)
            if r.ok:
                h = r.json()
                if all(h.get(k) for k in ('leafAvailable', 'femAvailable', 'fem3dAvailable')):
                    return True
        except Exception as e:
            log(f'  health check {i+1}/{retries} failed: {e}')
        time.sleep(wait)
    return False


def request_hash(layers, subgrade, aircraft_icao):
    payload = json.dumps({'layers': layers, 'subgrade': subgrade, 'icao': aircraft_icao}, sort_keys=True)
    return 'sha256:' + hashlib.sha256(payload.encode()).hexdigest()[:32]


def build_aircraft_payload(ac_full):
    """Mirror nativeStressClient.js aircraft block. Defaults match the frontend exactly."""
    icao = ac_full.get('icao', '')
    return {
        'name': ac_full.get('name', icao),
        'icao': icao,
        'gear': ac_full.get('libGear') or ac_full.get('gear', ''),
        'mtow': ac_full.get('mtow', 0),
        'gearLoad': (ac_full.get('mtow', 50000) or 50000) * 0.95,
        'nTires': ac_full.get('nWheels', 2) // 2 if ac_full.get('nWheels') else 2,
        'tirePressure': 200,
        'tireSpacingIn': 34,
    }


def compute_grid_extent(ac_full, default=120):
    """Mirror the frontend's auto-scale: 40% margin past max wheel coord,
    floored at 120". Keeps wide-body grids (e.g., B772 ±243" -> 350") sane
    while still showing context past tiny GA gear footprints."""
    xs = ac_full.get('wheelX') or []
    ys = ac_full.get('wheelY') or []
    if not xs or not ys:
        return default
    max_x = max(abs(v) for v in xs)
    max_y = max(abs(v) for v in ys)
    import math
    computed = math.ceil((max(max_x, max_y) * 1.4) / 10) * 10
    return max(default, computed)


def post_json(url, body, timeout, label):
    """POST with retry on connection-reset (the WinError 10054 idiom from rerun_kmwh)."""
    for attempt in range(2):
        try:
            r = requests.post(url, json=body, timeout=timeout)
            if r.ok:
                return r.json(), None
            return None, f'HTTP {r.status_code}: {r.text[:200]}'
        except requests.exceptions.ConnectionError as e:
            log(f'  {label} ConnectionError attempt {attempt+1}: {e}')
            if attempt == 0:
                if not health_ok():
                    return None, 'backend unhealthy after connection reset'
                time.sleep(3)
        except Exception as e:
            return None, f'{type(e).__name__}: {e}'
    return None, 'connection reset persisted'


def bake_one(section, aircraft_full, paths):
    """Bake all three endpoints for one (section, aircraft) pair. Returns dict of statuses + sizes."""
    layers = section['layers']
    subgrade = section['subgrade']
    ac = build_aircraft_payload(aircraft_full)
    rh = request_hash(layers, subgrade, ac['icao'])

    eval_depth = sum(L['h'] for L in layers if 'AC' in L.get('type', ''))
    total_slab = sum(L['h'] for L in layers)
    eval_depths = [round(total_slab * i / 40, 3) for i in range(41)]

    meta = {'_meta': {'requestHash': rh, 'sectionKey': paths['key'],
                      'aircraftIcao': ac['icao'], 'bakedAt': datetime.now(timezone.utc).isoformat()}}
    out = {'leafGrid': None, 'leafPoint': None, 'fem3dMesh': None}

    # A — LEAF grid
    grid_extent = compute_grid_extent(aircraft_full)
    body = {'layers': layers, 'subgrade': subgrade, 'aircraft': ac,
            'evalDepthIn': eval_depth, 'gridExtentIn': grid_extent, 'gridPoints': GRID_POINTS}
    log(f'  POST /api/leaf/grid  evalDepth={eval_depth}"  gridExtent={grid_extent}"  gridPoints={GRID_POINTS}')
    data, err = post_json(f'{BASE}/api/leaf/grid', body, LEAF_GRID_TIMEOUT, 'leafGrid')
    if data is not None:
        with open(paths['leafGrid'], 'w') as f:
            json.dump({**data, **meta}, f)
        out['leafGrid'] = os.path.getsize(paths['leafGrid'])
    else:
        with open(paths['leafGrid'], 'w') as f:
            json.dump({**meta, '_meta': {**meta['_meta'], 'skipped': err}}, f)
        out['leafGrid'] = os.path.getsize(paths['leafGrid'])
        log(f'    SKIPPED: {err}')
    time.sleep(SLEEP_BETWEEN_CALLS)

    # B — LEAF point
    body = {'layers': layers, 'subgrade': subgrade, 'aircraft': ac,
            'evalDepths': eval_depths, 'evalX': 0, 'evalY': 0}
    log(f'  POST /api/leaf/point evalDepths=[0..{total_slab}"]  41pts')
    data, err = post_json(f'{BASE}/api/leaf/point', body, LEAF_POINT_TIMEOUT, 'leafPoint')
    if data is not None:
        with open(paths['leafPoint'], 'w') as f:
            json.dump({**data, **meta}, f)
        out['leafPoint'] = os.path.getsize(paths['leafPoint'])
    else:
        with open(paths['leafPoint'], 'w') as f:
            json.dump({**meta, '_meta': {**meta['_meta'], 'skipped': err}}, f)
        out['leafPoint'] = os.path.getsize(paths['leafPoint'])
        log(f'    SKIPPED: {err}')
    time.sleep(SLEEP_BETWEEN_CALLS)

    # C — FEM3D mesh (heaviest)
    body = {'layers': [{'type': L['type'], 'h': L['h'], 'E': L['E'], 'nu': L['nu']} for L in layers],
            'subgrade': subgrade, 'aircraft': ac,
            'highDetail': False, 'filterCoarse': True,
            'includeStressField': True, 'stressAggregation': 'mean'}
    log(f'  POST /api/fem3d/mesh includeStressField=true  filterCoarse=true')
    t0 = time.time()
    data, err = post_json(f'{BASE}/api/fem3d/mesh', body, FEM3D_TIMEOUT, 'fem3dMesh')
    log(f'    fem3d/mesh elapsed: {time.time()-t0:.1f}s')
    if data is not None:
        with open(paths['fem3dMesh'], 'w') as f:
            json.dump({**data, **meta}, f)
        out['fem3dMesh'] = os.path.getsize(paths['fem3dMesh'])
        size_mb = out['fem3dMesh'] / 1e6
        if size_mb > FEM_SIZE_HARD_MB:
            log(f'    WARNING: fem3d/mesh = {size_mb:.1f} MB > {FEM_SIZE_HARD_MB} MB hard limit')
        elif size_mb > FEM_SIZE_WARN_MB:
            log(f'    NOTE: fem3d/mesh = {size_mb:.1f} MB > {FEM_SIZE_WARN_MB} MB warn threshold')
    else:
        with open(paths['fem3dMesh'], 'w') as f:
            json.dump({**meta, '_meta': {**meta['_meta'], 'skipped': err}}, f)
        out['fem3dMesh'] = os.path.getsize(paths['fem3dMesh'])
        log(f'    SKIPPED: {err}')
    time.sleep(SLEEP_BETWEEN_CALLS)

    return out, rh


def get_section_aircraft_list(icao, section_id, top_n=TOP_N):
    """Read top-N aircraft from cdf_results.json for a given section."""
    cdf_path = os.path.join(RESULTS, 'cdf_results.json')
    with open(cdf_path) as f:
        data = json.load(f)
    for sec in data:
        if sec['icao'] == icao and str(sec['section_id']) == str(section_id):
            return sec.get('top_aircraft_full', [])[:top_n]
    return []


def iter_section_jobs():
    """Yield (section, aircraft_list) for all 13 sections."""
    for ap in AIRPORTS:
        for sec in ap['sections']:
            ac_list = get_section_aircraft_list(ap['icao'], sec['id'])
            section = {'icao': ap['icao'], 'airport': ap['name'],
                       'section_id': sec['id'], 'use': sec.get('use', ''),
                       'desc': sec.get('desc', ''),
                       'layers': sec['layers'], 'subgrade': sec['subgrade']}
            yield section, ac_list


def make_paths(section_key, ac_icao):
    return {
        'key': section_key,
        'leafGrid': os.path.join(PUB_PRECAL, 'leaf_grid', f'{section_key}_{ac_icao}.json'),
        'leafPoint': os.path.join(PUB_PRECAL, 'leaf_point', f'{section_key}_{ac_icao}.json'),
        'fem3dMesh': os.path.join(PUB_PRECAL, 'fem3d_mesh', f'{section_key}_{ac_icao}.json'),
    }


def ensure_dirs():
    for sub in ('leaf_grid', 'leaf_point', 'fem3d_mesh'):
        os.makedirs(os.path.join(PUB_PRECAL, sub), exist_ok=True)
    os.makedirs(SRC_PRECAL, exist_ok=True)


def manifest_entry(section, ac_full, rank, sizes, rh):
    sk = f"{section['icao']}_{section['section_id']}"
    icao = ac_full.get('icao', '')
    return {
        'icao': icao, 'rank': rank, 'isControlling': rank == 1,
        'cdfContribution': ac_full.get('cdf', None),
        'leafGridPath': f'/data/precal/leaf_grid/{sk}_{icao}.json',
        'leafPointPath': f'/data/precal/leaf_point/{sk}_{icao}.json',
        'fem3dMeshPath': f'/data/precal/fem3d_mesh/{sk}_{icao}.json',
        'requestHash': rh,
        'sizes': {k: (sizes.get(k) or 0) for k in ('leafGrid', 'leafPoint', 'fem3dMesh')},
    }


def write_manifest(sections_manifest):
    manifest = {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'backendVersion': '0.3.0',
        'topN': TOP_N,
        'gridPoints': GRID_POINTS,
        'sections': sections_manifest,
    }
    path = os.path.join(SRC_PRECAL, 'index.json')
    with open(path, 'w') as f:
        json.dump(manifest, f, indent=2)
    log(f'manifest written: {path}')


def run_canary():
    log('=== CANARY: KLHX_6627 controlling aircraft ===')
    if not health_ok():
        log('FATAL: backend unhealthy. Start FaarfieldApi.exe and retry.')
        sys.exit(2)
    ensure_dirs()
    klhx_6627 = next((s for ap in AIRPORTS if ap['icao'] == 'KLHX'
                      for s in ap['sections'] if s['id'] == '6627'), None)
    section = {'icao': 'KLHX', 'airport': 'La Junta Municipal',
               'section_id': '6627', 'use': klhx_6627.get('use', ''),
               'desc': klhx_6627.get('desc', ''),
               'layers': klhx_6627['layers'], 'subgrade': klhx_6627['subgrade']}
    ac_list = get_section_aircraft_list('KLHX', '6627', top_n=1)
    if not ac_list:
        log('FATAL: no top_aircraft_full for KLHX_6627.')
        sys.exit(2)
    ac = ac_list[0]
    log(f"controlling aircraft: {ac['icao']} (cdf={ac.get('cdf', 'n/a'):.4f})")
    sk = f"{section['icao']}_{section['section_id']}"
    paths = make_paths(sk, ac['icao'])
    sizes, rh = bake_one(section, ac, paths)
    log('=== CANARY RESULT ===')
    for k, v in sizes.items():
        kb = (v or 0) / 1024
        mb = kb / 1024
        log(f'  {k:12s}: {v} bytes = {kb:.1f} kB = {mb:.2f} MB')
    fem_mb = (sizes.get('fem3dMesh') or 0) / 1e6
    if fem_mb > FEM_SIZE_HARD_MB:
        log(f'CANARY FAIL: FEM3D = {fem_mb:.1f} MB > {FEM_SIZE_HARD_MB} MB hard cap. ESCALATE.')
        sys.exit(3)
    elif fem_mb > FEM_SIZE_WARN_MB:
        log(f'CANARY WARN: FEM3D = {fem_mb:.1f} MB > {FEM_SIZE_WARN_MB} MB. Spec says sub-sample interior GPs and re-bake.')
        sys.exit(4)
    else:
        log(f'CANARY OK: FEM3D = {fem_mb:.1f} MB <= {FEM_SIZE_WARN_MB} MB. Proceed with --all.')


def run_all():
    log('=== FULL BAKE: 13 sections × top-5 aircraft ===')
    if not health_ok():
        log('FATAL: backend unhealthy. Start FaarfieldApi.exe and retry.')
        sys.exit(2)
    ensure_dirs()
    sections_manifest = []
    pair_count = 0
    for section, ac_list in iter_section_jobs():
        sk = f"{section['icao']}_{section['section_id']}"
        log(f'\n=== {sk} ({section["use"]}, {section["desc"]}) — {len(ac_list)} aircraft ===')
        section_entry = {'sectionKey': sk, 'icao': section['icao'],
                         'sectionId': section['section_id'], 'aircraft': []}
        for rank, ac in enumerate(ac_list, start=1):
            log(f'-- rank {rank}: {ac["icao"]} (cdf={ac.get("cdf", 0):.4f}) --')
            paths = make_paths(sk, ac['icao'])
            sizes, rh = bake_one(section, ac, paths)
            section_entry['aircraft'].append(manifest_entry(section, ac, rank, sizes, rh))
            pair_count += 1
            if pair_count % PROACTIVE_RESTART_EVERY == 0:
                log(f'... {pair_count} pairs done; health re-check ...')
                if not health_ok():
                    log('backend lost — abort')
                    write_manifest(sections_manifest + [section_entry])
                    sys.exit(5)
        sections_manifest.append(section_entry)
        write_manifest(sections_manifest)  # incremental save
    log('\n=== BAKE COMPLETE ===')
    log(f'pairs baked: {pair_count}/195')
    log('next: robocopy mirror to <project>/website/{src/data/precal,public/data/precal}/')


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--canary', action='store_true', help='Bake KLHX_6627 controlling aircraft only and halt')
    p.add_argument('--all', action='store_true', help='Bake all 13 × top-5 aircraft (~6 hr)')
    args = p.parse_args()
    if args.canary:
        run_canary()
    elif args.all:
        run_all()
    else:
        p.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()