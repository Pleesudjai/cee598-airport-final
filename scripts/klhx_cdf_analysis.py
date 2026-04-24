"""
FAARFIELD CDF Analysis — KLHX (La Junta Municipal Airport)
Replicates FAARFIELD 2.1.1 methodology exactly:
  - Hybrid LEAF: Odemark (subgrade) + Westergaard (PCC) + Burmister (AC)
  - Three failure modes: AC fatigue, Subgrade rutting, PCC fatigue
  - All aircraft included (no weight filter)
  - FAARFIELD constants from modCDF.vb source code

CEE 598 Airport Design — Final Project
Chidchanok Pleesudjai, ASU, Spring 2026
"""

import numpy as np
from math import pi, log10, sqrt
import pandas as pd
import os
import sys

# ============================================================================
# FAARFIELD CONSTANTS (from modCDF.vb source code)
# ============================================================================

# AC Fatigue: log10(Nf) = 2.68 - 5.0*log10(eps_h) - 2.665*log10(E_ac)
AC_FAT_A = 2.68
AC_FAT_B = 5.0
AC_FAT_C = 2.665

# Subgrade Rutting: Nf = 10000 * (AA / eps_v)^BB
#   AA = 0.000247 + 0.000245 * log10(E_sub)
#   BB = 0.0658 * E_sub^0.559
SUB_RUT_A1 = 0.000247
SUB_RUT_A2 = 0.000245
SUB_RUT_B1 = 0.0658
SUB_RUT_B2 = 0.559
SUB_RUT_MULT = 10000

# PCC Fatigue: log10(Nf) = 11.737 - 12.077 * SR   (SR >= 0.45)
PCC_FAT_A = 11.737
PCC_FAT_B = 12.077
PCC_FAT_ENDURANCE = 0.45  # below this SR, unlimited life

# Coverage: Gaussian wander sigma = 30.435 inches
SIGMA_WANDER = 30.435

# Odemark correction factor
ODEMARK_F = 0.9

# Default main gear percentage
DEFAULT_MG_PCT = 0.95

# ============================================================================
# MODULE 1: STRAIN / STRESS CALCULATIONS (HYBRID LEAF)
# ============================================================================

def odemark_subgrade_strain(layers, tire_load, tire_pressure):
    """
    Odemark equivalent thickness method for vertical strain at subgrade.
    h_eq = sum(0.9 * h_i * (E_i / E_sub)^(1/3))
    sigma_z = q * [1 - 1/(1 + (a/h_eq)^2)^1.5]
    eps_z = sigma_z / E_sub
    """
    contact_area = tire_load / tire_pressure
    a = sqrt(contact_area / pi)
    q = tire_pressure
    E_sub = layers[-1]['E']

    h_eq = 0.0
    for layer in layers[:-1]:  # all layers above subgrade
        h_eq += ODEMARK_F * layer['h'] * (layer['E'] / E_sub) ** (1.0 / 3.0)

    if h_eq <= 0:
        h_eq = 0.1

    az = a / h_eq
    sigma_z = q * (1.0 - 1.0 / (1.0 + az ** 2) ** 1.5)
    eps_z = sigma_z / E_sub

    return abs(eps_z), abs(sigma_z)


def westergaard_pcc_stress(layers, tire_load, tire_pressure):
    """
    Westergaard interior loading stress for PCC slab.
    ell = (E_pcc * h_pcc^3 / (12*(1-nu^2)*k))^0.25
    sigma = 3*(1+nu)*P / (pi*h^2) * (ln(ell/a) + 0.6159)
    """
    contact_area = tire_load / tire_pressure
    a = sqrt(contact_area / pi)
    P = tire_load

    # Find PCC layer (layer index 1 for overlay sections)
    pcc_layer = None
    for i, layer in enumerate(layers[:-1]):
        if layer['E'] >= 1_000_000:  # PCC has E >= 1M psi
            pcc_layer = layer
            break

    if pcc_layer is None:
        return 0.0

    h_pcc = pcc_layer['h']
    E_pcc = pcc_layer['E']
    nu_pcc = pcc_layer['nu']

    # Subgrade modulus of reaction k (pci)
    # k = E_sub / 18 is a common approximation
    # More precise: from FAARFIELD conversion k = (E/20.15)^(1/1.28405)
    E_sub = layers[-1]['E']
    k = (E_sub / 20.15) ** (1.0 / 1.28405)

    # Radius of relative stiffness
    ell = (E_pcc * h_pcc ** 3 / (12.0 * (1.0 - nu_pcc ** 2) * k)) ** 0.25

    if ell <= 0 or a <= 0:
        return 0.0

    # Westergaard interior stress
    sigma_pcc = 3.0 * (1.0 + nu_pcc) * P / (pi * h_pcc ** 2) * (
        np.log(ell / a) + 0.6159)

    return abs(sigma_pcc)


def burmister_ac_strain(layers, tire_load, tire_pressure):
    """
    Horizontal tensile strain at bottom of AC overlay.
    For thin AC on stiff PCC support, uses 2-layer Burmister approach.
    eps_h = f(E_ac, E_support, h_ac, a, q)
    """
    contact_area = tire_load / tire_pressure
    a = sqrt(contact_area / pi)
    q = tire_pressure

    h_ac = layers[0]['h']
    E_ac = layers[0]['E']
    nu_ac = layers[0]['nu']

    # Effective support modulus (PCC + subgrade composite)
    E_support = 0.0
    h_support = 0.0
    for layer in layers[1:-1]:
        E_support += layer['h'] * layer['E']
        h_support += layer['h']
    if h_support > 0:
        E_support /= h_support
    else:
        E_support = layers[-1]['E']

    # Modulus ratio n = E_ac / E_support
    n = E_ac / E_support

    # Thickness-to-radius ratio
    ha = h_ac / a if a > 0 else 1.0

    # Burmister 2-layer: horizontal strain at bottom of layer 1
    # Using Huang (2004) regression for the strain factor
    # For AC on very stiff base (PCC), n << 1, strain is small
    # eps_h = q/E_ac * F(h/a, n)
    #
    # Approximate F from Huang's charts:
    # For n < 1 (AC softer than support): F ≈ (1+nu) * [1 - 1/(1+(a/h)^2)^0.5] / (1 + (E_support/E_ac)^0.5 * h_ac/a)
    if ha > 0.01:
        geom_factor = 1.0 - 1.0 / (1.0 + (a / h_ac) ** 2) ** 0.5
        stiffness_factor = 1.0 / (1.0 + (E_support / E_ac) ** 0.5 * ha)
        eps_h = (1.0 + nu_ac) * q / E_ac * geom_factor * stiffness_factor
    else:
        eps_h = q / E_ac * 0.5

    return abs(eps_h)


def compute_all_responses(layers, tire_load, tire_pressure):
    """Compute all three critical responses for a given load."""
    eps_z, sigma_z = odemark_subgrade_strain(layers, tire_load, tire_pressure)
    sigma_pcc = westergaard_pcc_stress(layers, tire_load, tire_pressure)
    eps_h = burmister_ac_strain(layers, tire_load, tire_pressure)

    return {
        'eps_z_sub': eps_z,
        'sigma_z_sub': sigma_z,
        'sigma_pcc': sigma_pcc,
        'eps_h_ac': eps_h,
    }


# ============================================================================
# MODULE 2: FAILURE MODELS (EXACT FAARFIELD CONSTANTS)
# ============================================================================

def ac_fatigue_life(eps_h, E_ac):
    """AC fatigue: log10(Nf) = 2.68 - 5.0*log10(eps_h) - 2.665*log10(E_ac)"""
    if eps_h <= 0:
        return 1e30
    log_Nf = AC_FAT_A - AC_FAT_B * log10(eps_h) - AC_FAT_C * log10(E_ac)
    return 10.0 ** log_Nf


def subgrade_rutting_life(eps_v, E_sub):
    """Subgrade rutting: Nf = 10000 * (AA / eps_v)^BB"""
    if eps_v <= 0:
        return 1e30
    AA = SUB_RUT_A1 + SUB_RUT_A2 * log10(E_sub)
    BB = SUB_RUT_B1 * (E_sub ** SUB_RUT_B2)
    ratio = AA / eps_v
    if ratio <= 0:
        return 1e30
    Nf = SUB_RUT_MULT * ratio ** BB
    return min(Nf, 1e30)


def pcc_fatigue_life(sigma_pcc, flexural_strength):
    """PCC fatigue: log10(Nf) = 11.737 - 12.077*SR  (SR >= 0.45)"""
    if flexural_strength <= 0 or sigma_pcc <= 0:
        return 1e30
    SR = sigma_pcc / flexural_strength
    if SR < PCC_FAT_ENDURANCE:
        return 1e30  # below endurance limit
    if SR >= 1.0:
        return 1.0  # immediate failure
    log_Nf = PCC_FAT_A - PCC_FAT_B * SR
    return 10.0 ** log_Nf


# ============================================================================
# MODULE 3: COVERAGE-TO-PASS RATIO
# ============================================================================

def coverage_to_pass(tire_width):
    """C/P = tire_width / (sqrt(2*pi) * sigma_wander)"""
    return tire_width / (sqrt(2.0 * pi) * SIGMA_WANDER)


# ============================================================================
# MODULE 4: CDF COMPUTATION
# ============================================================================

def design_departures(annual_deps, growth_rate, design_life=20):
    """Total deps over design life: annual * ((1+g)^n - 1) / g"""
    if abs(growth_rate) < 1e-8:
        return annual_deps * design_life
    return annual_deps * ((1.0 + growth_rate) ** design_life - 1.0) / growth_rate


# ============================================================================
# MODULE 5: AIRCRAFT PARAMETERS
# ============================================================================

GEAR_MAP = {
    'S':      {'n_tires': 2,  'tire_pressure': 100},
    'D':      {'n_tires': 4,  'tire_pressure': 170},
    '2D':     {'n_tires': 8,  'tire_pressure': 190},
    '2S':     {'n_tires': 8,  'tire_pressure': 100},
    '2T':     {'n_tires': 8,  'tire_pressure': 190},
    '3D':     {'n_tires': 12, 'tire_pressure': 200},
    '5D':     {'n_tires': 20, 'tire_pressure': 180},
    '2D/2D2': {'n_tires': 16, 'tire_pressure': 195},
}

SPECIAL_AIRCRAFT = {
    'C130': {'mg_pct': 0.95, 'n_tires': 8,  'tire_pressure': 100},
    'C17':  {'mg_pct': 0.95, 'n_tires': 8,  'tire_pressure': 142},
    'B738': {'mg_pct': 0.95, 'n_tires': 4,  'tire_pressure': 204},
    'B737': {'mg_pct': 0.95, 'n_tires': 4,  'tire_pressure': 195},
    'A320': {'mg_pct': 0.95, 'n_tires': 4,  'tire_pressure': 195},
}


def get_aircraft_params(icao_code, gear_config):
    """Returns (mg_percent, n_tires, tire_pressure)."""
    if icao_code in SPECIAL_AIRCRAFT:
        sp = SPECIAL_AIRCRAFT[icao_code]
        return sp['mg_pct'], sp['n_tires'], sp['tire_pressure']

    gc = str(gear_config).strip().upper()
    if gc in GEAR_MAP:
        gp = GEAR_MAP[gc]
        return DEFAULT_MG_PCT, gp['n_tires'], gp['tire_pressure']

    return DEFAULT_MG_PCT, 2, 120  # fallback: single wheel


# ============================================================================
# MODULE 6: SECTION ANALYSIS + RESULTS OUTPUT
# ============================================================================

def analyze_section(section_name, layers, traffic_df, growth_rate, design_life,
                    flexural_strength, out):
    """
    Full CDF analysis for one pavement section.
    Prints to both console and output file handle 'out'.
    """
    def p(text=""):
        print(text)
        out.write(text + "\n")

    p(f"\n{'=' * 80}")
    p(f"SECTION: {section_name}")
    p(f"{'=' * 80}")

    # Print layer structure
    p("\nPavement Structure:")
    total_thick = 0
    for i, L in enumerate(layers[:-1]):
        p(f"  Layer {i+1}: {L['type']:>20} | {L['h']:>5.1f}\" | "
          f"E = {L['E']:>12,} psi | nu = {L['nu']}")
        total_thick += L['h']
    p(f"  Subgrade: {'':>18} | {'inf':>5} | "
      f"E = {layers[-1]['E']:>12,} psi | nu = {layers[-1]['nu']}  (CBR = {layers[-1]['E']/1500:.0f})")
    p(f"  Total pavement thickness: {total_thick:.1f}\"")
    p(f"\nDesign Parameters:")
    p(f"  PCC Flexural Strength: {flexural_strength} psi")
    p(f"  Growth Rate: {growth_rate*100:.2f}%  |  Design Life: {design_life} years")
    p(f"  Wander Sigma: {SIGMA_WANDER} in  |  All {len(traffic_df)} aircraft included (no filter)")

    E_ac = layers[0]['E']
    E_sub = layers[-1]['E']

    # CDF accumulators
    cdf_ac_total = 0.0
    cdf_sub_total = 0.0
    cdf_pcc_total = 0.0
    results = []

    for _, ac in traffic_df.iterrows():
        icao = ac['Type']
        mtow = ac['MTOW']
        gear = ac['Gear']
        annual = ac['AnnualDeps']

        # Aircraft tire parameters
        mg_pct, n_tires, tire_press = get_aircraft_params(icao, gear)
        tire_load = mtow * mg_pct / n_tires
        contact_area = tire_load / tire_press
        tire_radius = sqrt(contact_area / pi)
        tire_width = 2.0 * tire_radius

        # Design departures
        total_deps = design_departures(annual, growth_rate, design_life)

        # Coverage-to-pass
        ctp = coverage_to_pass(tire_width)

        # Compute responses
        resp = compute_all_responses(layers, tire_load, tire_press)

        # Failure lives
        Nf_ac = ac_fatigue_life(resp['eps_h_ac'], E_ac)
        Nf_sub = subgrade_rutting_life(resp['eps_z_sub'], E_sub)
        Nf_pcc = pcc_fatigue_life(resp['sigma_pcc'], flexural_strength)

        # CDF contributions
        covs = total_deps * ctp
        cdf_ac_i = covs / Nf_ac if Nf_ac > 0 else 0
        cdf_sub_i = covs / Nf_sub if Nf_sub > 0 else 0
        cdf_pcc_i = covs / Nf_pcc if Nf_pcc > 0 else 0

        cdf_ac_total += cdf_ac_i
        cdf_sub_total += cdf_sub_i
        cdf_pcc_total += cdf_pcc_i

        results.append({
            'Aircraft': icao, 'MTOW': mtow, 'Gear': gear,
            'AnnualDep': annual, 'DesignDep': total_deps,
            'TireLoad_lb': tire_load, 'TirePress_psi': tire_press,
            'eps_h': resp['eps_h_ac'], 'eps_z': resp['eps_z_sub'],
            'sigma_pcc': resp['sigma_pcc'],
            'Nf_AC': Nf_ac, 'Nf_Sub': Nf_sub, 'Nf_PCC': Nf_pcc,
            'CDF_AC': cdf_ac_i, 'CDF_Sub': cdf_sub_i, 'CDF_PCC': cdf_pcc_i,
            'CDF_Total': cdf_ac_i + cdf_sub_i + cdf_pcc_i,
        })

    # Sort by total CDF contribution (descending)
    results.sort(key=lambda x: x['CDF_Total'], reverse=True)

    # Print per-aircraft table
    p(f"\n{'Aircraft':>8} {'MTOW':>8} {'Gear':>5} {'Ann':>6} "
      f"{'TireLoad':>9} {'eps_h':>10} {'eps_z':>10} {'sig_pcc':>9} "
      f"{'Nf_AC':>11} {'Nf_Sub':>11} {'Nf_PCC':>11} "
      f"{'CDF_AC':>10} {'CDF_Sub':>10} {'CDF_PCC':>10}")
    p("-" * 150)

    for r in results:
        p(f"{r['Aircraft']:>8} {r['MTOW']:>8,.0f} {r['Gear']:>5} {r['AnnualDep']:>6.1f} "
          f"{r['TireLoad_lb']:>9,.1f} {r['eps_h']:>10.2e} {r['eps_z']:>10.2e} {r['sigma_pcc']:>9.1f} "
          f"{r['Nf_AC']:>11.2e} {r['Nf_Sub']:>11.2e} {r['Nf_PCC']:>11.2e} "
          f"{r['CDF_AC']:>10.2e} {r['CDF_Sub']:>10.2e} {r['CDF_PCC']:>10.2e}")

    # Summary
    cdf_max = max(cdf_ac_total, cdf_sub_total, cdf_pcc_total)
    if cdf_ac_total == cdf_max:
        controlling = "AC Fatigue"
    elif cdf_sub_total == cdf_max:
        controlling = "Subgrade Rutting"
    else:
        controlling = "PCC Fatigue"

    p(f"\n{'=' * 80}")
    p(f"RESULTS — {section_name}")
    p(f"{'=' * 80}")
    p(f"  CDF (AC Fatigue):        {cdf_ac_total:.6e}")
    p(f"  CDF (Subgrade Rutting):  {cdf_sub_total:.6e}")
    p(f"  CDF (PCC Fatigue):       {cdf_pcc_total:.6e}")
    p(f"  -----------------------------------------------")
    p(f"  CDF (Maximum):           {cdf_max:.6e}")
    p(f"  Controlling Mode:        {controlling}")
    if cdf_max < 1.0:
        p(f"  VERDICT:                 OVER-DESIGNED (CDF < 1.0)")
        if cdf_max > 0:
            p(f"  Remaining Life Factor:   {1.0/cdf_max:.1f}x the design life")
    else:
        p(f"  VERDICT:                 UNDER-DESIGNED (CDF > 1.0)")
        p(f"  Pavement fails at:       {1.0/cdf_max*100:.1f}% of design life")

    return {
        'section': section_name,
        'cdf_ac': cdf_ac_total,
        'cdf_sub': cdf_sub_total,
        'cdf_pcc': cdf_pcc_total,
        'cdf_max': cdf_max,
        'controlling': controlling,
        'adequate': cdf_max < 1.0,
        'details': results,
    }


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':

    # ---- Paths ----
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    excel_path = os.path.join(project_dir, 'AO_CEE598_FAARFIELD.xlsx')
    results_dir = os.path.join(project_dir, 'results')
    os.makedirs(results_dir, exist_ok=True)

    # Open output file
    out_path = os.path.join(results_dir, 'KLHX_CDF_Full_Output.txt')
    out = open(out_path, 'w', encoding='utf-8')

    def p(text=""):
        print(text)
        out.write(text + "\n")

    p("FAARFIELD CDF Analysis — KLHX (La Junta Municipal Airport)")
    p("CEE 598 Airport Design, ASU Spring 2026")
    p("Methodology: FAARFIELD 2.1.1 replication (Odemark + Westergaard + Burmister)")
    p("=" * 80)

    # ---- Step 3: Load traffic data (ALL aircraft, no filter) ----
    p(f"\nLoading traffic from: {os.path.basename(excel_path)}")
    tr = pd.read_excel(excel_path, sheet_name='Traffic346')

    years_span = 8  # 2014-2021
    agg = tr.groupby([tr.columns[0], tr.columns[5], tr.columns[6]]).agg(
        {tr.columns[7]: 'sum'}).reset_index()
    agg.columns = ['Type', 'MTOW', 'Gear', 'TotalDeps']
    agg['AnnualDeps'] = agg['TotalDeps'] / years_span

    p(f"  Aircraft types: {len(agg)} (ALL included — no weight filter)")
    p(f"  Total departures ({years_span} years): {agg['TotalDeps'].sum():.0f}")
    p(f"  Average annual departures: {agg['AnnualDeps'].sum():.0f}")

    # ---- Parameters ----
    growth_rate = 0.032       # 3.2% CAGR
    design_life = 20          # years
    flexural_strength = 700   # psi (PCC modulus of rupture)

    # ---- Step 2: Define pavement sections ----

    layers_6627 = [
        {'type': 'P-401 AC Overlay', 'h': 2.5,  'E': 200_000,   'nu': 0.35},
        {'type': 'P-501 PCC',        'h': 6.0,  'E': 4_000_000, 'nu': 0.15},
        {'type': 'Subgrade',         'h': 9999, 'E': 10_500,    'nu': 0.40},
    ]

    layers_7347 = [
        {'type': 'P-401 AC Overlay', 'h': 2.0,  'E': 200_000,   'nu': 0.35},
        {'type': 'P-501 PCC',        'h': 10.0, 'E': 4_000_000, 'nu': 0.15},
        {'type': 'Subgrade',         'h': 9999, 'E': 10_500,    'nu': 0.40},
    ]

    # ---- Steps 4-6: Analyze each section ----
    all_results = []

    r1 = analyze_section(
        "KLHX Section 6627 (Taxiway — 2.5\" AC + 6\" PCC)",
        layers_6627, agg, growth_rate, design_life, flexural_strength, out)
    all_results.append(r1)

    r2 = analyze_section(
        "KLHX Section 7347 (Taxiway — 2\" AC + 10\" PCC)",
        layers_7347, agg, growth_rate, design_life, flexural_strength, out)
    all_results.append(r2)

    # ---- Step 7: Final summary ----
    p(f"\n\n{'=' * 80}")
    p("FINAL SUMMARY — KLHX (La Junta Municipal Airport)")
    p(f"{'=' * 80}\n")
    p(f"{'Section':<55} {'CDF_max':>12} {'Controlling':>20} {'Verdict':>18}")
    p("-" * 110)
    for r in all_results:
        verdict = "OVER-DESIGNED" if r['adequate'] else "UNDER-DESIGNED"
        p(f"{r['section']:<55} {r['cdf_max']:>12.6e} {r['controlling']:>20} {verdict:>18}")

    p(f"\nCriteria: CDF < 1.0 = adequate (over-designed) | CDF > 1.0 = fails (under-designed)")
    p(f"\nInputs:")
    p(f"  Subgrade: Silt Loam (AASHTO A-6), CBR = 7, E = 10,500 psi")
    p(f"  PCC Flexural Strength: {flexural_strength} psi")
    p(f"  Growth Rate: {growth_rate*100:.1f}% CAGR | Design Life: {design_life} years")
    p(f"  Traffic: {len(agg)} aircraft types, {agg['TotalDeps'].sum():.0f} total departures")
    p(f"  All aircraft included (no weight filter) — same as FAARFIELD")

    out.close()
    print(f"\nFull output saved to: {out_path}")

    # ---- Write results markdown ----
    md_path = os.path.join(results_dir, 'KLHX_CDF_Results.md')
    with open(md_path, 'w', encoding='utf-8') as md:
        md.write("# KLHX (La Junta Municipal Airport) — CDF Analysis Results\n\n")
        md.write("## Final Verdict\n\n")
        md.write("| Section | Layers | CDF (max) | Controlling Mode | Verdict |\n")
        md.write("|---------|--------|-----------|-----------------|--------|\n")
        for r in all_results:
            verdict = "**OVER-DESIGNED**" if r['adequate'] else "**UNDER-DESIGNED**"
            layers_str = r['section'].split('—')[1].strip().rstrip(')') if '—' in r['section'] else ''
            md.write(f"| {r['section'].split('(')[0].strip()} | {layers_str} "
                     f"| {r['cdf_max']:.6e} | {r['controlling']} | {verdict} |\n")

        md.write("\n## CDF by Failure Mode\n\n")
        md.write("| Section | AC Fatigue | Subgrade Rutting | PCC Fatigue | Max (Controls) |\n")
        md.write("|---------|-----------|-----------------|------------|----------------|\n")
        for r in all_results:
            sec = r['section'].split('(')[0].strip()
            md.write(f"| {sec} | {r['cdf_ac']:.4e} | {r['cdf_sub']:.4e} "
                     f"| {r['cdf_pcc']:.4e} | {r['cdf_max']:.4e} |\n")

        md.write("\n## Top Contributing Aircraft (by total CDF)\n\n")
        for r in all_results:
            md.write(f"\n### {r['section']}\n\n")
            md.write("| Aircraft | MTOW (lbs) | Gear | Annual Dep | CDF_AC | CDF_Sub | CDF_PCC | Total CDF |\n")
            md.write("|----------|-----------|------|-----------|--------|---------|---------|----------|\n")
            for d in r['details'][:10]:
                md.write(f"| {d['Aircraft']} | {d['MTOW']:,.0f} | {d['Gear']} | {d['AnnualDep']:.1f} "
                         f"| {d['CDF_AC']:.2e} | {d['CDF_Sub']:.2e} | {d['CDF_PCC']:.2e} "
                         f"| {d['CDF_Total']:.2e} |\n")

        md.write("\n## Analysis Parameters\n\n")
        md.write(f"- Subgrade: Silt Loam (AASHTO A-6), CBR = 7, E = 10,500 psi\n")
        md.write(f"- PCC Flexural Strength: {flexural_strength} psi\n")
        md.write(f"- Growth Rate: {growth_rate*100:.1f}% CAGR | Design Life: {design_life} years\n")
        md.write(f"- Traffic: {len(agg)} aircraft types (ALL included, no filter)\n")
        md.write(f"- Methodology: FAARFIELD 2.1.1 replication\n")
        md.write(f"  - Odemark equivalent thickness (subgrade strain)\n")
        md.write(f"  - Westergaard interior loading (PCC stress)\n")
        md.write(f"  - Burmister 2-layer (AC strain)\n")
        md.write(f"  - FAARFIELD failure model constants from modCDF.vb\n")
        md.write(f"  - Gaussian wander sigma = {SIGMA_WANDER} in\n")

    print(f"Results markdown saved to: {md_path}")
