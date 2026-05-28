# Lane Criteria — Expanded Audit Detail

Load this file when you (the orchestrator) are **authoring the audit prompt
for a specific lane**, or when a lane subagent needs the full criteria to
classify a finding. SKILL.md keeps the high-level checklist for fast
dispatch; this file holds the per-pattern detail, severity heuristics, and
worked examples that would otherwise bloat the parent skill.

Each lane below mirrors the lane defined in `SKILL.md` and **expands** it.
The lane mandate in SKILL.md is canonical; treat the expansions here as
implementation guidance.

---

## Lane 1 — Completeness Auditor (detailed)

### Pattern catalog

| Pattern | Example match | Default severity |
|---------|---------------|------------------|
| TODO comment with no owner/date | `// TODO fix later` | WARNING |
| TODO that blocks behavior | `// TODO: actually validate input` | CRITICAL |
| `throw new Error("Not implemented")` reachable on a non-error path | export thrown in default branch | CRITICAL |
| `it.skip` / `describe.skip` introduced in this change | newly skipped tests | WARNING |
| `.only` left on a test | `it.only("...")` | CRITICAL (will silently disable other tests in CI) |
| Hardcoded `localhost`, `127.0.0.1`, port number in source | `fetch("http://localhost:3000/...")` | WARNING |
| Hardcoded secret-shaped string | `sk_*`, `pk_*`, `Bearer ey...` | CRITICAL |
| `console.log` / `console.debug` in non-script code | inside a handler or component | INFO unless behind a logger flag → WARNING |
| `debugger;` statement | literal `debugger;` | CRITICAL |
| Empty `catch (e) {}` | swallows errors silently | WARNING |
| Async function with no awaited rejection path | `async () => { foo() }` (drops promise) | WARNING |

### Heuristics

- A `TODO` is **not** automatically a finding if it predates this change —
  scope to lines touched in the diff unless explicitly asked to sweep.
- `console.log` inside `scripts/` or `*.test.ts` is typically expected;
  downgrade to INFO or skip.
- "Empty function body" is fine for type stubs, default no-ops, and abstract
  methods. Confirm the body is *unintentionally* empty before flagging.

### Output enrichment

For each finding, include a **suggested fix snippet** when the fix is obvious
(e.g. add an `await`, remove `.only`, move literal to a constant). If the fix
is a judgment call (TODO → real implementation), leave the fix column blank
rather than guessing.

---

## Lane 2 — Type & Syntax Auditor (detailed)

### Per-package commands

The commands in SKILL.md's "Type-Check Commands" table are canonical. Two
extra rules apply:

1. **Run the command from the repo root**, not from inside the package
   directory, so `--prefix` resolves the right `node_modules`.
2. **Capture exit code AND stderr**. Some checkers (e.g. `tsc --noEmit`)
   exit 0 on warnings; you must grep the output for `error TS` to be sure.

### What counts as a `Type & Syntax` finding

| Finding | Severity |
|---------|----------|
| New `any` type with no `// reason:` comment | WARNING |
| New `as unknown as Foo` double-assert | CRITICAL — almost always a bug |
| Unused import added in this change | WARNING |
| Unused local variable | INFO |
| Implicit `any` in callback (e.g. `arr.map(x => ...)` where x has no inferable type) | WARNING |
| Generic constraint violated but suppressed with `@ts-ignore` | CRITICAL |
| New `@ts-expect-error` without an explanatory comment | WARNING |
| `as` cast that narrows union to specific variant without runtime guard | WARNING |

### What is NOT a Lane 2 finding

- Style issues like quote type, semicolons, line width — those are Lane 4.
- Logic bugs that happen to be type-clean — those are Lane 5.
- Missing JSDoc — Lane 4.

---

## Lane 3 — Integration & Contract Auditor (detailed)

### Contract sources to check

1. **Exports / imports.** For every newly exported symbol, grep the repo for
   importers. Zero importers ⇒ either dead code (WARNING) or the caller was
   not yet wired up (INFO with a "is the call site landing in a separate PR?"
   note).
2. **Renamed/deleted exports.** Search unmodified files for stale references.
   A stale reference is always CRITICAL — the build may still pass if the
   importer goes through a barrel that no longer re-exports.
3. **API route ↔ client call.** When a server route handler signature
   changes (path, method, payload shape), find the client call site and
   verify the shape matches. Mismatch is CRITICAL.
4. **DTO / shared types.** If a shared `*.types.ts` or `*.contract.ts`
   changed, verify both the producer and consumer were updated in the same
   change set.
5. **`.env.example` parity.** Every `process.env.FOO` introduced in source
   must have a `FOO=` line in `.env.example`. Missing entry is WARNING.
6. **`package.json` parity.** Every `import "x"` from a new dependency must
   appear in `dependencies` (or `devDependencies` for dev-only code). Missing
   entry is CRITICAL — production install will break.
7. **Migration scripts.** Any schema change (column added, table renamed,
   index dropped) must have a migration file dated ≥ today. Missing migration
   is CRITICAL.
8. **Shared literal tokens.** Cross-package literal strings used as keys
   (e.g. status enums, event names) must be byte-identical. A copy-paste of
   `"primary"` in two packages is a contract violation — there should be one
   shared constant.

### Scoping rule

Lane 3 false positives most often come from **rename detection that's too
broad**. Restrict integration checks to files that import from a modified
module (use `grep -l "from .*modified-module"` to seed the secondary set).

---

## Lane 4 — Documentation & Standards Auditor (detailed)

### Required references

This lane MUST load the repo's standards docs when present (paths listed in
SKILL.md "Reference Standards"). If the repo lacks those docs, fall back to
the defaults below and note in the finding that the standard is *assumed*,
not *enforced*.

### Defaults when repo standards are absent

| Standard | Default |
|----------|---------|
| File overview | `@fileoverview` block on any new file > 50 lines |
| Function JSDoc | Required on exported functions with > 1 parameter or non-obvious return |
| Naming — env vars | `SCREAMING_SNAKE` with project prefix (e.g. `GG_FOO_BAR`) |
| Naming — constants | `SCREAMING_SNAKE` |
| Naming — types/interfaces | `PascalCase` (no `I` prefix) |
| Naming — files | `kebab-case.ts` for utilities, `PascalCase.tsx` for React components |
| Quote style | Double quotes for strings, single quotes only inside JSX attributes |
| Semicolons | Required |
| Line width | ≤ 100 chars |
| `eslint-disable` | Must be followed by `// reason: …` on the same or adjacent line |

### Severity guide

- Missing JSDoc on a public API → WARNING
- Missing JSDoc on an internal helper → INFO
- Naming-convention violation on a public export → WARNING
- Naming-convention violation on a local variable → INFO
- `eslint-disable` with no explanation → WARNING

---

## Lane 5 — Behavioral & Logic Auditor (detailed)

### Pattern catalog

| Pattern | Severity | Notes |
|---------|----------|-------|
| `await` inside a `.forEach` callback | CRITICAL | `.forEach` ignores returned promises → silent race |
| Sequential `await`s that could be `Promise.all` | INFO | Performance, not correctness |
| `Promise.all` over operations with **shared mutable state** | WARNING | Race condition risk |
| Off-by-one in `for (let i = 0; i <= arr.length; i++)` | CRITICAL | Reads past end |
| Optional chaining on left side of assignment in error path | WARNING | Silent failure |
| Mutation of a function argument that the caller still uses | WARNING | Hidden side effect |
| React effect with missing dependency that's referenced inside | WARNING | Stale closure |
| React effect with object/array dep that's re-created every render | WARNING | Infinite loop risk |
| Logging an entire request/response object | CRITICAL if it may contain secrets, else WARNING |
| Unescaped user input flowed into HTML / shell / SQL | CRITICAL |
| `!` applied to a complex condition without parentheses | WARNING | `!a && b` vs `!(a && b)` is a common bug |
| Early `return` before a `finally`-equivalent cleanup | WARNING |

### What Lane 5 should NOT flag

- Style preferences (single vs double quotes, arrow vs function) — Lane 4.
- Unused variables — Lane 2.
- Missing JSDoc — Lane 4.
- "I would write this differently" without a concrete failure mode. Every
  Lane 5 finding must name the **observable bad outcome** (e.g. "if `items`
  is empty this throws", not "this code is ugly").

### Confidence calibration

If you cannot describe the bad outcome in one sentence, downgrade or drop the
finding. Lane 5 noise erodes trust in the whole report faster than any other
lane because behavioral claims are harder for the user to spot-verify.
