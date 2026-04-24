function [stress1, stress8, state, runInfo] = faasr3d(ipc, runOptions)
%FAASR3D MATLAB translation of FEMClassLib/FAASR/clsFAASR3D.vb.
%   This port mirrors the FAASR orchestration layer. The deeper solver
%   stages from clsInput.inputi, clsInitial.intial, and clsSolve.solve are
%   exposed as callbacks so this package stays aligned with the VB.NET
%   source boundary.

if nargin < 2 || isempty(runOptions)
    runOptions = struct();
end
opts = local_fill_defaults(runOptions);

workingDir = char(opts.workingDir);
filenameOnly = char(opts.filenameOnly);
printOutDir = fullfile(workingDir, ['PrintOut-' filenameOnly]);

state = faasr3d.make_com_state();
state = faasr3d.trans_data(ipc, opts.stopFEDFAA, opts.fedfaaStopped, ...
    opts.idTyp, opts.i1, workingDir, filenameOnly, state);

stress1 = zeros(81, 1);
stress8 = zeros(81, 1);
state.stress1 = stress1;
state.stress8 = stress8;
state = faasr3d.erase_output(state);

[idCase, lutty, outputInfo] = faasr3d.initial_set(opts.i1, printOutDir, opts.modelOut);
opts.stopFEDFAA = faasr3d.win_yield(opts.stopFEDFAA, opts.fedfaaStopped, opts);

missingCallbacks = {};
seprun = logical(opts.seprun);
ntimestep = 1;
nload0 = local_scalar(state.nload);
stepSnapshot = struct();

if seprun
    ntimestep = local_scalar(state.ntime);
    state.ntime = 1;
    [state, stepSnapshot] = faasr3d.set_step1(state);
end

status = 'completed';
for iStep = 1:ntimestep
    state.Ntimestep = iStep;

    if seprun
        state = faasr3d.set_step2(iStep, state, stepSnapshot);
    end

    if iStep == 1
        if isempty(opts.inputiFn)
            missingCallbacks = local_add_missing(missingCallbacks, 'inputi');
        else
            state = opts.inputiFn(state, lutty);
        end

        if opts.modelOut == 1
            local_log(lutty, ['Input File Done, ' faasr3d.get_time_string() newline]);
        end
    end

    if isempty(opts.intialFn)
        missingCallbacks = local_add_missing(missingCallbacks, 'intial');
    else
        state = opts.intialFn(state);
    end

    if opts.modelOut == 1
        msg = sprintf('%sAircraft #%d Initialize Data Done, %s%s', ...
            newline, iStep, faasr3d.get_time_string(), newline);
        local_log(lutty, msg);
    end

    if ~isempty(opts.cancelFn) && opts.cancelFn()
        status = 'cancelled';
        break;
    end

    if isempty(opts.solveFn)
        missingCallbacks = local_add_missing(missingCallbacks, 'solve');
    else
        [state, stress1, stress8] = opts.solveFn(state, iStep, stress1, stress8, ...
            opts.modelOut, opts);
    end
end

state.stress1 = stress1;
state.stress8 = stress8;

if opts.modelOut == 1
    local_log(lutty, [newline newline 'FAASR3D Program Done, ' ...
        faasr3d.get_time_string()]);
end

runInfo = struct( ...
    'idCase', idCase, ...
    'lutty', lutty, ...
    'outputInfo', outputInfo, ...
    'missingCallbacks', {missingCallbacks}, ...
    'status', status, ...
    'nTimeStep', ntimestep, ...
    'nLoad0', nload0, ...
    'seprun', seprun);

if opts.cleanupState
    state = faasr3d.erase_input(state, lutty, opts.modelOut);
else
    local_close_file(lutty);
end

end

function opts = local_fill_defaults(runOptions)
opts = struct( ...
    'stopFEDFAA', 0, ...
    'fedfaaStopped', 0, ...
    'idTyp', 0, ...
    'i1', 0, ...
    'workingDir', pwd, ...
    'filenameOnly', 'job', ...
    'modelOut', 0, ...
    'seprun', false, ...
    'cleanupState', true, ...
    'stopFlagFile', '', ...
    'inputiFn', [], ...
    'intialFn', [], ...
    'solveFn', [], ...
    'cancelFn', []);

names = fieldnames(runOptions);
for k = 1:numel(names)
    opts.(names{k}) = runOptions.(names{k});
end
end

function value = local_scalar(value)
if isempty(value)
    value = 0;
else
    value = double(value(1));
end
end

function missingCallbacks = local_add_missing(missingCallbacks, callbackName)
if ~any(strcmp(missingCallbacks, callbackName))
    missingCallbacks{end + 1} = callbackName; %#ok<AGROW>
end
end

function local_log(fid, message)
if fid > 0
    fprintf(fid, '%s', message);
end
end

function local_close_file(fid)
if fid > 0
    try
        fclose(fid);
    catch
    end
end
end
