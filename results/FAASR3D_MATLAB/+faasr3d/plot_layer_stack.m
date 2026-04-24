function ax = plot_layer_stack(requestOrCase, options)
%PLOT_LAYER_STACK Plot a labeled pavement layer stack with meaningful colors.

if nargin < 2 || isempty(options)
    options = struct();
end

opts = struct( ...
    'parent', [], ...
    'title', 'Pavement Layer Stack', ...
    'subgradeDisplayDepthIn', 36);
opts = local_merge_structs(opts, options);

request = local_extract_request(requestOrCase);
layers = local_stack_layers(request, opts.subgradeDisplayDepthIn);

if isempty(opts.parent)
    figure('Color', 'w');
    ax = axes();
else
    ax = opts.parent;
end

cla(ax);
hold(ax, 'on');

zTop = 0;
for i = 1:numel(layers)
    zBot = zTop + layers(i).displayThickness;
    patch(ax, [0 1 1 0], [zTop zTop zBot zBot], layers(i).color, ...
        'EdgeColor', [0.2 0.2 0.2], 'LineWidth', 1.0);
    label = { ...
        layers(i).name
        sprintf('h = %.2f in', layers(i).actualThickness)
        sprintf('E = %.3g psi, nu = %.2f', layers(i).E, layers(i).nu)};
    text(ax, 0.5, (zTop + zBot) / 2, label, ...
        'HorizontalAlignment', 'center', ...
        'VerticalAlignment', 'middle', ...
        'FontSize', 10, ...
        'FontWeight', 'bold', ...
        'Interpreter', 'none');
    zTop = zBot;
end

hold(ax, 'off');
xlim(ax, [0 1]);
ylim(ax, [0 zTop]);
set(ax, 'YDir', 'reverse', 'XTick', []);
ylabel(ax, 'Depth (in)');
title(ax, opts.title);
grid(ax, 'on');
box(ax, 'on');
end

function request = local_extract_request(requestOrCase)
if isstruct(requestOrCase) && isfield(requestOrCase, 'request')
    request = requestOrCase.request;
else
    request = requestOrCase;
end

if ~isstruct(request) || ~isfield(request, 'layers')
    error('faasr3d:plot_layer_stack:InvalidInput', ...
        'Input must be a request struct or a caseData struct with a request field.');
end
end

function layers = local_stack_layers(request, subgradeDisplayDepthIn)
userLayers = request.layers;
nUser = numel(userLayers);
layers = repmat(struct( ...
    'name', '', ...
    'E', nan, ...
    'nu', nan, ...
    'actualThickness', nan, ...
    'displayThickness', nan, ...
    'color', [0.5 0.5 0.5]), nUser + 1, 1);

for i = 1:nUser
    name = local_get_name(userLayers(i), sprintf('Layer %d', i));
    layers(i).name = name;
    layers(i).E = double(userLayers(i).E);
    layers(i).nu = double(userLayers(i).nu);
    layers(i).actualThickness = double(userLayers(i).h);
    layers(i).displayThickness = max(double(userLayers(i).h), 0.5);
    layers(i).color = local_color_for_name(name);
end

subgradeName = 'Subgrade';
if isfield(request, 'subgrade') && isfield(request.subgrade, 'type') && ~isempty(request.subgrade.type)
    subgradeName = char(request.subgrade.type);
end
layers(end).name = subgradeName;
layers(end).E = double(request.subgrade.E);
layers(end).nu = double(request.subgrade.nu);
layers(end).actualThickness = subgradeDisplayDepthIn;
layers(end).displayThickness = subgradeDisplayDepthIn;
layers(end).color = local_color_for_name(subgradeName);
end

function name = local_get_name(s, fallback)
if isfield(s, 'type') && ~isempty(s.type)
    name = char(s.type);
else
    name = fallback;
end
end

function color = local_color_for_name(name)
t = lower(strtrim(name));
if contains(t, 'ac') || contains(t, 'asphalt') || contains(t, 'overlay') || contains(t, 'hma')
    color = [0.17 0.17 0.17];
elseif contains(t, 'pcc') || contains(t, 'concrete') || contains(t, 'slab')
    color = [0.81 0.81 0.81];
elseif contains(t, 'subbase')
    color = [0.55 0.37 0.24];
elseif contains(t, 'base') || contains(t, 'stabil')
    color = [0.85 0.47 0.02];
elseif contains(t, 'subgrade')
    color = [0.42 0.26 0.15];
else
    color = [0.55 0.55 0.55];
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
