function [stopFEDFAA, fedfaaStopped] = del_atom(options)
%DEL_ATOM MATLAB approximation of FEMClassLib/FAASR/clsDelAtom.vb.
%   VB.NET repeatedly removed a Win32 global atom. This version repeatedly
%   deletes an optional stop-flag file until it no longer exists.

flagFile = '';
if nargin >= 1 && isstruct(options) && isfield(options, 'stopFlagFile')
    flagFile = char(options.stopFlagFile);
end

while ~isempty(flagFile) && exist(flagFile, 'file') == 2
    delete(flagFile);
end

stopFEDFAA = 0;
fedfaaStopped = 0;

end
