// Jobs tab: live software openings (Remote, SF Bay Area, Austin) from /api/jobs, each with a Track button into My applications (applications.js). Loaded on first visit to the tab (see openJobs in index.html).
(() => {
const root = document.getElementById("tab-jobs");
const PAGE = 50;
const NOT_COVERED = [
  ["Google", "https://www.google.com/about/careers/applications/jobs/results/"],
  ["Amazon", "https://www.amazon.jobs/en/"],
  ["Meta", "https://www.metacareers.com/jobs"],
  ["Microsoft", "https://jobs.careers.microsoft.com/global/en/search"],
  ["Apple", "https://jobs.apple.com/en-us/search"],
];
const ce = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const LEVELS = [["intern", "Internship"], ["entry", "New grad / entry"], ["mid", "Mid-level"], ["senior", "Senior"], ["staff", "Staff / principal"], ["manager", "Management"]];
const AREAS = { remote: "Remote", sf: "SF Bay Area", austin: "Austin" };
const f = { q: "", company: "", area: "", level: "", eng: true, days: "" };
let built = false, page = 0, gen = 0, companyNames = {}, view = "open", last = null;
const ui = {};
const AKEY = "jobs.applied";
let legacy = {};
try { legacy = JSON.parse(localStorage.getItem(AKEY)) || {}; } catch (e) {}
const saveLegacy = () => { try { if (Object.keys(legacy).length) localStorage.setItem(AKEY, JSON.stringify(legacy)); else localStorage.removeItem(AKEY); } catch (e) {} };

function build() {
  built = true;
  // Openings (the job boards) and My applications (window.Apps, applications.js) share the tab.
  const top = ce("header", "jobs-top"), seg = ce("div", "jobs-seg");
  top.append(ce("h1", null, "Jobs"), seg);
  ui.vOpen = ce("button", null, "Openings"); ui.vApps = ce("button", null, "My applications");
  ui.vOpen.onclick = () => setView("open"); ui.vApps.onclick = () => setView("apps");
  seg.append(ui.vOpen, ui.vApps);
  ui.openEl = ce("div"); ui.appsEl = ce("div"); ui.appsEl.hidden = true; Apps.mount(ui.appsEl);
  const header = ce("header"), main = ce("main");
  ui.stats = ce("div", "stats"); header.appendChild(ui.stats);
  const bar = ce("div", "controls");
  ui.q = ce("input"); ui.q.type = "search"; ui.q.placeholder = "Search title or team…";
  ui.company = ce("input"); ui.company.type = "search"; ui.company.placeholder = "Company (all)…"; ui.company.autocomplete = "off";
  ui.company.setAttribute("list", "jobs-colist"); ui.company.style.cssText = "flex:0 1 170px;min-width:120px";
  ui.colist = ce("datalist"); ui.colist.id = "jobs-colist";
  ui.area = ce("select"); ui.area.title = "Remote, the SF Bay Area (SF through Santa Clara / San Jose, Oakland and nearby) or Austin";
  ui.area.appendChild(new Option("Remote, SF Bay Area & Austin", ""));
  ui.level = ce("select"); ui.level.title = "Seniority, read from the job title";
  ui.level.appendChild(new Option("All levels", ""));
  LEVELS.forEach(([v, l]) => ui.level.appendChild(new Option(l, v)));
  ui.days = ce("select");
  [["", "Posted any time"], ["1", "Last 24 hours"], ["7", "Last 7 days"], ["30", "Last 30 days"]].forEach(([v, l]) => ui.days.appendChild(new Option(l, v)));
  const check = (label, key, tip) => {
    const l = ce("label"), c = ce("input"); c.type = "checkbox"; c.checked = f[key];
    l.style.cssText = "display:flex;align-items:center;gap:6px;white-space:nowrap"; l.title = tip;
    l.append(c, document.createTextNode(label));
    c.onchange = () => { f[key] = c.checked; apply(); };
    return l;
  };
  bar.append(ui.q, ui.company, ui.colist, ui.area, ui.level, ui.days,
    check("Engineering roles", "eng", "Only software, data, ML, security and infrastructure titles"));
  ui.refresh = ce("button", null, "Refresh");
  ui.refresh.title = "Fetch the latest postings from the company job boards (at most once every 5 minutes)";
  ui.refresh.onclick = doRefresh;
  bar.appendChild(ui.refresh);
  header.appendChild(bar);

  const table = ce("table");
  table.innerHTML = "<thead><tr><th>Company</th><th>Title</th><th>Location</th><th class=\"num\">Posted</th><th></th></tr></thead>";
  ui.rows = ce("tbody"); table.appendChild(ui.rows);
  const st = ce("style", null, "#tab-jobs tr.applied td:not(:last-child){opacity:.55}");
  header.appendChild(st);
  const pager = ce("div", "pager");
  ui.prev = ce("button", null, "Prev"); ui.next = ce("button", null, "Next"); ui.page = ce("span");
  pager.append(ui.prev, ui.page, ui.next);
  ui.more = ce("button", null, "Fetch more from this company");
  ui.more.title = "This company's board has more postings than are loaded; fetch another batch (capped, and at most once every 20s)";
  ui.more.style.display = "none";
  ui.more.onclick = doFetchMore;
  ui.note = ce("p"); ui.note.style.cssText = "color:var(--muted);font-size:12px;max-width:80ch;margin:16px auto 0;text-align:center";
  main.append(table, pager, ui.more, ui.note);
  ui.openEl.append(header, main);
  root.replaceChildren(top, ui.openEl, ui.appsEl);
  Apps.onChange(() => { if (last) markTracked(); });

  let deb = null;
  ui.q.oninput = () => { clearTimeout(deb); deb = setTimeout(() => { f.q = ui.q.value.trim(); apply(); }, 250); };
  ui.area.onchange = () => { f.area = ui.area.value; apply(); };
  ui.level.onchange = () => { f.level = ui.level.value; apply(); };
  ui.days.onchange = () => { f.days = ui.days.value; apply(); };
  // Same rule as the LeetCode company filter: commit on pick / Enter / blur, or when cleared, so typing "Snap" does not filter early.
  const applyCompany = () => {
    const c = companyNames[ui.company.value.trim().toLowerCase()] || "";
    if (c === f.company) return;
    f.company = c; apply();
  };
  ui.company.oninput = e => {
    const typing = e && e.inputType && e.inputType !== "insertReplacementText";
    if (!typing || !ui.company.value.trim()) applyCompany();
  };
  ui.company.onchange = applyCompany;
  ui.prev.onclick = () => { page = Math.max(0, page - 1); load(); };
  ui.next.onclick = () => { page++; load(); };
}

const apply = () => { page = 0; load(); };

function setView(v) {
  view = v;
  ui.vOpen.classList.toggle("on", v === "open"); ui.vApps.classList.toggle("on", v === "apps");
  ui.openEl.hidden = v !== "open"; ui.appsEl.hidden = v !== "apps";
  if (v === "apps") Apps.show(ui.appsEl);
}

// Track opens the My applications editor prefilled from the posting; once tracked the button opens that record instead.
// Rows you have applied to (an applied date, or moved past Saved) are dimmed.
const isApplied = a => !!a && (!!a.applied_on || a.status !== "saved");
function markTracked() {
  ui.rows.querySelectorAll("button.track").forEach(b => {
    const a = Apps.byUrl(b.dataset.url);
    b.textContent = a ? "Tracked ✓" : "Track"; b.classList.toggle("on", !!a);
    b.title = a ? `${Apps.label(a.status)}: open it in My applications` : "Track this posting in My applications";
    b.closest("tr").classList.toggle("applied", isApplied(a));
  });
}

// Before tracking lived on the server, an Applied checkbox kept {url: date} in this browser; each mark moves into
// My applications the first time its row is shown.
async function migrate(j) {
  const date = legacy[j.url];
  try {
    await Apps.load();
    const a = Apps.byUrl(j.url);
    if (!isApplied(a)) await Apps.save(a ? { ...a, status: "applied", applied_on: date }
      : { company: j.company, title: j.title, location: j.location, url: j.url, source: "board", status: "applied", applied_on: date });
    delete legacy[j.url]; saveLegacy();
  } catch (e) {}  // server unreachable: keep the local mark and try again next time the row is shown
}

function ago(iso) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - Date.parse(iso + "T12:00:00Z")) / 864e5);
  if (d <= 0) return "today";
  if (d < 14) return d + "d ago";
  if (d < 60) return Math.floor(d / 7) + "w ago";
  return new Date(iso + "T12:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function render(d) {
  last = d;
  ui.rows.replaceChildren();
  d.jobs.forEach(j => {
    const tr = ce("tr");
    tr.appendChild(ce("td", null, j.company));
    const t = ce("td"), a = ce("a", null, j.title);
    if (j.url.startsWith("https://")) { a.href = j.url; a.target = "_blank"; a.rel = "noopener noreferrer"; }
    t.appendChild(a); tr.appendChild(t);
    const loc = ce("td", "topics", j.location); if (j.remote && !/remote/i.test(j.location)) loc.textContent += " · Remote";
    tr.appendChild(loc);
    const p = ce("td", "num", ago(j.posted)); p.title = j.posted; tr.appendChild(p);
    const tc = ce("td", "num"), tb = ce("button", "track", "Track");
    tb.dataset.url = j.url;
    tb.onclick = () => Apps.open(Apps.byUrl(j.url) || { company: j.company, title: j.title, location: j.location, url: j.url, source: "board" });
    tc.appendChild(tb); tr.appendChild(tc);
    if (legacy[j.url]) migrate(j);
    ui.rows.appendChild(tr);
  });
  if (!d.jobs.length) {
    const tr = ce("tr"), td = ce("td", null, d.boards.loaded ? "No openings match these filters." : "No openings loaded yet. Click Refresh to fetch them from the company job boards.");
    td.colSpan = 5; td.style.cssText = "text-align:center;color:var(--muted);padding:28px"; tr.appendChild(td); ui.rows.appendChild(tr);
  }
  const pages = Math.max(1, Math.ceil(d.total / PAGE));
  ui.page.textContent = `Page ${page + 1} of ${pages} · ${d.total.toLocaleString()} openings`;
  ui.prev.disabled = page === 0; ui.next.disabled = page + 1 >= pages;
  ui.more.style.display = f.company && d.more && d.more[f.company] ? "" : "none";
  if (!ui.more.classList.contains("busy")) ui.more.textContent = "Fetch more from " + f.company;
  ui.colist.replaceChildren(); companyNames = {};
  d.companies.forEach(([n, c]) => { companyNames[n.toLowerCase()] = n; const o = new Option(n); o.label = `${c} openings`; ui.colist.appendChild(o); });
  const keep = ui.area.value;
  ui.area.replaceChildren(new Option("Remote, SF Bay Area & Austin", ""));
  d.areas.forEach(([a, c]) => ui.area.appendChild(new Option(`${AREAS[a]} (${c})`, a)));
  ui.area.value = d.areas.some(([a]) => a === keep) ? keep : "";
  LEVELS.forEach(([v, l], i) => { ui.level.options[i + 1].textContent = d.levels[v] ? `${l} (${d.levels[v]})` : l; });
  const b = d.boards, upd = d.updated_at ? Math.max(0, Math.round((Date.now() - Date.parse(d.updated_at)) / 60000)) : null;
  const age = upd === null ? "" : upd < 1 ? "just now" : upd < 60 ? upd + " min ago" : upd < 1440 ? Math.round(upd / 60) + " h ago" : Math.round(upd / 1440) + " d ago";
  ui.stats.className = "stats";
  ui.stats.textContent = b.loaded
    ? `${d.companies.length} companies hiring · updated ${age}` + (b.failed ? ` · ${b.failed} boards unavailable` : "")
    : "Nothing loaded yet";
  markTracked();
  ui.note.textContent = `Covers the ${b.total} companies from this tracker that publish on Greenhouse, Lever, Ashby or Workday. Google, Amazon, Meta, Microsoft and Apple run their own sites: `;
  NOT_COVERED.forEach(([n, u], i) => {
    const a = ce("a", null, n); a.href = u; a.target = "_blank"; a.rel = "noopener noreferrer";
    ui.note.append(a, document.createTextNode(i < NOT_COVERED.length - 1 ? ", " : "."));
  });
}

// Spinner while a request is in flight: a full-table loader when the table is empty, a busy status line otherwise.
function showLoading(msg) {
  ui.stats.className = "stats busy";
  ui.stats.textContent = msg;
  ui.rows.style.opacity = ui.rows.children.length ? ".5" : "";
  if (!ui.rows.children.length) {
    const tr = ce("tr"), td = ce("td"), sp = ce("div", "busy", msg);
    td.colSpan = 5; td.style.cssText = "padding:32px;color:var(--muted)"; sp.style.justifyContent = "center";
    td.appendChild(sp); tr.appendChild(td); ui.rows.appendChild(tr);
  }
}

// Reads the server's cache only. Selecting the tab, filtering and paging all go through here and never reach the job boards.
async function load(flash) {
  const my = ++gen, p = new URLSearchParams({ limit: PAGE, offset: page * PAGE, eng: f.eng ? 1 : 0 });
  if (f.q) p.set("q", f.q);
  if (f.company) p.set("company", f.company);
  if (f.area) p.set("area", f.area);
  if (f.level) p.set("level", f.level);
  if (f.days) p.set("days", f.days);
  if (!flash) showLoading("Loading…");
  try {
    const res = await fetch("/api/jobs?" + p, { headers: { "X-Requested-With": "walkthrough" } });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Request failed");
    if (my !== gen) return;
    ui.rows.style.opacity = "";
    render(d);
    if (flash) ui.stats.textContent += " · " + flash;
  } catch (err) {
    if (my !== gen) return;
    ui.rows.style.opacity = ""; ui.rows.replaceChildren();
    ui.stats.className = "stats";
    ui.stats.textContent = err instanceof TypeError ? "Jobs need the local server. In a terminal run: python3 server.py — then open http://localhost:8000" : err.message;
  }
}

// The only request that contacts the company job boards (through the server), and only when the Refresh button is clicked.
async function doRefresh() {
  if (ui.refresh.disabled) return;
  ui.refresh.disabled = true; ui.refresh.classList.add("busy");
  ++gen;  // ignore any cache read still in flight
  showLoading("Fetching the latest openings from company job boards… this can take up to a minute");
  let flash = "";
  try {
    const res = await fetch("/api/jobs/refresh", { method: "POST", headers: { "X-Requested-With": "walkthrough", "Content-Type": "application/json" }, body: "{}" });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Request failed");
    if (d.cooldown) flash = `already refreshed recently, try again in ${Math.ceil(d.cooldown / 60)} min`;
    else if (!d.done) flash = "some boards are still loading, click Refresh again shortly";
  } catch (err) {
    flash = err instanceof TypeError ? "server not reachable" : err.message;
  }
  await load(flash);
  ui.refresh.disabled = false; ui.refresh.classList.remove("busy");
}

// One more capped batch for the company currently filtered on (Workday boards only; see fetch_more in jobs.py).
async function doFetchMore() {
  if (ui.more.disabled) return;
  const company = f.company;
  ui.more.disabled = true; ui.more.classList.add("busy"); ui.more.textContent = "Fetching more…";
  let flash = "";
  try {
    const res = await fetch("/api/jobs/more", { method: "POST", headers: { "X-Requested-With": "walkthrough", "Content-Type": "application/json" }, body: JSON.stringify({ company }) });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Request failed");
    flash = d.busy ? "already fetching, try again shortly" : d.error ? `couldn't fetch more (${d.error})` : `+${d.added} more from ${company}`;
  } catch (err) {
    flash = err instanceof TypeError ? "server not reachable" : err.message;
  }
  ui.more.classList.remove("busy");
  await load(flash);
  ui.more.disabled = false;
}

window.jobsInit = () => {
  if (!built) { build(); setView("open"); }
  if (view === "apps") return Apps.show(ui.appsEl);
  page = 0; load();
  Apps.load().catch(() => {});  // to mark rows already tracked
};
})();
