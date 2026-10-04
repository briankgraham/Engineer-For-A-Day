"""Coding practice exercises: cache, generation and validation of the model's output."""
import json, os
from datetime import datetime, timezone

from .. import prompts
from ..errors import ApiError
from ..llm import BACKEND, take_budget, translate
from ..schemas import PRACTICE_COMPARE, PRACTICE_KINDS, PRACTICE_TYPES, SCHEMA_PRACTICE, valid
from ..config import PRACTICE_DIR, current_model
from ..data import PROBLEMS
from ..util import key_lock


def practice_path(slug):
    return os.path.join(PRACTICE_DIR, f"{slug}.javascript.json")


def read_practice(slug):
    try:
        with open(practice_path(slug), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def _json_ok(text):
    try:
        json.loads(text)
        return True
    except ValueError:
        return False


def practice_usable(ex):
    """The schema only checks types; check the values the browser harness relies on."""
    if not valid(ex, SCHEMA_PRACTICE):
        return False
    if ex["kind"] not in PRACTICE_KINDS or ex["compare"] not in PRACTICE_COMPARE or ex["return_type"] not in PRACTICE_TYPES:
        return False
    if not ex["function_name"].isidentifier() or not ex["starter_code"].strip() or not ex["reference_solution"].strip():
        return False
    if any(t not in PRACTICE_TYPES for t in ex["arg_types"]) or not 3 <= len(ex["tests"]) <= 30:
        return False
    for t in ex["tests"]:
        if not (_json_ok(t["input_json"]) and _json_ok(t["expected_json"])):
            return False
        inp = json.loads(t["input_json"])
        if ex["kind"] == "function":
            if not isinstance(inp, list) or len(inp) != len(ex["arg_types"]):
                return False
        else:
            ops, args = (inp.get("ops"), inp.get("args")) if isinstance(inp, dict) else (None, None)
            exp = json.loads(t["expected_json"])
            if not (isinstance(ops, list) and isinstance(args, list) and isinstance(exp, list)
                    and len(ops) == len(args) == len(exp) >= 1):
                return False
    return True


def generate_practice(slug, force=False):
    lock = key_lock((slug, "practice"))
    with lock:
        if not force:
            doc = read_practice(slug)
            if doc:
                return doc
        take_budget()
        p = PROBLEMS[slug]
        try:
            ex = BACKEND.json(prompts.SYSTEM_PRACTICE, f"Problem: {p['title']}\nDifficulty: {p['difficulty']}\nTopics: {p['topics']}\nSlug: {slug}\nLink: {p['link']}", SCHEMA_PRACTICE)
        except Exception as e:
            raise translate(e)
        if not practice_usable(ex):
            raise ApiError(502, "The model returned an unusable exercise. Try Regenerate.")
        doc = {"slug": slug, "lang": "javascript", "model": current_model(), "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "exercise": ex}
        os.makedirs(PRACTICE_DIR, exist_ok=True)
        tmp = practice_path(slug) + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(doc, f, indent=1, ensure_ascii=False)
        os.replace(tmp, practice_path(slug))
        return doc
