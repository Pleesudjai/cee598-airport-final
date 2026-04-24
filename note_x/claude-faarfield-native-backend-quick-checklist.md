# Note: FAARFIELD Native Backend Quick Checklist
Date: 2026-04-17
Audience: Claude / quick-response reference

## Say This First
If a user asks how to use FAARFIELD for native calculations or website stress analysis:

- FAARFIELD’s real engineering engines are VB.NET / .NET libraries, not Python scripts.
- Use a **Windows .NET backend**, not direct browser execution.
- Choose the solver based on the engineering goal.

## Solver Choice
- `LEAFClassLib`
  - use for layered-elastic / flexible pavement responses
  - fast point/depth response
  - good for contours and heatmaps
- `AMClassLib`
  - use for rigid/composite higher-level response workflow
  - returns `Response`, `VertStress`, and `VertCoord`
- `FAAMeshClassLib`
  - use when rigid FEM needs mesh / nodes / elements / loads
  - not the main stress solver by itself
- `FEMClassLib`
  - use for managed rigid 3D FEM execution

## NIKE3D Rule
- `Nike3d.dll` is referenced in code:
  - [modWorld.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/modWorld.vb:48>)
- but it is missing from both source and local install
- do not say the repo contains the DLL

## Routing Rule
- `clsAM` contains both paths
- default current flag is `NewNike3D = 2`
- that means default routing goes to managed FEM, not direct external `Nike3d.dll`
- evidence:
  - [clsAM.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/clsAM.vb:1144>)
  - [clsAM.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/clsAM.vb:1181>)

## Backend Rule
For website/API work:
- frontend sends model inputs
- backend runs FAARFIELD .NET code
- backend returns JSON
- frontend plots contours / slices / depth curves

## Do Not Say
- do not say FAARFIELD has a Python full-analysis engine
- do not say `FAAMeshClassLib` is the full solver
- do not say rigid native backend is impossible

## Better Wording
- direct `Nike3d.dll` integration is blocked locally because the DLL is missing
- managed rigid FEM through `AMClassLib + FAAMeshClassLib + FEMClassLib` is still a real path

## Best Evidence Files
- `LEAF` entry:
  - [clsLEAF.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/LEAFClassLib/clsLEAF.vb:213>)
- `AM` entry:
  - [clsAM.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/AMClassLib/clsAM.vb:20>)
- `FAAMesh` entry:
  - [clsMesh.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FAAMeshClassLib/clsMesh.vb:181>)
- `FEM` entry:
  - [clsFAASR3D.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FEMClassLib/FAASR/clsFAASR3D.vb:32>)
