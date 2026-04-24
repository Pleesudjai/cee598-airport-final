"""
FAARFIELD Engine — Reusable CDF Analysis Module
Extracted from klhx_cdf_analysis.py for use across all airports.
FAARFIELD 2.1.1 methodology: Odemark + Westergaard + Burmister, 3 failure modes.
"""

import numpy as np
from math import pi, log10, sqrt
import pandas as pd

# FAARFIELD CONSTANTS (from modCDF.vb)
AC_FAT_A, AC_FAT_B, AC_FAT_C = 2.68, 5.0, 2.665
SUB_RUT_A1, SUB_RUT_A2 = 0.000247, 0.000245
SUB_RUT_B1, SUB_RUT_B2, SUB_RUT_MULT = 0.0658, 0.559, 10000
PCC_FAT_A, PCC_FAT_B, PCC_FAT_ENDURANCE = 11.737, 12.077, 0.45
SIGMA_WANDER = 30.435
ODEMARK_F = 0.9
DEFAULT_MG_PCT = 0.95

GEAR_MAP = {
    'S': {'n_tires': 2, 'tire_pressure': 100},
    'D': {'n_tires': 4, 'tire_pressure': 170},
    '2D': {'n_tires': 8, 'tire_pressure': 190},
    '2S': {'n_tires': 8, 'tire_pressure': 100},
    '2T': {'n_tires': 8, 'tire_pressure': 190},
    '3D': {'n_tires': 12, 'tire_pressure': 200},
    '5D': {'n_tires': 20, 'tire_pressure': 180},
    '2D/2D2': {'n_tires': 16, 'tire_pressure': 195},
}

SPECIAL_AIRCRAFT = {
    'C130': {'mg_pct': 0.95, 'n_tires': 8, 'tire_pressure': 100},
    'C17': {'mg_pct': 0.95, 'n_tires': 8, 'tire_pressure': 142},
    'B738': {'mg_pct': 0.95, 'n_tires': 4, 'tire_pressure': 204},
    'B737': {'mg_pct': 0.95, 'n_tires': 4, 'tire_pressure': 195},
    'B734': {'mg_pct': 0.95, 'n_tires': 4, 'tire_pressure': 190},
    'A320': {'mg_pct': 0.95, 'n_tires': 4, 'tire_pressure': 195},
    'A319': {'mg_pct': 0.95, 'n_tires': 4, 'tire_pressure': 186},
    'K35R': {'mg_pct': 0.95, 'n_tires': 8, 'tire_pressure': 190},
}


def odemark_subgrade_strain(layers, tire_load, tire_pressure):
    a = sqrt(tire_load / tire_pressure / pi)
    E_sub = layers[-1]['E']
    h_eq = sum(ODEMARK_F * L['h'] * (L['E'] / E_sub) ** (1/3) for L in layers[:-1])
    h_eq = max(h_eq, 0.1)
    az = a / h_eq
    sigma_z = tire_pressure * (1 - 1 / (1 + az**2)**1.5)
    return abs(sigma_z / E_sub), abs(sigma_z)


def westergaard_pcc_stress(layers, tire_load, tire_pressure):
    a = sqrt(tire_load / tire_pressure / pi)
    pcc = next((L for L in layers[:-1] if L['E'] >= 1_000_000), None)
    if not pcc:
        return 0.0
    E_sub = layers[-1]['E']
    k = (E_sub / 20.15) ** (1 / 1.28405)
    ell = (pcc['E'] * pcc['h']**3 / (12 * (1 - pcc['nu']**2) * k)) ** 0.25
    if ell <= 0 or a <= 0:
        return 0.0
    return abs(3 * (1 + pcc['nu']) * tire_load / (pi * pcc['h']**2) * (np.log(ell/a) + 0.6159))


def burmister_ac_strain(layers, tire_load, tire_pressure):
    a = sqrt(tire_load / tire_pressure / pi)
    q = tire_pressure
    h_ac, E_ac, nu_ac = layers[0]['h'], layers[0]['E'], layers[0]['nu']
    h_sup = sum(L['h'] for L in layers[1:-1])
    E_sup = sum(L['h'] * L['E'] for L in layers[1:-1]) / h_sup if h_sup > 0 else layers[-1]['E']
    ha = h_ac / a if a > 0 else 1.0
    if ha > 0.01:
        gf = 1 - 1 / (1 + (a/h_ac)**2)**0.5
        sf = 1 / (1 + (E_sup/E_ac)**0.5 * ha)
        return abs((1+nu_ac) * q / E_ac * gf * sf)
    return abs(q / E_ac * 0.5)


def compute_responses(layers, tire_load, tire_pressure):
    ez, sz = odemark_subgrade_strain(layers, tire_load, tire_pressure)
    return {'eps_z_sub': ez, 'sigma_z_sub': sz,
            'sigma_pcc': westergaard_pcc_stress(layers, tire_load, tire_pressure),
            'eps_h_ac': burmister_ac_strain(layers, tire_load, tire_pressure)}


def ac_fatigue_life(eps_h, E_ac):
    if eps_h <= 0: return 1e30
    return 10 ** (AC_FAT_A - AC_FAT_B * log10(eps_h) - AC_FAT_C * log10(E_ac))


def subgrade_rutting_life(eps_v, E_sub):
    if eps_v <= 0: return 1e30
    AA = SUB_RUT_A1 + SUB_RUT_A2 * log10(E_sub)
    BB = SUB_RUT_B1 * E_sub ** SUB_RUT_B2
    return min(SUB_RUT_MULT * (AA / eps_v) ** BB, 1e30)


def pcc_fatigue_life(sigma_pcc, fr):
    if fr <= 0 or sigma_pcc <= 0: return 1e30
    SR = sigma_pcc / fr
    if SR < PCC_FAT_ENDURANCE: return 1e30
    if SR >= 1.0: return 1.0
    return 10 ** (PCC_FAT_A - PCC_FAT_B * SR)


def coverage_to_pass(tire_width):
    return tire_width / (sqrt(2 * pi) * SIGMA_WANDER)


def design_departures(annual, growth, life=20):
    """FAARFIELD formula (modFAILURE_MODEL_NP.vb line 840):
    Reps = [1 + (Life * Growth * 0.5)] * Annual * Life"""
    if abs(growth) < 1e-8: return annual * life
    return (1.0 + life * growth * 0.5) * annual * life


def get_aircraft_params(icao, gear):
    if icao in SPECIAL_AIRCRAFT:
        s = SPECIAL_AIRCRAFT[icao]
        return s['mg_pct'], s['n_tires'], s['tire_pressure']
    gc = str(gear).strip().upper()
    if gc in GEAR_MAP:
        g = GEAR_MAP[gc]
        return DEFAULT_MG_PCT, g['n_tires'], g['tire_pressure']
    return DEFAULT_MG_PCT, 2, 120


def load_traffic(excel_path, sheet_name, years_span=8):
    tr = pd.read_excel(excel_path, sheet_name=sheet_name)
    agg = tr.groupby([tr.columns[0], tr.columns[5], tr.columns[6]]).agg(
        {tr.columns[7]: 'sum'}).reset_index()
    agg.columns = ['Type', 'MTOW', 'Gear', 'TotalDeps']
    agg['AnnualDeps'] = agg['TotalDeps'] / years_span
    return agg


def analyze_section(name, layers, traffic, growth, life, fr, out):
    def p(t=""): print(t); out.write(t + "\n")

    p(f"\n{'='*80}")
    p(f"SECTION: {name}")
    p(f"{'='*80}")
    p("\nPavement Structure:")
    tt = 0
    for i, L in enumerate(layers[:-1]):
        p(f"  Layer {i+1}: {L['type']:>20} | {L['h']:>5.1f}\" | E = {L['E']:>12,} psi | nu = {L['nu']}")
        tt += L['h']
    p(f"  Subgrade: {'':>18} | {'inf':>5} | E = {layers[-1]['E']:>12,} psi | nu = {layers[-1]['nu']}  (CBR = {layers[-1]['E']/1500:.0f})")
    p(f"  Total thickness: {tt:.1f}\"")
    p(f"\n  Flexural Strength: {fr} psi | Growth: {growth*100:.2f}% | Life: {life} yr | {len(traffic)} aircraft (no filter)")

    E_ac, E_sub = layers[0]['E'], layers[-1]['E']
    cdf_ac, cdf_sub, cdf_pcc = 0.0, 0.0, 0.0
    rows = []

    for _, ac in traffic.iterrows():
        if ac['MTOW'] <= 0 or ac['AnnualDeps'] <= 0:
            continue
        mg, nt, tp = get_aircraft_params(ac['Type'], ac['Gear'])
        tl = ac['MTOW'] * mg / nt
        if tl <= 0:
            continue
        tw = 2 * sqrt(tl / tp / pi)
        deps = design_departures(ac['AnnualDeps'], growth, life)
        ctp = coverage_to_pass(tw)
        r = compute_responses(layers, tl, tp)
        nf_a = ac_fatigue_life(r['eps_h_ac'], E_ac)
        nf_s = subgrade_rutting_life(r['eps_z_sub'], E_sub)
        nf_p = pcc_fatigue_life(r['sigma_pcc'], fr)
        covs = deps * ctp
        ca = covs/nf_a if nf_a > 0 else 0
        cs = covs/nf_s if nf_s > 0 else 0
        cp = covs/nf_p if nf_p > 0 else 0
        cdf_ac += ca; cdf_sub += cs; cdf_pcc += cp
        rows.append({'Aircraft': ac['Type'], 'MTOW': ac['MTOW'], 'Gear': ac['Gear'],
                     'AnnualDep': ac['AnnualDeps'], 'DesignDep': deps,
                     'TireLoad_lb': tl, 'eps_h': r['eps_h_ac'], 'eps_z': r['eps_z_sub'],
                     'sigma_pcc': r['sigma_pcc'], 'Nf_AC': nf_a, 'Nf_Sub': nf_s, 'Nf_PCC': nf_p,
                     'CDF_AC': ca, 'CDF_Sub': cs, 'CDF_PCC': cp, 'CDF_Total': ca+cs+cp})

    rows.sort(key=lambda x: x['CDF_Total'], reverse=True)

    p(f"\n{'Aircraft':>8} {'MTOW':>8} {'Gear':>5} {'Ann':>6} {'TireLoad':>9} {'eps_h':>10} {'eps_z':>10} {'sig_pcc':>9} {'Nf_AC':>11} {'Nf_Sub':>11} {'Nf_PCC':>11} {'CDF_AC':>10} {'CDF_Sub':>10} {'CDF_PCC':>10}")
    p("-"*150)
    for r in rows[:25]:
        p(f"{r['Aircraft']:>8} {r['MTOW']:>8,.0f} {r['Gear']:>5} {r['AnnualDep']:>6.1f} {r['TireLoad_lb']:>9,.1f} {r['eps_h']:>10.2e} {r['eps_z']:>10.2e} {r['sigma_pcc']:>9.1f} {r['Nf_AC']:>11.2e} {r['Nf_Sub']:>11.2e} {r['Nf_PCC']:>11.2e} {r['CDF_AC']:>10.2e} {r['CDF_Sub']:>10.2e} {r['CDF_PCC']:>10.2e}")
    if len(rows) > 25:
        p(f"  ... and {len(rows)-25} more aircraft")

    mx = max(cdf_ac, cdf_sub, cdf_pcc)
    ctrl = "AC Fatigue" if cdf_ac == mx else ("Subgrade Rutting" if cdf_sub == mx else "PCC Fatigue")

    p(f"\n{'='*80}")
    p(f"RESULTS - {name}")
    p(f"{'='*80}")
    p(f"  CDF (AC Fatigue):        {cdf_ac:.6e}")
    p(f"  CDF (Subgrade Rutting):  {cdf_sub:.6e}")
    p(f"  CDF (PCC Fatigue):       {cdf_pcc:.6e}")
    p(f"  CDF (Maximum):           {mx:.6e}")
    p(f"  Controlling Mode:        {ctrl}")
    if mx < 1.0:
        p(f"  VERDICT:                 OVER-DESIGNED (CDF < 1.0)")
        if mx > 0: p(f"  Remaining Life Factor:   {1/mx:.1f}x")
    else:
        p(f"  VERDICT:                 UNDER-DESIGNED (CDF > 1.0)")
        p(f"  Pavement fails at:       {1/mx*100:.1f}% of design life")

    return {'section': name, 'cdf_ac': cdf_ac, 'cdf_sub': cdf_sub, 'cdf_pcc': cdf_pcc,
            'cdf_max': mx, 'controlling': ctrl, 'adequate': mx < 1.0, 'details': rows}
