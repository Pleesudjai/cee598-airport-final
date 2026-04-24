function state = trans_data(ipc, stopFEDFAA, fedfaaStopped, idTyp, i1, ...
    workingDir, filenameOnly, state)
%TRANS_DATA MATLAB translation of FEMClassLib/FAASR/clsTransData.vb.

if nargin < 8 || isempty(state)
    state = faasr3d.make_com_state();
end

copyFields = { ...
    'nmmat', 'numnp', 'numelh', 'numsv', 'inpsd', 'ntime', ...
    'nlcur', 'nptm', 'nload', 'numpc', 'numdc', 'nrcc', ...
    'matype', 'den', 'prop', 'idp', 'x', 'nob', ...
    'nmmtde', 'nmelde', 'nmmass', 'mtypde', 'ixde', 'cmde', 'sclf', ...
    'nrttlm', 'nrttls', 'iparm', 'iaug', 'ifd', 'ngap', ...
    'irects', 'irectm', 'fric', 'pend', 'altol', 'sfact', ...
    'tdeath', 'tbury', 'stfsf', ...
    'nod', 'idirn', 'ncur', 'npc', 'nptst', 'itemp', 'itread', ...
    'fac', 'pld', 'tmode', 'tbase', 'cnwmk', 'iacc'};

for k = 1:numel(copyFields)
    name = copyFields{k};
    if isfield(ipc, name)
        state.(name) = ipc.(name);
    end
end

state.dt = 1.0;
state.StopFEDFAA = stopFEDFAA;
state.FEDFAAStopped = fedfaaStopped;
state.IDTyp = idTyp;
state.I1 = i1;
state.WorkingDir = char(workingDir);
state.FilenameOnly = char(filenameOnly);

nElem = local_scalar(state.numelh);
if nElem <= 0 || ~isfield(ipc, 'ia') || isempty(ipc.ia)
    state.ixh = [];
    state.ixe = [];
    return;
end

ia = ipc.ia(:);
state.ixh = zeros(9, nElem);
state.ixe = zeros(9, nElem);

for ii = 1:nElem
    base = 9 * (ii - 1) + 1;
    last = base + 8;
    if last > numel(ia)
        error('faasr3d:trans_data:InvalidIA', ...
            'IPC.ia is too short for element %d.', ii);
    end
    block = reshape(ia(base:last), 9, 1);
    state.ixh(:, ii) = block;
    state.ixe(:, ii) = block;
end

end

function value = local_scalar(value)
if isempty(value)
    value = 0;
else
    value = double(value(1));
end
end
