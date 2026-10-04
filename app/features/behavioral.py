"""Behavioral: the AI interviewer's system prompt and grading a finished answer."""
from datetime import datetime, timezone

from .. import prompts
from ..config import current_model
from ..errors import ApiError
from ..llm import BACKEND, take_budget, translate
from ..schemas import BH_AREAS, BH_LEVEL_FIT, SCHEMA_BH_GRADE, valid

LEVELS = {"senior": "Senior", "staff": "Staff"}
MSG_CAP = 6000  # a dictated 3-minute answer is roughly 3000 characters


def question_fields(body):
    """The question being practiced, as sent by the page (the question bank lives in web/behavioral.js)."""
    q, comps, lp, level = (body.get(k) for k in ("question", "competencies", "lp", "level"))
    ok = (isinstance(q, str) and 0 < len(q.strip()) <= 400
          and isinstance(comps, list) and 1 <= len(comps) <= 6 and all(isinstance(c, str) and 0 < len(c) <= 60 for c in comps)
          and (lp is None or (isinstance(lp, str) and len(lp) <= 80))
          and level in LEVELS)
    if not ok:
        raise ApiError(400, "Bad question.")
    return {"question": q.strip(), "competencies": ", ".join(comps), "lp": lp or "", "level": level}


def interviewer_system(f, asked):
    lp = f" At Amazon it maps to the Leadership Principle \"{f['lp']}\"." if f["lp"] else ""
    return prompts.SYSTEM_BH_INTERVIEWER.format(
        level=LEVELS[f["level"]], question=f["question"], competencies=f["competencies"], lp=lp,
        scope=prompts.BH_SCOPE[f["level"]], asked=asked)


def grade_bh(body):
    f = question_fields(body)
    msgs, secs = body.get("messages"), body.get("secs")
    ok = (isinstance(msgs, list) and 1 <= len(msgs) <= 30
          and all(isinstance(m, dict) and m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str)
                  and len(m["content"]) <= MSG_CAP for m in msgs)
          and isinstance(secs, int) and not isinstance(secs, bool) and 0 <= secs <= 100000)
    if not ok:
        raise ApiError(400, "Bad interview.")
    if not any(m["role"] == "user" and m["content"].strip() for m in msgs):
        raise ApiError(400, "Nothing to grade yet: answer the question first.")
    level = LEVELS[f["level"]]
    transcript = "\n\n".join(f"{'Candidate' if m['role'] == 'user' else 'Interviewer'}: {m['content']}" for m in msgs)
    user = (f"Question: {f['question']}\nCompetencies: {f['competencies']}"
            + (f"\nAmazon Leadership Principle: {f['lp']}" if f["lp"] else "")
            + f"\nTarget level: {level}\nTime taken: {secs // 60} min {secs % 60} s\n\n"
            f"Transcript:\nInterviewer: {f['question']}\n\n{transcript}")
    system = prompts.SYSTEM_BH_GRADE.format(level=level, scope=prompts.BH_SCOPE[f["level"]])
    take_budget()
    try:
        g = BACKEND.json(system, user, SCHEMA_BH_GRADE)
    except Exception as e:
        raise translate(e)
    if (not valid(g, SCHEMA_BH_GRADE) or g["level_fit"]["verdict"].strip().lower() not in BH_LEVEL_FIT
            or [s["area"] for s in g["scores"]] != list(BH_AREAS) or not all(1 <= s["score"] <= 5 for s in g["scores"])):
        raise ApiError(502, "The model returned an unusable grade. Try again.")
    g["level_fit"]["verdict"] = g["level_fit"]["verdict"].strip().lower()
    return {"model": current_model(), "at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "grade": g}
