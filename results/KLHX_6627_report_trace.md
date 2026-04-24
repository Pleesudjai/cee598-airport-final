# KLHX 6627 - Current Report Trace

This note traces the **current Project Report value** for `KLHX / 6627` from the repo's backend/frontend report data.

## What the current report is using

- Frontend Project Report imports `website/src/data/cdf_results.json` directly.
- Backend batch report output is `results/cdf_results.json`.
- As of this trace, those two files **match exactly**.

Relevant code:

- Frontend import: `website/src/App.jsx`
- History rerun script writes report JSON: `scripts/all_airports_cdf_with_sci_history.py`

## Current report value for KLHX 6627

From `results/cdf_results.json`:

- `cdf_max = 0.0038152502950731526`
- `controlling = PCC Fatigue`
- `sci = 40.0`
- `pre_overlay_cdfu = 26.93291332530369`

This is **not** the same setup as the older `KLHX_6627_desktop_crosscheck.md` note, which discussed a much smaller value under a different run assumption.

## Why this differs from the older 6.7e-10 note

The older cross-check note used:

- `SCI = 80`
- an earlier native-backend comparison context

The current Project Report uses the **history-informed SCI rerun**, where:

- `SCI = 40.0`
- `pre_overlay_cdfu = 26.93`

So the current report and the old note are not apples-to-apples.

## Top aircraft in the current report

Current `top_aircraft` entries in `results/cdf_results.json`:

1. `CRJ9` = `0.0028920128105164667`
2. `C130` = `0.0009232263990024138`
3. `CL30` = `2.2640906074066116e-09`
4. `SW4` = `1.8936347595547753e-09`
5. `F2TH` = `1.1976425480557996e-09`

Top-5 sum:

- `0.0038152445648867955`

Section total:

- `0.0038152502950731526`

So for the **current report**, the top 5 aircraft account for essentially all of the section CDF.

## Code changes now in place

The rebuilt backend/source now exposes trace fields needed for desktop-style reconciliation:

- `controlOffsetIn`
- `cdfContribution`
- `cdfAcControl`, `cdfSubControl`, `cdfPccControl`
- `cdfAcMax`, `cdfSubMax`, `cdfPccMax`

Relevant source:

- `website/faarfield-api/FullAnalysisWrapper.vb`
- `website/faarfield-api/Dto/FullAnalysisResponse.vb`

The history rerun script was also fixed to copy the website JSON into this repo:

- `WEBSITE_DATA = os.path.join(PROJECT, 'website', 'src', 'data')`

## What is still pending

To fully refresh the report with those new trace fields, the history rerun must complete successfully against the rebuilt API.

Interactive reruns here exceeded time limits / hit long-running request issues, so the **current report files still contain the old JSON shape**, even though the source code is now patched.
