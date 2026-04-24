function [idCase, lutty, outputInfo] = initial_set(i1, workingDir, modelOut)
%INITIAL_SET MATLAB translation of FEMClassLib/FAASR/clsInitialSet.vb.

workingDir = char(workingDir);
if ~exist(workingDir, 'dir')
    mkdir(workingDir);
end

tag = 'PrintOut-';
tagIndex = strfind(workingDir, tag);
if ~isempty(tagIndex)
    startIndex = tagIndex(1) + numel(tag);
    fileName1 = workingDir(startIndex:end);
    baseDir = workingDir(1:tagIndex(1) - 1);
else
    [baseDir, fileName1] = fileparts(workingDir);
    if isempty(baseDir)
        baseDir = workingDir;
    end
end

caseFile = fullfile(baseDir, ['FAASR3d-' fileName1 '.txt']);
logFile = fullfile(workingDir, 'FAASR3d.txt');
lutty = -1;

if modelOut == 1
    [lutty, errmsg] = fopen(logFile, 'w');
    if lutty < 0
        error('faasr3d:initial_set:OpenFailed', ...
            'Unable to open "%s": %s', logFile, errmsg);
    end
end

switch i1
    case 1
        idCase = '1DSYM';
    case 2
        idCase = '2DSYM';
    case 3
        idCase = '3DSYM';
    case 4
        idCase = '4DNSY';
    case 5
        idCase = '5DSYM';
    otherwise
        idCase = '';
end

outputInfo = struct( ...
    'printOutDir', workingDir, ...
    'caseFile', caseFile, ...
    'logFile', logFile);

end
