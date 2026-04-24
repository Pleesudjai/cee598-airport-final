"""Regenerate per-airport CDF result text + markdown files from cdf_results.json.

Run after every batch update to keep the per-airport `<ICAO>_CDF_Full_Output.txt`
and `<ICAO>_CDF_Results.md` in sync with the latest authoritative
`cdf_results.json`.  Standalone — does not call the backend.
"""
import json
import os
from collections import defaultdict
from datetime import datetime

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS = os.path.join(PROJECT, 'results')
WEBSITE_DATA = os.path.join('c:/temp/aeropave/src/data')

CDF_FILE = os.path.join(RESULTS, 'cdf_results.json')

# Subgrade descriptions (mirrors central brain/Airportname.md and CLAUDE.md)
SUBGRADE_DESC = {
    'KLHX': 'Silt Loam (AASHTO A-6, NRCS), CBR=7, E=10,500 psi',
    'KPUB': 'Bedrock/Shale (NRCS), CBR=12, E=18,000 psi',
    'KMQJ': 'Silty Clay (AASHTO A-7-6, NRCS), CBR=4, E=6,000 psi',
    'KCIU': 'Fine Sand (AASHTO A-3, NRCS), CBR=20, E=30,000 psi',
    'KOTM': 'Silty Clay Loam (AASHTO A-7-6, NRCS), CBR=4, E=6,000 psi',
    'KMWH': 'Gravelly Coarse Sand (AASHTO A-1-a, NRCS), CBR=40, E=50,000 psi',
}

AIRPORT_FULL_NAMES = {
    'KLHX': 'La Junta Municipal, CO',
    'KPUB': 'Pueblo Memorial, CO',
    'KMQJ': 'Indianapolis Regional, IN',
    'KCIU': 'Chippewa County International, MI',
    'KOTM': 'Ottumwa Regional, IA',
    'KMWH': 'Grant County International, WA',
}


def load_results():
    with open(CDF_FILE, 'r') as f:
        return json.load(f)


def fmt_layer_list(layers):
    """Format layer list for compact one-line display."""
    parts = []
    for L in (layers or []):
        h = L.get('h', '?')
        E = L.get('E', '?')
        t = L.get('type', '?')
        parts.append(f"{t}({h}\"/E={E:,})" if isinstance(E, (int, float)) else f"{t}({h}\")")
    return '  '.join(parts)


def write_md(icao, rows):
    """Write the .md verdict table + per-section top-aircraft tables."""
    out_path = os.path.join(RESULTS, f'{icao}_CDF_Results.md')
    full_name = AIRPORT_FULL_NAMES.get(icao, icao)
    growth = rows[0].get('growth', 0) if rows else 0
    subgrade = SUBGRADE_DESC.get(icao, rows[0].get('subgrade', 'unknown'))
    mor = rows[0].get('mor_psi', 360)
    sci = rows[0].get('sci', 80)

    under_count = sum(1 for r in rows if not r['adequate'])
    over_count = len(rows) - under_count

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(f"# {icao} ({full_name}) — CDF Results\n\n")
        f.write("**Engine:** FAARFIELD desktop parity — LEAFClassLib (layered elastic) + AMClassLib via FAASR3D (3D rigid FEM).  \n")
        f.write(f"**Material inputs:** R = {mor} psi (FAA AC 150/5320-6F lower bound, 8% × 4500 psi assumed f'c for >20-yr aged airport PCC) · SCI = {sci} (FAARFIELD design default).  \n")
        f.write(f"**Run parameters:** life = 20 yr · growth = {growth*100:+.2f}%/yr · 41-offset lateral sweep, σ_wander = 30.435\".  \n")
        f.write(f"**Subgrade:** {subgrade}.  \n")
        f.write(f"**Verdict:** {over_count} OVER / {under_count} UNDER across {len(rows)} section(s).\n\n")

        f.write("## Verdict Summary\n\n")
        f.write("| Section | Use | Layers | CDF (max) | Controlling | Verdict |\n")
        f.write("|---|---|---|---|---|---|\n")
        for r in sorted(rows, key=lambda x: x['section_id']):
            verdict = '**UNDER**' if not r['adequate'] else '**OVER**'
            f.write(f"| {r['section_id']} | {r['use']} | {r['desc']} | {r['cdf_max']:.4e} | {r['controlling']} | {verdict} |\n")
        f.write("\n")

        f.write("## Per-Section Aircraft CDF Contributions (Top 5)\n\n")
        for r in sorted(rows, key=lambda x: x['section_id']):
            verdict = 'UNDER' if not r['adequate'] else 'OVER'
            f.write(f"### Section {r['section_id']} ({r['use']}) — {r['desc']} — {verdict}\n\n")
            f.write(f"CDF: AC = {r['cdf_ac']:.3e} · Subgrade = {r['cdf_sub']:.3e} · PCC = {r['cdf_pcc']:.3e} — **Max = {r['cdf_max']:.3e}** ({r['controlling']})\n\n")
            if r.get('control_offset_in') is not None:
                f.write(f"Controlling lateral offset ω* = {r['control_offset_in']:.0f}″ from runway centerline.\n\n")
            top = r.get('top_aircraft') or []
            if top:
                f.write("| # | Aircraft | MTOW (lb) | Gear | Aircraft CDF | Wheel-coord source |\n")
                f.write("|---|---|---|---|---|---|\n")
                for i, a in enumerate(top, 1):
                    cdf = a.get('cdf_contribution', a.get('cdf_total', 0))
                    src = a.get('wheelSource', 'xml')
                    note = a.get('wheelSourceNote', '')
                    src_str = src + (f' ({note})' if note else '')
                    f.write(f"| {i} | `{a['ac']}` | {a.get('mtow',0):,} | {a.get('gear','?')} | {cdf:.3e} | {src_str} |\n")
                f.write("\n")
            else:
                f.write("_(no per-aircraft details available)_\n\n")

        f.write(f"\n_Generated {datetime.now().strftime('%Y-%m-%d %H:%M')} from `results/cdf_results.json`._\n")
    return out_path


def write_txt(icao, rows):
    """Write a verbose log-style .txt for human review and report attachments."""
    out_path = os.path.join(RESULTS, f'{icao}_CDF_Full_Output.txt')
    full_name = AIRPORT_FULL_NAMES.get(icao, icao)
    growth = rows[0].get('growth', 0) if rows else 0
    subgrade = SUBGRADE_DESC.get(icao, rows[0].get('subgrade', 'unknown'))
    mor = rows[0].get('mor_psi', 360)
    sci = rows[0].get('sci', 80)

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(f"FAARFIELD CDF (Native Engine: LEAF + 3D Rigid FEM via FAASR3D) — {icao} ({full_name})\n")
        f.write(f"Engine: FAARFIELD_desktop_parity+FEM3D  |  useFem3d=true  |  R={mor} psi  |  SCI={sci}  |  life=20yr\n")
        f.write(f"Material rule: FAA AC 150/5320-6F lower-bound (R = 0.08 * f'c_assumed = 0.08 * 4500 = 360 psi for >20-yr aged PCC, no field cores)\n")
        f.write(f"Subgrade: {subgrade}\n")
        f.write(f"Growth: {growth*100:+.3f}%/yr over 20 yr (linear, FAARFIELD modFAILURE_MODEL_NP.vb:840)\n")
        f.write(f"Wander: sigma = 30.435\" (FAA standard for rigid pavement) over 41-offset lateral sweep (0-400\" at 10\" steps)\n")
        f.write("=" * 100 + "\n\n")

        for r in sorted(rows, key=lambda x: x['section_id']):
            verdict = 'UNDER' if not r['adequate'] else 'OVER'
            f.write(f"--- Section {r['section_id']} ({r['use']} - {r['desc']}) — {verdict} ---\n")
            f.write(f"Construction: PCC poured {r.get('pcc_year','?')}, AC overlay {r.get('overlay_year','?')} (PCC age {2026-r.get('pcc_year',2026)} yr at analysis).\n")
            f.write(f"CDF breakdown: AC={r['cdf_ac']:.4e}  Subgrade={r['cdf_sub']:.4e}  PCC={r['cdf_pcc']:.4e}  -> CDF_max = {r['cdf_max']:.4e}\n")
            f.write(f"Controlling failure mode: {r['controlling']}")
            if r.get('control_offset_in') is not None:
                f.write(f"   |   peak at lateral offset = {r['control_offset_in']:.0f}\" from centerline\n")
            else:
                f.write("\n")
            life_yrs = (20 / r['cdf_max']) if r['cdf_max'] > 0 else float('inf')
            if life_yrs < 1000:
                f.write(f"Predicted structural life: {life_yrs:.2f} yr (vs 20-yr target -> {'short by ' + str(round(20 - life_yrs, 2)) + ' yr' if life_yrs < 20 else 'meets/exceeds target by ' + str(round(life_yrs - 20, 2)) + ' yr'})\n")
            else:
                f.write(f"Predicted structural life: > 1000 yr (CDF below numerical resolution)\n")
            f.write(f"Engine: {r.get('engine','FAARFIELD_desktop_parity')}\n")

            top = r.get('top_aircraft') or []
            if top:
                f.write(f"\n  Top {len(top)} aircraft by CDF contribution:\n")
                f.write(f"  {'#':>3}  {'ICAO':<6}  {'MTOW (lb)':>10}  {'Gear':<5}  {'CDF':>10}  Source\n")
                f.write(f"  {'-'*3}  {'-'*6}  {'-'*10}  {'-'*5}  {'-'*10}  {'-'*40}\n")
                for i, a in enumerate(top, 1):
                    cdf = a.get('cdf_contribution', a.get('cdf_total', 0))
                    src = a.get('wheelSource', 'xml')
                    note = a.get('wheelSourceNote', '')
                    f.write(f"  {i:>3}  {a['ac']:<6}  {a.get('mtow',0):>10,}  {a.get('gear','?'):<5}  {cdf:>10.3e}  {src + (' (' + note + ')' if note else '')}\n")
            f.write("\n")
        f.write("=" * 100 + "\n")
        f.write(f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')} from results/cdf_results.json\n")
    return out_path


def main():
    rows = load_results()
    by_icao = defaultdict(list)
    for r in rows:
        by_icao[r['icao']].append(r)

    written_md = []
    written_txt = []
    for icao in sorted(by_icao):
        md = write_md(icao, by_icao[icao])
        tx = write_txt(icao, by_icao[icao])
        written_md.append(md)
        written_txt.append(tx)
        u = sum(1 for r in by_icao[icao] if not r['adequate'])
        o = len(by_icao[icao]) - u
        print(f"  {icao}: {len(by_icao[icao])} sections ({o} OVER / {u} UNDER) -> .md + .txt")

    print(f"\n13-section overall: {sum(1 for r in rows if r['adequate'])} OVER / {sum(1 for r in rows if not r['adequate'])} UNDER")
    print(f"Wrote {len(written_md)} markdown + {len(written_txt)} text files in results/")


if __name__ == '__main__':
    main()
