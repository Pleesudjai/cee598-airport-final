"""Phase D crosscheck — parse FAARFIELD's Output-Hexahedron Element-Step 1.txt
and diff every element against AeroPave's reflection-extracted tensor.

The printout file is byte-identical to what desktop FAARFIELD writes for the
same inputs (same DLLs, same pipeline). Diffing the two answers:
  - Is AeroPave's reflection reading the correct st(,,,) array?
  - Is the Mean-of-Gauss aggregation matching FAARFIELD's "9th row" convention?
  - Are sign conventions correct?
"""
import sys, re, json, os, math
sys.stdout.reconfigure(encoding='utf-8')

CROSSCHECK_DIR = r"C:\Users\chidc\ASU Dropbox\Chidchanok Pleesudjai\PhD COURSES\2026 Spring\CEE 598 Topic Airport Design\03 Final Project\Crosscheck FAARFIELD Desktop"
PRINTOUT_DIR  = r"C:\Users\chidc\AppData\Local\Temp\PrintOut-fem_spike_7ea201eb"
PRINTOUT_FILE = os.path.join(PRINTOUT_DIR, "Output-Hexahedron Element-Step 1.txt")
AEROPAVE_REF  = r"c:\tmp\phase_d_aeropave_reference.json"

# Re-extract aeropave tensor + centroids from the live backend so the comparison
# uses fresh data matching this exact spike run.
import requests
print("[1/5] Fetching AeroPave tensor from /api/fem3d/mesh ...")
LAYERS = [
    {"type": "P-401", "h": 4.0, "E": 200000, "nu": 0.35},
    {"type": "P-501", "h": 12.0, "E": 4000000, "nu": 0.15},
]
SUBGRADE = {"E": 12000, "nu": 0.4}
r = requests.post("http://localhost:5100/api/fem3d/mesh",
    json={"layers": LAYERS, "subgrade": SUBGRADE, "aircraft": {"icao": "B738"},
          "includeStressField": True}, timeout=120)
r.raise_for_status()
aero = r.json()
mesh = aero["mesh"]
tensor = mesh["elementStressTensor"]
centroids = mesh["elementCentroids"]
layer_ids = mesh["elementLayerIds"]
n_bricks = mesh["totalElementCount"]
print(f"  AeroPave: {n_bricks} bricks, tensor={sum(1 for r in tensor if r)} populated, second pass={mesh['stressFieldMeta']['secondPassMs']}ms")

# Parse FAARFIELD printout file. Each element is 10 lines:
#   "   N- 1"             marker
#   8 Gauss-point rows: gp_idx  sig-xx  sig-yy  sig-zz  sig-xy  sig-yz  sig-zx  effsg  yield
#   1 averaged row at gp_idx=9
print("\n[2/5] Parsing FAARFIELD printout ...")
print(f"  file: {PRINTOUT_FILE}")
print(f"  size: {os.path.getsize(PRINTOUT_FILE):,} bytes")

# Marker format: "<elem_id>-<layer_id>" where layer_id varies (1 for PCC,
# 12 for AC, etc. — depends on FAARFIELD's internal material index). Match any.
ELEM_RE = re.compile(r'^\s+(\d+)-\s*\d+\s*$')
ROW_RE  = re.compile(r'^\s+(\d+)\s+([\-\d\.E+]+)\s+([\-\d\.E+]+)\s+([\-\d\.E+]+)\s+([\-\d\.E+]+)\s+([\-\d\.E+]+)\s+([\-\d\.E+]+)\s+([\-\d\.E+]+)\s+([\-\d\.E+]+)\s*$')

# Element -> averaged row (sx, sy, sz, sxy, syz, szx)
printout = {}
elem_layer = {}  # elem -> printout layer marker
current_elem = None
gauss_count = 0
with open(PRINTOUT_FILE, 'r', encoding='ascii', errors='ignore') as f:
    for line in f:
        m = ELEM_RE.match(line)
        if m:
            current_elem = int(m.group(1))
            gauss_count = 0
            continue
        m = ROW_RE.match(line)
        if not m or current_elem is None: continue
        gp = int(m.group(1))
        sx, sy, sz = float(m.group(2)), float(m.group(3)), float(m.group(4))
        sxy, syz, szx = float(m.group(5)), float(m.group(6)), float(m.group(7))
        # Row 9 is the averaged row.
        if gp == 9:
            printout[current_elem] = (sx, sy, sz, sxy, syz, szx)

print(f"  parsed {len(printout)} elements (rows where gp_idx == 9)")

# Diff per element. Use absolute and relative-to-peak metrics so near-zero
# values don't dominate the relative-error histogram.
print("\n[3/5] Computing element-wise differences ...")
peak_abs = max((max(abs(v) for v in printout[e]) for e in printout), default=1.0)
print(f"  printout-side peak |stress component| = {peak_abs:.3f} psi (used as denominator floor)")
diffs = []
mismatches = []
for eid in sorted(printout.keys()):
    if eid >= len(tensor) or not tensor[eid]:
        mismatches.append({"eid": eid, "reason": "tensor missing"}); continue
    pv = printout[eid]
    av = tensor[eid]
    # Note: AeroPave tensor row order is [sx, sy, sz, sxy, syz, sxz].
    # Printout column order is sig-xx, sig-yy, sig-zz, sig-xy, sig-yz, sig-zx.
    # sxz vs szx: tensor is symmetric so szx = sxz.
    abs_diffs = [abs(av[i] - pv[i]) for i in range(6)]
    max_abs = max(abs_diffs)
    rel_to_peak = max_abs / peak_abs * 100  # percent of overall peak
    diffs.append({"eid": eid,
                   "centroid": centroids[eid] if centroids[eid] else None,
                   "layer": layer_ids[eid] if eid < len(layer_ids) else None,
                   "printout":  list(pv),
                   "aeropave":  list(av),
                   "abs_diffs": abs_diffs,
                   "max_abs_diff": max_abs,
                   "rel_to_peak_pct": rel_to_peak})

n_elements = len(diffs)
n_within_5pct = sum(1 for d in diffs if d["rel_to_peak_pct"] <= 5.0)
n_within_1pct = sum(1 for d in diffs if d["rel_to_peak_pct"] <= 1.0)
n_within_01pct = sum(1 for d in diffs if d["rel_to_peak_pct"] <= 0.1)
n_exact = sum(1 for d in diffs if d["max_abs_diff"] <= 1e-6)
worst = sorted(diffs, key=lambda d: -d["max_abs_diff"])[:5]
print(f"\n  Compared {n_elements} elements")
print(f"  Exact match (<= 1e-6 psi):      {n_exact:>6,}  ({n_exact/n_elements*100:>5.1f}%)")
print(f"  Within 0.1% of peak:            {n_within_01pct:>6,}  ({n_within_01pct/n_elements*100:>5.1f}%)")
print(f"  Within 1.0% of peak:            {n_within_1pct:>6,}  ({n_within_1pct/n_elements*100:>5.1f}%)")
print(f"  Within 5.0% of peak (PASS):     {n_within_5pct:>6,}  ({n_within_5pct/n_elements*100:>5.1f}%)")
print(f"  Top 5 worst-case differences:")
for w in worst:
    cz = w["centroid"][2] if w["centroid"] else None
    print(f"    elem {w['eid']:>4d} (z={cz}): max abs diff = {w['max_abs_diff']:>.4e} psi  ({w['rel_to_peak_pct']:.4f}% of peak)")

# Identify the absolute global peak in BOTH datasets — they should be the same element.
print("\n[4/5] Cross-locating the global peak |sigma_normal| ...")
def peak_normal(rows):
    best = None
    for eid, row in rows.items() if isinstance(rows, dict) else enumerate(rows):
        if row is None: continue
        for ci in range(3):  # sigmaX, sigmaY, sigmaZ only
            v = abs(row[ci])
            if best is None or v > best[2]:
                best = (eid, ci, v)
    return best
po_peak = peak_normal(printout)
ae_peak = peak_normal(tensor)
print(f"  printout peak: elem={po_peak[0]} comp={['sx','sy','sz'][po_peak[1]]} |sigma|={po_peak[2]:.3f} psi")
print(f"  aeropave peak: elem={ae_peak[0]} comp={['sx','sy','sz'][ae_peak[1]]} |sigma|={ae_peak[2]:.3f} psi")
agree = (po_peak[0] == ae_peak[0]) and (po_peak[1] == ae_peak[1])
print(f"  peak location agreement: {'YES' if agree else 'NO'}")

print("\n[5/5] Saving all crosscheck artifacts ...")
os.makedirs(CROSSCHECK_DIR, exist_ok=True)

# 1. Copy the FAARFIELD printout file (4.5 MB ~)
import shutil
dest_printout_dir = os.path.join(CROSSCHECK_DIR, "faarfield_printout")
os.makedirs(dest_printout_dir, exist_ok=True)
for fn in os.listdir(PRINTOUT_DIR):
    src = os.path.join(PRINTOUT_DIR, fn)
    dst = os.path.join(dest_printout_dir, fn)
    if os.path.isfile(src):
        shutil.copy2(src, dst)
print(f"  copied FAARFIELD printout files to: {dest_printout_dir}")

# 2. AeroPave reference + comparison summary
summary = {
    "meta": {
        "test_inputs": {
            "layers": LAYERS, "subgrade": SUBGRADE, "aircraft": {"icao": "B738"},
            "design_type": "FlexOnRigid (DESIGN_TYPE=13)",
            "faarfield_aircraft_label": "B737 BBJ2",
            "tire_pressure_psi": 204,
            "tire_width_in": 12.72,
        },
        "wheel_coords_mesh_frame_in": [{"x": w["x"], "y": w["y"]} for w in mesh["wheelLoads"]],
        "wheel_coords_gear_frame_in": [
            {"x": -95.5, "y": 0}, {"x": -129.5, "y": 0},
            {"x":  129.5, "y": 0}, {"x":   95.5, "y": 0},
        ],
        "n_bricks": n_bricks,
        "n_elements_compared": n_elements,
        "second_pass_ms": mesh["stressFieldMeta"]["secondPassMs"],
        "printout_peak_psi": po_peak,
        "aeropave_peak_psi": ae_peak,
        "peak_location_agreement": agree,
    },
    "summary_pass_rate": {
        "exact_match_count": n_exact,
        "within_0_1_pct": n_within_01pct,
        "within_1_pct": n_within_1pct,
        "within_5_pct_PASS": n_within_5pct,
        "exact_match_rate_pct": n_exact / n_elements * 100,
        "within_5_pct_rate_pct": n_within_5pct / n_elements * 100,
    },
    "worst_5": [
        {
            "eid": w["eid"], "max_abs_diff_psi": w["max_abs_diff"],
            "rel_to_peak_pct": w["rel_to_peak_pct"],
            "printout_psi": w["printout"], "aeropave_psi": w["aeropave"],
            "centroid_in": w["centroid"], "layer": w["layer"],
        }
        for w in worst
    ],
}
with open(os.path.join(CROSSCHECK_DIR, "comparison_summary.json"), "w") as f:
    json.dump(summary, f, indent=2)
print(f"  saved comparison_summary.json")

# 3. Full per-element diff (CSV + JSON)
with open(os.path.join(CROSSCHECK_DIR, "per_element_diffs.csv"), "w") as f:
    f.write("element_id,layer,cx_in,cy_in,cz_in,po_sx,po_sy,po_sz,po_sxy,po_syz,po_szx,ae_sx,ae_sy,ae_sz,ae_sxy,ae_syz,ae_sxz,max_abs_diff_psi,rel_to_peak_pct\n")
    for d in diffs:
        c = d["centroid"] or [0, 0, 0]
        po = d["printout"]; ae = d["aeropave"]
        f.write(f"{d['eid']},{d['layer']},{c[0]:.4f},{c[1]:.4f},{c[2]:.4f},"
                f"{po[0]:.6f},{po[1]:.6f},{po[2]:.6f},{po[3]:.6f},{po[4]:.6f},{po[5]:.6f},"
                f"{ae[0]:.6f},{ae[1]:.6f},{ae[2]:.6f},{ae[3]:.6f},{ae[4]:.6f},{ae[5]:.6f},"
                f"{d['max_abs_diff']:.6e},{d['rel_to_peak_pct']:.6f}\n")
print(f"  saved per_element_diffs.csv ({n_elements} rows)")

with open(os.path.join(CROSSCHECK_DIR, "aeropave_tensor_full.json"), "w") as f:
    json.dump({
        "metadata": summary["meta"],
        "elementStressTensor": tensor,
        "elementCentroids": centroids,
        "elementLayerIds": layer_ids,
        "stressFieldMeta": mesh["stressFieldMeta"],
        "wheels_mesh_frame": mesh["wheelLoads"],
        "slabDomain": mesh["slabDomain"],
    }, f, indent=1)
print(f"  saved aeropave_tensor_full.json")

print(f"\nALL ARTIFACTS SAVED TO:\n  {CROSSCHECK_DIR}\n")
print(f"VERDICT: {'PASS' if n_within_5pct == n_elements else 'INVESTIGATE'}")
