# /prime-data - Data Collection Session Start

Run when the session focus is gathering or validating input data for FAARFIELD analysis.

## Steps

1. **Read global rules:**
   Read `CLAUDE.md` and `.claude/rules/data-collection.md`.

2. **Check last handoff:**
   Read `docs/handoff.md` - what data is complete vs missing.

3. **Check data files:**
   List files in:
   - `central brain/` - downloaded data, research notes
   - Read `central brain/NRCS_Soil_Data.md` - subgrade status
   - Read `central brain/Aircraft_Comparison.md` - traffic matching status
   - Read `central brain/FAA_API_and_Data_Sources.md` - API reference

4. **Check API availability:**
   - FAA ArcGIS: `https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/`
   - NRCS SDA: `https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest`

5. **Report back - 3 bullets:**
   - Data complete: which airports/sections have all inputs?
   - Data missing: which inputs still need collection?
   - Blockers: any API down, auth required, or format issues?
