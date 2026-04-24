# Fresh Machine Setup — AeroPave Website + FAARFIELD Backend

**Author:** Chidchanok Pleesudjai (`cpleesud@asu.edu`)
**Date:** 2026-04-24
**Repo:** https://github.com/Pleesudjai/cee598-airport-final (private)
**Purpose:** Step-by-step recipe to bring up the AeroPave website **with full backend functionality** on a Windows machine you've never used before.

---

## 0. What you'll have at the end

`http://localhost:5173` running with:
- ✅ All 13 pre-cal'd CDF results visible (verdict, profile, gear footprint, contributor table)
- ✅ Live LEAF stress contour + stress profile panels
- ✅ Live 3D FEM mesh viewer
- ✅ Live re-computation when you change layer thickness, traffic, MOR, etc.
- ✅ Live aircraft library lookup (1,310 records from FAARFIELD's `AircraftGeometry.xml`)

---

## 1. Hardware / OS requirements (must check before starting)

| Requirement | Why | How to check |
|---|---|---|
| **Windows 10 or 11** (x64 host OK; the backend is x86) | FAARFIELD is Windows-only; the backend uses `System.Net.HttpListener` | `winver` |
| **At least 2 GB free disk** | Source ~50 MB + node_modules ~500 MB + FAARFIELD install ~200 MB + working set | File Explorer → C: drive |
| **Admin rights** (one time, for FAARFIELD installer) | Installer drops DLLs into `C:\Program Files (x86)\FAARFIELD\` | n/a |
| **Network access** | npm install, git clone, NRCS / NOAA APIs | n/a |

❌ **Won't work on macOS / Linux** — `HttpListener` is a Windows-only .NET API and FAARFIELD only ships as Windows .NET assemblies. WSL2 doesn't help (you'd need full .NET Framework 4.8 inside WSL, which is unsupported).

---

## 2. Install software prerequisites

Do these in this order. Each is a one-time setup per machine.

### 2.1 Git for Windows
- Download: https://git-scm.com/download/win
- Default options are fine
- Verify: open a new terminal, run `git --version` → should print `git version 2.x.x`

### 2.2 Node.js (LTS, 18+ or newer)
- Download: https://nodejs.org/en/download/  (pick **LTS Windows Installer (.msi)** for x64)
- Default options are fine — this also installs npm
- Verify:
  ```cmd
  node -v    :: should print v18.x.x or higher
  npm -v     :: should print 9.x.x or higher
  ```

### 2.3 .NET Framework 4.8 (almost always pre-installed on Win 10/11)
- Verify by checking the registry path or just running:
  ```cmd
  dir "C:\Windows\Microsoft.NET\Framework\v4.0.30319\msbuild.exe"
  ```
  If the file exists, you're good. Otherwise install the **.NET Framework 4.8 Developer Pack**:
  https://dotnet.microsoft.com/download/dotnet-framework/net48

### 2.4 FAARFIELD 2.1.1 (the proprietary FAA software)
- The website backend wraps FAARFIELD's licensed DLLs (`LEAFClassLib.dll`, `AMClassLib.dll`, `FaarFieldAnalysis.dll`, `FaarFieldModel.dll`, `FAAMeshClassLib.dll`, `FEMClassLib.dll`, `ACClassLib.dll`).
- These DLLs are **not in the GitHub repo** (FAA license forbids redistribution).
- **Where to get FAARFIELD 2.1.1:**
  - FAA Office of Airports — https://www.faa.gov/airports/engineering/design_software/
  - Free download but requires registration with the FAA
  - You may already have the installer in your existing files at:
    `…\03 Final Project\FAARFIELD_2.1.1_Installation Files\`
    (this folder was excluded from the repo intentionally; copy it to the new machine via USB / Dropbox / OneDrive if convenient)
- **Run the installer** (admin rights needed):
  - Default install path: `C:\Program Files (x86)\FAARFIELD\`
- **Verify the install:**
  ```cmd
  dir "C:\Program Files (x86)\FAARFIELD\LEAFClassLib.dll"
  dir "C:\Program Files (x86)\FAARFIELD\AMClassLib.dll"
  dir "C:\Program Files (x86)\FAARFIELD\FaarFieldAnalysis.dll"
  ```
  All three must exist. If any is missing, the backend build will fail with a `MetadataFile` error.

---

## 3. Clone the repo

Open a terminal (Git Bash, PowerShell, or CMD — all work), then:

```cmd
cd C:\
mkdir cee598
cd cee598
git clone https://github.com/Pleesudjai/cee598-airport-final.git
cd cee598-airport-final
```

You should now see folders like `website`, `note_claude`, `scripts`, `results`, `.gitignore`, `README.md`.

---

## 4. Set up the website at a non-Dropbox path (recommended)

If your `cee598-airport-final` clone is inside Dropbox / OneDrive / Google Drive, **the backend build and Vite hot-reload will be slow and occasionally flaky** because cloud sync interferes with file locks.

**Recommended:** copy just the `website/` folder to a fast local path. The original location stays as your "git repo for commits"; the local copy is your "running app."

```cmd
robocopy "C:\<your repo path>\cee598-airport-final\website" "C:\temp\aeropave" /E /XD node_modules bin obj dist .vite .git .cache
```

For the rest of this guide, I'll assume the running app is at `C:\temp\aeropave\`.

---

## 5. Install frontend dependencies

```cmd
cd C:\temp\aeropave
npm install
```

- Takes 1–3 minutes the first time (downloads ~500 MB of npm packages)
- Should end with no errors and a `node_modules\` folder appearing
- Warnings about peer-dependency mismatches are normal — ignore them

---

## 6. Build the .NET backend

```cmd
cd C:\temp\aeropave\faarfield-api
C:\Windows\Microsoft.NET\Framework\v4.0.30319\msbuild.exe FaarfieldApi.vbproj /p:Configuration=Release /p:Platform=x86 /v:m
```

- Takes ~15–30 seconds
- Output should end with `0 Warning(s)` and `0 Error(s)`
- Produces: `bin\x86\Release\FaarfieldApi.exe` plus all the FAARFIELD DLLs (copied from `C:\Program Files (x86)\FAARFIELD\` automatically by the project's reference settings)

**If the build fails:**
- `MetadataFile "...LEAFClassLib.dll" could not be found` → FAARFIELD wasn't installed at the expected path. Re-check step 2.4.
- `MSBuild not found` → wrong path for `msbuild.exe`. Try `dir "C:\Windows\Microsoft.NET\Framework\v4.0.30319\msbuild.exe"` and verify.
- `error VBNC30002` or syntax errors → you have an outdated .NET Framework. Install the 4.8 Developer Pack from step 2.3.

---

## 7. Start both processes

You need **two terminal windows** running simultaneously.

### Terminal 1 — Backend (.NET FAARFIELD API)
```cmd
C:\temp\aeropave\faarfield-api\bin\x86\Release\FaarfieldApi.exe
```

You should see:
```
FaarfieldApi v0.3.0 — listening on http://localhost:5100/
LEAF: available
FEM: available
FEM3D: available
Analysis: available
Aircraft library: 1310 records, 136 with geometry
```

Leave this window open. Ctrl+C stops the backend.

**Verify backend** (in a third terminal, just for the test):
```cmd
curl http://localhost:5100/api/health
```
Expected output:
```json
{"status":"ok","leafAvailable":true,"femAvailable":true,
 "fem3dAvailable":true,"analysisAvailable":true,...}
```

### Terminal 2 — Frontend (Vite dev server)
```cmd
cd C:\temp\aeropave
npm run dev
```

You should see:
```
VITE v8.x.x  ready in 1234 ms
➜  Local:   http://localhost:5173/
```

### Open in browser
```
http://localhost:5173
```

---

## 8. Verify everything is working

Click through these in the website:

1. **Report tab** — should show all 13 sections with verdict (4 OVER / 9 UNDER) — this is pre-cal, works without backend.
2. **Design Tool** → pick a project airport (e.g. KMWH) → pick section 37508:
   - Verdict card should show CDF = **2.42e+04** with "PCC Fatigue" controlling — pre-cal hydrated, instant.
   - Top 10 Gear Footprint Top View — should render with C-17 (libGear=2T) at row 1.
   - CDF profile chart — should show the symmetric peaks at ±140".
   - Per-aircraft contribution table — 10 rows with σ_LEAF, σ_FEM, σ_eff, FEM/LEAF ratio.
3. **Live backend test** — change the AC overlay thickness using the Quick Adjust slider. Within ~600 ms you should see:
   - Spinner appears briefly ("Computing per-aircraft CDF…")
   - Verdict card updates with new CDF
   - All charts re-render
4. **Stress visualizations** — scroll down further:
   - Stress Contour panel should render a 2D heatmap (LEAF σ_z grid)
   - Stress Profile panel should show σ_z vs depth curve
   - 3D FEM Mesh — toggle "Use 3D FEM" checkbox, takes 10–30 s for the first run, then renders a 3D mesh view

If all of those work, the setup is complete.

---

## 9. Common issues & fixes

### "FAARFIELD backend offline" persists after starting backend
- Check the backend terminal — is `FaarfieldApi.exe` actually running? Look for the "listening on http://localhost:5100/" line.
- Hit `http://localhost:5100/api/health` directly in browser — should return JSON.
- Hard reload the website (`Ctrl+Shift+R`) to flush any stale state.
- The website tolerates 3 consecutive missed health checks (~24 s) before flipping to offline, so a brief backend restart shouldn't trigger it.

### Backend starts but "Cannot find DLL" error at runtime
- One or more FAARFIELD DLLs are missing or wrong version. Re-run the FAARFIELD installer.
- Verify `C:\Program Files (x86)\FAARFIELD\AircraftGeometry.xml` exists — the backend reads this at startup for the aircraft library.

### Vite says port 5173 in use
- Either another Vite instance is running (close it) or change the port:
  ```cmd
  npm run dev -- --port 5174
  ```

### 3D FEM doesn't render
- The first FEM run is slow (15–30 s for one aircraft). Watch the backend terminal — you should see `Computing FEM mesh…` progress lines.
- If it crashes with "Nike3d.dll not found" — that's expected and we work around it. The managed FAASR3D path is what we use; check `note_claude/fem3d-integration-blocker-2026-04-18.md` for context.

### Pulling new updates from the repo
```cmd
cd C:\<your repo path>\cee598-airport-final
git pull
robocopy website C:\temp\aeropave /E /XD node_modules bin obj dist .vite .git .cache
cd C:\temp\aeropave
npm install         :: only needed if package.json changed
:: rebuild backend if any *.vb file changed
cd faarfield-api
C:\Windows\Microsoft.NET\Framework\v4.0.30319\msbuild.exe FaarfieldApi.vbproj /p:Configuration=Release /p:Platform=x86 /v:m
```

---

## 10. Skip-the-backend mode (presentation laptop)

If you just want to **show the report** at a presentation and don't have time to install FAARFIELD on the demo machine:

```cmd
git clone https://github.com/Pleesudjai/cee598-airport-final.git
cd cee598-airport-final\website
npm install
npm run dev
```

Open `http://localhost:5173`. Everything that's pre-cal'd will work — that's the full 13-section verdict, all CDF profile charts, all gear footprint diagrams, all per-aircraft tables. Only the live recompute, stress visualizations, and 3D FEM viewer will show "Start FaarfieldApi to enable…"

For pure-presentation use, this is sufficient — the pre-cal results tell the entire story (4 OVER / 9 UNDER, C-17 dominance at KMWH, KOTM rehab artifact, etc.).

---

## 11. Quick-reference one-liner (for next time)

Once everything is installed once, daily startup is just:

```cmd
:: Terminal 1
C:\temp\aeropave\faarfield-api\bin\x86\Release\FaarfieldApi.exe

:: Terminal 2
cd C:\temp\aeropave && npm run dev
```

Then http://localhost:5173 in browser.

---

## 12. Where things live (path cheat sheet)

| Thing | Path |
|---|---|
| Repo (git tracking) | wherever you cloned, ideally **outside** Dropbox |
| Running app | `C:\temp\aeropave\` |
| Frontend source | `C:\temp\aeropave\src\` |
| Backend source | `C:\temp\aeropave\faarfield-api\*.vb` |
| Backend build output | `C:\temp\aeropave\faarfield-api\bin\x86\Release\` |
| FAARFIELD install (DLLs) | `C:\Program Files (x86)\FAARFIELD\` |
| Pre-cal CDF data | `C:\temp\aeropave\src\data\cdf_results.json` |
| All other JSON data | `C:\temp\aeropave\src\data\` |

---

*End of guide. If you hit anything that's not covered here, check `note_claude/` for older troubleshooting notes (especially `faarfield-parity-gaps-remaining.md` and `fem3d-integration-blocker-2026-04-18.md`).*
