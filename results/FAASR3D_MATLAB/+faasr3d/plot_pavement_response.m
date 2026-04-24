function fig = plot_pavement_response(model, results, options)
%PLOT_PAVEMENT_RESPONSE Plot the top surface displacement of the HEX8 model.

if nargin < 3 || isempty(options)
    options = struct();
end

opts = struct( ...
    'deformationScale', [], ...
    'response', 'uz');
opts = local_merge_structs(opts, options);

[faces, faceNodes] = local_extract_top_surface_faces(model.elements, model.nodes);
if isempty(faces)
    error('faasr3d:plot_pavement_response:NoTopFaces', ...
        'Unable to extract top-surface faces from the solver mesh.');
end

coords = model.nodes;
U = results.U;
if isempty(opts.deformationScale)
    span = max(max(coords, [], 1) - min(coords, [], 1));
    maxDisp = max(abs(results.displacements));
    if maxDisp > 0
        opts.deformationScale = 0.05 * span / maxDisp;
    else
        opts.deformationScale = 1.0;
    end
end

coordsDef = coords + opts.deformationScale * U;

switch lower(opts.response)
    case 'ux'
        field = U(:, 1);
        label = 'Ux (in)';
    case 'uy'
        field = U(:, 2);
        label = 'Uy (in)';
    otherwise
        field = U(:, 3);
        label = 'Uz (in)';
end

tris = [faceNodes(:, [1 2 3]); faceNodes(:, [1 3 4])];

fig = figure('Name', 'Pavement FEM Response');
trisurf(tris, coordsDef(:, 1), coordsDef(:, 2), coordsDef(:, 3), field, ...
    'EdgeColor', 'none', 'FaceColor', 'interp');
axis equal;
view(3);
xlabel('X (in)');
ylabel('Y (in)');
zlabel('Z (in)');
title(sprintf('Top Surface Response (%s), scale = %.3g', label, opts.deformationScale));
cb = colorbar();
ylabel(cb, label);
camlight headlight;
lighting gouraud;
grid on;
end

function [faces, faceNodes] = local_extract_top_surface_faces(elements, nodes)
facePattern = [ ...
    1 4 3 2; ...
    5 6 7 8; ...
    1 2 6 5; ...
    2 3 7 6; ...
    3 4 8 7; ...
    4 1 5 8];

nElem = size(elements, 1);
allFaces = zeros(6 * nElem, 4);
for f = 1:6
    rows = f:6:6 * nElem;
    allFaces(rows, :) = elements(:, facePattern(f, :));
end

sortedFaces = sort(allFaces, 2);
[~, ~, ic] = unique(sortedFaces, 'rows');
counts = accumarray(ic, 1);
boundaryMask = counts(ic) == 1;
boundaryFaces = allFaces(boundaryMask, :);

x = reshape(nodes(boundaryFaces.', 1), 4, []).';
y = reshape(nodes(boundaryFaces.', 2), 4, []).';
z = reshape(nodes(boundaryFaces.', 3), 4, []).';
zRange = max(z, [], 2) - min(z, [], 2);
v1 = [x(:, 2) - x(:, 1), y(:, 2) - y(:, 1), z(:, 2) - z(:, 1)];
v2 = [x(:, 3) - x(:, 1), y(:, 3) - y(:, 1), z(:, 3) - z(:, 1)];
normals = cross(v1, v2, 2);

tolZ = max(1e-8, 1e-8 * max(abs(nodes(:, 3))));
topMask = zRange <= tolZ & normals(:, 3) > 0;

faces = boundaryFaces(topMask, :);
faceNodes = faces;
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
