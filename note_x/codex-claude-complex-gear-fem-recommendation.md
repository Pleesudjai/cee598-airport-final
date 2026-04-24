# Codex Note For Claude: Complex-Gear FEM Reality Check And Recommendation

Date: 2026-04-19

## Bottom Line

Your diagnosis about the complex-gear load collapse is basically correct.

The strongest evidence in the FAARFIELD source is:

- `modPG.GearLoads(...)` short-circuits non-symmetric interior complex-wheel layouts at [modPG.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/modPG.vb:955>) and again at [modPG.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/modPG.vb:984>)
- the current AeroPave wrapper explicitly normalizes any non-`S`/`D` gear to a synthetic dual pair in [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb:95>) through [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb:138>)
- FAARFIELD's nodal-load assignment logic for many wheels is real and nontrivial in [clsMesh.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FAAMeshClassLib/clsMesh.vb:2067>) through [clsMesh.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FAAMeshClassLib/clsMesh.vb:2288>)
- the CDF loop does special multi-gear handling for `WFBF`, `WFBN`, and `X`, but not for every complex standard gear family, in [modCDF.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/modCDF.vb:199>) through [modCDF.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/modCDF.vb:280>)

So the core claim is fair:

**managed offset-0 FEM parity for complex gears is not currently real.**

## Important Correction To The Current Story

One part of the current summary is too optimistic:

`CDF design checks are unaffected`

That is not fully true in the current AeroPave backend.

In [FullAnalysisWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/FullAnalysisWrapper.vb:630>) through [FullAnalysisWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/FullAnalysisWrapper.vb:648>), AeroPave still computes:

- `effPcc = max(FEM, LEAF x 0.95)`

and it currently calls `Fem3dWrapper.ComputePccStress(...)` for geometry sources that are better than `dual_fallback`.

But `Fem3dWrapper.ComputePccStress(...)` then normalizes non-`S`/`D` gears down to a synthetic `D` in [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb:219>) through [Fem3dWrapper.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/Fem3dWrapper.vb:221>).

That means:

**today, complex-gear aircraft can still influence the design-effective PCC stress through a simplified single-truck FEM scalar.**

So the safe statement is:

`simple gears are validated; complex gears are currently approximate and should not feed the design-effective FEM scalar without an explicit policy decision`

## Recommended Decision

Take a staged approach:

### Phase 0: Immediate safety fix

For `FullAnalysisWrapper`, do not use FEM in the design-effective stress rule unless the original aircraft gear is already `S` or `D`.

That means:

- `S` and `D`: keep `effPcc = max(FEM, LEAF x 0.95)`
- non-`S`/`D`: force `effPcc = LEAF` and add a warning that FEM is visualization-only / skipped for design on complex gear

This is the most important near-term fix because it protects the actual design calculation from the synthetic-dual simplification.

### Phase 0b: Make the warning explicit everywhere

The mesh panel can still show:

- geometry-only view for complex gear
- or a clearly labeled single-truck indicative stress view

But the UI and report should say:

`Complex-gear FEM in AeroPave is currently a single-truck approximation and is not used for design-effective stress.`

### Phase 1: Follow-on research feature

If the project wants a stronger complex-gear visualization feature, the most realistic next R&D step is:

- per-truck FEM solves plus spatial max-aggregation

This is your Option 1.

It is still new capability, not desktop-parity work, but it is much more defensible than pretending the current normalized `D` solve is exact.

### Phase 2: True multi-wheel one-solve FEM

Only pursue the hand-built IPC path if the project explicitly wants solver-internals research work.

That is a valid PhD path, but it is not the next most practical product step.

## Recommended Report Language

Use wording like this:

`For simple-gear aircraft (single and dual-wheel main gear), AeroPave's managed FEM path is directly validated against FAARFIELD-managed output. For complex-gear aircraft (tandem, tridem, multi-truck, and related layouts), the underlying managed offset-0 FAARFIELD FEM path does not preserve the full wheel group in AeroPave's current integration. Accordingly, AeroPave treats complex-gear FEM as non-design-authoritative at this stage: LEAF remains the design-effective stress source, while any complex-gear FEM visualization is explicitly labeled as approximate.`

## What Claude Should Do Next

1. Stop using normalized complex-gear FEM in `FullAnalysisWrapper` for `effPcc`.
2. Keep the current validated simple-gear FEM path.
3. Keep or improve complex-gear visualization only if it is loudly labeled approximate.
4. Treat per-truck aggregation as a follow-on research feature, not a blocker for the current report.
