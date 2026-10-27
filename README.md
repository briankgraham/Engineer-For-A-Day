# Engineer for a Day

> **Hey. We don't want your money. We don't want your data. We want you to learn.**
>
> There's no $49/month "Pro" tier. No "unlock this hint for 3 credits." No 11-part thread about how you're one cohort away from a FAANG offer. No guy in a rented Lamborghini explaining that the secret is to *wake up at 4am*.
>
> It's one Python file on your laptop. The only thing we'll ask you to pay for is your Claude account, and honestly, that's between you and Anthropic.
>
> Go get the job. Then tell a friend how, and quietly prove wrong the guy who asks "if you're not at Meta, are you really engineering?"

**Your whole interview loop in one local app, so the real one feels like a rerun.**

Interviews ask for more than reversing a linked list now. You'll be asked to design a system on a whiteboard, tell a story about the time you disagreed with your manager, pair with an AI that's confidently wrong, review someone's PR, and stay calm while production is on fire. This app lets you practice all of it before it counts.

It runs on your machine and keeps everything there. The AI parts use your existing `claude` login.

```
python3 server.py
# open http://localhost:8000
```

That's all the setup. Pick a tab and start.

---

## What's in the box

| Tab | What you're practicing |
| --- | --- |
| 🏢 **Engineer for a Day** | A full simulated workday: tickets, a PR, Slack, an incident, a handoff |
| 🤝 **AI Pairing** | Building with an AI assistant that's sometimes quietly wrong |
| 🏗️ **System Design Prep** | Fundamentals, timed mock interviews, and a whiteboard |
| 🎤 **Behavioral** | STAR stories, plus an AI interviewer that asks follow-ups until it gets specifics |
| 🧩 **LeetCode** | Company-tagged problems with walkthroughs and an in-browser editor |
| 📚 **Learning** | The fundamentals behind the problems and behind full-stack screens: algorithm tracks (graphs, trees, heaps, intervals, tries, dynamic programming) plus JavaScript/TypeScript, HTTP, auth and security, browser and frontend, SQL, and concurrency and async |
| ⏱️ **Assessment** | Timed online-assessment (OA) style tests with hidden test cases |
| 💼 **Jobs** | Live openings from the companies you're prepping for |

---

## 🏢 Engineer for a Day

This one gave the app its name. It's the closest thing to a work trial without the work trial.

It's your first day on a fictional team. You get a small repo, Slack-style channels and DMs full of coworkers, a ticket to ship, a PR to review, docs, production logs, and an incident page that arrives around lunch. The clock runs from 9:00 AM to 5:30 PM in about 75 minutes, and it pauses when you switch away from the tab.

Your coworkers are AI, and each has their own agenda. Some of them will tell you things that sound right and aren't. When you click **End day**, every test suite runs and a manager-style review scores how you debugged, the quality of your code and tests, how you reviewed the PR, how you communicated, and the calls you made about what mattered.

Eight days to choose from:

- **ShipFast: orders & payments.** Ship discount codes, review a charge-retry PR, and work out why customers are being charged twice.
- **Huddle: push notifications.** Build quiet hours, review an in-memory rate limiter, and track down duplicate pushes.
- **Plotline: subscriptions & billing.** Handle mid-cycle upgrades, review a renewal batch job, and find out why people are charged after they cancel. (Hint: time zones are involved.)
- **Flagship: feature flags.** Build percentage rollouts, review an evaluation-cache PR, and find out why a kill switch isn't killing anything on some servers.
- **Scrapbook: the feed API.** Build muted words, review a page-numbers PR, and work out why people see the same photo twice while other posts go missing.
- **Kestrel: the storefront web app.** Build a cart quantity stepper (optimistic updates, rollback, undo), review a search-highlighting PR (regex injection and XSS), and work out why shoppers searching for "shoes" get results for "sh". A frontend day: state, async races and escaping, without a DOM.
- **Brightway: the quote service (inherited code).** Add multi-parcel quotes to a 2017 pricing function with almost no tests and a wiki that is wrong in places, review a "no behavior change" refactor, and find out why some customers' quotes keep getting cheaper through the morning. The day is about reading code you did not write and changing it safely.
- **Tessera: the accounts service (zero-downtime migration).** Build the backfill and verification for a live expand/contract database migration, review a "finish the migration and drop the column" PR, and find out why people can't sign in, but only on one server.

## 🤝 AI Pairing

More and more interviews hand you an AI assistant and watch how you use it. Here you build small JavaScript projects with an assistant that is helpful most of the time, but some of its replies contain flaws planted on purpose. At the end you're graded on the code and on how well you worked with it: whether you caught its mistakes, checked its claims, and ran the tests.

28 scenarios from Easy to Hard: URL slugs for a blog, an LRU cache with TTL, a token-bucket rate limiter, a key-value store with nested transactions, offline sync, an Express-style middleware router, a **PR review** round, a **debug-from-an-incident-ticket** round, an **elevator object-design** round where the requirements change partway through, a **Battleship** round (debug a broken board, then write the solver that sinks the fleet), and more.

![AI Pairing: the editor next to an AI assistant that has just answered a question](docs/media/ai-pairing.jpg)

## 🏗️ System Design Prep

A guided path from the fundamentals to full designs, with topics, practice problems and mock interviews.

![System Design Prep tab](docs/media/system-design.jpg)

**Mock interviews.** Pick a problem and a time limit, then work through it with a pacing timer for each step of the framework. Ask the AI interviewer clarifying questions, and keep your back-of-envelope math in a scratchpad.

![Starting a mock interview, asking the AI interviewer a question, and taking notes](docs/media/mock-interview.gif)

**Whiteboard.** Sketch the design with boxes, databases and arrows that stay attached when you move things. Export it as SVG or PNG, or ask the AI to critique it.

![Sketching a rate limiter design on the whiteboard, then getting an AI evaluation](docs/media/whiteboard.gif)

**Score yourself** on each step of the framework, then save the attempt to your history with your reflection and scratchpad.

![Self-scoring a mock interview and saving the attempt](docs/media/mock-scoring.gif)

## 🎤 Behavioral

"Tell me about a time you disagreed with your manager." Better to have that story ready in advance.

- **A question bank** tagged by competency (conflict, ambiguity, failure, influence, mentoring and more), by the companies known to ask each question, and by the Amazon Leadership Principle it probes. Competency chips show where you've practiced and where you have gaps.
- **Practice one** picks a question that's due for review (or one you haven't tried), then times a 2 to 3 minute answer. Questions come back on a 3, 7 and 21 day spaced-repetition schedule, and each one has a notes field for the story you'd tell.
- **Interview me with AI** runs a mock round for your target level, Senior or Staff. The interviewer asks follow-ups aimed at the weakest part of your answer: what *you* did rather than "we", how you measured the result, what you'd do differently. It won't let you dodge. **Finish and grade** scores your answer, quotes the lines that cost you points, and tells you whether the story reads at the level you're targeting.

## 🧩 LeetCode

Algorithms still come up, so this tab covers them too. It has tons of problem-company pairs across about 430 companies, with how often each company asked each problem in the last 30 days, 3 months, 6 months and earlier.

**Browse, filter and track.** Search by title or topic, filter by difficulty and company, sort by how often it's asked, and tick problems off as you solve them. Problems that come up a lot in senior loops get a **Senior** badge with a note on why they're asked.

![Filtering problems and marking one done](docs/media/filtering.gif)

| Dark | Light |
| --- | --- |
| ![Problem table, dark theme](docs/media/problems-dark.jpg) | ![Problem table, light theme](docs/media/problems-light.jpg) |

**Learn.** An AI walkthrough takes each problem from brute force to the optimal solution, in Python, JavaScript or TypeScript.

![Learn walkthrough for LRU Cache](docs/media/learn-walkthrough.jpg)

**Practice.** Write your solution in the browser and run it against the tests.

![Running tests on the practice editor](docs/media/practice-run.gif)

![Practice editor with all tests passing](docs/media/practice.jpg)

## 📚 Learning

LeetCode assumes you already know the basics. If writing an adjacency list from memory still takes a minute of thinking, start here.

![Learning tab: ten tracks, from graphs to concurrency](docs/media/learning.jpg)

Each track is a path of short lessons. The first one, **Graphs**, goes from "what is a graph" through representations, DFS, BFS, grids, union-find, topological sort and Dijkstra, then teaches you to recognize which technique a problem wants, and finishes with graph databases in system design.

The **Intervals** track covers overlap tests, merging, inserting, intersecting two schedules, greedy picking (sort by end) and the sweep line, with step-through visualizers for merge and the sweep, and a LeetCode checkpoint of Meeting Rooms I and II, Merge and Insert Interval, Car Pooling and more.

The **Tries** track builds a prefix tree from scratch, then uses it for autocomplete, replace-words, prefix sums, wildcard search, Word Search II and maximum XOR, with step-through build and search visualizers.

The **Dynamic programming** track teaches state, transition and base case, then 1D DP, grid DP, knapsack and subset sum, and two-string tables (LCS, edit distance), with a step-through table visualizer that fills one cell at a time and highlights the cells it reads.

- **Learn.** Readable lessons with templates worth memorizing, and step-through visualizers for DFS, BFS, components, topological sort and Dijkstra that show the stack, queue or heap at every step.

![BFS lesson: the step-through graph visualizer above the template it animates](docs/media/learn-bfs.jpg)

- **Drill.** An adjacency-list drill draws a random graph and checks the list you write for it. Every code exercise has **Drill from memory**: it clears the editor, blurs the templates and times you.
- **Practice.** Code exercises run against real tests in your browser. Quick checks explain the answer. Written answers (like "should this use Neo4j?") get feedback from the AI tutor, and the AI can review your code too.
- **Track it.** Mark lessons complete, flag ones to revisit, and keep notes. Completed lessons come back for review after 3, 7 and 21 days. An **Ask the tutor** panel knows the lesson you're reading.
- **Ready for LeetCode.** Each track ends with real problems from the LeetCode tab, in order, each linked to the lesson that prepares you for it.

**Full-stack fundamentals.** Six more tracks cover what screens and phone interviews open with: **JavaScript and TypeScript** (closures, `this`, the event loop, coercion, the type system), **HTTP and the web platform** (methods, caching, CORS, API styles, URL-to-page), **Auth and web security** (sessions vs JWTs, OAuth and PKCE, XSS, CSRF, injection, passwords), **Browser and frontend** (rendering, events, React, performance, accessibility) **SQL and data** (joins and NULLs, window functions, indexes, transactions, schema design) and **Concurrency and async** (promise patterns and pools, threads vs processes, race conditions, locks and deadlocks, queues and backpressure, retries and idempotency). Each lesson is a short read, quick checks that explain every answer, and an "explain it" question the AI tutor reviews. They have no LeetCode checkpoint, but they use the same notes, review dates and tutor.

## ⏱️ Assessment

Timed tests in the style of an online assessment. Choose Quick (1 Medium in 30 minutes), Standard (Easy, Medium, Medium in 60) or Tough (Medium, Medium, Hard in 90). As on the real platforms, you see a couple of sample cases and the rest of the tests are hidden.

## 💼 Jobs

When you're ready to apply, this tab lists live software openings from the companies in the tracker, limited to Remote roles, the SF Bay Area (San Francisco plus nearby cities through Santa Clara and San Jose) and Austin. Filter by keyword, company, area, seniority, and how recently the job was posted. Click **Refresh** the first time you open it to pull fresh listings.

---

## A game plan, if you want one

1. **Week 1:** Do one Engineer for a Day to see where you stand. The review shows what to work on.
2. **Every day:** Two LeetCode problems from your target company's 30-day list, plus one behavioral question.
3. **Twice a week:** A timed system design mock on the whiteboard, and one AI Pairing scenario.
4. **Before the onsite:** A Tough assessment, an AI behavioral round at your target level, and another workday.

Progress is saved in your browser. Use **Export progress** to back it up.

Good luck. 🚀

---

## Under the hood

<details>
<summary><b>Setup and AI backends</b></summary>

By default the server runs your logged-in `claude` CLI in headless mode, so you don't need an API key and usage counts against your Claude plan. To use the Anthropic API instead:

```
pip install anthropic
export ANTHROPIC_API_KEY=...        # or put it in a git-ignored .env file
WALKTHROUGH_BACKEND=api python3 server.py
```

Other environment variables: `PORT` (8000), `WALKTHROUGH_MODEL`, `WALKTHROUGH_PER_MINUTE` (10), `WALKTHROUGH_DAILY_CAP` (200), `CLAUDE_BIN` (claude). The server listens only on loopback.

</details>

<details>
<summary><b>Project layout</b></summary>

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

</details>

<details>
<summary><b>LeetCode data and rebuilding</b></summary>

All company data lives in `data/companies.csv` (updated as of 1 June 2025), one row per (company, problem).

Columns: `Company, Difficulty, Title, Link, Topics, Freq30d, Freq3m, Freq6m, FreqOlder, FreqAll`

The `Freq*` columns are how often the company asked the problem in each window: the past 30 days, 3 months, 6 months, more than 6 months ago, and all time. A blank means it wasn't asked in that window. Use the window that matches how long you have before your interview.

`data/GLOBAL.csv` (problems ranked across all companies) and the data embedded in `web/index.html` are generated from `data/companies.csv`:

```
python3 scripts/build_global.py                  # rank by all-time frequency
python3 scripts/build_global.py --window 30d     # or 3m, 6m, older
```

The same script embeds `data/senior_favs.json`, a hand-curated list of problems that come up a lot in senior loops, with why each is asked and a typical follow-up. These get the **Senior** badge (hover it for the note), and the **Senior favs** checkbox shows only them. To change the list, edit the JSON and rerun the script. It stops with an error if a slug isn't in the data.

</details>

<details>
<summary><b>Jobs data sources</b></summary>

Selecting the tab, filtering and the **Refresh** button only read the local server's cache. A watchdog thread in `server.py` fetches the public Greenhouse, Lever, Ashby and Workday job boards once every 24 hours (the last-fetch time is saved in `var/jobs_cache/_meta.json`, so restarting the server does not reset the clock; delete that file to force a fetch on next start). Only companies on those systems are covered (about a third of the tracker). Google, Amazon, Meta, Microsoft and Apple run their own career sites, so the tab links to them instead.

`python3 scripts/build_jobs_boards.py` rebuilds `data/jobs_boards.json`, the company-to-board mapping. Workday is one generic connector configured per company as `{"ats": "workday", "host", "tenant", "site"}`. Add one with `python3 scripts/build_jobs_boards.py --workday "CrowdStrike" crowdstrike.wd5.myworkdayjobs.com/crowdstrikecareers`, or let the script probe for the tenant.

</details>

<details>
<summary><b>Writing an AI Pairing scenario</b></summary>

Each scenario is a folder in `aipair_scenarios/<id>/`:

| File | Sent to the browser? | Purpose |
| --- | --- | --- |
| `scenario.json` | yes | title, brief, requirements, list of editable files |
| `files/` | yes | starter code |
| `tests.js` | yes | hidden tests, run in a Web Worker (`test`, `assert`, `eq`, `throws`, `require`, `mkClock`, `mkDeferred`, `flush` are provided; tests may be `async`, and a promise that never settles fails after 2s) |
| `visible_tests.js` | yes | optional. Turns on visible-tests mode: the file appears as a read-only tab, **Run tests** runs only it, the assistant can read it, and `tests.js` becomes extra hidden edge cases that run together with it on Finish (their names are prefixed `[hidden]`). The starter should pass some visible tests and fail others, e.g. `checkout/` |
| `pr.md` | yes | review scenarios only (`"kind": "review"` in `scenario.json`): the pull request page (description, a ```` ```diff ```` block, a review-bot comment), shown as a read-only "pull request" tab. The starter files are the PR branch, `visible_tests.js` is the PR's own (passing) tests, and the candidate writes findings in an extra `review.md` tab, e.g. `review-room-booking/` |
| `incident.md` | yes | debug scenarios only (`"kind": "debug"`): the incident ticket (what is known, what was tried, job log with stack traces, a support ticket), shown as a read-only "incident" tab. The assistant cannot see it, so the candidate has to paste in what they want help with. `visible_tests.js` is the code's own (all passing) tests, and the hidden tests encode the real cause. e.g. `debug-usage-report/` |
| `followup_visible_tests.js`, `followup_tests.js` | yes | object design scenarios only (`"kind": "lld"`, with a `followup` {title, brief, requirements} in `scenario.json`). The candidate writes an editable `design.md` first (code files stay read-only until then), and the follow-up requirement appears when the visible tests first all pass or at 60% of the time. From then on these tests run with the others, and the evaluator sees a diff of every change made after the reveal, e.g. `elevator/` |
| `level<k>_visible_tests.js`, `level<k>_tests.js` | yes | multi-level scenarios only (`"kind": "levels"`, with `levelTitle` and a `levels` list of {title, brief, requirements} for level 2 onward in `scenario.json`), like a timed multi-level coding assessment. Level 1 is the normal brief and test files; level k unlocks when every visible test so far passes, and from then on its tests run with the others. The assistant only sees unlocked levels, and a flaw with `"level": k` is offered only from that level on, e.g. `bank-levels/` |
| `secret.json` | never | the planted flaws: `id`, `title`, `trigger`, `wrongClaim`, `correctBehavior`. Review scenarios also list `issues` (the bugs seeded in the PR: `id`, `title`, `severity`, `where`, `detail`), which the evaluator grades `review.md` and the fixes against. In object design scenarios a flaw can be `"design": true` (design advice, no mutant; the evaluator judges it) or `"followup": true` (offered only after the follow-up is revealed) |
| `solution/` | never | reference solution |
| `mutants.json`, `mutants/` | never | one deliberately flawed variant of the solution per planted flaw (and per seeded issue in review scenarios) |

Which replies were flawed is logged server-side in `var/aipair_sessions/` (git-ignored), never sent to the browser. The evaluator reads that log when you press Finish.

After adding or changing a scenario, check it:

```
node scripts/verify_aipair.js              # all scenarios, or pass ids
```

It runs the real test harness (visible and hidden tests together) and requires that the starter does not pass everything (and, in visible-tests mode, passes some visible tests and fails others), the solution passes every test, and every planted flaw has a mutant that at least one test catches. Review scenarios instead require the PR's own visible tests to all pass on the starter (CI is green), and every seeded issue needs a caught mutant too. Object design scenarios need the follow-up files, run the follow-up tests with the rest, and skip the mutant check for design flaws. Multi-level scenarios need the test files of every level and run all levels together.

</details>

<details>
<summary><b>Writing an Engineer for a Day scenario</b></summary>

The tab lives in `web/day.js` and `/api/day/*` (`app/routes/day.py` + `app/features/day.py`). The test harness, runner and Apply helpers are shared with AI Pairing through `web/workspace.js`. Coworkers' planted flaws work like the ones in AI Pairing.

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

</details>

<details>
<summary><b>Adding to the Learning tab</b></summary>

The curriculum is plain data in `web/learn_data.js`, and `web/learn.js` renders it. Add a track by appending to `LEARN_TRACKS`, or add a lesson to an existing one. The comment at the top of the file lists the block types (markdown, templates, callouts, visualizers, the adjacency drill) and the practice types (code exercises with tests, quick checks, AI-reviewed written answers). AI review and the tutor go through `/api/learn/*` (`app/routes/learn.py`). The page sends the lesson text, so no server change is needed for new lessons. A new track file (like `web/learn_fundamentals.js` or `web/learn_concurrency.js`) also needs its name added to the script chain in `openLearnTab` in `web/index.html`, to the static file list in `app/routes/static.py`, and to `LEARN_FILES` in `scripts/verify_learn.js`.

After changing exercises, check them:

```
node scripts/verify_learn.js
```

It runs every code exercise through the real test harness. The reference solution must pass every test and the starter must not. It also checks ids, quiz answers, visualizer graphs and LeetCode slugs.

</details>

## Dependencies

The server uses only the Python standard library, and there's no `npm install`. These are the things the app does rely on:

| Dependency | Required? | Used for |
| --- | --- | --- |
| [Python 3](https://www.python.org/) | yes | runs `server.py` and the `scripts/build_*.py` data scripts |
| [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (`claude`) | yes, for AI features (default backend) | walkthroughs, AI interviewers, coworkers, the pairing assistant and grading |
| [`anthropic`](https://pypi.org/project/anthropic/) Python SDK | optional | only with `WALKTHROUGH_BACKEND=api` |
| [CodeMirror 5.65.16](https://codemirror.net/5/) | yes, loaded in the browser | code editor in LeetCode Practice, Assessment, AI Pairing and Engineer for a Day. Loaded on demand from `cdnjs.cloudflare.com`, so these editors need an internet connection |
| [Prettier 2.8.8](https://prettier.io/) (standalone) | optional, loaded in the browser | the **Format** button and Shift-Alt-F in the code editors. Loaded from `cdnjs.cloudflare.com` the first time you format, with an SRI hash |
| [Node.js](https://nodejs.org/) | optional | only for `scripts/verify_aipair.js`, `scripts/verify_day.js` and `scripts/verify_learn.js` when writing content |
| Greenhouse, Lever, Ashby and Workday public job boards | optional | fetched by the server once a day in the background |

## Credits

- System Design Notes: https://github.com/liquidslr/system-design-notes
