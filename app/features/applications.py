"""Applications you are tracking from the Jobs tab: board postings you clicked Track on, plus jobs found elsewhere.

Kept in var/applications.json (git-ignored) so clearing the browser never loses them. Every field that comes from the
browser goes through clean(); unknown keys are dropped, and ids are made here, never taken from a new record.
"""
import json, os, re, secrets, threading
from datetime import datetime, timezone

from ..config import APPLICATIONS_FILE as FILE
from ..errors import ApiError

STATUSES = ("saved", "applied", "interviewing", "offer", "rejected", "withdrawn", "ghosted")
KINDS = ("screen", "technical", "onsite", "behavioral", "other")
SOURCES = ("board", "manual")
MAX_APPS = 2000
MAX_EVENTS = 50
DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
ID = re.compile(r"[0-9a-f]{16}")
_lock = threading.Lock()


def _now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _read():
    try:
        with open(FILE, encoding="utf-8") as f:
            apps = json.load(f)
        return apps if isinstance(apps, list) else []
    except (OSError, ValueError):
        return []


def _write(apps):
    os.makedirs(os.path.dirname(FILE), exist_ok=True)
    with open(FILE + ".tmp", "w", encoding="utf-8") as f:
        json.dump(apps, f, indent=1)
    os.replace(FILE + ".tmp", FILE)


def _text(raw, field, cap, required=False):
    v = raw.get(field, "")
    if v is None:
        v = ""
    if not isinstance(v, str):
        raise ApiError(400, f"Bad {field}.")
    v = v.strip()
    if len(v) > cap:
        raise ApiError(400, f"{field.capitalize()} is too long.")
    if required and not v:
        raise ApiError(400, f"{field.capitalize()} is required.")
    return v


def _date(raw, field):
    v = _text(raw, field, 10)
    if v and not DATE.fullmatch(v):
        raise ApiError(400, f"Bad {field}.")
    return v


def _enum(raw, field, allowed, default):
    v = raw.get(field) or default
    if v not in allowed:
        raise ApiError(400, f"Bad {field}.")
    return v


def clean(raw):
    """The browser's record, checked and trimmed to the known fields (id and timestamps are added by save)."""
    url = _text(raw, "url", 2000)
    if not url.lower().startswith(("https://", "http://")):
        url = ""
    events = raw.get("events") or []
    if not isinstance(events, list) or len(events) > MAX_EVENTS:
        raise ApiError(400, "Bad events.")
    evs = []
    for e in events:
        if not isinstance(e, dict):
            raise ApiError(400, "Bad events.")
        evs.append({"date": _date(e, "date"), "kind": _enum(e, "kind", KINDS, "other"), "note": _text(e, "note", 1000)})
    evs.sort(key=lambda e: e["date"] or "9999")
    replied = raw.get("replied", False)
    if not isinstance(replied, bool):
        raise ApiError(400, "Bad replied.")
    return {
        "company": _text(raw, "company", 200, required=True),
        "title": _text(raw, "title", 300, required=True),
        "url": url,
        "location": _text(raw, "location", 300),
        "source": _enum(raw, "source", SOURCES, "manual"),
        "status": _enum(raw, "status", STATUSES, "saved"),
        "applied_on": _date(raw, "applied_on"),
        "replied": replied,
        "replied_on": _date(raw, "replied_on") if replied else "",
        "events": evs,
        "notes": _text(raw, "notes", 10000),
    }


def list_all():
    with _lock:
        apps = _read()
    return sorted(apps, key=lambda a: a.get("updated_at", ""), reverse=True)


def save(raw):
    """Create (no id) or update (with id) one record. Tracking a board posting that is already tracked returns that record."""
    rec = clean(raw)
    aid = raw.get("id")
    with _lock:
        apps = _read()
        if aid:
            if not isinstance(aid, str) or not ID.fullmatch(aid):
                raise ApiError(400, "Bad id.")
            for i, a in enumerate(apps):
                if a.get("id") == aid:
                    apps[i] = {**rec, "id": aid, "created_at": a.get("created_at") or _now(), "updated_at": _now()}
                    _write(apps)
                    return apps[i]
            raise ApiError(404, "Unknown application.")
        if rec["url"]:
            for a in apps:
                if a.get("url") == rec["url"]:
                    return a
        if len(apps) >= MAX_APPS:
            raise ApiError(400, "Too many tracked applications.")
        now = _now()
        rec = {**rec, "id": secrets.token_hex(8), "created_at": now, "updated_at": now}
        apps.append(rec)
        _write(apps)
        return rec


def delete(aid):
    if not isinstance(aid, str) or not ID.fullmatch(aid):
        raise ApiError(400, "Bad id.")
    with _lock:
        apps = _read()
        keep = [a for a in apps if a.get("id") != aid]
        if len(keep) == len(apps):
            raise ApiError(404, "Unknown application.")
        _write(keep)
