classdef DebugWrite
    %DEBUGWRITE MATLAB translation of FEMClassLib/FAASR/modWrite.vb.
    %   Methods are grouped here because the VB source was a single module
    %   of closely related CSV/debug output helpers.

    methods (Static)
        function check2d(D, ii, jj, istep, workingDir)
            fileName = faasr3d.DebugWrite.local_step_file(workingDir, istep);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            useInt = isinteger(D);
            for j = 1:jj
                s = sprintf('%.0f', j);
                for i = 1:ii
                    if useInt
                        s = [s, ', ', sprintf('%.0f', double(D(i, j)))]; %#ok<AGROW>
                    else
                        s = [s, ', ', sprintf('%.8E', double(D(i, j)))]; %#ok<AGROW>
                    end
                end
                fprintf(fid, '%s\n', s);
            end
        end

        function check2d1(D, ii, jj, istep, workingDir)
            fileName = faasr3d.DebugWrite.local_step_file(workingDir, istep);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            fprintf(fid, '%.0f, %.8E\n', double(jj), double(D(ii, jj)));
        end

        function check2dt(D, ii, jj, istep, workingDir)
            fileName = faasr3d.DebugWrite.local_step_file(workingDir, istep);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            useInt = isinteger(D);
            for i = 1:ii
                s = sprintf('%.0f', i);
                for j = 1:jj
                    if useInt
                        s = [s, ', ', sprintf('%.0f', double(D(i, j)))]; %#ok<AGROW>
                    else
                        s = [s, ', ', sprintf('%.12E', double(D(i, j)))]; %#ok<AGROW>
                    end
                end
                fprintf(fid, '%s\n', s);
            end
        end

        function check3d(D, ii, jj, kk, workingDir)
            fileName = faasr3d.DebugWrite.local_plain_file(workingDir);
            fid = fopen(fileName, 'w');
            if fid < 0
                error('faasr3d:DebugWrite:OpenFailed', ...
                    'Unable to open "%s" for writing.', fileName);
            end
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            for i = 1:ii
                for j = 1:jj
                    s = sprintf('%.0f,%.0f', i, j);
                    for k = 1:kk
                        s = [s, ', ', sprintf('%.9E', double(D(i, j, k)))]; %#ok<AGROW>
                    end
                    fprintf(fid, '%s\n', s);
                end
            end
        end

        function check1d(D, ii, istep, workingDir)
            fileName = faasr3d.DebugWrite.local_step_file(workingDir, istep);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            useInt = isinteger(D);
            for i = 1:ii
                if useInt
                    fprintf(fid, '%.0f\n', double(D(i)));
                else
                    fprintf(fid, '%.0f, %.8E\n', double(i), double(D(i)));
                end
            end
        end

        function check1d2(D, ii, jj, workingDir)
            fileName = faasr3d.DebugWrite.local_plain_file(workingDir);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            for i = 1:ii
                base = ii * (i - 1) + 1;
                s = sprintf('%.7E', double(D(base)));
                for j = 2:jj
                    s = [s, ',', sprintf('%.7E', double(D(base + j - 1)))]; %#ok<AGROW>
                end
                fprintf(fid, '%s\n', s);
            end
        end

        function check13(ng, D, E, istep, workingDir)
            fileName = faasr3d.DebugWrite.local_step_file(workingDir, istep);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            fprintf(fid, '%.0f,%.7E,%.7E\n', double(ng), double(D), double(E));
        end

        function checkrhs(D, E, ng, idx, workingDir)
            fileName = faasr3d.DebugWrite.local_plain_file(workingDir);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            s = sprintf('%.0f,%.0f', double(ng), double(idx));
            for j = 1:24
                s = [s, ',', sprintf('%.7E', double(D(E(j, idx))))]; %#ok<AGROW>
            end
            fprintf(fid, '%s\n', s);
        end

        function checkrhs2(D, E, idx, workingDir)
            fileName = faasr3d.DebugWrite.local_plain_file(workingDir);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            s = sprintf('%.0f', double(idx));
            for j = 1:15
                s = [s, ',', sprintf('%.0f', double(D(j))), ',', sprintf('%.7E', double(E(j)))]; %#ok<AGROW>
            end
            fprintf(fid, '%s\n', s);
        end

        function checka2(D, E, n, istep, workingDir)
            fileName = faasr3d.DebugWrite.local_step_file(workingDir, istep);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            for j = 1:n
                if D(j) ~= 0 || E(j) ~= 0
                    fprintf(fid, '%.0f,%.7E,%.7E\n', double(j), double(D(j)), double(E(j)));
                end
            end
        end

        function checka22(D, E, n, istep, workingDir)
            fileName = faasr3d.DebugWrite.local_step_file(workingDir, istep);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            for j = 1:n
                fprintf(fid, '%.0f,%.7E,%.7E\n', double(j), double(D(1, j)), double(E(1, j)));
            end
        end

        function checkrdot(rhsc, ng, idx, workingDir)
            fileName = faasr3d.DebugWrite.local_plain_file(workingDir);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            fprintf(fid, '%.0f,%.0f,%.7E\n', double(ng), double(idx), double(rhsc));
        end

        function check5(A, B, C, D, E, workingDir)
            fileName = faasr3d.DebugWrite.local_plain_file(workingDir);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            fprintf(fid, '%.7E,%.7E,%.7E,%.7E,%.7E\n', ...
                double(A), double(B), double(C), double(D), double(E));
        end

        function check4(A, B, C, D, istep, workingDir)
            fileName = faasr3d.DebugWrite.local_step_file(workingDir, istep);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            fprintf(fid, '%.0f,%.0f,%.0f,%.0f\n', double(A), double(B), double(C), double(D));
        end

        function check1d3(D, E, F, n, istep, workingDir)
            fileName = faasr3d.DebugWrite.local_step_file(workingDir, istep);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            for i = 1:n
                fprintf(fid, '%.0f,%.7E,%.7E,%.7E\n', ...
                    double(i), double(D(i)), double(E(i)), double(F(i)));
            end
        end

        function check1d32(D, E, F, n, ipt, istep, workingDir)
            fileName = faasr3d.DebugWrite.local_step_file(workingDir, istep);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            for i = 1:n
                fprintf(fid, '%.0f,%.7E,%.7E,%.7E\n', ...
                    double(i), double(D(i)), double(E(i)), double(F(i, ipt)));
            end
        end

        function check1d33(D, E, F, n, j0, istep, workingDir)
            fileName = faasr3d.DebugWrite.local_step_file(workingDir, istep);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            for i = 1:n
                fprintf(fid, '%.0f,%.7E,%.7E,%.7E\n', ...
                    double(j0), double(D(1, j0 + i)), double(E(1, j0 + i)), double(F(i)));
            end
        end

        function check3(D, E, F, idx, istep, workingDir)
            fileName = faasr3d.DebugWrite.local_step_file(workingDir, istep);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            fprintf(fid, '%.0f,%.7E,%.7E,%.7E\n', ...
                double(idx), double(D(idx)), double(E(idx)), double(F(idx)));
        end

        function checkName(A, workingDir)
            fileName = faasr3d.DebugWrite.local_plain_file(workingDir);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            fprintf(fid, '%s\n', char(A));
        end

        function checkName2(A, idx, workingDir)
            fileName = faasr3d.DebugWrite.local_plain_file(workingDir);
            fid = faasr3d.DebugWrite.local_open_append(fileName);
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            fprintf(fid, '%s%.0f\n', char(A), double(idx));
        end

        function D = read(D, n, workingDir)
            fileName = fullfile(char(workingDir), 'read.txt');
            fid = fopen(fileName, 'r');
            if fid < 0
                error('faasr3d:DebugWrite:ReadFailed', ...
                    'Unable to open "%s" for reading.', fileName);
            end
            cleanupObj = onCleanup(@() fclose(fid)); %#ok<NASGU>
            for i = 1:n
                lineText = fgetl(fid);
                elements = faasr3d.DebugWrite.local_split_numeric_line(lineText, 18);
                D(i) = str2double(elements{4});
            end
        end
    end

    methods (Static, Access = private)
        function fileName = local_step_file(workingDir, istep)
            workingDir = char(workingDir);
            if ~exist(workingDir, 'dir')
                mkdir(workingDir);
            end
            fileName = fullfile(workingDir, sprintf('check-%d.csv', istep));
        end

        function fileName = local_plain_file(workingDir)
            workingDir = char(workingDir);
            if ~exist(workingDir, 'dir')
                mkdir(workingDir);
            end
            fileName = fullfile(workingDir, 'check.csv');
        end

        function fid = local_open_append(fileName)
            fid = fopen(fileName, 'a');
            if fid < 0
                error('faasr3d:DebugWrite:OpenFailed', ...
                    'Unable to open "%s" for appending.', fileName);
            end
        end

        function elements = local_split_numeric_line(lineText, insertIndex)
            lineText = char(lineText);
            if numel(lineText) >= insertIndex
                lineText = [lineText(1:insertIndex), ' ', lineText(insertIndex + 1:end)];
            end
            elements = regexp(strtrim(lineText), '\s+', 'split');
        end
    end
end
