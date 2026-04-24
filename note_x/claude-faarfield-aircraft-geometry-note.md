# Note: FAARFIELD Aircraft Tire / Gear Geometry
Date: 2026-04-17
Audience: Claude / future research sessions

## Main Conclusion
If the goal is FAARFIELD pavement analysis, stress placement, or wheel-load visualization, do **not** rely only on the public FAA Aircraft Characteristics Database.

Use the **FAARFIELD aircraft library XML from PAVEAIR** as the primary source for aircraft tire / gear geometry actually used by FAARFIELD.

## Why
The public FAA Aircraft Characteristics Database is useful for airport planning and design reference data, but the FAARFIELD aircraft library contains the geometry fields needed for pavement-analysis placement, such as:

- `WheelCoordinates`
- `TireTrackX`
- `TireWidth`
- `TireLength`
- `TireArea`
- `Cp` (tire pressure)
- `Tt`
- `B`
- `MgPercent`
- `RunMgPercent`

These fields are present in the installed FAARFIELD `aircraft.xml`.

## Verified Local Paths
- Installed FAARFIELD aircraft library:
  - `C:\Program Files (x86)\FAARFIELD\Defaults\Aircraft\aircraft.xml`
- Source snapshot aircraft library:
  - `C:\Users\chidc\ASU Dropbox\Chidchanok Pleesudjai\PhD COURSES\2026 Spring\CEE 598 Topic Airport Design\03 Final Project\FAARFIELD_2.1.1_SourceCode\FAARFIELD\FF2\Defaults\Aircraft\aircraft.xml`

## Verified Versions
- Installed local library version:
  - `LibraryVersion="1.1.2"`
  - `SoftwareVersion="2.1.0"`
- Source snapshot library version:
  - `LibraryVersion="1.1.1"`
  - `SoftwareVersion="2.1.0"`
- FAA PAVEAIR remote version on 2026-04-17:
  - `1.2.0\2.1.1`

Interpretation:
- The source snapshot is older than the installed local library.
- The installed local library is still older than the current FAA remote library.

## FAA / Web Sources To Check
- FAA Aircraft Characteristics Database:
  - https://www.faa.gov/airports/engineering/aircraft_char_database
- FAARFIELD 2.1.1 page:
  - https://www.airporttech.tc.faa.gov/Products/Airport-Safety-Papers-Publications/Airport-Safety-Detail/ArtMID/3682/ArticleID/2841/FAARFIELD-20
- PAVEAIR DOM service version endpoint:
  - http://faapaveair.faa.gov/DOMService.svc/GetNewAircraftLibVersion
- PAVEAIR DOM service aircraft library endpoint:
  - http://faapaveair.faa.gov/DOMService.svc/DownloadNewAircraftLibrary

## Source-Code Evidence
FAARFIELD is explicitly wired to use the PAVEAIR DOM service for aircraft-library updates.

- Default local `aircraft.xml` path:
  - [AircraftList.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FF2/Models/AircraftList.vb:72>)
- PAVEAIR service URL:
  - [GlobalDOMViewModel.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FF2/ViewModels/GlobalDOMViewModel.vb:15>)
- Aircraft-library download call:
  - [MainWindowViewModel.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FF2/ViewModels/MainWindowViewModel.vb:2382>)
- Update confirmation message:
  - [MainWindowViewModel.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FF2/ViewModels/MainWindowViewModel.vb:2396>)
- Remote-version check:
  - [MainWindowViewModel.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/FAARFIELD_2.1.1_SourceCode/FAARFIELD/FF2/ViewModels/MainWindowViewModel.vb:2470>)

## Practical Guidance For Claude
When a user asks for the "latest" aircraft tire / gear geometry for FAARFIELD:

1. Check the remote PAVEAIR version endpoint first.
2. Compare it against the installed local `aircraft.xml` version.
3. Prefer the PAVEAIR aircraft library over the public FAA Aircraft Characteristics Database for wheel/tire placement data.
4. Use the public FAA Aircraft Characteristics Database only as a secondary cross-check or for airport-design reference fields.

## Practical Guidance For Website / Visualization Work
If the user wants to visualize wheel layouts or stress distribution:

- Use FAARFIELD `aircraft.xml` geometry for:
  - wheel center locations
  - tire-track placement
  - tire dimensions
  - tire pressure
- Do not infer those values only from generic airport-planning tables.

## Example Verified Aircraft
From the installed FAARFIELD library, `B767-300 ER` includes values such as:

- `Cp = 200 psi`
- `TireWidth ≈ 13.89 in`
- `TireLength ≈ 22.23 in`
- wheel coordinates including:
  - `(-160.1, -28)`
  - `(-205.9, 28)`
  - `(160.1, -28)`
  - `(205.9, 28)`

This confirms the XML is not just a list of names. It contains real placement geometry suitable for backend analysis and frontend visualization.
