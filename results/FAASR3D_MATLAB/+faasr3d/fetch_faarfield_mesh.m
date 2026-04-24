function [result, meshData] = fetch_faarfield_mesh(request, options)
%FETCH_FAARFIELD_MESH Request a pavement FEM mesh from the FAARFIELD API.
%
%   result = faasr3d.fetch_faarfield_mesh(request)
%   [result, meshData] = faasr3d.fetch_faarfield_mesh(request, options)
%
% options.baseUrl      default: 'http://localhost:5100'
% options.timeoutSec   default: 300
% options.saveJsonPath default: ''

if nargin < 1 || isempty(request)
    request = faasr3d.make_faarfield_mesh_request();
end
if nargin < 2 || isempty(options)
    options = struct();
end

opts = struct( ...
    'baseUrl', 'http://localhost:5100', ...
    'timeoutSec', 300, ...
    'saveJsonPath', '');
opts = local_merge_structs(opts, options);

baseUrl = char(opts.baseUrl);
if endsWith(baseUrl, '/')
    baseUrl = baseUrl(1:end-1);
end
url = [baseUrl '/api/fem3d/mesh'];

webOpts = weboptions( ...
    'MediaType', 'application/json', ...
    'ContentType', 'json', ...
    'Timeout', opts.timeoutSec);

result = webwrite(url, request, webOpts);

if isstruct(result) && isfield(result, 'error')
    detail = '';
    if isfield(result, 'detail') && ~isempty(result.detail)
        detail = char(result.detail);
    end
    error('faasr3d:fetch_faarfield_mesh:ApiError', ...
        '%s %s', char(result.error), detail);
end

if ~isempty(opts.saveJsonPath)
    jsonText = jsonencode(result, 'PrettyPrint', true);
    fid = fopen(opts.saveJsonPath, 'w');
    if fid < 0
        error('faasr3d:fetch_faarfield_mesh:SaveFailed', ...
            'Unable to write "%s".', opts.saveJsonPath);
    end
    cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
    fprintf(fid, '%s', jsonText);
end

if nargout > 1
    if isfield(result, 'mesh') && ~isempty(result.mesh)
        meshData = faasr3d.mesh_to_matrices(result.mesh);
    else
        meshData = struct();
    end
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
