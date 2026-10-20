"""Learning tab: AI review of practice answers (code or written) and the lesson tutor chat.

The curriculum lives in web/learn_data.js, so the page sends the lesson and exercise text it is showing."""
from .. import prompts
from ..chat import chat_messages
from ..errors import ApiError
from .router import post


def _text(body, key, cap, required=True):
    v = body.get(key)
    if v is None and not required:
        return ""
    if not isinstance(v, str) or (required and not v.strip()) or len(v) > cap:
        raise ApiError(400, f"Bad {key}.")
    return v.strip()


def _lesson(body):
    return {"track": _text(body, "track", 80), "lesson": _text(body, "lesson", 200), "goal": _text(body, "goal", 600)}


@post("/api/learn/review", max_body=100000)
def review(h, body):
    f = _lesson(body)
    kind = body.get("kind")
    if kind == "code":
        code, results = _text(body, "code", 20000), _text(body, "results", 3000, required=False)
        system = prompts.SYSTEM_LEARN_CODE_REVIEW.format(title=_text(body, "title", 200), prompt=_text(body, "prompt", 4000), **f)
        user = f"My solution:\n```js\n{code}\n```\n\nTest results from my last run: {results or 'not run yet'}"
    elif kind == "explain":
        system = prompts.SYSTEM_LEARN_EXPLAIN_REVIEW.format(prompt=_text(body, "prompt", 4000), rubric=_text(body, "rubric", 3000), **f)
        user = "My answer:\n" + _text(body, "answer", 8000)
    else:
        raise ApiError(400, "Bad kind.")
    h.stream_chat(system, [{"role": "user", "content": user}])


@post("/api/learn/chat", max_body=200000)
def chat(h, body):
    f = _lesson(body)
    content, part = _text(body, "content", 30000), _text(body, "part", 6000, required=False)
    part = f"\n\nThe practice step they are on:\n{part}" if part else ""
    h.stream_chat(prompts.SYSTEM_LEARN_TUTOR.format(content=content, part=part, **f), chat_messages(body, cap=4000))
