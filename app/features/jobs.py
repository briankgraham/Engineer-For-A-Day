"""Live job openings for the companies in data/jobs_boards.json (see scripts/build_jobs_boards.py).

Pulls public Greenhouse / Lever / Ashby / Workday job boards on the server, trims each posting to a few fields
(the raw responses are megabytes of descriptions), caches them for an hour, and answers filtered,
paginated queries for the Jobs tab. Board tokens come only from jobs_boards.json, never from a request,
and only the fixed API hosts below (plus validated *.myworkdayjobs.com tenants) are ever contacted.
Workday is one generic connector: a board is {"ats": "workday", "host", "tenant", "site"}, plus an optional "search"
term (sent as Workday's searchText, default WORKDAY_DEFAULT_SEARCH) so only matching roles are ever requested, and optional
"max", "concurrency" and "facets" (Workday appliedFacets) overrides. Workday pages are fetched in parallel.
Greenhouse / Lever / Ashby answers are cached with their ETag, so an unchanged board costs one 304 and no download.
"""
import functools, json, os, re, threading, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from ..config import JOBS_BOARDS_FILE as BOARDS_FILE, JOBS_CACHE_DIR as CACHE_DIR

COOLDOWN = 300    # seconds before a board may be fetched again (protects the public APIs from repeated clicks)
RETRY = 60        # seconds before a board that failed may be fetched again
MAX_BYTES = 40 * 1024 * 1024
WORKERS = 6
WAIT = 90         # seconds a refresh request waits for the boards before answering
URLS = {
    "greenhouse": "https://boards-api.greenhouse.io/v1/boards/{}/jobs",
    "lever": "https://api.lever.co/v0/postings/{}?mode=json",
    "ashby": "https://api.ashbyhq.com/posting-api/job-board/{}",
}
WORKDAY_URL = "https://{host}/wday/cxs/{tenant}/{site}/jobs"
WORKDAY_PAGE = 20          # Workday rejects larger pages, and each page costs about the same time regardless of size
WORKDAY_MAX_JOBS = 500     # default cap per fetch (25 pages). Pages are fetched WORKDAY_PAGE_WORKERS at a time, so this takes a few
                           # seconds; a slow or retried page delays only its own board. Raise per-board with a "max" in jobs_boards.json.
WORKDAY_MAX_JOBS_CEILING = 1000  # a config "max" can raise the cap, but never past this
WORKDAY_PAGE_WORKERS = 5   # parallel page requests per Workday board (per-board "concurrency" overrides, up to WORKDAY_WORKERS_CEILING)
WORKDAY_WORKERS_CEILING = 10
WORKDAY_DEFAULT_SEARCH = "software engineer"  # boards with no "search" use this: we never page through unrelated postings
WORKDAY_HOST = re.compile(r"[a-z0-9-]+\.wd\d{1,3}\.myworkdayjobs\.com")
WORKDAY_NAME = re.compile(r"[A-Za-z0-9_.-]{1,80}")

STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado", "CT": "Connecticut",
    "DE": "Delaware", "DC": "District of Columbia", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois",
    "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri", "MT": "Montana",
    "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania",
    "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}
STATE_BY_NAME = {v.lower(): k for k, v in STATES.items() if k != "DC"}
# Cities that boards often list without a state.
CITIES = {
    "san francisco": "CA", "sf": "CA", "palo alto": "CA", "mountain view": "CA", "sunnyvale": "CA", "san jose": "CA", "menlo park": "CA",
    "redwood city": "CA", "santa clara": "CA", "cupertino": "CA", "los angeles": "CA", "san diego": "CA", "irvine": "CA", "oakland": "CA",
    "south san francisco": "CA", "foster city": "CA", "santa monica": "CA", "playa vista": "CA", "new york": "NY", "new york city": "NY",
    "nyc": "NY", "brooklyn": "NY", "seattle": "WA", "bellevue": "WA", "redmond": "WA", "kirkland": "WA", "austin": "TX", "dallas": "TX",
    "houston": "TX", "boston": "MA", "cambridge": "MA", "chicago": "IL", "denver": "CO", "boulder": "CO", "atlanta": "GA",
    "washington dc": "DC", "washington, dc": "DC", "portland": "OR", "miami": "FL", "philadelphia": "PA", "pittsburgh": "PA",
    "minneapolis": "MN", "salt lake city": "UT", "raleigh": "NC", "nashville": "TN", "phoenix": "AZ", "detroit": "MI",
}
US_TOKEN = re.compile(r"\b(united states|usa|u\.s\.a?\.?|us|north america)\b", re.I)
NON_US = re.compile(
    r"\b(india|canada|united kingdom|uk|england|scotland|ireland|germany|france|spain|italy|netherlands|poland|sweden|norway|denmark|"
    r"finland|switzerland|austria|belgium|portugal|romania|ukraine|czech|hungary|israel|turkey|uae|dubai|saudi|egypt|nigeria|kenya|"
    r"south africa|china|japan|korea|taiwan|singapore|hong kong|australia|new zealand|philippines|vietnam|thailand|indonesia|"
    r"malaysia|pakistan|bangladesh|brazil|mexico|argentina|colombia|chile|peru|emea|apac|latam|latin america|south america|"
    r"central america|middle east|africa|europe|asia|"
    r"london|dublin|berlin|munich|paris|amsterdam|madrid|barcelona|lisbon|warsaw|krakow|zurich|stockholm|copenhagen|toronto|vancouver|"
    r"montreal|ottawa|calgary|bengaluru|bangalore|hyderabad|pune|mumbai|delhi|gurgaon|gurugram|noida|chennai|tokyo|osaka|seoul|"
    r"beijing|shanghai|shenzhen|tel aviv|sydney|melbourne|sao paulo|s[aã]o paulo|mexico city|bogota|buenos aires)\b", re.I)
ENG = re.compile(
    r"\b(engineers?|engineering|developers?|software|swe|sde|sre|devops|programmer|architect|machine learning|ml|ai|data scientist|"
    r"data engineer|security|firmware|backend|back-end|frontend|front-end|full[- ]?stack|ios|android|platform|infrastructure|"
    r"research scientist|applied scientist|quant|quantitative|technical lead|tech lead)\b", re.I)
NOT_ENG = re.compile(r"\b(sales|solutions?|support|customer|field|recruit\w*|technician|mechanical|civil|manufacturing|marketing|legal|account)\b", re.I)


LEVELS = (("intern", "Internship"), ("entry", "New grad / entry"), ("mid", "Mid-level"), ("senior", "Senior"), ("staff", "Staff / principal"), ("manager", "Management"))
_L_INTERN = re.compile(r"\b(interns?|internships?|co-?ops?|apprentices?|apprenticeships?)\b", re.I)
_L_MANAGER = re.compile(r"\b(managers?|directors?|head of|vp|vice president|chief)\b", re.I)
_L_STAFF = re.compile(r"\b(staff|principal|distinguished|fellow|member of technical staff iv)\b", re.I)
_L_SENIOR = re.compile(r"\b(senior|sr\.?|lead|iii|iv|l5|l6|sde ?iii)\b", re.I)
_L_ENTRY = re.compile(r"\b(new grads?|new graduates?|university|college|early career|entry[- ]level|graduate|junior|jr\.?|associate)\b|\b(engineer|developer|sde|swe|scientist)\s+(i|1)\b", re.I)


@functools.lru_cache(maxsize=20000)
def level_of(title):
    """Seniority bucket from a job title: intern, entry, mid, senior, staff or manager. No level in the title means mid."""
    for key, rx in (("intern", _L_INTERN), ("manager", _L_MANAGER), ("staff", _L_STAFF), ("senior", _L_SENIOR), ("entry", _L_ENTRY)):
        if rx.search(title or ""):
            return key
    return "mid"


def classify_location(text, country=None, region=None, remote=False):
    """Return (is_us, state_abbr, remote) from free-text location fields."""
    text = (text or "").strip()
    low = text.lower()
    is_remote = bool(remote) or "remote" in low
    if country:
        c = str(country).strip().lower()
        if c in ("us", "usa", "united states", "united states of america", "u.s."):
            st = region.upper() if isinstance(region, str) and region.upper() in STATES else ""
            if not st:
                st = _state_from_text(text)
            return True, st, is_remote
        if len(c) > 1 and not US_TOKEN.search(text) and not _state_from_text(text):
            return False, "", is_remote
    for part in re.split(r"[;|/]", text):
        st = _part_state(part)
        if st is not None:
            return True, st, is_remote
    if NON_US.search(text):
        return False, "", is_remote
    if is_remote:  # plain "Remote": no country given, so treat as US-eligible
        return True, "", True
    return False, "", is_remote


def _part_state(part):
    """State abbreviation ("" if only "US" is stated) when one location part is in the US, else None."""
    us_word = US_TOKEN.search(part)
    if NON_US.search(part) and not us_word:  # "Mumbai, IN" is India, not Indiana
        return None
    st = _state_from_text(part)
    return st if (st or us_word) else None


def _state_from_text(text):
    for m in re.finditer(r",\s*([A-Z]{2})\b", text):
        if m.group(1) in STATES:
            return m.group(1)
    low = text.lower()
    for name in sorted(STATE_BY_NAME, key=len, reverse=True):
        if re.search(r"\b" + re.escape(name) + r"\b", low) and not (name == "washington" and "dc" in low):
            return STATE_BY_NAME[name]
    for city in sorted(CITIES, key=len, reverse=True):
        if re.search(r"\b" + re.escape(city) + r"\b", low):
            return CITIES[city]
    return ""


def is_eng(title):
    t = title or ""
    return bool(ENG.search(t)) and (not NOT_ENG.search(t) or bool(re.search(r"\bsoftware\b", t, re.I)))


def _iso_date(v):
    if isinstance(v, (int, float)):
        return datetime.fromtimestamp(v / 1000, timezone.utc).strftime("%Y-%m-%d")
    return v[:10] if isinstance(v, str) and re.match(r"\d{4}-\d{2}-\d{2}", v) else ""


def _workday_date(v):
    """"Posted Today" / "Posted Yesterday" / "Posted 3 Days Ago" / "Posted 30+ Days Ago" -> YYYY-MM-DD."""
    v = (v or "").lower()
    if "today" in v:
        days = 0
    elif "yesterday" in v:
        days = 1
    else:
        m = re.search(r"(\d+)\+?\s*day", v)
        if not m:
            return ""
        days = int(m.group(1))
    return (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")


def _workday_location(j):
    """locationsText, or the first location from the URL slug when Workday only says "2 Locations"."""
    loc = (j.get("locationsText") or "").strip()
    if loc and not re.fullmatch(r"\d+\s+locations?", loc, re.I):
        return loc
    m = re.match(r"/job/([^/]+)/", j.get("externalPath") or "")
    if not m:
        return loc
    slug = re.sub(r"-([A-Z]{2})$", r", \1", m.group(1))
    return " - ".join(p.replace("-", " ") for p in slug.split("---"))


def _job(company, title, loc, url, posted, country=None, region=None, remote=False, dept=""):
    us, state, is_remote = classify_location(loc, country, region, remote)
    return {"company": company, "title": (title or "").strip(), "location": (loc or "").strip(), "us": us, "state": state,
            "remote": is_remote, "url": url, "posted": _iso_date(posted), "dept": (dept or "").strip(), "eng": is_eng(title)}


def normalize(company, ats, data):
    out = []
    if ats == "greenhouse":
        for j in (data.get("jobs") or []) if isinstance(data, dict) else []:
            out.append(_job(company, j.get("title"), (j.get("location") or {}).get("name"), j.get("absolute_url"),
                            j.get("first_published") or j.get("updated_at")))
    elif ats == "lever":
        for j in data if isinstance(data, list) else []:
            cat = j.get("categories") or {}
            locs = cat.get("allLocations") or [cat.get("location")]
            out.append(_job(company, j.get("text"), "; ".join(l for l in locs if l), j.get("hostedUrl"), j.get("createdAt"),
                            country=j.get("country"), remote=j.get("workplaceType") == "remote", dept=cat.get("team")))
    elif ats == "ashby":
        for j in (data.get("jobs") or []) if isinstance(data, dict) else []:
            if j.get("isListed") is False:
                continue
            addr = (j.get("address") or {}).get("postalAddress") or {}
            out.append(_job(company, j.get("title"), j.get("location"), j.get("jobUrl"), j.get("publishedAt"),
                            country=addr.get("addressCountry"), region=addr.get("addressRegion"), remote=j.get("isRemote"),
                            dept=j.get("department")))
    if ats == "workday" and isinstance(data, dict):
        host, site = data.get("host"), data.get("site")
        for j in data.get("jobPostings") or []:
            out.append(_job(company, j.get("title"), _workday_location(j), f"https://{host}/{site}{j.get('externalPath') or ''}",
                            _workday_date(j.get("postedOn"))))
    return _dedupe([j for j in out if j["title"] and j["url"] and j["url"].startswith("https://")])


def _canon_url(url):
    u = re.sub(r"[?#].*$", "", (url or "").lower()).rstrip("/")
    return re.sub(r"^(https://[^/]+)/[a-z]{2}-[a-z]{2}/", r"\1/", u)  # Workday locale prefix, e.g. /en-US/


def _dedupe(jobs):
    """Drop repeats by canonical URL, and by (company, title, location) when they come from different hosts (same role on two boards).

    Same-host rows with equal title and location are separate requisitions and are all kept. The first one seen wins, but one with a date
    replaces one without.
    """
    seen, out = {}, []
    for j in jobs:
        url = _canon_url(j["url"])
        cross = (j["company"].lower(), j["title"].lower(), j["location"].lower())
        host = url.split("/")[2] if url.count("/") >= 2 else ""
        i = seen.get(url)
        if i is None and cross in seen and out[seen[cross]]["_host"] != host:
            i = seen[cross]
        if i is None:
            i = len(out)
            out.append(dict(j, _host=host))
        elif not out[i]["posted"] and j["posted"]:
            out[i] = dict(j, _host=host)
        seen.setdefault(url, i)
        seen.setdefault(cross, i)
    return [{k: v for k, v in j.items() if k != "_host"} for j in out]


# ---------- board cache ----------
_lock = threading.Lock()
_mem = {}          # company -> {"at": epoch, "jobs": [...], "error": str}
_worker = None     # background refresh thread
_boards = None


def _valid_board(v):
    if v.get("ats") == "workday":
        return (bool(WORKDAY_HOST.fullmatch(v.get("host", ""))) and bool(WORKDAY_NAME.fullmatch(v.get("tenant", "")))
                and bool(WORKDAY_NAME.fullmatch(v.get("site", ""))) and isinstance(v.get("search", ""), str) and len(v.get("search", "")) <= 80
                and (isinstance(v.get("max"), int) and 20 <= v["max"] <= WORKDAY_MAX_JOBS_CEILING if "max" in v else True)
                and (isinstance(v.get("concurrency"), int) and 1 <= v["concurrency"] <= WORKDAY_WORKERS_CEILING if "concurrency" in v else True)
                and (isinstance(v.get("facets"), dict) and all(isinstance(k, str) and isinstance(x, list) and all(isinstance(i, str) for i in x)
                                                               for k, x in v["facets"].items()) if "facets" in v else True))
    return v.get("ats") in URLS and bool(re.fullmatch(r"[a-z0-9._-]{1,80}", v.get("token", "")))


def boards():
    global _boards
    if _boards is None:
        try:
            with open(BOARDS_FILE, encoding="utf-8") as f:
                _boards = {k: v for k, v in json.load(f).items() if _valid_board(v)}
        except (OSError, ValueError):
            _boards = {}
    return _boards


def _cache_file(company):
    return os.path.join(CACHE_DIR, re.sub(r"[^a-z0-9]+", "_", company.lower()).strip("_") + ".json")


def _entry(company):
    e = _mem.get(company)
    if e is None:
        try:
            with open(_cache_file(company), encoding="utf-8") as f:
                e = json.load(f)
            if not isinstance(e, dict) or not isinstance(e.get("jobs"), list):
                e = None
        except (OSError, ValueError):
            e = None
        if e is not None:
            _mem[company] = e
    return e


def _request(req, meta=None):
    """One HTTP call returning parsed JSON; retries once after a pause on 429/5xx (Workday throttles).

    If `meta` is a dict, the response's ETag is stored in it. A 304 answer to a conditional request is not retried and
    surfaces as the urllib HTTPError, for the caller to handle.
    """
    for attempt in (0, 1):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                raw = r.read(MAX_BYTES + 1)
                if meta is not None:
                    meta["etag"] = r.headers.get("ETag") or ""
            if len(raw) > MAX_BYTES:
                raise ValueError("response too large")
            return json.loads(raw)
        except urllib.error.HTTPError as ex:
            if attempt or ex.code not in (429, 500, 502, 503, 504):
                raise
            wait = ex.headers.get("Retry-After") or ""
            time.sleep(min(int(wait), 30) if wait.isdigit() else 3)


def _fetch_workday(b, start=0, chunk=None):
    """Page through one Workday career site from offset `start` (POST, 20 per page, about 1.5s each no matter the page
    size), for at most `chunk` jobs (this board's "max", or WORKDAY_MAX_JOBS) and never past WORKDAY_MAX_JOBS_CEILING.

    Only postings matching the board's search term (or WORKDAY_DEFAULT_SEARCH) are requested, never the whole career site.
    The first page comes back alone (it carries Workday's "total"), then the remaining pages go out WORKDAY_PAGE_WORKERS at a
    time. If the first page has no usable total, pages go out in waves and stop at the first short one.

    Returns {"host", "site", "jobPostings", "next_offset", "more"}. "more" means a full page was still coming in when
    this call stopped for its own chunk limit, not that Workday's own data ran out - "total" is not trustworthy past
    2000, so end-of-data is judged by a short page, or by total when the chunk is within it.
    """
    url = WORKDAY_URL.format(host=b["host"], tenant=b["tenant"], site=b["site"])
    end = min(start + (chunk if chunk is not None else min(b.get("max") or WORKDAY_MAX_JOBS, WORKDAY_MAX_JOBS_CEILING)), WORKDAY_MAX_JOBS_CEILING)
    workers = b.get("concurrency") or WORKDAY_PAGE_WORKERS
    facets, search = b.get("facets") or {}, b.get("search") or WORKDAY_DEFAULT_SEARCH

    def page(offset):
        body = json.dumps({"appliedFacets": facets, "limit": WORKDAY_PAGE, "offset": offset, "searchText": search}).encode()
        return _request(urllib.request.Request(url, data=body, method="POST", headers={
            "User-Agent": "leetcode-tracker-jobs/1.0", "Accept": "application/json", "Content-Type": "application/json"}))

    first = page(start)
    posts, total = list(first.get("jobPostings") or []), first.get("total") or 0
    offset, end_of_data = start + WORKDAY_PAGE, len(posts) < WORKDAY_PAGE
    if total and total <= 2000:
        end = min(end, total)  # only trust total below Workday's 2000 cutoff
    with ThreadPoolExecutor(workers) as ex:
        while not end_of_data and offset < end:
            offsets = list(range(offset, end, WORKDAY_PAGE)) if total else list(range(offset, min(end, offset + workers * WORKDAY_PAGE), WORKDAY_PAGE))
            for rows in ex.map(lambda o: page(o).get("jobPostings") or [], offsets):  # results come back in offset order
                posts += rows
                offset += WORKDAY_PAGE
                if len(rows) < WORKDAY_PAGE:
                    end_of_data = True
                    break
    if total and total <= 2000 and offset >= total:
        end_of_data = True
    return {"host": b["host"], "site": b["site"], "jobPostings": posts, "next_offset": offset,
            "more": not end_of_data and offset < WORKDAY_MAX_JOBS_CEILING}


def _save(company, e):
    with _lock:
        _mem[company] = e
    try:
        os.makedirs(CACHE_DIR, exist_ok=True)
        tmp = _cache_file(company) + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(e, f)
        os.replace(tmp, _cache_file(company))
    except OSError:
        pass


def _fetch(company):
    b = boards()[company]
    try:
        if b["ats"] == "workday":
            data = _fetch_workday(b)
            e = {"at": time.time(), "jobs": normalize(company, b["ats"], data), "error": "", "offset": data["next_offset"], "more": data["more"]}
        else:
            headers = {"User-Agent": "leetcode-tracker-jobs/1.0", "Accept": "application/json"}
            prev = _entry(company)
            if prev and prev.get("etag") and not prev.get("error"):
                headers["If-None-Match"] = prev["etag"]  # 304 = board unchanged, skip the download and re-normalize
            meta = {}
            try:
                data = _request(urllib.request.Request(URLS[b["ats"]].format(b["token"]), headers=headers), meta)
                e = {"at": time.time(), "jobs": normalize(company, b["ats"], data), "error": "", "etag": meta.get("etag", "")}
            except urllib.error.HTTPError as ex:
                if ex.code != 304 or not prev:
                    raise
                e = dict(prev, at=time.time(), error="")
    except Exception as ex:  # keep any previous jobs so one bad fetch does not empty a company
        prev = _entry(company)
        e = {"at": time.time(), "jobs": prev["jobs"] if prev else [], "error": type(ex).__name__}
        if prev:
            e["offset"], e["more"], e["etag"] = prev.get("offset", 0), prev.get("more", False), prev.get("etag", "")
    _save(company, e)


MORE_COOLDOWN = 20  # seconds between "fetch more" clicks for the same company, so a double-click cannot double the work
_more_at = {}       # company -> epoch of its last "fetch more" call
_more_busy = set()  # companies with a "fetch more" fetch in flight


def fetch_more(company):
    """One more capped chunk of a Workday board, beyond what its normal fetch already holds (see _fetch_workday).

    Only for Workday: the other ATSes already return every posting in one call. Still bounded by WORKDAY_MAX_JOBS_CEILING,
    same as a normal fetch - this extends how much of one board is loaded, it does not lift the limit on it.
    """
    b = boards().get(company)
    if not b or b.get("ats") != "workday":
        return {"more": False, "added": 0, "error": "unsupported"}
    with _lock:
        e = _entry(company)
        if not e or not e.get("more"):
            return {"more": False, "added": 0}
        now = time.time()
        if company in _more_busy or now - _more_at.get(company, 0) < MORE_COOLDOWN:
            return {"more": e["more"], "added": 0, "busy": True}
        _more_busy.add(company)
        _more_at[company] = now
        start = e.get("offset", 0)
    try:
        data = _fetch_workday(b, start=start)
        combined = _dedupe(e["jobs"] + normalize(company, "workday", data))
        new_e = {"at": time.time(), "jobs": combined, "error": "", "offset": data["next_offset"], "more": data["more"]}
        _save(company, new_e)
        return {"more": new_e["more"], "added": len(combined) - len(e["jobs"]), "total": len(combined)}
    except Exception as ex:
        return {"more": e["more"], "added": 0, "error": type(ex).__name__}
    finally:
        with _lock:
            _more_busy.discard(company)


def _refresh(companies):
    with ThreadPoolExecutor(WORKERS) as ex:
        list(ex.map(_fetch, companies))


def refresh():
    """Fetch the boards that are due (older than COOLDOWN, or failed more than RETRY ago) and wait for them.

    This is the only code path that contacts the job boards, and it runs only when the user clicks Refresh.
    """
    global _worker
    with _lock:
        now = time.time()
        entries = {c: _entry(c) for c in boards()}
        due = [c for c, e in entries.items() if e is None or now - e["at"] >= (RETRY if e.get("error") else COOLDOWN)]
        if not due and not (_worker is not None and _worker.is_alive()):
            wait = min((COOLDOWN - (now - e["at"]) for e in entries.values() if e), default=0)
            return {"refreshed": 0, "cooldown": max(1, int(wait)), "done": True}
        if due and (_worker is None or not _worker.is_alive()):
            _worker = threading.Thread(target=_refresh, args=(due,), daemon=True)
            _worker.start()
        w = _worker
    w.join(WAIT)
    return {"refreshed": len(due), "cooldown": 0, "done": not w.is_alive()}


# ---------- query ----------
def _one(q, key, default=""):
    v = q.get(key)
    return (v[0] if isinstance(v, list) and v else v) or default


def _int(q, key, default, lo, hi):
    try:
        return max(lo, min(hi, int(_one(q, key, default))))
    except (TypeError, ValueError):
        return default


def query(q):
    """q: parsed query-string dict. Returns one page of filtered jobs from the cache; never contacts the job boards."""
    text = _one(q, "q").strip().lower()[:80]
    company = _one(q, "company")
    state = _one(q, "state").upper()
    level = _one(q, "level")
    remote = _one(q, "remote") == "1"
    eng = _one(q, "eng", "1") == "1"
    days = _int(q, "days", 0, 0, 365)
    limit, offset = _int(q, "limit", 50, 1, 100), _int(q, "offset", 0, 0, 10 ** 6)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d") if days else ""
    all_us, rows, ok, failed, more = [], [], 0, 0, {}
    for c in boards():
        e = _entry(c)
        if e is None:
            continue
        if e.get("error"):
            failed += 1
        else:
            ok += 1
        if e.get("more"):
            more[c] = True
        all_us.extend(j for j in e["jobs"] if j["us"] and (j["eng"] or not eng))
    all_us = _dedupe(all_us)  # same role listed on two boards
    counts, states, levels = {}, {}, {}
    for j in all_us:
        if text and text not in j["title"].lower() and text not in j["dept"].lower():
            continue
        if remote and not j["remote"]:
            continue
        if cutoff and j["posted"] < cutoff:
            continue
        counts[j["company"]] = counts.get(j["company"], 0) + 1
        if company and j["company"] != company:
            continue
        lv = level_of(j["title"])
        state_ok, level_ok = not state or j["state"] == state, not level or lv == level
        if j["state"] and level_ok:
            states[j["state"]] = states.get(j["state"], 0) + 1
        if state_ok:
            levels[lv] = levels.get(lv, 0) + 1
        if state_ok and level_ok:
            rows.append(j)
    rows.sort(key=lambda j: (j["posted"], j["company"]), reverse=True)
    times = [e["at"] for e in (_entry(c) for c in boards()) if e]
    return {"total": len(rows), "jobs": [{k: j[k] for k in ("company", "title", "location", "state", "remote", "url", "posted")} for j in rows[offset:offset + limit]],
            "companies": sorted(counts.items(), key=lambda kv: kv[0].lower()), "states": sorted(states.items()), "levels": levels,
            "updated_at": datetime.fromtimestamp(min(times), timezone.utc).isoformat() if times else "",
            "boards": {"total": len(boards()), "ok": ok, "failed": failed, "loaded": ok + failed}, "more": more}
