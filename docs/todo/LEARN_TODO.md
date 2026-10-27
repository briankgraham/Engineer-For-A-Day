# Learning tab: ideas

Existing tracks (13): Graphs, Trees, Heaps and priority queues, Intervals, Tries, Dynamic programming, JavaScript and TypeScript, HTTP and the web platform, Auth and web security, Browser and frontend, SQL and data, Concurrency and async. Mark items `[x]` when built. Follow "Adding to the Learning tab" in `README.md`.

Suggested order: #7 Databases beyond SQL, then #10 Git, CI/CD and production ops.

## Algorithm tracks (with a LeetCode checkpoint)
- [x] 1. **Dynamic programming.** Built: state/transition/base case, memo to table, 1D DP, grid DP, knapsack and subset sum, LCS and edit distance, state machines (stock with cooldown), with a step-through table visualizer (`web/learn_dp.js`).
- [ ] 2. **Binary search, two pointers and sliding window.** Search-on-answer, off-by-one traps, window invariants, prefix sums.
- [ ] 3. **Backtracking and recursion.** Subsets, permutations, N-Queens, pruning, choose/explore/undo template, call-tree visualizer.
- [ ] 4. **Monotonic stacks.** Next greater element, daily temperatures, largest rectangle. (Tries are done, see 4c.)
- [x] 4c. **Tries.** Built: insert/search/startsWith, autocomplete, replace words, prefix sums, wildcard search, Word Search II and bitwise max-XOR, with build and search visualizers (`web/learn_tries.js`).
- [x] 4b. **Intervals.** Built: overlap tests, merge, insert, two-list intersection, greedy by end, sweep line and difference arrays, with merge and sweep visualizers (`web/learn_intervals.js`).
- [ ] 5. **Strings and hashing.** Anagram keys, rolling hash, KMP in brief, hash map design (collisions, resizing).

## Full-stack and CS fundamentals (short reads, quick checks, "explain it" question)
- [ ] 6. **Networking and OS basics.** TCP vs UDP, TLS handshake, DNS, load balancers, processes, memory, file systems. The "what happens when..." material system design assumes.
- [ ] 7. **Databases beyond SQL.** NoSQL tradeoffs, sharding, replication, consistency models, CAP and PACELC, caching patterns, Redis. Bridges SQL and System Design.
- [ ] 8. **Distributed systems.** Consensus (Raft in brief), leader election, clocks and ordering, message queues, exactly-once myths. Extends Concurrency and async.
- [ ] 9. **Testing and debugging.** Unit vs integration tests, mocks, flaky tests, reading stack traces, bisecting. Supports Engineer for a Day and AI Pairing.
- [ ] 10. **Git, CI/CD and production ops.** Branching and rebasing, deploy strategies (canary, blue/green), observability, SLOs, incident response. Lines up with the Day tab's incidents and the Tessera migration day.
- [ ] 11. **Object-oriented and API design.** SOLID in practice, design patterns that come up, REST/RPC contract design and versioning. Supports the elevator design round.

## Newer topics
- [ ] 12. **AI/LLM engineering.** Prompting, RAG, evals, tool use, context limits, hallucination handling, cost and latency. Complements AI Pairing.
- [ ] 13. **Language-specific tracks.** Python and Java idioms and gotchas, for interviews in other languages. Current tracks are JS-centric.
