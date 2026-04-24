function caseData = run_custom_pavement_case(request, options)
%RUN_CUSTOM_PAVEMENT_CASE Build and solve a MATLAB-generated structured mesh.
%
%   caseData = faasr3d.run_custom_pavement_case(request, options)

if nargin < 1 || isempty(request)
    request = faasr3d.make_faarfield_mesh_request();
end
if nargin < 2 || isempty(options)
    options = struct();
end

opts = struct( ...
    'baseUrl', 'http://localhost:5100', ...
    'apiExePath', '', ...
    'autoStartApi', false, ...
    'forceRestartApi', false, ...
    'apiWaitTimeoutSec', 30, ...
    'apiTimeoutSec', 600, ...
    'saveJsonPath', '', ...
    'meshMode', 'band-refined', ...
    'meshOptions', struct(), ...
    'buildOptions', struct(), ...
    'solveOptions', struct(), ...
    'plotLayerStack', true, ...
    'plotMesh', true, ...
    'plotWheelBirdseye', true, ...
    'plotResponse', true, ...
    'layerStackPlotOptions', struct(), ...
    'wheelBirdseyePlotOptions', struct(), ...
    'responsePlotOptions', struct());
opts = local_merge_structs(opts, options);

if opts.autoStartApi
    faasr3d.start_faarfield_api(struct( ...
        'baseUrl', opts.baseUrl, ...
        'exePath', opts.apiExePath, ...
        'forceRestart', opts.forceRestartApi, ...
        'waitTimeoutSec', opts.apiWaitTimeoutSec));
end

[apiResult, referenceMeshData] = faasr3d.fetch_faarfield_mesh(request, struct( ...
    'baseUrl', opts.baseUrl, ...
    'timeoutSec', opts.apiTimeoutSec, ...
    'saveJsonPath', opts.saveJsonPath));

meshOpts = local_merge_structs(struct('mode', opts.meshMode), opts.meshOptions);
[customMeshData, customMeshInfo] = faasr3d.generate_structured_pavement_mesh(request, referenceMeshData, meshOpts);

model = faasr3d.build_pavement_fem_model(customMeshData, request, opts.buildOptions);
results = faasr3d.solve_pavement_fem_model(model, opts.solveOptions);

figures = struct('layerStack', [], 'mesh', [], 'wheelBirdseye', [], 'response', []);
if opts.plotLayerStack
    figures.layerStack = figure('Name', 'Pavement Layer Stack');
    ax = axes('Parent', figures.layerStack);
    faasr3d.plot_layer_stack(request, local_merge_structs(struct('parent', ax), opts.layerStackPlotOptions));
end
if opts.plotMesh
    figures.mesh = figure('Name', 'Custom MATLAB Mesh');
    ax = axes('Parent', figures.mesh);
    faasr3d.plot_faarfield_mesh(customMeshData, struct('parent', ax, 'title', sprintf('Custom MATLAB Mesh (%s)', customMeshInfo.mode)));
end
if opts.plotWheelBirdseye
    figures.wheelBirdseye = figure('Name', 'Wheel Locations');
    ax = axes('Parent', figures.wheelBirdseye);
    faasr3d.plot_wheel_birdseye(customMeshData, local_merge_structs(struct('parent', ax), opts.wheelBirdseyePlotOptions));
end
if opts.plotResponse
    figures.response = faasr3d.plot_pavement_response(model, results, opts.responsePlotOptions);
end

summary = struct( ...
    'meshMode', customMeshInfo.mode, ...
    'apiComputeTimeMs', local_get_field(apiResult, 'computeTimeMs', nan), ...
    'nNodes', model.summary.nNodes, ...
    'nElements', model.summary.nElements, ...
    'minUzIn', results.summary.minUzIn, ...
    'maxAbsDisplacementIn', results.summary.maxAbsDisplacementIn, ...
    'totalVerticalLoadLbf', model.summary.totalVerticalLoadLbf, ...
    'referenceLoadCount', customMeshInfo.loadTransfer.nReferenceLoads, ...
    'assignedLoadCount', customMeshInfo.loadTransfer.nAssignedLoads);

caseData = struct();
caseData.request = request;
caseData.apiResult = apiResult;
caseData.referenceMeshData = referenceMeshData;
caseData.customMeshData = customMeshData;
caseData.customMeshInfo = customMeshInfo;
caseData.model = model;
caseData.results = results;
caseData.summary = summary;
caseData.figures = figures;
end

function value = local_get_field(s, name, fallback)
if isstruct(s) && isfield(s, name)
    value = s.(name);
else
    value = fallback;
end
end

function out = local_merge_structs(base, overrides)
out = base;
if isempty(overrides)
    return;
end

names = fieldnames(overrides);
for k = 1:numel(names)
    out.(names{k}) = overrides.(names{k});
end
end
