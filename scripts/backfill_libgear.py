"""Backfill missing libGear / geometrySource / nWheels / tireWidth /
wheelX / wheelY in results/cdf_results.json by re-querying the backend's
/api/aircraft/resolve/{icao} endpoint per aircraft.

Background: after the v2 sequential-rerun batch, the FullAnalysisWrapper.vb
multi-aircraft CDF response started returning null for these per-aircraft
metadata fields (suspected static-state corruption after heavy FEM runs).
The CDF numbers themselves are correct — only the per-aircraft "library
traceability" fields (libGear etc.) are missing.

This script does NOT recompute CDF. It only:
  1. Walks every section's top_aircraft_full
  2. For each aircraft entry where any of libGear/geometrySource/nWheels/
     tireWidth/wheelX/wheelY is null, calls /api/aircraft/resolve and
     fills in the missing fields
  3. Caches resolve responses by (icao, excel_gear, mtow) to avoid
     re-querying the same aircraft across sections
  4. Writes the corrected JSON back to results/cdf_results.json + the
     website data copy + the sister sci_history file

Side effects: zero CDF impact, zero verdict change, zero risk to the
overnight batch results. This is purely a UI-metadata refresh.
"""
import json
import os
import shutil
import sys
import time
import requests

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS = os.path.join(PROJECT, 'results')
WEB_DATA = r'c:/temp/aeropave/src/data'
MAIN_PATH = os.path.join(RESULTS, 'cdf_results.json')
WEB_PATH = os.path.join(WEB_DATA, 'cdf_results.json')
SISTER_PATH = os.path.join(RESULTS, 'cdf_results_sci_history.json')
BASE = 'http://localhost:5100'

# Restart the backend if we hit too many failures in a row (suggests the
# state-corruption bug is back).  Each resolve is normally ~30 ms, so 50
# requests is well under a second.
RESTART_AFTER_N_NULL = 8


def resolve(icao, gear='', mtow=0):
    params = {}
    if gear: params['gear'] = gear
    if mtow: params['mtow'] = mtow
    r = requests.get(f'{BASE}/api/aircraft/resolve/{icao}', params=params, timeout=15)
    r.raise_for_status()
    return r.json()


def restart_backend():
    """Kill + restart FaarfieldApi.exe and wait for /api/health."""
    print('  [restart] killing backend...', flush=True)
    os.system('taskkill /IM FaarfieldApi.exe /F >NUL 2>&1')
    time.sleep(2)
    os.system('start /B "" "c:\\temp\\aeropave\\faarfield-api\\bin\\x86\\Release\\FaarfieldApi.exe"')
    for i in range(30):
        try:
            requests.get(f'{BASE}/api/health', timeout=2).raise_for_status()
            print(f'  [restart] backend up after {i + 1} sec', flush=True)
            return True
        except Exception:
            time.sleep(1)
    return False


def needs_backfill(a):
    """Trigger a refresh whenever the per-aircraft library fields are
    missing OR when libGear is suspiciously equal to the request-supplied
    gear (which suggests stale data from before the LibraryGearType fix —
    the old code wrote libGear = request gear, not the library's gear)."""
    if (a.get('libGear') is None or
            a.get('geometrySource') is None or
            a.get('nWheels') is None or
            a.get('tireWidth') is None or
            not a.get('wheelX') or
            not a.get('wheelY')):
        return True
    # Always refresh: cheap (~30 ms per resolve, cached by ICAO+gear+MTOW)
    # and ensures stale "libGear == gear" entries get the actual library value.
    return True


def main():
    if not os.path.exists(MAIN_PATH):
        print(f'ERROR: {MAIN_PATH} not found')
        sys.exit(1)

    # Verify backend is alive
    try:
        h = requests.get(f'{BASE}/api/health', timeout=3).json()
        if not h.get('analysisAvailable'):
            print('Backend not analysisAvailable')
            sys.exit(1)
        print(f'Backend OK ({h.get("aircraftCount")} aircraft, {h.get("aircraftWithGeometry")} with geometry)')
    except Exception as e:
        print(f'Backend not reachable: {e}')
        sys.exit(1)

    data = json.load(open(MAIN_PATH))
    print(f'Loaded {len(data)} sections from {MAIN_PATH}')

    # Walk every aircraft entry and decide which need backfill
    cache = {}     # (icao, gear, mtow_rounded) -> resolve response
    fixed_aircraft = 0
    fixed_sections = 0
    null_streak = 0

    for sec in data:
        sec_dirty = False
        for a in sec.get('top_aircraft_full', []) or []:
            if not needs_backfill(a):
                continue
            icao = (a.get('icao') or '').upper()
            gear = a.get('gear') or ''
            mtow = a.get('mtow') or 0
            cache_key = (icao, gear, round(mtow))
            if cache_key not in cache:
                try:
                    cache[cache_key] = resolve(icao, gear, mtow)
                except Exception as e:
                    print(f'  ERROR resolving {icao}: {e}')
                    cache[cache_key] = None
            geo = cache[cache_key]
            if geo is None or 'error' in geo:
                continue

            # Detect the state-corruption bug: if resolve returned null for
            # libraryGearType, restart the backend and retry once.
            if (geo.get('libraryGearType') is None and geo.get('nWheels') is None
                    and geo.get('tireWidth') is None):
                null_streak += 1
                if null_streak >= RESTART_AFTER_N_NULL:
                    print(f'  ! {null_streak} consecutive null resolves — backend likely corrupted; restarting')
                    if restart_backend():
                        del cache[cache_key]
                        try:
                            cache[cache_key] = resolve(icao, gear, mtow)
                        except Exception as e:
                            print(f'  ERROR re-resolving {icao}: {e}')
                            continue
                        geo = cache[cache_key]
                        null_streak = 0
                    else:
                        print('  ! backend restart failed; aborting')
                        break
            else:
                null_streak = 0

            # Apply backfill
            wheel_coords = geo.get('wheelCoords') or []
            wheel_x = [w.get('x', 0) for w in wheel_coords]
            wheel_y = [w.get('y', 0) for w in wheel_coords]
            a['libGear']         = geo.get('libraryGearType')
            a['geometrySource']  = geo.get('geometrySource')
            a['nWheels']         = geo.get('nWheels')
            a['tireWidth']       = geo.get('tireWidth')
            if wheel_x: a['wheelX'] = wheel_x
            if wheel_y: a['wheelY'] = wheel_y
            fixed_aircraft += 1
            sec_dirty = True

        if sec_dirty:
            fixed_sections += 1

    print()
    print(f'Backfilled {fixed_aircraft} aircraft entries across {fixed_sections} sections')
    print(f'(unique resolves cached: {len(cache)})')

    if fixed_aircraft == 0:
        print('Nothing to do — all entries already have full metadata.')
        return

    # Save corrected JSON to all three sinks
    json.dump(data, open(MAIN_PATH, 'w'), indent=2)
    shutil.copy2(MAIN_PATH, WEB_PATH)
    shutil.copy2(MAIN_PATH, SISTER_PATH)
    print()
    print(f'Wrote: {MAIN_PATH}')
    print(f'       {WEB_PATH}')
    print(f'       {SISTER_PATH}')

    # Spot-check: now C-17 should have libGear=2T everywhere
    print()
    print('Verification — C-17 entries after backfill:')
    for sec in data:
        for i, a in enumerate(sec.get('top_aircraft_full', []), 1):
            if (a.get('icao') or '').upper() == 'C17':
                lib, traf = a.get('libGear'), a.get('gear')
                tag = '✓ MISMATCH FLAGGED' if lib and traf and lib != traf else 'no mismatch'
                print(f'  {sec["icao"]} {sec["section_id"]:>6}  rank #{i}:  gear={traf!r:>6} libGear={lib!r:>6}  → {tag}')


if __name__ == '__main__':
    main()
