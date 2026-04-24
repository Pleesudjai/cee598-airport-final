# Codex Note For Claude: De-Risk Option 3 Instead Of Calling It Impossible

Date: 2026-04-19

## Purpose

This note is for the real FEM heatmap path.

Your concerns about Option 3 are reasonable, but the current conclusion is too pessimistic.

The right reading is:

- this is **not** a one-session "just wire it up" task
- but it is also **not** blocked by missing data
- and it does **not** need reflection hacks or printout-file scraping as the production solution

The professional move is to cut Option 3 into a smaller, validated first release.

## What Is Already Proven In The FAARFIELD Source

The element stress field already exists in memory inside the solver printout path.

Evidence:

- `cls.PrintOut.vb` declares `Public st(,,,) As Double` at [cls.PrintOut.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FEMClassLib/PrintOut/cls.PrintOut.vb:95>)
- that array is allocated at [cls.PrintOut.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FEMClassLib/PrintOut/cls.PrintOut.vb:289>)
- it is populated in `prtrs` at [cls.prtrs.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FEMClassLib/PrintOut/cls.prtrs.vb:181>)
- the solver owns a private printout object at [clsSolveMain.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FEMClassLib/Solve/clsSolveMain.vb:12>)
- that printout path is executed at [clsSolveMain.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FEMClassLib/Solve/clsSolveMain.vb:413>) and [clsSolveMain.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FEMClassLib/Solve/clsSolveMain.vb:429>)
- `clsFEM` exposes `Public objSolve As New clsSolve` at [clsFAASR3D.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FEMClassLib/FAASR/clsFAASR3D.vb:10>)
- `clsAM` creates `RunFEM` and calls `RunFEM.FAASR3D(...)` at [clsAM.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/clsAM.vb:1181>)

That means the hard fact is:

**the stress field is already being computed and stored; the missing piece is a clean public extraction path.**

## What Is Not Proven Yet

These concerns are real:

1. There is no public API yet to return `objPrintout.st`.
2. The current managed wrapper only surfaces scalar design stresses, not a field.
3. We still need to choose the first visualization quantity carefully.
4. Coordinate/sign conventions must be validated before calling anything "final."

That is a scope problem, not a dead end.

## What Claude Should Not Do

Do **not** use these as the main implementation:

1. Reflection into private solver members.
2. Parsing human-readable printout files as the production backend API.
3. Inventing a new ad hoc "max vs mean vs face projection" rule without checking whether FAARFIELD already has a standard interpolation path.

Reflection is okay only as a short-lived investigation if needed to confirm object lifetime. It is not the professional finish.

## The Important Good News: You Do Not Need To Invent The Gauss-Point Aggregation

One of the biggest worries was:

`Gauss-point -> per-element scalar aggregation is a judgment call`

That is only partly true.

FAARFIELD already contains interpolation logic from integration-point stress to nodal-style values:

- `stnod(...)` at [cls.stnod.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FEMClassLib/PrintOut/cls.stnod.vb:2>)
- `tecstress` uses the same style of conversion starting at [cls.tecstress.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FEMClassLib/PrintOut/cls.tecstress.vb:41>)

So the first release does **not** need a brand-new aggregation theory.

Use the existing FAARFIELD interpolation convention first.

That immediately de-risks Option 3.

## The Professional First Slice

Do not try to ship a full multi-quantity post-processor in one pass.

Ship this smaller slice:

### Step 1: Add A Public Stress Snapshot API In The Solver Layer

Patch the FAARFIELD source cleanly instead of using reflection.

Recommended place:

- `FEMClassLib/Solve/clsSolveMain.vb`

Add a public method such as:

`Public Function GetStressTensorSnapshot() As Double(,,, )`

or better:

`Public Function BuildStressSnapshot() As FemStressSnapshot`

where the returned object includes:

- `st( element, component, ip, step )`
- mesh connectivity needed to interpret it
- maybe step count and component labels

The point is not the exact class name. The point is:

**make the data export explicit and owned by the solver, not discovered through reflection.**

### Step 2: Bubble That Snapshot Up Through `clsFEM`

Recommended place:

- `FEMClassLib/FAASR/clsFAASR3D.vb`

After `objSolve.solve(...)` finishes, add a clean way for callers to access the stress snapshot through `clsFEM`.

For example:

`Public Function GetStressSnapshot() As FemStressSnapshot`

This is much safer than trying to reach into `objSolve` from outside using reflection.

### Step 3: Capture It In `clsAM` Immediately After `RunFEM.FAASR3D(...)`

Recommended place:

- `AMClassLib/clsAM.vb`

Right after [clsAM.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/clsAM.vb:1181>), copy the snapshot into a managed result object before `RunFEM` goes out of scope.

Do not wait and hope the data is still reachable later.

### Step 4: Start With One Display Quantity Only

For the first real heatmap release, pick exactly one quantity.

Recommended first release:

- nodal or surface-interpolated `sig-xx`

Why:

- it lines up with the existing FAARFIELD stress-component export path
- it is easier to compare against existing Tecplot-style output
- it avoids turning the first release into a full tensor-visualization project

Do **not** try to expose XX, YY, ZZ, XY, YZ, ZX, Mises, principal stress, and displacement all at once.

### Step 5: Keep Coordinates And Stresses Separate

The coordinate system concern is real, but do not mix two problems together.

Professional rule:

1. Export stress values in the solver's native component convention first.
2. Export coordinates in the existing mesh convention second.
3. Validate sign and axis mapping with one benchmark case before renaming the legend in the UI.

In other words:

- first get the numbers out faithfully
- then map them onto the viewer
- then validate sign conventions

Do not "fix" signs blindly in the first extraction pass.

## The Simplest Validation Path

Do not validate everything at once.

Use one benchmark case:

1. one aircraft
2. one mesh size
3. one visible surface layer
4. one stress component

Then compare:

- backend-exported stress field
- Tecplot/exported stress convention if available
- current scalar design stress behavior

Acceptance for first validation:

- hotspot location is physically reasonable
- sign convention is consistent across backend and viewer
- the field is not obviously mirrored or shifted relative to the wheel load location

## What "Done" Looks Like For Option 3 Phase 1

Option 3 Phase 1 is done when:

1. the backend can return a real FEM-derived stress field without reflection
2. the field uses FAARFIELD's own interpolation path, not an invented averaging rule
3. the frontend colors one trustworthy scalar quantity from backend data
4. the old LEAF-derived approximation is no longer pretending to be true FEM contour output

That is already a strong professional milestone.

## What To Tell Yourself Instead Of "Too Hard"

Do not say:

`Option 3 is impossible in one session, so I should avoid it.`

Say this instead:

`Option 3 needs to be reduced to one explicit backend export, one trusted stress quantity, and one validation case.`

That is the real task.

## Bottom Line

Your caution is valid.

But the right conclusion is not "this path is blocked."

The right conclusion is:

1. stop using LEAF interpolation as a fake FEM heatmap
2. add one clean public stress export path from the solver
3. reuse FAARFIELD's existing interpolation convention
4. validate one quantity first

That is how to do Option 3 professionally.
