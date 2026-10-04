#!/usr/bin/env python3
"""Rebuild data/GLOBAL.csv from data/companies.csv, then refresh the data embedded in web/index.html
(including the hand-curated data/senior_favs.json).

Run from anywhere: python3 scripts/build_global.py [--window 30d|3m|6m|older|all]
"""
import argparse, csv, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")


WINDOWS = {"30d": "Freq30d", "3m": "Freq3m", "6m": "Freq6m", "older": "FreqOlder", "all": "FreqAll"}


def aggregate(window="all"):
    # One row per (company, problem) in companies.csv; `window` picks which recency column feeds the ranking.
    col = WINDOWS[window]
    agg = {}
    with open(os.path.join(DATA_DIR, "companies.csv"), newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if not r[col]:
                continue
            link, freq = r["Link"].strip(), float(r[col])
            a = agg.setdefault(link, {"d": r["Difficulty"], "t": r["Title"], "topics": "", "n": 0, "s": 0.0, "cos": []})
            a["n"] += 1
            a["cos"].append([r["Company"], round(freq, 1)])
            a["s"] += freq
            if not a["topics"] and r.get("Topics"):
                a["topics"] = r["Topics"]
    return sorted(agg.items(), key=lambda kv: (-kv[1]["s"], -kv[1]["n"], kv[1]["t"]))


def write_csv(rows):
    with open(os.path.join(DATA_DIR, "GLOBAL.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Rank", "Difficulty", "Title", "Companies", "Total Frequency", "Avg Frequency", "Link", "Topics"])
        for i, (link, a) in enumerate(rows, 1):
            w.writerow([i, a["d"], a["t"], a["n"], round(a["s"], 1), round(a["s"] / a["n"], 1), link, a["topics"]])


def update_html(rows):
    # [rank, diff initial, title, companies, total freq, avg freq, slug, topics]
    data = [
        [i, a["d"][0], a["t"], a["n"], round(a["s"], 1), round(a["s"] / a["n"], 1), link.rstrip("/").split("/")[-1], a["topics"]]
        for i, (link, a) in enumerate(rows, 1)
    ]
    path = os.path.join(ROOT, "web", "index.html")
    with open(path, encoding="utf-8") as f:
        html = f.read()
    payload = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
    new, n = re.subn(r"^const DATA=.*;$", lambda _: f"const DATA={payload};", html, count=1, flags=re.M)
    if n != 1:
        raise SystemExit("index.html: could not find the `const DATA=...;` line")
    # companies per problem: {slug: [[name, frequency]]}, sorted case-insensitively
    comp = {link.rstrip("/").split("/")[-1]: sorted(a["cos"], key=lambda c: c[0].lower()) for link, a in rows}
    payload = json.dumps(comp, separators=(",", ":"), ensure_ascii=False)
    new, n = re.subn(r"^const COMP=.*;$", lambda _: f"const COMP={payload};", new, count=1, flags=re.M)
    if n != 1:
        raise SystemExit("index.html: could not find the `const COMP=...;` line")
    # hand-curated senior-loop favorites: {slug: [why, follow-up]}
    with open(os.path.join(DATA_DIR, "senior_favs.json"), encoding="utf-8") as f:
        favs = {x["slug"]: [x["why"], x["followup"]] for x in json.load(f)}
    missing = sorted(set(favs) - set(comp))
    if missing:
        raise SystemExit(f"data/senior_favs.json: slugs not in the data: {', '.join(missing)}")
    payload = json.dumps(favs, separators=(",", ":"), ensure_ascii=False)
    new, n = re.subn(r"^const SENIOR=.*;$", lambda _: f"const SENIOR={payload};", new, count=1, flags=re.M)
    if n != 1:
        raise SystemExit("index.html: could not find the `const SENIOR=...;` line")
    with open(path, "w", encoding="utf-8") as f:
        f.write(new)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--window", choices=list(WINDOWS), default="all", help="recency window to rank by (default: all)")
    rows = aggregate(ap.parse_args().window)
    write_csv(rows)
    update_html(rows)
    print(f"{len(rows)} problems -> data/GLOBAL.csv, web/index.html")
