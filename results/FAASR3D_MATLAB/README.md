# FAASR3D MATLAB Port

This folder contains a MATLAB translation of the FAASR layer from:

- `FAARFIELD_2.1.1_SourceCode/FAARFIELD/FEMClassLib/FAASR`

The port keeps the FAASR boundary honest. It translates the driver, shared-state transfer, load-step helpers, text readers, NIKE writer, and debug CSV writers. The deeper finite-element kernels are not in the FAASR folder, so they are left as callback boundaries rather than silently guessed.

## What Is Included

- `+faasr3d/faasr3d.m`
  - Translation of `clsFAASR3D.vb`
  - Preserves the same high-level flow: `TransData -> InitialSet -> WinYield -> inputi -> intial -> solve -> EraseInput`
- `+faasr3d/trans_data.m`
  - Translation of `clsTransData.vb`
- `+faasr3d/write_nike.m`
  - Translation of `clsWriteNike.vb`
- `+faasr3d/initial_set.m`, `set_step1.m`, `set_step2.m`, `erase_input.m`, `erase_output.m`
  - Direct translations of the helper routines in `FAASR`
- `+faasr3d/cnlds.m`, `ldcvs.m`
  - MATLAB readers for the same text-card formats
- `+faasr3d/DebugWrite.m`
  - MATLAB version of `modWrite.vb`
- `+faasr3d/make_input_cards.m`, `make_com_state.m`
  - Structure templates matching the VB.NET data containers

## Solver Boundary

The following routines are outside the FAASR folder and were not force-translated in this pass:

- `clsInput.inputi`
- `clsInitial.intial`
- `clsSolve.solve`

In the MATLAB port, these are supplied as callbacks:

- `inputiFn`
- `intialFn`
- `solveFn`

That keeps the translated code comparable to the VB source and makes it easy to extend with later ports of `Input`, `Initial`, and `Solve`.

## Quick Start

```matlab
addpath('results/FAASR3D_MATLAB');

ipc = faasr3d.make_input_cards(struct( ...
    'nmmat', 0, 'numnp', 0, 'numelh', 0, 'numsv', 0, ...
    'inpsd', 0, 'ntime', 1, 'nlcur', 1, 'nptm', 2, ...
    'nload', 0, 'numpc', 0, 'numdc', 0, 'nrcc', 0, ...
    'ia', zeros(0, 1)));

opts = struct( ...
    'workingDir', fullfile(tempdir, 'faasr3d_demo'), ...
    'filenameOnly', 'demo_case', ...
    'modelOut', 1, ...
    'cleanupState', false, ...
    'inputiFn', @(state, ~) state, ...
    'intialFn', @(state) state, ...
    'solveFn', @(state, iStep, s1, s8, ~, ~) deal(state, s1, s8));

[stress1, stress8, state, runInfo] = faasr3d.faasr3d(ipc, opts);
```

## Get Mesh From FAARFIELD

For real pavement FEM mesh extraction, use the existing FAARFIELD API executable in this repo:

- `website\faarfield-api\bin\x86\Release\FaarfieldApi.exe`

That executable already exposes:

- `POST /api/fem3d/mesh`

The MATLAB helper flow is:

```matlab
addpath('C:\Users\chidc\ASU Dropbox\Mobasher_Group\Research\2024_Primekss\2025_Pimekss_Round_Panel\00 Literature and MATLAB\3DFEM Matlab');

request = faasr3d.make_faarfield_mesh_request(struct( ...
    'aircraft', struct('icao', 'B738', 'gear', 'D', 'mtow', 174200, ...
                       'name', 'B737-800', 'gearLoad', 0, ...
                       'nTires', 0, 'tirePressure', 200, 'tireSpacingIn', 0), ...
    'includeFullConnectivity', true));

[result, meshData] = faasr3d.fetch_faarfield_mesh(request);

size(meshData.solver.nodes)    % full solver nodes
size(meshData.solver.bricks)   % 8-node brick connectivity

faasr3d.plot_faarfield_mesh(meshData);
```

## Run A Full Pavement FEM Case In MATLAB

Once the API is available, you can fetch the FAARFIELD mesh and solve the
brick model directly in MATLAB:

```matlab
addpath('C:\Users\chidc\ASU Dropbox\Mobasher_Group\Research\2024_Primekss\2025_Pimekss_Round_Panel\00 Literature and MATLAB\3DFEM Matlab');

request = faasr3d.make_faarfield_mesh_request(struct( ...
    'layers', [ ...
        struct('type', 'PCC slab',   'h', 14.0, 'E', 4.0e6, 'nu', 0.15) ...
        struct('type', 'Base layer', 'h', 8.0,  'E', 5.0e4, 'nu', 0.35) ...
    ], ...
    'subgrade', struct('E', 15000, 'nu', 0.40), ...
    'includeFullConnectivity', true));

caseData = faasr3d.run_pavement_fem_case(request, struct( ...
    'apiExePath', ['C:\Users\chidc\ASU Dropbox\Chidchanok Pleesudjai\' ...
        'PhD COURSES\2026 Spring\CEE 598 Topic Airport Design\03 Final Project\' ...
        'website\faarfield-api\bin\x86\Release\FaarfieldApi.exe'], ...
    'autoStartApi', true, ...
    'forceRestartApi', false, ...
    'apiTimeoutSec', 900));

caseData.summary
```

Key MATLAB entry points:

- `+faasr3d/build_pavement_fem_model.m`
  - Converts `solverNodes`, `solverBricks`, exported FAARFIELD boundary codes,
    and exported nodal loads into a MATLAB FEM assembly model.
- `+faasr3d/solve_pavement_fem_model.m`
  - Sparse linear elastic HEX8 solver written fully in MATLAB.
- `+faasr3d/run_pavement_fem_case.m`
  - One-command pipeline: start API, fetch mesh, build model, solve, plot.
- `+faasr3d/generate_structured_pavement_mesh.m`
  - MATLAB-native structured HEX8 mesh generator with `uniform` and
    `band-refined` modes.
- `+faasr3d/run_custom_pavement_case.m`
  - Uses FAARFIELD only as a wheel/load reference, then solves on a MATLAB
    structured mesh.
- `+faasr3d/plot_layer_stack.m`
  - Figure 1 style layer-stack view with meaningful material colors and labels.
- `+faasr3d/plot_wheel_birdseye.m`
  - Top-view figure showing wheel locations over the pavement surface.
- `example_run_pavement_case.m`
  - Ready-to-run pavement template for slab/base/subgrade.
- `template_edit_pavement_case.m`
  - Edit-friendly template for your own pavement section and aircraft.
- `example_run_custom_band_mesh_case.m`
  - Example of a custom MATLAB mesh refined under the wheel band instead of
    using the exact FAARFIELD mesh.
- `example_synthetic_hex8_solver.m`
  - Pure MATLAB smoke test that does not depend on the API.

## Custom MATLAB Mesh

If you want a research mesh that is easier to control than FAARFIELD's
internal nonuniform mesh, use the custom structured-mesh workflow:

```matlab
addpath('C:\Users\chidc\ASU Dropbox\Mobasher_Group\Research\2024_Primekss\2025_Pimekss_Round_Panel\00 Literature and MATLAB\3DFEM Matlab');
caseData = example_run_custom_band_mesh_case();
```

That path:

- fetches FAARFIELD wheel/load placement
- builds a MATLAB HEX8 mesh
- transfers FAARFIELD nodal loads onto the MATLAB top surface
- solves the model with the MATLAB solver

Two mesh modes are supported:

- `uniform`
  - same horizontal spacing everywhere
- `band-refined`
  - fine rectangular band under the wheel group, coarse farther away

What you get back:

- `meshData.surface.nodes`, `meshData.surface.tris`
  - Compact mirrored surface mesh for visualization
- `meshData.solver.nodes`, `meshData.solver.bricks`
  - Real FAARFIELD solver mesh connectivity for MATLAB analysis
- `meshData.elementStressTensor`
  - Per-brick stress tensor if `includeStressField = true`

Notes:

- `solver` mesh is the real FAARFIELD half-model, before the Y-mirror used for display.
- Set `includeFullConnectivity = true` when you want actual 8-node brick connectivity.
- Set `includeStressField = true` if you also want per-brick stresses. That is slower because the API performs a second FAASR3D solve.
- If an older `FaarfieldApi.exe` is already running on port `5100`, set
  `forceRestartApi = true` in `run_pavement_fem_case` so MATLAB restarts the
  API from the executable path you provide.

## Notes

- The VB code used Win32 global atoms for stop requests. MATLAB does not have a direct cross-platform equivalent, so `win_yield.m` and `del_atom.m` use an optional stop-flag file instead.
- The VB code mixes 1-based arrays with a few flattened vectors that originated in older NIKE-style layouts. The MATLAB translation keeps the same field names and indexing formulas, but it stores arrays in normal MATLAB 1-based form.
- `function_inventory.csv` maps the original VB routines to the generated MATLAB files.
