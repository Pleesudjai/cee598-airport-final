function [state, stepSnapshot] = set_step1(state)
%SET_STEP1 MATLAB translation of FEMClassLib/FAASR/clsSetStep1.vb.

stepSnapshot = struct( ...
    'nod0', state.nod(:), ...
    'idirn0', state.idirn(:), ...
    'ncur0', state.ncur(:), ...
    'fac0', state.fac(:));

state.nlcur = 1;
state.nptm = 2;
state.npc = [1; 5];
state.pld = [0; 0; 1; 1];
state.nptst = 5;

end
