"""LeetCode walkthroughs and the follow-up chat about them."""
import json

from .. import prompts
from ..chat import chat_messages
from ..config import LANGS
from ..data import PROBLEMS
from ..features.walkthrough import generate, read_cache
from . import validate
from .router import first, get, post


@get("/api/walkthrough")
def walkthrough(h, q):
    slug = validate.slug(first(q, "slug"))
    h.send(200, generate(slug, validate.lang(first(q, "lang"))))


@post("/api/walkthrough/regenerate")
def regenerate(h, body):
    slug = validate.slug(body.get("slug"))
    h.send(200, generate(slug, validate.lang(body.get("lang")), force=True))


@post("/api/chat")
def chat(h, body):
    slug = validate.slug(body.get("slug"))
    lang = validate.lang(body.get("lang"))
    messages = chat_messages(body)
    doc = read_cache(slug, lang)
    context = f"Walkthrough already shown to the learner (JSON):\n{json.dumps(doc['walkthrough'], separators=(',', ':'))}" if doc else ""
    h.stream_chat(prompts.SYSTEM_CHAT.format(context=context, lang_name=LANGS[lang], **PROBLEMS[slug]), messages)
