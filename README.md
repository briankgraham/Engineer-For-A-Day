## Leetcode Company wise Problems Lists

- Curated lists of Leetcode questions grouped by company, updated as of 1 June 2025.
- All company data lives in a single file, `data/companies.csv`: one row per (company, problem).

### Screenshots

Run `python3 server.py` and open http://localhost:8000.

**Browse, filter and track progress.** Search by title or topic, filter by difficulty and company, sort by frequency, and tick problems off as you solve them.

![Filtering problems and marking one done](docs/media/filtering.gif)

| Dark | Light |
| --- | --- |
| ![Problem table, dark theme](docs/media/problems-dark.jpg) | ![Problem table, light theme](docs/media/problems-light.jpg) |

**Learn.** An AI walkthrough takes each problem from brute force to the optimal solution, in Python, JavaScript or TypeScript.

![Learn walkthrough for LRU Cache](docs/media/learn-walkthrough.jpg)

**Practice.** Write a solution in the browser and run it against the tests.

![Running tests on the practice editor](docs/media/practice-run.gif)

![Practice editor with all tests passing](docs/media/practice.jpg)

**System Design Prep.** A guided path from fundamentals to full designs, with topics, problems and mock interviews.

![System Design Prep tab](docs/media/system-design.jpg)

**Mock interview.** Pick a problem and a time limit, then work through it against a framework pacing timer. You can ask an AI interviewer clarifying questions and keep estimates in a scratchpad.

![Starting a mock interview, asking the AI interviewer a question, and taking notes](docs/media/mock-interview.gif)

During an interview, open the whiteboard to sketch the design: boxes, databases, ellipses and text, with arrows that connect shapes and follow them when you move them. Export as SVG or PNG, or ask the AI to evaluate the diagram.

![Sketching a rate limiter design on the whiteboard, then getting an AI evaluation](docs/media/whiteboard.gif)

When you finish, score yourself on each framework step and save the attempt, with your reflection and scratchpad, to your history.

![Self-scoring a mock interview and saving the attempt](docs/media/mock-scoring.gif)

**Behavioral.** A bank of common behavioral questions ("Tell me about a time you disagreed with your manager"), each tagged with the competencies it tests (conflict, ambiguity, failure, influence, mentoring and so on) and the companies known to ask it, with the Amazon Leadership Principle it probes. Filter by competency, company or review status. The competency chips show how many questions you've practiced for each, so gaps stand out. **Practice one** picks a due question first, then one you haven't practiced, with a timer for a 2 to 3 minute answer. A question you mark practiced comes back on the same 3, 7, 21 day schedule as LeetCode reviews. Each question has a note for the story you'd use. Progress is saved in your browser and included in **Export progress**.

**Interview me with AI** (on the Practice card, or **Interview** on any question) runs a mock behavioral round for your target level (Senior or Staff, picked at the top of the tab). The AI asks the question, then reads your answer and asks follow-ups about its weakest part: what *you* did rather than "we", how you measured the result, what the other side thought, what you'd do differently. It asks again if you dodge a question, and stays in character with no coaching until you finish. Type or dictate your answers. **Finish and grade** scores structure, ownership, scope for the level, results, reflection and communication, quoting the lines that cost you, says whether the story reads at your target level, and lists follow-ups to prepare. Each graded attempt is saved under **Past AI interviews** and counts as practicing the question.

**Jobs.** A tab of live US software openings from the companies in this tracker, filterable by keyword, company, state, seniority (internship through management), remote and how recently they were posted, with a link to each posting. Selecting the tab and filtering only read the local server's cache. The **Refresh** button is the only thing that contacts the public Greenhouse, Lever, Ashby and Workday job boards (through `server.py`, at most once every 5 minutes), so the first time you open it, click Refresh. Only companies on those systems are covered (about a third of the tracker); Google, Amazon, Meta, Microsoft and Apple run their own career sites, so the tab links to them instead. `python3 scripts/build_jobs_boards.py` rebuilds `data/jobs_boards.json`, the company-to-board mapping. Workday is one generic connector configured per company as `{"ats": "workday", "host", "tenant", "site"}`; add one with `python3 scripts/build_jobs_boards.py --workday "CrowdStrike" crowdstrike.wd5.myworkdayjobs.com/crowdstrikecareers`, or let the script probe for the tenant.

### Layout

| Path | What |
| --- | --- |
| `server.py` | entry point for the local server |
| `app/` | server code: config, LLM backends, features, routes |
| `web/` | the page (`index.html`) and its scripts |
| `data/` | `companies.csv`, the generated `GLOBAL.csv`, `jobs_boards.json` |
| `aipair_scenarios/` | AI Pairing scenarios |
| `day_scenarios/` | Engineer for a Day scenarios |
| `scripts/` | rebuild and check scripts |
| `docs/` | screenshots and TODO notes |
| `var/` | git-ignored caches and logs: AI walkthroughs and practice exercises, job listings, AI Pairing and Engineer for a Day sessions |

### `data/companies.csv`

Columns: `Company, Difficulty, Title, Link, Topics, Freq30d, Freq3m, Freq6m, FreqOlder, FreqAll`

The `Freq*` columns are how often the company asked the problem in each recency window: the past 30 days, 3 months, 6 months, more than 6 months ago, and all time. A blank means it wasn't asked in that window. Use the window that matches how long you have before your interview.

### Rebuilding

`data/GLOBAL.csv` (problems ranked across all companies) and the data embedded in `web/index.html` are generated from `data/companies.csv`:

```
python3 scripts/build_global.py                  # rank by all-time frequency
python3 scripts/build_global.py --window 30d     # or 3m, 6m, older
```

The same script also embeds `data/senior_favs.json`, a hand-curated list of problems that come up a lot in senior loops, with why each is asked and a typical follow-up. These problems get a **Senior** badge (hover it for the note), and the **Senior favs** checkbox shows only them. To change the list, edit the JSON and rerun the script. It stops with an error if a slug isn't in the data.

### AI Pairing tab

Build a small JavaScript project with an AI coding assistant that is sometimes subtly wrong on purpose, then get graded on how you worked with it. Needs `python3 server.py` (the AI uses your `claude` login, same as the other tabs).

Each scenario is a folder in `aipair_scenarios/<id>/`:

| File | Sent to the browser? | Purpose |
| --- | --- | --- |
| `scenario.json` | yes | title, brief, requirements, list of editable files |
| `files/` | yes | starter code |
| `tests.js` | yes | hidden tests, run in a Web Worker (`test`, `assert`, `eq`, `throws`, `require`, `mkClock`, `mkDeferred`, `flush` are provided; tests may be `async`, and a promise that never settles fails after 2s) |
| `visible_tests.js` | yes | optional. Turns on visible-tests mode: the file appears as a read-only tab, **Run tests** runs only it, the assistant can read it, and `tests.js` becomes extra hidden edge cases that run together with it on Finish (their names are prefixed `[hidden]`). The starter should pass some visible tests and fail others, e.g. `checkout/` |
| `pr.md` | yes | review scenarios only (`"kind": "review"` in `scenario.json`): the pull request page (description, a ```` ```diff ```` block, a review-bot comment), shown as a read-only "pull request" tab. The starter files are the PR branch, `visible_tests.js` is the PR's own (passing) tests, and the candidate writes findings in an extra `review.md` tab, e.g. `review-room-booking/` |
| `followup_visible_tests.js`, `followup_tests.js` | yes | object design scenarios only (`"kind": "lld"`, with a `followup` {title, brief, requirements} in `scenario.json`). The candidate writes an editable `design.md` first (code files stay read-only until then), and the follow-up requirement appears when the visible tests first all pass or at 60% of the time. From then on these tests run with the others, and the evaluator sees a diff of every change made after the reveal, e.g. `elevator/` |
| `secret.json` | never | the planted flaws: `id`, `title`, `trigger`, `wrongClaim`, `correctBehavior`. Review scenarios also list `issues` (the bugs seeded in the PR: `id`, `title`, `severity`, `where`, `detail`), which the evaluator grades `review.md` and the fixes against. In object design scenarios a flaw can be `"design": true` (design advice, no mutant; the evaluator judges it) or `"followup": true` (offered only after the follow-up is revealed) |
| `solution/` | never | reference solution |
| `mutants.json`, `mutants/` | never | one deliberately flawed variant of the solution per planted flaw (and per seeded issue in review scenarios) |

Which replies were flawed is logged server-side in `var/aipair_sessions/` (git-ignored), never sent to the browser. The evaluator reads that log when you press Finish.

After adding or changing a scenario, check it:

```
node scripts/verify_aipair.js              # all scenarios, or pass ids
```

It runs the real test harness (visible and hidden tests together) and requires that the starter does not pass everything (and, in visible-tests mode, passes some visible tests and fails others), the solution passes every test, and every planted flaw has a mutant that at least one test catches. Review scenarios instead require the PR's own visible tests to all pass on the starter (CI is green), and every seeded issue needs a caught mutant too. Object design scenarios need the follow-up files, run the follow-up tests with the rest, and skip the mutant check for design flaws.

### Engineer for a Day tab

A simulated workday on a fake team (`web/day.js`, `/api/day/*` in `app/routes/day.py` + `app/features/day.py`). You get a small repo, Slack-style channels and DMs, a ticket, a PR to review, docs, production logs and an end-of-day handoff. A scripted timeline runs on a compressed clock (9:00 AM to 5:30 PM in about 75 minutes, paused while the tab is hidden), and AI coworkers reply in each thread. Each coworker has a hidden agenda, and some say subtly wrong things (planted flaws, as in AI Pairing). **End day** runs every test suite in the browser, then a manager-style review scores debugging, code quality, testing, review, communication, prioritization and judgment, and grades each task. The test harness, runner and Apply helpers are shared with AI Pairing through `web/workspace.js`.

Two days so far: `shipfast-orders` (orders & payments: discount codes, double charges, a charge-retry PR, an outbox RFC) and `huddle-notifications` (push notifications: quiet hours, duplicate pushes from whole-event queue redelivery, an in-memory rate limiter PR, a per-follower fan-out RFC).

Each day is a folder in `day_scenarios/<id>/`:

| File | Sent to the browser? | Purpose |
| --- | --- | --- |
| `day.json` | yes | `service` (repo name shown in the UI), `testFile` (name of the existing suite), `incident` (`name`, and the timeline id of the `page`), personas (public card), channels (members, default responder; `locked` until unlocked), tickets, PRs, docs, logs, repo file list, tasks, and the `timeline`: events with `at` (sim time) and/or `when` (a trigger: `incident_resolved`, `pr_reviewed:<id>`, `ticket_replied:<id>`, `posted:<channel>`), optional `unless` and `after`, doing a `message`, `page` or `nudge` (repeats while a channel stays quiet), and optionally unlocking items |
| `files/` | yes | the repo at the start of the day |
| `tests/visible.js` | yes | the existing suite (read-only tab, must pass on the starter) |
| `tests/feature.js`, `tests/incident.js` | yes | hidden suites, run when the day ends (must fail on the starter) |
| `prs/`, `docs/`, `logs/` | yes | the PR page, docs and production log (`logs.example` in day.json is the filter hint) |
| `secret.json` | never | per-persona voice, agenda and knowledge (`seesCode: true` gives that coworker the candidate's working copy); planted flaws (each names a `persona`; `"judged": true` means no mutant, the reviewer judges it); the PR's seeded `issues`; the incident root cause; key points per task |
| `solution/`, `mutants.json` | never | reference fix and one mutant per testable flaw |

Served flaws are logged in `var/day_sessions/` (git-ignored). Check a day after changing it:

```
node scripts/verify_day.js                 # all days, or pass ids
```

For testing, `?dayspeed=20` in the URL runs the clock 20x faster.

- System Design Notes: https://github.com/liquidslr/system-design-notes
