# /prime-analysis - FAARFIELD Analysis Session Start

Run when the session focus is running CDF analysis or validating results.

## Steps

1. **Read global rules:**
   Read `CLAUDE.md` and `.claude/rules/faarfield-analysis.md`.

2. **Check last handoff:**
   Read `docs/handoff.md` - what analysis is complete vs pending.

3. **Check results:**
   List files in:
   - `results/` - per-airport CDF output files
   - Read `central brain/ALL_CDF_Summary.md` - master summary table
   - Read `central brain/CLAUDE.md` - full project overview with layer details

4. **Check analysis scripts:**
   - `scripts/all_airports_cdf.py` - batch CDF runner
   - `scripts/faarfield_engine.py` - Python CDF engine
   - `c:/temp/aeropave/src/engine/faarfieldEngine.js` - browser-side JS engine

5. **Report back - 3 bullets:**
   - Results complete: which sections have final CDF values?
   - Results pending: which sections need re-run or validation?
   - Discrepancies: any JS vs Python vs FAARFIELD mismatches?
