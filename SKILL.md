---
name: sanity-check
description: when configuring post-task audits — completeness, type safety, integration contracts, docs standards, behavioral logic. Five parallel subagents. MCP-compatible. Not for pre-task checks.
---

> **Snapshot age:** live operational guidance (no vendored corpus). Verify command paths against the current workspace before use.

# GG → Sanity Check → Orchestrator

## Overview

This skill orchestrates a **five-lane independent sanity audit** over everything the user provided or everything that was modified during the current conversation. Each lane is a dedicated subagent with a narrow, well-defined mandate. Results are collected, cross-referenced, and presented as a single consolidated report with severity-ranked findings.

Unlike narrow checkers (type-check only, lint only), `sanity-check` verifies that the work is **complete, consistent, integrated, documented, and logically sound** before it is considered done.

## When to Use This Skill

**TRIGGER when:**
- The user says "sanity check", "check my work", "verify everything", or "did I miss anything?"
- A non-trivial development task (more than 3 files or cross-module changes) has just completed.
- A refactor, extraction, or merge concluded and needs independent validation.
- Before a commit or PR when the human wants agent-assisted confidence.

**SKIP when:**
- The task is a single-file, single-line trivial fix.
- The user explicitly asked for only one specific check (e.g., "just type-check this").
- A prior sanity check was already run in this conversation with no intervening changes.

## Common Misconceptions

| # | Misconception | Correction | Key concept |
|---|---------------|------------|-------------|
| 1 | Sanity check means running `tsc` and `eslint` | Those are lane 2 and lane 3 outputs; the other three lanes catch what compilers cannot | Multi-dimensional audit |
| 2 | One subagent can do all five checks | Independence matters. The same agent that wrote the code should not be the sole validator | Independent review |
| 3 | Only modified files need checking | New imports, deleted re-exports, or renamed symbols can break unmodified callers | Ripple detection |
| 4 | A clean type-check means the work is done | Type safety does not guarantee behavioral correctness or documentation completeness | Type ≠ done |
| 5 | The user must provide exact file lists | The orchestrator derives the candidate set from conversation history and `git status` | Auto-discovery |
| 6 | Parallel lanes can share findings | Each lane must report independently before synthesis | Independence first |
| 7 | Severity rankings are optional | Severity-ranked findings enable focused remediation | Priority triage |

## The Five Lanes

Spawn **five subagents in parallel**. Each receives the same file list but inspects it through a different lens. Do not merge lanes.

### Lane 1 — Completeness Auditor

**Mandate:** Verify nothing was left half-done.

Checks each modified/created file for:
- Unresolved `TODO`, `FIXME`, `HACK`, `XXX` comments
- Placeholder strings (`placeholder`, `temp_`, `stub`, `mock_me`)
- Empty function bodies or `throw new Error("Not implemented")`
- Skipped tests (`it.skip`, `describe.skip`, `.only` left behind)
- Missing error handling on async boundaries
- Console logs or debugger statements left in production code
- Hardcoded values that should be constants or env vars

**Output format:**
```
### Completeness Findings
| File | Line | Severity | Finding | Suggested Fix |
```

### Lane 2 — Type & Syntax Auditor

**Mandate:** Verify the code compiles and types are sound.

Per affected package:
- Run the package's type-check command (see [Type-Check Commands](#type-check-commands))
- Verify no `any` types were introduced unless justified
- Check for unused imports or variables
- Verify `as` type assertions are necessary and safe
- Confirm generic constraints are satisfied
- Check for implicit `any` in callback signatures

**Output format:**
```
### Type & Syntax Findings
| Package | Command | Exit Code | Errors | Warnings |
```

### Lane 3 — Integration & Contract Auditor

**Mandate:** Verify cross-file and cross-module contracts hold.

- Check that every exported symbol is imported somewhere (or should be)
- Verify renamed symbols did not orphan references in unmodified files
- Confirm API route handlers match their call sites
- Check that new env vars are documented in `.env.example`
- Verify database schema changes have corresponding migration scripts
- Confirm frontend props match backend DTO shapes (shared contracts)
- Check that new npm dependencies were actually added to `package.json`

**Output format:**
```
### Integration & Contract Findings
| Contract | Status | Location | Broken Reference |
```

### Lane 4 — Documentation & Standards Auditor

**Mandate:** Verify documentation and coding standards are met.

- File overview comments present on new non-trivial files (`@fileoverview`)
- Exported functions have JSDoc with `@param`, `@returns` where non-obvious
- Naming conventions match repo standards (see [Reference Standards](#reference-standards))
- No `eslint-disable` without a comment explaining why
- New env keys follow `SCREAMING_SNAKE` with namespace prefix
- Shared literal tokens are namespace-qualified (not bare `retry`, `primary`)
- Line width ≤ 100, double quotes, semicolons required

**Output format:**
```
### Documentation & Standards Findings
| File | Standard | Severity | Finding |
```

### Lane 5 — Behavioral & Logic Auditor

**Mandate:** Verify logic is sound and edge cases are handled.

- Race conditions in async code (parallel awaits that should be sequential)
- Off-by-one errors in loops or array indexing
- Missing null/undefined checks on optional fields
- Incorrect early returns that skip cleanup
- Mutation of function arguments (side effects)
- Inefficient re-renders or unnecessary effect dependencies in React
- Security concerns (unsanitized inputs, exposed secrets in logs)
- Logic inversions (`!` applied to complex conditions without parentheses)

**Output format:**
```
### Behavioral & Logic Findings
| File | Line | Category | Severity | Issue |
```

## Orchestration Workflow

### Step 1 — Discover Candidate Files

Build the file list from **all** of these sources, deduplicated:
1. Files explicitly created, modified, or deleted by tool calls in this conversation
2. Files mentioned by the user in their latest request
3. Files with uncommitted changes (`git diff --name-only`)
4. Files staged in git (`git diff --cached --name-only`)

If the candidate set is empty, ask the user what they would like sanity-checked.

### Step 2 — Spawn Five Parallel Subagents

Launch all five auditors simultaneously. Each subagent receives:
- The complete candidate file list
- Its lane mandate (from above)
- The relevant reference standards files (see below)
- Access to the full conversation history

**Important:** Each subagent should use `read_file` to inspect the *current* state of every file it checks. Do not rely on the assistant's memory of what was written.

### Step 3 — Collect & Deduplicate Findings

As subagents return:
1. Merge findings by file and line number
2. Deduplicate identical issues reported by multiple lanes
3. Assign an overall severity: `CRITICAL` | `WARNING` | `INFO`
4. If any lane reports `CRITICAL`, flag the overall result as **BLOCKED**

### Step 4 — Present Consolidated Report

```
## Sanity Check Report — sanity-check

**Status:** ✅ PASSED / ⚠️ PASSED WITH WARNINGS / 🚫 BLOCKED
**Files Audited:** N
**Subagents:** 5 independent lanes

### Critical Findings (must fix)
...

### Warnings (should fix)
...

### Info (nice to have)
...

### Quick Fixes (one-liners)
...
```

### Step 5 — Offer Remediation

If findings exist, offer to:
- Fix critical issues immediately
- Create a follow-up task for warnings
- Run the specific failing check command to reproduce

## Type-Check Commands

| Package | Command |
|---------|---------|
| Root (scripts) | `npx tsc --noEmit --skipLibCheck scripts/*.ts` |
| core-package | `npm run type-check --prefix core-package` |
| ui-package | `npm run ts:check --prefix ui-package` |
| manager-astro-package | `npm run ts:check --prefix manager-astro-package` |
| manager-next-package | `npm run ts:check --prefix manager-next-package` |

## Sanity Check Quality Checklist

Use this checklist before and during any sanity check operation.

| # | Checklist Item | Why It Matters | Gate |
|---|---------------|---------------|------|
| 1 | **File list auto-discovered** — From git status and conversation history | Enables ripple detection | Pre-audit |
| 2 | **Five lanes spawned parallel** — All five subagents run independently | Ensures independence | Draft |
| 3 | **Lanes report independently** — No lane merges findings before synthesis | Prevents bias | Draft |
| 4 | **Findings severity-ranked** — Critical/High/Medium/Low with reasoning | Enables focused fix | Draft |
| 5 | **Ripple detection done** — Unmodified callers checked for breakage | Prevents regressions | Draft |
| 6 | **Type ≠ done verified** — Behavioral and docs checks alongside type | Full coverage | Draft |
| 7 | **Consolidated report assembled** — Single report with cross-references | Unified view | Closeout |
| 8 | **User receives actionable findings** — Prioritized with suggested fixes | Enables remediation | Closeout |

### Quality Tiers

| Tier | Criteria | Use When |
|------|----------|----------|
| **Minimal** | Items 1-3, 8 | Single file change |
| **Standard** | Items 1-5, 8 | Multi-file change |
| **Full** | All 8 items | Cross-module refactor |

### Pre-Audit Verification

```
□ File list auto-discovered (git status + conversation)
□ Five lanes spawned in parallel
□ Each lane has independent mandate
□ Severity ranking defined for findings
□ Ripple detection planned for imports/exports
□ Consolidated report format loaded
```

## Sanity Check Consistency Validator

Before finalizing, verify:

### Consistency Check Matrix

| Check | What to Verify | How to Fix |
|-------|---------------|------------|
| **Lanes vs Independence** | Each lane reports independently | Re-spawn lane |
| **Findings vs Severity** | Each finding has severity + reasoning | Add severity |
| **Ripple vs Scope** | Unmodified callers checked | Add callers |
| **Report vs Consolidation** | All lanes included before synthesis | Add missing |

### Red Flags (Never Present)

- [ ] Single agent doing all five lanes
- [ ] Findings without severity ranking
- [ ] Type-check only (no behavioral/docs checks)
- [ ] Consolidated before all lanes report
- [ ] Type-safe ≠ done assumption

## Reference Standards

Load these docs into auditor context when the corresponding lane needs them:

- **Coding Patterns**: `docs/TYPESCRIPT_STANDARDS_CODING_PATTERNS.md`
- **Symbol JSDoc**: `docs/TYPESCRIPT_STANDARDS_DOCUMENTATION_JSDOC.md`
- **File Overviews**: `docs/TYPESCRIPT_STANDARDS_DOCUMENTATION_FILE_OVERVIEWS.md`
- **Field Naming**: `docs/FIELD_NAMING.md`
- **Taxonomy Ecosystem**: `docs/TAXONOMY_ECOSYSTEM.md`

## Progressive Disclosure — Load-on-Demand Files

The detailed audit criteria and report format are kept in `references/` to
keep this SKILL.md scannable. Load them on demand:

- Load `references/lane-criteria.md` when **authoring a lane's audit prompt**
  or when a subagent needs the full pattern catalog, severity heuristics, and
  worked examples for its lane.
- Load `references/consolidated-report-format.md` when **assembling the final
  consolidated report** (Step 4 of the orchestration workflow), or when you
  need the exact section ordering, status-line rules, and edge-case phrasing
  (zero findings, lane errored, large-file appendix, user-scoped subset).

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Subagent returns "no issues found" for every lane | Candidate file list was empty or stale | Re-run file discovery with `git status` and tool-call history |
| Type-check fails on unrelated files | `skipLibCheck` not set or tsconfig drift | Run the package-specific command manually and filter to changed files |
| Lane 3 reports false positives on unmodified callers | Rename detection too broad | Scope integration checks to files that import from modified modules |
| Report is overwhelming (>50 findings) | Task was too large for one sanity pass | Ask the user to scope to a specific package or subset of files |
| Lane 5 flags subjective style preferences | Behavioral auditor misinterprets pattern as bug | Refine Lane 5 prompt to focus on correctness, not style |

## Common Pitfalls

1. **Running fewer than 5 lanes.** Each lane catches issues the others miss. Do not combine lanes to save time.
2. **Checking only the assistant's memory.** Always re-read the file from disk; the user may have edited it externally.
3. **Ignoring deleted files.** A deleted export can break an unmodified importer. Include deletions in the candidate set.
4. **Skipping the consolidated report.** Raw subagent outputs are too noisy. Always synthesize into the report format.
5. **Not offering fixes.** A report without a remediation path is just noise. Offer concrete next steps.
6. **Running on unchanged files.** Avoid auditing the entire repo; keep the candidate set focused on this conversation's work.
7. **Forgetting shared contract strings.** Cross-package literal values must be byte-identical; Lane 3 must verify this.

## Quick Commands

```bash
# Run type-check for all packages (parallel)
npm run type-check --prefix core-package &
npm run ts:check --prefix ui-package &
npm run ts:check --prefix manager-astro-package &
npm run ts:check --prefix manager-next-package &
wait

# Find all modified files in this conversation's scope
git diff --name-only
git diff --cached --name-only

# Quick grep for TODOs and placeholders in candidate files
grep -rnE "TODO|FIXME|HACK|XXX|placeholder|stub|Not implemented" <files>
```

## Corpus Layout

```
SKILL.md                                  -- this file
references/
  lane-criteria.md                        -- per-lane pattern catalogs + severity heuristics
  consolidated-report-format.md           -- full report template + edge-case phrasing
agents/openai.yaml                        -- IDE agent metadata
assets/                                   -- icon assets
```

Repo-level coding-standards docs are still loaded from the consuming repo
(see "Reference Standards" above) — `references/` here holds only skill-owned
guidance.
