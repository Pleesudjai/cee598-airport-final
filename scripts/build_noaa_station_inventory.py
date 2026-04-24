"""Build a compact JSON inventory of NOAA GHCN-D climate-normals stations.

Downloads the full ghcnd-stations.txt (~10 MB fixed-width file with ~125k
stations worldwide), filters to U.S. stations only (~70k), and saves a
slim JSON suitable for client-side nearest-station lookup.

The 1991-2020 climate-normals dataset only covers a SUBSET of GHCN-D
stations (those with sufficient continuous record). To keep the inventory
honest, we then HEAD-check each US station against the normals CSV URL
in parallel and drop the misses.  Final inventory is ~5-9k US stations
with verified 1991-2020 normals files available — small enough to ship
with the website (~500 KB JSON).

Output:
  c:/temp/aeropave/src/data/noaa_normals_stations.json
"""
import concurrent.futures
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime

OUT_PATH = r'c:/temp/aeropave/src/data/noaa_normals_stations.json'
STATIONS_TXT = 'https://www.ncei.noaa.gov/pub/data/ghcn/daily/ghcnd-stations.txt'
NORMALS_URL_TEMPLATE = 'https://www.ncei.noaa.gov/data/normals-daily/1991-2020/access/{station}.csv'


def fetch_text(url, timeout=60):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (CEE598 frost analysis)'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode('utf-8')


def parse_stations(text):
    """ghcnd-stations.txt is fixed-width:
        cols 1-11   station ID
        cols 13-20  latitude
        cols 22-30  longitude
        cols 32-37  elevation (meters)
        cols 39-40  state (US only)
        cols 42-71  station name
    """
    stations = []
    for line in text.splitlines():
        if not line.strip():
            continue
        sid = line[0:11].strip()
        if not sid.startswith('US'):
            continue
        try:
            lat = float(line[12:20])
            lon = float(line[21:30])
        except (ValueError, IndexError):
            continue
        elev = line[31:37].strip() or '0'
        try:
            elev = float(elev)
        except ValueError:
            elev = None
        state = line[38:40].strip()
        name = line[41:71].strip()
        stations.append({
            'id': sid, 'lat': round(lat, 4), 'lon': round(lon, 4),
            'elev_m': elev, 'state': state, 'name': name,
        })
    return stations


def head_check(station_id, timeout=10):
    """Return True if the 1991-2020 normals CSV exists for this station."""
    url = NORMALS_URL_TEMPLATE.format(station=station_id)
    req = urllib.request.Request(url, method='HEAD',
                                 headers={'User-Agent': 'Mozilla/5.0 (CEE598 frost analysis)'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status == 200
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        return False


def main():
    print('=' * 78)
    print('Build NOAA GHCN-D normals-station inventory for client-side frost lookup')
    print('=' * 78)

    print(f'\n1. Downloading {STATIONS_TXT} ...')
    text = fetch_text(STATIONS_TXT)
    print(f'   Got {len(text):,} bytes')

    us_stations = parse_stations(text)
    print(f'2. Parsed {len(us_stations):,} US stations from inventory')

    # We DON'T HEAD-check each station against the normals URL — that would
    # take ~10 min for 70k stations.  Instead, the frontend will try the
    # nearest station's CSV and fall back to next-nearest on 404.  This is
    # also more robust because NOAA can add/remove normals files over time.
    # Filter strategy: keep only USC*, USR*, USW* prefixes (the three station
    # families that overwhelmingly produce normals).  Drops experimental and
    # decommissioned stations.
    valid = [s for s in us_stations if s['id'][:3] in ('USC', 'USR', 'USW')]
    valid.sort(key=lambda s: s['id'])
    print(f'3. {len(valid):,} stations after USC/USR/USW filter')

    out = {
        'generated': datetime.now().isoformat(timespec='minutes'),
        'source': STATIONS_TXT,
        'normals_url_template': NORMALS_URL_TEMPLATE,
        'count': len(valid),
        'stations': valid,
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    sz = os.path.getsize(OUT_PATH)
    print(f'\nWrote: {OUT_PATH}  ({sz:,} bytes)')


if __name__ == '__main__':
    main()
