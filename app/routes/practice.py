"""Coding practice exercises and the solution review."""
from .. import prompts
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
