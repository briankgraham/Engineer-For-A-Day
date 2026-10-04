"""LeetCode walkthroughs: per-problem cache and generation."""
import json, os
from datetime import datetime, timezone

from .. import prompts
from ..errors import ApiError
from ..llm import BACKEND, take_budget, translate
from ..config import CACHE_DIR, LANGS, current_model
from ..data import PROBLEMS
from ..schemas import SCHEMA, valid
from ..util import key_lock


def cache_path(slug, lang):
    return os.path.join(CACHE_DIR, f"{slug}.{lang}.json")


def read_cache(slug, lang):
    try:
        with open(cache_path(slug, lang), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def generate(slug, lang, force=False):
    lock = key_lock((slug, lang))
    with lock:
        if not force:
            doc = read_cache(slug, lang)
            if doc:
                return doc
        take_budget()
        p = PROBLEMS[slug]
        try:
            walk = BACKEND.json(prompts.SYSTEM_WALK, f"Problem: {p['title']}\nDifficulty: {p['difficulty']}\nTopics: {p['topics']}\nSlug: {slug}\nLink: {p['link']}\nLanguage for all code: {LANGS[lang]}")
        except Exception as e:
            raise translate(e)
        if not valid(walk, SCHEMA) or not walk["approaches"]:
            raise ApiError(502, "The model returned an unusable walkthrough. Try Regenerate.")
        doc = {"slug": slug, "lang": lang, "model": current_model(), "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "walkthrough": walk}
        os.makedirs(CACHE_DIR, exist_ok=True)
        tmp = cache_path(slug, lang) + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(doc, f, indent=1, ensure_ascii=False)
        os.replace(tmp, cache_path(slug, lang))
        return doc
