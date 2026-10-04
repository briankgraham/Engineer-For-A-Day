"""System design: walkthrough cache and generation, whiteboard evaluation, and mock interview grading."""
import json, os
from datetime import datetime, timezone

from .. import prompts
from ..errors import ApiError
from ..llm import BACKEND, take_budget, translate
from ..schemas import SCHEMA_SD, SCHEMA_SD_EVAL, SCHEMA_SD_GRADE, valid
from ..config import SD_DIR, current_model
from ..data import SD_FRAMEWORK, SD_PROBLEMS, SD_TOPICS
from ..util import key_lock


def sd_path(pid):
    return os.path.join(SD_DIR, f"{pid}.json")


def read_sd(pid):
    try:
        with open(sd_path(pid), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def generate_sd(pid, force=False):
    lock = key_lock(("sd", pid))
    with lock:
        if not force:
            doc = read_sd(pid)
            if doc:
                return doc
        take_budget()
        p = SD_PROBLEMS[pid]
        related = "; ".join(f"{SD_TOPICS[t]['name']}" for t in p["topics"])
        try:
            walk = BACKEND.json(prompts.SYSTEM_SD_WALK, f"Problem: {p['name']}\nDifficulty: {p['diff']}\nSummary: {p['blurb']}\nKey requirements: {'; '.join(p['reqs'])}\nRelated building blocks: {related}", SCHEMA_SD)
        except Exception as e:
            raise translate(e)
        if not valid(walk, SCHEMA_SD) or not walk["architecture"]["components"]:
            raise ApiError(502, "The model returned an unusable walkthrough. Try Regenerate.")
        doc = {"id": pid, "model": current_model(), "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "walkthrough": walk}
        os.makedirs(SD_DIR, exist_ok=True)
        tmp = sd_path(pid) + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(doc, f, indent=1, ensure_ascii=False)
        os.replace(tmp, sd_path(pid))
        return doc


NODE_TYPES = {"rect": "box", "db": "database", "ell": "ellipse", "text": "text label"}


def _short(v, n=300):
    return isinstance(v, str) and len(v) <= n


def _board_text(board):
    """Validate a serialized whiteboard and render it as text for the model. Raises 400 on a malformed board."""
    nodes, edges = board.get("nodes"), board.get("edges")
    ok = (isinstance(nodes, list) and isinstance(edges, list) and 0 < len(nodes) <= 120 and len(edges) <= 200
          and all(isinstance(n, dict) and _short(n.get("id"), 20) and n.get("type") in NODE_TYPES and _short(n.get("text"))
                  and all(isinstance(n.get(k), (int, float)) for k in ("x", "y")) for n in nodes)
          and all(isinstance(e, dict) and e.get("dir") in ("one", "two", "none") and _short(e.get("text"))
                  and all(e.get(k) is None or _short(e.get(k), 20) for k in ("from", "to")) for e in edges))
    if not ok:
        raise ApiError(400, "Bad board.")
    label = {n["id"]: f'{n["id"]} [{NODE_TYPES[n["type"]]}] "{n["text"]}"' for n in nodes}
    lines = [f'{label[n["id"]]} at ({round(n["x"])},{round(n["y"])})' for n in nodes]
    arrows = {"one": "->", "two": "<->", "none": "--"}
    conns = []
    for e in edges:
        a = e["from"] if e.get("from") in label else "(nothing, dangling end)"
        b = e["to"] if e.get("to") in label else "(nothing, dangling end)"
        conns.append(f'{a} {arrows[e["dir"]]} {b}' + (f' "{e["text"]}"' if e["text"] else " (unlabeled)"))
    return "Components (x grows right, y grows down):\n" + "\n".join(lines) + "\n\nConnections:\n" + ("\n".join(conns) or "(none)")


def evaluate_sd(pid, board, notes):
    if not (notes is None or (isinstance(notes, str) and len(notes) <= 6000)):
        raise ApiError(400, "Bad board.")
    board_text = _board_text(board)
    p = SD_PROBLEMS[pid]
    take_budget()
    user = (f"Problem: {p['name']} ({p['diff']}). {p['blurb']}\nRubric (key requirements): {'; '.join(p['reqs'])}\n\n"
            + board_text + (f"\n\nCandidate notes:\n{notes}" if notes and notes.strip() else ""))
    try:
        ev = BACKEND.json(prompts.SYSTEM_SD_EVAL, user, SCHEMA_SD_EVAL)
    except Exception as e:
        raise translate(e)
    if not valid(ev, SCHEMA_SD_EVAL) or not 1 <= ev["score"] <= 5:
        raise ApiError(502, "The model returned an unusable evaluation. Try again.")
    return {"id": pid, "model": current_model(), "at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "evaluation": ev}


def grade_sd(pid, body):
    """Pass/fail grade for a finished mock interview, from its transcript, scratchpad and whiteboard."""
    msgs, scratch, board, secs, mins = (body.get(k) for k in ("messages", "scratch", "board", "secs", "mins"))
    ok = (isinstance(msgs, list) and len(msgs) <= 60
          and all(isinstance(m, dict) and m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str)
                  and len(m["content"]) <= 4000 for m in msgs)
          and isinstance(scratch, str) and len(scratch) <= 20000
          and (board is None or isinstance(board, dict))
          and all(isinstance(v, int) and not isinstance(v, bool) and 0 <= v <= 100000 for v in (secs, mins)))
    if not ok:
        raise ApiError(400, "Bad interview.")
    if not scratch.strip() and not board and not any(m["role"] == "user" for m in msgs):
        raise ApiError(400, "Nothing to grade yet: talk to the interviewer, write in the scratchpad or draw on the whiteboard first.")
    board_text = _board_text(board) if board else "(not used)"
    transcript = "\n\n".join(f"{'Candidate' if m['role'] == 'user' else 'Interviewer'}: {m['content']}" for m in msgs) or "(no chat)"
    p = SD_PROBLEMS[pid]
    steps = "\n".join(f"- {s['id']}: {s['name']} (~{s['mins']} min). {s['desc']}" for s in SD_FRAMEWORK)
    user = (f"Problem: {p['name']} ({p['diff']}). {p['blurb']}\nRubric (key requirements): {'; '.join(p['reqs'])}\n\n"
            f"Framework steps:\n{steps}\n\nTime used: {secs // 60} min {secs % 60} s of {mins} min.\n\n"
            f"Transcript:\n{transcript}\n\nScratchpad:\n{scratch.strip() or '(empty)'}\n\nWhiteboard:\n{board_text}")
    take_budget()
    try:
        g = BACKEND.json(prompts.SYSTEM_SD_GRADE, user, SCHEMA_SD_GRADE)
    except Exception as e:
        raise translate(e)
    ids = [s["id"] for s in SD_FRAMEWORK]
    if (not valid(g, SCHEMA_SD_GRADE) or g["verdict"].strip().lower() not in ("pass", "fail")
            or sorted(s["step"] for s in g["steps"]) != sorted(ids) or not all(1 <= s["score"] <= 5 for s in g["steps"])):
        raise ApiError(502, "The model returned an unusable grade. Try again.")
    g["verdict"] = g["verdict"].strip().lower()
    return {"id": pid, "model": current_model(), "at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "grade": g}
