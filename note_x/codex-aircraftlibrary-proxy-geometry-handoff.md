# AircraftLibrary.vb Proxy Geometry Handoff

Date: 2026-04-18

## What Changed

The missing-geometry fallback is now centralized in [website/faarfield-api/AircraftLibrary.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/AircraftLibrary.vb:165>).

New resolution order:

1. Exact FAARFIELD XML wheel geometry from the combined library.
2. Proxy geometry from the closest real aircraft record in the same library.
3. Gear-template fallback.
4. Last-resort dual-wheel fallback.

Key implementation points:

- `AircraftGeometry` now carries `Source` and `ResolvedIcao` so downstream code can tell exact geometry from approximations.
- `ResolveGeometry(...)` now tries a proxy donor before dropping to hardcoded templates.
- `PopulateGeometryFromRecord(...)` is the shared geometry loader for both exact and proxy records.
- `FindProxyGeometryRecord(...)` scores donor aircraft by ICAO, gear/gear-group compatibility, manufacturer/family similarity, and MTOW closeness.
- `ApplyGearTemplate(...)` now aliases more real gear codes before templating, including `D1`, `D2`, `Q2`, `2S`, `2D/D1`, `2D/2D1`, and `2D/3D2`.

Relevant anchors:

- [AircraftGeometry](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/AircraftLibrary.vb:143>)
- [ResolveGeometry](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/AircraftLibrary.vb:165>)
- [ApplyGearTemplate](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/AircraftLibrary.vb:217>)
- [PopulateGeometryFromRecord](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/AircraftLibrary.vb:318>)
- [FindProxyGeometryRecord](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/AircraftLibrary.vb:367>)
- [GetGearGroup](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/AircraftLibrary.vb:543>)

## What Claude Should Do Next

Keep all aircraft-geometry fallback logic in `AircraftLibrary.vb`. Do not duplicate proxy or template selection inside `Fem3dWrapper.vb`, `FullAnalysisWrapper.vb`, or the frontend.

If Claude extends this further, the next good steps are:

1. Surface `geo.Source` and `geo.ResolvedIcao` in FEM mesh/stress responses so the UI can show `Exact XML`, `Family Proxy`, `Nearby Proxy`, or `Template`.
2. Add a small diagnostic endpoint or unit-style smoke check for `ResolveGeometry(...)` so cases like `A345`, `MD11`, and `B52` can be verified without relying on a running dev server.
3. Expand the aircraft-library mapping pipeline so fewer aircraft need proxy/template fallback in the first place.

## Verification

Build check:

- `C:\Windows\Microsoft.NET\Framework\v4.0.30319\MSBuild.exe website/faarfield-api/FaarfieldApi.vbproj /p:Configuration=Release /p:Platform=x86`
- Result: `0 Error(s)`, existing legacy VB warnings only.

Runtime note:

- A live `localhost:5100` verification was inconclusive because a `FaarfieldApi.exe` process was already running on the machine, so the port may have been serving an older binary.
- A static donor audit on the current combined library shows that `A345` should now be able to use a gear-group-compatible donor such as `B744` instead of dropping straight to the old universal dual-wheel assumption.

## Warning Labels

`FullAnalysisWrapper.vb` now recognizes the new source types:

- [dual fallback / gear template / proxy warnings](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/website/faarfield-api/FullAnalysisWrapper.vb:594>)

Claude should preserve those labels if it refactors response formatting.
