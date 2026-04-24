"""Fetch NOAA NCEI Climate Normals (1991-2020) for the 6 project airports,
compute Air Freezing Index (AFI), Berggren frost penetration depth, and
recommend FAA AC 150/5320-6F subbase/subgrade frost-protection treatment.

Source data:  NOAA NCEI Climate Normals Daily 1991-2020 dataset
              https://www.ncei.noaa.gov/data/normals-daily/1991-2020/access/<stationId>.csv
              (Public, no auth/token required)

Output:       results/airport_frost_data.json   (per-airport AFI, frost depth, recommendation)
              c:/temp/aeropave/src/data/frost_data.json  (website copy)
"""
import csv
import io
import json
import math
import os
import sys
import urllib.request
from datetime import datetime

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS = os.path.join(PROJECT, 'results')
WEBSITE_DATA = r'c:/temp/aeropave/src/data'
os.makedirs(RESULTS, exist_ok=True)
os.makedirs(WEBSITE_DATA, exist_ok=True)

OUT_PATH = os.path.join(RESULTS, 'airport_frost_data.json')
WEB_PATH = os.path.join(WEBSITE_DATA, 'frost_data.json')

CSV_URL = ('https://www.ncei.noaa.gov/data/normals-daily/1991-2020/access/'
           '{station}.csv')

# Project airport -> nearest GHCN-D climate-normals station.
# Confirmed via direct CSV inspection 2026-04-23.
AIRPORT_STATIONS = {
    'KLHX': {'station': 'USC00054834', 'station_name': 'Las Animas, CO',
             'note': 'Closest available climate normals station, ~20 miles east of La Junta'},
    'KPUB': {'station': 'USW00093058', 'station_name': 'Pueblo Memorial Airport, CO',
             'note': 'Co-located with the airport'},
    'KMQJ': {'station': 'USW00093819', 'station_name': 'Indianapolis Intl, IN',
             'note': '~12 miles west of Indianapolis Regional (KMQJ) — same climate region'},
    'KCIU': {'station': 'USW00014847', 'station_name': 'Sault Ste Marie Sanderson Fld, MI',
             'note': 'Close proxy for Chippewa County Intl (KCIU)'},
    'KOTM': {'station': 'USW00014931', 'station_name': 'Burlington Muni AP, IA',
             'note': 'KOTM (Ottumwa Industrial AP) does not have its own climate-normals station; Burlington is ~80 miles east at the same latitude (similar southeastern Iowa continental climate)'},
    'KMWH': {'station': 'USW00024110', 'station_name': 'Moses Lake Grant Co AP, WA',
             'note': 'Co-located with the airport'},
}

# Per-airport subgrade frost classification — see FAA AC 150/5320-6F Table 3-2.
# FG-1: negligible (gravelly soils, <3% pass 0.02mm)
# FG-2: possible (silty gravels, sandy loams)
# FG-3: medium (silty sands, low-plasticity clays)
# FG-4: high (silts and silty clays, organics)
# Tied to the NRCS-classified subgrade we already have for each airport.
SUBGRADE_FROST_CLASS = {
    'KLHX': {'group': 'FG-3', 'soil': 'Silt Loam (A-6, CBR=7)',  'cbr': 7,
             'reason': 'Silty soils with moderate plasticity'},
    'KPUB': {'group': 'FG-1', 'soil': 'Bedrock/Shale (CBR=12)',   'cbr': 12,
             'reason': 'Bedrock substrate — negligible frost susceptibility'},
    'KMQJ': {'group': 'FG-4', 'soil': 'Silty Clay (A-7-6, CBR=4)', 'cbr': 4,
             'reason': 'Silty clay with high plasticity index — most frost-susceptible class'},
    'KCIU': {'group': 'FG-2', 'soil': 'Fine Sand (A-3, CBR=20)',   'cbr': 20,
             'reason': 'Clean sand, low frost susceptibility but shallow water table possible'},
    'KOTM': {'group': 'FG-4', 'soil': 'Silty Clay Loam (A-7-6, CBR=4)', 'cbr': 4,
             'reason': 'Silty clay loam, high plasticity'},
    'KMWH': {'group': 'FG-1', 'soil': 'Gravelly Coarse Sand (A-1-a, CBR=40)', 'cbr': 40,
             'reason': 'Coarse gravelly sand — negligible frost susceptibility'},
}

# Berggren frost-depth coefficient by soil type (modified Berggren equation,
# simplified to X = K * sqrt(AFI) where K bundles thermal conductivity, latent
# heat, and the Stefan adjustment factor for typical pavement structures).
# Values from FAA AC 150/5320-6F Figure 3-2 (frost penetration design chart),
# typical airport AC-over-PCC composite section.
#   AFI = Air Freezing Index in degree-days F
#   X   = frost penetration depth in inches
#   K   = empirical coefficient depending on subgrade soil
BERGGREN_K = {
    'FG-1': 1.40,   # gravelly sands — high thermal conductivity
    'FG-2': 1.30,
    'FG-3': 1.20,
    'FG-4': 1.10,   # silty clays — low thermal conductivity, more latent heat
}


def fetch_csv(station_id):
    """Download NOAA daily climate normals CSV for one station."""
    url = CSV_URL.format(station=station_id)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (CEE598 frost analysis)'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode('utf-8')


def parse_tavg(csv_text):
    """Extract daily TAVG normals (365 values) and station name from CSV."""
    reader = csv.DictReader(io.StringIO(csv_text))
    days, name, station = [], None, None
    for row in reader:
        if name is None:
            name = row.get('NAME')
            station = row.get('STATION')
        try:
            tavg = float(row.get('DLY-TAVG-NORMAL', 'nan'))
        except (ValueError, TypeError):
            tavg = float('nan')
        if not math.isnan(tavg) and tavg > -100:   # NOAA missing-data sentinel
            days.append({'date': row.get('DATE'),
                         'month': int(row.get('month', 0) or 0),
                         'day': int(row.get('day', 0) or 0),
                         'tavg_F': tavg})
    return name, station, days


def compute_afi(days):
    """Air Freezing Index = sum of (32 - TAVG) for days where TAVG < 32 F.
    Units: degree-F * days.  Standard FAA / Berggren input."""
    afi = 0.0
    freezing_days = 0
    coldest = (None, None)
    for d in days:
        if d['tavg_F'] < 32.0:
            afi += (32.0 - d['tavg_F'])
            freezing_days += 1
        if coldest[1] is None or d['tavg_F'] < coldest[1]:
            coldest = (d['date'], d['tavg_F'])
    return afi, freezing_days, coldest


def berggren_frost_depth(afi, k):
    """Modified Berggren frost penetration depth (in)."""
    if afi <= 0:
        return 0.0
    return round(k * math.sqrt(afi), 2)


def faa_recommendation(frost_in, frost_class, total_pavement_in=14):
    """Map frost depth + susceptibility to FAA AC 150/5320-6F treatment.

    Three FAA design approaches:
      1. Complete frost protection: total pavement >= frost depth
      2. Limited subgrade frost penetration: pavement >= 0.65 * frost depth
      3. Reduced subgrade strength: pavement designed for thawed-state subgrade

    For frost classes FG-1 (negligible): no special treatment required.
    For FG-2 to FG-4: pavement section must be checked against frost depth.
    """
    if frost_class == 'FG-1':
        return {
            'tier': 'No special treatment required',
            'design_approach': 'Standard FAARFIELD design (no frost adjustment)',
            'rationale': 'Subgrade is FG-1 (negligible frost susceptibility)',
            'compliant': True,
        }
    # FG-2/3/4 — apply frost protection check
    limited_depth = 0.65 * frost_in
    complete_depth = frost_in
    if total_pavement_in >= complete_depth:
        tier = 'Complete frost protection'
        compliant = True
        rationale = (f'Total pavement section ({total_pavement_in}") meets or exceeds '
                     f'computed frost depth ({frost_in}"); subgrade fully protected.')
    elif total_pavement_in >= limited_depth:
        tier = 'Limited subgrade frost penetration'
        compliant = True
        rationale = (f'Total pavement section ({total_pavement_in}") covers >65% of frost '
                     f'depth ({frost_in}"); some subgrade freezing acceptable per AC 150/5320-6F.')
    else:
        tier = 'INADEQUATE — frost-susceptible subgrade exposed'
        compliant = False
        rationale = (f'Total pavement section ({total_pavement_in}") is less than 65% of '
                     f'frost depth ({frost_in}"). Recommend non-frost-susceptible base/subbase '
                     f'extension to a depth of {limited_depth:.1f}" minimum, OR full reconstruction '
                     f'to {frost_in:.1f}" of non-frost-susceptible material.')
    return {
        'tier': tier,
        'design_approach': ('Reduced subgrade strength approach acceptable; or thicken '
                            'non-frost-susceptible base to full frost depth for complete protection.'),
        'rationale': rationale,
        'compliant': compliant,
        'limited_depth_required_in': round(limited_depth, 2),
        'complete_depth_required_in': round(complete_depth, 2),
        'total_pavement_in': total_pavement_in,
    }


def process_airport(icao, station_meta, sg_meta, total_pavement_in):
    print(f'\n{icao}  ({station_meta["station_name"]}, station={station_meta["station"]})')
    try:
        csv_text = fetch_csv(station_meta['station'])
        name, station_id, days = parse_tavg(csv_text)
    except Exception as e:
        print(f'  ERROR fetching {station_meta["station"]}: {e}')
        return {'icao': icao, 'error': str(e), 'station': station_meta['station']}

    afi, freezing_days, coldest = compute_afi(days)
    frost_in = berggren_frost_depth(afi, BERGGREN_K[sg_meta['group']])
    rec = faa_recommendation(frost_in, sg_meta['group'], total_pavement_in)

    print(f'  Station name (from CSV):  {name}')
    print(f'  Days with TAVG < 32 F:     {freezing_days}')
    print(f'  Coldest day:               {coldest[0]}  TAVG = {coldest[1]:.1f} F')
    print(f'  Air Freezing Index (AFI):  {afi:.1f} F-days')
    print(f'  Subgrade frost class:      {sg_meta["group"]}  ({sg_meta["soil"]})')
    print(f'  Berggren K coefficient:    {BERGGREN_K[sg_meta["group"]]}')
    print(f'  Frost penetration depth:   {frost_in} inches')
    print(f'  Treatment tier:            {rec["tier"]}')
    print(f'  Rationale:                 {rec["rationale"]}')

    return {
        'icao': icao,
        'station': station_meta['station'],
        'station_name': name,
        'station_note': station_meta['note'],
        'air_freezing_index_F_days': round(afi, 1),
        'freezing_days_per_year': freezing_days,
        'coldest_normal_day': coldest[0],
        'coldest_normal_F': round(coldest[1], 1) if coldest[1] is not None else None,
        'subgrade': {
            'frost_class': sg_meta['group'],
            'soil_description': sg_meta['soil'],
            'cbr': sg_meta['cbr'],
            'class_rationale': sg_meta['reason'],
        },
        'berggren_K': BERGGREN_K[sg_meta['group']],
        'frost_depth_in': frost_in,
        'pavement_total_in': total_pavement_in,
        'recommendation': rec,
        'monthly_tavg_F': monthly_means(days),
    }


def monthly_means(days):
    """Group days by month and compute monthly mean TAVG for chart use."""
    by_month = {}
    for d in days:
        by_month.setdefault(d['month'], []).append(d['tavg_F'])
    out = []
    for m in range(1, 13):
        if m in by_month:
            out.append({'month': m, 'tavg_F': round(sum(by_month[m]) / len(by_month[m]), 1)})
    return out


# Approximate total pavement thickness (AC overlay + PCC + base) per airport,
# using the THICKEST section per airport as the conservative case.
# These are pulled from the project sections.json data.
TOTAL_PAVEMENT_IN = {
    'KLHX': 12.0,   # 2"AC + 10"PCC for section 7347
    'KPUB': 15.5,   # 2.5"AC + 7"PCC + 6"P-154 for section 6948
    'KMQJ': 17.5,   # 3.5"AC + 8"PCC + 6"Stab for sections 8662/8881/8640/8780
    'KCIU': 26.5,   # 2.5"AC + 24"PCC for section 21222
    'KOTM': 12.0,   # 3"AC + 9"PCC for section 27450 (thickest of the three)
    'KMWH': 20.0,   # 2"AC + 6"PCC + 12"Agg Base for sections 37325/37508
}


def main():
    print('=' * 80)
    print('NOAA Climate Normals -> Air Freezing Index -> Frost Depth -> FAA Treatment')
    print('=' * 80)
    print('Source: NOAA NCEI Climate Normals 1991-2020 (public, no auth)')
    print('FAA reference: AC 150/5320-6F Frost Considerations (Chapter 3)')
    print()

    out = {
        'generated': datetime.now().isoformat(timespec='minutes'),
        'data_source': 'NOAA NCEI Climate Normals Daily 1991-2020',
        'data_source_url': 'https://www.ncei.noaa.gov/data/normals-daily/1991-2020/access/',
        'methodology': {
            'afi': 'Air Freezing Index = sum over year of max(0, 32 - TAVG_daily); units F-days',
            'frost_depth': 'Modified Berggren simplified: X = K * sqrt(AFI), K depends on FAA frost class',
            'frost_classes': 'FAA AC 150/5320-6F Table 3-2: FG-1 (negligible) to FG-4 (high susceptibility)',
            'treatment_tiers': {
                'complete_protection': 'pavement total >= frost depth',
                'limited_penetration': 'pavement total >= 0.65 * frost depth (FAA-acceptable)',
                'inadequate': 'pavement total < 0.65 * frost depth -> requires non-frost-susceptible material extension',
            },
        },
        'airports': [],
    }
    for icao, station_meta in AIRPORT_STATIONS.items():
        sg_meta = SUBGRADE_FROST_CLASS[icao]
        total_pav = TOTAL_PAVEMENT_IN[icao]
        rec = process_airport(icao, station_meta, sg_meta, total_pav)
        out['airports'].append(rec)

    with open(OUT_PATH, 'w') as f:
        json.dump(out, f, indent=2)
    with open(WEB_PATH, 'w') as f:
        json.dump(out, f, indent=2)
    print()
    print(f'Wrote: {OUT_PATH}')
    print(f'       {WEB_PATH}')


if __name__ == '__main__':
    main()
