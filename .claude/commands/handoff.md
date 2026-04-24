# /handoff - Session Handoff

Use when: context is getting long (50+ messages), switching focus, or ending a work block.
Writes `docs/handoff.md` so the next session picks up exactly where this one left off.

## Steps

1. **List what was completed this session** (be specific - file names, features, fixes)

2. **Capture current state** across all layers:
   - Website (React components, running at localhost:3000?)
   - Native Backend (.NET API, running at localhost:5100?)
   - Analysis Scripts (Python CDF results, any re-runs needed?)
   - Data (central brain/ files, any gaps?)

3. **List what is broken or incomplete**

4. **Write `docs/handoff.md`:**

```markdown
# Session Handoff
Date: [timestamp]
Focus: [what this session worked on]

## Completed
- [file or feature] - [what it does now]

## Current State
### Working end-to-end
- [list]

### Built but untested
- [list]

### Broken / Incomplete
- [what's broken and last known error]

## Next Steps (priority order)
1. [Most urgent - likely blocking demo]
2. [Second]
3. [Third]

## Key Decisions (with WHY)
- [decision] - [reason]

## Dead Ends to Avoid
- [what failed and why]

## Open Questions / Blockers
- [ ] [question]

## Files Modified This Session
- `[path]` - [what changed]
```

5. Confirm: "Handoff written. Start next session with /prime."
