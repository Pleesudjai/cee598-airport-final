function request = make_faarfield_mesh_request(overrides)
%MAKE_FAARFIELD_MESH_REQUEST Build a request payload for /api/fem3d/mesh.
%   Edit the returned struct for your pavement and aircraft case, or pass a
%   struct of overrides.

if nargin < 1 || isempty(overrides)
    overrides = struct();
end

request = struct();
request.layers = [ ...
    struct('type', 'AC overlay', 'h', 5.0, 'E', 400000,  'nu', 0.35) ...
    struct('type', 'PCC slab',   'h', 14.0, 'E', 4000000, 'nu', 0.15) ...
    struct('type', 'Base layer', 'h', 8.0, 'E', 50000,   'nu', 0.35) ...
];
request.subgrade = struct('E', 15000, 'nu', 0.40);
request.aircraft = struct( ...
    'name', 'B737-800', ...
    'gearLoad', 0, ...
    'nTires', 0, ...
    'tirePressure', 200, ...
    'tireSpacingIn', 0, ...
    'icao', 'B738', ...
    'gear', 'D', ...
    'mtow', 174200);
request.evalDepthIn = 0;
request.gridExtentIn = 0;
request.gridPoints = 0;              % 0 = desktop parity in the API wrapper
request.includeMesh = true;
request.highDetail = false;
request.filterCoarse = true;
request.includeStressField = false;
request.includeFullConnectivity = true;

request = local_merge_structs(request, overrides);

end

function out = local_merge_structs(base, overrides)
out = base;
if isempty(overrides)
    return;
end

names = fieldnames(overrides);
for k = 1:numel(names)
    name = names{k};
    if isfield(out, name) && isstruct(out.(name)) && isstruct(overrides.(name)) && ...
            isscalar(out.(name)) && isscalar(overrides.(name))
        out.(name) = local_merge_structs(out.(name), overrides.(name));
    else
        out.(name) = overrides.(name);
    end
end
end
