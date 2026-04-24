# Phase D Validation Guide — AeroPave vs Desktop FAARFIELD

Date: 2026-04-19
Spec: [specs/fem3d-real-stress-export.md](../specs/fem3d-real-stress-export.md)

## Goal

Confirm that AeroPave's per-element FEM stress field (extracted from `clsPrintOut.st(,,,)` via reflection) matches what desktop FAARFIELD 2.1.1 writes to its `Output-Hexahedron Element-Step 1.txt` printout file.

**Acceptance gate:** ±5% on σx, σy, σz at 3+ reference elements.

## Why aircraft selection matters

AeroPave's `AircraftLibrary.ResolveGeometry` adds a proxy/curated-override fallback layer that desktop FAARFIELD does not have. To make the comparison meaningful we must pick an aircraft where AeroPave's wheel coordinates **come straight from the FAARFIELD XML library** — `Source = "xml"`, no proxy, no template, no override. We must also pick a **simple gear** (S or D) so AeroPave's `PrepareAircraftForFem3d` does NOT collapse a complex gear to a synthetic dual.

**Test aircraft chosen: B738.**

Verified via `GET /api/aircraft/resolve/B738`:
- `geometrySource`: `"xml"` ✓
- `resolvedIcao`: `"B738"` ✓ (no rename)
- `faarfieldName`: `"B737 BBJ2"` ← **what to look for in desktop FAARFIELD's library**
- `gearType`: `"D"` ✓ (simple, no normalization in `PrepareAircraftForFem3d`)
- `nWheels`: 4
- `wheelCoords (gear frame, in)`:
  - (-95.5, 0)
  - (-129.5, 0)
  - (129.5, 0)
  - (95.5, 0)
- `tirePressure`: 204 psi (library default)
- `tireWidth`: 12.72"

## Test setup (must be reproduced exactly)

| Parameter | Value |
|---|---|
| Section type | HMA Overlay on Rigid (FAARFIELD `FlexOnRigid`, DesignType=13) |
| Layer 1 | P-401 AC, 4.0", E=200,000 psi, ν=0.35 |
| Layer 2 | P-501 PCC, 12.0", E=4,000,000 psi, ν=0.15 |
| Subgrade | E=12,000 psi, ν=0.40 (≈ CBR 8) |
| Aircraft | **B-737 BBJ2** (ICAO B738) — pick from the FAARFIELD library, do NOT type custom values |
| Annual departures | 1 (any value; we only need stress, not CDF) |
| Mesh size | FAARFIELD default (~5") |

When desktop FAARFIELD opens this aircraft + section, the wheel coords should match the library values listed above. **Cross-check this in desktop's aircraft properties dialog before running the analysis.** If desktop shows different wheel coords, the comparison is invalid.

## How to capture the desktop FAARFIELD printout

1. **In desktop FAARFIELD 2.1.1**: File → New Job (or open an existing one and replace section).
2. Build the section with the exact layer stack above. Pick **B-737 BBJ2** from the aircraft library.
3. **Enable printout files**:  Options or Preferences → "Output Files" → check **Hexahedron Element Stress** (exact menu name varies; the option may be labelled `ModelOut = 1` in some FAARFIELD builds).
4. Click **Design** or **Life** to run the analysis. Wait for it to complete.
5. The printout files land in `<WorkingDir>/PrintOut-<JobName>/Output-Hexahedron Element-Step 1.txt`. The `<WorkingDir>` is usually the FAARFIELD job folder (often something like `C:/Users/<you>/AppData/...` or wherever the job was saved).
6. **Send back the path to that .txt file** (or paste 50 lines of its contents). Format reference:
   ```
   ELEMENT NUMBER: ###
   <hex element header>
   <8 lines of per-Gauss-point stress: gp_idx, sigmaX, sigmaY, sigmaZ, tauXY, tauYZ, tauXZ, ...>
   <9th line = mean across 8 Gauss points>
   ```

## AeroPave reference data

Generated 2026-04-19 by `c:/tmp/phase_d_extract.py` against `localhost:5100/api/fem3d/mesh?includeStressField=true`. Full data: `c:/tmp/phase_d_aeropave_reference.json`.

**Key context:**
- Mesh: 4,580 brick elements / 5,312 surface nodes / 11,072 surface triangles
- Slab domain: x = [-120, 360], y = [-240, 240], z = [-54, 16] inches
- Wheel positions in mesh frame (after FAARFIELD's gear shift): (0, 0), (34, 0), (225, 0), (259, 0) at 204 psi each
- `secondPassMs`: ~10 s (the extra FAASR3D pass for stress capture)
- All values are MEAN over 8 Gauss points at the last time step. This matches FAARFIELD's printout "9th row" averaging convention.

### Reference elements

| # | Description | brkID | Layer | Centroid (x, y, z) in | σx | σy | σz | τxy | τyz | τxz | Mises |
|---|-------------|-------|-------|-----------------------|------|------|------|------|------|------|-------|
| 1 | **PEAK \|σz\| in PCC layer** | 681 | PCC | (2.1, 114.0, 6.0) | -0.026 | -0.732 | **-3.413** | -0.046 | 1.939 | -1.060 | 4.922 |
| 2 | AC top under wheel @ x=34 | 837 | AC | (35.7, 2.0, 14.0) | -0.865 | -0.831 | -0.165 | -0.001 | 0.010 | -0.021 | 0.685 |
| 3 | PCC mid under wheel @ x=34 | 9 | PCC | (35.7, 2.0, 6.0) | 0.280 | 0.101 | -0.738 | 0.001 | -0.050 | -0.364 | 1.136 |
| 4 | PCC mid midpoint between trucks | 35 | PCC | (144.9, 2.0, 6.0) | 0.223 | 0.095 | -0.814 | 0.000 | -0.057 | 0.103 | 1.000 |
| 5 | PCC mid 50in Y-offset from wheel | 449 | PCC | (35.7, 46.0, 6.0) | 0.280 | 0.057 | -0.602 | 0.027 | 0.244 | -0.383 | 1.119 |
| 6 | PCC mid far from gear (X=200) | 723 | PCC | (198.0, 2.0, 6.0) | 0.018 | 0.076 | -0.693 | 0.001 | -0.102 | 0.704 | 1.438 |

All values in psi. Sign convention: positive = tension, negative = compression. +Z = downward into pavement.

### How to match these to desktop FAARFIELD's printout

The printout file lists every brick element by sequential ID. AeroPave's `brkID` should match desktop's element number IF both runs produce the same mesh (same inputs, same FAARFIELD version → identical mesh). For each row above:

1. Find ELEMENT NUMBER `<brkID>` in `Output-Hexahedron Element-Step 1.txt`.
2. Locate the 9th (averaged) row of stress data.
3. Compare σx, σy, σz, τxy, τyz, τxz to the AeroPave row.
4. **Pass:** all 6 components within ±5% (or within ±0.1 psi for values close to zero).

If element IDs don't match — possible if FAARFIELD's mesher has any non-determinism — fall back to **spatial matching**: locate the brick whose centroid is closest to AeroPave's `(cx, cy, cz)` in the printout's element-coordinate listing.

## Notes on the surprising peak location

**Element 681 at (x=2, y=114, z=6) shows σz = -3.41 psi**, which is **larger** than σz directly under any wheel (-0.74 psi at element 9). The peak is **off-axis from the wheels at y=114"**, not under them.

Possible explanations to verify against desktop FAARFIELD:
1. **Real FEM behavior** — for this 4-inline-wheels gear pattern (all wheels at y=0), the PCC slab develops a stress concentration where the half-slab symmetry plane meets a mesh-density transition. If desktop FAARFIELD shows the same -3.4 psi at element 681 (or its spatial equivalent), this is a real FEM finding, not a bug.
2. **Y-mirror artifact** — FAARFIELD meshes y ≥ 0 with a symmetry condition at y=0. AeroPave's `gearOriginInMesh` translation is documented to handle this, but the stress capture path runs on the half-slab native FAARFIELD output, which is what the printout file records. If desktop FAARFIELD writes the same off-axis peak, fine; if desktop's printout shows a much smaller σz at the same coords, AeroPave is reporting from the wrong half-step somehow.
3. **B738's unusual library gear** — the 4 wheels are inline at y=0 with spacings 34"-191"-34", which is not a typical commercial dual-gear pattern. Could be a Boeing Business Jet variant in FAARFIELD's library that's not representative of a real 737-800. If user prefers a more conventional gear, swap in a different `Source=xml` simple-D aircraft for the comparison.

If desktop FAARFIELD agrees on element 681 → AeroPave's reflection chain is fully validated. Mesh values are real FAARFIELD output, just off-intuitive due to the unusual gear.

If desktop FAARFIELD disagrees → we have a Phase B/C bug to find. Most likely culprit: Gauss-point aggregation choice or sign convention in `ExtractElementStressTensor`.

## Acceptance criteria

| Outcome | Action |
|---|---|
| All 6 elements match within ±5% | Phase D PASS. Update `docs/decisions.md`. Proceed to Phase E (cutover). |
| Some elements match within ±5%, some don't | Diagnose the divergent elements. Likely Gauss aggregation (try max instead of mean) or sign convention. Add findings to `docs/decisions.md`. |
| All elements differ by 10× or more | Major bug. Re-investigate the second-FAASR3D / Conversion() pipeline. Possibly fall back to printout-file scraping (spec's risk register) instead of in-process reflection. |

## Reproducing the AeroPave reference

If the user wants to re-extract AeroPave reference data after making backend changes:

```bash
# Backend must be running at localhost:5100
python c:/tmp/phase_d_extract.py
# Outputs: console table + c:/tmp/phase_d_aeropave_reference.json
```

To regenerate against a different aircraft (must be Source=xml + simple gear):
```python
# Edit AIRCRAFT in phase_d_extract.py
AIRCRAFT = {"icao": "A320"}  # for example
# Then re-run.
```
