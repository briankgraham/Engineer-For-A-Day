"""Coding practice exercises and the solution review."""
from .. import prompts
from ..chat import chat_messages
from ..data import PROBLEMS
from ..errors import ApiError
from ..features.practice import generate_practice, read_practice
from . import validate
from .router import first, get, post


@get("/api/practice")
def practice(h, q):
    h.send(200, generate_practice(validate.slug(first(q, "slug"))))


@post("/api/practice/regenerate")
def regenerate(h, body):
    h.send(200, generate_practice(validate.slug(body.get("slug")), force=True))


@post("/api/practice/review")
def review(h, body):
    slug = validate.slug(body.get("slug"))
    code, results = body.get("code"), body.get("results")
    if not isinstance(code, str) or not 0 < len(code.strip()) <= 20000:
        raise ApiError(400, "Bad code.")
    if not isinstance(results, str) or len(results) > 3000:
        raise ApiError(400, "Bad results.")
    doc = read_practice(slug)
    statement = f"Exercise statement shown to the candidate:\n{doc['exercise']['statement']}" if doc else ""
    system = prompts.SYSTEM_PRACTICE_REVIEW.format(statement=statement, **PROBLEMS[slug])
    h.stream_chat(system, [{"role": "user", "content": f"My solution:\n```js\n{code}\n```\n\nTest results from my last run: {results or 'not run yet'}"}])


@post("/api/practice/chat", max_body=200000)
def chat(h, body):
    """Clarifying questions to the 'interviewer' while solving: it sees the exercise, its tests and the current code."""
    slug = validate.slug(body.get("slug"))
    messages, code = chat_messages(body, cap=2000), body.get("code")
    if not isinstance(code, str) or len(code) > 20000:
        raise ApiError(400, "Bad code.")
    doc = read_practice(slug)
    if not doc:
        raise ApiError(409, "Open the exercise first.")
    ex = doc["exercise"]
    tests = "\n".join(f"- {t['name']}: input {t['input_json'][:300]} -> expected {t['expected_json'][:300]}" for t in ex["tests"])
    exercise = f"Exercise statement shown to the candidate:\n{ex['statement']}\n\nStarter code:\n```js\n{ex['starter_code']}\n```\n\nTests (input is the JSON argument list, or ops/args for a class):\n{tests}"
    current = f"\nThe candidate's current code:\n```js\n{code}\n```" if code.strip() else "\nThe candidate has not written any code yet."
    h.stream_chat(prompts.SYSTEM_PRACTICE_CHAT.format(exercise=exercise, code=current, **PROBLEMS[slug]), messages)
