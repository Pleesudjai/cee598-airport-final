"""Phase D — extract AeroPave per-element stress at reference positions for
side-by-side comparison against desktop FAARFIELD's
PrintOut-{job}/Output-Hexahedron Element-Step 1.txt file.

Test inputs (must match what user runs in desktop FAARFIELD):
  Section:  4.0" P-401 AC overlay / 12.0" P-501 PCC / E=12000 subgrade nu=0.4
            (DESIGN_TYPE_FLEX_ON_RIGID, library defaults for moduli)
  Aircraft: B738 (Source=xml, FaarfieldName='B737 BBJ2'), 4 wheels in gear frame:
              (-95.5, 0), (-129.5, 0), (129.5, 0), (95.5, 0)
            Tire pressure 204 psi (library default), Tire width 12.72"
            Default GearLoad (~95% of MTOW, library value).
"""
import sys, json, requests, math
sys.stdout.reconfigure(encoding='utf-8')

API = "http://localhost:5100"
LAYERS = [
    {"type": "P-401", "h": 4.0, "E": 200000, "nu": 0.35},
    {"type": "P-501", "h": 12.0, "E": 4000000, "nu": 0.15},
]
SUBGRADE = {"E": 12000, "nu": 0.4}
AIRCRAFT = {"icao": "B738"}

print("[1/3] POST /api/fem3d/mesh ...")
r = requests.post(f"{API}/api/fem3d/mesh",
    json={"layers": LAYERS, "subgrade": SUBGRADE, "aircraft": AIRCRAFT,
          "includeStressField": True}, timeout=120)
r.raise_for_status()
d = r.json()
mesh = d["mesh"]
tensor = mesh["elementStressTensor"]
centroids = mesh["elementCentroids"]
layer_ids = mesh["elementLayerIds"]
slab = mesh["slabDomain"]
wheels = mesh["wheelLoads"]
meta = mesh["stressFieldMeta"]
print(f"  success={d['success']} compute={d['computeTimeMs']}ms (cache hit OK)")
print(f"  mesh: {mesh['totalElementCount']} bricks, {mesh['nodeCount']} surface nodes")
print(f"  tensor: {len(tensor)} rows ({sum(1 for r in tensor if r)} populated)")
print(f"  centroids: {len(centroids)} rows ({sum(1 for r in centroids if r)} populated)")
print(f"  stressFieldMeta: peak={meta['peakAbsScalar']:.2f} psi, second pass={meta['secondPassMs']}ms")
print(f"  wheels in mesh frame:")
for w in wheels:
    print(f"    ({w['x']:>6.1f}, {w['y']:>6.1f}) p={w['pressure']:.0f} psi")
print(f"  slab domain: x=[{slab['xMin']:.1f}, {slab['xMax']:.1f}]  y=[{slab['yMin']:.1f}, {slab['yMax']:.1f}]  z=[{slab['zMin']:.2f}, {slab['zMax']:.2f}]")
print()
print("  Layer Z bounds:")
for L in mesh["layers"]:
    print(f"    [{L['id']}] {L['name']:<26s} zTop={L['zTop']:>7.3f}  zBot={L['zBot']:>7.3f}  thick={L['thickness']:.3f}  bricks={L['elementCount']}")

# Wheel in the mesh frame — for B738 (4 inline wheels), the inner "right" wheel
# at the smaller positive X is the most representative single wheel for stress
# concentration. Pick it as the spatial reference.
inner_right_wheel = sorted([w for w in wheels if w["x"] > 0], key=lambda w: w["x"])[0]
inner_left_wheel = sorted([w for w in wheels if w["x"] >= 0 and w is not inner_right_wheel], key=lambda w: -w["x"])[0] if len([w for w in wheels if w["x"] >= 0]) > 1 else inner_right_wheel
slab_y_max = slab["yMax"]

# PCC layer info
pcc_layer = next((L for L in mesh["layers"] if "P-501" in L.get("name","") or "PCC" in L.get("name","")), mesh["layers"][1])
pcc_id = pcc_layer["id"]
ztop_PCC = pcc_layer["zTop"]
zbot_PCC = pcc_layer["zBot"]

ac_layer = mesh["layers"][0]
ztop_AC = ac_layer["zTop"]
zbot_AC = ac_layer["zBot"]

# Reference positions for the comparison table.
# X = wheel inner location, Y = 0 (centerline), Z varies by depth.
wxr = inner_right_wheel["x"]  # mesh-frame X under right inner wheel
wxl = inner_left_wheel["x"]   # mesh-frame X between two inner wheels (centerline of right truck)
midx = (wxr + wxl) / 2.0       # midpoint between the two right-truck wheels

# Helper: nearest brick by 3D distance, optionally restricted to a layer.
def find_nearest_brick(tx, ty, tz, layer_id=None):
    best_b, best_d = None, float("inf")
    for bid in range(1, len(centroids)):
        if not centroids[bid]: continue
        if layer_id is not None and (bid >= len(layer_ids) or layer_ids[bid] != layer_id): continue
        cx, cy, cz = centroids[bid]
        d = (cx - tx) ** 2 + (cy - ty) ** 2 + (cz - tz) ** 2
        if d < best_d:
            best_d = d; best_b = bid
    return best_b, math.sqrt(best_d) if best_b else None

def mises(row):
    sx, sy, sz, txy, tyz, txz = row
    return math.sqrt(0.5 * ((sx - sy) ** 2 + (sy - sz) ** 2 + (sz - sx) ** 2)
                      + 3 * (txy * txy + tyz * tyz + txz * txz))

ac_id = ac_layer["id"]
# Reference targets — chosen to hit physically meaningful comparison points.
targets = [
    ("AC top under wheel x=" + str(wxr),         wxr,  0,  ztop_AC - 0.2,  ac_id),
    ("AC bot under wheel x=" + str(wxr),         wxr,  0,  zbot_AC + 0.2,  ac_id),
    ("PCC top under wheel x=" + str(wxr),        wxr,  0,  ztop_PCC - 0.2, pcc_id),
    ("PCC mid under wheel x=" + str(wxr),        wxr,  0,  (ztop_PCC + zbot_PCC) / 2,  pcc_id),
    ("PCC bot under wheel x=" + str(wxr),        wxr,  0,  zbot_PCC + 0.2, pcc_id),
    ("PCC bot midpoint between dual wheels",     midx, 0,  zbot_PCC + 0.2, pcc_id),
    ("PCC bot 50in offset Y from wheel",         wxr,  50, zbot_PCC + 0.2, pcc_id),
    ("PCC bot near slab edge Y",                 wxr,  slab_y_max - 5, zbot_PCC + 0.2, pcc_id),
    ("PCC bot far from gear (X=200)",            200,  0,  zbot_PCC + 0.2, pcc_id),
]

# Find the GLOBAL max-|sigma| element in PCC layer (the design-controlling location).
peak_b, peak_v, peak_comp = None, 0, None
for bid in range(1, len(tensor)):
    if not tensor[bid]: continue
    if bid >= len(layer_ids) or layer_ids[bid] != pcc_id: continue
    for ci, lbl in enumerate(["sigmaX", "sigmaY", "sigmaZ"]):
        v = abs(tensor[bid][ci])
        if v > peak_v:
            peak_v, peak_b, peak_comp = v, bid, lbl
if peak_b:
    cx, cy, cz = centroids[peak_b]
    targets.insert(0, (f"PEAK |{peak_comp}| in PCC layer", cx, cy, cz, pcc_id))

print(f"\n[2/3] Reference elements (ranked by physical position):\n")
hdr = (f"{'#':>2}  {'description':<48s}  {'brkID':>6s} {'L':>2s}  "
       f"{'cx':>7s} {'cy':>7s} {'cz':>7s}  "
       f"{'sigmaX':>8s} {'sigmaY':>8s} {'sigmaZ':>8s}  "
       f"{'tauXY':>7s} {'tauYZ':>7s} {'tauXZ':>7s}  {'Mises':>7s}  {'snap':>5s}")
print(hdr)
print("-" * len(hdr))
print(f"{'':>2}  {'':<48s}  {'':>6s} {'':>2s}  {'(in)':>7s} {'(in)':>7s} {'(in)':>7s}  "
      f"{'(psi)':>8s} {'(psi)':>8s} {'(psi)':>8s}  "
      f"{'(psi)':>7s} {'(psi)':>7s} {'(psi)':>7s}  {'(psi)':>7s}  {'(in)':>5s}")
print("-" * len(hdr))

ref_table = []
for i, (desc, tx, ty, tz, lid) in enumerate(targets, 1):
    bid, dist = find_nearest_brick(tx, ty, tz, layer_id=lid)
    if bid is None or bid >= len(tensor) or not tensor[bid]:
        print(f"{i:>2}  {desc:<48s}  --- no candidate ---")
        continue
    cx, cy, cz = centroids[bid]
    sx, sy, sz, txy, tyz, txz = tensor[bid]
    m = mises(tensor[bid])
    print(f"{i:>2}  {desc:<48s}  {bid:>6d} {layer_ids[bid]:>2d}  {cx:>7.2f} {cy:>7.2f} {cz:>7.2f}  "
          f"{sx:>8.3f} {sy:>8.3f} {sz:>8.3f}  {txy:>7.3f} {tyz:>7.3f} {txz:>7.3f}  {m:>7.3f}  {dist:>5.1f}")
    ref_table.append({"i": i, "desc": desc, "brick_id": bid, "layer_id": layer_ids[bid],
                       "centroid_in": [cx, cy, cz],
                       "tensor_psi": [sx, sy, sz, txy, tyz, txz],
                       "mises_psi": m,
                       "snap_dist_in": dist})

# Save full comparison set
out = {
    "test_inputs": {
        "layers": LAYERS,
        "subgrade": SUBGRADE,
        "aircraft": AIRCRAFT,
        "wheel_coords_mesh_frame_in": [{"x": w["x"], "y": w["y"], "p": w["pressure"]} for w in wheels],
        "wheel_coords_gear_frame_in": [
            {"x": -95.5, "y": 0}, {"x": -129.5, "y": 0},
            {"x":  129.5, "y": 0}, {"x":   95.5, "y": 0},
        ],
        "design_type": "FlexOnRigid (DESIGN_TYPE=13)",
        "faarfield_aircraft_label": "B737 BBJ2 (B-737-800, ICAO B738)",
        "tire_pressure_psi": 204,
        "tire_width_in": 12.72,
        "stressFieldMeta": meta,
        "slab_domain": slab,
        "layer_bounds_z_in": [{"id": L["id"], "name": L["name"], "zTop": L["zTop"], "zBot": L["zBot"]} for L in mesh["layers"]],
    },
    "reference_elements": ref_table,
}
with open("c:/tmp/phase_d_aeropave_reference.json", "w") as f:
    json.dump(out, f, indent=2)
print(f"\n[3/3] Saved -> c:/tmp/phase_d_aeropave_reference.json ({len(ref_table)} reference elements)")
