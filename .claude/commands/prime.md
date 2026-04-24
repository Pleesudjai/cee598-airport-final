# /prime - Session Initialization

Run this at the START of every new Claude Code session.

## Steps

1. **Read global rules:**
   Read `CLAUDE.md` - has airports, sections, analysis type, subgrade data, coding standards.

2. **Check decisions:**
   Read `docs/decisions.md` - running log of what was built and why.

3. **Check last handoff:**
   Read `docs/handoff.md` - last session's completed work, broken items, and next steps.

4. **Scan research notes:**
   List files in:
   - `central brain/` - API data, soil data, aircraft matching, CDF results
   - `specs/` - feature specs awaiting execution
   - `results/` - per-airport CDF output files

5. **Scan current source:**
   List files in:
   - `scripts/` - Python analysis scripts
   - `c:/temp/aeropave/src/` - React website components
   - `c:/temp/aeropave/faarfield-api/` - .NET backend (if exists)

6. **Report back - 5 bullets:**
   - Project: What stage are we at?
   - What is fully working (end-to-end tested)?
   - What is built but untested or broken?
   - What still needs to be built?
   - Any open blockers (missing DLL, API issue, data gap)?
