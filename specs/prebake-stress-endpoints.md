# Spec: Pre-Bake LEAF + FEM3D Stress Endpoints for Static Deploy

**Status:** executed 2026-04-26 (bake + cache + manifest + nativeStressClient.js wiring done; component-prop threading deferred)
**Estimated effort:** ~3.5 hr (revised: ~6 hr at top-5 aircraft per section)
**Actual effort:** ~35 min bake + ~30 min wiring/spec/test
**Author:** Chidchanok Pleesudjai (cpleesud@asu.edu)
**Date drafted:** 2026-04-25
**Decisions locked:** 2026-04-26
**Executed:** 2026-04-26 (commit pending)

---

## Execution result (2026-04-26 night)

- ✅ Canary KLHX_6627 / C130: leafGrid 56 kB, leafPoint 8 kB, fem3dMesh 1.17 MB. Well clear of all thresholds.
- ✅ Full bake: 65 (section, aircraft) pairs × 3 endpoints = 195 JSONs, **0 skips**, total **80 MB** in `public/data/precal/`.
- ✅ Manifest at `src/data/precal/index.json` (39 kB).
- ✅ Mirrored to `<project>/website/{src,public}/data/precal/` for git tracking.
- ✅ `nativeStressClient.js` extended with precal-fallback helper + optional `sectionKey` arg on all three fetchers (additive, backward-compatible — existing call sites unchanged).
- ⏸️ **Deferred:** threading `sectionKey` through `StressContourPanel`, `RigidStressProfile`, `Fem3dMeshPanel` from `DesignTool.jsx`. Required for offline mode to actually engage. Skipped this session because component-level changes need browser smoke-testing and the user has a presentation imminent. Tracked as next-step.

---

## What / Why

Today the AeroPave React frontend has three stress-visualization panels (LEAF stress contour grid, LEAF rigid stress profile, FEM3D mesh + per-element stress tensor) that only work when `FaarfieldApi.exe` is running on `localhost:5100`. This blocks a full Netlify static deploy of the `Pleesudjai/Aeropave` repo, since Netlify cannot run the .NET 4.8 backend.

This spec captures, for each of the 13 project sections, the response of three backend endpoints into static JSON files under `src/data/precal/`. The frontend's existing fallback path (`fetchLeafGrid` etc. already return `{ data: null, source: 'unavailable' }` on network error) is extended to consult the precal JSONs first when `nativeAvailable === false`. Result: stress visualizations render on Netlify with no backend; the live backend remains the source of truth when running locally.

This is **optional polish** — the in-room class presentation works fine with the local two-terminal demo. The deliverable is "shareable URL after the presentation."

---

## Inputs

### Source-of-truth files (read-only)
- `results/cdf_results.json` — 13 sections; provides `top_aircraft_full` per section, used to pick the controlling aircraft per section. Mirror at `website/src/data/cdf_results.json` and `c:/temp/aeropave/src/data/cdf_results.json`.
- `scripts/all_airports_cdf_native.py` (lines 40–end) — canonical `AIRPORTS` dict with `layers` and `subgrade` dicts per section. **The prebake script imports from here so layer/subgrade definitions stay in lockstep with the CDF run.**
- `c:/temp/aeropave/src/api/nativeStressClient.js` — authoritative request-body shape for each endpoint. Prebake requests must match exactly so cached responses are interchangeable with live ones.
- `c:/temp/aeropave/faarfield-api/HttpRouter.vb` — confirms the three route paths and DTO field names.

### Live dependencies
- `FaarfieldApi.exe` running at `http://localhost:5100` with all four engines available (`leafAvailable: true`, `femAvailable: true`, `fem3dAvailable: true`, `analysisAvailable: true`).
- Aircraft library loaded (`aircraftCount: 1310, aircraftWithGeometry: 136` per current health endpoint).

---

## Outputs

### Static JSON cache (hybrid layout per locked decision Q2)

**Manifest (build-time import, small):**
```
c:/temp/aeropave/src/data/precal/
  index.json                              <- 13 sections × top-5 aircraft mapping
```

**Payloads (runtime fetch from /public/, large):**
```
c:/temp/aeropave/public/data/precal/
  leaf_grid/{ICAO}_{sectionId}_{aircraftIcao}.json       <- 13 × 5 = 65 files
  leaf_point/{ICAO}_{sectionId}_{aircraftIcao}.json      <- 13 × 5 = 65 files
  fem3d_mesh/{ICAO}_{sectionId}_{aircraftIcao}.json      <- 13 × 5 = 65 files
```

Total: **195 payload JSONs + 1 manifest = 196 files**. After bake, `robocopy` BOTH `src/data/precal/` AND `public/data/precal/` into `<project root>/website/...` for git tracking, matching the existing `cdf_results.json` mirror convention.

**`index.json` schema (revised for top-5 per section):**
```json
{
  "generatedAt": "2026-04-26T22:00:00Z",
  "backendVersion": "0.3.0",
  "topN": 5,
  "sections": [
    {
      "sectionKey": "KLHX_6627",
      "icao": "KLHX",
      "sectionId": "6627",
      "aircraft": [
        {
          "icao": "C17",
          "rank": 1,
          "isControlling": true,
          "cdfContribution": 0.842,
          "leafGridPath": "/data/precal/leaf_grid/KLHX_6627_C17.json",
          "leafPointPath": "/data/precal/leaf_point/KLHX_6627_C17.json",
          "fem3dMeshPath": "/data/precal/fem3d_mesh/KLHX_6627_C17.json",
          "requestHash": "sha256:abc123…",
          "sizes": { "leafGrid": 240000, "leafPoint": 4200, "fem3dMesh": 11500000 }
        }
        // ranks 2–5 follow same shape, isControlling: false
      ]
    }
  ]
}
```

### Frontend wiring (code changes, light)
- `src/api/nativeStressClient.js` — extend `fetchLeafGrid`, `fetchLeafProfile`, `fetchFem3dMesh` so that when the live POST fails (`source: 'unavailable'` / `'error …'`), the function falls back to a `fetch('/data/precal/<endpoint>/<sectionKey>_<aircraftIcao>.json')` keyed on the current section AND the active aircraft. If the precal JSON exists for that pair, return `{ data, source: 'precal' }`.
- `src/data/precal/index.json` — imported at build time so the client knows which (section, aircraft) pairs have precal coverage.
- Aircraft dropdown UX: when offline, gray out aircraft outside the top-5 set for the active section (or annotate "live backend required"). The top-5 set drives the controlling-aircraft view plus the user's natural drill-down on the next 4 contributors.
- No changes to React components beyond the dropdown gating — they already consume the response shape produced by these endpoints.

### Deliverable scripts
- `scripts/prebake_stress_endpoints.py` — main runner.
- `scripts/prebake_stress_endpoints.md` (optional) — inline run log / size summary for the audit trail.

---

## Algorithm (4 phases, mirrors existing batch-runner idiom)

### Phase 0 — Canary on KLHX_6627 (decision Q3)
Before iterating all 195 calls, bake JUST the controlling aircraft of `KLHX_6627` (all three endpoints) and inspect FEM3D payload size:
- **≤ 30 MB**: proceed to Phase 1 with `highDetail: false, filterCoarse: true`.
- **30–50 MB**: sub-sample interior Gauss points (keep top + bottom GP only per brick element); re-bake the canary; if under 30 MB, lock that subsample setting for all 195 calls and proceed.
- **> 50 MB**: halt and escalate.

Sanity: `leaf_grid` should be ~100–500 kB; `leaf_point` ~5–20 kB. Anything an order of magnitude off → halt.

Halt and surface the canary numbers before continuing to Phase 1. (Decision Q4 — MOR/SCI cache axis — was resolved structurally in the Decisions Locked block; no empirical test needed.)

### Phase 1 — Build per-(section, aircraft) request bundles (top-5 per section)
For each of the 13 sections:
1. Read `layers[]` and `subgrade{}` from `all_airports_cdf_native.AIRPORTS[icao]['sections'][i]`. (Import the dict directly; do not re-define.)
2. Read `top_aircraft_full` from `results/cdf_results.json` for that section. **Take the first 5 entries** (already sorted by `cdf_contribution`). Tag rank 1 as `isControlling: true`; ranks 2–5 as `isControlling: false`.
3. For each of the 5 aircraft, resolve geometry by `GET /api/aircraft/resolve/{icao}` (existing endpoint) to populate `gear`, `mtow`, `gearLoad`, `nTires`, `tirePressure`, `tireSpacingIn`, wheel coords. Cache per-aircraft (the same C17 block is reused across sections that share C17 in their top-5, e.g. KMWH 37325/37508 + KCIU + KPUB).
4. Compute the request hash `sha256(JSON.stringify({layers, subgrade, aircraft.icao}))` and stash it as `_meta.requestHash` in each precal payload so the frontend can detect divergence after a slider drag.

### Phase 2 — Bake the three endpoints, per (section, aircraft) pair
**13 sections × 5 aircraft × 3 endpoints = 195 backend calls.** Iterate sections outer, aircraft inner; bake all three endpoints for one (section, aircraft) pair before advancing. 2 s sleep between calls (backend is single-threaded `HttpListener`):

**A. `POST /api/leaf/grid`**
Request body:
```json
{ "layers": [...], "subgrade": {...},
  "aircraft": { "name", "icao", "gear", "mtow", "gearLoad", "nTires",
                "tirePressure", "tireSpacingIn" },
  "evalDepthIn": <top of PCC>, "gridExtentIn": null, "gridPoints": 80 }
```
- `evalDepthIn` = sum of AC layer thicknesses (top of PCC, where σ_x is critical).
- `gridExtentIn: null` → backend auto-scales from wheel coords.
- Save raw response to `public/data/precal/leaf_grid/{ICAO}_{sectionId}_{aircraftIcao}.json`.

**B. `POST /api/leaf/point`**
Request body:
```json
{ "layers": [...], "subgrade": {...},
  "aircraft": {...same as above...},
  "evalDepths": [<41 evenly spaced depths from 0 to total slab thickness>],
  "evalX": 0, "evalY": 0 }
```
- 41 depths matches the existing CDF profile resolution (`cdf_profile_offsets_in` is 41 points).
- Save to `public/data/precal/leaf_point/{ICAO}_{sectionId}_{aircraftIcao}.json`.

**C. `POST /api/fem3d/mesh`**
Request body:
```json
{ "layers": [...], "subgrade": {...},
  "aircraft": {...same as above...},
  "highDetail": false, "filterCoarse": true,
  "includeStressField": true, "stressAggregation": "mean" }
```
- `highDetail: false` + `filterCoarse: true` keeps payload manageable (~5–15 MB per pair vs. 100+ MB at high detail).
- Save to `public/data/precal/fem3d_mesh/{ICAO}_{sectionId}_{aircraftIcao}.json`.

### Phase 3 — Backend-resilience guards
- Before each (section, aircraft) pair, `GET /api/health` and verify all four `*Available` flags are `true`. If any flip false, retry 3× with 8 s spacing (matches frontend `failStreak` tolerance), then abort the pair with a logged warning rather than crashing the whole bake.
- After `fem3d/mesh` (the heaviest call), tail the size of the response. If **> 30 MB** invoke the canary's GP-subsample path automatically; if **> 50 MB** log a warning and emit a placeholder JSON with `_meta.skipped: 'oversized'`.
- On `ConnectionResetError [WinError 10054]` (the same failure that drove `rerun_kmwh_37508_split.py`), kill + restart `FaarfieldApi.exe`, wait for `health == ok`, and resume from the next pair.
- Restart `FaarfieldApi.exe` proactively every **20 pairs** (~halfway through one section batch) to avoid accumulator-style memory bloat. Mirrors the proven KMWH split idiom.

### Phase 4 — Mirror + manifest
1. Compute per-file sizes; assemble `src/data/precal/index.json` manifest with the top-5-per-section schema above.
2. `robocopy c:/temp/aeropave/src/data/precal/ <project root>/website/src/data/precal/ /MIR` (manifest only; small).
3. `robocopy c:/temp/aeropave/public/data/precal/ <project root>/website/public/data/precal/ /MIR` (the 195 payloads).
4. Print a summary table: `sectionKey | aircraftIcao | rank | leafGrid kB | leafPoint kB | fem3dMesh kB | total MB | status`.
5. Final tally: total cache size, count of skipped pairs, pairs needing GP-subsample remediation.

---

## Frontend wiring detail (the small code change)

`src/api/nativeStressClient.js` — extend each fetcher:

```js
import precalIndex from '../data/precal/index.json';

async function loadPrecalIfAvailable(sectionKey, aircraftIcao, endpoint) {
  const section = precalIndex.sections.find(s => s.sectionKey === sectionKey);
  if (!section) return null;
  const ac = section.aircraft.find(a => a.icao === aircraftIcao);
  if (!ac) return null;  // aircraft not in this section's top-5
  const path = ac[`${endpoint}Path`];
  try {
    const r = await fetch(path);
    if (!r.ok) return null;
    const data = await r.json();
    return { data, source: 'precal', requestHash: ac.requestHash };
  } catch { return null; }
}
```

Then in `fetchLeafGrid` etc., on the existing error branches:
```js
if (sectionKey && aircraft?.icao) {
  const precal = await loadPrecalIfAvailable(sectionKey, aircraft.icao, 'leafGrid');
  if (precal) return precal;
}
return { data: null, source: 'unavailable' };
```

The caller threads `sectionKey` (e.g., `${icao}_${sectionId}`) and the active `aircraft.icao` into the three `fetch*` signatures.

**Cache-validity guard:** precal payloads are pinned to as-built `layers + subgrade + aircraft.icao`. If the user drags the layer-thickness slider, edits MOR, or picks an aircraft outside the top-5 set, the cache no longer applies. Compute `sha256({layers, subgrade, aircraft.icao})` on each live call; only return precal when the live hash equals `ac.requestHash`. Otherwise surface "live backend required" UX (gray-out / banner).

---

## Sections involved (all 13)

| # | sectionKey | Layers (top→bottom) | Controlling aircraft (from cdf_results.json) |
|---|---|---|---|
| 1 | KLHX_6627 | 2.5″ AC + 6″ PCC | TBD (read from `top_aircraft_full[0]`) |
| 2 | KLHX_7347 | 2″ AC + 10″ PCC | TBD |
| 3 | KPUB_6948 | 2.5″ AC + 7″ PCC + 6″ Subbase | TBD (likely C17 or B737) |
| 4 | KMQJ_8662 | 3.5″ AC + 8″ PCC + 6″ Stab | TBD |
| 5 | KMQJ_8881 | 3.5″ AC + 8″ PCC + 6″ Stab | TBD |
| 6 | KMQJ_8640 | 3.5″ AC + 8″ PCC + 6″ Stab | TBD |
| 7 | KMQJ_8780 | 3.5″ AC + 8″ PCC + 6″ Stab | TBD |
| 8 | KCIU_21222 | 2.5″ AC + 24″ PCC | TBD |
| 9 | KOTM_28171 | 2.5″ AC + 8″ PCC | TBD |
| 10 | KOTM_27450 | 3″ AC + 9″ PCC | TBD |
| 11 | KOTM_27641 | 3″ AC + 8″ PCC | TBD |
| 12 | KMWH_37325 | 2″ AC + 6″ PCC + 12″ Agg | C17 (confirmed in handoff) |
| 13 | KMWH_37508 | 2″ AC + 6″ PCC + 12″ Agg | C17 (confirmed in handoff) |

---

## Decisions locked (2026-04-26)

1. **Top-N = 5** per section. 13 × 5 × 3 = **195 payload JSONs**. Aircraft are the first 5 entries of `top_aircraft_full` per section (sorted by `cdf_contribution`); rank 1 = controlling, ranks 2–5 = drill-down set.
2. **Hybrid storage:** small `index.json` in `src/data/precal/` (build-time import, ~10 kB); the 195 large payloads in `public/data/precal/{leaf_grid,leaf_point,fem3d_mesh}/` (runtime fetch).
3. **Canary on KLHX_6627 first.** If `fem3d_mesh` for that section's controlling aircraft exceeds 30 MB, sub-sample interior Gauss points (keep top + bottom GP only) before iterating the rest. Halt and surface results before running the other 12.
4. **MOR / SCI not in cache key (structurally guaranteed).** LEAF and FEM3D return raw elastic stresses, which depend only on `(layer thicknesses, layer E, subgrade E, wheel loads)`. MOR enters only the PCC fatigue law (Nf = f(σ_x / MOR)) which is already pre-baked into `cdf_results.json` via the CDF endpoint. The user uses one fixed MOR per section (0.08 × f'c = 0.08 × 4500 psi = 360 psi); even hypothetically there's no MOR axis to add. **No empirical MOR test needed on the canary.** The DTOs (`LeafGridRequest`, `LeafPointRequest`) confirm this structurally — neither has a `morPsi` field.

---

## Out of scope

- **CDF prebake** — already done; `cdf_results.json` is the existing precal artifact.
- **Aircraft dropdown switching offline beyond top-5** — only ranks 1–5 per section are baked. Ranks 6+ require the live backend.
- **Slider-driven recompute offline** — layer-thickness / MOR drags require the live backend; precal fallback is for the as-built section only.
- **Re-baking on every backend code change** — bake is manual, triggered when the backend's stress logic changes materially. Document in `docs/decisions.md` when run.
- **Backend changes** — the three endpoints already return what's needed; no `.vb` edits required.

---

## Validation / acceptance

The bake passes if:
- [ ] **Canary OK**: KLHX_6627 controlling-aircraft FEM3D ≤ 30 MB (or sub-sample remediation applied); leaf_grid ~100–500 kB, leaf_point ~5–20 kB.
- [ ] `index.json` lists all 13 sections × 5 aircraft each (= 65 aircraft entries).
- [ ] All **195** payload JSONs exist (`leaf_grid` 65 + `leaf_point` 65 + `fem3d_mesh` 65); none are `null`, `{}`, or carry `_meta.skipped`.
- [ ] Both `src/data/precal/` (manifest) AND `public/data/precal/` (payloads) trees are byte-identical between `c:/temp/aeropave/` and `<project root>/website/` via `robocopy /MIR`.
- [ ] Spot-check `KMWH_37508` with C17 (rank 1) and the rank-2 aircraft: both render LEAF grid + LEAF profile + FEM3D mesh in browser with `FaarfieldApi.exe` killed. Switching the aircraft dropdown within the top-5 set updates panels using precal data; switching outside the top-5 surfaces "live backend required."
- [ ] Total `public/data/precal/` tree < **500 MB** (Netlify free-tier comfortable; revised up from 200 MB to account for top-5 instead of top-1).

---

## Run recipe

```cmd
:: Terminal 1 — backend (must be healthy first)
c:\temp\aeropave\faarfield-api\bin\x86\Release\FaarfieldApi.exe

:: Terminal 2 — verify health
curl http://localhost:5100/api/health

:: Terminal 3 — canary first (halts after KLHX_6627 controlling aircraft + MOR check)
cd /d "C:\Users\chidc\ASU Dropbox\Chidchanok Pleesudjai\PhD COURSES\2026 Spring\CEE 598 Topic Airport Design\03 Final Project"
py scripts\prebake_stress_endpoints.py --canary

:: Terminal 3 — full run (only after canary passes)
py scripts\prebake_stress_endpoints.py --all
```

Expected runtime: **~6 hr** for the full 195-call run (most of it `fem3d/mesh` at ~10–12 min per call). Canary alone: ~15 min. Plan for an overnight run.

---

## Handoff

All four open questions resolved 2026-04-26. Run `/execute prebake-stress-endpoints` to implement.