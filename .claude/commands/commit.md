# /commit - Document Work and Log Decisions

Run after completing any feature, fix, or significant change.

## Part 1: Log the decision

Append to `docs/decisions.md`:

```markdown
## [timestamp] - [Feature/Fix Name]
**What was built:** [1-2 sentences]
**Why this approach:** [key technical or product decision]
**Files changed:** [list]
**Next:** [what this unblocks]
```

## Part 2: Git commit (if repo initialized)

```bash
git add scripts/ results/ docs/ specs/ .claude/ central\ brain/
git commit -m "[type]: [short description]

- [Key change 1]
- [Key change 2]"
```

**Commit types:**
| Type | Use for |
|------|---------|
| `feat` | New feature (analysis engine, new UI component, native backend endpoint) |
| `fix` | Bug fix (wrong CDF formula, broken render, API error) |
| `data` | New data collection (soil, traffic, aircraft matching) |
| `spec` | New or updated spec file |
| `refactor` | Code cleanup, no behavior change |
| `docs` | CLAUDE.md, decisions.md, handoff.md update |

**Examples:**
- `feat: add LEAF stress contour visualization to Design Tool`
- `fix: correct growth formula from compound to linear`
- `data: collect NRCS subgrade for KMWH Grant County`
- `spec: write native backend implementation plan`

## Part 3: Update AI layer (if applicable)

If this session revealed a better way to work:
- New data pattern -> add to `.claude/rules/data-collection.md`
- New analysis convention -> update `.claude/rules/faarfield-analysis.md`
- New architecture decision -> update `CLAUDE.md`
