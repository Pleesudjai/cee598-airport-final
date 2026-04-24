function ax = plot_wheel_birdseye(meshInput, options)
%PLOT_WHEEL_BIRDSEYE Plot wheel locations from a top-down view.
%
%   ax = faasr3d.plot_wheel_birdseye(meshData)

if nargin < 2 || isempty(options)
    options = struct();
end

opts = struct( ...
    'parent', [], ...
    'title', 'Wheel Locations - Bird''s-Eye View', ...
    'mirrorHalfModelWheels', true, ...
    'showLabels', true, ...
    'surfaceFaceColor', [0.92 0.92 0.92], ...
    'surfaceEdgeColor', [0.75 0.75 0.75], ...
    'wheelColor', [0.05 0.05 0.05], ...
    'wheelSize', 60);
opts = local_merge_structs(opts, options);

meshData = meshInput;
if ~isfield(meshData, 'surface')
    meshData = faasr3d.mesh_to_matrices(meshInput);
end

if isempty(opts.parent)
    figure('Color', 'w');
    ax = axes();
else
    ax = opts.parent;
end

cla(ax);
hold(ax, 'on');

if ~isempty(meshData.surface.nodes) && ~isempty(meshData.surface.tris)
    [topNodes, topTris] = local_extract_top_surface(meshData.surface.nodes, meshData.surface.tris);
    if ~isempty(topTris)
        patch(ax, ...
            'Faces', topTris, ...
            'Vertices', [topNodes(:, 1), topNodes(:, 2)], ...
            'FaceColor', opts.surfaceFaceColor, ...
            'EdgeColor', opts.surfaceEdgeColor, ...
            'LineWidth', 0.5);
    end
end

[wheelX, wheelY, wheelPressure] = local_extract_wheels(meshData, opts.mirrorHalfModelWheels);
if isempty(wheelX)
    text(ax, 0.5, 0.5, 'No wheel locations found in the mesh result.', ...
        'Units', 'normalized', ...
        'HorizontalAlignment', 'center', ...
        'VerticalAlignment', 'middle', ...
        'Interpreter', 'none');
else
    scatter(ax, wheelX, wheelY, opts.wheelSize, opts.wheelColor, 'filled', ...
        'MarkerEdgeColor', [1 1 1], 'LineWidth', 0.75);

    if opts.showLabels
        xSpan = max(wheelX) - min(wheelX);
        ySpan = max(wheelY) - min(wheelY);
        baseOffset = 0.02 * max([xSpan, ySpan, 1]);
        dirs = [1 1; 1 -1; -1 1; -1 -1];
        for i = 1:numel(wheelX)
            label = sprintf('W%d', i);
            if ~isnan(wheelPressure(i)) && wheelPressure(i) > 0
                label = sprintf('%s, %.0f psi', label, wheelPressure(i));
            end
            d = dirs(mod(i - 1, size(dirs, 1)) + 1, :);
            text(ax, wheelX(i) + d(1) * baseOffset, wheelY(i) + d(2) * baseOffset, label, ...
                'VerticalAlignment', 'middle', ...
                'HorizontalAlignment', 'center', ...
                'FontSize', 9, ...
                'Color', [0.1 0.1 0.1], ...
                'Interpreter', 'none');
        end
    end
end

hold(ax, 'off');
axis(ax, 'equal');
view(ax, 2);
grid(ax, 'on');
xlabel(ax, 'X (in)');
ylabel(ax, 'Y (in)');
title(ax, opts.title);
end

function [nodesOut, trisOut] = local_extract_top_surface(nodes, tris)
z = nodes(:, 3);
zTop = max(z);
tol = max(1e-8, 1e-6 * max(1, abs(zTop)));
topMask = all(abs(z(tris) - zTop) <= tol, 2);
trisTop = tris(topMask, :);

if isempty(trisTop)
    nodesOut = [];
    trisOut = [];
    return;
end

used = unique(trisTop(:));
newIndex = zeros(size(nodes, 1), 1);
newIndex(used) = 1:numel(used);
nodesOut = nodes(used, :);
trisOut = reshape(newIndex(trisTop), size(trisTop));
end

function [wheelX, wheelY, wheelPressure] = local_extract_wheels(meshData, mirrorHalfModelWheels)
wheelX = [];
wheelY = [];
wheelPressure = [];

raw = struct();
if isfield(meshData, 'raw')
    raw = meshData.raw;
end
if ~isstruct(raw) || ~isfield(raw, 'wheelLoads') || isempty(raw.wheelLoads)
    return;
end

wheels = raw.wheelLoads;
wheelX = arrayfun(@(w) double(w.x), wheels(:));
wheelY = arrayfun(@(w) double(w.y), wheels(:));
wheelPressure = arrayfun(@(w) local_get_pressure(w), wheels(:));

isHalfModel = isfield(meshData, 'solver') && isfield(meshData.solver, 'isHalfModel') && logical(meshData.solver.isHalfModel);
if mirrorHalfModelWheels && isHalfModel
    tol = max(1e-8, 1e-8 * max(1, max(abs(wheelY))));
    mirrorMask = abs(wheelY) > tol;
    wheelX = [wheelX; wheelX(mirrorMask)];
    wheelY = [wheelY; -wheelY(mirrorMask)];
    wheelPressure = [wheelPressure; wheelPressure(mirrorMask)];
end

[~, order] = sortrows([wheelX, wheelY], [1 2]);
wheelX = wheelX(order);
wheelY = wheelY(order);
wheelPressure = wheelPressure(order);
end

function value = local_get_pressure(wheel)
value = nan;
if isstruct(wheel) && isfield(wheel, 'pressure') && ~isempty(wheel.pressure)
    value = double(wheel.pressure);
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
