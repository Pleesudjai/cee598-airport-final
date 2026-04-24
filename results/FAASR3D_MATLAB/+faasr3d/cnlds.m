function [state, lineNumber] = cnlds(readTextAll, lineNumber, state)
%CNLDS MATLAB translation of FEMClassLib/FAASR/clsCnlds.vb.

nLoad = local_scalar(state.nload);
state.nod = zeros(nLoad, 1);
state.idirn = zeros(nLoad, 1);
state.ncur = zeros(nLoad, 1);
state.fac = zeros(nLoad, 1);

for i = 1:nLoad
    lineNumber = lineNumber + 1;
    lineText = local_get_line(readTextAll, lineNumber);
    elements = local_split_numeric_line(lineText, 18);
    state.nod(i) = str2double(elements{1});
    state.idirn(i) = str2double(elements{2});
    state.ncur(i) = str2double(elements{3});
    state.fac(i) = str2double(elements{4});
    if state.fac(i) == 0
        state.fac(i) = 1.0;
    end
end

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
