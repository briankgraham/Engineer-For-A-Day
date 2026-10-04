# Senior interview prep: feature ideas

Gaps for senior-level loops, from a review on 2026-10-03.
Mark items `[x]` when built.

## 1. Behavioral tab

At senior level the behavioral round often sets the level offered. Nothing in the app covers it yet. A new tab (`data-tab="behavioral"`, `web/behavioral.js`, `/api/bh/*` in `app/routes/behavioral.py` + `app/features/behavioral.py`), following the pattern of the other tabs.

### Story bank
- [ ] Write STAR stories (Situation, Task, Action, Result), with a free-text "what I'd do differently" field and metrics (numbers, team size, timeline).
- [ ] Tag each story with competencies: conflict, ambiguity, failure, influence without authority, mentoring, owning a large project, disagreeing with a manager, tough tradeoff, delivering under pressure, raising the bar.
- [ ] A coverage grid of competencies × stories, highlighting competencies with no story or only one (a common gap: everything is a "big project" story, with no failure or conflict story).
- [ ] Company frameworks: map competencies to Amazon Leadership Principles (and others if worth it: Meta's "core values" focus areas, Google's "Googleyness"). Picking a target company shows which principles each story covers.
- [ ] Save in `localStorage` like other progress, with export/import alongside the existing progress export.
- [ ] AI "story polish": tighten a story, flag a vague result ("improved performance" → "by how much?"), flag "we" where it should be "I". Suggestions only; never rewrite the story silently.

### AI interviewer that digs in
Built 2026-10-03: "Interview me with AI" on the Practice card and "Interview" on each question. The interviewer (`SYSTEM_BH_INTERVIEWER`, `/api/bh/chat`) picks the biggest gap in the answer so far, asks one follow-up at a time, stays in character, and ends itself with an `[END]` token after at most 5 follow-ups. The grader (`SYSTEM_BH_GRADE`, `/api/bh/grade`, `SCHEMA_BH_GRADE`) scores six areas with quotes, gives a level fit (below / at / above) and follow-ups to prepare. History is in `localStorage` under `behavioral-history-v1` (last 30). An unfinished interview is not saved across a reload.
- [x] Pick a competency (or a random one, or a company's principle) and the AI asks the opening question, then keeps probing:
  - "What did *you* do, not the team?"
  - "What would you do differently?"
  - "How did you measure the impact?"
  - "What did your manager / the other team think?"
  - "What was the hardest part?"
- [x] Answer by typing or by voice (reuse the speech-to-text dictation in `web/sysdesign.js`). Show a timer, since answers should run about 2 to 3 minutes.
- [x] Grade with a rubric: STAR structure, personal ownership, scope that fits the target level (team vs org vs company), concrete results backed by data, self-awareness or learning, concision. Score each area and quote the weak lines.
- [x] Level calibration: pick the target level (Senior / Staff) and have the grader say whether the story's scope reads at that level.
- [x] Save each attempt to history (question, transcript, scores), like the system design mock history.
- [ ] Offer to link a strong answer back to the story bank as a new or updated story.

### Project deep dive
- [ ] Paste a summary of a system you built (problem, architecture, your role, scale). The AI acts as a senior interviewer and asks about tradeoffs, why not alternative X, failure modes, what broke in production, how you'd redesign it today, how you got others on board.
- [ ] Grade on depth, how clearly you explain tradeoffs, ownership, and honesty about mistakes.
- [ ] Optional: reuse the whiteboard (`web/whiteboard.js`) to sketch the architecture during the deep dive.

### Question bank
Built first (2026-10-03): the tab exists as `web/behavioral.js` with 45 questions in `QS`, progress in `localStorage` under `behavioral-progress-v1` (`{done, times, last, note}` per question id, so it reuses `isDue`), a per-question note, a "Practice one" card with a count-up timer, and competency coverage chips. The page sends the question text to the server, so the bank lives only in the JS.
- [x] A built-in list of common behavioral questions, tagged by competency and by company where known ("Tell me about a time you disagreed with your manager", "...a project that failed", "...you had to make a decision without enough data", "...you mentored someone", "...you pushed back on a deadline", "...you simplified something complex", "...you delivered something you weren't proud of").
- [x] Spaced review: each question can be marked practiced and becomes due again on the existing `isDue` / `INTERVALS` schedule.

## 2. Object-oriented / low-level design (elevator, booking system)

A separate round at Amazon, Uber, Atlassian, Salesforce and others: design classes and interfaces for a real-world system, then implement the core. Graded on interfaces, separation of responsibilities, extensibility and testability, not just passing tests.

**Where it lives.** Recommended: a new scenario kind, `"kind": "lld"`, in the AI Pairing workspace, plus a filter there or its own "Object Design" tab that lists only LLD scenarios. That reuses the multi-file editor, the test harness, `verify_aipair.js`, planted flaws and the AI evaluator. A separate tab with its own workspace would duplicate all of that.

Built 2026-10-03 with `elevator` as the first scenario. Decisions: design-first is a gate (code files are read-only until design.md has about 30 words of its own and you press "Start coding"); the follow-up appears when the visible tests first all pass or at 60% of the suggested time, whichever comes first; when it appears the browser snapshots the files, and the evaluator gets a server-side diff of everything changed after the reveal. Flaws can be `"design": true` (advice-only, no mutant, judged by the evaluator) or `"followup": true` (only offered after the reveal).

What the LLD kind adds over the existing scenarios:
- [x] A `design.md` editable tab (like `review.md`) where the candidate first writes the classes, their responsibilities, and the main interfaces, before coding. Sent to the chat and to the evaluator.
- [x] A "design" score area in place of "decomposition" (`AP_AREAS_LLD`, `SCHEMA_AP_EVAL_LLD`, `SYSTEM_AP_EVAL_LLD`), graded on: clear responsibilities, interfaces vs concrete classes, how the design takes the follow-up change, avoiding god objects.
- [x] A **follow-up requirement** revealed partway through (by time or after the visible tests pass), e.g. "add a VIP elevator" or "add seat holds that expire". Hidden tests cover the follow-up. This checks whether the design really was extensible.
- [x] `verify_aipair.js` checks for the new kind (the follow-up tests fail on the starter and pass on the solution).

### Elevator system (Hard, about 60 min)
- [x] `elevator`: N elevators, floor requests (up/down buttons) and in-car requests, a dispatcher that assigns requests, a `step()` tick so tests are deterministic (no `mkClock` needed: `step()` is the clock). Built with maintenance mode as the follow-up, 6 test-caught flaws (nearest-stop-first, hall call any direction, on-the-way ignores the call's direction, no dedupe, retired car still eligible, retired car's calls dropped) and 1 design flaw (one Building with parallel arrays). Capacity was left out: modeling riders added a lot of spec for little design signal.
  - Classes to expect: `Elevator` (state machine: idle / moving up / moving down / doors open), `Dispatcher` / scheduling strategy (pluggable: nearest car, SCAN / LOOK), `Request`, `Building`.
  - Follow-up: a pluggable strategy swap (nearest car → LOOK) or a maintenance mode that takes a car out of service and reassigns its requests.
  - Planted-flaw ideas: the car reverses direction while it still has requests ahead (should finish the sweep, LOOK); a hall request already being served is assigned to a second car; a capacity/weight limit is ignored; the "up" button at floor 5 is served by a car passing on its way down; out-of-service car still receives assignments.

### Booking system (Medium, about 45 min)
- [ ] `seat-booking`: movie/event seat booking with temporary holds. `listShows`, `seatMap(showId)`, `hold(userId, showId, seats)` (expires after N minutes via `mkClock`), `confirm(holdId, paymentRef)`, `cancel(bookingId)`.
  - Distinct from `review-room-booking`, which is a code review of interval clashes. This one is about design and state: seat states (available / held / booked), hold expiry, and atomic multi-seat holds.
  - Classes to expect: `Show`, `Seat`, `Hold`, `Booking`, `BookingService`, a pricing strategy (tiers, weekend surcharge).
  - Follow-up: idempotent `confirm` (the same `paymentRef` twice books once) or a waitlist when a show is full.
  - Planted-flaw ideas: holding several seats is not atomic (some seats get held when one is unavailable); an expired hold still blocks its seats or can still be confirmed; a cancelled booking's seats don't return to available; a double confirm creates two bookings; the seat map exposes internal objects that callers can mutate.

### More LLD scenarios later
- [ ] Parking lot (spot sizes, tickets, fees by duration).
- [ ] Splitwise (expense splitting, simplify debts).
- [ ] In-memory file system (paths, `mkdir -p`, `ls`, permissions).
- [ ] Vending machine (state machine, change making).
- [ ] Library / rental system (holds, due dates, fines).

## 3. "Senior Favs" tag for coding problems

Problems that come up a lot in senior loops, often because they are design-flavored (build a data structure with an API) or have real-world follow-ups. All of these are already in `data/GLOBAL.csv`; this adds a tag and a filter.

- [x] A hand-curated list in one place (e.g. `data/senior_favs.json`, a list of slugs with an optional one-line "why it's asked" note), picked up by `scripts/build_global.py` and embedded with the rest of the data in `web/index.html`.
- [x] A "Senior Favs" badge on the problem row and a filter (checkbox or an option in the existing filters) on the LeetCode tab.
- [x] Show the "why it's asked" note and a typical senior follow-up in the row's tooltip or the Learn walkthrough (e.g. LRU Cache → "make it thread-safe", "add TTL", "distribute it").
- [x] Optional: an Assessment preset that draws only from Senior Favs. (Built as a "Senior favs only" checkbox that works with every format and the company filter; the results show each problem's senior follow-up.)

Initial list (rank = position in `GLOBAL.csv` today):

| Problem | Diff | Rank | Why senior loops like it |
| --- | --- | --- | --- |
| LRU Cache | M | 2 | API design; follow-ups on TTL, thread safety, distribution |
| Merge k Sorted Lists | H | 16 | heaps; follow-up "the lists are on different machines" |
| Sliding Window Maximum | H | 20 | monotonic deque; streaming follow-up |
| Find Median from Data Stream | H | 22 | two heaps; streaming, approximate follow-ups |
| Meeting Rooms II | M | 26 | intervals; real scheduling follow-ups |
| Insert Delete GetRandom O(1) | M | 27 | data-structure composition |
| Word Ladder | H | 33 | BFS on an implicit graph; bidirectional BFS |
| Minimum Window Substring | H | 34 | sliding window done carefully |
| Text Justification | H | 36 | messy spec, clean code under pressure |
| Course Schedule II | M | 37 | topological sort, cycle detection |
| Time Based Key-Value Store | M | 54 | versioned storage, binary search |
| LFU Cache | H | 57 | harder LRU; O(1) bookkeeping |
| Basic Calculator II | M | 65 | parsing, precedence |
| Design Hit Counter | M | 81 | time windows; "now at high QPS" follow-up |
| Logger Rate Limiter | E | 85 | warm-up that leads into rate-limiter design |
| Evaluate Division | M | 88 | weighted graph / union-find |
| Serialize and Deserialize Binary Tree | H | 95 | format design, edge cases |
| Task Scheduler | M | 102 | greedy + counting; real scheduling |
| Alien Dictionary | H | 105 | graph from constraints, invalid-input handling |
| Snapshot Array | M | 158 | versioning, memory vs time tradeoffs |
| Design In-Memory File System | H | 164 | trie of paths, API design |
| Basic Calculator III | H | 174 | full expression parser |
| Accounts Merge | M | 188 | union-find on real-world data |
| Design Twitter | M | 233 | mini news feed; leads into system design |
| Design Search Autocomplete System | H | 269 | trie + ranking; leads into typeahead design |
| My Calendar I | M | 381 | interval insertion, sorted structures |
| Range Module | H | 442 | interval merging under updates |
| Design Underground System | M | 459 | clean class design, averages |
