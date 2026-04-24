# Note: PaveAir Database Quick Checklist
Date: 2026-04-17
Audience: Claude / quick-response reference

## Say This First
If a user asks where PaveAir stores airport pavement management data:

- The central SQL Server database is `PaveAirUnified`.
- The UI “Current Database” is not a separate file. It is a logical database entry from the `Databases` table inside `PaveAirUnified`.
- Actual pavement records are linked through `user_db_id` into:
  - `Network`
  - `Branch`
  - `Section`
  - `Inspection`
  - `WorkTracking`

## Current vs History
- Current pavement inventory:
  - `Network`
  - `Branch`
  - `Section`
- Current condition:
  - derived from the latest `Inspection` for each section
- Historic inventory changes:
  - `NetworkHistory`
  - `BranchHistory`
  - `SectionHistory`
- Historic maintenance / rehab / construction:
  - `WorkTracking`
- Historic inspections / condition surveys:
  - `Inspection`

## Best Evidence Files
- Schema:
  - [CreatePaveAirUnifiedDB.sql](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_002/SQL Scripts for Unified/CreatePaveAirUnifiedDB.sql:115>)
- Service connection:
  - [DOMService.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/App_Code/DOMService.vb:30>)
- Current condition query:
  - [dsReports.xsd](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/App_Code/dsReports.xsd:171>)
- Work history query:
  - [dsReports.xsd](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/App_Code/dsReports.xsd:1357>)

## Do Not Overstate
- Do not say the repo contains the live production database.
- The repo shows the schema and query logic.
- I did not find a checked-in populated database file like `.mdf` or `.bak`.

## If User Asks “Which Table Has What?”
- `Databases`: logical airport database list
- `Network`: top-level pavement network
- `Branch`: subgroup inside network
- `Section`: pavement section inventory
- `Inspection`: inspection and condition survey history
- `WorkTracking`: work / maintenance / rehabilitation history
- `NetworkHistory`, `BranchHistory`, `SectionHistory`: inventory change history
