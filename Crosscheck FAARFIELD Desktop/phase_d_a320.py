"""Phase D second-aircraft case: A320 (Source=xml, gear=D, 8 wheels in 2D
bogie pattern at y = +-19.8 in)."""
import sys, os, json, re, requests, shutil
sys.stdout.reconfigure(encoding='utf-8')

CROSS = r"C:\Users\chidc\ASU Dropbox\Chidchanok Pleesudjai\PhD COURSES\2026 Spring\CEE 598 Topic Airport Design\03 Final Project\Crosscheck FAARFIELD Desktop"
A320_DIR = os.path.join(CROSS, "a320_case")
os.makedirs(A320_DIR, exist_ok=True)

LAYERS = [
    {"type": "P-401", "h": 4.0, "E": 200000, "nu": 0.35},
    {"type": "P-501", "h": 12.0, "E": 4000000, "nu": 0.15},
]
SUBGRADE = {"E": 12000, "nu": 0.4}

# Step 1: trigger printout-writing spike for A320
print("[1/4] POST /api/diag/fem-spike?icao=A320&writePrintout=1 (~20s) ...")
r = requests.get("http://localhost:5100/api/diag/fem-spike",
                  params={"icao": "A320", "writePrintout": "1"}, timeout=120)
r.raise_for_status()
spike = r.json()
print(f"  success={spike['success']}, secondPassMs={spike['secondPassMs']}")
print(f"  printoutFile: {spike['printoutFile']}")
print(f"  Stress1 max={spike['stress1MaxAbs']:.3f}  Stress8 max={spike['stress8MaxAbs']:.3f}")
print(f"  st peak (real components): {spike['stPeakAbsStressOnly']:.3f} {spike['stPeakStressLabel']} at elem {spike['stPeakStressLocation'][0]} gp {spike['stPeakStressLocation'][2]}")

# Step 2: Pull AeroPave tensor for the same A320 setup. Cache key includes
# aircraft icao so this is a fresh solve (10s extra). The cache may or may not
# hit depending on whether the previous spike call also populated the cache.
print("\n[2/4] POST /api/fem3d/mesh ...")
r = requests.post("http://localhost:5100/api/fem3d/mesh",
    json={"layers": LAYERS, "subgrade": SUBGRADE, "aircraft": {"icao": "A320"},
          "includeStressField": True}, timeout=120)
r.raise_for_status()
d = r.json()
mesh = d["mesh"]
tensor = mesh["elementStressTensor"]
centroids = mesh["elementCentroids"]
layer_ids = mesh["elementLayerIds"]
n_bricks = mesh["totalElementCount"]
print(f"  computeMs={d['computeTimeMs']}  bricks={n_bricks}  tensor={sum(1 for r in tensor if r)} populated")
print(f"  wheels (mesh frame):")
for w in mesh["wheelLoads"]: print(f"    ({w['x']:>7.1f}, {w['y']:>7.1f})")

# Step 3: parse printout (same regex as B738 case) + diff
print("\n[3/4] Parsing A320 printout + diffing ...")
ELEM_RE = re.compile(r'^\s+(\d+)-\s*\d+\s*$')
ROW_RE  = re.compile(r'^\s+(\d+)\s+([\-\d\.E+]+)\s+([\-\d\.E+]+)\s+([\-\d\.E+]+)\s+([\-\d\.E+]+)\s+([\-\d\.E+]+)\s+([\-\d\.E+]+)\s+([\-\d\.E+]+)\s+([\-\d\.E+]+)\s*$')
printout = {}
current_elem = None
with open(spike['printoutFile'], 'r', encoding='ascii', errors='ignore') as f:
    for line in f:
        m = ELEM_RE.match(line)
        if m: current_elem = int(m.group(1)); continue
        m = ROW_RE.match(line)
        if not m or current_elem is None: continue
        gp = int(m.group(1))
        if gp == 9:
            printout[current_elem] = (float(m.group(2)), float(m.group(3)), float(m.group(4)),
                                       float(m.group(5)), float(m.group(6)), float(m.group(7)))
print(f"  parsed {len(printout)} elements")

peak_abs = max((max(abs(v) for v in printout[e]) for e in printout), default=1.0)
diffs = []
for eid in sorted(printout.keys()):
    if eid >= len(tensor) or not tensor[eid]: continue
    pv = printout[eid]; av = tensor[eid]
    abs_diffs = [abs(av[i] - pv[i]) for i in range(6)]
    max_abs = max(abs_diffs)
    diffs.append({"eid": eid, "centroid": centroids[eid] if centroids[eid] else None,
                   "layer": layer_ids[eid] if eid < len(layer_ids) else None,
                   "printout": list(pv), "aeropave": list(av),
                   "max_abs_diff": max_abs, "rel_to_peak_pct": max_abs / peak_abs * 100})

n = len(diffs)
n_within_5 = sum(1 for d in diffs if d["rel_to_peak_pct"] <= 5.0)
n_within_01 = sum(1 for d in diffs if d["rel_to_peak_pct"] <= 0.1)
n_exact = sum(1 for d in diffs if d["max_abs_diff"] <= 1e-6)
worst = sorted(diffs, key=lambda d: -d["max_abs_diff"])[:3]
print(f"  {n} elements compared")
print(f"  Within 5% of peak ({peak_abs:.2f} psi): {n_within_5} ({n_within_5/n*100:.1f}%)")
print(f"  Within 0.1% of peak:                      {n_within_01} ({n_within_01/n*100:.1f}%)")
print(f"  Bit-exact:                                {n_exact} ({n_exact/n*100:.1f}%)")
print(f"  Worst 3:")
for w in worst:
    print(f"    elem {w['eid']:>4d}: max abs diff = {w['max_abs_diff']:>.4e} psi ({w['rel_to_peak_pct']:.4f}% of peak)")

# Peak agreement
def peak_normal(rows):
    best = None
    for eid, row in (rows.items() if isinstance(rows, dict) else enumerate(rows)):
        if row is None: continue
        for ci in range(3):
            v = abs(row[ci])
            if best is None or v > best[2]: best = (eid, ci, v)
    return best
po_peak = peak_normal(printout)
ae_peak = peak_normal(tensor)
print(f"  printout peak: elem={po_peak[0]} comp={['sx','sy','sz'][po_peak[1]]} |sigma|={po_peak[2]:.3f} psi")
print(f"  aeropave peak: elem={ae_peak[0]} comp={['sx','sy','sz'][ae_peak[1]]} |sigma|={ae_peak[2]:.3f} psi")

# Step 4: save artifacts
print("\n[4/4] Saving A320 artifacts ...")
shutil.copytree(os.path.dirname(spike['printoutFile']),
                 os.path.join(A320_DIR, "faarfield_printout"), dirs_exist_ok=True)
print(f"  copied printout to a320_case/faarfield_printout/")

summary = {
    "test_inputs": {
        "layers": LAYERS, "subgrade": SUBGRADE, "aircraft": {"icao": "A320"},
        "design_type": "FlexOnRigid (DESIGN_TYPE=13)",
        "faarfield_aircraft_label": "A320-200 WV000 Bogie",
        "wheel_coords_gear_frame_in": [
            {"x": -131.2, "y": -19.8}, {"x": -167.7, "y": 19.8},
            {"x": -167.7, "y": -19.8}, {"x": -131.2, "y": 19.8},
            {"x":  131.2, "y": -19.8}, {"x":  167.7, "y": 19.8},
            {"x":  167.7, "y": -19.8}, {"x":  131.2, "y": 19.8},
        ],
        "wheel_coords_mesh_frame_in": [{"x": w["x"], "y": w["y"]} for w in mesh["wheelLoads"]],
        "n_bricks": n_bricks,
    },
    "spike": spike,
    "summary_pass_rate": {
        "n_compared": n, "exact_match": n_exact,
        "within_0_1_pct": n_within_01, "within_5_pct_PASS": n_within_5,
        "exact_pct": n_exact / n * 100,
        "within_0_1_pct_pct": n_within_01 / n * 100,
        "within_5_pct_pct": n_within_5 / n * 100,
    },
    "peak_agreement": {
        "printout_peak": [po_peak[0], ['sx','sy','sz'][po_peak[1]], po_peak[2]],
        "aeropave_peak": [ae_peak[0], ['sx','sy','sz'][ae_peak[1]], ae_peak[2]],
        "agreement": (po_peak[0] == ae_peak[0]) and (po_peak[1] == ae_peak[1]),
    },
    "worst_3": [{"eid": w["eid"], "max_abs_diff_psi": w["max_abs_diff"],
                  "rel_to_peak_pct": w["rel_to_peak_pct"],
                  "printout": w["printout"], "aeropave": w["aeropave"],
                  "centroid": w["centroid"], "layer": w["layer"]} for w in worst],
}
with open(os.path.join(A320_DIR, "comparison_summary.json"), "w") as f:
    json.dump(summary, f, indent=2)
print(f"  saved comparison_summary.json")

# Per-element CSV
with open(os.path.join(A320_DIR, "per_element_diffs.csv"), "w") as f:
    f.write("element_id,layer,cx_in,cy_in,cz_in,po_sx,po_sy,po_sz,po_sxy,po_syz,po_szx,ae_sx,ae_sy,ae_sz,ae_sxy,ae_syz,ae_sxz,max_abs_diff_psi,rel_to_peak_pct\n")
    for d in diffs:
        c = d["centroid"] or [0, 0, 0]
        po = d["printout"]; ae = d["aeropave"]
        f.write(f"{d['eid']},{d['layer']},{c[0]:.4f},{c[1]:.4f},{c[2]:.4f},"
                f"{po[0]:.6f},{po[1]:.6f},{po[2]:.6f},{po[3]:.6f},{po[4]:.6f},{po[5]:.6f},"
                f"{ae[0]:.6f},{ae[1]:.6f},{ae[2]:.6f},{ae[3]:.6f},{ae[4]:.6f},{ae[5]:.6f},"
                f"{d['max_abs_diff']:.6e},{d['rel_to_peak_pct']:.6f}\n")
print(f"  saved per_element_diffs.csv ({n} rows)")

# Tensor full
with open(os.path.join(A320_DIR, "aeropave_tensor_full.json"), "w") as f:
    json.dump({"metadata": summary["test_inputs"], "elementStressTensor": tensor,
                "elementCentroids": centroids, "elementLayerIds": layer_ids,
                "stressFieldMeta": mesh["stressFieldMeta"],
                "wheels_mesh_frame": mesh["wheelLoads"], "slabDomain": mesh["slabDomain"]}, f, indent=1)
print(f"  saved aeropave_tensor_full.json")

print(f"\nA320 ARTIFACTS: {A320_DIR}")
print(f"VERDICT: {'PASS' if n_within_5 == n else 'INVESTIGATE'}")
