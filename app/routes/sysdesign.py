"""System design walkthroughs, whiteboard evaluation, estimation drills and the tutor / interviewer chat."""
import json

from .. import prompts
from ..chat import chat_messages
from ..data import SD_PROBLEMS
from ..errors import ApiError
from ..features.sysdesign import evaluate_sd, generate_sd, grade_sd, read_sd
from . import validate
from .router import first, get, post


@get("/api/sd/walkthrough")
def walkthrough(h, q):
    h.send(200, generate_sd(validate.sd_id(first(q, "id"))))


@post("/api/sd/walkthrough/regenerate")
def regenerate(h, body):
    h.send(200, generate_sd(validate.sd_id(body.get("id")), force=True))


@post("/api/sd/evaluate")
def evaluate(h, body):
    pid = validate.sd_id(body.get("id"))
    board = body.get("board")
    if not isinstance(board, dict):
        raise ApiError(400, "Bad board.")
    h.send(200, evaluate_sd(pid, board, body.get("notes")))


@post("/api/sd/grade", max_body=262144)
def grade(h, body):
    h.send(200, grade_sd(validate.sd_id(body.get("id")), body))


@post("/api/sd/chat")
def chat(h, body):
    pid = validate.sd_id(body.get("id"))
    messages, mode, evaluate = chat_messages(body), body.get("mode"), body.get("evaluate") is True
    p = SD_PROBLEMS[pid]
    if mode not in ("tutor", "interviewer"):
        raise ApiError(400, "Bad mode.")
    fields = {"name": p["name"], "diff": p["diff"], "blurb": p["blurb"], "reqs": "; ".join(p["reqs"])}
    if mode == "interviewer":
        system = prompts.SYSTEM_SD_INTERVIEWER.format(**fields) + (prompts.SYSTEM_SD_EVALUATE if evaluate else "")
    else:
        doc = read_sd(pid)
        context = f"Walkthrough already shown to the learner (JSON):\n{json.dumps(doc['walkthrough'], separators=(',', ':'))}" if doc else ""
        system = prompts.SYSTEM_SD_CHAT.format(context=context, **fields)
    h.stream_chat(system, messages)


@post("/api/sd/drill")
def drill(h, body):
    fields = {}
    for k, cap in (("question", 500), ("reference", 3000), ("answer", 4000)):
        v = body.get(k)
        if not isinstance(v, str) or not 0 < len(v.strip()) <= cap:
            raise ApiError(400, "Bad " + k + ".")
        fields[k] = v.strip()
    h.stream_chat(prompts.SYSTEM_SD_DRILL.format(question=fields["question"], reference=fields["reference"]),
                  [{"role": "user", "content": fields["answer"]}])
