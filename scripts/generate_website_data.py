"""
Generate all JSON data files for the website from Excel + TAF + ACD sources.
Output: website/src/data/*.json
"""
import pandas as pd
import json
import os
import sys
import zipfile
import io

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL = os.path.join(PROJECT, 'AO_CEE598_FAARFIELD.xlsx')
BRAIN = os.path.join(PROJECT, 'central brain')
RESULTS = os.path.join(PROJECT, 'results')
OUT = os.path.join(PROJECT, 'website', 'src', 'data')
os.makedirs(OUT, exist_ok=True)

# ============================================================================
# 1. airports.json
# ============================================================================
print("1. airports.json")
airports = [
    {"icao":"KLHX","name":"La Junta Municipal","state":"CO","lat":38.05,"lon":-103.5098,"elevation":4229,"sections":["6627","7347"]},
    {"icao":"KPUB","name":"Pueblo Memorial","state":"CO","lat":38.2899,"lon":-104.498,"elevation":4729,"sections":["6948"]},
    {"icao":"KMQJ","name":"Indianapolis Regional","state":"IN","lat":39.8431,"lon":-85.8977,"elevation":862,"sections":["8662","8881","8640","8780"]},
    {"icao":"KCIU","name":"Chippewa County Intl","state":"MI","lat":46.2508,"lon":-84.4724,"elevation":799,"sections":["21222"]},
    {"icao":"KOTM","name":"Ottumwa Regional","state":"IA","lat":41.1072,"lon":-92.4472,"elevation":846,"sections":["28171","27450","27641"]},
    {"icao":"KMWH","name":"Grant County Intl","state":"WA","lat":47.2086,"lon":-119.3191,"elevation":1189,"sections":["37325","37508"]},
]
with open(os.path.join(OUT, 'airports.json'), 'w') as f:
    json.dump(airports, f, indent=2)
print(f"  -> {len(airports)} airports")

# ============================================================================
# 2. sections.json
# ============================================================================
print("2. sections.json")
sections = [
    {"section_id":"6627","icao":"KLHX","use":"Taxiway","desc":"2.5\" AC + 6\" PCC",
     "layers":[{"type":"P-401 AC","h":2.5,"E":200000,"nu":0.35},{"type":"P-501 PCC","h":6.0,"E":4000000,"nu":0.15}],
     "subgrade":{"E":10500,"cbr":7,"soil":"Silt Loam","aashto":"A-6"}},
    {"section_id":"7347","icao":"KLHX","use":"Taxiway","desc":"2\" AC + 10\" PCC",
     "layers":[{"type":"P-401 AC","h":2.0,"E":200000,"nu":0.35},{"type":"P-501 PCC","h":10.0,"E":4000000,"nu":0.15}],
     "subgrade":{"E":10500,"cbr":7,"soil":"Silt Loam","aashto":"A-6"}},
    {"section_id":"6948","icao":"KPUB","use":"Taxiway","desc":"2.5\" AC + 7\" PCC + 6\" P-154",
     "layers":[{"type":"P-401 AC","h":2.5,"E":200000,"nu":0.35},{"type":"P-501 PCC","h":7.0,"E":4000000,"nu":0.15},{"type":"P-154 Subbase","h":6.0,"E":40000,"nu":0.35}],
     "subgrade":{"E":18000,"cbr":12,"soil":"Bedrock/Shale","aashto":"Rock"}},
    {"section_id":"8662","icao":"KMQJ","use":"Taxiway TWA2","desc":"3.5\" AC + 8\" PCC + 6\" Stab",
     "layers":[{"type":"P-401 AC","h":3.5,"E":200000,"nu":0.35},{"type":"P-501 PCC","h":8.0,"E":4000000,"nu":0.15},{"type":"Stabilized Base","h":6.0,"E":500000,"nu":0.20}],
     "subgrade":{"E":6000,"cbr":4,"soil":"Silty Clay","aashto":"A-7-6"}},
    {"section_id":"8881","icao":"KMQJ","use":"Taxiway TWA1","desc":"3.5\" AC + 8\" PCC + 6\" Stab",
     "layers":[{"type":"P-401 AC","h":3.5,"E":200000,"nu":0.35},{"type":"P-501 PCC","h":8.0,"E":4000000,"nu":0.15},{"type":"Stabilized Subbase","h":6.0,"E":500000,"nu":0.20}],
     "subgrade":{"E":6000,"cbr":4,"soil":"Silty Clay","aashto":"A-7-6"}},
    {"section_id":"8640","icao":"KMQJ","use":"Taxiway TWA3","desc":"3.5\" AC + 8\" PCC + 6\" Stab",
     "layers":[{"type":"P-401 AC","h":3.5,"E":200000,"nu":0.35},{"type":"P-501 PCC","h":8.0,"E":4000000,"nu":0.15},{"type":"Stabilized Base","h":6.0,"E":500000,"nu":0.20}],
     "subgrade":{"E":6000,"cbr":4,"soil":"Silty Clay","aashto":"A-7-6"}},
    {"section_id":"8780","icao":"KMQJ","use":"Taxiway TWA4","desc":"3.5\" AC + 8\" PCC + 6\" Stab",
     "layers":[{"type":"P-401 AC","h":3.5,"E":200000,"nu":0.35},{"type":"P-501 PCC","h":8.0,"E":4000000,"nu":0.15},{"type":"Stabilized Base","h":6.0,"E":500000,"nu":0.20}],
     "subgrade":{"E":6000,"cbr":4,"soil":"Silty Clay","aashto":"A-7-6"}},
    {"section_id":"21222","icao":"KCIU","use":"Runway","desc":"2.5\" AC + 24\" PCC",
     "layers":[{"type":"P-401 AC","h":2.5,"E":200000,"nu":0.35},{"type":"P-501 PCC","h":24.0,"E":4000000,"nu":0.15}],
     "subgrade":{"E":30000,"cbr":20,"soil":"Fine Sand","aashto":"A-3"}},
    {"section_id":"28171","icao":"KOTM","use":"Taxiway","desc":"2.5\" AC + 8\" PCC",
     "layers":[{"type":"P-401 AC","h":2.5,"E":200000,"nu":0.35},{"type":"P-501 PCC","h":8.0,"E":4000000,"nu":0.15}],
     "subgrade":{"E":6000,"cbr":4,"soil":"Silty Clay Loam","aashto":"A-7-6"}},
    {"section_id":"27450","icao":"KOTM","use":"Runway","desc":"3\" AC + 9\" PCC",
     "layers":[{"type":"P-401 AC","h":3.0,"E":200000,"nu":0.35},{"type":"P-501 PCC","h":9.0,"E":4000000,"nu":0.15}],
     "subgrade":{"E":6000,"cbr":4,"soil":"Silty Clay Loam","aashto":"A-7-6"}},
    {"section_id":"27641","icao":"KOTM","use":"Runway","desc":"3\" AC + 8\" PCC",
     "layers":[{"type":"P-401 AC","h":3.0,"E":200000,"nu":0.35},{"type":"P-501 PCC","h":8.0,"E":4000000,"nu":0.15}],
     "subgrade":{"E":6000,"cbr":4,"soil":"Silty Clay Loam","aashto":"A-7-6"}},
    {"section_id":"37325","icao":"KMWH","use":"Runway","desc":"2\" AC + 6\" PCC + 12\" Agg",
     "layers":[{"type":"P-401 AC","h":2.0,"E":200000,"nu":0.35},{"type":"P-501 PCC","h":6.0,"E":4000000,"nu":0.15},{"type":"P-209 Agg Base","h":12.0,"E":75000,"nu":0.35}],
     "subgrade":{"E":50000,"cbr":40,"soil":"Gravelly Coarse Sand","aashto":"A-1-a"}},
    {"section_id":"37508","icao":"KMWH","use":"Runway","desc":"2\" AC + 6\" PCC + 12\" Agg",
     "layers":[{"type":"P-401 AC","h":2.0,"E":200000,"nu":0.35},{"type":"P-501 PCC","h":6.0,"E":4000000,"nu":0.15},{"type":"P-209 Agg Base","h":12.0,"E":75000,"nu":0.35}],
     "subgrade":{"E":50000,"cbr":40,"soil":"Gravelly Coarse Sand","aashto":"A-1-a"}},
]
with open(os.path.join(OUT, 'sections.json'), 'w') as f:
    json.dump(sections, f, indent=2)
print(f"  -> {len(sections)} sections")

# ============================================================================
# 3. traffic.json — per-airport aircraft lists from Excel
# ============================================================================
print("3. traffic.json")
traffic_map = {
    'KLHX': ('Traffic346', 8, 0.032),
    'KPUB': ('Traffic364', 8, -0.007),
    'KMQJ': ('Traffic378', 8, 0.005),
    'KCIU': ('Traffic1017', 8, -0.001),
    'KOTM': ('Traffic1356', 8, -0.022),
    'KMWH': ('Traffic1863', 8, -0.005),
}
traffic_data = {}
for icao, (sheet, yrs, growth) in traffic_map.items():
    tr = pd.read_excel(EXCEL, sheet_name=sheet)
    # FAARFIELD uses ONE annual departure number per aircraft.
    # Best approach: use the LAST YEAR of data as the current annual rate.
    # This is what an airport would enter into FAARFIELD as "current traffic".
    last_year = tr[tr.columns[1]].max()
    last_yr_data = tr[tr[tr.columns[1]] == last_year]
    agg_last = last_yr_data.groupby([tr.columns[0], tr.columns[5], tr.columns[6]]).agg(
        {tr.columns[7]: 'sum'}).reset_index()
    agg_last.columns = ['type', 'mtow', 'gear', 'annual_deps']

    # For aircraft not in the last year: use average of the last 3 years of data
    # BUT keep ALL aircraft (don't exclude any)
    last_3_years = sorted(tr[tr.columns[1]].unique())[-3:]
    last_3_data = tr[tr[tr.columns[1]].isin(last_3_years)]
    agg_3yr = last_3_data.groupby([tr.columns[0], tr.columns[5], tr.columns[6]]).agg(
        {tr.columns[7]: 'sum'}).reset_index()
    agg_3yr.columns = ['type', 'mtow', 'gear', 'total_deps_3yr']
    agg_3yr['annual_deps'] = round(agg_3yr['total_deps_3yr'] / len(last_3_years), 2)

    # For aircraft that didn't appear in last 3 years at all, use their active-year average
    all_types = tr.groupby([tr.columns[0], tr.columns[5], tr.columns[6]]).agg(
        {tr.columns[7]: 'sum', tr.columns[1]: 'nunique'}).reset_index()
    all_types.columns = ['type', 'mtow', 'gear', 'total_deps', 'active_years']
    all_types['annual_deps'] = round(all_types['total_deps'] / all_types['active_years'], 2)

    # Build per-aircraft year list for tooltip
    year_map = {}
    for _, row in tr.iterrows():
        t = row.iloc[0]
        y = int(row.iloc[1])
        d = int(row.iloc[7])
        if t not in year_map:
            year_map[t] = {}
        year_map[t][y] = year_map[t].get(y, 0) + d

    # Merge: last-year data first, then last-3-year average, then active-year average for the rest
    last_types = set(agg_last['type'])
    types_in_3yr = set(agg_3yr['type'])

    # Tag each group with its source method
    agg_last['source'] = 'base_year'
    missing_3yr = agg_3yr[~agg_3yr['type'].isin(last_types)][['type','mtow','gear','annual_deps']].copy()
    missing_3yr['source'] = 'last_3yr_avg'
    missing_all = all_types[~all_types['type'].isin(last_types | types_in_3yr)][['type','mtow','gear','annual_deps']].copy()
    missing_all['source'] = 'active_yr_avg'
    missing = pd.concat([missing_3yr, missing_all], ignore_index=True)
    agg = pd.concat([agg_last, missing], ignore_index=True)
    agg = agg[agg['mtow'] > 0]
    agg['annual_deps'] = agg['annual_deps'].round(2)

    records = []
    for _, r in agg.iterrows():
        t = r['type']
        yrs_data = year_map.get(t, {})
        years_active = sorted(yrs_data.keys())
        records.append({
            'type': t, 'mtow': r['mtow'], 'gear': r['gear'],
            'annual_deps': r['annual_deps'], 'source': r['source'],
            'years': years_active,
            'first_year': years_active[0] if years_active else None,
            'last_year_seen': years_active[-1] if years_active else None,
            'total_deps': sum(yrs_data.values()),
        })
    traffic_data[icao] = {"growth": growth, "years_span": yrs, "base_year": int(last_year), "aircraft": records}
    print(f"    {icao}: base year={int(last_year)}, {len(agg_last)} in last year, {len(missing)} from prior years, {len(records)} total")
with open(os.path.join(OUT, 'traffic.json'), 'w') as f:
    json.dump(traffic_data, f, indent=2)
print(f"  -> {len(traffic_data)} airports, {sum(len(v['aircraft']) for v in traffic_data.values())} total aircraft entries")

# ============================================================================
# 4. cdf_results.json — copy from results/
# ============================================================================
print("4. cdf_results.json")
cdf_src = os.path.join(RESULTS, 'cdf_results.json')
if os.path.exists(cdf_src):
    with open(cdf_src) as f:
        cdf = json.load(f)
    with open(os.path.join(OUT, 'cdf_results.json'), 'w') as f:
        json.dump(cdf, f, indent=2)
    print(f"  -> {len(cdf)} section results copied")
else:
    print("  !! cdf_results.json not found in results/")

# ============================================================================
# 5. taf_operations.json — from TAF_2025.zip
# ============================================================================
print("5. taf_operations.json")
taf_zip = os.path.join(BRAIN, 'TAF_2025.zip')
if os.path.exists(taf_zip):
    z = zipfile.ZipFile(taf_zip)
    with z.open('AirportsOperations.xlsx') as f:
        ops = pd.read_excel(io.BytesIO(f.read()))
    ops['locid'] = ops['locid'].str.strip()

    taf_ops = {}
    for locid in ops['locid'].unique():
        hist = ops[(ops['locid']==locid) & (ops['scenario']==0)].sort_values('ayear')
        fcast = ops[(ops['locid']==locid) & (ops['scenario']==1)].sort_values('ayear')
        def rows_to_list(df):
            return [{"year":int(r['ayear']),"ac":int(r['itn_Ac']),"at":int(r['itn_at']),
                     "ga":int(r['itn_ga']),"mil":int(r['itn_mil']),
                     "loc_ga":int(r['loc_ga']),"loc_mil":int(r['loc_mil'])} for _,r in df.iterrows()]
        taf_ops[locid] = {"historical": rows_to_list(hist), "forecast": rows_to_list(fcast)}

    with open(os.path.join(OUT, 'taf_operations.json'), 'w') as f:
        json.dump(taf_ops, f)
    print(f"  -> {len(taf_ops)} airports ({os.path.getsize(os.path.join(OUT, 'taf_operations.json'))//1024} KB)")
else:
    print("  !! TAF_2025.zip not found")

# ============================================================================
# 6. taf_based_aircraft.json
# ============================================================================
print("6. taf_based_aircraft.json")
if os.path.exists(taf_zip):
    with z.open('BasedAircraft.xlsx') as f:
        ba = pd.read_excel(io.BytesIO(f.read()))
    ba['locid'] = ba['locid'].str.strip()

    taf_ba = {}
    for locid in ba['locid'].unique():
        rows = ba[(ba['locid']==locid) & (ba['scenario']==0)].sort_values('ayear')
        taf_ba[locid] = [{"year":int(r['ayear']),"single":int(r['single']),
                          "jet":int(r['jet']),"multi":int(r['multi']),
                          "helo":int(r['helo'])} for _,r in rows.iterrows()]

    with open(os.path.join(OUT, 'taf_based_aircraft.json'), 'w') as f:
        json.dump(taf_ba, f)
    print(f"  -> {len(taf_ba)} airports ({os.path.getsize(os.path.join(OUT, 'taf_based_aircraft.json'))//1024} KB)")
else:
    print("  !! TAF_2025.zip not found")

# ============================================================================
# 7. aircraft_library.json — from FAA ACD
# ============================================================================
print("7. aircraft_library.json")
acd_path = os.path.join(BRAIN, 'FAA_Aircraft_Characteristics_Database.xlsx')
if os.path.exists(acd_path):
    acd = pd.read_excel(acd_path, sheet_name='ACD_Data')
    cols = ['ICAO_Code','Manufacturer','Model_FAA','MTOW_lb','MALW_lb',
            'Main_Gear_Config','Wheelbase_ft','Main_Gear_Width_ft','ADG','TDG']
    acd_clean = acd[cols].dropna(subset=['ICAO_Code','MTOW_lb'])
    records = []
    for _, r in acd_clean.iterrows():
        records.append({
            "icao": str(r['ICAO_Code']).strip(),
            "manufacturer": str(r['Manufacturer']).strip() if pd.notna(r['Manufacturer']) else "",
            "model": str(r['Model_FAA']).strip() if pd.notna(r['Model_FAA']) else "",
            "mtow": round(float(r['MTOW_lb'])) if pd.notna(r['MTOW_lb']) else 0,
            "malw": round(float(r['MALW_lb'])) if pd.notna(r['MALW_lb']) else 0,
            "gear": str(r['Main_Gear_Config']).strip() if pd.notna(r['Main_Gear_Config']) else "S",
            "wheelbase": round(float(r['Wheelbase_ft']),1) if pd.notna(r['Wheelbase_ft']) else 0,
            "gear_width": round(float(r['Main_Gear_Width_ft']),1) if pd.notna(r['Main_Gear_Width_ft']) else 0,
            "adg": str(r['ADG']).strip() if pd.notna(r['ADG']) else "",
            "tdg": str(r['TDG']).strip() if pd.notna(r['TDG']) else "",
        })
    with open(os.path.join(OUT, 'aircraft_library.json'), 'w') as f:
        json.dump(records, f, indent=2)
    print(f"  -> {len(records)} aircraft")
else:
    print("  !! FAA_Aircraft_Characteristics_Database.xlsx not found")

# ============================================================================
# 8. subgrade.json
# ============================================================================
print("8. subgrade.json")
subgrade = {
    "KLHX": {"soil":"Silt Loam (Minnequa)","aashto":"A-6(9)","cbr":7,"E":10500,"k":70,
             "quality":"Fair","hydro_group":"C","drainage":"Well drained",
             "horizons":[
                 {"hz":"A","top":0,"bot":15,"texture":"Loam","sand":35,"silt":44,"clay":21,"ll":33,"pi":13,"pass200":81},
                 {"hz":"Bw","top":15,"bot":51,"texture":"Silt Loam","sand":10,"silt":67,"clay":23,"ll":33,"pi":14,"pass200":90},
                 {"hz":"Bk","top":51,"bot":89,"texture":"Loam","sand":35,"silt":42,"clay":23,"ll":32,"pi":13,"pass200":73},
                 {"hz":"Cr","top":89,"bot":152,"texture":"Bedrock","sand":None,"silt":None,"clay":None,"ll":None,"pi":None,"pass200":None}]},
    "KPUB": {"soil":"Midway clay/Bedrock","aashto":"Rock","cbr":12,"E":18000,"k":120,
             "quality":"Good (weathered shale)","hydro_group":"D","drainage":"Well drained",
             "horizons":[
                 {"hz":"A","top":0,"bot":5,"texture":"Clay Loam","sand":32,"silt":31,"clay":37,"ll":50,"pi":26,"pass200":78},
                 {"hz":"C","top":5,"bot":25,"texture":"Clay","sand":26,"silt":29,"clay":45,"ll":54,"pi":31,"pass200":82},
                 {"hz":"Cr","top":25,"bot":200,"texture":"Bedrock/Shale","sand":None,"silt":None,"clay":None,"ll":None,"pi":None,"pass200":None}]},
    "KMQJ": {"soil":"Crosby silt loam","aashto":"A-7-6(17)","cbr":4,"E":6000,"k":45,
             "quality":"Poor","hydro_group":"C/D","drainage":"Somewhat poorly drained",
             "horizons":[
                 {"hz":"Ap","top":0,"bot":20,"texture":"Silt Loam","sand":18,"silt":64,"clay":18,"ll":33,"pi":12,"pass200":85},
                 {"hz":"BE","top":20,"bot":28,"texture":"Silt Loam","sand":20,"silt":63,"clay":17,"ll":30,"pi":11,"pass200":75},
                 {"hz":"Bt","top":28,"bot":36,"texture":"Silt Loam","sand":20,"silt":55,"clay":25,"ll":36,"pi":17,"pass200":75},
                 {"hz":"2Bt","top":36,"bot":71,"texture":"Silty Clay","sand":18,"silt":42,"clay":40,"ll":50,"pi":28,"pass200":72},
                 {"hz":"2BCt","top":71,"bot":91,"texture":"Loam","sand":33.5,"silt":40.5,"clay":26,"ll":35,"pi":16,"pass200":60},
                 {"hz":"2Cd","top":91,"bot":200,"texture":"Loam","sand":42,"silt":40.5,"clay":17.5,"ll":27,"pi":10,"pass200":54}]},
    "KCIU": {"soil":"Liminga fine sand","aashto":"A-3","cbr":20,"E":30000,"k":170,
             "quality":"Good","hydro_group":"A","drainage":"Well drained",
             "horizons":[
                 {"hz":"Oe","top":0,"bot":3,"texture":"Mucky Peat","sand":5,"silt":90,"clay":5,"ll":None,"pi":None,"pass200":95},
                 {"hz":"E","top":3,"bot":18,"texture":"Fine Sand","sand":94,"silt":5,"clay":1,"ll":0,"pi":0,"pass200":15},
                 {"hz":"Bhs","top":18,"bot":23,"texture":"Fine Sand","sand":93,"silt":4,"clay":3,"ll":0,"pi":0,"pass200":15},
                 {"hz":"Bs","top":23,"bot":56,"texture":"Fine Sand","sand":95,"silt":3,"clay":2,"ll":0,"pi":0,"pass200":12},
                 {"hz":"BC","top":56,"bot":79,"texture":"Fine Sand","sand":98,"silt":1.5,"clay":0.5,"ll":0,"pi":0,"pass200":10},
                 {"hz":"C","top":79,"bot":203,"texture":"Fine Sand","sand":99,"silt":0.8,"clay":0.2,"ll":0,"pi":0,"pass200":10}]},
    "KOTM": {"soil":"Taintor silty clay loam","aashto":"A-7-6(20)","cbr":4,"E":6000,"k":45,
             "quality":"Poor","hydro_group":"D","drainage":"Poorly drained",
             "horizons":[
                 {"hz":"Ap","top":0,"bot":23,"texture":"Silty Clay Loam","sand":2,"silt":68,"clay":30,"ll":48,"pi":21,"pass200":99},
                 {"hz":"A1","top":23,"bot":41,"texture":"Silty Clay Loam","sand":2,"silt":64,"clay":34,"ll":50,"pi":24,"pass200":99},
                 {"hz":"A2","top":41,"bot":51,"texture":"Silty Clay Loam","sand":2,"silt":61,"clay":37,"ll":52,"pi":26,"pass200":99},
                 {"hz":"Btg1","top":51,"bot":61,"texture":"Silty Clay","sand":2,"silt":57,"clay":41,"ll":52,"pi":30,"pass200":99},
                 {"hz":"Btg2","top":61,"bot":71,"texture":"Silty Clay","sand":2,"silt":58,"clay":40,"ll":51,"pi":29,"pass200":99},
                 {"hz":"Btg3","top":71,"bot":91,"texture":"Silty Clay Loam","sand":2,"silt":62,"clay":36,"ll":47,"pi":26,"pass200":99},
                 {"hz":"Btg4","top":91,"bot":117,"texture":"Silty Clay Loam","sand":2,"silt":65,"clay":33,"ll":44,"pi":23,"pass200":99},
                 {"hz":"Cg","top":117,"bot":152,"texture":"Silty Clay Loam","sand":2,"silt":70,"clay":28,"ll":39,"pi":19,"pass200":99}]},
    "KMWH": {"soil":"Malaga stony sandy loam","aashto":"A-1-a","cbr":40,"E":50000,"k":300,
             "quality":"Excellent","hydro_group":"B","drainage":"Somewhat excessively drained",
             "horizons":[
                 {"hz":"H1","top":0,"bot":15,"texture":"Stony Sandy Loam","sand":66.6,"silt":23.4,"clay":10,"ll":25,"pi":2.5,"pass200":42.5},
                 {"hz":"H2","top":15,"bot":28,"texture":"Gravelly Sandy Loam","sand":66.6,"silt":23.4,"clay":10,"ll":25,"pi":2.5,"pass200":37.5},
                 {"hz":"H3","top":28,"bot":46,"texture":"V.Gravelly Sandy Loam","sand":66.6,"silt":23.4,"clay":10,"ll":25,"pi":2.5,"pass200":20},
                 {"hz":"H4","top":46,"bot":152,"texture":"Ext.Gravelly Coarse Sand","sand":91,"silt":6.5,"clay":2.5,"ll":None,"pi":0,"pass200":5}]},
}
with open(os.path.join(OUT, 'subgrade.json'), 'w') as f:
    json.dump(subgrade, f, indent=2)
print(f"  -> {len(subgrade)} airports")

print("\nDone! All JSON files in:", OUT)
for fn in sorted(os.listdir(OUT)):
    sz = os.path.getsize(os.path.join(OUT, fn))
    print(f"  {fn:>30} {sz:>10,} bytes ({sz//1024} KB)")
