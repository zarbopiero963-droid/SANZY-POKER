# AGENTS.md

## GLOBAL EXECUTION POLICY

This repository uses strict, safe, manual-merge development.

**Project goal:** maintain and improve **Sanzy Poker Pro**, a browser poker game that:

- runs client-side (React + Vite + TypeScript) with 3D rendering via Babylon.js;
- implements the Sanzy Poker rules over a 32-card deck (8 ranks 7…A × 4 suits);
- supports two variants — **Standard** (ties divide, suit never counts) and **Hi/Low** (tie-break by value then by the suit of the highest card of the combination);
- plays two pots per hand (Piatto 1 / Piatto 2) with the **50/50-per-pot** split rule;
- runs bots and a full betting/phase state machine;
- is served in production by a small Express server (`server/index.ts`) and deployed on **Railway**.

The repository is small, but runtime behavior is **safety-critical for correctness**: a wrong change to hand evaluation, comparison, or pot settlement can declare the wrong winner or **create/lose chips**.

### Core rules

- Only one active task at a time.
- Only one open pull request at a time.
- Never work directly on `main`.
- Never merge a PR. Never enable auto-merge. Merge is **always manual, owner-only** (Piero).
- Never create a second PR while another unrelated PR is open.
- Never run multiple tasks in parallel.
- Never expand scope beyond the current task, current PR, or provided handoff.
- Never mark work complete while checks are pending/failing or blocking review comments remain unresolved.
- Every task that modifies code MUST automatically add or update **truthful hard tests** that exercise the real behavior of the change — including, where relevant, the mathematical-correctness scenarios (chip conservation, exact remainders, antisymmetric/transitive ordering, independent suit oracle, deterministic fuzzing over 2/3/4 players × Standard/Hi-Low). A code change without matching hard tests is an incomplete PR and cannot be declared DONE.
- If a change touches the design/UI/UX aspect (table, cards, phases, HUD, showdown, mobile/desktop layout), update the relevant project docs (`todo.md`, `PLAN.md`, `STRUCTURE.md`, `ideas.md`) in the same PR, or declare N/A with a written reason.
- Never commit secrets, `.env`, API keys, `node_modules`, `dist`, build artifacts, caches, logs, a real `.project-config.json`, or generated `__manus__` files.

### Project-specific safety invariants

The following must be preserved unless the task explicitly asks to change it.

**Showdown / chip safety**

- The sum of showdown payouts must always equal the pot exactly — **no chips created or lost**.
- The pot-split rule is **50/50 per pot**: Piatto 1 = 50, Piatto 2 = 50, each half split equally among that pot's winners; a player winning/tying both pots accumulates both shares; a sole winner of both pots takes 100%. **Do not reintroduce the old 75/25 special case.**
- Integer distribution uses the largest-remainder method ("se possibile per eccesso"); the payout sum stays exactly the pot.
- "No combination" in a pot = high card = everyone alive ties that pot.

**Hand-evaluation safety**

- Deck is 32 cards (8 ranks 7…A × 4 suits); do not alter it silently.
- Sanzy hierarchy §5: straight-flush > four-of-a-kind > **flush > full house** > straight > trips > two-pair > pair > high card. (In Sanzy the flush beats the full house, and any colour straight-flush — incl. the minimum — beats four-of-a-kind.)
- **Standard**: equal combinations divide — no suit, no kicker, no high-card tiebreak.
- **Hi/Low**: tie-break by value, then by the **suit of the highest card of the combination** (hearts > diamonds > clubs > spades); kickers never count.
- Pot composition §4: Piatto 1 uses 1–5 personal cards (never 5 board cards alone); Piatto 2 uses 3–5 personal cards; the two pots never mix; "punto in mano" (5 personal) is valid for both.

**Engine / flow safety**

- Preserve the five betting rounds and the discard phase: bui → discard → preflop → flop → turn → river → pot2 → showdown.
- All-in must never make chips negative; a fold win must not force the winner to reveal cards.
- Bot timers/automation must be cleared in `dispose` (no phantom turns).

**Deploy / server safety**

- The Express server must bind to `0.0.0.0` on `process.env.PORT` and expose `/healthz`.
- Keep the Vite build and the Railway config (`railway.json`, `nixpacks.toml`) working; do not commit secrets into them.

### Mandatory execution sequence

For any task that modifies code, tests, workflows, game rules, evaluation, settlement, phases, bots, UI/scene, server, or deploy config:

1. Clean branch preflight.
2. Phase 0 read-only inspection.
3. Patch plan.
4. Narrow patch.
5. Post-fix micro-audit.
6. Hard truthful local tests (`pnpm check`, `pnpm test`, and `pnpm build` where practical).
7. Commit and push.
8. Wait until all GitHub checks finish.
9. Collect checks, annotations, review bodies, PR comments, inline comments, unresolved threads.
10. Review triage.
11. If more patching is needed, repeat from Phase 0.
12. Final hard verify.
13. Report final status.

Do not skip Phase 0, post-fix micro-audit, hard truthful tests, the check completion gate, review triage, or final hard verify. If any step cannot be completed safely, stop and report `NEEDS_MANUAL`, `CHECKS_PENDING`, or `BLOCKED`.

### Auto mode detection

**Mode A — Current PR repair.** Use when the prompt mentions an existing PR/branch, the current branch already has an open PR, a handoff references a PR, or the request is about failing checks / review comments / CodeRabbit / Sourcery / Codex feedback on an existing PR. Continue on the existing PR branch; do not create a new branch or PR; do not merge; fix only the reported current-PR issues; push to the same branch; report the new PR head SHA.

**Mode B — New task / new PR.** Use only when no unrelated open PR exists and the request is a new, clearly-provided task. Create a new branch from the correct base, implement only the requested task, open exactly one PR, do not merge, write a clear PR body (summary, reason, safety, tests, scope, notes).

**Mode C — Blocked.** Use when another unrelated PR is open and a new task is requested, when the task needs unsafe out-of-scope changes, work on `main`, merging, exposing secrets, or would break the chip-conservation / 50/50 / hierarchy / variant invariants without explicit approval, or when the branch/remote cannot be determined safely. Stop and report `BLOCKED` or `NEEDS_MANUAL_UPDATE_BRANCH` with the exact owner action required.

### Before editing

Inspect first:

```
git status --short
git branch --show-current
git remote -v
```

Then identify the current branch, the task, the mode, files likely needed, files that must not be touched, and safety-critical areas affected. If the current branch is `main`, create/switch to a proper task branch before editing.

### Phase 0 read-only inspection

Before any code change, perform a read-only Phase 0 (do not modify files). Output:

```
SANZY_POKER_PHASE_0

Task:
- <requested task>

Detected mode:
- <New task / Current PR repair / Unknown>

Current branch:
- <branch>

Files inspected:
- <files>

Expected files to change:
- <files>

Forbidden files / artifacts:
- <.env, node_modules, dist, artifacts, caches, logs, secrets>

Safety risks:
- <wrong winner / chips created or lost / 75/25 reintroduced / hierarchy altered /
   deck altered / variants confused / phase sequence broken>

Patch plan:
- <smallest safe patch>

Hard truthful tests/checks:
- <pnpm check / pnpm test / targeted tests / fuzzing>

Stop conditions:
- <conditions>
```

If Phase 0 cannot determine safe scope, stop with `NEEDS_MANUAL` / Reason: Phase 0 could not determine safe scope.

### Implementation rules

- Make the smallest safe patch; do not broad-refactor unless explicitly requested.
- Do not change game behavior silently; keep backward compatibility when possible.
- Prefer narrow helper functions over rewriting `ui.ts`/`scene.ts`.
- Keep the architectural boundary: React hosts only the canvas; rules/gameplay stay framework-independent TypeScript in `client/src/game/`.
- Avoid heavy new dependencies unless explicitly needed; no hidden network calls.
- Do not silence errors that affect showdown correctness, chip conservation, or state consistency.
- If changing evaluation/comparison, include accepted/rejected examples in tests.
- If changing settlement, include exact expected payouts (2/3/4 players) in tests.

### Documentation maintenance — required

Whenever you add, change, or remove code (function, rule, combination, variant, phase, option), update the corresponding documentation in the same PR: `todo.md`, `PLAN.md`, `STRUCTURE.md`, `MEMORY.md` (domain decisions — e.g. the pot-split rule), `ideas.md` / `reference-analysis.md` / `table-3d-reference.md` (design/table), and docstrings/comments on non-trivial modules and functions. The micro-audit and final hard verify must include "docs updated: PASS/FAIL/N/A" (N/A = purely internal change with no documentation impact, with a written reason).

### Post-fix micro-audit

After patching and before tests/commit/push/resolve/DONE, inspect the diff and produce:

```
POST_FIX_MICRO_AUDIT

Scope:
- PASS / FAIL

Forbidden files:
- PASS / FAIL

Secrets:
- PASS / FAIL

Chip conservation:
- PASS / FAIL

Pot-split rule (50/50 per pot):
- PASS / FAIL

Hand hierarchy & deck:
- PASS / FAIL

Variants (Standard/Hi-Low):
- PASS / FAIL

Phase sequence:
- PASS / FAIL

Hard tests created/updated:
- PASS / FAIL

Docs updated:
- PASS / FAIL / N/A

Manual merge preserved:
- PASS / FAIL

Result:
- PASS / FAIL

Notes:
- <evidence>
```

If it fails: do not test/commit/push/resolve/DONE. Continue only with `POST_FIX_AUDIT=PASS`.

### Hard truthful tests

Tests must be real, targeted, and verifiable. Never claim a test passed unless the command actually ran with a passing exit code.

Forbidden: inventing results; `expect(true)`; tests that do not exercise real project functions; "expected to pass" as PASS; hiding failures; skipping without a written reason; fake coverage.

Minimum for TypeScript changes:

```
pnpm check     # tsc --noEmit
pnpm test      # vitest run
pnpm build     # where practical, before the checkpoint
```

**Mandatory hard tests for game-correctness behavior.** For every change touching deck, evaluation, comparison, settlement, phase sequence, action/betting queue, all-in, showdown, bots, or game state, add or update serious targeted tests that exercise the real project functions and cover the highest-risk cases: deck integrity; combination recognition (incl. ace-high and ace-low minimum straight); §5 hierarchy incl. the Sanzy specials (flush beats full; minimum colour straight beats four-of-a-kind); Standard ties divide (no suit/kicker); Hi/Low value-then-suit-of-highest-card with the regulation examples; §4 pot-composition constraints; §6 50/50 split with exact payouts for 2/3/4 players and odd pots with no lost chips; order properties (antisymmetry, transitivity, reflexivity) for both variants; and the engine (ante, phases with pre-board, speaking order, minimum raise, all-in, fold win, chip conservation over multiple hands).

Each test must **fail if the bug returns** (regression locked), not merely "pass". For a fix from a bug/finding, write the failing test first, then the patch.

```
HARD_TEST_EVIDENCE

Commands run:
- <exact command>: PASS / FAIL

Exit codes:
- <command>: <exit code>

What was actually tested:
- <real behavior>

What was not tested:
- <e.g. real 3D rendering in the browser, with reason>

Test quality:
- REAL / PARTIAL / MANUAL_ONLY

Notes:
- <evidence>
```

If tests cannot run: report `TESTS_SKIPPED` with reason, risk, and required owner action. Honest limits: anything that needs **real in-browser 3D rendering** (Babylon/WebGL, animations, real mobile/desktop layout) is written as a precise smoke/manual checklist and marked manual — never claimed as automatically tested. Pure logic (rules, state, settlement) must always be covered by deterministic offline tests.

### Check completion gate — required before final PR review

Do not perform final PR review, evidence resolve, thread resolve, or final READY/DONE while GitHub checks are still running. Inspect all current-head checks: GitHub Actions (`ci.yml`: `Typecheck e test`, `Build di produzione`, `Controllo formato`), statusCheckRollup, commit statuses, and CodeRabbit/Sourcery/Codex if present.

Settled means no check in `PENDING`, `QUEUED`, `IN_PROGRESS`, `WAITING`, `REQUESTED`, `EXPECTED`, `UNKNOWN`, `null`/empty. If any is still running, report `CHECKS_PENDING` and stop the final phase. After a push, re-read the PR only after checks complete on the new head SHA.

### Reviewer availability — who to actually wait for

On this repo the reviewers that appear on PRs are **CodeRabbit**, **Sourcery**, and **Codex**, plus the CI jobs. Real coverage that matters is green CI + CodeRabbit.

- **CodeRabbit** reviews the whole PR but **skips when the base is not the repo's default branch** (observed behavior: if `main` is not set as default branch it posts "Review skipped"). Not a bug to fix: set `main` as default branch (one-time owner action) or invoke `@coderabbitai review`.
- **Codex** is NOT a gate. On "You have reached your Codex usage limits" treat it as **absent**, not pending: do not wait, do not count it, do not block DONE on it.
- **Sourcery** is NOT a gate. On its weekly rate-limit message, treat it as absent.

Each push costs CI minutes. Batch review fixes into a single push per round; never push for cosmetic-only cleanups or to chase per-push-range false positives (a reviewer that only saw the last commit and thinks an earlier-commit implementation is "missing") — answer those in-thread with evidence, not a commit.

### Two-model AI review — mandatory labels

This repo has two AI code-review workflows (`.github/workflows/ai-review-fable.yml` → Anthropic Fable 5; `.github/workflows/ai-review-gpt.yml` → OpenAI). They run **only when triggered by a label** and comment the PR on every commit; they are **not blocking checks** and the merge stays manual (owner).

- **Before asking for / declaring a PR ready to merge it is MANDATORY to apply BOTH labels** `ai-review:fable` and `ai-review:gpt` and wait for both AI reviewers to have commented the current head.
- If a label is not yet applied, apply it (or ask the owner to); do not treat the PR as merge-ready until both AI reviews are present on the latest commit.
- AI reviews are **informative**: read them and, if they raise real actionable issues, fix them via the standard operative sequence; close false positives in-thread with evidence. They do not block DONE if CI is green and findings are handled.
- The two workflows need the Secrets `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` and the Variables `ANTHROPIC_REVIEW_MODEL` / `OPENAI_REVIEW_MODEL` (one-time owner setup). Without a key the workflow skips without breaking CI.

### Active PR monitoring — required

Reading comments once is not enough: after opening or updating a PR, follow it actively until it is merged or closed.

- **Subscribe to PR events** as soon as you create it (or when asked to watch one): use `subscribe_pr_activity` (GitHub MCP tool) to receive `<github-webhook-activity>` events in-session — failed CI, reviews, inline comments. If `subscribe_pr_activity` is unavailable, fall back to controlled polling of checks/comments (no rapid `sleep` loops), respecting the check completion gate.
- **For each event received:** investigate whether it is actionable. If the fix is small and safe, apply it (one patch, one push per round) and update status; if it is ambiguous or architectural, ask the owner before acting; if it is a known non-gate (Codex "usage limits", Sourcery rate-limit, CodeRabbit "Review skipped" because the base is not the default branch), skip with no action and say so.
- **Reply in threads with evidence, never "by feel":** for a resolved finding write `Fatto in commit <SHA>` with the commands run and their result (`pnpm check`: PASS, `pnpm test`: PASS, file:line); for a non-applicable one write `Skipped / already covered` with the reason (outdated/duplicate/already-fixed/out-of-scope) and the proof. Do not rely on webhooks as the only signal: CI success, new pushes, and merge-conflict transitions are not always delivered as events — verify via API when needed.
- **The subscription is not finished until the PR is merged or closed.** Do not spam PR comments: reply only when it genuinely helps (a fix that closes the point, or a question), not every round. Stop immediately if the owner asks you to stop.
- **A push costs CI minutes:** batch fixes into a single push per round; do not push for cosmetic cleanups or to chase per-push-range false positives (answer those in-thread with evidence).

### Post-merge tracking of late comments

Merge stays manual, owner-only. Because bot comments can arrive after the merge, the backstop is post-merge tracking. After a PR is merged/closed, when a review event lands on it, re-read it and look for inline comments / review bodies with `submitted_at` after the merge, unresolved threads, and check annotations. If something real/actionable is found, open a **GitHub Issue** recording each finding (PR number, head SHA, file:line, bot, severity, link) and, for real fixes, a **new dedicated fix PR** that branches from the latest `main` and follows the full sequence. Do not reuse or stack on the merged PR. One Issue may aggregate multiple findings; dedup before opening a new one.

**Last-5 PR sweep.** At the start of every task (inside Phase 0) and before final DONE, inspect the last 5 closed+merged PRs for unresolved or post-merge AI findings never addressed; record and dedup into an Issue. Opening the fix PR is deferred if another task/PR is active (one-active-task / one-open-PR wins).

### Review triage

For every review comment / inline thread, classify as `PATCH_REQUIRED`, `TEST_REQUIRED`, `EVIDENCE_RESOLVE`, `SKIP_OUTDATED`, `SKIP_DUPLICATE`, or `NEEDS_MANUAL`. Fix only active, non-outdated, current-head issues. For inline comments: open the referenced file/line, check whether it still applies to the current head, patch the smallest safe fix if it does, else provide evidence; if it cannot be mapped safely, report `NEEDS_MANUAL`.

**Evidence before resolving.** Never resolve "by feel". Before replying fixed/covered, have: commit SHA, file changed/inspected, test command, real result, technical reason. Reply in-thread with `Fatto in commit <SHA>` + evidence, or `Skipped / already covered` + reason + evidence. Mark a thread resolved only if all checks are complete, it is current-head, non-outdated, patched or already covered, relevant tests pass, you have permission, and no owner decision is needed. Merge stays manual.

### Final hard verify

```
FINAL_HARD_VERIFY

Phase 0:
- PASS / FAIL

Post-fix micro-audit:
- PASS / FAIL

Hard truthful tests:
- PASS / FAIL / SKIPPED with reason

Hard tests created/updated for the change:
- PASS / FAIL / N/A with reason

Docs updated for the change:
- PASS / FAIL / N/A with reason

Chip conservation & 50/50 rule intact:
- PASS / FAIL

GitHub checks completed:
- YES / NO

GitHub checks result:
- PASS / FAIL / PENDING

PR comments checked:
- YES / NO

Review bodies checked:
- YES / NO

Inline comments checked:
- YES / NO

Unresolved threads checked:
- YES / NO

Last-5 PR post-merge sweep:
- YES / NO

Safety invariants:
- PASS / FAIL

Merge:
- MANUAL ONLY

Final status:
- DONE / PARTIAL / NOT DONE / CHECKS_PENDING / NEEDS_MANUAL
```

If any required item is missing, do not declare DONE.

### Git and branch safety

Confirm the current branch is not `main`; if fixing a PR, confirm the branch matches; if new, branch from the correct base; confirm the remote exists; fetch latest before editing; do not force-push unless explicitly instructed. Commit only relevant files with a clear message; never include generated/temp files, logs, secrets, caches, `dist`, or artifacts. Push only to the existing PR branch (repair) or the new task branch (new task). If unable to push, respond exactly `NEEDS_MANUAL_UPDATE_BRANCH` and explain (current branch, expected branch, remote presence, push failure, missing credentials).

### Scope control

Modify only files required by the task/checks/review/handoff. Do not refactor unrelated code, expand scope, change game/settlement behavior unless required, modify CI config unless the task/failing check requires it, silence tests/checks to go green, delete tests unless required and documented, remove safety guards, or add real/sample secrets.

### Stop conditions

Stop and report `BLOCKED` if: another unrelated PR is open and a new task is requested; the task needs unsafe out-of-scope files; it would require work on `main`, auto-merge, exposing secrets, or disabling safety behavior without owner approval; it would break chip conservation, the 50/50 rule, the hierarchy, the variants, the deck, the §4 constraints, or the phase sequence without a clear plan; or the mode cannot be determined safely.

Do **not** stop when the task is to fix the currently open PR, or is triggered by review comments / failing checks / CodeRabbit / Sourcery / Codex feedback / a handoff for the currently open PR — continue on the same PR, push to the same branch, do not open a new PR, do not merge, report what changed and the commit SHA.

### Completion definition

Not complete until: the PR is created/updated; Phase 0 passed; micro-audit passed; hard truthful tests passed or explicitly skipped with a real reason; all current-head checks completed; relevant checks passed or clearly out of scope; showdown/chip/variant safety impact explained; blocking review comments resolved/outdated/handled with evidence; the PR is ready for owner review. Do not mark complete while checks fail/pend, while active review comments remain unresolved, after only editing files without running at least `pnpm check`, or with fake/assumed tests.

### Response formats

**After creating a new PR** — use the template in the "FORMATO RISPOSTA FINALE" section of `CLAUDE.md` (Summary, Branch, PR, Commit, Safety, Phase 0, Micro-audit, Hard tests, GitHub checks, Review comments handled, Files changed, Final hard verify, Notes).

**When checks are pending:**

```
CHECKS_PENDING

Reason:
- Current-head PR checks are not all finished yet.

Current head:
- <SHA>

Pending checks:
- <check name>

Next allowed action:
- Wait for checks to complete, then re-read checks, annotations, review bodies, inline comments, unresolved threads, and only then decide final status.
```

**When blocked:**

```
BLOCKED

Reason:
- <why work cannot proceed safely>

Detected mode:
- <Current PR repair / New task / Unknown>

Current state:
- Open PR: <number or unknown>
- Current branch: <branch or unknown>
- Expected branch: <branch or unknown>

Required owner action:
- <what the repository owner must do next>
```

If unable to create the PR or push the branch, respond exactly `NEEDS_MANUAL_UPDATE_BRANCH` and explain why.

### Golden rule

Do not try to "do everything". A small, clear, safe patch beats a big rewrite. The game must stay predictable and correct:

> intact deck → correct hand evaluation → correct per-variant comparison → exact 50/50 pot split → chips conserved.

Any change that breaks this chain must be blocked or explicitly approved by the owner. Merge stays always manual.
