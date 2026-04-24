# Spec: Website Remaining 3 Items

## What / Why
Finish the last 3 items from the website-report.md spec that were not completed during execution. These are polish/validation tasks, not new features.

## Item 1: JS/Python Engine Parity Test (Codex Fix 3)

**Goal:** Verify faarfieldEngine.js produces the same CDF values as faarfield_engine.py within 0.1% tolerance.

**Method:**
- Run Python engine on KLHX Section 6627 with known inputs → capture exact CDF values
- Run JS engine on same inputs via a Node.js test script → capture CDF values
- Compare all three failure mode CDFs: |JS - Python| / Python < 0.001

**Inputs (identical for both):**
```
Layers: [AC 2.5" E=200000 nu=0.35, PCC 6.0" E=4000000 nu=0.15, Subgrade E=10500 nu=0.40]
Traffic: Use KLHX traffic (79 aircraft, no filter)
Growth: 0.032, Life: 20, Flexural: 700
```

**Expected Python values (from previous run):**
- CDF_AC = 8.636642e-07
- CDF_Sub = 4.449370e-09
- CDF_PCC = 1.015172e+01

**Steps:**
1. Create `scripts/engine_parity_test.js` — loads faarfieldEngine.js via Node, runs analyzeSection with hardcoded KLHX inputs
2. Run it: `node scripts/engine_parity_test.js`
3. Compare output against Python values
4. If drift > 0.1%: identify which function differs and fix
5. Log results to `results/parity_test.txt`

## Item 2: Print Mode CSS (Phase 5)

**Goal:** When professor presses Ctrl+P, the page renders cleanly on paper.

**Steps:**
1. Add `@media print` block to `index.css`
2. Rules:
   - Hide sticky header, nav links, search bar, sliders, buttons
   - Show all sections expanded (no lazy loading needed — already rendered)
   - Remove shadows and glassmorphism (flat for print)
   - Force white background, black text
   - Page breaks before each major section (`break-before: page`)
   - Charts render as-is (Recharts SVG prints natively)
   - MapLibre canvas: hide (maps don't print well) — show static fallback text with airport list
3. Test: Ctrl+P in Chrome → check PDF preview looks clean

## Item 3: SoilHorizonPicker for Live Searches

**Goal:** When user searches a new airport via AirportSearch, the NRCS soil data flows into the SoilHorizonPicker in the Analysis Panel.

**Current state:**
- AirportSearch.jsx calls fetchSoilProfile() → gets horizons → stores in `searchedAirport.soil`
- AnalysisPanel.jsx only reads soil from pre-loaded `subgradeData[icao]` (6 project airports)
- SoilHorizonPicker.jsx works correctly when given horizons prop

**Fix:**
1. In App.jsx: pass `searchedAirport` to AnalysisPanel as a prop
2. In AnalysisPanel.jsx: if `searchedAirport` exists and matches current airport, use `searchedAirport.soil.horizons` instead of `subgradeData[icao].horizons`
3. When user searches new airport → soil auto-fills → SoilHorizonPicker renders → user picks horizon → CBR updates → CDF re-runs

**Steps:**
1. Add `searchedAirport` prop to AnalysisPanel
2. In AnalysisPanel, merge searched soil data with project data:
   ```
   const horizons = searchedAirport?.icao === currentAirport && searchedAirport?.soil?.horizons
     ? searchedAirport.soil.horizons
     : sub?.horizons
   ```
3. Pass merged horizons to SoilHorizonPicker
4. Test: search KPHX → verify soil profile appears in horizon picker

## Implementation Order
1. **Item 1 first** (parity test) — validates the engine before anyone uses the website
2. **Item 3 second** (soil wiring) — completes the live search flow
3. **Item 2 last** (print mode) — cosmetic, doesn't affect functionality

## Execution
Run: `/execute specs/website-remaining-3.md`
Output: `scripts/engine_parity_test.js`, updated CSS, updated AnalysisPanel.jsx
