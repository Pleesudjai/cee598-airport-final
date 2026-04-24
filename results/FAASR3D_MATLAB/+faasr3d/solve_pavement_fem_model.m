function results = solve_pavement_fem_model(model, options)
%SOLVE_PAVEMENT_FEM_MODEL Solve a linear elastic HEX8 pavement FEM model.
%
%   results = faasr3d.solve_pavement_fem_model(model)

if nargin < 2 || isempty(options)
    options = struct();
end

opts = struct( ...
    'solver', 'auto', ...
    'directThresholdDofs', 25000, ...
    'assemblyChunkElements', 1000, ...
    'pcgTol', 1e-8, ...
    'pcgMaxIter', 800, ...
    'icholDroptol', 1e-3, ...
    'computeCentroidStress', true, ...
    'verbose', true);
opts = local_merge_structs(opts, options);

local_validate_model(model);

nodes = double(model.nodes);
elements = double(model.elements);
elementE = double(model.elementE(:));
elementNu = double(model.elementNu(:));
F = double(model.forceVector(:));
fixedDofs = unique(double(model.fixedDofs(:)), 'sorted');
freeDofs = double(model.freeDofs(:));

nNodes = size(nodes, 1);
nElem = size(elements, 1);
ndof = 3 * nNodes;

if opts.verbose
    fprintf('Assembling %d HEX8 elements (%d DOF)...\n', nElem, ndof);
end

assemblyTimer = tic;
K = local_assemble_stiffness(nodes, elements, elementE, elementNu, ndof, opts);
assemblyTimeSec = toc(assemblyTimer);

if opts.verbose
    fprintf('Assembly finished in %.2f s. nnz(K) = %d\n', assemblyTimeSec, nnz(K));
end

u = zeros(ndof, 1);
solverInfo = struct('method', '', 'flag', 0, 'relres', 0, 'iter', 0);

if isempty(freeDofs)
    error('faasr3d:solve_pavement_fem_model:NoFreeDofs', ...
        'No free DOFs are available for the solve.');
end

Kff = K(freeDofs, freeDofs);
Ff = F(freeDofs);

solveTimer = tic;
if norm(Ff) == 0
    method = 'zero-load';
    uf = zeros(size(Ff));
    solverInfo.flag = 0;
    solverInfo.relres = 0;
    solverInfo.iter = 0;
else
    method = local_pick_solver(opts.solver, numel(freeDofs), opts.directThresholdDofs);
    switch method
        case 'direct'
            uf = Kff \ Ff;
            solverInfo.flag = 0;
            solverInfo.relres = 0;
            solverInfo.iter = 1;
        case 'pcg'
            M1 = [];
            try
                setup = struct('type', 'ict', 'droptol', opts.icholDroptol, 'michol', 'on');
                M1 = ichol(Kff, setup);
            catch
                M1 = [];
            end
            if isempty(M1)
                [uf, flag, relres, iter] = pcg(Kff, Ff, opts.pcgTol, opts.pcgMaxIter);
            else
                [uf, flag, relres, iter] = pcg(Kff, Ff, opts.pcgTol, opts.pcgMaxIter, M1, M1');
            end
            solverInfo.flag = flag;
            solverInfo.relres = relres;
            solverInfo.iter = iter;
            if flag ~= 0 && strcmpi(opts.solver, 'auto')
                uf = Kff \ Ff;
                method = 'direct-fallback';
                solverInfo.flag = 0;
                solverInfo.relres = 0;
                solverInfo.iter = iter;
            end
        otherwise
            error('faasr3d:solve_pavement_fem_model:UnknownSolver', ...
                'Unknown solver option "%s".', method);
    end
end
solveTimeSec = toc(solveTimer);
solverInfo.method = method;

u(freeDofs) = uf;
U = reshape(u, 3, []).';
reactions = K * u - F;

centroidStress = [];
centroidStrain = [];
vonMises = [];
stressTimeSec = 0;
if opts.computeCentroidStress
    stressTimer = tic;
    [centroidStress, centroidStrain, vonMises] = local_compute_centroid_stress( ...
        nodes, elements, elementE, elementNu, u);
    stressTimeSec = toc(stressTimer);
end

results = struct();
results.displacements = u;
results.U = U;
results.reactions = reactions;
results.centroidStress = centroidStress;
results.centroidStrain = centroidStrain;
results.vonMises = vonMises;
results.solverInfo = solverInfo;
results.timings = struct( ...
    'assemblySec', assemblyTimeSec, ...
    'solveSec', solveTimeSec, ...
    'stressSec', stressTimeSec);
maxAbsReaction = 0;
if ~isempty(fixedDofs)
    maxAbsReaction = max(abs(reactions(fixedDofs)));
end
results.summary = struct( ...
    'maxAbsDisplacementIn', max(abs(u)), ...
    'minUzIn', min(U(:, 3)), ...
    'maxUzIn', max(U(:, 3)), ...
    'maxAbsReactionLbf', maxAbsReaction, ...
    'totalAppliedLoadLbf', sum(F), ...
    'freeDofCount', numel(freeDofs));

if opts.verbose
    fprintf('Solve finished in %.2f s using %s.\n', solveTimeSec, method);
    fprintf('Min Uz = %.6g in, Max |u| = %.6g in\n', ...
        results.summary.minUzIn, results.summary.maxAbsDisplacementIn);
end

end

function K = local_assemble_stiffness(nodes, elements, elementE, elementNu, ndof, opts)
nElem = size(elements, 1);
[upperRow, upperCol] = find(triu(true(24)));
nUpper = numel(upperRow);

K = sparse(ndof, ndof);
chunkSize = max(1, round(opts.assemblyChunkElements));
nChunks = ceil(nElem / chunkSize);

for c = 1:nChunks
    eFirst = (c - 1) * chunkSize + 1;
    eLast = min(c * chunkSize, nElem);
    nChunk = eLast - eFirst + 1;

    ii = zeros(nUpper * nChunk, 1);
    jj = zeros(nUpper * nChunk, 1);
    vv = zeros(nUpper * nChunk, 1);
    cursor = 0;

    for e = eFirst:eLast
        conn = elements(e, :);
        edofs = local_element_dofs(conn);
        Ke = local_hex8_stiffness(nodes(conn, :), elementE(e), elementNu(e));
        vals = Ke(sub2ind([24, 24], upperRow, upperCol));
        rng = cursor + 1:cursor + nUpper;
        ii(rng) = edofs(upperRow);
        jj(rng) = edofs(upperCol);
        vv(rng) = vals;
        cursor = cursor + nUpper;
    end

    K = K + sparse(ii(1:cursor), jj(1:cursor), vv(1:cursor), ndof, ndof);
    if opts.verbose && (nChunks == 1 || c == nChunks || mod(c, max(1, ceil(nChunks / 10))) == 0)
        fprintf('  Assembly chunk %d / %d\n', c, nChunks);
    end
end

K = K + triu(K, 1).';
end

function [centroidStress, centroidStrain, vonMises] = local_compute_centroid_stress(nodes, elements, elementE, elementNu, u)
nElem = size(elements, 1);
centroidStress = zeros(nElem, 6);
centroidStrain = zeros(nElem, 6);
vonMises = zeros(nElem, 1);

for e = 1:nElem
    conn = elements(e, :);
    edofs = local_element_dofs(conn);
    ue = u(edofs);
    coords = nodes(conn, :);
    [B, detJ] = local_hex8_bmatrix(coords, 0, 0, 0);
    if detJ <= 0
        error('faasr3d:solve_pavement_fem_model:NegativeJacobian', ...
            'Element %d has non-positive Jacobian at the centroid.', e);
    end
    D = local_constitutive_matrix(elementE(e), elementNu(e));
    strain = B * ue;
    stress = D * strain;
    centroidStrain(e, :) = strain.';
    centroidStress(e, :) = stress.';
    sx = stress(1);
    sy = stress(2);
    sz = stress(3);
    txy = stress(4);
    tyz = stress(5);
    txz = stress(6);
    vonMises(e) = sqrt(0.5 * ((sx - sy)^2 + (sy - sz)^2 + (sz - sx)^2) + 3 * (txy^2 + tyz^2 + txz^2));
end
end

function Ke = local_hex8_stiffness(coords, E, nu)
gauss = [-1, 1] / sqrt(3);
D = local_constitutive_matrix(E, nu);
Ke = zeros(24, 24);

for i = 1:2
    xi = gauss(i);
    for j = 1:2
        eta = gauss(j);
        for k = 1:2
            zeta = gauss(k);
            [B, detJ] = local_hex8_bmatrix(coords, xi, eta, zeta);
            if detJ <= 0
                error('faasr3d:solve_pavement_fem_model:NegativeJacobian', ...
                    'HEX8 element has non-positive Jacobian determinant (detJ = %.6g).', detJ);
            end
            Ke = Ke + (B' * D * B) * detJ;
        end
    end
end
end

function [B, detJ] = local_hex8_bmatrix(coords, xi, eta, zeta)
dNNatural = local_shape_derivatives(xi, eta, zeta);
J = dNNatural * coords;
detJ = det(J);
dNGlobal = J \ dNNatural;

B = zeros(6, 24);
for a = 1:8
    cols = 3 * (a - 1) + (1:3);
    dNx = dNGlobal(1, a);
    dNy = dNGlobal(2, a);
    dNz = dNGlobal(3, a);
    B(:, cols) = [ ...
        dNx,   0,   0; ...
          0, dNy,   0; ...
          0,   0, dNz; ...
        dNy, dNx,   0; ...
          0, dNz, dNy; ...
        dNz,   0, dNx];
end
end

function dN = local_shape_derivatives(xi, eta, zeta)
dN = 0.125 * [ ...
    -(1 - eta) * (1 - zeta),  (1 - eta) * (1 - zeta),  (1 + eta) * (1 - zeta), -(1 + eta) * (1 - zeta), ...
    -(1 - eta) * (1 + zeta),  (1 - eta) * (1 + zeta),  (1 + eta) * (1 + zeta), -(1 + eta) * (1 + zeta); ...
    -(1 - xi)  * (1 - zeta), -(1 + xi)  * (1 - zeta),  (1 + xi)  * (1 - zeta),  (1 - xi)  * (1 - zeta), ...
    -(1 - xi)  * (1 + zeta), -(1 + xi)  * (1 + zeta),  (1 + xi)  * (1 + zeta),  (1 - xi)  * (1 + zeta); ...
    -(1 - xi)  * (1 - eta),  -(1 + xi)  * (1 - eta),  -(1 + xi)  * (1 + eta),  -(1 - xi)  * (1 + eta), ...
     (1 - xi)  * (1 - eta),   (1 + xi)  * (1 - eta),   (1 + xi)  * (1 + eta),   (1 - xi)  * (1 + eta)];
end

function D = local_constitutive_matrix(E, nu)
factor = E / ((1 + nu) * (1 - 2 * nu));
D = factor * [ ...
    1 - nu,      nu,      nu,           0,           0,           0; ...
         nu, 1 - nu,      nu,           0,           0,           0; ...
         nu,      nu, 1 - nu,           0,           0,           0; ...
          0,       0,       0, (1 - 2 * nu) / 2,     0,           0; ...
          0,       0,       0,           0, (1 - 2 * nu) / 2,     0; ...
          0,       0,       0,           0,           0, (1 - 2 * nu) / 2];
end

function edofs = local_element_dofs(conn)
edofs = zeros(24, 1);
for a = 1:8
    base = 3 * (conn(a) - 1);
    edofs(3 * (a - 1) + (1:3)) = base + (1:3);
end
end

function method = local_pick_solver(requested, nFreeDofs, threshold)
if strcmpi(requested, 'auto')
    if nFreeDofs <= threshold
        method = 'direct';
    else
        method = 'pcg';
    end
else
    method = lower(requested);
end
end

function local_validate_model(model)
required = {'nodes', 'elements', 'elementE', 'elementNu', 'forceVector', 'fixedDofs', 'freeDofs'};
for i = 1:numel(required)
    if ~isfield(model, required{i})
        error('faasr3d:solve_pavement_fem_model:MissingField', ...
            'Model is missing required field "%s".', required{i});
    end
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
