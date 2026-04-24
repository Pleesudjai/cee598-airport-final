function [meshData, info] = generate_structured_pavement_mesh(request, referenceMeshData, options)
%GENERATE_STRUCTURED_PAVEMENT_MESH Build a MATLAB-native structured HEX8 mesh.
%
%   [meshData, info] = faasr3d.generate_structured_pavement_mesh(request, referenceMeshData)
%
% This mesh is not the exact FAARFIELD mesh. It uses FAARFIELD only as a
% wheel/load reference, then creates a structured MATLAB mesh in one of two
% modes:
%   - uniform
%   - band-refined

if nargin < 1 || isempty(request)
    request = faasr3d.make_faarfield_mesh_request();
end
if nargin < 2
    referenceMeshData = struct();
end
if nargin < 3 || isempty(options)
    options = struct();
end

opts = struct( ...
    'mode', 'band-refined', ...
    'uniformDxIn', 8.0, ...
    'uniformDyIn', 8.0, ...
    'fineDxIn', 4.0, ...
    'fineDyIn', 4.0, ...
    'farDxIn', 12.0, ...
    'farDyIn', 12.0, ...
    'growthFactor', 1.35, ...
    'bandMarginXIn', 18.0, ...
    'bandMarginYIn', 18.0, ...
    'domainPaddingXIn', 24.0, ...
    'domainPaddingYIn', 24.0, ...
    'fineDzIn', 4.0, ...
    'subgradeDzIn', 8.0, ...
    'subgradeDepthIn', [], ...
    'loadTransfer', 'nearest');
opts = local_merge_structs(opts, options);

[wheelLoads, wheelX, wheelY] = local_get_full_wheel_loads(referenceMeshData);
[xMin, xMax, yMin, yMax] = local_get_domain_bounds(referenceMeshData, wheelX, wheelY, opts);
subgradeDepthIn = local_get_subgrade_depth(request, referenceMeshData, opts);

xCoords = local_build_axis_coords(xMin, xMax, wheelX, opts.mode, ...
    opts.uniformDxIn, opts.fineDxIn, opts.farDxIn, opts.bandMarginXIn, opts.growthFactor);
yCoords = local_build_axis_coords(yMin, yMax, wheelY, opts.mode, ...
    opts.uniformDyIn, opts.fineDyIn, opts.farDyIn, opts.bandMarginYIn, opts.growthFactor);
[zCoords, layerDepthBounds, layerNames] = local_build_z_coords(request, subgradeDepthIn, opts);

[nodes, elements, elementLayerIds0, nodeGridIds] = local_make_hex_mesh(xCoords, yCoords, zCoords, layerDepthBounds);
boundaryCodes = zeros(size(nodes, 1), 1);
zBottom = min(nodes(:, 3));
boundaryCodes(abs(nodes(:, 3) - zBottom) < 1e-10) = 7;

[loadNodeIds, loadValues, loadInfo] = local_transfer_loads(referenceMeshData, nodes, nodeGridIds, opts.loadTransfer);
[surfaceNodes, surfaceTris, surfaceLayerIds] = local_build_surface_mesh(nodes, elements, elementLayerIds0);

nLayers = numel(layerNames);
layers = repmat(struct('id', 0, 'name', '', 'zTop', nan, 'zBot', nan, 'thickness', nan), nLayers, 1);
for i = 1:nLayers
    layers(i).id = i - 1;
    layers(i).name = layerNames{i};
    layers(i).zTop = -layerDepthBounds(i);
    layers(i).zBot = -layerDepthBounds(i + 1);
    layers(i).thickness = layerDepthBounds(i + 1) - layerDepthBounds(i);
end

meshData = struct();
meshData.raw = struct();
meshData.raw.layers = layers;
meshData.raw.wheelLoads = wheelLoads;
meshData.raw.slabDomain = struct('xMin', xMin, 'xMax', xMax, 'yMin', yMin, 'yMax', yMax, 'zMin', min(zCoords), 'zMax', max(zCoords));
meshData.raw.renderMode = ['custom-' lower(opts.mode)];
meshData.layers = layers;
meshData.surface = struct('nodes', surfaceNodes, 'tris', surfaceTris, 'layerIds', surfaceLayerIds);
meshData.solver = struct( ...
    'nodes', nodes, ...
    'bricks', elements, ...
    'layerIds', elementLayerIds0, ...
    'nodeBoundaryCodes', boundaryCodes, ...
    'loadNodeIds', loadNodeIds, ...
    'loadValues', loadValues, ...
    'isHalfModel', false);

info = struct();
info.mode = lower(opts.mode);
info.xCoords = xCoords;
info.yCoords = yCoords;
info.zCoords = zCoords;
info.loadTransfer = loadInfo;
info.summary = struct( ...
    'nNodes', size(nodes, 1), ...
    'nElements', size(elements, 1), ...
    'nX', numel(xCoords), ...
    'nY', numel(yCoords), ...
    'nZ', numel(zCoords), ...
    'domainX', [xMin xMax], ...
    'domainY', [yMin yMax], ...
    'subgradeDepthIn', subgradeDepthIn);
end

function [wheelLoads, wheelX, wheelY] = local_get_full_wheel_loads(referenceMeshData)
wheelLoads = struct('x', {}, 'y', {}, 'pressure', {});
wheelX = [];
wheelY = [];
if ~isstruct(referenceMeshData) || ~isfield(referenceMeshData, 'raw') || ...
        ~isfield(referenceMeshData.raw, 'wheelLoads') || isempty(referenceMeshData.raw.wheelLoads)
    return;
end

rawWheels = referenceMeshData.raw.wheelLoads(:);
isHalfModel = isfield(referenceMeshData, 'solver') && isfield(referenceMeshData.solver, 'isHalfModel') && logical(referenceMeshData.solver.isHalfModel);
tol = 1e-10;

for i = 1:numel(rawWheels)
    wheelLoads(end + 1, 1) = rawWheels(i); %#ok<AGROW>
    if isHalfModel && abs(double(rawWheels(i).y)) > tol
        mirrored = rawWheels(i);
        mirrored.y = -double(rawWheels(i).y);
        wheelLoads(end + 1, 1) = mirrored; %#ok<AGROW>
    end
end

if isempty(wheelLoads)
    return;
end

wheelX = arrayfun(@(w) double(w.x), wheelLoads);
wheelY = arrayfun(@(w) double(w.y), wheelLoads);
[~, order] = sortrows([wheelX(:), wheelY(:)], [1 2]);
wheelLoads = wheelLoads(order);
wheelX = wheelX(order);
wheelY = wheelY(order);
end

function [xMin, xMax, yMin, yMax] = local_get_domain_bounds(referenceMeshData, wheelX, wheelY, opts)
haveDomain = false;
if isstruct(referenceMeshData) && isfield(referenceMeshData, 'raw') && isfield(referenceMeshData.raw, 'slabDomain')
    d = referenceMeshData.raw.slabDomain;
    if isfield(d, 'xMin') && isfield(d, 'xMax') && isfield(d, 'yMin') && isfield(d, 'yMax')
        xMin = double(d.xMin);
        xMax = double(d.xMax);
        yMin = double(d.yMin);
        yMax = double(d.yMax);
        haveDomain = true;
    end
end

if ~haveDomain && isstruct(referenceMeshData) && isfield(referenceMeshData, 'solver') && ...
        isfield(referenceMeshData.solver, 'nodes') && ~isempty(referenceMeshData.solver.nodes)
    coords = double(referenceMeshData.solver.nodes);
    xMin = min(coords(:, 1));
    xMax = max(coords(:, 1));
    yMin = min(coords(:, 2));
    yMax = max(coords(:, 2));
    haveDomain = true;
end

if ~haveDomain
    if isempty(wheelX)
        xMin = -150;
        xMax = 150;
        yMin = -150;
        yMax = 150;
    else
        xMin = min(wheelX) - opts.domainPaddingXIn;
        xMax = max(wheelX) + opts.domainPaddingXIn;
        yMin = min(wheelY) - opts.domainPaddingYIn;
        yMax = max(wheelY) + opts.domainPaddingYIn;
    end
end
end

function subgradeDepthIn = local_get_subgrade_depth(request, referenceMeshData, opts)
if ~isempty(opts.subgradeDepthIn)
    subgradeDepthIn = double(opts.subgradeDepthIn);
    return;
end

userThickness = sum(arrayfun(@(s) double(s.h), request.layers));
subgradeDepthIn = 36;

if isstruct(referenceMeshData) && isfield(referenceMeshData, 'solver') && ...
        isfield(referenceMeshData.solver, 'nodes') && ~isempty(referenceMeshData.solver.nodes)
    z = double(referenceMeshData.solver.nodes(:, 3));
    totalDepth = max(z) - min(z);
    inferred = totalDepth - userThickness;
    if inferred > 0
        subgradeDepthIn = inferred;
    end
end

subgradeDepthIn = max(subgradeDepthIn, 18);
end

function coords = local_build_axis_coords(domainMin, domainMax, wheelCoord, mode, uniformD, fineD, farD, bandMargin, growthFactor)
domainMin = double(domainMin);
domainMax = double(domainMax);
if domainMax <= domainMin
    error('faasr3d:generate_structured_pavement_mesh:BadDomain', ...
        'Invalid axis domain [%g, %g].', domainMin, domainMax);
end

switch lower(mode)
    case 'uniform'
        coords = local_uniform_coords(domainMin, domainMax, uniformD);
    case 'band-refined'
        if isempty(wheelCoord)
            coords = local_uniform_coords(domainMin, domainMax, uniformD);
        else
            refineMin = max(domainMin, min(wheelCoord) - bandMargin);
            refineMax = min(domainMax, max(wheelCoord) + bandMargin);
            coords = local_band_coords(domainMin, domainMax, refineMin, refineMax, fineD, farD, growthFactor);
        end
    otherwise
        error('faasr3d:generate_structured_pavement_mesh:UnknownMode', ...
            'Unknown mesh mode "%s". Use "uniform" or "band-refined".', mode);
end
end

function coords = local_uniform_coords(a, b, d)
d = max(double(d), eps);
n = max(1, ceil((b - a) / d));
coords = linspace(a, b, n + 1);
end

function coords = local_band_coords(a, b, r0, r1, fineD, farD, growthFactor)
fineD = max(double(fineD), eps);
farD = max(double(farD), fineD);
growthFactor = max(double(growthFactor), 1.0);

left = local_grow_side(r0, a, fineD, farD, growthFactor, -1);
center = local_uniform_coords(r0, r1, fineD);
right = local_grow_side(r1, b, fineD, farD, growthFactor, +1);

coords = [left(1:end-1), center, right(2:end)];
coords = local_unique_tol(coords);
coords(1) = a;
coords(end) = b;
end

function coords = local_grow_side(startValue, boundaryValue, fineD, farD, growthFactor, direction)
coords = startValue;
step = fineD;
current = startValue;
while true
    nextValue = current + direction * step;
    if (direction < 0 && nextValue <= boundaryValue) || (direction > 0 && nextValue >= boundaryValue)
        coords(end + 1) = boundaryValue; %#ok<AGROW>
        break;
    end
    coords(end + 1) = nextValue; %#ok<AGROW>
    current = nextValue;
    step = min(step * growthFactor, farD);
end
if direction < 0
    coords = fliplr(coords);
end
end

function coords = local_unique_tol(coords)
coords = sort(coords(:).');
keep = true(size(coords));
for i = 2:numel(coords)
    if abs(coords(i) - coords(i - 1)) < 1e-9
        keep(i) = false;
    end
end
coords = coords(keep);
end

function [zCoords, depthBounds, layerNames] = local_build_z_coords(request, subgradeDepthIn, opts)
userLayers = request.layers(:);
nUser = numel(userLayers);
nLayers = nUser + 1;
depthBounds = zeros(nLayers + 1, 1);
layerNames = cell(nLayers, 1);
zCoords = 0;
depthCursor = 0;

for i = 1:nUser
    h = double(userLayers(i).h);
    dz = min(opts.fineDzIn, h);
    dz = max(dz, h / max(1, ceil(h / max(opts.fineDzIn, eps))));
    localCoords = local_layer_depths(h, dz);
    zCoords = [zCoords, -(depthCursor + localCoords(2:end))]; %#ok<AGROW>
    layerNames{i} = char(userLayers(i).type);
    depthBounds(i) = depthCursor;
    depthCursor = depthCursor + h;
end

depthBounds(nUser + 1) = depthCursor;
subgradeLocal = local_layer_depths(subgradeDepthIn, opts.subgradeDzIn);
zCoords = [zCoords, -(depthCursor + subgradeLocal(2:end))];
layerNames{end} = 'Subgrade';
depthBounds(end) = depthCursor + subgradeDepthIn;
end

function coords = local_layer_depths(thickness, dz)
thickness = max(double(thickness), eps);
dz = max(double(dz), eps);
n = max(1, ceil(thickness / dz));
coords = linspace(0, thickness, n + 1);
end

function [nodes, elements, elementLayerIds0, nodeGridIds] = local_make_hex_mesh(xCoords, yCoords, zCoords, layerDepthBounds)
nx = numel(xCoords);
ny = numel(yCoords);
nz = numel(zCoords);
[X, Y, Z] = ndgrid(xCoords, yCoords, zCoords);
nodes = [X(:), Y(:), Z(:)];
nodeGridIds = reshape(1:size(nodes, 1), nx, ny, nz);

nElem = (nx - 1) * (ny - 1) * (nz - 1);
elements = zeros(nElem, 8);
elementLayerIds0 = zeros(nElem, 1);
cursor = 0;

for k = 1:nz - 1
    zMidDepth = -0.5 * (zCoords(k) + zCoords(k + 1));
    layerId0 = local_depth_to_layer_id(zMidDepth, layerDepthBounds);
    for j = 1:ny - 1
        for i = 1:nx - 1
            cursor = cursor + 1;
            n000 = nodeGridIds(i, j, k);
            n100 = nodeGridIds(i + 1, j, k);
            n110 = nodeGridIds(i + 1, j + 1, k);
            n010 = nodeGridIds(i, j + 1, k);
            n001 = nodeGridIds(i, j, k + 1);
            n101 = nodeGridIds(i + 1, j, k + 1);
            n111 = nodeGridIds(i + 1, j + 1, k + 1);
            n011 = nodeGridIds(i, j + 1, k + 1);
            % The solver expects HEX8 nodes 1..4 on the lower Z face and 5..8 on
            % the upper Z face. Our Z coordinates run from 0 downward, so k+1 is
            % the lower face and k is the upper face.
            elements(cursor, :) = [n001, n101, n111, n011, n000, n100, n110, n010];
            elementLayerIds0(cursor) = layerId0;
        end
    end
end
end

function layerId0 = local_depth_to_layer_id(depthValue, depthBounds)
for i = 1:numel(depthBounds) - 1
    if depthValue <= depthBounds(i + 1) + 1e-9
        layerId0 = i - 1;
        return;
    end
end
layerId0 = numel(depthBounds) - 2;
end

function [loadNodeIds, loadValues, info] = local_transfer_loads(referenceMeshData, customNodes, nodeGridIds, method)
loadNodeIds = [];
loadValues = [];
info = struct('method', method, 'nReferenceLoads', 0, 'nAssignedLoads', 0, 'totalLoadLbf', 0);

if ~isstruct(referenceMeshData) || ~isfield(referenceMeshData, 'solver') || ...
        ~isfield(referenceMeshData.solver, 'loadNodeIds') || isempty(referenceMeshData.solver.loadNodeIds)
    return;
end

refNodeIds = double(referenceMeshData.solver.loadNodeIds(:));
refLoadValues = double(referenceMeshData.solver.loadValues(:));
refNodes = double(referenceMeshData.solver.nodes(refNodeIds, :));

topNodeIds = unique(nodeGridIds(:, :, 1));
topXY = customNodes(topNodeIds, 1:2);
assigned = zeros(numel(topNodeIds), 1);

switch lower(method)
    case 'nearest'
        for i = 1:numel(refLoadValues)
            d2 = sum((topXY - refNodes(i, 1:2)).^2, 2);
            [~, idx] = min(d2);
            assigned(idx) = assigned(idx) + refLoadValues(i);
        end
    otherwise
        error('faasr3d:generate_structured_pavement_mesh:UnknownLoadTransfer', ...
            'Unknown load transfer method "%s".', method);
end

mask = abs(assigned) > 0;
loadNodeIds = topNodeIds(mask);
loadValues = assigned(mask);
info.nReferenceLoads = numel(refLoadValues);
info.nAssignedLoads = numel(loadValues);
info.totalLoadLbf = sum(loadValues);
end

function [surfaceNodes, surfaceTris, surfaceLayerIds] = local_build_surface_mesh(nodes, elements, elementLayerIds0)
facePattern = [ ...
    1 4 3 2; ...
    5 6 7 8; ...
    1 2 6 5; ...
    2 3 7 6; ...
    3 4 8 7; ...
    4 1 5 8];

nElem = size(elements, 1);
allFaces = zeros(6 * nElem, 4);
faceElem = zeros(6 * nElem, 1);
cursor = 0;
for e = 1:nElem
    for f = 1:6
        cursor = cursor + 1;
        allFaces(cursor, :) = elements(e, facePattern(f, :));
        faceElem(cursor) = e;
    end
end

sortedFaces = sort(allFaces, 2);
[~, ~, ic] = unique(sortedFaces, 'rows');
counts = accumarray(ic, 1);
boundaryMask = counts(ic) == 1;
quadFaces = allFaces(boundaryMask, :);
quadLayerIds = elementLayerIds0(faceElem(boundaryMask));

used = unique(quadFaces(:));
map = zeros(size(nodes, 1), 1);
map(used) = 1:numel(used);
surfaceNodes = nodes(used, :);
quadFaces = reshape(map(quadFaces), size(quadFaces));

surfaceTris = [quadFaces(:, [1 2 3]); quadFaces(:, [1 3 4])];
surfaceLayerIds = [quadLayerIds; quadLayerIds];
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
