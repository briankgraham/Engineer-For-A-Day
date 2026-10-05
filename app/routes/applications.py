"""Tracked job applications (the Jobs tab's My applications view)."""
from ..features import applications
from .router import get, post


@get("/api/applications")
def listing(h, q):
    h.send(200, {"applications": applications.list_all()})


@post("/api/applications/save", max_body=262144)
def save(h, body):
    h.send(200, applications.save(body))


@post("/api/applications/delete")
def delete(h, body):
    applications.delete(body.get("id"))
    h.send(200, {"ok": True})
