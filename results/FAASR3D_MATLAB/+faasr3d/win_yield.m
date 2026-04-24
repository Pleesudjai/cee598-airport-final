function stopFEDFAA = win_yield(~, fedfaaStopped, options)
%WIN_YIELD MATLAB approximation of FEMClassLib/FAASR/clsWinYield.vb.
%   VB.NET used Win32 global atoms. This MATLAB version uses an optional
%   stop-flag file for a portable equivalent.

stopFEDFAA = 0;
flagFile = local_get_flag_file(options);

if fedfaaStopped == -1
    local_delete_flag(flagFile);
    return;
end

if ~isempty(flagFile) && exist(flagFile, 'file') == 2
    local_delete_flag(flagFile);
    stopFEDFAA = -1;
end

end

function flagFile = local_get_flag_file(options)
flagFile = '';
if nargin >= 1 && isstruct(options) && isfield(options, 'stopFlagFile')
    flagFile = char(options.stopFlagFile);
end
end

function local_delete_flag(flagFile)
if ~isempty(flagFile) && exist(flagFile, 'file') == 2
    delete(flagFile);
end
end
