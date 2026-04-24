function [state, lineNumber] = ldcvs(readTextAll, lineNumber, state)
%LDCVS MATLAB translation of FEMClassLib/FAASR/clsLdcvs.vb.

nPtm = local_scalar(state.nptm);
nLcur = local_scalar(state.nlcur);
rv = zeros(nPtm, 1);
timv = zeros(nPtm, 1);

state.pld = zeros(2 * nLcur * nPtm, 1);
state.npc = zeros(nLcur + 1, 1);
state.npc(1) = 1;

for j = 1:nLcur
    lineText = local_get_line(readTextAll, lineNumber);
    elements = regexp(strtrim(lineText), '\s+', 'split');
    npts = str2double(elements{2});

    for i = 1:npts
        lineNumber = lineNumber + 1;
        lineText = local_get_line(readTextAll, lineNumber);
        elements = local_split_numeric_line(lineText, 10);
        timv(i) = str2double(elements{1});
        rv(i) = str2double(elements{2});
    end

    state.npc(j + 1) = state.npc(j) + 2 * npts;
    idx = state.npc(j);
    for kk = 1:npts
        state.pld(idx) = timv(kk);
        idx = idx + 1;
        state.pld(idx) = rv(kk);
        idx = idx + 1;
    end

    lineNumber = lineNumber + 1;
end

state.nptst = state.npc(nLcur + 1);

end

function value = local_scalar(value)
if isempty(value)
    value = 0;
else
    value = double(value(1));
end
end

function lineText = local_get_line(lines, index)
if isstring(lines)
    lineText = char(lines(index));
else
    lineText = char(lines{index});
end
end

function elements = local_split_numeric_line(lineText, insertIndex)
if numel(lineText) >= insertIndex
    lineText = [lineText(1:insertIndex), ' ', lineText(insertIndex + 1:end)];
end
elements = regexp(strtrim(lineText), '\s+', 'split');
end
