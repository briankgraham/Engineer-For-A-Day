#!/usr/bin/env python3
"""Build data/jobs_boards.json: which public job board (Greenhouse, Lever, Ashby or Workday) each company in data/companies.csv uses.

    python3 scripts/build_jobs_boards.py            # probe companies that are not in jobs_boards.json yet
    python3 scripts/build_jobs_boards.py --redo     # probe everything again (manual entries are kept)
    python3 scripts/build_jobs_boards.py --workday "CrowdStrike" crowdstrike.wd5.myworkdayjobs.com/crowdstrikecareers ["software engineer"]
                                                    # add one Workday tenant by hand (verified, saved as manual); the optional
                                                    # search term (default "software engineer") limits a huge career site to matching roles

Each company name is turned into a few slug guesses and tried against the three public job-board APIs
(status only, bodies are not downloaded). Hits are written to jobs_boards.json as
{"Stripe": {"ats": "greenhouse", "token": "stripe"}}. Add or fix entries by hand; entries with
"manual": true are never overwritten. Guesses can hit the wrong company, so review the printed list.
"""
import csv, json, os, re, sys, urllib.error, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
OUT = os.path.join(DATA_DIR, "jobs_boards.json")
URLS = {
    "greenhouse": "https://boards-api.greenhouse.io/v1/boards/{}/jobs",
    "lever": "https://api.lever.co/v0/postings/{}?mode=json",
    "ashby": "https://api.ashbyhq.com/posting-api/job-board/{}",
}
# Workday: tenant + site on one of a few data-centre hosts (wdN), all served by the same /wday/cxs/{tenant}/{site}/jobs API.
WORKDAY_DCS = (5, 1, 3, 12, 501, 103, 2, 4)
WORKDAY_SITES = ("External", "Careers", "{t}careers", "{t}_careers", "{t}", "{T}ExternalCareerSite", "External_Career_Site", "ExternalCareerSite")


def workday_check(host, tenant, site):
    """True when POSTing a one-job search to this tenant/site returns a Workday jobPostings list."""
    url = f"https://{host}/wday/cxs/{tenant}/{site}/jobs"
    body = json.dumps({"appliedFacets": {}, "limit": 1, "offset": 0, "searchText": ""}).encode()
    req = urllib.request.Request(url, data=body, method="POST", headers={"User-Agent": "leetcode-tracker-jobs/1.0", "Content-Type": "application/json", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            return "jobPostings" in json.loads(r.read(2_000_000))
    except (urllib.error.URLError, TimeoutError, ConnectionError, OSError, ValueError):
        return False


def workday_find(tenant):
    """Guess host + site for a tenant slug. The site name is read from the tenant's robots.txt ("Allow: /{site}/"), else common names are tried.

    A tenant that does not exist on a data centre fails DNS (URLError); one that exists answers, even when the root page says 406.
    """
    for dc in WORKDAY_DCS:
        host = f"{tenant}.wd{dc}.myworkdayjobs.com"
        sites = []
        try:
            with urllib.request.urlopen(urllib.request.Request(f"https://{host}/robots.txt", headers={"User-Agent": "leetcode-tracker-jobs/1.0"}), timeout=12) as r:
                sites = re.findall(r"^Allow:\s*/([A-Za-z0-9_.-]+)/\s*$", r.read(20000).decode("utf-8", "replace"), re.M)
        except urllib.error.HTTPError:
            pass  # tenant exists but has no robots.txt: fall back to guessed site names
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError):
            continue  # no such tenant on this data centre
        for site in sites + [x.format(t=tenant, T=tenant.upper()) for x in WORKDAY_SITES]:
            if workday_check(host, tenant, site):
                return {"ats": "workday", "host": host, "tenant": tenant, "site": site}
    return None


# Slug guesses that hit a different company, or an empty board. Add to this after reviewing the printed list.
SKIP = {"Wise", "tcs", "Disney", "Tiger Analytics", "Zeta", "zeta suite", "Bolt", "Clari", "Lowe's", "Hotstar"}
NOISE = re.compile(r"\b(inc|corp|corporation|ltd|llc|plc|co|company|group|technologies|technology|tech|systems|software|labs|capital management|holdings|the)\b", re.I)


def slugs(name):
    base = re.sub(r"\(.*?\)", "", name).strip()
    cands = []
    for s in (base, NOISE.sub("", base)):
        s = s.lower().strip()
        words = re.findall(r"[a-z0-9]+", s)
        if not words:
            continue
        joined = "".join(words)
        cands += [joined, "-".join(words)]
        # a first-word guess is only safe for single-word names ("Capital One" must not match the board "capital")
        cands += [joined + x for x in ("hq", "inc", "usa", "careers")]
    seen, out = set(), []
    for c in cands:
        if c not in seen and len(c) > 1:
            seen.add(c)
            out.append(c)
    return out


def probe(ats, token):
    req = urllib.request.Request(URLS[ats].format(token), headers={"User-Agent": "leetcode-tracker-jobs/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            ok = r.status == 200
            # peek at only the start of the body to make sure it is a job board, then drop the connection
            head = r.read(200) if ok else b""
            return ok and (b"jobs" in head or head.lstrip()[:1] == b"[" or b"apiVersion" in head or b"{" in head[:5])
    except (urllib.error.URLError, TimeoutError, ConnectionError, OSError):
        return False


def find(name):
    cands = slugs(name)
    for token in cands:
        for ats in URLS:
            if probe(ats, token):
                return {"ats": ats, "token": token}
    for token in cands[:2]:  # Workday last: it needs a DNS lookup per data centre, so only the two cleanest slugs
        hit = workday_find(token)
        if hit:
            return hit
    return None


def add_workday(name, where, search="software engineer"):
    m = re.fullmatch(r"(?:https://)?(([a-z0-9-]+)\.wd\d{1,3}\.myworkdayjobs\.com)/(?:[a-z]{2}-[A-Z]{2}/)?([A-Za-z0-9_.-]+)/?", where)
    if not m:
        sys.exit("expected HOST/SITE, e.g. crowdstrike.wd5.myworkdayjobs.com/crowdstrikecareers")
    host, tenant, site = m.groups()
    if not workday_check(host, tenant, site):
        sys.exit(f"{host}/{site} did not return Workday jobPostings")
    boards = json.load(open(OUT)) if os.path.exists(OUT) else {}
    boards[name] = {"ats": "workday", "host": host, "tenant": tenant, "site": site, "manual": True, **({"search": search} if search else {})}
    boards = {k: boards[k] for k in sorted(boards, key=str.lower)}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(boards, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print(f"added {name}: {host}/{site}", file=sys.stderr)


def main():
    if "--workday" in sys.argv:
        i = sys.argv.index("--workday")
        if len(sys.argv) < i + 3:
            sys.exit('usage: --workday "Company" HOST/SITE ["search term"]')
        return add_workday(*sys.argv[i + 1:i + 4])
    redo = "--redo" in sys.argv
    names = sorted({r["Company"] for r in csv.DictReader(open(os.path.join(DATA_DIR, "companies.csv"), newline="", encoding="utf-8"))})
    boards = json.load(open(OUT)) if os.path.exists(OUT) else {}
    if redo:  # drop stale guesses first so a company that no longer matches is not left with an old wrong entry
        boards = {k: v for k, v in boards.items() if v.get("manual")}
    todo = [n for n in names if n not in SKIP and (n not in boards or (redo and not boards[n].get("manual")))]
    print(f"{len(names)} companies, probing {len(todo)}", file=sys.stderr)
    with ThreadPoolExecutor(12) as ex:
        for n, hit in zip(todo, ex.map(find, todo)):
            if hit:
                boards[n] = hit
                print(f"  {n}: {hit['ats']}/{hit['token']}", file=sys.stderr)
    boards = {k: boards[k] for k in sorted(boards, key=str.lower) if k not in SKIP}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(boards, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print(f"\nmatched {sum(1 for n in names if n in boards)} of {len(names)} companies -> {OUT}", file=sys.stderr)
    print("not matched: " + ", ".join(n for n in names if n not in boards), file=sys.stderr)


if __name__ == "__main__":
    main()
