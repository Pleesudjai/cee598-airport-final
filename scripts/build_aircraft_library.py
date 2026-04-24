"""
Build a combined aircraft library from 3 sources:
  1. FAARFIELD aircraft.xml (5980 aircraft with EXACT tire geometry) -- PRIMARY
  2. FAA ACD Excel (2442 aircraft with MTOW, gear config, dimensions)
  3. Existing aircraft_library.json (388 matched from prior sessions)

Output: combined_aircraft_library.json

Priority: XML geometry > CSV geometry > FAA ACD > existing library
"""
import json
import os
import sys
import xml.etree.ElementTree as ET

# =====================================================================
# Source 1: FAARFIELD aircraft.xml (AUTHORITATIVE for tire geometry)
# =====================================================================
FAARFIELD_XML = r"C:\Program Files (x86)\FAARFIELD\Defaults\Aircraft\aircraft.xml"

NS = {
    'd': 'http://schemas.datacontract.org/2004/07/FaarFieldModel',
    'a': 'http://schemas.microsoft.com/2003/10/Serialization/Arrays',
}

def get_text(el, tag):
    child = el.find('d:' + tag, NS)
    if child is not None:
        return child.text
    return None

def get_us(el, tag):
    """Get the US customary value from a unit element."""
    child = el.find('d:' + tag, NS)
    if child is None:
        return None
    us = child.find('d:us', NS)
    if us is not None and us.text:
        try:
            return float(us.text)
        except:
            return None
    return None

def get_wheel_coords(el):
    """Extract WheelCoordinates as list of {x, y} dicts (inches)."""
    wc = el.find('d:WheelCoordinates', NS)
    if wc is None:
        return []
    coords = []
    for pt in wc:
        x_el = pt.find('d:X', NS)
        y_el = pt.find('d:Y', NS)
        if x_el is not None and y_el is not None:
            xu = x_el.find('d:us', NS)
            yu = y_el.find('d:us', NS)
            if xu is not None and yu is not None:
                try:
                    coords.append({'x': float(xu.text), 'y': float(yu.text)})
                except:
                    pass
    return coords

def get_eval_points(el):
    """Extract EvaluationPoints as list of {x, y} dicts (inches)."""
    ep = el.find('d:EvaluationPoints', NS)
    if ep is None:
        return []
    pts = []
    for pt in ep:
        x_el = pt.find('d:X', NS)
        y_el = pt.find('d:Y', NS)
        if x_el is not None and y_el is not None:
            xu = x_el.find('d:us', NS)
            yu = y_el.find('d:us', NS)
            if xu is not None and yu is not None:
                try:
                    pts.append({'x': float(xu.text), 'y': float(yu.text)})
                except:
                    pass
    return pts


def parse_faarfield_xml():
    """Parse FAARFIELD aircraft.xml into structured records."""
    if not os.path.exists(FAARFIELD_XML):
        print(f"  FAARFIELD XML not found at {FAARFIELD_XML}")
        return {}

    tree = ET.parse(FAARFIELD_XML)
    root = tree.getroot()
    planes = root.findall('.//a:anyType', NS)

    aircraft = {}
    skipped_belly = 0
    skipped_deprecated = 0

    for plane in planes:
        name = get_text(plane, 'Name')
        if not name:
            continue

        # IsBelly in FAARFIELD is confusing:
        #   IsBelly=true  -> this is the MAIN/WING gear record
        #   IsBelly=false -> this is the BODY CENTER (belly) gear record
        # For single-gear aircraft, IsBelly=false is the only record.
        # For multi-gear (747, A380, DC-10), both exist.
        # We want the main gear (IsBelly=true) as primary, skip center-body gear.
        is_belly = get_text(plane, 'IsBelly')
        # Skip the "Belly" suffix variants (body center gear) — they are supplementary
        if name.endswith(' Belly'):
            skipped_belly += 1
            continue

        # Skip deprecated
        deprecated = get_text(plane, 'Deprecated')
        if deprecated == 'true':
            skipped_deprecated += 1
            continue

        mfr = get_text(plane, 'Manufacturer') or ''
        gear = get_text(plane, 'Gear') or ''
        gw = get_us(plane, '_GrossWeight')
        cp = get_us(plane, 'Cp')
        mg_pct = get_text(plane, 'MgPercent')
        run_mg = get_text(plane, 'RunMgPercent')
        n_wheels = get_text(plane, 'NumberWheels')
        n_gear = get_text(plane, 'NumberGear')
        n_tire_tracks = get_text(plane, 'NumberTireTracks')
        tire_w = get_us(plane, 'TireWidth')
        tire_l = get_us(plane, 'TireLength')
        tire_a = get_us(plane, 'TireArea')
        tt = get_us(plane, 'Tt')
        gear_orient = get_text(plane, 'GearOrientation')

        wheel_coords = get_wheel_coords(plane)
        eval_points = get_eval_points(plane)

        try:
            mg_pct_f = float(mg_pct) if mg_pct else 0.95
        except:
            mg_pct_f = 0.95
        try:
            n_wheels_i = int(n_wheels) if n_wheels else 0
        except:
            n_wheels_i = 0

        rec = {
            'faarfield_name': name,
            'manufacturer': mfr,
            'mtow': gw,
            'mg_pct': mg_pct_f,
            'tire_pressure_psi': cp,
            'gear': gear,
            'n_wheels_per_gear': n_wheels_i,
            'n_gear': int(n_gear) if n_gear else 0,
            'tire_width_in': tire_w,
            'tire_length_in': tire_l,
            'tire_area_sqin': tire_a,
            'tire_track_in': tt,
            'gear_orientation': int(gear_orient) if gear_orient else 0,
            'wheel_coords': wheel_coords,
            'eval_points': eval_points,
            'source': 'FAARFIELD_XML',
            'has_tire_geometry': len(wheel_coords) > 0,
        }

        # Key by name; keep first (non-belly, non-deprecated) variant
        if name not in aircraft:
            aircraft[name] = rec

    print(f"   Parsed: {len(aircraft)} aircraft (skipped {skipped_belly} belly, {skipped_deprecated} deprecated)")
    return aircraft


# =====================================================================
# FAARFIELD name -> ICAO mapping (comprehensive)
# =====================================================================
FAARFIELD_TO_ICAO = {
    # Airbus
    'A300-B2 SB': 'A30B', 'A300-B2 std': 'A30B', 'A300-B4 std': 'A30B', 'A300-B4 LB': 'A30B',
    'A300-600 std': 'A306', 'A300-600 LB': 'A306',
    'A310-200': 'A310', 'A310-300': 'A310',
    'A318-100 std': 'A318', 'A318-100 opt': 'A318',
    'A319-100 std': 'A319', 'A319-100 opt': 'A319',
    'A320-100': 'A320', 'A320-200 Twin std': 'A320', 'A320-200 Twin opt': 'A320', 'A320 Bogie': 'A320',
    'A321-100 std': 'A321', 'A321-100 opt': 'A321', 'A321-200 std': 'A321', 'A321-200 opt': 'A321',
    'A330-200 std': 'A332', 'A330-200 opt': 'A332', 'A330-200FR': 'A332', 'A330-200FP': 'A332',
    'A330-300 std': 'A333', 'A330-300 opt': 'A333',
    'A340-200 std': 'A342', 'A340-200 opt': 'A342',
    'A340-300 std': 'A343', 'A340-300 opt': 'A343',
    'A340-500 std': 'A345', 'A340-500 HGW': 'A345',
    'A340-600 std': 'A346', 'A340-600 HGW': 'A346',
    'A350-900 Preliminary': 'A359',
    'A380': 'A388',
    'A400M TLL1': 'A400', 'A400M TLL2': 'A400', 'A400M LH': 'A400', 'A400M LN1': 'A400',
    # Boeing
    'B707-320C': 'B703', 'B720B': 'B720',
    'B717-200 HGW': 'B712',
    'B727-100C Alternate': 'B721', 'Adv. B727-200C Basic': 'B722', 'Adv. B727-200 Option': 'B722',
    'B737-100': 'B731', 'Adv. B737-200 QC': 'B732', 'Adv. B737-200 LP': 'B732',
    'B737-300': 'B733', 'B737-400': 'B734', 'B737-500': 'B735',
    'B737-600': 'B736', 'B737-700': 'B737', 'B737-800': 'B738', 'B737-900': 'B739',
    'B737-900 ER': 'B739', 'B737 BBJ': 'B737', 'B737 BBJ2': 'B738',
    'B747-100 SF': 'B741',
    'B747-200B Combi Mixed': 'B742',
    'B747-300 Combi Mixed': 'B743',
    'B747-400': 'B744', 'B747-400ER': 'B744',
    'B747-8': 'B748', 'B747-8F': 'B748',
    'B747-SP': 'B74S',
    'B757-200': 'B752', 'B757-300': 'B753',
    'B767-200': 'B762', 'B767-200 ER': 'B762',
    'B767-300': 'B763', 'B767-300 ER': 'B763', 'B767-300 ER Freighter': 'B763',
    'B767-400 ER': 'B764',
    'B777-200 Baseline': 'B772', 'B777-200 ER': 'B77L', 'B777-200 LR': 'B77L',
    'B777-300 Baseline': 'B773', 'B777-300 ER': 'B77W',
    'B777 Freighter (Preliminary)': 'B77F',
    'B787-8': 'B788', 'B787-9 (Preliminary)': 'B789',
    # McDonnell Douglas
    'DC3': 'DC3', 'DC4': 'DC4',
    'DC8-43': 'DC85', 'DC8-63/73': 'DC86',
    'DC9-32': 'DC93', 'DC9-51': 'DC95',
    'DC10-10': 'DC10', 'DC10-30/40': 'DC10',
    'MD11ER': 'MD11', 'MD83': 'MD83', 'MD90-30 ER': 'MD90',
    # Other Commercial
    'An-124': 'A124', 'An-225': 'A225',
    'BAe 146': 'B461', 'BAC 1-11 400': 'BA11', 'BAC 1-11 475': 'BA11',
    'Concorde': 'CONC',
    'Dash 7': 'DHC7',
    'ERJ-135': 'E135', 'ERJ-140': 'E140', 'ERJ-145 ER': 'E145', 'ERJ-145 EP': 'E145', 'ERJ-145 XR': 'E145',
    'EMB-170 STD': 'E170', 'EMB-175 STD': 'E75S', 'EMB-190 STD': 'E190', 'EMB-195 STD': 'E195',
    'F27 Friendship Mk500': 'F27', 'F28 Friendship Mk1000LPT': 'F28', 'F28 Friendship Mk1000HTP': 'F28',
    'Fokker 50 HTP': 'F50', 'Fokker F100': 'F100',
    'L-100-20': 'C130', 'L-1011': 'L101',
    'IL62': 'IL62', 'IL76T': 'IL76', 'IL86': 'IL86',
    # General Aviation
    'Skyhawk-172': 'C172', 'Skylane-1-82': 'C182', 'Centurion-210': 'C210', 'Stationair-206': 'C206',
    'GrnCaravan-CE-208B': 'C208',
    'Aztec-D': 'PA27', 'Chk.Arrow-PA-28-200': 'PA28', 'Chk.Six-PA-32': 'PA32',
    'Sarat.PA-32R-301': 'P32R', 'Malibu-PA-46-350P': 'PA46', 'Navajo-C': 'PA31', 'Seneca-II': 'PA34',
    'Baron-E-55': 'BE55', 'Bonanza-F-33A': 'BE33',
    'KingAir-C-90': 'BE9L', 'KingAir-B-100': 'BE10',
    'SuperKingAir-B200': 'B200', 'SuperKingAir-300': 'B350', 'SuperKingAir-350': 'B350',
    'BeechJet-400': 'BE40', 'BeechJet-400A': 'BE40',
    'Citation-525': 'C525', 'Citation-550B': 'C550', 'Citation-V': 'C560',
    'Citation-VI/VII': 'C650', 'Citation-X': 'C750',
    'Conquest-441': 'C441', 'Chancellor-414': 'C414',
    'Learjet-35A/65A': 'LJ35', 'Learjet-55': 'LJ55',
    'Gulfstream-G-II': 'GLF2', 'Gulfstream-G-III': 'GLF3',
    'Gulfstream-G-IV': 'GLF4', 'Gulfstream-G-V': 'GLF5',
    'Falcon-50': 'FA50', 'Falcon-900': 'F900', 'Falcon-2000': 'F2TH',
    'Hawker-800': 'H25B', 'Hawker-800XP': 'H25B',
    'Challenger-CL-604': 'CL60',
    'RegionalJet-200': 'CRJ2', 'RegionalJet-700': 'CRJ7',
    'Sabreliner-40': 'SBR1', 'Sabreliner-60': 'SBR2', 'Sabreliner-65': 'SBR2', 'Sabreliner-80': 'SBR2',
    'Shorts-330-200': 'SH33', 'Shorts-360': 'SH36',
    'Canadair-CL-215': 'CL2P',
    'Fokker-F-28-1000': 'F28', 'Fokker-F-28-2000': 'F28', 'Fokker-F-28-4000': 'F28',
    'DC-3': 'DC3',
    # Military
    'C-5': 'C5', 'C-17A': 'C17', 'C-123': 'C123', 'C-130': 'C130', 'C-141': 'C141',
    'F-15C': 'F15', 'F-16C': 'F16', 'F/A-18C': 'F18S',
    'KC-10': 'DC10', 'P-3': 'P3', 'P-3C': 'P3',
    # Newer XML variant names (v1.1.2 library)
    'A220-100': 'BCS1', 'A220-300': 'BCS3',
    'A319neo': 'A19N', 'A320neo': 'A20N', 'A321neo': 'A21N', 'A321XLR': 'A21N',
    'A320-200 std': 'A320', 'A320-200 opt': 'A320', 'A320-200 WV000 Bogie': 'A320',
    'A300-B2': 'A30B', 'A300-B2K': 'A30B',
    'A300-B4/C4 LGA Bogie': 'A30B', 'A300-B4/C4 Std Bogie': 'A30B',
    'A300-600 Std Bogie': 'A306', 'A300-600 LGA Bogie': 'A306',
    'A330-200 WV020': 'A332', 'A330-200 WV022': 'A332', 'A330-200 WV057': 'A332', 'A330-200 WV058': 'A332',
    'A330-200F WV000': 'A332', 'A330-200F WV001': 'A332',
    'A330-300 WV020': 'A333', 'A330-300 WV022': 'A333', 'A330-300 WV054': 'A333',
    'A330-700 Beluga XL': 'A337',
    'A330-800 WV800': 'A338', 'A330-800 WV820': 'A338',
    'A330-900 WV900': 'A339', 'A330-900 WV920': 'A339',
    'A350-900': 'A359', 'A350-1000': 'A35K',
    'A380-800 WV000': 'A388', 'A380-800 WV001': 'A388', 'A380-800 WV002': 'A388',
    'A380-800 WV006': 'A388', 'A380-800 WV007': 'A388', 'A380e': 'A388',
    'B727-200 Advanced Basic': 'B722', 'B727-200 Advanced Option': 'B722',
    'B737-200': 'B732', 'B737-200 Advanced QC': 'B732',
    'B737-7 MAX': 'B37M', 'B737-8/8-200/BBJ MAX 8': 'B38M', 'B737-9 MAX': 'B39M',
    'B767-300 ER/Freighter': 'B763',
    'B777-200': 'B772', 'B777-300': 'B773', 'B777-9': 'B779', 'B777F': 'B77F',
    'B787-9': 'B789', 'B787-10': 'B78X',
    'DC/MD-10-10/10F': 'DC10',
    'MD-83': 'MD83', 'MD-90-30 ER': 'MD90',
    'BAe 146-300/300QC/300QT': 'B463',
    'CRJ100/200': 'CRJ2', 'CRJ100ER/200ER': 'CRJ2', 'CRJ100LR/200LR': 'CRJ2',
    'CRJ700': 'CRJ7', 'CRJ900': 'CRJ9', 'CRJ1000': 'CRJX',
    'Q100/Dash 8 Series 100': 'DH8A', 'Q200/Dash 8 Series 200': 'DH8B',
    'Q300/Dash 8 Series 300': 'DH8C', 'Q400/Dash 8 Series 400': 'DH8D',
    'DHC-7': 'DHC7',
    'COMAC C919': 'C919', 'COMAC C919 ER': 'C919',
    'Saab 340B': 'SF34',
    'Cessna 172 Skyhawk': 'C172', 'Cessna 182 Skylane': 'C182',
    'Cessna C210 Centurion': 'C210', 'Cessna 206 Stationair': 'C206',
    'Cessna 208B Grand Caravan EX': 'C208',
    'Cessna 414/414A Chancellor': 'C414', 'Cessna C441 Conquest II': 'C441',
    'Cessna Citation M2 C525': 'C525', 'Cessna Citation II/Bravo C550/551': 'C550',
    'Cessna Citation V': 'C560', 'Cessna Citation VI/VII': 'C650', 'Cessna Citation X': 'C750',
    'Beechcraft King Air C90': 'BE9L', 'Beechcraft King Air B100': 'BE10',
    'Beechcraft King Air B200': 'B200', 'Beechcraft King Air 300': 'B350', 'Beechcraft King Air 350': 'B350',
    'Beechcraft Baron 55': 'BE55', 'Beechcraft Bonanza F33A': 'BE33',
    'BeechJet-400/400A': 'BE40',
    'Bombardier CL-604/605': 'CL60',
    'Dassault Falcon 50/50EX': 'FA50', 'Dassault Falcon 900B/C': 'F900', 'Dassault Falcon 2000': 'F2TH',
    'Gulfstream G-V/G500/G550': 'GLF5',
    'Hawker-800/800XP': 'H25B',
    'Learjet 35/36/35A/36A': 'LJ35', 'Learjet 45/55B': 'LJ55',
    'Fokker F27': 'F27', 'Fokker 50': 'F50', 'Fokker-F-100': 'F100',
    'Fokker-F-28-1000/2000': 'F28', 'F-28-3000/4000/6000': 'F28',
    'Sabreliner T-39': 'SBR1',
    'Shorts 330-200': 'SH33', 'Shorts 360': 'SH36',
    'PA-23-250 Aztec': 'PA27', 'PA-28R-200 Cherokee Arrow': 'PA28',
    'PA-31-325 Navajo C/R': 'PA31', 'PA-32-300 Cherokee Six': 'PA32',
    'PA-32R-301 Saratoga': 'P32R', 'PA-34-220T Seneca II/ III/ IV/V': 'PA34',
    'PA-46-350P Malibu Mirage': 'PA46',
    'IL-62': 'IL62', 'IL-76T': 'IL76',
    'TU-134A': 'T134',
    'C-130-57': 'C130', 'C-130-70': 'C130',
}


# =====================================================================
# Source 2: FAA ACD Excel
# =====================================================================
def parse_faa_acd():
    import openpyxl
    xlsx_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'FAA-Aircraft-Char-DB-AC-150-5300-13B-App-2023-02-07.xlsx'
    )
    if not os.path.exists(xlsx_path):
        print(f"  FAA ACD not found at {xlsx_path}")
        return {}

    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    ws = wb['Aircraft Database']

    aircraft = {}
    for row in ws.iter_rows(min_row=7, values_only=True):
        icao = row[2]
        if not icao or str(icao).strip() in ('', 'tbd', 'TBD'):
            continue
        icao = str(icao).strip()
        mfr = str(row[1] or '').strip()
        model = str(row[3] or '').strip()
        gear = str(row[28] or '').strip() if row[28] else ''
        mtow = None
        try:
            val = row[26]
            if val and str(val) not in ('tbd', 'TBD', ''):
                mtow = float(val)
        except:
            pass
        mgw = None
        try:
            val = row[25]
            if val and str(val) not in ('tbd', 'TBD', ''):
                mgw = float(val) * 12
        except:
            pass
        wheelbase = None
        try:
            val = row[23]
            if val and str(val) not in ('tbd', 'TBD', ''):
                wheelbase = float(val) * 12
        except:
            pass
        wingspan = None
        try:
            val = row[19]
            if val and str(val) not in ('tbd', 'TBD', ''):
                wingspan = float(val)
        except:
            pass

        rec = {
            'icao': icao, 'manufacturer': mfr, 'model': model,
            'mtow': mtow, 'gear': gear,
            'mgw_in': mgw, 'wheelbase_in': wheelbase, 'wingspan_ft': wingspan,
        }
        if icao not in aircraft:
            aircraft[icao] = rec
        elif mtow and not aircraft[icao].get('mtow'):
            aircraft[icao] = rec
    return aircraft


# =====================================================================
# Source 3: Existing aircraft_library.json
# =====================================================================
def parse_existing_library():
    lib_path = r'c:\temp\aeropave\src\data\aircraft_library_backup.json'
    # Try backup first, then original
    if not os.path.exists(lib_path):
        lib_path = r'c:\temp\aeropave\src\data\aircraft_library.json'
    if not os.path.exists(lib_path):
        return {}
    with open(lib_path) as f:
        data = json.load(f)
    aircraft = {}
    for rec in data:
        icao = rec.get('icao', '').strip()
        if icao:
            aircraft[icao] = rec
    return aircraft


# =====================================================================
# Main: combine all sources
# =====================================================================
def main():
    print("=== Building Combined Aircraft Library (XML-based) ===\n")

    # 1. Parse FAARFIELD XML (primary, authoritative)
    print("1. Parsing FAARFIELD aircraft.xml...")
    faarfield = parse_faarfield_xml()

    # 2. Parse FAA ACD Excel
    print("\n2. Parsing FAA ACD Excel...")
    faa_acd = parse_faa_acd()
    print(f"   {len(faa_acd)} aircraft with ICAO codes")

    # 3. Parse existing library
    print("\n3. Parsing existing library...")
    existing = parse_existing_library()
    print(f"   {len(existing)} aircraft")

    # 4. Build combined library keyed by ICAO
    print("\n4. Merging...")
    combined = {}

    # Start with FAA ACD (has ICAO codes)
    for icao, rec in faa_acd.items():
        combined[icao] = {
            'icao': icao,
            'manufacturer': rec.get('manufacturer', ''),
            'model': rec.get('model', ''),
            'mtow': rec.get('mtow'),
            'gear': rec.get('gear', ''),
            'mgw_in': rec.get('mgw_in'),
            'wheelbase_in': rec.get('wheelbase_in'),
            'wingspan_ft': rec.get('wingspan_ft'),
            'source': 'FAA_ACD',
            'has_tire_geometry': False,
        }

    # Merge existing library (fills gaps)
    for icao, rec in existing.items():
        if icao in combined:
            c = combined[icao]
            if not c['mtow'] and rec.get('mtow'):
                c['mtow'] = rec['mtow']
            if not c['gear'] and rec.get('gear'):
                c['gear'] = rec['gear']
        elif rec.get('icao'):
            combined[icao] = {
                'icao': icao,
                'manufacturer': rec.get('manufacturer', ''),
                'model': rec.get('model', ''),
                'mtow': rec.get('mtow'),
                'gear': rec.get('gear', ''),
                'source': 'existing',
                'has_tire_geometry': False,
            }

    # Merge FAARFIELD XML geometry (highest priority)
    matched = 0
    for ff_name, ff_rec in faarfield.items():
        icao = FAARFIELD_TO_ICAO.get(ff_name)
        if icao and icao in combined:
            c = combined[icao]
            # Only overwrite with FAARFIELD data if this is better
            if not c.get('has_tire_geometry') or c.get('source') != 'FAARFIELD_XML':
                c['faarfield_name'] = ff_name
                c['tire_pressure_psi'] = ff_rec['tire_pressure_psi']
                c['mg_pct'] = ff_rec['mg_pct']
                c['n_wheels_per_gear'] = ff_rec['n_wheels_per_gear']
                c['n_gear'] = ff_rec['n_gear']
                c['tire_width_in'] = ff_rec['tire_width_in']
                c['tire_length_in'] = ff_rec['tire_length_in']
                c['tire_area_sqin'] = ff_rec['tire_area_sqin']
                c['tire_track_in'] = ff_rec['tire_track_in']
                c['wheel_coords'] = ff_rec['wheel_coords']
                c['eval_points'] = ff_rec['eval_points']
                c['has_tire_geometry'] = ff_rec['has_tire_geometry']
                c['gear_orientation'] = ff_rec['gear_orientation']
                if ff_rec['mtow']:
                    c['mtow'] = ff_rec['mtow']
                c['source'] = 'FAARFIELD_XML+FAA_ACD'
                matched += 1
        elif ff_name.startswith(('Generic', 'SWL', 'Single Wheel')):
            # Keep generics with FF_ prefix
            combined['FF_' + ff_name.replace(' ', '_')] = {
                'icao': ff_name,
                'manufacturer': ff_rec['manufacturer'],
                'model': ff_name,
                'mtow': ff_rec['mtow'],
                'gear': ff_rec['gear'],
                'faarfield_name': ff_name,
                'tire_pressure_psi': ff_rec['tire_pressure_psi'],
                'mg_pct': ff_rec['mg_pct'],
                'n_wheels_per_gear': ff_rec['n_wheels_per_gear'],
                'n_gear': ff_rec['n_gear'],
                'tire_width_in': ff_rec['tire_width_in'],
                'tire_length_in': ff_rec['tire_length_in'],
                'tire_area_sqin': ff_rec['tire_area_sqin'],
                'tire_track_in': ff_rec['tire_track_in'],
                'wheel_coords': ff_rec['wheel_coords'],
                'eval_points': ff_rec['eval_points'],
                'has_tire_geometry': ff_rec['has_tire_geometry'],
                'gear_orientation': ff_rec['gear_orientation'],
                'source': 'FAARFIELD_XML',
            }

    print(f"   FAARFIELD XML -> ICAO matched: {matched}")
    print(f"   Total combined: {len(combined)}")

    # Stats
    with_mtow = sum(1 for c in combined.values() if c.get('mtow'))
    with_geo = sum(1 for c in combined.values() if c.get('has_tire_geometry'))
    with_gear = sum(1 for c in combined.values() if c.get('gear'))
    with_coords = sum(1 for c in combined.values() if len(c.get('wheel_coords', [])) > 0)
    print(f"   With MTOW: {with_mtow}")
    print(f"   With tire geometry (from XML): {with_geo}")
    print(f"   With wheel coordinates: {with_coords}")
    print(f"   With gear config: {with_gear}")

    # Sort and save
    result = sorted(combined.values(), key=lambda x: (x.get('manufacturer', ''), x.get('icao', '')))

    out_central = os.path.join(os.path.dirname(os.path.dirname(__file__)),
                               'central brain', 'combined_aircraft_library.json')
    out_website = r'c:\temp\aeropave\src\data\aircraft_library.json'

    with open(out_central, 'w') as f:
        json.dump(result, f, indent=2, default=str)
    print(f"\n5. Saved to: {out_central}")

    with open(out_website, 'w') as f:
        json.dump(result, f, indent=2, default=str)
    print(f"   Saved to: {out_website}")

    # Sample output
    print(f"\n=== Sample Aircraft ===")
    samples = ['B738', 'B763', 'B744', 'A388', 'C17', 'C130', 'CRJ2', 'C172']
    for icao in samples:
        ac = combined.get(icao)
        if not ac:
            continue
        n_wc = len(ac.get('wheel_coords', []))
        geo = f'YES ({n_wc} wheels)' if ac.get('has_tire_geometry') else 'no'
        tw = ac.get('tire_width_in', '')
        tw_s = f', TireW={tw:.1f}"' if tw else ''
        print(f"  {icao}: {ac.get('manufacturer','')} {ac.get('model','')}")
        print(f"    MTOW={ac.get('mtow','?')} lbs, gear={ac.get('gear','?')}, Cp={ac.get('tire_pressure_psi','?')} psi{tw_s}")
        print(f"    tire_geo={geo}")


if __name__ == '__main__':
    main()
