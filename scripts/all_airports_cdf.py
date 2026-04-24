"""
FAARFIELD CDF Analysis — All 6 Airports (13 Sections)
CEE 598 Airport Design — Final Project
Chidchanok Pleesudjai, ASU, Spring 2026
"""

import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from faarfield_engine import analyze_section, load_traffic

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL = os.path.join(PROJECT, 'AO_CEE598_FAARFIELD.xlsx')
RESULTS = os.path.join(PROJECT, 'results')
os.makedirs(RESULTS, exist_ok=True)

FLEXURAL_STRENGTH = 700
DESIGN_LIFE = 20

# ============================================================================
# ALL 13 SECTIONS
# ============================================================================

AIRPORTS = [
    {
        'icao': 'KLHX', 'name': 'La Junta Municipal', 'state': 'CO',
        'sheet': 'Traffic346', 'growth': 0.032, 'years_span': 8,
        'subgrade_desc': 'Silt Loam (AASHTO A-6), CBR=7',
        'sections': [
            {'id': '6627', 'use': 'Taxiway', 'desc': '2.5" AC + 6" PCC',
             'layers': [
                 {'type': 'P-401 AC Overlay', 'h': 2.5, 'E': 200_000, 'nu': 0.35},
                 {'type': 'P-501 PCC', 'h': 6.0, 'E': 4_000_000, 'nu': 0.15},
                 {'type': 'Subgrade', 'h': 9999, 'E': 10_500, 'nu': 0.40}]},
            {'id': '7347', 'use': 'Taxiway', 'desc': '2" AC + 10" PCC',
             'layers': [
                 {'type': 'P-401 AC Overlay', 'h': 2.0, 'E': 200_000, 'nu': 0.35},
                 {'type': 'P-501 PCC', 'h': 10.0, 'E': 4_000_000, 'nu': 0.15},
                 {'type': 'Subgrade', 'h': 9999, 'E': 10_500, 'nu': 0.40}]},
        ]
    },
    {
        'icao': 'KPUB', 'name': 'Pueblo Memorial', 'state': 'CO',
        'sheet': 'Traffic364', 'growth': -0.007, 'years_span': 8,
        'subgrade_desc': 'Bedrock/Shale, CBR=12',
        'sections': [
            {'id': '6948', 'use': 'Taxiway', 'desc': '2.5" AC + 7" PCC + 6" P-154',
             'layers': [
                 {'type': 'P-401 AC Overlay', 'h': 2.5, 'E': 200_000, 'nu': 0.35},
                 {'type': 'P-501 PCC', 'h': 7.0, 'E': 4_000_000, 'nu': 0.15},
                 {'type': 'P-154 Subbase', 'h': 6.0, 'E': 40_000, 'nu': 0.35},
                 {'type': 'Subgrade', 'h': 9999, 'E': 18_000, 'nu': 0.40}]},
        ]
    },
    {
        'icao': 'KMQJ', 'name': 'Indianapolis Regional', 'state': 'IN',
        'sheet': 'Traffic378', 'growth': 0.005, 'years_span': 8,
        'subgrade_desc': 'Silty Clay (AASHTO A-7-6), CBR=4',
        'sections': [
            {'id': '8662', 'use': 'Taxiway TWA2', 'desc': '3.5" AC + 8" PCC + 6" Stab Base',
             'layers': [
                 {'type': 'P-401 AC Overlay', 'h': 3.5, 'E': 200_000, 'nu': 0.35},
                 {'type': 'P-501 PCC', 'h': 8.0, 'E': 4_000_000, 'nu': 0.15},
                 {'type': 'Stabilized Base', 'h': 6.0, 'E': 500_000, 'nu': 0.20},
                 {'type': 'Subgrade', 'h': 9999, 'E': 6_000, 'nu': 0.45}]},
            {'id': '8881', 'use': 'Taxiway TWA1', 'desc': '3.5" AC + 8" PCC + 6" Stab Subbase',
             'layers': [
                 {'type': 'P-401 AC Overlay', 'h': 3.5, 'E': 200_000, 'nu': 0.35},
                 {'type': 'P-501 PCC', 'h': 8.0, 'E': 4_000_000, 'nu': 0.15},
                 {'type': 'Stabilized Subbase', 'h': 6.0, 'E': 500_000, 'nu': 0.20},
                 {'type': 'Subgrade', 'h': 9999, 'E': 6_000, 'nu': 0.45}]},
            {'id': '8640', 'use': 'Taxiway TWA3', 'desc': '3.5" AC + 8" PCC + 6" Stab Base',
             'layers': [
                 {'type': 'P-401 AC Overlay', 'h': 3.5, 'E': 200_000, 'nu': 0.35},
                 {'type': 'P-501 PCC', 'h': 8.0, 'E': 4_000_000, 'nu': 0.15},
                 {'type': 'Stabilized Base', 'h': 6.0, 'E': 500_000, 'nu': 0.20},
                 {'type': 'Subgrade', 'h': 9999, 'E': 6_000, 'nu': 0.45}]},
            {'id': '8780', 'use': 'Taxiway TWA4', 'desc': '3.5" AC + 8" PCC + 6" Stab Base',
             'layers': [
                 {'type': 'P-401 AC Overlay', 'h': 3.5, 'E': 200_000, 'nu': 0.35},
                 {'type': 'P-501 PCC', 'h': 8.0, 'E': 4_000_000, 'nu': 0.15},
                 {'type': 'Stabilized Base', 'h': 6.0, 'E': 500_000, 'nu': 0.20},
                 {'type': 'Subgrade', 'h': 9999, 'E': 6_000, 'nu': 0.45}]},
        ]
    },
    {
        'icao': 'KCIU', 'name': 'Chippewa County Intl', 'state': 'MI',
        'sheet': 'Traffic1017', 'growth': -0.001, 'years_span': 8,
        'subgrade_desc': 'Fine Sand (AASHTO A-3), CBR=20',
        'sections': [
            {'id': '21222', 'use': 'Runway', 'desc': '2.5" AC + 24" PCC',
             'layers': [
                 {'type': 'P-401 AC Overlay', 'h': 2.5, 'E': 200_000, 'nu': 0.35},
                 {'type': 'P-501 PCC', 'h': 24.0, 'E': 4_000_000, 'nu': 0.15},
                 {'type': 'Subgrade', 'h': 9999, 'E': 30_000, 'nu': 0.35}]},
        ]
    },
    {
        'icao': 'KOTM', 'name': 'Ottumwa Regional', 'state': 'IA',
        'sheet': 'Traffic1356', 'growth': -0.022, 'years_span': 8,
        'subgrade_desc': 'Silty Clay Loam (AASHTO A-7-6), CBR=4',
        'sections': [
            {'id': '28171', 'use': 'Taxiway', 'desc': '2.5" AC + 8" PCC',
             'layers': [
                 {'type': 'P-401 AC Overlay', 'h': 2.5, 'E': 200_000, 'nu': 0.35},
                 {'type': 'P-501 PCC', 'h': 8.0, 'E': 4_000_000, 'nu': 0.15},
                 {'type': 'Subgrade', 'h': 9999, 'E': 6_000, 'nu': 0.45}]},
            {'id': '27450', 'use': 'Runway', 'desc': '3" AC + 9" PCC',
             'layers': [
                 {'type': 'P-401 AC Overlay', 'h': 3.0, 'E': 200_000, 'nu': 0.35},
                 {'type': 'P-501 PCC', 'h': 9.0, 'E': 4_000_000, 'nu': 0.15},
                 {'type': 'Subgrade', 'h': 9999, 'E': 6_000, 'nu': 0.45}]},
            {'id': '27641', 'use': 'Runway', 'desc': '3" AC + 8" PCC',
             'layers': [
                 {'type': 'P-401 AC Overlay', 'h': 3.0, 'E': 200_000, 'nu': 0.35},
                 {'type': 'P-501 PCC', 'h': 8.0, 'E': 4_000_000, 'nu': 0.15},
                 {'type': 'Subgrade', 'h': 9999, 'E': 6_000, 'nu': 0.45}]},
        ]
    },
    {
        'icao': 'KMWH', 'name': 'Grant County Intl', 'state': 'WA',
        'sheet': 'Traffic1863', 'growth': -0.005, 'years_span': 8,
        'subgrade_desc': 'Gravelly Coarse Sand (AASHTO A-1-a), CBR=40',
        'sections': [
            {'id': '37325', 'use': 'Runway (narrow)', 'desc': '2" AC + 6" PCC + 12" Agg Base',
             'layers': [
                 {'type': 'P-401 AC Overlay', 'h': 2.0, 'E': 200_000, 'nu': 0.35},
                 {'type': 'P-501 PCC', 'h': 6.0, 'E': 4_000_000, 'nu': 0.15},
                 {'type': 'P-209 Aggregate Base', 'h': 12.0, 'E': 75_000, 'nu': 0.35},
                 {'type': 'Subgrade', 'h': 9999, 'E': 50_000, 'nu': 0.30}]},
            {'id': '37508', 'use': 'Runway (wide)', 'desc': '2" AC + 6" PCC + 12" Agg Base',
             'layers': [
                 {'type': 'P-401 AC Overlay', 'h': 2.0, 'E': 200_000, 'nu': 0.35},
                 {'type': 'P-501 PCC', 'h': 6.0, 'E': 4_000_000, 'nu': 0.15},
                 {'type': 'P-209 Aggregate Base', 'h': 12.0, 'E': 75_000, 'nu': 0.35},
                 {'type': 'Subgrade', 'h': 9999, 'E': 50_000, 'nu': 0.30}]},
        ]
    },
]

# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    all_results = []

    for apt in AIRPORTS:
        icao = apt['icao']
        print(f"\n{'#'*80}")
        print(f"# AIRPORT: {icao} - {apt['name']}, {apt['state']}")
        print(f"# Subgrade: {apt['subgrade_desc']}")
        print(f"# Traffic: {apt['sheet']} | Growth: {apt['growth']*100:.1f}%")
        print(f"{'#'*80}")

        # Load traffic
        traffic = load_traffic(EXCEL, apt['sheet'], apt['years_span'])
        print(f"  Loaded {len(traffic)} aircraft types, {traffic['TotalDeps'].sum():.0f} total departures")

        # Open per-airport output file
        out_path = os.path.join(RESULTS, f"{icao}_CDF_Full_Output.txt")
        out = open(out_path, 'w', encoding='utf-8')
        out.write(f"FAARFIELD CDF Analysis - {icao} ({apt['name']}, {apt['state']})\n")
        out.write(f"Subgrade: {apt['subgrade_desc']}\n")
        out.write(f"Traffic: {apt['sheet']} ({len(traffic)} types) | Growth: {apt['growth']*100:.1f}%\n")
        out.write("="*80 + "\n")

        apt_results = []
        for sec in apt['sections']:
            sec_name = f"{icao} Section {sec['id']} ({sec['use']} - {sec['desc']})"
            r = analyze_section(sec_name, sec['layers'], traffic,
                                apt['growth'], DESIGN_LIFE, FLEXURAL_STRENGTH, out)
            r['icao'] = icao
            r['section_id'] = sec['id']
            r['use'] = sec['use']
            r['desc'] = sec['desc']
            r['airport_name'] = apt['name']
            r['subgrade'] = apt['subgrade_desc']
            r['growth'] = apt['growth']
            apt_results.append(r)

        out.close()
        print(f"  Saved: {out_path}")

        # Per-airport markdown
        md_path = os.path.join(RESULTS, f"{icao}_CDF_Results.md")
        with open(md_path, 'w', encoding='utf-8') as md:
            md.write(f"# {icao} ({apt['name']}, {apt['state']}) - CDF Results\n\n")
            md.write(f"## Verdict\n\n")
            md.write("| Section | Use | Layers | CDF (max) | Controlling | Verdict |\n")
            md.write("|---------|-----|--------|-----------|------------|--------|\n")
            for r in apt_results:
                v = "**OVER-DESIGNED**" if r['adequate'] else "**UNDER-DESIGNED**"
                md.write(f"| {r['section_id']} | {r['use']} | {r['desc']} | {r['cdf_max']:.4e} | {r['controlling']} | {v} |\n")
            md.write(f"\n## Parameters\n- Subgrade: {apt['subgrade_desc']}\n")
            md.write(f"- Growth: {apt['growth']*100:.1f}% | Life: {DESIGN_LIFE} yr | PCC R: {FLEXURAL_STRENGTH} psi\n")
            md.write(f"- Traffic: {len(traffic)} types, {traffic['TotalDeps'].sum():.0f} deps ({apt['years_span']} yr)\n")

            md.write(f"\n## Top Aircraft by CDF\n\n")
            for r in apt_results:
                md.write(f"\n### Section {r['section_id']} ({r['use']})\n\n")
                md.write("| Aircraft | MTOW | Gear | CDF_AC | CDF_Sub | CDF_PCC | Total |\n")
                md.write("|----------|------|------|--------|---------|---------|-------|\n")
                for d in r['details'][:10]:
                    md.write(f"| {d['Aircraft']} | {d['MTOW']:,.0f} | {d['Gear']} | {d['CDF_AC']:.2e} | {d['CDF_Sub']:.2e} | {d['CDF_PCC']:.2e} | {d['CDF_Total']:.2e} |\n")

        print(f"  Saved: {md_path}")
        all_results.extend(apt_results)

    # ========================================================================
    # GRAND SUMMARY
    # ========================================================================
    print(f"\n\n{'='*100}")
    print("GRAND SUMMARY - ALL 6 AIRPORTS, 13 SECTIONS")
    print(f"{'='*100}\n")
    print(f"{'ICAO':<6} {'Section':>7} {'Use':<18} {'Layers':<30} {'CDF_max':>12} {'Controlling':>18} {'Verdict':>16}")
    print("-"*115)

    under = 0
    over = 0
    for r in all_results:
        v = "OVER-DESIGNED" if r['adequate'] else "UNDER-DESIGNED"
        if r['adequate']: over += 1
        else: under += 1
        print(f"{r['icao']:<6} {r['section_id']:>7} {r['use']:<18} {r['desc']:<30} {r['cdf_max']:>12.4e} {r['controlling']:>18} {v:>16}")

    print(f"\nTotal: {over} OVER-DESIGNED, {under} UNDER-DESIGNED out of {len(all_results)} sections")

    # Summary markdown
    md_path = os.path.join(RESULTS, 'ALL_CDF_Summary.md')
    with open(md_path, 'w', encoding='utf-8') as md:
        md.write("# FAARFIELD CDF Analysis - All 6 Airports Summary\n\n")
        md.write(f"**{over} over-designed, {under} under-designed** out of {len(all_results)} sections\n\n")
        md.write("| ICAO | Section | Use | Layers | Subgrade | CDF (max) | Controlling | Verdict |\n")
        md.write("|------|---------|-----|--------|----------|-----------|------------|--------|\n")
        for r in all_results:
            v = "**OVER**" if r['adequate'] else "**UNDER**"
            md.write(f"| {r['icao']} | {r['section_id']} | {r['use']} | {r['desc']} | {r['subgrade']} | {r['cdf_max']:.4e} | {r['controlling']} | {v} |\n")
    print(f"\nSummary saved: {md_path}")

    # JSON for website
    json_path = os.path.join(RESULTS, 'cdf_results.json')
    json_data = []
    for r in all_results:
        json_data.append({
            'icao': r['icao'], 'airport': r['airport_name'],
            'section_id': r['section_id'], 'use': r['use'], 'desc': r['desc'],
            'subgrade': r['subgrade'], 'growth': r['growth'],
            'cdf_ac': r['cdf_ac'], 'cdf_sub': r['cdf_sub'], 'cdf_pcc': r['cdf_pcc'],
            'cdf_max': r['cdf_max'], 'controlling': r['controlling'],
            'adequate': bool(r['adequate']),
            'top_aircraft': [{'ac': d['Aircraft'], 'mtow': d['MTOW'], 'gear': d['Gear'],
                              'cdf_total': d['CDF_Total']} for d in r['details'][:5]]
        })
    with open(json_path, 'w') as f:
        json.dump(json_data, f, indent=2)
    print(f"JSON saved: {json_path}")
