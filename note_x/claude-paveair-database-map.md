# Note: PaveAir Airport Pavement Management Database Map
Date: 2026-04-17
Audience: Claude / future research sessions

## Main Conclusion
In the PaveAir source code, the airport pavement management system database is a SQL Server database named `PaveAirUnified`.

This source tree contains:
- the database schema and SQL scripts
- the VB.NET / ASP.NET code that queries it
- report datasets that show how current and historic pavement information is assembled

This source tree does **not** appear to include a live populated database file such as `.mdf` or `.bak`.

## The Main Database
- Database name:
  - `PaveAirUnified`
- Main schema creation script:
  - [CreatePaveAirUnifiedDB.sql](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_002/SQL Scripts for Unified/CreatePaveAirUnifiedDB.sql:115>)

## How The App Connects
The web/service layer uses a connection string named `PaveAirUnified`.

- Service host:
  - [DOMService.svc](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_002/DOMService.svc:1>)
- Service code:
  - [DOMService.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/App_Code/DOMService.vb:30>)

Important note:
- I did not find a checked-in `Web.config` with the actual deployment connection string.
- That means the deployed system likely supplied the real SQL Server connection outside this source snapshot.

## Database Selection Model
PaveAir’s UI talks about a “Current Database,” but in code this is a logical airport database entry stored inside the central SQL database.

Help pages:
- [currentdatabase.htm](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/Help/Documents/currentdatabase.htm:10>)
- [selectingadatabase.htm](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/Help/Documents/selectingadatabase.htm:11>)
- [typesofdatabases.htm](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/Help/Documents/typesofdatabases.htm:10>)

What that means technically:
- `Databases` stores the list of logical airport databases visible in the UI.
- Each record gets a `user_db_id`.
- `Network.user_db_id` links pavement records to one selected logical database.

Evidence:
- `Databases` table: [CreatePaveAirUnifiedDB.sql](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_002/SQL Scripts for Unified/CreatePaveAirUnifiedDB.sql:115>)
- `Network` table: [CreatePaveAirUnifiedDB.sql](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_002/SQL Scripts for Unified/CreatePaveAirUnifiedDB.sql:132>)
- foreign key from `Network.user_db_id` to `Databases.user_db_id`: [CreatePaveAirUnifiedDB.sql](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_002/SQL Scripts for Unified/CreatePaveAirUnifiedDB.sql:620>)

## Core Table Map

### Current logical database registry
- `Databases`
  - purpose: list of airport databases shown in the UI
  - key fields: `DBOwner`, `DBName`, `DBDesc`, `IsPublic`, `CreateDate`, `user_db_id`
  - source: [CreatePaveAirUnifiedDB.sql](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_002/SQL Scripts for Unified/CreatePaveAirUnifiedDB.sql:115>)

### Current pavement hierarchy
- `Network`
  - purpose: top-level pavement network, linked to one logical database
  - current or history: current
  - source: [CreatePaveAirUnifiedDB.sql](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_002/SQL Scripts for Unified/CreatePaveAirUnifiedDB.sql:132>)
- `Branch`
  - purpose: branch within a network
  - current or history: current
  - source: [CreatePaveAirUnifiedDB.sql](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_002/SQL Scripts for Unified/CreatePaveAirUnifiedDB.sql:198>)
- `Section`
  - purpose: section-level pavement inventory
  - key fields include: `ConstructionDate`, `Surface`, `Length`, `Width`, `AreaUnit`, `LinearUnit`
  - current or history: current
  - source: [CreatePaveAirUnifiedDB.sql](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_002/SQL Scripts for Unified/CreatePaveAirUnifiedDB.sql:248>)

### Historic pavement hierarchy
- `NetworkHistory`
  - purpose: historic changes to network-level records
  - current or history: history
  - source: [CreatePaveAirUnifiedDB.sql](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_002/SQL Scripts for Unified/CreatePaveAirUnifiedDB.sql:182>)
- `BranchHistory`
  - purpose: historic changes to branch-level records
  - current or history: history
  - source: [CreatePaveAirUnifiedDB.sql](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_002/SQL Scripts for Unified/CreatePaveAirUnifiedDB.sql:228>)
- `SectionHistory`
  - purpose: historic changes to section inventory and geometry fields
  - current or history: history
  - source: [CreatePaveAirUnifiedDB.sql](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_002/SQL Scripts for Unified/CreatePaveAirUnifiedDB.sql:293>)

### Maintenance / construction history
- `WorkTracking`
  - purpose: maintenance, rehab, construction, work history
  - key fields: `DateTime`, `Work`, `Type`, `Quantity`, `Thickness`, `Cost`, `MaterialType`, `Material`, `WorkCompleted`, `MajorMR`
  - current or history: history / work log
  - source: [CreatePaveAirUnifiedDB.sql](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_002/SQL Scripts for Unified/CreatePaveAirUnifiedDB.sql:328>)

### Condition / inspection history
- `Inspection`
  - purpose: pavement inspections and condition survey dates
  - key fields: `DateTime`, `SurfaceCategory`, `UseCategory`, `Details`, `ConstructionInspection`, `DistressInspection`, `OtherCondInspection`, `InspectedArea`
  - current or history: history / inspections
  - source: [CreatePaveAirUnifiedDB.sql](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_002/SQL Scripts for Unified/CreatePaveAirUnifiedDB.sql:361>)

## Where “Current” Information Comes From
The reports do not use a separate “current” table. They derive current pavement condition by selecting the latest inspection for each section.

Evidence:
- `SectionConditionTableAdapter`: [dsReports.xsd](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/App_Code/dsReports.xsd:171>)
- latest inspection date per section:
  - [dsReports.xsd](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/App_Code/dsReports.xsd:195>)
- mapped `LastInspectionDate` field:
  - [dsReports.xsd](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/App_Code/dsReports.xsd:240>)

Interpretation:
- “Current condition” = latest `Inspection` + latest `Condition` value tied to that inspection.

## Where Historic Information Comes From
Historic data is spread across different tables depending on the type of history.

- inventory/history changes:
  - `NetworkHistory`
  - `BranchHistory`
  - `SectionHistory`
- work / maintenance history:
  - `WorkTracking`
- inspection / condition history:
  - `Inspection`

## Where Work / Maintenance Reports Come From
Work-history reports are built from `WorkTracking`.

Evidence:
- `WorkHistoryTableAdapter`: [dsReports.xsd](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/App_Code/dsReports.xsd:1357>)
- work date field:
  - [dsReports.xsd](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/App_Code/dsReports.xsd:1382>)
- join from section to work history:
  - [dsReports.xsd](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/App_Code/dsReports.xsd:1394>)

Summary work-history reports:
- [dsReportsSummary.xsd](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/App_Code/dsReportsSummary.xsd:462>)
- grouped by work type through `WorkTracking.Work`:
  - [dsReportsSummary.xsd](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/App_Code/dsReportsSummary.xsd:469>)

## How Database Selection Works In Code
The DOM service returns database names from the `Databases` table.

Evidence:
- connection string usage:
  - [DOMService.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/App_Code/DOMService.vb:30>)
- owned databases:
  - [DOMService.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/App_Code/DOMService.vb:33>)
- shared / permission-based databases:
  - [DOMService.vb](</C:/Users/chidc/ASU Dropbox/Chidchanok Pleesudjai/PhD COURSES/2026 Spring/CEE 598 Topic Airport Design/03 Final Project/PaveAir/PaveAir_3.7.4_SourceCode_001/App_Code/DOMService.vb:101>)

Interpretation:
- A user chooses a logical “database” by `DBName`.
- That maps to `user_db_id`.
- That `user_db_id` controls which pavement records are visible.

## Important Limitation
The source code shows the structure and the queries, but not the deployed live data itself.

I did not find:
- `.mdf`
- `.ldf`
- `.bak`
- `.dacpac`

So for reverse engineering:
- use `CreatePaveAirUnifiedDB.sql` to understand schema
- use `DOMService.vb` and `dsReports*.xsd` to understand data access
- do not assume the repo contains the production database contents

## Practical Guidance For Claude
When asked where PaveAir stores airport pavement management data:

1. Say the central SQL database is `PaveAirUnified`.
2. Explain that the UI “database” is a logical record in the `Databases` table.
3. Explain that actual pavement records are stored through:
   - `Network`
   - `Branch`
   - `Section`
   - `Inspection`
   - `WorkTracking`
4. Explain that current condition is derived from the latest inspection, not a separate current-state table.
5. Mention that history is stored in `NetworkHistory`, `BranchHistory`, `SectionHistory`, `Inspection`, and `WorkTracking`.
