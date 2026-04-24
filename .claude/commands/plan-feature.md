# /plan-feature - Feature Planning

Use BEFORE implementing any new feature. Creates a spec in `specs/` to guide a clean implementation session.

## Feature Areas (for context)
- **Data Collection** - Subgrade (NRCS API), traffic (Excel/TAF), aircraft matching (FAA ACD)
- **CDF Analysis** - Python batch scripts, JS browser engine, native .NET backend
- **Website / Visualization** - React components, Plotly charts, interactive Design Tool
- **Native Backend** - .NET 4.8 HttpListener wrapping FAARFIELD VB.NET solvers (LEAF, AM)
- **Report / Presentation** - Screenshots, Word export, methodology documentation

## Steps

1. **Clarify the feature:**
   - What exactly needs to change or be added?
   - Which layer: data-collection / analysis-script / website-frontend / native-backend?
   - What does success look like at demo time?

2. **Research (sub-agents only - never dump raw content into main context):**
   - For FAARFIELD logic: check source in `FAARFIELD_2.1.1_SourceCode/FAARFIELD/`
   - For pavement/soil data: check `central brain/` and `AO_CEE598_FAARFIELD.xlsx`
   - For website UI: check existing components in `c:/temp/aeropave/src/components/`
   - For domain rules: read `.claude/rules/data-collection.md` or `faarfield-analysis.md`

3. **Write spec to `specs/[feature-name].md`:**

   ```markdown
   # Feature Spec: [Name]
   Date: [today]
   Layer: data-collection | analysis-script | website-frontend | native-backend

   ## What We're Building
   [1-2 sentences]

   ## Inputs / Outputs
   - Input: [what comes in]
   - Output: [what goes out]

   ## Files to Create or Edit
   - `[path]` - [why]

   ## Implementation Steps
   1. [ ] Step 1
   2. [ ] Step 2

   ## Demo Test
   [How will we verify this works in the demo?]

   ## Out of Scope
   - [What we are NOT doing]
   ```

4. **Review with user** before coding starts.

5. **Hand off:** "Open a fresh session, run /prime, then /execute with this spec."
