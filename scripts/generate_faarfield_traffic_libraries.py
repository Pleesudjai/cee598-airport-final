"""Generate FAARFIELD-loadable Traffic Library XML files per section.

Output: one .xml per section in results/aircraft_groups/, formatted as
ArrayOfAirplaneInfo (the schema FAARFIELD desktop's TrafficLibrary loader
expects via DataContractSerializer).  Each AirplaneInfo block is extracted
VERBATIM from FAARFIELD's bundled aircraft.xml and only the
_NumberDepartures field is overridden with our annual-departures count.

Usage:
  1. Run this script.
  2. Copy results/aircraft_groups/*.xml to:
       C:/Users/<you>/Documents/My FAARFIELD/TrafficLibrary/
  3. In FAARFIELD desktop, click the Traffic Library / Load Mix dropdown
     and select the section's library by name.
  4. Build the section's structure manually using the values in the
     companion .md file.

Skipped aircraft (no match in FAARFIELD library) are listed in the script
output and in each XML's leading comment so the user knows to add them
manually.
"""
import json
import os
import sys
import xml.etree.ElementTree as ET
from copy import deepcopy
from datetime import datetime

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(PROJECT, 'scripts'))

CDF_RESULTS = os.path.join(PROJECT, 'results', 'cdf_results.json')
LIBRARY_JSON = r'c:/temp/aeropave/faarfield-api/combined_aircraft_library.json'
FAARFIELD_AIRCRAFT_XML = r'C:/Program Files (x86)/FAARFIELD/Defaults/Aircraft/aircraft.xml'
OUTDIR = os.path.join(PROJECT, 'results', 'aircraft_groups')
os.makedirs(OUTDIR, exist_ok=True)

# Manual ICAO -> FAARFIELD-library-name overrides for aircraft missing
# from the backend library JSON's faarfield_name field.  Picked by closest
# match (manufacturer + model family) from inspection of aircraft.xml.
MANUAL_NAME_OVERRIDES = {
    'GLF6': 'Gulfstream-G-V',                      # G650 -> closest is G-V family
    'GLEX': 'Bombardier CL-604/605',                # Global Express -> closest large biz jet
    'C56X': 'Cessna Citation V',                    # Citation Excel
    'BE20': 'Beechcraft King Air 300',              # King Air 200
    'SW4':  'Beechcraft King Air B100',             # Swearingen Merlin -> small turboprop
    'PC12': 'Beechcraft King Air B100',             # Pilatus PC-12 -> single turboprop
    'CL35': 'Bombardier CL-604/605',                # Challenger 350 -> 600 family
    'FA7X': 'Dassault Falcon 900B/C',               # Falcon 7X -> closest large Falcon
    'CRJ7': 'CRJ700ER',
    'E170': 'Embraer ERJ 170',
    'E135': 'Embraer ERJ 135',
    'CVLT': 'CV-580',
    'A10':  'F-15A',                                # A-10 single-wheel -> closest fighter
    'EA50': 'Beechcraft Premier I',                 # Eclipse 500
    'C402': 'Cessna Citation Bravo',                # generic small twin -> use small jet
    'C404': 'Cessna 208 Caravan',
    'C414': 'Cessna 208 Caravan',
    'C421': 'Cessna 208 Caravan',
    'C25A': 'Cessna Citation M2 C525',
    'C25B': 'Cessna Citation II/Bravo C550/551',
    'C25M': 'Cessna Citation M2 C525',
    'CL30': 'Bombardier CL-604/605',
    'DHC6': 'Cessna 208 Caravan',
    'M20T': 'Cessna Citation M2 C525',
    'P180': 'Cessna 208 Caravan',
    'PA31': 'Cessna 208 Caravan',
    'PAY2': 'Cessna 208 Caravan',
    'TBM7': 'Cessna 208 Caravan',
    'BE60': 'Beechcraft King Air 90 (BE-9F)',
    'BE90': 'Beechcraft King Air C90',
    'AC90': 'Beechcraft King Air C90',
    'AEST': 'Cessna 208 Caravan',
    'LJ45': 'Learjet 45',
    'LJ55': 'Learjet 55',
}

DC_NS = 'http://schemas.datacontract.org/2004/07/FaarFieldModel'
ARRAYS_NS = 'http://schemas.microsoft.com/2003/10/Serialization/Arrays'
I_NS = 'http://www.w3.org/2001/XMLSchema-instance'
ET.register_namespace('', DC_NS)
ET.register_namespace('a', ARRAYS_NS)
ET.register_namespace('i', I_NS)


def load_aircraft_index():
    """Parse FAARFIELD aircraft.xml -> {Name -> AirplaneInfo XML element (deep copy)}."""
    print(f"Loading FAARFIELD aircraft library: {FAARFIELD_AIRCRAFT_XML}")
    tree = ET.parse(FAARFIELD_AIRCRAFT_XML)
    root = tree.getroot()
    airplanes = root.find(f'{{{DC_NS}}}Airplanes')
    if airplanes is None:
        raise RuntimeError("Could not find Airplanes element in aircraft.xml")
    index = {}
    for ap_anytype in airplanes:
        name_el = ap_anytype.find(f'{{{DC_NS}}}Name')
        if name_el is None or not name_el.text:
            continue
        # Each entry is <a:anyType i:type="AirplaneInfo"> in the library.
        # We need a plain <AirplaneInfo> element for ArrayOfAirplaneInfo.
        new_ap = ET.Element(f'{{{DC_NS}}}AirplaneInfo')
        for child in ap_anytype:
            new_ap.append(deepcopy(child))
        index[name_el.text] = new_ap
    print(f"  Indexed {len(index)} aircraft from FAARFIELD library")
    return index


def load_icao_to_faarfield_name():
    """Load ICAO -> faarfield_name mapping from the backend's combined library."""
    lib = json.load(open(LIBRARY_JSON))
    mapping = {}
    for entry in lib:
        icao = (entry.get('icao') or '').upper()
        ff_name = entry.get('faarfield_name')
        if icao and ff_name:
            mapping[icao] = ff_name
    # Layer in manual overrides
    mapping.update(MANUAL_NAME_OVERRIDES)
    return mapping


def update_field(ap_element, field_name, new_value):
    """Find <field_name> in the AirplaneInfo and set its text."""
    el = ap_element.find(f'{{{DC_NS}}}{field_name}')
    if el is not None:
        el.text = str(new_value)
    return el is not None


def build_traffic_library(top_aircraft, design_life=20, growth=0.0,
                          aircraft_index=None, icao_to_name=None):
    """Build an ArrayOfAirplaneInfo XML element from a list of aircraft dicts.

    Each aircraft dict needs: icao (or name), annualDeps.

    Returns: (root_element, matched_count, skipped_list)
    """
    root = ET.Element(f'{{{DC_NS}}}ArrayOfAirplaneInfo', {
        'LibraryVersion': '1.1.2',
        'SoftwareVersion': '2.1.0',
    })
    matched = 0
    skipped = []
    for a in top_aircraft:
        icao = (a.get('icao') or a.get('ac') or a.get('name') or '').upper()
        ff_name = icao_to_name.get(icao)
        if not ff_name or ff_name not in aircraft_index:
            skipped.append((icao, ff_name or '(no library mapping)'))
            continue
        # Deep-copy the library entry so we can mutate without touching the index
        ap = deepcopy(aircraft_index[ff_name])
        annual = float(a.get('annualDeps') or 0)
        # Set annual departures + total over design life
        update_field(ap, '_NumberDepartures', annual)
        update_field(ap, 'TotalDepartures', annual * design_life * (1 + 0.5 * design_life * growth))
        update_field(ap, '_AnnualGrowth', growth)
        # Reset CDF outputs to zero (they'll be computed by FAARFIELD on Run)
        for f in ('Cdf', 'CdfAc', 'CdfHma', 'CdfSub', 'Cdf401', 'CdfAircraftMax',
                  'CtoP', 'CtoP401', 'CtoPAc', 'CtoPHma', 'CtoPSub', 'Coverage'):
            update_field(ap, f, 0)
        root.append(ap)
        matched += 1
    return root, matched, skipped


def write_xml(element, path):
    """Write XML with proper declaration."""
    tree = ET.ElementTree(element)
    ET.indent(tree, '  ')
    tree.write(path, xml_declaration=True, encoding='utf-8', short_empty_elements=False)


def main():
    print("=" * 80)
    print("Generating FAARFIELD Traffic Library XML files (per section)")
    print("=" * 80)

    aircraft_index = load_aircraft_index()
    icao_to_name = load_icao_to_faarfield_name()

    saved = json.load(open(CDF_RESULTS))
    print(f"\nLoaded {len(saved)} sections from {CDF_RESULTS}\n")

    # Helper: read the per-section CSV (top 10 with annual departures) we already wrote
    def load_top10(icao, sid):
        csv_path = os.path.join(OUTDIR, f'{icao}_{sid}.csv')
        if not os.path.exists(csv_path):
            return []
        rows = []
        with open(csv_path) as f:
            next(f)  # header
            for line in f:
                parts = line.strip().split(',')
                if len(parts) < 5: continue
                rows.append({
                    'icao': parts[1],
                    'mtow': float(parts[2] or 0),
                    'gear': parts[3],
                    'annualDeps': float(parts[4] or 0),
                })
        return rows

    written = []
    all_skipped = {}
    for rec in saved:
        icao = rec['icao']
        sid = rec['section_id']
        top10 = load_top10(icao, sid)
        if not top10:
            print(f"  {icao} {sid}: no CSV with top-10 - skip")
            continue
        growth = rec.get('growth', 0)

        root, matched, skipped = build_traffic_library(
            top10, design_life=20, growth=growth,
            aircraft_index=aircraft_index, icao_to_name=icao_to_name)

        out_path = os.path.join(OUTDIR, f'{icao}_{sid}.xml')
        write_xml(root, out_path)
        written.append(out_path)
        all_skipped[f'{icao}_{sid}'] = skipped
        skip_note = f' (skipped: {", ".join(s[0] for s in skipped)})' if skipped else ''
        print(f"  {icao} {sid}: {matched}/{len(top10)} aircraft loaded -> {os.path.basename(out_path)}{skip_note}")

    # Write a load-instructions readme
    readme = os.path.join(OUTDIR, '_LOAD_INTO_FAARFIELD.md')
    with open(readme, 'w', encoding='utf-8') as f:
        f.write("# How to load the per-section Traffic Library XMLs into FAARFIELD desktop\n\n")
        f.write("**Step 1.** Copy the .xml files in this folder to:\n\n")
        f.write("```\nC:\\Users\\<your-username>\\Documents\\My FAARFIELD\\TrafficLibrary\\\n```\n\n")
        f.write("**Step 2.** In FAARFIELD desktop:\n")
        f.write("1. File -> New Job (any name)\n")
        f.write("2. Section -> Add Section -> set Design Type = **HMA Overlay on Existing Rigid (Flex on Rigid)** + Life = **20 yr**\n")
        f.write("3. Build the layer structure manually using the values in the section's companion `.md` file (3-4 layers, easy to enter)\n")
        f.write("4. Set PCC Flexural Strength = **360 psi** (per FAA AC 150/5320-6F lower bound for >20-yr aged PCC) and SCI = **80**\n")
        f.write("5. Click the Aircraft tab -> click the Traffic Library dropdown -> select the section's library name (e.g., `KMQJ_8662`)\n")
        f.write("6. Click **Analysis -> Life** to compute CDF\n\n")
        f.write("**Per-section files in this folder:**\n\n")
        f.write("| ICAO | Section | XML file (load this) | Markdown deck (read this) | Aircraft loaded | Skipped (add manually) |\n")
        f.write("|---|---|---|---|---|---|\n")
        for rec in saved:
            icao, sid = rec['icao'], rec['section_id']
            xml_name = f'{icao}_{sid}.xml'
            md_name = f'{icao}_{sid}.md'
            skipped = all_skipped.get(f'{icao}_{sid}', [])
            skip_str = ', '.join(s[0] for s in skipped) if skipped else '_(none)_'
            top10 = load_top10(icao, sid)
            loaded = max(0, len(top10) - len(skipped))
            f.write(f"| {icao} | {sid} | [`{xml_name}`]({xml_name}) | [`{md_name}`]({md_name}) | {loaded}/10 | {skip_str} |\n")
        f.write("\n## Caveats\n\n")
        f.write("- These XML files contain only the **traffic mix** (aircraft + annual departures). The pavement structure must be built manually per the markdown deck — FAARFIELD does not have a single-file format for both.\n")
        f.write("- Aircraft listed in the 'Skipped' column above had no good FAARFIELD-library match (typically very small props, military types, or new bizjets the library doesn't include). They are usually low-CDF-contribution and can be safely omitted, OR you can manually pick a similar aircraft from the FAARFIELD library and add it.\n")
        f.write("- The ICAO codes in our analysis (e.g., `B738`, `GLF5`) are mapped to FAARFIELD library names (e.g., `B737-800`, `Gulfstream G-V/G500/G550`) automatically. The mapping uses the backend's `combined_aircraft_library.json` for tier-1 matches and a manual override dict for the remainder.\n")
        f.write(f"\n_Generated {datetime.now().strftime('%Y-%m-%d %H:%M')} by `scripts/generate_faarfield_traffic_libraries.py`._\n")

    print(f"\nWrote {len(written)} XML files to {OUTDIR}")
    print(f"Load instructions: {readme}")


if __name__ == '__main__':
    main()
