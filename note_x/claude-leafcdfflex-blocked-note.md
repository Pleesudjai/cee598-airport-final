# Note: Why `LeafCDFFlex` Is Blocked in Phase C
Date: 2026-04-17
Audience: Claude / future engineering sessions

## Main Conclusion
`LeafCDFFlex` is **not** a safe standalone wrapper target.

Even though its public signature looks small in
[modCDF.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/modCDF.vb:128>),
the routine depends on a large amount of FAARFIELD global module state that is normally initialized by the desktop app before analysis begins.

So if a backend wrapper only sets a short list of globals like:
- `NAC`
- `LibIndex()`
- `Thick()`
- `Modulus()`
- `LCode()`
- `Reps()`
- `RepsAnnual()`

that is **not enough** to safely call `LeafCDFFlex`.

## What The Real Desktop Flow Does
The desktop app does not call `LeafCDFFlex` directly from a minimal wrapper.

It first calls:
- [SetCurrentSectData(Job, Section)](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FF2/Models/RunAnalysis.vb:381>)

That setup routine in
[modFedfaaGbl.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/modFedfaaGbl.vb:846>)
does all of this:
- `InitLayers()`
- `InitAcLib()`
- `InitializeJob(job)`
- section and layer setup
- aircraft name / library link setup
- `SetDesignType()`
- `UpdateCurrentSectData()`

Then `UpdateCurrentSectData()` computes key derived aircraft values in
[modFedfaaGbl.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/modFedfaaGbl.vb:1161>):
- `MGpcnt`
- `WT`
- `TW`
- `Contactarea`
- `TirePressureF`
- `Reps`

Only after the structure and aircraft state are prepared does the flexible design loop run LEAF and then call:
- [RunLEAF.ComputeResponse2(...)](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/modStrDesignFlex.vb:160>)
- [LeafCDFFlex(...)](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/modStrDesignFlex.vb:177>)

## Why The Wrapper Hangs
The problem is not that LEAF is missing.
The problem is that `LeafCDFFlex` assumes many hidden globals are already coherent.

Inside `LeafCDFFlex`, FAARFIELD uses:
- `AC(LI)` aircraft library geometry
- `LibIndex`
- `ISect`
- `jobCDFtable`
- `jobCDFacrftMaxtable`
- `jobCtoPtable`
- `WT`
- `TW`
- `MGpcnt`
- `Reps`
- `gPtoC1`
- `gFirstIter`
- `gTandemFnew`
- design / failure model flags

Evidence:
- coverage and CDF output arrays are used in [modCDF.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/modCDF.vb:519>)
- flexible coverage path starts in [CoverageToPassFlexible](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/modCDF.vb:1346>)
- general-aircraft path starts in [CoverageToPassFlexGeneral13B](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/modCDF.vb:1725>)

Those coverage routines use wheel and tire data derived from the section setup, not just the direct function arguments.

## What "Blocked" Means Here
`Phase C: Full CDF via LeafCDFFlex` is blocked because the backend wrapper is bypassing too much of the real FAARFIELD initialization pipeline.

This is consistent with the handoff note:
- [docs/handoff.md](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/docs/handoff.md:27>) says `LeafCDFFlex()` hangs
- [docs/handoff.md](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/docs/handoff.md:48>) says manual globals without `SetCurrentSectData()` lead to the hang

## Important Interpretation Rule
Do **not** describe this as:
- LEAF being unavailable
- FAARFIELD lacking a CDF engine
- `LeafCDFFlex` being broken in general

Describe it as:
- a **global-state initialization problem**
- caused by calling a legacy FAARFIELD routine outside its normal desktop setup sequence

## Best Short Answer
If asked why Phase C is blocked, say:

`LeafCDFFlex` is not a self-contained API. It depends on section, aircraft, and coverage globals that the FF2 desktop flow initializes through `SetCurrentSectData()` and `UpdateCurrentSectData()`. The wrapper currently sets only part of that state, so the CDF routine enters an internal path that hangs instead of returning cleanly.

## Practical Routing Guidance
- Use `LEAFClassLib` directly for point response, depth profile, and stress-grid endpoints.
- Do not assume `LeafCDFFlex` can be wrapped safely from a few arrays.
- If true FAARFIELD CDF is needed, either:
  - reproduce the full `Job` / `Section` initialization path, or
  - implement the CDF logic outside the desktop global-state machine using validated LEAF outputs plus FAARFIELD failure models.

## Spec Warning
The original Phase C plan in
[full-faarfield-engine.md](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/specs/full-faarfield-engine.md:73>)
is too optimistic where it says the wrapper can set only a small list of globals and then call the analysis functions directly.

Treat that section as a concept draft, not verified integration guidance.
