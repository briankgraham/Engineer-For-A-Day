#!/usr/bin/env python3
"""Local server for web/index.html plus the AI "Learn" walkthroughs.

    python3 server.py                   # then open http://localhost:8000

Default backend ("claude"): runs your logged-in `claude` CLI in headless mode, so no API key
is needed and usage counts against your Claude plan. Alternative backend ("api"):
    pip install anthropic; export ANTHROPIC_API_KEY=...   (or a git-ignored .env file)
    WALKTHROUGH_BACKEND=api python3 server.py

The browser only talks to /api/* on this server, which caches each walkthrough in
var/walkthroughs/<slug>.json (and practice exercises in var/practice/<slug>.javascript.json). Any API key stays inside this process.

Env: PORT (8000), WALKTHROUGH_BACKEND (claude|api), WALKTHROUGH_MODEL (default model,
claude-sonnet-5-5; the browser's model menu overrides it per request), WALKTHROUGH_PER_MINUTE (10), WALKTHROUGH_DAILY_CAP (200),
CLAUDE_BIN (claude).

This file is only the entry point. The code lives in app/: config, errors, schemas, prompts, llm (backends), data,
features/ (walkthrough, sysdesign, practice, aipair, jobs), and routes/ (router + http handler + one module per area).
The page and its scripts are in web/, the CSVs and job-board map in data/, maintenance scripts in scripts/.
"""
import os, shutil, socket, threading
from http.server import ThreadingHTTPServer

from app.config import BACKEND_NAME, CLAUDE_BIN, MODEL, PORT, check_env_file_safety
from app.routes.http import Handler


def main():
    check_env_file_safety()
    if BACKEND_NAME == "claude":
        print(f"Backend: claude CLI ({'found' if shutil.which(CLAUDE_BIN) else 'NOT FOUND'}), model: {MODEL}")
    else:
        have_key = bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))
        print(f"Backend: Anthropic API (API credentials in environment: {'yes' if have_key else 'no'}), model: {MODEL}")
    # Loopback only, on both IPv4 and IPv6: browsers may resolve "localhost" to either.
    class V6Server(ThreadingHTTPServer):
        address_family = socket.AF_INET6

    servers = [ThreadingHTTPServer(("127.0.0.1", PORT), Handler)]
    try:
        servers.append(V6Server(("::1", PORT), Handler))
    except OSError:
        pass  # no IPv6 loopback on this machine
    for extra in servers[1:]:
        threading.Thread(target=extra.serve_forever, daemon=True).start()
    print(f"Serving on http://localhost:{PORT}  (Ctrl+C to stop)")
    try:
        servers[0].serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
