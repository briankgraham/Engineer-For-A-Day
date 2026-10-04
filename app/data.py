"""Static content loaded once from disk: problems, system design data, AI Pairing scenarios, Engineer for a Day scenarios."""
import csv, json, os, re, sys

from .config import AP_DIR, DATA_DIR, DAY_DIR, SD_FILE


def load_problems():
    problems = {}
    with open(os.path.join(DATA_DIR, "GLOBAL.csv"), newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            slug = r["Link"].rstrip("/").split("/")[-1]
            problems[slug] = {"title": r["Title"], "difficulty": r["Difficulty"], "topics": r["Topics"], "link": r["Link"]}
    return problems


PROBLEMS = load_problems()


def load_sd():
    """System design content lives in sysdesign_data.js as `const SD={...};` (strict JSON)."""
    with open(SD_FILE, encoding="utf-8") as f:
        src = f.read().strip()
    data = json.loads(src[len("const SD="):].rstrip(";"))
    return {p["id"]: p for p in data["problems"]}, {t["id"]: t for t in data["topics"]}, data["framework"]


SD_PROBLEMS, SD_TOPICS, SD_FRAMEWORK = load_sd()


def load_ap_scenarios():
    """Public parts of the AI Pairing scenarios: meta, starter files, tests, (review scenarios) pr.md, (debug scenarios) incident.md and (object design scenarios)
    the follow-up tests. Never reads secret.json or solution/."""
    out = []
    try:
        names = sorted(os.listdir(AP_DIR))
    except OSError:
        return out
    for name in names:
        d = os.path.join(AP_DIR, name)
        if not re.fullmatch(r"[a-z0-9-]+", name) or not os.path.isdir(d):
            continue
        try:
            with open(os.path.join(d, "scenario.json"), encoding="utf-8") as f:
                sc = json.load(f)
            with open(os.path.join(d, "tests.js"), encoding="utf-8") as f:
                tests = f.read()
            visible = None
            try:
                with open(os.path.join(d, "visible_tests.js"), encoding="utf-8") as f:
                    visible = f.read()
            except FileNotFoundError:
                pass
            pr = None
            if sc.get("kind") == "review":
                with open(os.path.join(d, "pr.md"), encoding="utf-8") as f:
                    pr = f.read()
            incident = None
            if sc.get("kind") == "debug":
                with open(os.path.join(d, "incident.md"), encoding="utf-8") as f:
                    incident = f.read()
            followup = {}
            if sc.get("kind") == "lld":
                with open(os.path.join(d, "followup_visible_tests.js"), encoding="utf-8") as f:
                    followup["followupVisibleTests"] = f.read()
                with open(os.path.join(d, "followup_tests.js"), encoding="utf-8") as f:
                    followup["followupTests"] = f.read()
            files = []
            for fn in sc["files"]:
                if not re.fullmatch(r"[A-Za-z0-9_-]+\.js", fn):
                    raise ValueError(f"bad file name {fn!r}")
                with open(os.path.join(d, "files", fn), encoding="utf-8") as f:
                    files.append({"name": fn, "code": f.read()})
        except (OSError, ValueError, KeyError) as e:
            print(f"aipair scenario {name} skipped: {e}", file=sys.stderr)
            continue
        out.append({**sc, "id": name, "files": files, "tests": tests, **({"visibleTests": visible} if visible is not None else {}), **({"pr": pr} if pr is not None else {}), **({"incident": incident} if incident is not None else {}), **followup})
    out.sort(key=lambda s: (s.get("order", 100), s["id"]))
    return out



DAY_HIDDEN_SUITES = ("feature", "incident")


def load_day_scenarios():
    """Public parts of the Engineer for a Day scenarios: day.json, starter files, test suites (the hidden ones run in the
    browser when the day ends, like AI Pairing's tests.js), and the PR, doc and log texts. Never reads secret.json or solution/."""
    out = []
    try:
        names = sorted(os.listdir(DAY_DIR))
    except OSError:
        return out
    for name in names:
        d = os.path.join(DAY_DIR, name)
        if not re.fullmatch(r"[a-z0-9-]+", name) or not os.path.isdir(d):
            continue
        try:
            with open(os.path.join(d, "day.json"), encoding="utf-8") as f:
                day = json.load(f)

            def text(rel):
                with open(os.path.join(d, rel), encoding="utf-8") as f:
                    return f.read()
            revs = [r["file"] for p in day["prs"] for r in p.get("revisions", [])]
            for rel in [x["file"] for x in day["prs"] + day["docs"]] + revs + [day["logs"]["file"]]:
                if not re.fullmatch(r"[a-z]+/[a-z0-9.-]+\.(md|log)", rel):
                    raise ValueError(f"bad path {rel!r}")
            files = []
            for fn in day["files"]:
                if not re.fullmatch(r"[A-Za-z0-9_-]+\.js", fn):
                    raise ValueError(f"bad file name {fn!r}")
                files.append({"name": fn, "code": text(os.path.join("files", fn))})
            day = {**day, "id": name, "files": files,
                   "prs": [{**p, "body": text(p["file"]), "revisions": [{**r, "body": text(r["file"])} for r in p.get("revisions", [])]} for p in day["prs"]],
                   "docs": [{**x, "body": text(x["file"])} for x in day["docs"]],
                   "logs": {**day["logs"], "body": text(day["logs"]["file"])},
                   "tests": {"visible": text("tests/visible.js"), **{s: text(f"tests/{s}.js") for s in DAY_HIDDEN_SUITES}}}
        except (OSError, ValueError, KeyError) as e:
            print(f"day scenario {name} skipped: {e}", file=sys.stderr)
            continue
        out.append(day)
    out.sort(key=lambda s: (s.get("order", 100), s["id"]))
    return out
