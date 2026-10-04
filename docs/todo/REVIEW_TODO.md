# index.html review findings

Reviewed 2026-09-26 (read-only, nothing run). Line numbers refer to `index.html` at that time and may drift.
Mark items `[x]` as they are fixed.

## Correctness

- [x] **1. Bad progress value bricks the page (high)** — L287, L872, L363, L878
  `progress=obj` on import and the `localStorage` load accept any JSON. A non-string `note` (e.g. `5`) makes `esc(p.note)` throw in `render()`. The bad data is already saved, so it throws again at load (unguarded `refresh(true)`, L878) and the tooltip setup never runs. Recovery means clearing site data. Import also replaces all progress with no confirm or merge.
  Fix: validate/coerce each entry (`done` boolean, `times` non-negative int, `note`/`last` strings) on load and import; confirm before replacing.

- [x] **2. Float tolerance lets large wrong answers pass (high)** — L615
  `__eq` uses `1e-5*max(1,|b|)` for all numbers. For an expected value around 1e9+7, answers within about ±10,000 pass (common with mod problems).
  Fix: exact equality when both values are integers.

- [x] **3. Rapid language switch shows wrong content (medium)** — L527–L536
  `loadWalk` guards on `slug` only. Two requests for the same slug can resolve out of order, so the content language can differ from `learnLang`.
  Fix: request counter or `AbortController`.

- [x] **4. Late chat reply corrupts next conversation (medium)** — L546, L470, L553–L581
  `openLearn`/`pickLang` reset `chatMsgs` and `chatBusy` mid-stream. The old stream then pushes an assistant message into the new array (the API rejects a leading assistant turn), `pop()` on error removes the wrong message, and `chatBusy=false` allows concurrent sends.
  Fix: per-conversation token; abort the fetch on reset/close.

- [x] **5. Malformed AI response reported as "server not running" (medium)** — L539, L579, L821, L743
  Any `TypeError` maps to `NO_SERVER`, but `renderWalk`/`showExercise` throw `TypeError` on missing fields (`w.tips.clarify`, `w.trace.length`, `doc.generated_at`, `ex.tests[0]`).
  Fix: detect network failure specifically; validate response shape before rendering.

- [ ] **6. `today()` uses UTC (low)** — L293
  After about 5pm US Pacific it returns tomorrow, so `last` and the due-review intervals are off by a day. Use a local date.

- [ ] **7. Cyclic result aborts the whole test run (low)** — L669–L670
  `__canon`/`__eq` run outside the `try`; a cyclic return value overflows the stack and remaining tests show "not run". Move them inside the `try`.

- [ ] **8. `checkTests` can attach a stale warning (low)** — L769–L777
  Guards on `slug` only. After Regenerate on the same slug, a late result from the old exercise can prepend a wrong warning.

## Security

- [ ] **9. CDN scripts have no SRI (medium)** — L584–L601
  CodeMirror loads from cdnjs with no `integrity`/`crossorigin`, and runs on the same origin as the API.
  Fix: pin SRI hashes or vendor locally; consider a CSP.

- [x] **10. AI-generated code runs unprompted with same-origin network access (medium)** — L769, L648, L683
  `checkTests` auto-runs the model's `reference_solution` and `eval`s its `function_name`. A Blob worker inherits the page origin and can `fetch` the regenerate endpoints (spending credits) or exfiltrate data. Same for user-pasted code.
  Fix: sandboxed iframe (opaque origin) or CSP `connect-src 'none'` for the worker.

## Reliability / performance

- [ ] **11. Unbounded console output freezes the tab (medium)** — L762
  One DOM text node per `console.log`, plus a forced layout via `scrollTop=1e9`. `for(;;)console.log(i)` can starve the main thread, including the 10 s kill timer.
  Fix: cap total output and batch DOM writes.

- [ ] **12. No abort or timeout on AI fetches (medium)** — L450–L458, L562
  A hung server leaves the spinner and `aiPending` stuck. Closing the dialog doesn't cancel an in-flight chat stream. `.finally(aiBusy(-1))` fires at headers, so the indicator goes off while the stream is still running.

- [ ] **13. `save()` swallows failures (medium)** — L288 and other `localStorage` writes
  The quota is shared with drafts and custom tests. When it fills, progress silently stops persisting.
  Fix: surface an error/banner when `setItem` throws.

- [ ] **14. Smaller items (low)**
  - `!res.ok` → `await res.json()` throws `SyntaxError` on non-JSON error pages (L535, L563, L817).
  - `loadCss` (L587) isn't memoized, so it appends 3 duplicate `<link>`s per practice open.
  - SSE parser (L568) doesn't flush the final buffer or handle `\r\n\r\n`.
  - Multiple tabs overwrite each other's progress (no `storage` event).
  - `checkTests` isn't killed on dialog close (`pRunning` is false for it); it can run up to 10 s.
  - A failed Regenerate clears `pDoc`; Retry re-POSTs the paid regenerate.

## Suggested order

1. #1 and #2 (data loss, wrong grading)
2. #3, #4, #5 (share one fix: request token + proper error typing)
3. #9, #10, #11
4. The rest
