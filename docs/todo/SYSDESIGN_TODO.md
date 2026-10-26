# System design mock interview: improvements

## Long mocks: rolling summary instead of persisting every message (ideas from 2026-10-26)

Problem: finishing a long system design mock failed with "Bad interview." because `grade_sd` (`app/features/sysdesign.py`) rejected transcripts over 60 messages, and the interviewer chat only saw the last 19 messages. Real interviews run well past 60.

- [x] **Stopgap, done.** Grading accepts up to 400 messages and a 100k-char scratchpad (`/api/sd/grade` body limit 1MB). Transcripts over 60k chars keep the first quarter and the latest three quarters, with the middle marked as omitted; scratchpad is cut to 20k chars for the model. Chat now sends the last 39 messages instead of 19 (the chat endpoint still caps at 60). Not yet committed; check `git log` before redoing.
- [ ] **Rolling summary.** Every N turns (about 10) a background model call folds the oldest messages into a structured summary and the client drops them from what it persists and sends. The summary holds: requirements and scope agreed, estimates the candidate stated, design decisions with their reasoning, open questions from the interviewer, and per-framework-step notes (strengths, gaps, running score).
  - The interviewer chat gets summary + last ~12 messages.
  - `grade_sd` grades from summary + recent transcript + scratchpad + board, so the request stays small whatever the interview length.
  - `localStorage` keeps the summary plus a short tail. Keep the full transcript for the user to browse, but never send it to the model.
  - Watch for lossy summaries dropping an offhand assumption (e.g. "assume 10x read-heavy"); have the summary prompt keep explicit numbers and assumptions verbatim.
  - Costs one extra call per N turns, run in the background so chat never waits; it counts against the budget (`take_budget`).
  - Do not score every turn: noisy, costly, and invites gaming the interviewer.
- [ ] **Interviewer nudges.** The summary knows which framework steps are untouched, so the interviewer can steer back to them gently, as a real one would.
- [ ] **Board and scratchpad in checkpoints.** Include them in each rolling checkpoint so the interviewer can comment on the diagram mid-interview, not only at the end.
- [ ] **Specific errors.** "Bad interview." says nothing. Have `grade_sd` report which check failed (too many messages, scratchpad too long, bad board) and show it in the UI. `app/features/behavioral.py:41` has the same generic message.
- [ ] **Retry without losing work.** If grading fails, keep the mock in a "ready to grade" state with a visible retry button (today "Grade again" only exists once a grade was saved).
- [ ] **Grade trend.** Per-step scores across past mocks so the user sees what to practise.
