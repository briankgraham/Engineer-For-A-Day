# AI Pairing: scenario ideas

Existing scenarios (all JS): lru-ttl, rate-limiter, emitter-bugs, csv-parser, debounce-retry, checkout (Medium), async-pool (Hard), tasks-api (Medium), undo-redo (Medium), offline-sync (Hard), bill-split (Easy), streak-counter (Easy), middleware-router (Hard), review-room-booking (Medium, code review), elevator (Hard, object design: design.md first, follow-up requirement midway).
Mark items `[x]` when built. Each scenario needs the usual set (`scenario.json`, `secret.json`, `mutants.json`, `files/`, `solution/`, `visible_tests.js`, `tests.js`) and must pass `node scripts/verify_aipair.js`.
Tests can be `async` and use `mkDeferred()` / `flush()` (see Readme.md).

## Formats we do not cover yet

- [x] **Code review a PR (Medium), built as `review-room-booking`.** Review-then-fix in the normal workspace: a read-only "pull request" tab (`pr.md`: description, diff, a bot's LGTM), the PR's own tests as the visible tests (all green), findings written in a `review.md` tab, then fixes. `secret.json` has `issues` (4 bugs seeded in the PR: a covering booking not a clash, zero-length accepted, `splice(-1, 1)` in cancel, `sort()` leaking the internal array) graded found/fixed/missed, plus 4 chat flaws. More review scenarios could reuse the format: a security-flavoured PR (path traversal, unescaped HTML), a perf PR (N+1 or O(n²)), or a PR where the bug is in what's missing (no tests for the risky branch).
- [x] **Add a feature to a small multi-file app (Medium), built as `tasks-api` (REST handlers) and `undo-redo` (editor state).** For example pagination or soft-delete in a mini REST handler layer. Tests reading unfamiliar code and not breaking existing tests.
- [x] **Debug from a failing log or stack trace (Medium), built as `debug-usage-report`.** New `"kind": "debug"`: a read-only "incident" tab (`incident.md`: ticket, what was tried, job log with stack traces, a support ticket), and the job's own tests are green (like review scenarios), so there is no failing test to follow. Two bugs: a module-level `Map` in `report.js` leaks usage between tenants (the TypeError is only the symptom; the manual re-run that works is the clue), and the report total is rounded separately from the rows (1 cent off). The assistant does not see the incident page; the candidate pastes in what they want. Planted flaws: a null guard that hides the crash, a "race condition" red herring (lock/retry), and blaming floating point for the cent. Note: top-level `require` in test files is shared across tests, so tests that depend on fresh module state must `require` lazily. Ideas for more debug scenarios: a memory/timer leak, a timezone/date bug seen in logs, a flaky async ordering bug.
- [ ] **Refactor with tests as a safety net (Easy).** Untangle a messy module without changing behavior. Grades running the tests between steps (uses the `activity` data).

## Algorithmic / library-style scenarios

- [ ] **Diff / merge / patch (Hard).** 3-way merge, JSON diff, or an LCS text diff. Subtle edge cases where confident wrong answers slip through.
- [ ] **Dependency resolver / topological scheduler (Medium).** Cycle detection with a useful error, stable ordering, parallel "levels".
- [ ] **Template / expression engine (Hard).** A `{{ }}` renderer with escaping, or an arithmetic evaluator with precedence.

## Difficulty range

Now: two Easy (bill-split, streak-counter), ten Medium (one the code-review scenario, one the debugging scenario), three Hard.
- [x] An Easy warm-up scenario, built as `bill-split` (short, one function, 2 or 3 planted flaws). Chosen: **add a tip and split to a bill calculator** (feature format, 2 or 3 small files, about 25 minutes). Split N ways with cents that do not divide evenly, plus an optional tip percent. Planted flaws: floats instead of integer cents; remainder cents dropped or given to everyone; tip applied after tax when the spec says before. Other Easy candidates: search for a bookmarks list (case-insensitive, `tag:` filter, relevance sort).
- [x] A second Easy scenario, built as `streak-counter` (login/activity streak from a list of dates, with a grace-day parameter, about 25 minutes; `today` and dates are plain "YYYY-MM-DD" strings rather than an injected clock, to keep it simple). Planted flaws: off-by-one in the grace-day gap check (`gap <= graceDays` instead of `gap - 1 <= graceDays`, which breaks even a plain consecutive streak); duplicate dates not deduplicated before counting; no check that the most recent activity is recent enough, so a stale streak from long ago still counts.
- [x] A second Hard scenario: `offline-sync` (queue, idempotent retries, pull/merge with tombstones).
- [x] A third Hard scenario: `middleware-router` (Express-style middleware chain: `next()` called twice, async handler rejections, error-handler order/registration).

## Other

- [ ] Non-JS languages (Python or TypeScript). Needs a test runner beyond the JS worker harness.
