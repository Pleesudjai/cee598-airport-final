function model = build_pavement_fem_model(meshData, request, options)
%BUILD_PAVEMENT_FEM_MODEL Convert a FAARFIELD mesh DTO into FEM assembly data.
%
%   model = faasr3d.build_pavement_fem_model(meshData, request)
%
% The returned model is MATLAB-native and ready for sparse linear assembly:
%   - nodes            [nNode x 3] coordinates, inches
%   - elements         [nElem x 8] HEX8 connectivity, 1-based
%   - layers           struct array of per-layer material properties
%   - elementE/elementNu
%   - forceVector      [3*nNode x 1] nodal load vector, lbf
%   - fixedDofs        constrained translational DOFs
%   - freeDofs         unconstrained translational DOFs

if nargin < 2 || isempty(request)
    request = faasr3d.make_faarfield_mesh_request();
end
if nargin < 3 || isempty(options)
    options = struct();
end

opts = struct( ...
    'compressUnusedNodes', true, ...
    'useExportedBoundaryCodes', true, ...
    'loadScale', 1.0);
opts = local_merge_structs(opts, options);

if ~isstruct(meshData) || ~isfield(meshData, 'solver')
    error('faasr3d:build_pavement_fem_model:InvalidMesh', ...
        'meshData must be the struct returned by faasr3d.mesh_to_matrices.');
end

solver = meshData.solver;
if ~isfield(solver, 'nodes') || isempty(solver.nodes) || ...
        ~isfield(solver, 'bricks') || isempty(solver.bricks)
    error('faasr3d:build_pavement_fem_model:MissingConnectivity', ...
        'solver.nodes and solver.bricks are required. Request includeFullConnectivity = true.');
end

nodes = double(solver.nodes);
elements = double(solver.bricks);

if size(nodes, 2) ~= 3
    error('faasr3d:build_pavement_fem_model:NodeShape', ...
        'solver.nodes must be n-by-3.');
end
if size(elements, 2) ~= 8
    error('faasr3d:build_pavement_fem_model:ElementShape', ...
        'solver.bricks must be m-by-8 for HEX8 elements.');
end

nNodesRaw = size(nodes, 1);
nElem = size(elements, 1);

layerIdsRaw = ones(nElem, 1);
if isfield(solver, 'layerIds') && ~isempty(solver.layerIds)
    layerIdsRaw = double(solver.layerIds(:)) + 1;
end
if numel(layerIdsRaw) ~= nElem
    error('faasr3d:build_pavement_fem_model:LayerCount', ...
        'solver.layerIds length does not match solver.bricks.');
end

boundaryCodes = zeros(nNodesRaw, 1);
if isfield(solver, 'nodeBoundaryCodes') && ~isempty(solver.nodeBoundaryCodes)
    boundaryCodes = double(solver.nodeBoundaryCodes(:));
    if numel(boundaryCodes) ~= nNodesRaw
        error('faasr3d:build_pavement_fem_model:BoundaryCount', ...
            'solver.nodeBoundaryCodes length does not match solver.nodes.');
    end
end

loadNodeIds = [];
loadValues = [];
if isfield(solver, 'loadNodeIds') && ~isempty(solver.loadNodeIds)
    loadNodeIds = double(solver.loadNodeIds(:));
end
if isfield(solver, 'loadValues') && ~isempty(solver.loadValues)
    loadValues = double(solver.loadValues(:));
end
if ~isempty(loadNodeIds) && numel(loadNodeIds) ~= numel(loadValues)
    error('faasr3d:build_pavement_fem_model:LoadCount', ...
        'solver.loadNodeIds and solver.loadValues must have the same length.');
end

usedNodeMask = false(nNodesRaw, 1);
usedNodeMask(elements(:)) = true;
if ~isempty(loadNodeIds)
    usedNodeMask(loadNodeIds) = true;
end

nodeIdMapOldToNew = zeros(nNodesRaw, 1);
if opts.compressUnusedNodes
    keptOldIds = find(usedNodeMask);
else
    keptOldIds = (1:nNodesRaw).';
end
nodeIdMapOldToNew(keptOldIds) = 1:numel(keptOldIds);

nodes = nodes(keptOldIds, :);
boundaryCodes = boundaryCodes(keptOldIds);
elements = reshape(nodeIdMapOldToNew(elements), size(elements));

if any(elements(:) <= 0)
    error('faasr3d:build_pavement_fem_model:InvalidNodeMap', ...
        'Element connectivity references nodes removed during compression.');
end

if ~isempty(loadNodeIds)
    loadNodeIds = nodeIdMapOldToNew(loadNodeIds);
    validLoadMask = loadNodeIds > 0;
    loadNodeIds = loadNodeIds(validLoadMask);
    loadValues = loadValues(validLoadMask) * opts.loadScale;
end

nNodes = size(nodes, 1);
ndof = 3 * nNodes;

if isfield(meshData, 'layers') && ~isempty(meshData.layers)
    layerGeom = meshData.layers;
else
    layerGeom = repmat(struct('id', 0, 'name', '', 'zTop', nan, 'zBot', nan, 'thickness', nan), max(layerIdsRaw), 1);
end
layers = local_build_layer_table(layerGeom, request, max(layerIdsRaw));

elementE = zeros(nElem, 1);
elementNu = zeros(nElem, 1);
for e = 1:nElem
    lid = layerIdsRaw(e);
    elementE(e) = layers(lid).E;
    elementNu(e) = layers(lid).nu;
end

forceVector = zeros(ndof, 1);
if ~isempty(loadNodeIds)
    zDofs = 3 * (loadNodeIds - 1) + 3;
    forceVector = accumarray(zDofs, loadValues, [ndof, 1], @sum, 0);
end

fixedDofs = [];
if opts.useExportedBoundaryCodes && ~isempty(boundaryCodes)
    fixedDofs = local_boundary_codes_to_dofs(boundaryCodes, nNodes);
end
fixedDofs = unique(fixedDofs(:), 'sorted');

allDofs = (1:ndof).';
isFixed = false(ndof, 1);
isFixed(fixedDofs) = true;
freeDofs = allDofs(~isFixed);

if isempty(freeDofs)
    error('faasr3d:build_pavement_fem_model:NoFreeDofs', ...
        'No free DOFs remain after applying boundary conditions.');
end

model = struct();
model.units = struct('length', 'in', 'force', 'lbf', 'stress', 'psi');
model.nodes = nodes;
model.elements = elements;
model.layerIds = layerIdsRaw;
model.layers = layers;
model.elementE = elementE;
model.elementNu = elementNu;
model.nodeBoundaryCodes = boundaryCodes;
model.forceVector = forceVector;
model.fixedDofs = fixedDofs;
model.freeDofs = freeDofs;
model.isHalfModel = isfield(solver, 'isHalfModel') && logical(solver.isHalfModel);
model.request = request;
model.rawMesh = meshData;
model.nodeIdMapOldToNew = nodeIdMapOldToNew;
model.nodeIdMapNewToOld = keptOldIds;
model.summary = struct( ...
    'nNodes', nNodes, ...
    'nElements', nElem, ...
    'ndof', ndof, ...
    'nFixedDofs', numel(fixedDofs), ...
    'nFreeDofs', numel(freeDofs), ...
    'totalVerticalLoadLbf', sum(forceVector(3:3:end)), ...
    'minZ', min(nodes(:, 3)), ...
    'maxZ', max(nodes(:, 3)));

end

function layers = local_build_layer_table(layerGeom, request, nLayers)
userLayers = struct([]);
if isfield(request, 'layers') && ~isempty(request.layers)
    userLayers = request.layers;
end
subgrade = struct('E', nan, 'nu', nan, 'type', 'Subgrade');
if isfield(request, 'subgrade') && ~isempty(request.subgrade)
    subgrade = request.subgrade;
end

baseCandidateIdx = local_find_base_candidate(userLayers);
if isnan(baseCandidateIdx)
    if ~isempty(userLayers)
        baseCandidateIdx = numel(userLayers);
    else
        baseCandidateIdx = 1;
    end
end

defaultGeom = struct('id', 0, 'name', '', 'zTop', nan, 'zBot', nan, 'thickness', nan);
if isempty(layerGeom)
    layerGeom = repmat(defaultGeom, nLayers, 1);
elseif numel(layerGeom) < nLayers
    layerGeom(end + 1:nLayers) = defaultGeom;
end

layers = repmat(struct( ...
    'id', 0, ...
    'name', '', ...
    'E', nan, ...
    'nu', nan, ...
    'source', '', ...
    'zTop', nan, ...
    'zBot', nan, ...
    'thickness', nan), nLayers, 1);

for i = 1:nLayers
    geom = layerGeom(i);
    layerName = '';
    if isfield(geom, 'name') && ~isempty(geom.name)
        layerName = char(geom.name);
    elseif i <= numel(userLayers) && isfield(userLayers(i), 'type')
        layerName = char(userLayers(i).type);
    elseif i == nLayers
        layerName = 'Subgrade';
    else
        layerName = sprintf('Layer %d', i);
    end

    [E, nu, source] = local_pick_material(i, nLayers, layerName, userLayers, subgrade, baseCandidateIdx);
    layers(i).id = i;
    layers(i).name = layerName;
    layers(i).E = E;
    layers(i).nu = nu;
    layers(i).source = source;
    if isfield(geom, 'zTop')
        layers(i).zTop = double(geom.zTop);
    end
    if isfield(geom, 'zBot')
        layers(i).zBot = double(geom.zBot);
    end
    if isfield(geom, 'thickness')
        layers(i).thickness = double(geom.thickness);
    end
end
end

function [E, nu, source] = local_pick_material(iLayer, nLayers, layerName, userLayers, subgrade, baseCandidateIdx)
layerNameLower = lower(strtrim(layerName));

if iLayer <= numel(userLayers)
    E = double(userLayers(iLayer).E);
    nu = double(userLayers(iLayer).nu);
    source = sprintf('request.layers(%d)', iLayer);
    return;
end

if iLayer == nLayers || contains(layerNameLower, 'subgrade')
    E = double(subgrade.E);
    nu = double(subgrade.nu);
    source = 'request.subgrade';
    return;
end

if ~isempty(userLayers)
    pickIdx = min(max(1, baseCandidateIdx), numel(userLayers));
    E = double(userLayers(pickIdx).E);
    nu = double(userLayers(pickIdx).nu);
    source = sprintf('request.layers(%d) fallback', pickIdx);
else
    E = double(subgrade.E);
    nu = double(subgrade.nu);
    source = 'request.subgrade fallback';
end
end

function idx = local_find_base_candidate(userLayers)
idx = nan;
if isempty(userLayers)
    return;
end

for i = numel(userLayers):-1:1
    if ~isfield(userLayers(i), 'type') || isempty(userLayers(i).type)
        continue;
    end
    t = lower(char(userLayers(i).type));
    if contains(t, 'base') || contains(t, 'subbase') || contains(t, 'stabil')
        idx = i;
        return;
    end
end
end

function fixedDofs = local_boundary_codes_to_dofs(boundaryCodes, nNodes)
codeMap = {[], 1, 2, 3, [1 2], [2 3], [1 3], [1 2 3]}; %#ok<CCAT1>
fixedDofs = zeros(3 * nNodes, 1);
cursor = 0;

for i = 1:nNodes
    code = boundaryCodes(i);
    if code < 1 || code > 7
        continue;
    end
    offsets = codeMap{code + 1};
    dofs = 3 * (i - 1) + offsets;
    n = numel(dofs);
    fixedDofs(cursor + 1:cursor + n) = dofs(:);
    cursor = cursor + n;
end

fixedDofs = fixedDofs(1:cursor);
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
