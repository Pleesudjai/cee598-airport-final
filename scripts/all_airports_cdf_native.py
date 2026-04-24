"""
FAARFIELD CDF Analysis — All 6 Airports (13 Sections) — Native Desktop-Parity Engine

Runs the .NET backend's POST /api/analysis/cdf (FullAnalysisWrapper.RunCdfAnalysis),
which is LEAF + rigid-FEM(AMClassLib) + all 10 desktop-parity fatigue gaps — NOT 3D FEM.
Aircraft resolution is 100% backend-owned: the Python driver sends raw Excel fields
(icao, mtow, gear, annualDeps) and the backend's AircraftLibrary.ResolveGeometry fills
in wheel coordinates from FAARFIELD XML (tier 1), curated proxies (tier 2), or
gear-letter templates (tier 3/4). Tier-3/4 aircraft are flagged everywhere in the
output, not hard-stopped.

Spec: specs/native-cdf-rerun-all-sections.md
Backup: results/cdf_results_python_backup.json (old Python-engine results)
"""

import os, sys, json, time, shutil
import requests
import pandas as pd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from faarfield_engine import load_traffic

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL = os.path.join(PROJECT, 'AO_CEE598_FAARFIELD.xlsx')
RESULTS = os.path.join(PROJECT, 'results')
WEBSITE_DATA = os.path.join(PROJECT, 'website', 'src', 'data')
BASE = 'http://localhost:5100'
os.makedirs(RESULTS, exist_ok=True)

FLEX_STR = 650      # FAARFIELD program default (ProgramDefaults.vb:104, MaterialLibrary.vb:256)
SCI = 80            # FAARFIELD default for existing PCC under HMA overlay
DESIGN_LIFE = 20
MIN_MTOW = 6000     # skip aircraft below this threshold (matches Python engine policy)
TIER3_SET = {'gear_template', 'dual_fallback'}

AIRPORTS = [
    {'icao': 'KLHX', 'name': 'La Junta Municipal', 'state': 'CO',
     'sheet': 'Traffic346', 'growth': 0.032, 'years_span': 8,
     'subgrade_desc': 'Silt Loam (AASHTO A-6), CBR=7',
     'sections': [
         {'id': '6627', 'use': 'Taxiway', 'desc': '2.5" AC + 6" PCC',
          'layers': [
              {'type': 'P-401 AC Overlay', 'h': 2.5, 'E': 200_000, 'nu': 0.35},
              {'type': 'P-501 PCC',        'h': 6.0, 'E': 4_000_000, 'nu': 0.15}],
          'subgrade': {'E': 10_500, 'nu': 0.40}},
         {'id': '7347', 'use': 'Taxiway', 'desc': '2" AC + 10" PCC',
          'layers': [
              {'type': 'P-401 AC Overlay', 'h': 2.0, 'E': 200_000, 'nu': 0.35},
              {'type': 'P-501 PCC',        'h': 10.0, 'E': 4_000_000, 'nu': 0.15}],
          'subgrade': {'E': 10_500, 'nu': 0.40}},
     ]},
    {'icao': 'KPUB', 'name': 'Pueblo Memorial', 'state': 'CO',
     'sheet': 'Traffic364', 'growth': -0.007, 'years_span': 8,
     'subgrade_desc': 'Bedrock/Shale, CBR=12',
     'sections': [
         {'id': '6948', 'use': 'Taxiway', 'desc': '2.5" AC + 7" PCC + 6" P-154',
          'layers': [
              {'type': 'P-401 AC Overlay', 'h': 2.5, 'E': 200_000, 'nu': 0.35},
              {'type': 'P-501 PCC',        'h': 7.0, 'E': 4_000_000, 'nu': 0.15},
              {'type': 'P-154 Subbase',    'h': 6.0, 'E': 40_000,  'nu': 0.35}],
          'subgrade': {'E': 18_000, 'nu': 0.40}},
     ]},
    {'icao': 'KMQJ', 'name': 'Indianapolis Regional', 'state': 'IN',
     'sheet': 'Traffic378', 'growth': 0.005, 'years_span': 8,
     'subgrade_desc': 'Silty Clay (AASHTO A-7-6), CBR=4',
     'sections': [
         {'id': '8662', 'use': 'Taxiway TWA2', 'desc': '3.5" AC + 8" PCC + 6" Stab Base',
          'layers': [
              {'type': 'P-401 AC Overlay',  'h': 3.5, 'E': 200_000, 'nu': 0.35},
              {'type': 'P-501 PCC',         'h': 8.0, 'E': 4_000_000, 'nu': 0.15},
              {'type': 'Stabilized Base',   'h': 6.0, 'E': 500_000, 'nu': 0.20}],
          'subgrade': {'E': 6_000, 'nu': 0.45}},
         {'id': '8881', 'use': 'Taxiway TWA1', 'desc': '3.5" AC + 8" PCC + 6" Stab Subbase',
          'layers': [
              {'type': 'P-401 AC Overlay',     'h': 3.5, 'E': 200_000, 'nu': 0.35},
              {'type': 'P-501 PCC',            'h': 8.0, 'E': 4_000_000, 'nu': 0.15},
              {'type': 'Stabilized Subbase',   'h': 6.0, 'E': 500_000, 'nu': 0.20}],
          'subgrade': {'E': 6_000, 'nu': 0.45}},
         {'id': '8640', 'use': 'Taxiway TWA3', 'desc': '3.5" AC + 8" PCC + 6" Stab Base',
          'layers': [
              {'type': 'P-401 AC Overlay',  'h': 3.5, 'E': 200_000, 'nu': 0.35},
              {'type': 'P-501 PCC',         'h': 8.0, 'E': 4_000_000, 'nu': 0.15},
              {'type': 'Stabilized Base',   'h': 6.0, 'E': 500_000, 'nu': 0.20}],
          'subgrade': {'E': 6_000, 'nu': 0.45}},
         {'id': '8780', 'use': 'Taxiway TWA4', 'desc': '3.5" AC + 8" PCC + 6" Stab Base',
          'layers': [
              {'type': 'P-401 AC Overlay',  'h': 3.5, 'E': 200_000, 'nu': 0.35},
              {'type': 'P-501 PCC',         'h': 8.0, 'E': 4_000_000, 'nu': 0.15},
              {'type': 'Stabilized Base',   'h': 6.0, 'E': 500_000, 'nu': 0.20}],
          'subgrade': {'E': 6_000, 'nu': 0.45}},
     ]},
    {'icao': 'KCIU', 'name': 'Chippewa County Intl', 'state': 'MI',
     'sheet': 'Traffic1017', 'growth': -0.001, 'years_span': 8,
     'subgrade_desc': 'Fine Sand (AASHTO A-3), CBR=20',
     'sections': [
         {'id': '21222', 'use': 'Runway', 'desc': '2.5" AC + 24" PCC',
          'layers': [
              {'type': 'P-401 AC Overlay', 'h': 2.5,  'E': 200_000, 'nu': 0.35},
              {'type': 'P-501 PCC',        'h': 24.0, 'E': 4_000_000, 'nu': 0.15}],
          'subgrade': {'E': 30_000, 'nu': 0.35}},
     ]},
    {'icao': 'KOTM', 'name': 'Ottumwa Regional', 'state': 'IA',
     'sheet': 'Traffic1356', 'growth': -0.022, 'years_span': 8,
     'subgrade_desc': 'Silty Clay Loam (AASHTO A-7-6), CBR=4',
     'sections': [
         {'id': '28171', 'use': 'Taxiway', 'desc': '2.5" AC + 8" PCC',
          'layers': [
              {'type': 'P-401 AC Overlay', 'h': 2.5, 'E': 200_000, 'nu': 0.35},
              {'type': 'P-501 PCC',        'h': 8.0, 'E': 4_000_000, 'nu': 0.15}],
          'subgrade': {'E': 6_000, 'nu': 0.45}},
         {'id': '27450', 'use': 'Runway', 'desc': '3" AC + 9" PCC',
          'layers': [
              {'type': 'P-401 AC Overlay', 'h': 3.0, 'E': 200_000, 'nu': 0.35},
              {'type': 'P-501 PCC',        'h': 9.0, 'E': 4_000_000, 'nu': 0.15}],
          'subgrade': {'E': 6_000, 'nu': 0.45}},
         {'id': '27641', 'use': 'Runway', 'desc': '3" AC + 8" PCC',
          'layers': [
              {'type': 'P-401 AC Overlay', 'h': 3.0, 'E': 200_000, 'nu': 0.35},
              {'type': 'P-501 PCC',        'h': 8.0, 'E': 4_000_000, 'nu': 0.15}],
          'subgrade': {'E': 6_000, 'nu': 0.45}},
     ]},
    {'icao': 'KMWH', 'name': 'Grant County Intl', 'state': 'WA',
     'sheet': 'Traffic1863', 'growth': -0.005, 'years_span': 8,
     'subgrade_desc': 'Gravelly Coarse Sand (AASHTO A-1-a), CBR=40',
     'sections': [
         {'id': '37325', 'use': 'Runway (narrow)', 'desc': '2" AC + 6" PCC + 12" Agg Base',
          'layers': [
              {'type': 'P-401 AC Overlay',     'h': 2.0,  'E': 200_000, 'nu': 0.35},
              {'type': 'P-501 PCC',            'h': 6.0,  'E': 4_000_000, 'nu': 0.15},
              {'type': 'P-209 Aggregate Base', 'h': 12.0, 'E': 75_000, 'nu': 0.35}],
          'subgrade': {'E': 50_000, 'nu': 0.30}},
         {'id': '37508', 'use': 'Runway (wide)', 'desc': '2" AC + 6" PCC + 12" Agg Base',
          'layers': [
              {'type': 'P-401 AC Overlay',     'h': 2.0,  'E': 200_000, 'nu': 0.35},
              {'type': 'P-501 PCC',            'h': 6.0,  'E': 4_000_000, 'nu': 0.15},
              {'type': 'P-209 Aggregate Base', 'h': 12.0, 'E': 75_000, 'nu': 0.35}],
          'subgrade': {'E': 50_000, 'nu': 0.30}},
     ]},
]


def preflight_audit(unique_aircraft):
    """Hit GET /api/aircraft/resolve/{icao} for every (icao, gear, mtow) tuple.
    Backend uses the same AircraftLibrary.ResolveGeometry the CDF loop will use,
    so audit results match the run bit-exact."""
    audit = {}
    for icao, gear, mtow in sorted(unique_aircraft):
        key = f"{icao}/{gear}/{mtow:.0f}"
        try:
            r = requests.get(f"{BASE}/api/aircraft/resolve/{icao}",
                             params={'gear': gear, 'mtow': mtow}, timeout=30)
            if r.status_code == 200:
                d = r.json()
                audit[key] = {
                    'icao': icao, 'excelGear': gear, 'excelMtow': mtow,
                    'geometrySource': d.get('geometrySource'),
                    'resolvedIcao': d.get('resolvedIcao'),
                    'faarfieldName': d.get('faarfieldName'),
                    'gearType': d.get('gearType'),
                    'nWheels': d.get('nWheels'),
                    'tirePressure': d.get('tirePressure'),
                    'wheelCoords': d.get('wheelCoords'),
                }
            else:
                audit[key] = {'icao': icao, 'excelGear': gear, 'excelMtow': mtow,
                              'geometrySource': 'error', 'httpStatus': r.status_code}
        except Exception as e:
            audit[key] = {'icao': icao, 'excelGear': gear, 'excelMtow': mtow,
                          'geometrySource': 'error', 'exception': str(e)}
    return audit


def build_aircraft_payload(traffic_df):
    aircraft = []
    for _, ac in traffic_df.iterrows():
        mtow = ac['MTOW']
        deps = ac['AnnualDeps']
        if pd.isna(mtow) or pd.isna(deps) or mtow <= MIN_MTOW or deps <= 0:
            continue
        aircraft.append({
            'icao': str(ac['Type']).strip(),
            'mtow': float(mtow),
            'gear': str(ac['Gear']).strip(),
            'annualDeps': float(deps),
            'mgPct': 0.95,
            'tirePressure': 0,
        })
    return aircraft


def run_cdf_section(layers, subgrade, aircraft, growth):
    payload = {
        'layers': layers, 'subgrade': subgrade, 'aircraft': aircraft,
        'growth': growth, 'life': DESIGN_LIFE, 'flexStr': FLEX_STR, 'sci': SCI,
        'designType': 'FlexOnRigid', 'runMode': 'cdf', 'useFem3d': False,
    }
    r = requests.post(f"{BASE}/api/analysis/cdf", json=payload, timeout=900)
    r.raise_for_status()
    return r.json()


def is_simplified(src):
    return src in TIER3_SET


def source_note(audit_rec):
    src = (audit_rec or {}).get('geometrySource', '')
    if src == 'gear_template':
        coords = audit_rec.get('wheelCoords', [])
        coord_str = ', '.join(f"({p['x']:.0f},{p['y']:.0f})" for p in coords)
        return f"simplified gear_template ({audit_rec.get('gearType')}: {coord_str})"
    if src == 'dual_fallback':
        return "simplified dual_fallback (gear type unknown, ±17/0)"
    if src in ('icao_proxy', 'family_proxy', 'nearest_proxy'):
        return f"{src} donor → {audit_rec.get('resolvedIcao')}"
    if src == 'proxy_override':
        return f"curated proxy_override → {audit_rec.get('resolvedIcao')}"
    if src == 'xml':
        return "exact FAARFIELD XML"
    return src or ""


def source_tag(src):
    if src == 'xml': return 'xml'
    if src == 'proxy_override': return 'proxy+'
    if src in ('icao_proxy', 'family_proxy', 'nearest_proxy'): return src
    if src == 'gear_template': return 'TEMPLATE*'
    if src == 'dual_fallback': return 'FALLBACK*'
    return src or '?'


# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    # --- Backup existing Python-engine results ---
    old_json = os.path.join(RESULTS, 'cdf_results.json')
    backup = os.path.join(RESULTS, 'cdf_results_python_backup.json')
    old_data = []
    if os.path.exists(old_json):
        shutil.copy2(old_json, backup)
        with open(old_json) as f:
            old_data = json.load(f)
        print(f"Backed up old Python-engine results to {backup}")
    old_index = {f"{r['icao']}/{r['section_id']}": r for r in old_data}

    # --- Collect unique aircraft across all 6 airports (for pre-flight) ---
    unique_aircraft = set()
    all_traffic = {}
    for apt in AIRPORTS:
        tr = load_traffic(EXCEL, apt['sheet'], apt['years_span'])
        all_traffic[apt['icao']] = tr
        for _, ac in tr.iterrows():
            mtow = ac['MTOW']; deps = ac['AnnualDeps']
            if pd.isna(mtow) or pd.isna(deps) or mtow <= MIN_MTOW or deps <= 0:
                continue
            unique_aircraft.add((str(ac['Type']).strip(), str(ac['Gear']).strip(), float(mtow)))

    print(f"\nPre-flight: auditing {len(unique_aircraft)} unique (icao, gear, mtow) tuples...")
    t0 = time.time()
    audit = preflight_audit(unique_aircraft)
    print(f"  Audit complete in {time.time()-t0:.1f}s")

    source_counts = {}
    simplified = []
    errors = []
    for v in audit.values():
        s = v.get('geometrySource', 'error')
        source_counts[s] = source_counts.get(s, 0) + 1
        if is_simplified(s):
            simplified.append(v)
        if s == 'error':
            errors.append(v)

    print("\nGeometry source breakdown:")
    for s, n in sorted(source_counts.items(), key=lambda x: -x[1]):
        marker = ' ⚠' if s in TIER3_SET else (' ✗' if s == 'error' else '')
        print(f"  {s:20s} {n:4d}{marker}")

    if errors:
        print(f"\n✗ {len(errors)} aircraft failed to resolve (library lookup error):")
        for v in errors:
            print(f"    {v['icao']} / gear={v['excelGear']} / MTOW={v['excelMtow']:,.0f} — {v.get('exception', v.get('httpStatus'))}")

    if simplified:
        print(f"\n⚠ {len(simplified)} aircraft using simplified wheel layouts (tier 3/4) — proceeding, flagging in results:")
        print(f"    {'ICAO':<6} {'Gear':<5} {'MTOW':>10} {'Source':<16} {'Coords':<40}")
        for v in sorted(simplified, key=lambda x: -x['excelMtow']):
            coords = v.get('wheelCoords', []) or []
            coord_str = '; '.join(f"({p['x']:.0f},{p['y']:.0f})" for p in coords[:4])
            if len(coords) > 4: coord_str += f'...+{len(coords)-4}'
            print(f"    {v['icao']:<6} {v['excelGear']:<5} {v['excelMtow']:>10,.0f} {v.get('geometrySource', ''):<16} {coord_str:<40}")

    with open(os.path.join(RESULTS, 'gear_coord_audit.json'), 'w') as f:
        json.dump({
            'summary': source_counts,
            'simplifiedAircraft': simplified,
            'errorAircraft': errors,
            'allEntries': list(audit.values()),
        }, f, indent=2)
    print(f"\nSaved {os.path.join(RESULTS, 'gear_coord_audit.json')}")

    # --- CDF loop per section ---
    all_results = []
    t_start = time.time()
    for apt in AIRPORTS:
        icao = apt['icao']
        print(f"\n{'#'*80}")
        print(f"# {icao} — {apt['name']}, {apt['state']}")
        print(f"# Subgrade: {apt['subgrade_desc']}  |  Growth: {apt['growth']*100:+.1f}%")
        print(f"{'#'*80}")
        tr = all_traffic[icao]
        aircraft = build_aircraft_payload(tr)
        print(f"  Sending {len(aircraft)} aircraft (of {len(tr)} in sheet, after <{MIN_MTOW}lb + zero-deps filter)")

        out_txt = open(os.path.join(RESULTS, f"{icao}_CDF_Full_Output.txt"), 'w', encoding='utf-8')
        out_txt.write(f"FAARFIELD CDF (Native Engine, LEAF-only) — {icao} ({apt['name']}, {apt['state']})\n")
        out_txt.write(f"Engine: FAARFIELD_desktop_parity  |  useFem3d=false  |  flexStr={FLEX_STR}  |  SCI={SCI}  |  life={DESIGN_LIFE}yr\n")
        out_txt.write(f"Subgrade: {apt['subgrade_desc']}\n")
        out_txt.write(f"Traffic sheet: {apt['sheet']} — {len(tr)} types, {len(aircraft)} sent (filter: MTOW>{MIN_MTOW}lb)\n")
        out_txt.write(f"Growth: {apt['growth']*100:+.3f}%/yr over {DESIGN_LIFE} yr\n")
        out_txt.write("=" * 80 + "\n")

        apt_results = []
        for sec in apt['sections']:
            t0 = time.time()
            try:
                response = run_cdf_section(sec['layers'], sec['subgrade'], aircraft, apt['growth'])
                elapsed = time.time() - t0
            except Exception as e:
                print(f"  {icao} {sec['id']} FAILED: {e}")
                out_txt.write(f"\n--- Section {sec['id']} ({sec['use']} - {sec['desc']}) ---\n")
                out_txt.write(f"ERROR: {e}\n")
                continue

            per_ac = response.get('perAircraft') or []
            control_offset_in = response.get('controlOffsetIn')
            per_ac_sorted = sorted(per_ac, key=lambda a: a.get('cdfContribution', a.get('cdf', 0)), reverse=True)

            top_aircraft = []
            simplified_count = 0
            for ac in per_ac_sorted[:5]:
                key = f"{ac['icao']}/{ac['gear']}/{ac['mtow']:.0f}"
                audit_rec = audit.get(key, {})
                src = audit_rec.get('geometrySource', 'unknown')
                if is_simplified(src): simplified_count += 1
                cdf_contribution = ac.get('cdfContribution', ac['cdf'])
                cdf_max_aircraft = ac.get('cdfMax', cdf_contribution)
                top_aircraft.append({
                    'ac': ac['icao'], 'mtow': ac['mtow'], 'gear': ac['gear'],
                    'cdf_total': cdf_contribution,
                    'cdf_contribution': cdf_contribution,
                    'cdf_max_aircraft': cdf_max_aircraft,
                    'wheelSource': src,
                    'wheelSourceNote': source_note(audit_rec),
                })

            verdict = 'OVER' if response['adequate'] else 'UNDER'
            cdf_max = response['cdf_max']
            controlling = response['controlling']
            print(f"  {icao} {sec['id']:>6} → cdf_max={cdf_max:.4e} ({controlling}) {verdict}-DESIGNED — {elapsed:.1f}s "
                  f"{'[⚠ '+str(simplified_count)+' tier3/4 in top5]' if simplified_count else ''}")

            # _CDF_Full_Output.txt
            out_txt.write(f"\n--- Section {sec['id']} ({sec['use']} — {sec['desc']}) ---\n")
            out_txt.write(f"Layers: ")
            for L in sec['layers']:
                out_txt.write(f"{L['type']}({L['h']}\"/E={L['E']:,})  ")
            out_txt.write(f"| Subgrade(E={sec['subgrade']['E']:,}, nu={sec['subgrade']['nu']})\n")
            out_txt.write(f"Solver: {response.get('solver')}  |  Elapsed: {elapsed:.1f}s\n")
            for w in (response.get('warnings') or [])[:40]:
                out_txt.write(f"  [warn] {w}\n")
            out_txt.write(f"\n  CDF_AC:  {response['cdf_ac']:.6e}\n")
            out_txt.write(f"  CDF_Sub: {response['cdf_sub']:.6e}\n")
            out_txt.write(f"  CDF_PCC: {response['cdf_pcc']:.6e}\n")
            out_txt.write(f"  CDF_Max: {cdf_max:.6e}  ({controlling})\n")
            if control_offset_in is not None:
                out_txt.write(f"  Control offset: {control_offset_in:.1f} in\n")
            out_txt.write(f"  Verdict: {verdict}-DESIGNED\n")
            out_txt.write(f"\n  Top aircraft by contribution at controlling offset:\n")
            out_txt.write(f"  {'ICAO':<6} {'MTOW':>8} {'Gear':<5} {'Annual':>7} {'Design':>9} {'PCC_psi':>8} {'CDF@Ctrl':>14} {'CDF Max':>14} {'Src':<12}\n")
            for ac in per_ac_sorted[:20]:
                key = f"{ac['icao']}/{ac['gear']}/{ac['mtow']:.0f}"
                src = audit.get(key, {}).get('geometrySource', '?')
                cdf_contribution = ac.get('cdfContribution', ac['cdf'])
                cdf_max_aircraft = ac.get('cdfMax', cdf_contribution)
                out_txt.write(f"  {ac['icao']:<6} {ac['mtow']:>8,.0f} {ac['gear']:<5} {ac['annualDeps']:>7.0f} "
                              f"{ac['designDeps']:>9.0f} {ac.get('leafPccStress',0):>8.1f} "
                              f"{cdf_contribution:>14.4e} {cdf_max_aircraft:>14.4e} {source_tag(src):<12}\n")

            r = {
                'icao': icao, 'airport': apt['name'],
                'section_id': sec['id'], 'use': sec['use'], 'desc': sec['desc'],
                'subgrade': apt['subgrade_desc'], 'growth': apt['growth'],
                'cdf_ac': response['cdf_ac'], 'cdf_sub': response['cdf_sub'],
                'cdf_pcc': response['cdf_pcc'], 'cdf_max': cdf_max,
                'controlling': controlling, 'control_offset_in': control_offset_in, 'adequate': bool(response['adequate']),
                'top_aircraft': top_aircraft,
                'engine': 'FAARFIELD_desktop_parity',
                'aircraftResolvedBy': 'backend_library',
                'simplifiedGearCount': simplified_count,
                'aircraftSent': len(aircraft),
                'elapsedSec': round(elapsed, 2),
            }
            apt_results.append(r)
            all_results.append(r)

        out_txt.close()

        # Per-airport markdown
        with open(os.path.join(RESULTS, f"{icao}_CDF_Results.md"), 'w', encoding='utf-8') as md:
            md.write(f"# {icao} ({apt['name']}, {apt['state']}) — CDF Results\n\n")
            md.write(f"**Engine:** FAARFIELD desktop parity (LEAF + rigid-FEM via AMClassLib; **no 3D FEM**)  \n")
            md.write(f"**Parameters:** flexStr = {FLEX_STR} psi · SCI = {SCI} · life = {DESIGN_LIFE} yr · growth = {apt['growth']*100:+.1f}%/yr  \n")
            md.write(f"**Subgrade:** {apt['subgrade_desc']}  \n")
            md.write(f"**Traffic:** `{apt['sheet']}` — {len(tr)} aircraft types, {len(aircraft)} sent (filter: MTOW > {MIN_MTOW} lb)\n\n")

            apt_simplified = [r for r in apt_results if r['simplifiedGearCount'] > 0]
            if apt_simplified:
                md.write(f"> ⚠️ **Simplified wheel layouts in top-5 aircraft**  \n")
                md.write(f"> {len(apt_simplified)} of this airport's sections have at least one top-5 aircraft resolved via tier-3 (`gear_template`) or tier-4 (`dual_fallback`) — hard-coded gear-letter layouts, not real FAARFIELD XML wheel coords. See `*` markers below and `results/gear_coord_audit.json`.\n\n")

            md.write("## Verdict Summary\n\n")
            md.write("| Section | Use | Layers | CDF (max) | Controlling | Verdict | Simplified top-5 |\n")
            md.write("|---|---|---|---|---|---|---|\n")
            for r in apt_results:
                v = "**OVER**" if r['adequate'] else "**UNDER**"
                md.write(f"| {r['section_id']} | {r['use']} | {r['desc']} | {r['cdf_max']:.4e} | {r['controlling']} | {v} | {r['simplifiedGearCount']}/5 |\n")

            md.write("\n## Top Aircraft by Control-Offset Contribution\n\n")
            for r in apt_results:
                md.write(f"\n### Section {r['section_id']} ({r['use']}) — {r['desc']}\n\n")
                md.write(f"CDF: AC = {r['cdf_ac']:.2e} · Sub = {r['cdf_sub']:.2e} · PCC = {r['cdf_pcc']:.2e} — **Max = {r['cdf_max']:.2e}** ({r['controlling']})\n\n")
                if r.get('control_offset_in') is not None:
                    md.write(f"Control offset: **{r['control_offset_in']:.1f} in**\n\n")
                md.write("| # | Aircraft | MTOW (lb) | Gear | CDF @ control | Aircraft CDF max | Wheel source |\n")
                md.write("|---|---|---|---|---|---|---|\n")
                for i, a in enumerate(r['top_aircraft'], 1):
                    mark = ' *' if is_simplified(a['wheelSource']) else ''
                    md.write(f"| {i} | `{a['ac']}`{mark} | {a['mtow']:,.0f} | {a['gear']} | {a['cdf_contribution']:.2e} | {a['cdf_max_aircraft']:.2e} | {a['wheelSourceNote']} |\n")
                if any(is_simplified(a['wheelSource']) for a in r['top_aircraft']):
                    md.write("\n\\* simplified wheel layout (tier 3/4)\n")

    total_elapsed = time.time() - t_start

    # --- ALL_CDF_Summary.md ---
    under = sum(1 for r in all_results if not r['adequate'])
    over = len(all_results) - under
    top5_simplified_total = sum(r['simplifiedGearCount'] for r in all_results)

    with open(os.path.join(RESULTS, 'ALL_CDF_Summary.md'), 'w', encoding='utf-8') as md:
        md.write("# FAARFIELD CDF Analysis — All 6 Airports Summary (Native Engine)\n\n")
        md.write(f"**Engine:** FAARFIELD desktop parity — LEAF + rigid-FEM (AMClassLib). **3D FEM disabled** (`useFem3d=false`).  \n")
        md.write(f"**Parameters (FAARFIELD defaults):** flexStr = {FLEX_STR} psi · SCI = {SCI} · design life = {DESIGN_LIFE} yr  \n")
        md.write(f"**Aircraft resolution:** backend `AircraftLibrary.ResolveGeometry` — same library driving Design Tool + 3D FEM viewer  \n")
        md.write(f"**Date:** 2026-04-21  ·  **Runtime:** {total_elapsed:.1f}s total\n\n")

        md.write(f"## Verdict — {over} over-designed, {under} under-designed (of {len(all_results)} sections)\n\n")
        md.write("| ICAO | Section | Use | Layers | Subgrade | CDF (max) | Controlling | Verdict |\n")
        md.write("|---|---|---|---|---|---|---|---|\n")
        for r in all_results:
            v = "**OVER**" if r['adequate'] else "**UNDER**"
            md.write(f"| {r['icao']} | {r['section_id']} | {r['use']} | {r['desc']} | {r['subgrade']} | {r['cdf_max']:.4e} | {r['controlling']} | {v} |\n")

        md.write("\n## ⚠️ Aircraft with Simplified Wheel Layouts\n\n")
        if simplified:
            md.write(f"{len(simplified)} unique (icao, gear, MTOW) tuples resolved via tier-3 `gear_template` or tier-4 `dual_fallback`. ")
            md.write(f"These used hard-coded gear-letter layouts instead of real FAARFIELD XML wheel coordinates. ")
            md.write(f"Across all sections, {top5_simplified_total} top-5 CDF entries leaned on these simplified layouts.\n\n")
            md.write("| ICAO | Gear | MTOW (lb) | Source | Wheel coords |\n")
            md.write("|---|---|---|---|---|\n")
            for v in sorted(simplified, key=lambda x: -x['excelMtow']):
                coords = v.get('wheelCoords', []) or []
                coord_str = '; '.join(f"({p['x']:.0f},{p['y']:.0f})" for p in coords)
                if len(coord_str) > 90: coord_str = coord_str[:87] + '...'
                md.write(f"| `{v['icao']}` | {v['excelGear']} | {v['excelMtow']:,.0f} | `{v['geometrySource']}` | {coord_str} |\n")
            md.write("\n**Interpretation:** tier-3 aircraft have a gear letter FAARFIELD recognizes (S / D / 2D / etc.) but no XML record in the library — they get a generic layout (e.g. D = ±17\"/0\"). Tier-4 aircraft have an unrecognized gear letter and fall to the generic dual-wheel stub. Both may under- or over-estimate PCC stress depending on the true aircraft geometry. For airport-scale CDF they are flagged here; promoting them to XML or curated `_proxyOverrides` entries is a future cleanup.\n")
        else:
            md.write("None — every aircraft resolved via tier-1 (`xml`) or tier-2 (proxy) real geometry.\n")

    # results/cdf_results.json
    with open(os.path.join(RESULTS, 'cdf_results.json'), 'w') as f:
        json.dump(all_results, f, indent=2)

    # Copy to website
    shutil.copy2(os.path.join(RESULTS, 'cdf_results.json'),
                 os.path.join(WEBSITE_DATA, 'cdf_results.json'))

    # native_vs_python_diff.md
    with open(os.path.join(RESULTS, 'native_vs_python_diff.md'), 'w', encoding='utf-8') as md:
        md.write("# Native FAARFIELD Engine vs Python Engine — Result Diff\n\n")
        md.write("Side-by-side comparison of `cdf_max` between the old Python engine and the new native FAARFIELD desktop-parity engine.\n\n")
        md.write("| | Old (Python) | New (Native) |\n|---|---|---|\n")
        md.write("| Engine | `scripts/faarfield_engine.py` (hand-ported) | `FullAnalysisWrapper.RunCdfAnalysis` (desktop parity) |\n")
        md.write("| Fatigue models | Odemark + Westergaard + Burmister | SCI-dependent PCC (FSlopeComp), RDEC AC, StraightLine+Bleasdale subgrade |\n")
        md.write("| Rigid slab analysis | Westergaard closed-form | AMClassLib.ComputeResponse (rigid FEM), `max(LEAF, FEM)` |\n")
        md.write("| SCI | Not modelled | 80 |\n")
        md.write(f"| PCC flexural strength | 700 psi | **{FLEX_STR} psi** (FAARFIELD program default) |\n")
        md.write("| Aircraft wheel coords | Simplified gear-letter templates (GEAR_MAP) | Backend AircraftLibrary — XML tier 1, proxy tier 2, template tier 3/4 (flagged) |\n")
        md.write("| Growth formula | `[1+L*g*0.5]*Annual*L` | Applied internally by backend |\n\n")

        md.write("| ICAO | Section | Old cdf_max | New cdf_max | Δ | % change | Old | New | Flipped? |\n")
        md.write("|---|---|---|---|---|---|---|---|---|\n")
        for r in all_results:
            key = f"{r['icao']}/{r['section_id']}"
            old = old_index.get(key, {})
            old_cdf = old.get('cdf_max')
            new_cdf = r['cdf_max']
            old_v = 'O' if old.get('adequate') else 'U'
            new_v = 'O' if r['adequate'] else 'U'
            flipped = '' if old_v == new_v else f'**{old_v}→{new_v}**'
            if old_cdf is not None and old_cdf > 0:
                pct = 100 * (new_cdf - old_cdf) / old_cdf
                md.write(f"| {r['icao']} | {r['section_id']} | {old_cdf:.3e} | {new_cdf:.3e} | {new_cdf - old_cdf:+.3e} | {pct:+.1f}% | {old_v} | {new_v} | {flipped} |\n")
            else:
                md.write(f"| {r['icao']} | {r['section_id']} | (no prior) | {new_cdf:.3e} | — | — | — | {new_v} | |\n")

        md.write("\n## Caveats\n\n")
        md.write(f"- **flexStr changed from 700 → {FLEX_STR} psi** (we moved to the actual FAARFIELD program default). Lower flex strength means higher stress/strength ratio → *higher* CDF, all else equal.\n")
        md.write("- **SCI = 80** is now applied. The old Python engine had no SCI term. SCI modifies the PCC fatigue equation via FSlope / FSlopeComp (see modStrDesign13.vb).\n")
        md.write("- **Rigid FEM via AMClassLib** is now in the loop. For sections where the rigid-FEM stress exceeds 0.95× the LEAF stress, the fatigue calc uses the rigid-FEM value.\n")
        md.write("- **Simplified (tier-3/4) aircraft coords are essentially the same as the Python engine used** — both use hard-coded gear-letter templates. Those aircraft's deltas here reflect SCI/fatigue model + flexStr changes, not a gear-coord correction.\n")
        md.write("- **Tier-1/2 (xml / proxy) aircraft are new geometry** — the Python engine had no real wheel coords, just `n_tires` + `tire_pressure` from `GEAR_MAP`. For those aircraft (the majority), wheel-position accuracy directly improves stress realism.\n")

    print(f"\n{'='*80}")
    print(f"DONE — {over} over-designed, {under} under-designed of {len(all_results)} sections")
    print(f"       {top5_simplified_total} top-5 aircraft entries used simplified (tier-3/4) wheel layouts")
    print(f"       Runtime: {total_elapsed:.1f}s")
    print(f"\nArtifacts in {RESULTS}/:")
    print(f"  ALL_CDF_Summary.md · cdf_results.json · gear_coord_audit.json · native_vs_python_diff.md")
    print(f"  per-airport: <ICAO>_CDF_Full_Output.txt  and  <ICAO>_CDF_Results.md")
    print(f"Website copy: {WEBSITE_DATA}/cdf_results.json")
