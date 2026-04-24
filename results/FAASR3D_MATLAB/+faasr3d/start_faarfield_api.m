function status = start_faarfield_api(options)
%START_FAARFIELD_API Start the local FAARFIELD API and wait for /api/health.
%
%   status = faasr3d.start_faarfield_api(struct('exePath', exePath))

if nargin < 1 || isempty(options)
    options = struct();
end

opts = struct( ...
    'baseUrl', 'http://localhost:5100', ...
    'exePath', '', ...
    'forceRestart', false, ...
    'waitTimeoutSec', 30, ...
    'pollIntervalSec', 0.5);
opts = local_merge_structs(opts, options);

status = struct( ...
    'baseUrl', char(opts.baseUrl), ...
    'alreadyRunning', false, ...
    'started', false, ...
    'healthy', false);

if local_is_healthy(opts.baseUrl) && ~opts.forceRestart
    status.alreadyRunning = true;
    status.healthy = true;
    return;
end

if isempty(opts.exePath)
    error('faasr3d:start_faarfield_api:MissingExe', ...
        'API is not running and options.exePath was not provided.');
end
if ~isfile(opts.exePath)
    error('faasr3d:start_faarfield_api:ExeNotFound', ...
        'FaarfieldApi.exe not found: %s', opts.exePath);
end

if opts.forceRestart
    system('taskkill /IM FaarfieldApi.exe /F >NUL 2>&1');
    pause(1.0);
end

exePath = strrep(char(opts.exePath), '/', '\');
psExePath = strrep(exePath, '''', '''''');
cmd = sprintf('powershell -NoProfile -Command "Start-Process -FilePath ''%s''"', psExePath);
[exitCode, cmdOut] = system(cmd); %#ok<ASGLU>
if exitCode ~= 0
    error('faasr3d:start_faarfield_api:LaunchFailed', ...
        'Unable to launch FaarfieldApi.exe.');
end

status.started = true;
deadline = tic;
while toc(deadline) <= opts.waitTimeoutSec
    pause(opts.pollIntervalSec);
    if local_is_healthy(opts.baseUrl)
        status.healthy = true;
        return;
    end
end

error('faasr3d:start_faarfield_api:HealthTimeout', ...
    'FAARFIELD API did not become healthy within %.1f seconds.', opts.waitTimeoutSec);
end

function tf = local_is_healthy(baseUrl)
tf = false;
url = char(baseUrl);
if endsWith(url, '/')
    url = url(1:end-1);
end

try
    response = webread([url '/api/health'], weboptions('Timeout', 5));
    if isstruct(response) && isfield(response, 'ok')
        tf = logical(response.ok);
    else
        tf = true;
    end
catch
    tf = false;
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
