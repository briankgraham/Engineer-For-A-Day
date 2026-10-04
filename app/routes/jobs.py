"""Job board listings."""
from ..errors import ApiError
from ..features import jobs
from .router import get, post


@get("/api/jobs")
def listings(h, q):
    h.send(200, jobs.query(q))


@post("/api/jobs/refresh")
def refresh(h, body):
    h.send(200, jobs.refresh())


@post("/api/jobs/more")
def more(h, body):
    company = body.get("company")
    if not isinstance(company, str) or company not in jobs.boards():
        raise ApiError(400, "Bad company.")
    h.send(200, jobs.fetch_more(company))
