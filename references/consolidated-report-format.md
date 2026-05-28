# Consolidated Report Format

Load this file when assembling the **final consolidated report** in Step 4 of
the orchestration workflow. SKILL.md has the short form; this file gives the
full template with section ordering, severity rules, and worked phrasing for
edge cases (empty findings, all-CRITICAL, partial lane failure).

---

## Status line

Pick exactly one:

- `PASSED` — zero findings of severity WARNING or higher across all five lanes.
- `PASSED WITH WARNINGS` — one or more WARNING findings, zero CRITICAL.
- `BLOCKED` — one or more CRITICAL findings in any lane.
- `INCOMPLETE` — one or more lanes failed to run (e.g. type-check command
  errored before reporting findings). Always treat INCOMPLETE as a blocker —
  never silently downgrade to PASSED.

## Full template

```
## Sanity Check Report — sanity-check

**Status:** <PASSED | PASSED WITH WARNINGS | BLOCKED | INCOMPLETE>
**Files Audited:** <N>
**Subagents:** 5 independent lanes (<list any that failed to run>)
**Scope:** <one-line description of how candidate set was derived>

---

### Critical Findings (must fix)

<Table or numbered list. Group by file. For each finding include:
 file:line, lane that found it, one-sentence issue, suggested fix
 (or "fix is judgment call — flag for human")>

### Warnings (should fix)

<Same shape as Critical.>

### Info (nice to have)

<Same shape, briefer. Acceptable to summarize ("12 missing JSDoc blocks
in core-package/src/util/*") instead of listing every line.>

### Quick Fixes (one-liners)

<List concrete one-line edits the user can accept verbatim, e.g.
 "remove .only on file.test.ts:42" or "add `await` on file.ts:88".>

### Lane Summary

| Lane | Status | Findings | Notes |
|------|--------|----------|-------|
| 1. Completeness | <ran/skipped/errored> | <count> | |
| 2. Type & Syntax | | | <type-check exit code> |
| 3. Integration & Contract | | | |
| 4. Documentation & Standards | | | |
| 5. Behavioral & Logic | | | |

---

### Suggested next step

<Pick one: "Fix critical issues now (offer to apply Quick Fixes)" |
 "Create follow-up tasks for warnings" |
 "Re-run sanity check after fixes land" |
 "Scope is too large — recommend partitioning by package">
```

## Phrasing rules

- **Always lead with the status line.** Users skim for `BLOCKED` and
  `CRITICAL` first.
- **Never combine severities.** A `WARNING` is not "almost CRITICAL"; keep
  the buckets distinct so users can triage by section.
- **Cite file:line in every finding.** Reports without locations are
  un-actionable.
- **Use "evidence-first" wording** for behavioral findings: lead with the
  bad outcome ("crashes when `items` is empty"), then the location, then the
  fix.
- **Empty sections stay** in the template, marked `(none)`. Removing them
  makes the report inconsistent across runs and harder to diff.

## Edge cases

### Zero findings overall

Still emit the full report. Confirms the audit ran. Status: `PASSED`.
Lane Summary table must still list all 5 lanes as `ran` with `0` findings —
this is the proof of work.

### A lane failed to run

Emit the report with status `INCOMPLETE`. In the Lane Summary, set the
failed lane's Status to `errored` and put the actual error message in the
Notes column. Do NOT estimate or backfill findings for a lane that did not
run.

### One file has >10 findings in a single lane

Summarize in the lane's table row ("18 missing-await findings in
streaming-pipeline.ts — see appendix") and append an "Appendix — Detailed
Findings" section after Lane Summary, rather than overwhelming the main
Critical/Warning sections.

### User asked for a specific subset

Echo the scope they specified in the **Scope** line of the header
("Audited only files under `core-package/src/auth/` per user request"). This
prevents confusion when the report looks shorter than expected.
