function ax = plot_faarfield_mesh(meshInput, options)
%PLOT_FAARFIELD_MESH Quick surface plot for a FAARFIELD mesh DTO.

if nargin < 2 || isempty(options)
    options = struct();
end
opts = struct( ...
    'parent', [], ...
    'showWheels', true, ...
    'showColorbar', true, ...
    'title', 'FAARFIELD FEM Mesh');
opts = local_merge_structs(opts, options);

meshData = meshInput;
if ~isfield(meshData, 'surface')
    meshData = faasr3d.mesh_to_matrices(meshInput);
end

if isempty(meshData.surface.nodes) || isempty(meshData.surface.tris)
    error('faasr3d:plot_faarfield_mesh:NoSurfaceMesh', ...
        'No surface mesh was found in the input.');
end

if isempty(opts.parent)
    figure('Color', 'w');
    ax = axes();
else
    ax = opts.parent;
end

nodes = meshData.surface.nodes;
tris = meshData.surface.tris;
layerIds = meshData.surface.layerIds;
if isempty(layerIds)
    layerIds = zeros(size(tris, 1), 1);
end
layerIds = local_normalize_layer_ids(layerIds, meshData.raw);

layerMeta = local_layer_metadata(meshData.raw);
fig = ancestor(ax, 'figure');
fig.Colormap = layerMeta.colors;
trisurf(tris, nodes(:, 1), nodes(:, 2), -nodes(:, 3), layerIds, ...
    'Parent', ax, ...
    'EdgeColor', 'none', ...
    'FaceColor', 'flat');
ax.CLim = [-0.5, max([0.5, double(layerMeta.count) - 0.5])];

axis(ax, 'equal');
view(ax, 3);
grid(ax, 'on');
xlabel(ax, 'X (in)');
ylabel(ax, 'Y (in)');
zlabel(ax, 'Depth (in)');
title(ax, opts.title);
camlight(ax, 'headlight');
lighting(ax, 'gouraud');

if opts.showColorbar && layerMeta.count > 0
    cb = colorbar(ax);
    cb.Ticks = 0:layerMeta.count - 1;
    cb.TickLabels = layerMeta.labels;
    ylabel(cb, 'Layer');
end

if opts.showWheels && isfield(meshData.raw, 'wheelLoads') && ~isempty(meshData.raw.wheelLoads)
    hold(ax, 'on');
    wheelX = arrayfun(@(w) double(w.x), meshData.raw.wheelLoads);
    wheelY = arrayfun(@(w) double(w.y), meshData.raw.wheelLoads);
    scatter3(ax, wheelX, wheelY, zeros(size(wheelX)), 30, 'k', 'filled');
    hold(ax, 'off');
end

end

function layerIds = local_normalize_layer_ids(layerIds, rawMesh)
layerIds = double(layerIds(:));
nLayers = 0;
if isfield(rawMesh, 'layers') && ~isempty(rawMesh.layers)
    nLayers = numel(rawMesh.layers);
end

if nLayers <= 0 || isempty(layerIds)
    return;
end

isZeroBased = all(layerIds >= 0 & layerIds <= (nLayers - 1));
isOneBased = all(layerIds >= 1 & layerIds <= nLayers);
if ~isZeroBased && isOneBased
    layerIds = layerIds - 1;
end
end

function layerMeta = local_layer_metadata(rawMesh)
defaultColors = [ ...
    0.17 0.17 0.17
    0.81 0.81 0.81
    0.85 0.47 0.02
    0.55 0.37 0.24
    0.42 0.26 0.15
    0.29 0.21 0.13];

if ~isfield(rawMesh, 'layers') || isempty(rawMesh.layers)
    layerMeta = struct();
    layerMeta.count = size(defaultColors, 1);
    layerMeta.colors = defaultColors;
    layerMeta.labels = cellstr(compose("Layer %d", 0:size(defaultColors, 1) - 1));
    return;
end

n = numel(rawMesh.layers);
colors = zeros(n, 3);
labels = strings(n, 1);
for i = 1:n
    if isfield(rawMesh.layers(i), 'color') && ~isempty(rawMesh.layers(i).color)
        colors(i, :) = local_hex_to_rgb(char(rawMesh.layers(i).color));
    else
        colors(i, :) = defaultColors(min(i, size(defaultColors, 1)), :);
    end
    if isfield(rawMesh.layers(i), 'name') && ~isempty(rawMesh.layers(i).name)
        labels(i) = string(rawMesh.layers(i).name);
    else
        labels(i) = "Layer " + string(i - 1);
    end
end
layerMeta = struct();
layerMeta.count = n;
layerMeta.colors = colors;
layerMeta.labels = cellstr(labels);
end

function rgb = local_hex_to_rgb(hex)
hex = strrep(strtrim(hex), '#', '');
if numel(hex) ~= 6
    rgb = [0.5 0.5 0.5];
    return;
end
rgb = [hex2dec(hex(1:2)), hex2dec(hex(3:4)), hex2dec(hex(5:6))] / 255;
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
