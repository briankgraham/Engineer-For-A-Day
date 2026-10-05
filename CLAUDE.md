# Working in this repo

Stack: a Python stdlib HTTP server (`server.py`, `app/`) serving a no-build static frontend (`web/`). There is no test suite for the UI, so changes are verified by running the app.

## Human-in-the-loop verification (required for any change)

Before calling a change done, always:

1. **Start a test server from the current worktree** on a free port, in the background, so the user can try the change themselves. Use `8001` first; if taken (another worktree may hold it), use `8002`, `8003`, and so on.
   ```
   PORT=8001 nohup python3 server.py > <scratchpad>/server8001.log 2>&1 &
   ```
   Never use 8000. That is the user's normal instance and does not have the worktree's changes.
2. **Verify it yourself first** in the browser (Claude in Chrome): exercise the changed feature, including reload/persistence and the unhappy paths, and report what you saw. Syntax checks (`node --check`, `python3 -m py_compile`) are not enough.
3. **Hand off to the user**: give the URL, the exact steps to try, any test data you created (e.g. localStorage keys, cached jobs) and how to reset it, and the command to stop the server. Say clearly what you did and did not verify.
4. **Wait for the user's OK before committing, pushing or opening a PR.** Leave the server running until they confirm.

## Gotchas

- `PORT` is read from the environment (`app/config.py`). `ALLOWED_HOSTS` is derived from it, so the port must match what the browser uses.
- State-changing API calls (`POST /api/...`) are rejected with `Forbidden` from plain `curl`. They need the `X-Requested-With: walkthrough` header and an allowed Host/Origin. Easiest is to run them with `fetch` from a page on the test server.
- Jobs: a fresh server has no cached postings. Click **Refresh** on the Jobs tab (or POST `/api/jobs/refresh` from the page). It hits the real company boards and takes up to a minute.
- Frontend scripts are served straight from `web/`, so a browser hard-reload picks up JS edits; Python changes need a server restart.
- Client-side state (progress, applied jobs, etc.) lives in localStorage, always wrapped in try/catch, as in `web/behavioral.js` and `web/jobs.js`.
