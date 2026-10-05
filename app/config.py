"""Paths, env loading and runtime settings shared by every module."""
import os, subprocess, sys, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DIR = os.path.join(ROOT, "web")    # the page and its scripts
DATA_DIR = os.path.join(ROOT, "data")  # companies.csv, GLOBAL.csv, jobs_boards.json
VAR_DIR = os.path.join(ROOT, "var")    # generated caches and logs (git-ignored)
CACHE_DIR = os.path.join(VAR_DIR, "walkthroughs")
PRACTICE_DIR = os.path.join(VAR_DIR, "practice")
SD_DIR = os.path.join(CACHE_DIR, "sysdesign")
SD_FILE = os.path.join(WEB_DIR, "sysdesign_data.js")
AP_DIR = os.path.join(ROOT, "aipair_scenarios")
AP_SESSIONS = os.path.join(VAR_DIR, "aipair_sessions")  # per-attempt log of which planted flaws were served
DAY_DIR = os.path.join(ROOT, "day_scenarios")
DAY_SESSIONS = os.path.join(VAR_DIR, "day_sessions")  # Engineer for a Day: per-attempt log of served flaws and the evaluation
JOBS_BOARDS_FILE = os.path.join(DATA_DIR, "jobs_boards.json")
JOBS_CACHE_DIR = os.path.join(VAR_DIR, "jobs_cache")
APPLICATIONS_FILE = os.path.join(VAR_DIR, "applications.json")  # Jobs tab: applications you are tracking


def load_env():
    """Read ANTHROPIC_*/WALKTHROUGH_* from .env (never overrides real env vars)."""
    path = os.path.join(ROOT, ".env")
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip().removeprefix("export ").strip()
            if k.startswith(("ANTHROPIC_", "WALKTHROUGH_", "PORT")):
                os.environ.setdefault(k, v.strip().strip("\"'"))


def git(*args):
    try:
        return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True).returncode
    except OSError:
        return None


def check_env_file_safety():
    """Refuse to run if .env is tracked by git; warn if it isn't ignored."""
    if not os.path.isfile(os.path.join(ROOT, ".env")):
        return
    if git("ls-files", "--error-unmatch", ".env") == 0:
        raise SystemExit("Refusing to start: .env is tracked by git. Run `git rm --cached .env` and rotate the key.")
    if git("check-ignore", "-q", ".env") == 1:
        print("WARNING: .env is not git-ignored. Add `.env` to .gitignore before committing.", file=sys.stderr)


load_env()
PORT = int(os.environ.get("PORT", "8000"))
BACKEND_NAME = os.environ.get("WALKTHROUGH_BACKEND", "claude")
if BACKEND_NAME not in ("claude", "api"):
    raise SystemExit("WALKTHROUGH_BACKEND must be 'claude' or 'api'.")
MODELS = [("claude-sonnet-5-5", "Sonnet 5.5"), ("claude-opus-5-5", "Opus 5.5"), ("claude-fable-5-1", "Fable 5.1"), ("claude-haiku-4-5-20251001", "Haiku 4.5")]
MODEL = os.environ.get("WALKTHROUGH_MODEL") or "claude-sonnet-5-5"  # default when the browser does not pick one
if MODEL not in dict(MODELS):
    MODELS.append((MODEL, MODEL))
req_state = threading.local()


def current_model():
    """The model for the request being handled (set per request from the browser's model picker)."""
    return getattr(req_state, "model", None) or MODEL


def log_model(backend, kind):
    """One line per real upstream call (cache hits never get here), so the model actually used is visible."""
    m = current_model()
    print(f"AI request: model={m} ({'default' if m == MODEL else 'picked in UI'}) backend={backend} kind={kind}", file=sys.stderr, flush=True)
CLAUDE_BIN = os.environ.get("CLAUDE_BIN", "claude")
PER_MINUTE = int(os.environ.get("WALKTHROUGH_PER_MINUTE", "10"))
DAILY_CAP = int(os.environ.get("WALKTHROUGH_DAILY_CAP", "200"))
ALLOWED_HOSTS = {f"localhost:{PORT}", f"127.0.0.1:{PORT}", f"[::1]:{PORT}"}
ALLOWED_ORIGINS = {f"http://{h}" for h in ALLOWED_HOSTS}
API_HEADER = "walkthrough"  # required value of X-Requested-With; forces a CORS preflight for cross-site callers
LANGS = {"python": "Python", "javascript": "JavaScript", "typescript": "TypeScript"}
