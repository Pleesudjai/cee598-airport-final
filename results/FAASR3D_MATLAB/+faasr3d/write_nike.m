function fileName = write_nike(ipc, workingDir)
%WRITE_NIKE MATLAB translation of FEMClassLib/FAASR/clsWriteNike.vb.

workingDir = char(workingDir);
if ~exist(workingDir, 'dir')
    mkdir(workingDir);
end

fileName = fullfile(workingDir, 'nike.txt');
fid = fopen(fileName, 'w');
if fid < 0
    error('faasr3d:write_nike:OpenFailed', ...
        'Unable to open "%s" for writing.', fileName);
end

cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>

for i = 1:local_scalar(ipc.nmmat)
    fprintf(fid, '%s  %s\n', local_fmt_int(ipc.matype(i)), local_fmt_float(ipc.den(i)));
    for j = 1:6
        s = ' ';
        for k = 1:8
            idx = 6 * (k - 1) + j;
            s = [s, ' ', local_fmt_float(ipc.prop(idx, i))]; %#ok<AGROW>
        end
        fprintf(fid, '%s\n', s);
    end
end

for i = 1:local_scalar(ipc.numnp)
    s = local_fmt_int(i);
    for j = 1:6
        s = [s, ' ', local_fmt_int(ipc.idp(j, i))]; %#ok<AGROW>
    end
    for j = 1:3
        s = [s, ' ', local_fmt_float(ipc.x(j, i))]; %#ok<AGROW>
    end
    fprintf(fid, '%s\n', s);
end

for i = 1:local_scalar(ipc.numelh)
    base = 9 * (i - 1) + 1;
    block = ipc.ia(base:base + 8);
    s = local_fmt_int(i);
    for j = 1:9
        s = [s, ' ', local_fmt_int(block(j))]; %#ok<AGROW>
    end
    fprintf(fid, '%s\n', s);
end

fprintf(fid, '%s %s %s\n', local_fmt_int(ipc.nmmtde), local_fmt_int(ipc.nmelde), ...
    local_fmt_int(ipc.nmmass));

for i = 1:local_scalar(ipc.nmmtde)
    fprintf(fid, '%s %s\n', local_fmt_int(i), local_fmt_int(ipc.mtypde(i)));
    fprintf(fid, '%s %s\n', local_fmt_float(ipc.cmde(1, i)), local_fmt_float(ipc.cmde(2, i)));
end

for i = 1:local_scalar(ipc.nmelde)
    fprintf(fid, '%s %s %s %s %s\n', local_fmt_int(i), local_fmt_int(ipc.ixde(1, i)), ...
        local_fmt_int(ipc.ixde(2, i)), local_fmt_int(ipc.ixde(3, i)), local_fmt_int(ipc.sclf(i)));
end

for i = 1:local_scalar(ipc.numsv)
    s = sprintf('%s %s %s %s %s %s %s %s %s', ...
        local_fmt_int(ipc.iparm(1, i)), local_fmt_int(ipc.iparm(2, i)), ...
        local_fmt_int(ipc.iparm(5, i)), local_fmt_float(ipc.stfsf(i)), ...
        local_fmt_float(ipc.fric(1, i)), local_fmt_float(ipc.fric(3, i)), ...
        local_fmt_float(ipc.fric(3, i)), local_fmt_float(ipc.pend(i)), ...
        local_fmt_int(ipc.ngap(i)));

    if ipc.fric(1, i) == 0.005
        fprintf(fid, '%s %s\n', s, local_fmt_int(1));
        fprintf(fid, '%s %s %s %s %s %s %s\n', ...
            local_fmt_float(ipc.iaug(i)), local_fmt_float(ipc.altol(1, i)), ...
            local_fmt_float(ipc.altol(2, i)), local_fmt_float(ipc.sfact(i)), ...
            local_fmt_float(ipc.tdeath(i)), local_fmt_float(ipc.tbury(i)), ...
            local_fmt_float(ipc.ifd(i)));
    else
        fprintf(fid, '%s %s\n', s, local_fmt_int(0));
    end
end

for i = 1:local_scalar(ipc.numsv)
    for j = 1:ipc.iparm(1, i)
        fprintf(fid, '%s %s %s %s %s\n', local_fmt_int(j), ...
            local_fmt_int(ipc.irects(1, j)), local_fmt_int(ipc.irects(2, j)), ...
            local_fmt_int(ipc.irects(3, j)), local_fmt_int(ipc.irects(4, j)));
    end
    for j = 1:ipc.iparm(2, i)
        fprintf(fid, '%s %s %s %s %s\n', local_fmt_int(j), ...
            local_fmt_int(ipc.irectm(1, j)), local_fmt_int(ipc.irectm(2, j)), ...
            local_fmt_int(ipc.irectm(3, j)), local_fmt_int(ipc.irectm(4, j)));
    end
end

for i = 1:local_scalar(ipc.nlcur)
    fprintf(fid, '%s %s\n', local_fmt_int(i), local_fmt_int(ipc.nptm));
    for j = 1:ipc.nptm
        idx = ipc.npc(i) + (ipc.nptm - 1) * (j - 1);
        fprintf(fid, '%s %s\n', local_fmt_float(ipc.pld(idx)), ...
            local_fmt_float(ipc.pld(idx + 1)));
    end
end

for i = 1:local_scalar(ipc.nload)
    fprintf(fid, '%s %s %s %s\n', local_fmt_int(ipc.nod(i)), ...
        local_fmt_int(ipc.idirn(i)), local_fmt_int(ipc.ncur(i)), ...
        local_fmt_float(ipc.fac(i)));
end

if local_scalar(ipc.itemp) == 1
    for i = 1:local_scalar(ipc.numnp)
        fprintf(fid, '%s %s %s\n', local_fmt_int(i), ...
            local_fmt_float(ipc.tmode(i)), local_fmt_float(ipc.tbase(i)));
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

function text = local_fmt_int(value)
text = sprintf('%.0f', double(value));
end

function text = local_fmt_float(value)
text = sprintf('%.3E', double(value));
end
