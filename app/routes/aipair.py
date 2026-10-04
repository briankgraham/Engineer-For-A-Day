"""AI Pairing: scenario list, the assistant chat (with planted flaws), and the evaluation."""
from ..chat import chat_messages
from ..data import load_ap_scenarios
from ..errors import ApiError
from ..features.aipair import (
    FlawFilter, ap_design, ap_files_ok, ap_review, ap_session_path, build_ap_system, evaluate_ap, log_ap_flaw, read_ap_log, read_ap_pr, read_ap_scenario, read_ap_visible_tests)
from .router import get, post

AP_BODY_CAP = 262144


@get("/api/ap/scenarios")
def scenarios(h, q):
    h.send(200, {"scenarios": load_ap_scenarios()})


@post("/api/ap/evaluate", max_body=AP_BODY_CAP)
def evaluate(h, body):
    h.send(200, evaluate_ap(body))


@post("/api/ap/chat", max_body=AP_BODY_CAP)
def chat(h, body):
    sc_id = body.get("scenario")
    meta, flaws = read_ap_scenario(sc_id)
    sess = body.get("session")
    ap_session_path(sess)
    messages = chat_messages(body, 8000)  # replies with code run long
    files = body.get("files")
    if not ap_files_ok(files) or sum(map(len, files.values())) > 60000:
        raise ApiError(400, "Bad files.")
    review = ap_review(body)
    # Object design scenarios: the follow-up (and its flaws) only enter the conversation once the browser has revealed it.
    lld = meta.get("kind") == "lld"
    revealed = lld and body.get("followup") is True
    served = {f["id"] for f in read_ap_log(sess, sc_id)["flaws"]}
    avail = [f for f in flaws if f["id"] not in served and (revealed or not f.get("followup"))]
    system = build_ap_system(meta, files, avail, read_ap_visible_tests(sc_id), sc_id + ".test.js", read_ap_pr(sc_id), review,
                             ap_design(body) if lld else None, meta.get("followup") if revealed else None)
    filt, reply = FlawFilter(f["id"] for f in avail), len(messages) // 2

    def transform(chunks):
        for t in chunks:
            out = filt.feed(t)
            if out:
                yield out
        rest, ids = filt.finish()
        if ids:
            log_ap_flaw(sess, sc_id, ids[0], reply)
        if rest:
            yield rest

    h.stream_chat(system, messages, transform)
