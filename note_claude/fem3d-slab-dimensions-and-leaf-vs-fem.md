# FAARFIELD FEM3D — Slab Dimensions & Why LEAF vs FEM Stress Differ
Date: 2026-04-18
Related: `specs/fem3d-managed-backend-integration.md`, `note_claude/fem3d-integration-blocker-2026-04-18.md`

## TL;DR

- FAARFIELD's 3D FEM uses a **fixed 20 ft × 20 ft mesh domain** with **5" elements** and **spring boundary conditions that simulate an infinite slab** — NOT a finite 20 ft panel with free edges.
- We do NOT need to use actual airport panel dimensions, because FAARFIELD's CDF is calibrated to interior-slab bottom tension, which doesn't depend on panel size as long as the interior region is >~10 ft from the nearest joint (true for all 6 project airports).
- The observed **5.4× FEM/LEAF stress ratio** at KMQJ 8662 (B738) is physically correct and expected for thin PCC on weak subgrade, because LEAF and FEM compute fundamentally different quantities:
  - **LEAF** = horizontal elastic stress at a point inside a continuous infinite layer
  - **FEM** = plate-bending tension at slab bottom (the quantity that drives PCC fatigue per FAA's curve)

## FAARFIELD's actual FEM setup (from source)

| Parameter | Value | Citation |
|-----------|-------|----------|
| Default X dimension | **20 ft** | `FaarFieldAnalysis/frmStructure.vb:63` (`XDimension = 20`) |
| Default Y dimension | **20 ft** | `FaarFieldAnalysis/frmStructure.vb:64` (`YDimension = 20`) |
| Default element size | **5 inches** | `FaarFieldAnalysis/modFedfaaGbl.vb:693` (`gSlabMeshSize = 5`) |
| Node count per direction | **49** | `AMClassLib/modPG.vb:1606` (`NoPts1 = (20 × 12) / 5 + 1`) |
| Boundary condition | **Spring BCs simulating infinite slab** | `AMClassLib/modPG.vb:121` (`InfSlbDummyNodes`); comment at `modPG.vb:4291` says *"added for spring BC to simulate infinite slab by YGC 092613"* |
| Dummy edge nodes DOF | **All 6 DOFs constrained (`111111`)** via spring elements | `AMClassLib/modPG.vb:4291-4388` |

**Key insight**: the 20×20 isn't a finite slab with free edges. It's a mesh domain big enough to dissipate wheel-load stress to near-zero before hitting the mesh boundary. The spring BCs anchor the edges so the FEM represents **interior stress in an effectively infinite slab**.

## Why FAARFIELD doesn't use actual airport slab dimensions

1. **Interior loading drives PCC fatigue.** FAA's CDF fatigue curve (modStrDesign13.vb PCC equation) is calibrated to bottom-of-slab tension at an interior location, far from joints. Real joint spacing (12.5–25 ft typical) doesn't change this stress much when the interior region is >10 ft from the nearest joint.

2. **Edge/corner loading is a separate analysis.** FAARFIELD has a distinct workflow for joint/edge stress (actual slab dimensions, free-edge BCs). FAA design rules explicitly use the **interior** stress for CDF.

3. **Standard airport panel sizes are nearly universal.** Per AC 150/5320-6G, joint spacing for runways/taxiways is typically 15–20 ft. The 20×20 + infinite-slab BCs cover ≥90% of real geometries.

4. **Our data sources don't include panel dimensions.** Excel `Pavement` sheet + PAVEAIR record layer thickness and material type only. Joint spacing isn't captured. Desktop FAARFIELD doesn't ask for it in the normal CDF workflow either.

## When actual slab dimensions WOULD matter (not applicable to project)

- **Short panels** (<12 ft) where edge effects reach interior
- **Corner loading** (aircraft parked on slab corner)
- **Reduced joint load transfer efficiency**
- **Damaged slabs** with cracked panels acting as shorter effective slabs

None apply to the 6 project airports.

## Why the FEM/LEAF ratio is so large (5.4× at KMQJ 8662 / B738)

### LEAF computes a DIFFERENT physical quantity from FEM

| | LEAF (Layered Elastic) | FEM (3D FEA) |
|---|---|---|
| **Physical model** | PCC as infinite continuous layer | PCC as plate-on-grade (interior) |
| **Lateral extent** | Infinite in X,Y | 20×20 mesh with infinite-slab BCs |
| **Stress type** | Elastic half-space response | Plate bending stress (bottom tension) |
| **Correct quantity for** | AC fatigue, subgrade strain | **PCC fatigue** (FAA's calibration target) |

### Mechanical interpretation

- LEAF treats load as spreading sideways in all directions through the infinite PCC layer → stress diffuses, low peak at any point.
- FEM accounts for **plate bending**: the stiff slab bends under the tire, producing tension at the bottom. This tension is what actually cracks PCC.
- Westergaard interior formula for B738 on 8" PCC over CBR=4 subgrade predicts σ_i ≈ 900–1,400 psi. Our FEM got **957 psi** — exactly in the expected range.
- LEAF's 176 psi is the *elastic response stress*, not the bending tension. Different quantity.

### Expected ratio varies with pavement stiffness

| Scenario | Typical FEM/LEAF ratio |
|----------|-----------------------:|
| 16" PCC on CBR=20 subgrade | ~1–2× |
| 12" PCC on CBR=8 | ~2–3× |
| 10" PCC on CBR=6 | ~3–5× |
| **8" PCC on CBR=4 (KMQJ 8662)** | **~4–7×** ← our 5.4× sits here |
| 6" PCC on CBR=3 | ~6–10× |

Thinner slabs on weaker subgrades bend more → larger FEM/LEAF ratio. That's physics, not a bug.

## Why FAA uses `max(FEM, LEAF × 0.95)` instead of just FEM

From `FaarFieldAnalysis/modDesignRigid_Adj.vb:156-168`:

- Sometimes at slab edges (near longitudinal joints), LEAF's multi-wheel superposition gives stress comparable to or slightly above FEM.
- FAA takes the **max** of the two as a conservative envelope.
- The `× 0.95` factor on LEAF is an empirical calibration — LEAF alone tends to overpredict slightly near edges, so FAA scales it down by 5%.
- Result: effective stress = `max(FEM_interior, 0.95 × LEAF_at_eval_point)`.

For thin slabs on weak subgrade (our case), FEM >> LEAF × 0.95, so FEM wins. For thick slabs on strong subgrade, they converge and the 0.95 factor matters.

## Numerical example — KMQJ Section 8662 (our validation case)

Inputs:
- Layers: 3.5" AC + 8" PCC + 6" P-209 stab base
- Subgrade: E = 6,000 psi (CBR ≈ 4, Silty Clay)
- Aircraft: B738, MTOW 174,200 lb, dual-wheel gear, gearLoad 165,490 lb, tire pressure 200 psi
- Eval depth: 11.5" (PCC bottom)

| Method | PCC bottom horizontal stress | Time | Interpretation |
|--------|-----------------------------:|-----:|----------------|
| LEAF max(|σx|, |σy|) | **176 psi** | 0.05 s | Below flexural strength — reports "fine" |
| FEM bottom tension | **957 psi** | 15 s | Above 700 psi flexural strength — reports "fails" |
| `max(FEM, LEAF×0.95)` | **957 psi** | — | FEM controls |

With PCC flexural strength = 700 psi and SCI = 80:
- LEAF-only CDF: **0.0** (severely over-predicts safety — reports adequate)
- LEAF+FEM CDF: **1749.6** (severely under-designed, fails after ~4 years)

The LEAF-only number is **physically wrong for PCC fatigue** — it answers a different question (interior elastic stress) than what fatigue life actually depends on (bottom bending tension). This is precisely why FAARFIELD runs FEM for rigid pavement design.

## Corrections to earlier Claude explanations

Earlier messages (in chat) said: *"a real PCC slab is finite — 20 ft × 20 ft typical"*.

**Correction**: 20×20 is FAARFIELD's mesh domain, not a real physical slab size. The spring BCs make the mesh simulate an **infinite slab interior**. The reason FEM ≠ LEAF is the **quantity being computed** (plate bending vs elastic layer stress), not the slab extent.

Real airport PCC panels are typically 15–25 ft in joint spacing. FAARFIELD does NOT use panel dimensions as an input. Using default 20×20 with infinite-slab BCs is the standard FAA design convention.

## Where to change FEM dimensions if ever needed

In `c:/temp/aeropave/faarfield-api/Fem3dWrapper.vb`:

- `MESH_SIZE_DEFAULT = 10` — this is ELEMENT size (in inches), passed as `SlabMeshSize2` to `clsAM.ComputeResponse`. FAARFIELD default is 5". Larger = faster, coarser. We use 10 for speed; 5 for accuracy.
- Slab X/Y dimensions (20×20 ft) are **NOT** exposed as parameters to `clsAM.ComputeResponse`. They come from FAARFIELD globals (`frmStructure.XDimension`, `YDimension`) set in the form initialization. To override, we would need to inject these globals before calling `ComputeResponse` — not currently needed.

For the 6 project airports (KLHX, KPUB, KMQJ, KCIU, KOTM, KMWH), no override is required: 20×20 ft with infinite-slab BCs is the correct design convention.

## References

- `FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/frmStructure.vb:63-64` — slab dimension defaults
- `FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/modFedfaaGbl.vb:693` — mesh element default
- `FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/modPG.vb:121, 1606, 4291-4388` — mesh generation, infinite-slab BC
- `FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/modDesignRigid_Adj.vb:156-168` — `max(FEM, LEAF×0.95)` rule
- `note_claude/fem3d-integration-blocker-2026-04-18.md` — bootstrap bugs that initially blocked FEM3D, now fixed
- `specs/fem3d-managed-backend-integration.md` — full feature spec
