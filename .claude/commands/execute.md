# /execute - Implementation

Use in a FRESH session to implement a spec. Load only: `CLAUDE.md` + the spec file.

## Before Coding
- Confirm which spec file we're executing (`specs/[name].md`)
- Confirm which layer: data-collection / analysis-script / website-frontend / native-backend
- Load the relevant domain rule:
  - Data work -> read `.claude/rules/data-collection.md`
  - Analysis work -> read `.claude/rules/faarfield-analysis.md`

## Layer Guide

### Data Collection (central brain/)
- Research notes and downloaded data
- Python scripts for API calls and data processing
- Use `py` command (not python3) on this Windows machine

### Analysis Scripts (scripts/)
- Python CDF batch runner and engine
- Save outputs to `results/` and `central brain/`
- Test locally: `py scripts/[script].py`

### Website Frontend (c:/temp/aeropave/src/)
- React 19 + Vite 8 + Recharts + MapLibre + Tailwind
- Run from `c:/temp/aeropave` (NOT Dropbox - EBUSY errors)
- API calls go through `src/api/apiClient.js` or `src/api/tafClient.js`
- Test locally: `cd c:/temp/aeropave && npx vite --host --port 3000 --force`
- Keep components under 200 lines when possible

### Native Backend (c:/temp/aeropave/faarfield-api/)
- VB.NET targeting .NET Framework 4.8, Platform=x86
- References FAARFIELD DLLs from `C:\Program Files (x86)\FAARFIELD\`
- Build: `"C:/Windows/Microsoft.NET/Framework/v4.0.30319/msbuild.exe" FaarfieldApi.vbproj /p:Configuration=Release /p:Platform=x86 /v:m`
- Test: `curl http://localhost:5100/api/health`

## Implementation Rules
- Follow spec steps in order - check off each as done
- Report blockers immediately - don't spend >5 min stuck
- After each file: manually verify it doesn't break existing flow

## When Done
Run `/commit` to log decisions and git commit.
