"""Model backends (Claude CLI or Anthropic API), the call budget, and upstream error translation."""
import json, os, shutil, subprocess, sys, tempfile, threading, time

from .config import BACKEND_NAME, CLAUDE_BIN, DAILY_CAP, PER_MINUTE, current_model, log_model
from .errors import ApiError
from .schemas import SCHEMA


_calls, _calls_lock = [], threading.Lock()


def take_budget():
    now = time.time()
    with _calls_lock:
        _calls[:] = [t for t in _calls if now - t < 86400]
        if sum(1 for t in _calls if now - t < 60) >= PER_MINUTE:
            raise ApiError(429, "Too many requests, wait a minute and try again.")
        if len(_calls) >= DAILY_CAP:
            raise ApiError(429, "Daily call cap reached (raise WALKTHROUGH_DAILY_CAP to allow more).")
        _calls.append(now)


# ---------- Claude ----------
_client = None


def get_client():
    global _client
    if _client is None:
        try:
            import anthropic
        except ImportError:
            raise ApiError(503, "The 'anthropic' package is not installed on the server. Run: pip install anthropic")
        _client = anthropic.Anthropic()
    return _client


def translate(e):
    """Map any failure to a generic message; log only the exception class, never its text."""
    if isinstance(e, ApiError):
        return e
    print(f"upstream failure: {type(e).__name__}", file=sys.stderr)
    try:
        import anthropic
    except ImportError:
        return ApiError(500, "Unexpected server error.")
    if isinstance(e, anthropic.AuthenticationError) or (isinstance(e, TypeError) and "authentication" in str(e).lower()):
        return ApiError(503, "API key missing or rejected. Check ANTHROPIC_API_KEY on the server.")
    if isinstance(e, anthropic.RateLimitError):
        return ApiError(429, "Rate limited by the API. Try again shortly, or pick a different model from the model menu.")
    if isinstance(e, anthropic.APIConnectionError):
        return ApiError(502, "Could not reach the Claude API.")
    if isinstance(e, anthropic.APIStatusError):
        return ApiError(502, f"Claude API error ({e.status_code}).")
    return ApiError(500, "Unexpected server error.")


class ApiBackend:
    """Anthropic SDK with an API key (WALKTHROUGH_BACKEND=api)."""

    @staticmethod
    def _opts(effort, cfg):
        # Haiku does not support adaptive thinking or the effort setting.
        if current_model().startswith("claude-haiku"):
            return {"output_config": cfg} if cfg else {}
        return {"thinking": {"type": "adaptive"}, "output_config": {**cfg, "effort": effort}}

    def json(self, system, user, schema=SCHEMA):
        log_model("api", "structured")
        with get_client().messages.stream(
            model=current_model(),
            max_tokens=16000,
            **self._opts("medium", {"format": {"type": "json_schema", "schema": schema}}),
            system=system,
            messages=[{"role": "user", "content": user}],
        ) as stream:
            msg = stream.get_final_message()
        if msg.stop_reason in ("refusal", "max_tokens"):
            raise ApiError(502, "The model did not finish a walkthrough for this problem. Try Regenerate.")
        text = next((b.text for b in msg.content if b.type == "text"), "")
        try:
            return json.loads(text)
        except ValueError:
            return None

    def chat(self, system, messages):
        log_model("api", "chat")
        with get_client().messages.stream(
            model=current_model(), max_tokens=4000, **self._opts("low", {}),
            system=system, messages=messages,
        ) as stream:
            yield from stream.text_stream


class ClaudeCliBackend:
    """Your logged-in `claude` CLI in headless mode: no API key, billed to your Claude plan."""

    def __init__(self):
        self.cwd = tempfile.mkdtemp(prefix="walkthrough-")  # neutral dir: no project CLAUDE.md / memory gets loaded
        self.slots = threading.Semaphore(2)

    def _run(self, system, prompt, effort, extra):
        binary = shutil.which(CLAUDE_BIN)
        if not binary:
            raise ApiError(503, "The `claude` CLI was not found. Install Claude Code, or use WALKTHROUGH_BACKEND=api with an API key.")
        cmd = [binary, "-p", "--no-session-persistence", "--tools", "", "--disable-slash-commands",
               "--setting-sources", "", "--strict-mcp-config", "--model", current_model(), "--effort", effort, "--system-prompt", system, *extra]
        # Never hand an API key to the subprocess: this backend must use your `claude` login.
        env = {k: v for k, v in os.environ.items() if k not in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN")}
        with self.slots:
            try:
                p = subprocess.run(cmd, input=prompt, capture_output=True, text=True, cwd=self.cwd, env=env, timeout=420)
            except subprocess.TimeoutExpired:
                raise ApiError(504, "Claude took too long. Try again.")
        out = p.stdout or ""
        if p.returncode != 0 or not out.strip():
            print(f"claude CLI failed: exit {p.returncode}", file=sys.stderr)
            low = (out + (p.stderr or "")).lower()
            if "login" in low or "log in" in low or "auth" in low:
                raise ApiError(503, "The `claude` CLI is not logged in. Run `claude` in a terminal and log in.")
            if any(w in low for w in ("limit", "usage", "quota", "credit", "overloaded")):
                raise ApiError(429, "This model looks out of usage or overloaded. Pick a different model from the model menu and try again.")
            raise ApiError(502, "The `claude` CLI failed. Check that it works in a terminal.")
        return out

    def json(self, system, user, schema=SCHEMA):
        log_model("cli", "structured")
        out = self._run(system, user, "medium", ["--output-format", "json", "--json-schema", json.dumps(schema)])
        try:
            r = json.loads(out)
        except ValueError:
            return None
        if r.get("is_error"):
            print("claude CLI reported an error result", file=sys.stderr)
            raise ApiError(502, "The `claude` CLI returned an error. Check that it works in a terminal.")
        w = r.get("structured_output")
        if w is None:
            try:
                w = json.loads(r.get("result") or "")
            except ValueError:
                w = None
        return w

    def chat(self, system, messages):
        log_model("cli", "chat")
        convo = "\n\n".join(("Learner: " if m["role"] == "user" else "Tutor: ") + m["content"] for m in messages)
        yield self._run(system, f"Conversation so far:\n\n{convo}\n\nReply to the last message in your role.", "low", ["--output-format", "text"]).strip()


BACKEND = ClaudeCliBackend() if BACKEND_NAME == "claude" else ApiBackend()
