# Spec: Design Tool UX Fix — Clear Input/Output Flow

## What / Why
The Design Tool tab is confusing because:
1. When you select a project airport, Original and Modified show the **same CDF** — user doesn't know what changed
2. There's no PCC/AC thickness slider anymore (LayerBuilder replaced it) but user doesn't realize they should edit the LayerBuilder table
3. The Design Parameters section has CBR slider which overlaps with Soil Horizon Picker
4. There's no clear visual connection between "what you changed" → "how CDF changed"

## Problems to Fix

### Problem 1: No visual diff between Original and Modified
User sees two identical CDF numbers and thinks it's broken. Need to show WHAT changed.

**Fix:** Add a **"Changes Summary"** between the two verdict cards that highlights differences:
- "PCC Thickness: 6" → 12" (+6")"
- "Subgrade CBR: 7 → 15 (+8)"
- "No changes yet — modify layers or parameters to see impact"

### Problem 2: Layer editing is hidden in a table
The LayerBuilder looks like a data display, not an editor. Users don't realize they can click and change values.

**Fix:**
- Add **inline sliders** next to each layer thickness in the LayerBuilder (not just number input)
- Add a **"Quick Adjust" bar** above the LayerBuilder with PCC and AC thickness sliders that directly update the LayerBuilder values
- Highlight the editable cells with a subtle border/background change

### Problem 3: Duplicate CBR controls
CBR appears in both Design Parameters sliders AND Soil Horizon Picker. Confusing which one controls the analysis.

**Fix:**
- Remove CBR from Design Parameters section
- Keep it ONLY in Soil Horizon Picker (which has the full soil context)
- Design Parameters keeps: Flexural Strength, Growth Rate, Design Life only
- Add a one-line CBR display in Design Parameters: "Subgrade: CBR = 7 (from Soil Picker above)" with a link to scroll up

### Problem 4: No guided flow for new users
User doesn't know the order: layers → soil → traffic → parameters → results

**Fix:** Add **step indicators** at the top of the Design Tool:
```
① Pavement Layers → ② Subgrade → ③ Traffic Mix → ④ Parameters → ⑤ Results
```
Highlight the current step. Grey out steps not yet completed. Show a checkmark when complete.

## Implementation Steps

### Step 1: Add Quick Adjust bar above LayerBuilder
- Shows PCC thickness slider and AC thickness slider
- These sliders directly modify the corresponding layer in the LayerBuilder
- Shows total pavement depth in real-time
- Only appears for project airports (layers are pre-loaded)

```
┌─────────────────────────────────────────────────────────────────┐
│ QUICK ADJUST                                                    │
│                                                                 │
│ AC Thickness   ──●──────────────  2.5"                         │
│ PCC Thickness  ────────●────────  6.0"    Total: 8.5"          │
│                                                                 │
│ ℹ Drag sliders to change layer thickness. Full editor below.   │
└─────────────────────────────────────────────────────────────────┘
```

### Step 2: Add Changes Summary between verdict cards
- Compare current LayerBuilder values vs original section data
- Show each changed parameter with before → after
- If nothing changed, show "No changes — adjust layers or parameters above"

```
┌─────────────────────────────────────────────────────────────────┐
│ WHAT CHANGED                                                    │
│                                                                 │
│ PCC Thickness:   6.0" → 12.0"  (+6.0")                        │
│ Subgrade CBR:    7 → 15        (+8)                            │
│ Growth Rate:     3.2% → 1.0%   (−2.2%)                        │
│                                                                 │
│ CDF Impact:      10.15 → 0.003  (−99.97%)                     │
│ Life Impact:     2 yr → 999+ yr                                │
└─────────────────────────────────────────────────────────────────┘
```

### Step 3: Clean up Design Parameters
- Remove CBR slider (already in Soil Picker)
- Keep only: Flexural Strength, Growth Rate, Design Life
- Add read-only CBR reference: "Subgrade: CBR = 7 → E = 10,500 psi (set in Soil Picker)"
- Change layout from 3-col to 3 sliders in a single row

### Step 4: Add step indicators
- 5 steps with circle indicators at top of Design Tool
- Each step: numbered circle + label
- Active step highlighted in primary color
- Completed steps show checkmark
- Steps auto-complete when data is present:
  - ① Layers: complete when LayerBuilder has ≥1 layer
  - ② Subgrade: complete when CBR is set (from Soil Picker or default)
  - ③ Traffic: complete when aircraft list has ≥1 aircraft
  - ④ Parameters: always complete (has defaults)
  - ⑤ Results: complete when CDF is computed

### Step 5: Highlight editable cells in LayerBuilder
- Add light blue left border on editable cells
- Show pencil icon on hover
- Number inputs get a subtle `ring-1 ring-primary/20` to show they're editable

### Step 6: Make LayerBuilder thickness cells bigger
- Current: small `w-16` number input
- Change to: slider + number side by side (like the Quick Adjust bar)
- Makes it obvious these are adjustable

## Files to Modify

| File | Changes |
|------|---------|
| `tabs/DesignTool.jsx` | Add Quick Adjust bar, Changes Summary, step indicators, clean up Design Parameters |
| `components/LayerBuilder.jsx` | Add inline sliders for thickness, highlight editable cells |

## Out of Scope
- Animated transitions between steps
- Undo/redo for changes
- Saving/loading analysis presets

## Execution
Run: `/execute specs/design-tool-ux-fix.md`
Output: Updated `DesignTool.jsx` + `LayerBuilder.jsx`
