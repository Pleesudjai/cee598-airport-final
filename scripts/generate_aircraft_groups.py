"""Generate per-section input decks for manual FAARFIELD desktop entry.

Reuses the EXISTING saved data from `results/cdf_results.json` (the 3-hour
batch run from 2026-04-22).  Each section's record already contains:
  - All input parameters (layers, subgrade, growth, MOR, SCI, PCC year)
  - Section CDF result (cdf_max, cdf_pcc, controlling, control_offset_in)
  - Top 5 aircraft by FEM-augmented CDF contribution (authoritative ranking)

To extend to top 10, this script issues one **LEAF-only** CDF call per
section (~1-2 sec each, ~30 sec total) and harvests ranks 6-10 from the
LEAF-only ranking.  These supplementary aircraft are clearly labeled as
LEAF-only in the output.  No new 2.5-hour FEM batch is needed.

Output:
  results/aircraft_groups/<ICAO>_<sec_id>.md   - full input deck per section
  results/aircraft_groups/<ICAO>_<sec_id>.csv  - top-10 mix as CSV
  results/aircraft_groups/_INDEX.md            - index
"""
import json
import os
import sys
import requests
import pandas as pd
from datetime import datetime

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(PROJECT, 'scripts'))

# Pull AIRPORTS, HISTORY, post_cdf, build_aircraft, mor_for_pcc_age from the batch script
import importlib.util, ast
spec_path = os.path.join(PROJECT, 'scripts', 'all_airports_cdf_with_sci_history.py')
src = open(spec_path).read()
tree = ast.parse(src)
keep_names = ('mor_for_pcc_age', 'build_aircraft', 'post_cdf')
keep_assigns = ('FLEX_STR','AGED_MOR','AGED_THRESHOLD_YRS','DESIGN_LIFE','MIN_MTOW',
                'CURRENT_YEAR','BASE','PROJECT','EXCEL','RESULTS','HISTORY','AIRPORTS')
keep = ast.Module(body=[
    n for n in tree.body
    if (isinstance(n, ast.FunctionDef) and n.name in keep_names)
       or (isinstance(n, ast.Assign)
           and any(isinstance(t, ast.Name) and t.id in keep_assigns for t in n.targets))
       or isinstance(n, (ast.Import, ast.ImportFrom))
], type_ignores=[])
ns = {'__name__': '__import__', '__file__': spec_path}
exec(compile(keep, spec_path, 'exec'), ns)

AIRPORTS = ns['AIRPORTS']
HISTORY  = ns['HISTORY']
post_cdf = ns['post_cdf']
build_aircraft = ns['build_aircraft']
mor_for_pcc_age = ns['mor_for_pcc_age']

EXCEL = os.path.join(PROJECT, 'AO_CEE598_FAARFIELD.xlsx')
OUTDIR = os.path.join(PROJECT, 'results', 'aircraft_groups')
CDF_RESULTS = os.path.join(PROJECT, 'results', 'cdf_results.json')
os.makedirs(OUTDIR, exist_ok=True)


def load_traffic_local(sheet, years_span):
    df = pd.read_excel(EXCEL, sheet_name=sheet, header=0)
    cols = list(df.columns)
    df = df.dropna(subset=[cols[0], cols[5]])
    grouped = df.groupby(cols[0]).agg(
        MTOW=(cols[5], 'first'),
        Gear=(cols[6], 'first'),
        TotalCount=(cols[7], 'sum'),
        Years=(cols[1], 'nunique'),
    ).reset_index().rename(columns={cols[0]: 'Type'})
    grouped['AnnualDeps'] = grouped['TotalCount'] / grouped['Years'].clip(lower=1)
    return grouped[['Type', 'MTOW', 'Gear', 'AnnualDeps']]


def find_section_record(saved, icao, sid):
    for r in saved:
        if r['icao'] == icao and str(r['section_id']) == str(sid):
            return r
    return None


def write_section_files(apt, sec, saved_rec, top10):
    icao = apt['icao']
    sid = sec['id']
    hist = HISTORY.get((icao, sid), {})
    pcc_year = hist.get('pcc')
    overlay_year = hist.get('overlay')
    pcc_age = (2026 - pcc_year) if pcc_year else None
    mor = saved_rec.get('mor_psi') or mor_for_pcc_age(pcc_age)
    sci = saved_rec.get('sci') or 80
    growth = apt['growth']

    md_path = os.path.join(OUTDIR, f'{icao}_{sid}.md')
    csv_path = os.path.join(OUTDIR, f'{icao}_{sid}.csv')

    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(f"# {icao} Section {sid} - FAARFIELD Desktop Input Deck\n\n")
        f.write(f"**Airport:** {apt['name']}, {apt['state']}  \n")
        f.write(f"**Section use:** {sec['use']}  \n")
        f.write(f"**Description:** {sec['desc']}  \n")
        f.write(f"**PCC poured:** {pcc_year or '?'} (age {pcc_age or '?'} yr)  \n")
        f.write(f"**Overlay placed:** {overlay_year or '?'}  \n\n")

        f.write("## Native-engine result (target to verify in desktop)\n\n")
        verdict = 'UNDER' if not saved_rec.get('adequate') else 'OVER'
        f.write(f"- CDF<sub>max</sub> = **{saved_rec['cdf_max']:.4e}** ({verdict})\n")
        f.write(f"- Controlling mode: {saved_rec['controlling']}\n")
        if saved_rec.get('control_offset_in') is not None:
            f.write(f"- Peak lateral offset omega* = {saved_rec['control_offset_in']:.0f} in from runway centerline\n")
        f.write(f"- CDF breakdown: AC = {saved_rec['cdf_ac']:.3e} | Subgrade = {saved_rec['cdf_sub']:.3e} | PCC = {saved_rec['cdf_pcc']:.3e}\n")
        f.write(f"- Engine: {saved_rec.get('engine','FAARFIELD_desktop_parity')} (LEAFClassLib + AMClassLib FAASR3D 3D rigid FEM)\n\n")

        f.write("## Design parameters (FAARFIELD desktop fields)\n\n")
        f.write("| Parameter | Value | Where in desktop GUI |\n")
        f.write("|---|---|---|\n")
        f.write("| Design type | **Flex on Rigid** (HMA overlay on existing rigid) | Section -> Add Section -> Design Type |\n")
        f.write("| Design life | **20 years** | Design tab |\n")
        f.write(f"| Annual growth rate | **{growth*100:+.3f} %/yr** (linear, FAARFIELD default formula) | Aircraft tab -> Growth |\n")
        f.write(f"| PCC flexural strength R | **{mor} psi** (FAA AC 150/5320-6F lower bound: 0.08 * f'c, f'c = 4500 psi assumed for >20-yr aged PCC) | Structure tab -> P-501 PCC -> Flexural Strength |\n")
        f.write(f"| PCC SCI | **{sci}** (FAARFIELD design default) | Structure tab -> Existing PCC -> SCI |\n")
        f.write("| Use 3D FEM | **Yes** (matches desktop's automatic AMClassLib invocation for HMA-on-rigid) | Defaults; no toggle |\n\n")

        f.write("## Layer structure (top -> bottom)\n\n")
        f.write("| # | Layer | Thickness (in) | E (psi) | Poisson nu |\n")
        f.write("|---|---|---|---|---|\n")
        for i, L in enumerate(sec['layers'], 1):
            f.write(f"| {i} | {L['type']} | {L['h']} | {L['E']:,} | {L['nu']} |\n")
        sg = sec['subgrade']
        f.write(f"| {len(sec['layers'])+1} | Subgrade ({apt['subgrade_desc']}) | infinite | {sg['E']:,} | {sg['nu']} |\n\n")

        f.write("## Top 10 aircraft by CDF contribution\n\n")
        f.write("Ranks 1-5 are from the FEM-augmented batch run (authoritative). Ranks 6-10 are from a supplementary LEAF-only ranking pass (approximate; absolute CDF values shown will not match the batch's FEM-augmented numbers, but the relative ranking is preserved).\n\n")
        f.write("| Rank | ICAO | MTOW (lb) | Gear | Annual departures | CDF contribution | Source |\n")
        f.write("|---|---|---|---|---|---|---|\n")
        for i, a in enumerate(top10, 1):
            src_label = 'FEM-augmented (batch)' if a.get('_source') == 'batch' else 'LEAF-only (supplement)'
            cdf = a.get('cdf', 0)
            f.write(f"| {i} | **{a.get('icao') or a.get('name')}** | {a.get('mtow',0):,.0f} | {a.get('gear','?')} | {a.get('annualDeps',0):.2f} | {cdf:.3e} | {src_label} |\n")
        f.write("\n")

        f.write("## How to enter into FAARFIELD desktop\n\n")
        f.write("1. **File -> New Job** named `" + f"{icao}_{sid}_AC150" + "`\n")
        f.write("2. **Section -> Add Section** with the design type and life above\n")
        f.write(f"3. **Structure tab**: build the layer table top-down. Override the PCC layer's flexural strength to **{mor} psi** and confirm SCI = **{sci}**\n")
        f.write("4. **Aircraft tab**: set growth rate, then add the top-10 aircraft (FAARFIELD's library auto-fills MTOW + gear + tire pressure + wheel coords by ICAO)\n")
        f.write("5. **Analysis -> Life**: read the resulting CDF, compare to the native-engine target above\n")
        f.write(f"6. Acceptance: desktop CDF<sub>max</sub> within roughly +/-25% of {saved_rec['cdf_max']:.3e}\n\n")

        f.write(f"---\n_Generated {datetime.now().strftime('%Y-%m-%d %H:%M')} from `results/cdf_results.json` (top 1-5) plus a LEAF-only supplementary call (top 6-10)._\n")

    with open(csv_path, 'w', encoding='utf-8') as f:
        f.write("rank,icao,mtow_lb,gear,annual_departures,growth_rate,cdf_contribution,source\n")
        for i, a in enumerate(top10, 1):
            src_label = 'batch_FEM' if a.get('_source') == 'batch' else 'LEAF_only_supplement'
            # growth_rate is per-airport (same for all sections of an airport).
            # Stored as decimal (e.g. 0.005 = 0.5%/yr) — matches FAARFIELD growth field.
            f.write(f"{i},{a.get('icao') or a.get('name')},{a.get('mtow',0):.0f},{a.get('gear','?')},{a.get('annualDeps',0):.2f},{growth:.4f},{a.get('cdf',0):.6e},{src_label}\n")

    return md_path, csv_path


def main():
    print("=" * 80)
    print("Generating per-section FAARFIELD desktop input decks")
    print("=" * 80)
    print()

    # Load existing batch results (FEM-augmented top 5)
    saved = json.load(open(CDF_RESULTS))
    print(f"Loaded {len(saved)} sections from {CDF_RESULTS}")
    print()

    written = []
    for apt in AIRPORTS:
        traffic_df = load_traffic_local(apt['sheet'], apt['years_span'])
        traffic_lookup = {row['Type'].strip().upper(): row for _, row in traffic_df.iterrows()}
        aircraft_payload = build_aircraft(traffic_df, annual_scale=1.0)

        for sec in apt['sections']:
            saved_rec = find_section_record(saved, apt['icao'], sec['id'])
            if not saved_rec:
                print(f"  {apt['icao']} {sec['id']:>5}  NOT in cdf_results.json - skip")
                continue

            hist = HISTORY.get((apt['icao'], sec['id']), {})
            pcc_age = (2026 - hist['pcc']) if hist.get('pcc') else None
            mor = mor_for_pcc_age(pcc_age)
            print(f"  {apt['icao']} {sec['id']:>5}  MOR={mor}  CDF={saved_rec['cdf_max']:.3e}  ", end='', flush=True)

            # Get top 1-5 from batch (FEM-augmented)
            top5_batch = saved_rec.get('top_aircraft', [])[:5]
            existing_icaos = {a.get('ac', '').strip().upper() for a in top5_batch}

            # Get supplementary 6-10 from LEAF-only call
            try:
                resp = post_cdf(sec['layers'], sec['subgrade'], aircraft_payload,
                                growth=apt['growth'], sci=80, flex_str=mor,
                                design_type='FlexOnRigid', use_fem=False)
            except Exception as e:
                print(f"LEAF supplement FAILED: {e}")
                resp = {'perAircraft': []}

            per_ac = resp.get('perAircraft') or []
            per_ac_sorted = sorted(per_ac, key=lambda a: a.get('cdf', 0), reverse=True)

            # Build top 10: 5 batch entries + next 5 from LEAF excluding already-included icaos
            combined = []
            for a in top5_batch:
                ac_icao = a.get('ac', '').strip().upper()
                tr = traffic_lookup.get(ac_icao, {})
                combined.append({
                    'icao': a.get('ac'),
                    'mtow': a.get('mtow'),
                    'gear': a.get('gear'),
                    'annualDeps': float(tr.get('AnnualDeps', 0)) if not isinstance(tr, dict) else tr.get('AnnualDeps', 0) if tr.get('AnnualDeps') else 0,
                    'cdf': a.get('cdf_contribution', a.get('cdf_total', 0)),
                    '_source': 'batch',
                })

            for a in per_ac_sorted:
                ac_icao = (a.get('icao') or a.get('name', '')).strip().upper()
                if ac_icao in existing_icaos:
                    continue
                combined.append({
                    'icao': a.get('icao') or a.get('name'),
                    'mtow': a.get('mtow'),
                    'gear': a.get('gear'),
                    'annualDeps': a.get('annualDeps'),
                    'cdf': a.get('cdf', 0),
                    '_source': 'leaf',
                })
                if len(combined) >= 10:
                    break

            md, csv = write_section_files(apt, sec, saved_rec, combined[:10])
            written.append((apt['icao'], sec['id'], saved_rec['cdf_max'], saved_rec['adequate'], md, csv))
            print(f"top {len(combined[:10])} (5 batch + {len(combined[:10])-5} LEAF supplement)")

    # Index
    index_path = os.path.join(OUTDIR, '_INDEX.md')
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write("# Aircraft Groups Index - FAARFIELD Desktop Input Decks\n\n")
        f.write("Per-section input decks for manual entry into FAARFIELD 2.1.1 desktop.\n\n")
        f.write("**Source data:**\n")
        f.write("- Section inputs + top-5 aircraft (FEM-augmented): from the 2026-04-22 batch run (`results/cdf_results.json`)\n")
        f.write("- Ranks 6-10 (LEAF-only supplementary): generated " + datetime.now().strftime('%Y-%m-%d %H:%M') + "\n\n")
        f.write("| ICAO | Section | Verdict | CDF_max | Markdown deck | CSV (top 10) |\n")
        f.write("|---|---|---|---|---|---|\n")
        for icao, sid, cdf, adq, md, csv in written:
            v = 'OVER' if adq else 'UNDER'
            f.write(f"| {icao} | {sid} | {v} | {cdf:.3e} | [`{os.path.basename(md)}`]({os.path.basename(md)}) | [`{os.path.basename(csv)}`]({os.path.basename(csv)}) |\n")

    print()
    print(f"Wrote {len(written)} sections to {OUTDIR}")
    print(f"Index: {index_path}")


if __name__ == '__main__':
    main()
