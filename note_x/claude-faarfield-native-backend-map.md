# Note: FAARFIELD Native Backend and Solver Routing Map
Date: 2026-04-17
Audience: Claude / future engineering sessions

## Main Conclusion
FAARFIELD’s real engineering engines are VB.NET / .NET components, not Python scripts and not browser-side JavaScript engines.

For website or API work:
- use a **Windows .NET backend**
- call the FAARFIELD libraries there
- return JSON to the frontend for plots and stress visualization

Do **not** present the browser as the place where the native FAARFIELD stress engine runs.

## Core Solver Stack

### `LEAFClassLib`
- role: layered-elastic solver
- main entry:
  - [clsLEAF.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/LEAFClassLib/clsLEAF.vb:213>)
- response fields include:
  - `DeflZ`
  - `StrainX`
  - `StressX`
  - `StressY`
  - `StressZ`
  - [clsLEAF.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/LEAFClassLib/clsLEAF.vb:68>)

Use `LEAFClassLib` when the user wants:
- flexible pavement responses
- layered-elastic point responses
- depth profiles
- contour / heatmap style stress or strain plots
- fast backend results without rigid FEM complexity

### `AMClassLib`
- role: higher-level rigid / composite response wrapper
- main entry:
  - [clsAM.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/clsAM.vb:20>)
- outputs include:
  - `Response`
  - `VertStress`
  - `VertCoord`
  - [clsAM.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/clsAM.vb:25>)
- vertical stress arrays are filled here:
  - [clsAM.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/clsAM.vb:552>)

Use `AMClassLib` when the user wants:
- rigid pavement response
- rigid overlays / composite response
- slab edge / slab interior stress outputs
- higher-level rigid workflow orchestration

### `FAAMeshClassLib`
- role: 3D mesh generator for the rigid FEM path
- main class:
  - [clsMesh.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FAAMeshClassLib/clsMesh.vb:9>)
- main generation entry:
  - [clsMesh.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FAAMeshClassLib/clsMesh.vb:181>)
- it builds:
  - nodes
  - brick elements
  - spring elements
  - sliding elements
  - nodal loads
  - [clsMesh.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FAAMeshClassLib/clsMesh.vb:103>)
  - [clsMesh.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FAAMeshClassLib/clsMesh.vb:115>)
  - [clsMesh.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FAAMeshClassLib/clsMesh.vb:125>)
  - [clsMesh.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FAAMeshClassLib/clsMesh.vb:140>)

Important:
- `FAAMeshClassLib` is **not** the stress-equation solver by itself
- it prepares the mesh/model data used by the rigid FEM path

### `FEMClassLib`
- role: managed 3D FEM solver
- solve class:
  - [clsSolveMain.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FEMClassLib/Solve/clsSolveMain.vb:5>)
- FAASR3D entry:
  - [clsFAASR3D.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FEMClassLib/FAASR/clsFAASR3D.vb:32>)
- solve call:
  - [clsFAASR3D.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FEMClassLib/FAASR/clsFAASR3D.vb:81>)

Use `FEMClassLib` when the user wants:
- managed rigid FEM execution
- rigid/composite backend work without relying on a separate external DLL

## NIKE3D Status
FAARFIELD still contains a direct external hook to `Nike3d.dll`:
- [modWorld.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/modWorld.vb:48>)

But:
- `Nike3d.dll` is not present in the source tree
- `Nike3d.dll` is not present in the installed `C:\Program Files (x86)\FAARFIELD` folder

So do **not** tell the user that the repo includes the actual `Nike3d.dll` binary or its source package.

## Managed FEM vs External NIKE3D Routing
The most important routing detail is in `AMClassLib.clsAM`.

- default flag:
  - [clsAM.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/clsAM.vb:1144>)
- direct NIKE3D branch:
  - [clsAM.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/clsAM.vb:1147>)
- managed FEM branch:
  - [clsAM.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/clsAM.vb:1181>)

Interpretation:
- the code sets `NewNike3D = 2`
- that means the default path is the managed FEM route via `FEMClassLib`
- the direct external `Nike3d.dll` call is wired in the code but not the default current path

## Project Wiring
`FF2` references the native engineering projects used by the application:
- [FF2.vbproj](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FF2/FF2.vbproj:503>)
- [FF2.vbproj](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FF2/FF2.vbproj:507>)
- [FF2.vbproj](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FF2/FF2.vbproj:519>)

`AMClassLib` itself depends on `FAAMeshClassLib`, `FEMClassLib`, and `LEAFClassLib`:
- [AMClassLib.vbproj](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/AMClassLib.vbproj:103>)
- [AMClassLib.vbproj](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/AMClassLib.vbproj:152>)
- [AMClassLib.vbproj](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/AMClassLib.vbproj:156>)

`FaarFieldAnalysis` references `AMClassLib` and `LEAFClassLib`:
- [FaarFieldAnalysis.vbproj](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/FaarFieldAnalysis.vbproj:161>)
- [FaarFieldAnalysis.vbproj](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FaarFieldAnalysis/FaarFieldAnalysis.vbproj:169>)

## Installed Runtime Reality
Installed FAARFIELD includes:
- `AMClassLib.dll`
- `FAAMeshClassLib.dll`
- `FEMClassLib.dll`
- `LEAFClassLib.dll`

Folder:
- [FAARFIELD install](</C:/Program Files (x86)/FAARFIELD>)

Installed FAARFIELD does **not** include:
- `Nike3d.dll`

## Website / API Guidance
For website work, the correct architecture is:

1. Frontend sends:
   - pavement layers
   - aircraft/gear input
   - geometry
   - solver choice
2. Windows backend runs FAARFIELD native code
3. Backend returns JSON:
   - coordinates
   - stress values
   - strain values
   - deflections
   - layer/depth metadata
4. Frontend renders:
   - contours
   - heatmaps
   - slices
   - depth plots

Do not describe this as:
- direct browser execution
- a Python full-analysis engine
- a pure JavaScript native solver

## Tool-Choice Guidance For Claude
If the user wants:

- fast flexible/layered response at points or depth:
  - choose `LEAFClassLib`
- rigid/composite engineering response:
  - choose `AMClassLib`
- rigid mesh generation details:
  - include `FAAMeshClassLib`
- managed rigid FEM execution:
  - include `FEMClassLib`
- direct `Nike3d.dll` integration:
  - say the hook exists, but the DLL is missing locally

## Do Not Overstate
- Do not say FAARFIELD includes a Python full-analysis script.
- Do not say `FAAMeshClassLib` is itself the full stress solver.
- Do not say `Nike3d.dll` is included in the repo or installed runtime.
- Do not say rigid native web backend is impossible.
- The accurate statement is:
  - direct external `Nike3d.dll` use is blocked locally because the DLL is missing
  - managed rigid FEM through `AMClassLib + FAAMeshClassLib + FEMClassLib` is still a real path

## Related Project Specs
- [website-faarfield-native-backend.md](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/specs/website-faarfield-native-backend.md:1>)
- [native-faarfield-backend-implementation-v2.md](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/specs/native-faarfield-backend-implementation-v2.md:1>)
