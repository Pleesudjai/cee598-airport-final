function state = set_step2(iStep, state, stepSnapshot)
%SET_STEP2 MATLAB translation of FEMClassLib/FAASR/clsSetStep2.vb.

mask = stepSnapshot.ncur0(:) == iStep;
state.nload = sum(mask);
state.nod = stepSnapshot.nod0(mask);
state.idirn = stepSnapshot.idirn0(mask);
state.ncur = ones(state.nload, 1);
state.fac = stepSnapshot.fac0(mask);

end
