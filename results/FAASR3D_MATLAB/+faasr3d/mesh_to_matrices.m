function meshData = mesh_to_matrices(meshOrResult)
%MESH_TO_MATRICES Convert FAARFIELD mesh DTO arrays into MATLAB matrices.

mesh = meshOrResult;
if isstruct(meshOrResult) && isfield(meshOrResult, 'mesh')
    mesh = meshOrResult.mesh;
end

meshData = struct();
meshData.raw = mesh;

if isfield(mesh, 'layers')
    meshData.layers = mesh.layers;
else
    meshData.layers = [];
end

meshData.surface = struct('nodes', [], 'tris', [], 'layerIds', []);
if isfield(mesh, 'nodeCoords') && ~isempty(mesh.nodeCoords)
    meshData.surface.nodes = reshape(double(mesh.nodeCoords(:)), 3, []).';
end
if isfield(mesh, 'surfaceTriNodes') && ~isempty(mesh.surfaceTriNodes)
    meshData.surface.tris = reshape(double(mesh.surfaceTriNodes(:)), 3, []).' + 1;
end
if isfield(mesh, 'surfaceTriLayerIds') && ~isempty(mesh.surfaceTriLayerIds)
    meshData.surface.layerIds = double(mesh.surfaceTriLayerIds(:));
end

meshData.solver = struct( ...
    'nodes', [], ...
    'bricks', [], ...
    'layerIds', [], ...
    'nodeBoundaryCodes', [], ...
    'loadNodeIds', [], ...
    'loadValues', [], ...
    'isHalfModel', false);
if isfield(mesh, 'solverNodeCoords') && ~isempty(mesh.solverNodeCoords)
    meshData.solver.nodes = reshape(double(mesh.solverNodeCoords(:)), 3, []).';
end
if isfield(mesh, 'solverElementNodes') && ~isempty(mesh.solverElementNodes)
    meshData.solver.bricks = reshape(double(mesh.solverElementNodes(:)), 8, []).' + 1;
end
if isfield(mesh, 'solverElementLayerIds') && ~isempty(mesh.solverElementLayerIds)
    meshData.solver.layerIds = double(mesh.solverElementLayerIds(:));
end
if isfield(mesh, 'solverNodeBoundaryCodes') && ~isempty(mesh.solverNodeBoundaryCodes)
    codes = double(mesh.solverNodeBoundaryCodes(:));
    if ~isempty(meshData.solver.nodes) && numel(codes) == size(meshData.solver.nodes, 1) + 1
        codes = codes(2:end);
    end
    meshData.solver.nodeBoundaryCodes = codes;
end
if isfield(mesh, 'solverLoadNodeIds') && ~isempty(mesh.solverLoadNodeIds)
    meshData.solver.loadNodeIds = double(mesh.solverLoadNodeIds(:)) + 1;
end
if isfield(mesh, 'solverLoadValues') && ~isempty(mesh.solverLoadValues)
    meshData.solver.loadValues = double(mesh.solverLoadValues(:));
end
if isfield(mesh, 'solverIsHalfModel') && ~isempty(mesh.solverIsHalfModel)
    meshData.solver.isHalfModel = logical(mesh.solverIsHalfModel);
end

meshData.elementCentroids = local_numeric_rows(local_nested_field(mesh, 'elementCentroids'));
meshData.elementStressTensor = local_numeric_rows(local_nested_field(mesh, 'elementStressTensor'));
meshData.elementLayerIds = local_numeric_col(local_nested_field(mesh, 'elementLayerIds'));

end

function value = local_nested_field(s, name)
if isstruct(s) && isfield(s, name)
    value = s.(name);
else
    value = [];
end
end

function out = local_numeric_rows(value)
if isempty(value)
    out = [];
    return;
end

if isnumeric(value)
    out = double(value);
    return;
end

if iscell(value)
    n = numel(value);
    width = 0;
    for i = 1:n
        if ~isempty(value{i})
            width = max(width, numel(value{i}));
        end
    end
    out = nan(n, width);
    for i = 1:n
        if isempty(value{i})
            continue;
        end
        row = double(value{i}(:)).';
        out(i, 1:numel(row)) = row;
    end
    return;
end

error('faasr3d:mesh_to_matrices:UnsupportedArray', ...
    'Unsupported nested array type: %s', class(value));
end

function out = local_numeric_col(value)
if isempty(value)
    out = [];
elseif isnumeric(value)
    out = double(value(:));
elseif iscell(value)
    out = cellfun(@double, value(:));
else
    error('faasr3d:mesh_to_matrices:UnsupportedColumn', ...
        'Unsupported column type: %s', class(value));
end
end
