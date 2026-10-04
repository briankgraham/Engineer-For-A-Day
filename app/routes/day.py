"""Engineer for a Day: scenario list, persona chat (with planted flaws), and the end-of-day review."""
from ..data import load_day_scenarios
from ..features.aipair import FlawFilter
from ..features.day import assist_request, chat_request, evaluate_day, log_flaw
from .router import get, post

DAY_BODY_CAP = 524288


@get("/api/day/scenarios")
def scenarios(h, q):
    h.send(200, {"days": load_day_scenarios()})


@post("/api/day/evaluate", max_body=DAY_BODY_CAP)
def evaluate(h, body):
    h.send(200, evaluate_day(body))


@post("/api/day/assist", max_body=DAY_BODY_CAP)
def assist(h, body):
    h.stream_chat(*assist_request(body))


@post("/api/day/chat", max_body=DAY_BODY_CAP)
def chat(h, body):
    system, messages, persona, thread, avail, sess, did = chat_request(body)
    filt, said = FlawFilter(f["id"] for f in avail), []

    def transform(chunks):
        for t in chunks:
            out = filt.feed(t)
            if out:
                said.append(out)
                yield out
        rest, ids = filt.finish()
        if rest:
            said.append(rest)
        if ids:
            log_flaw(sess, did, ids[0], persona, thread, "".join(said))
        if rest:
            yield rest

    h.stream_chat(system, messages, transform)
