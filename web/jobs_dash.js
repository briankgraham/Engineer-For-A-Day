// Jobs dashboard: charts over the cached postings from /api/jobs/stats (role mix, top hiring companies, level, location, posting pace). Used by jobs.js as the Dashboard view.
(() => {
const ROLES = [["software", "Software / backend"], ["frontend", "Frontend / full-stack"], ["mobile", "Mobile"], ["ml", "ML & AI"], ["data", "Data"], ["infra", "Infrastructure & SRE"], ["security", "Security"], ["other", "Other"]];
const LEVEL_NAME = { intern: "Internship", entry: "New grad / entry", mid: "Mid-level", senior: "Senior", staff: "Staff / principal", manager: "Management" };
const AREA_NAME = { remote: "Remote", sf: "SF Bay Area", austin: "Austin" };
const ce = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const NS = "http://www.w3.org/2000/svg";
const se = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
const fmt = n => n.toLocaleString();
const pct = (n, t) => t ? Math.round(100 * n / t) + "%" : "0%";

// Categorical slots 1-7 in fixed order (one per role family, so a role keeps its color under any filter); "Other" is a neutral.
const CSS = `
.jd{--surface:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--grid:#e5e4e0;--s-software:#2a78d6;--s-frontend:#eb6834;--s-mobile:#1baf7a;--s-ml:#eda100;--s-data:#e87ba4;--s-infra:#008300;--s-security:#6250d6;--s-other:#a8a7a1;--s-one:#2a78d6}
:root[data-theme="dark"] .jd{--surface:#1a1a19;--ink:#f0efec;--ink2:#c3c2b7;--grid:#34342f;--s-software:#3987e5;--s-frontend:#d95926;--s-mobile:#199e70;--s-ml:#c98500;--s-data:#d55181;--s-infra:#008300;--s-security:#9085e9;--s-other:#6b6a66;--s-one:#3987e5}
.jd{max-width:1100px;margin:0 auto;padding:12px 16px 40px;color:var(--fg)}
.jd .row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:4px 0 14px}
.jd .row label{display:flex;align-items:center;gap:6px;white-space:nowrap}
.jd .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:12px}
.jd .card{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px 16px;transition:opacity .15s}
.jd .kpi b{display:block;font-size:30px;line-height:1.1;font-variant-numeric:tabular-nums}
.jd .kpi span{color:var(--ink2);font-size:12px}
.jd .grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:12px;margin-bottom:12px}
.jd h3{margin:0 0 2px;font-size:14px}.jd .sub{margin:0 0 12px;font-size:12px;color:var(--ink2)}
.jd.stale .card{opacity:.5}
.jd .donut{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.jd .donut svg{flex:0 0 auto;width:200px;height:200px}
.jd .donut path{stroke:var(--surface);stroke-width:2;cursor:pointer;transition:opacity .12s}
.jd .donut.hov path:not(.on){opacity:.35}
.jd .donut text{fill:var(--ink);text-anchor:middle}
.jd .donut .big{font-size:26px;font-weight:700}.jd .donut .lbl{font-size:11px;fill:var(--ink2)}
.jd .legend{list-style:none;margin:0;padding:0;flex:1 1 200px;min-width:200px}
.jd .legend li{display:flex;align-items:center;gap:8px;padding:3px 6px;border-radius:6px;font-size:13px;cursor:default}
.jd .legend li.on{background:var(--head)}
.jd .sw{width:10px;height:10px;border-radius:2px;flex:0 0 auto}
.jd .legend .n{margin-left:auto;font-variant-numeric:tabular-nums;color:var(--ink2)}
.jd .legend .p{width:36px;text-align:right;font-variant-numeric:tabular-nums;color:var(--ink2)}
.jd .hb{display:grid;grid-template-columns:minmax(80px,150px) 1fr 44px;align-items:center;gap:4px 10px;margin:3px 0;font-size:13px}
.jd .hb .name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--fg)}
.jd .hb button.name{border:0;background:none;padding:0;text-align:left;font:inherit;cursor:pointer;min-height:0}
.jd .hb button.name:hover{color:var(--accent);text-decoration:underline}
.jd .hb .val{text-align:right;font-variant-numeric:tabular-nums;color:var(--ink2)}
.jd .track{height:16px;display:flex;gap:2px}
.jd .seg{height:100%;min-width:2px;border-radius:2px;cursor:pointer;outline-offset:1px;transition:filter .12s}
.jd .seg:hover,.jd .seg:focus-visible{filter:brightness(1.18);outline:2px solid var(--fg)}
.jd .seg:last-child{border-radius:2px 4px 4px 2px}
.jd .cols{display:flex;align-items:flex-end;gap:4px;height:170px;border-bottom:1px solid var(--grid);padding-top:8px}
.jd .col{flex:1 1 0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:stretch;cursor:pointer;min-width:0}
.jd .col i{display:block;background:var(--s-one);border-radius:4px 4px 0 0;min-height:2px;transition:filter .12s}
.jd .col:hover i,.jd .col:focus-visible i{filter:brightness(1.18)}.jd .col:focus-visible{outline:2px solid var(--fg);outline-offset:1px}
.jd .xl{display:flex;gap:4px;margin-top:4px;font-size:11px;color:var(--ink2)}.jd .xl span{flex:1 1 0;text-align:center;white-space:nowrap;overflow:hidden;min-width:0}
.jd .tip{position:fixed;z-index:20;pointer-events:none;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:6px 10px;font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,.25);max-width:260px}
.jd .tip b{font-size:14px;font-variant-numeric:tabular-nums}.jd .tip div{color:var(--ink2)}
.jd details{margin-top:4px}.jd summary{cursor:pointer;color:var(--ink2)}
.jd .tbl{overflow-x:auto}.jd .tbl table{min-width:640px;margin-top:8px}
.jd .empty{text-align:center;color:var(--muted);padding:40px 0}
`;

let el, ui = {}, onCompany = () => {}, gen = 0, f = { eng: true, days: "" }, tip;

function showTip(e, title, value, sub) {
  tip.replaceChildren(ce("b", null, value), ce("div", null, title));
  if (sub) tip.appendChild(ce("div", null, sub));
  tip.hidden = false;
  const r = tip.getBoundingClientRect(), x = Math.min(e.clientX + 14, innerWidth - r.width - 8), y = e.clientY + 16 + r.height > innerHeight ? e.clientY - r.height - 12 : e.clientY + 16;
  tip.style.left = Math.max(8, x) + "px"; tip.style.top = Math.max(8, y) + "px";
}
const hideTip = () => { tip.hidden = true; };
addEventListener("scroll", () => { if (tip) tip.hidden = true; }, { capture: true, passive: true });  // a fixed tooltip would be left behind by a scroll
// Hover and keyboard focus show the same tooltip (a focused mark is anchored to its own box).
function hoverable(n, title, value, sub) {
  n.tabIndex = 0; n.setAttribute("aria-label", `${title}: ${value}${sub ? ", " + sub : ""}`);
  n.addEventListener("pointermove", e => showTip(e, title, value, sub));
  n.addEventListener("pointerleave", hideTip);
  n.addEventListener("focus", () => { const r = n.getBoundingClientRect(); showTip({ clientX: r.left + r.width / 2, clientY: r.top }, title, value, sub); });
  n.addEventListener("blur", hideTip);
  return n;
}

function donut(parent, rows, total) {
  const wrap = ce("div", "donut"), R = 74, W = 30, C = 100;
  const svg = se("svg", { viewBox: "0 0 200 200", role: "img", "aria-label": "Openings by role family" });
  const big = se("text", { x: C, y: C + 4, class: "big" }), lbl = se("text", { x: C, y: C + 20, class: "lbl" });
  big.textContent = fmt(total); lbl.textContent = "openings";
  const legend = ce("ul", "legend"), paths = {}, lis = {};
  const focus = key => {
    wrap.classList.toggle("hov", !!key);
    Object.keys(paths).forEach(k => { paths[k].classList.toggle("on", k === key); lis[k].classList.toggle("on", k === key); });
    const r = rows.find(x => x.key === key);
    big.textContent = r ? fmt(r.n) : fmt(total); lbl.textContent = r ? r.name : "openings";
  };
  let a0 = -Math.PI / 2;
  rows.forEach(r => {
    const a1 = a0 + 2 * Math.PI * r.n / total, big_ = a1 - a0 > Math.PI ? 1 : 0, end = Math.min(a1, a0 + 2 * Math.PI - 1e-4);
    const p = (a, rad) => `${(C + rad * Math.cos(a)).toFixed(2)} ${(C + rad * Math.sin(a)).toFixed(2)}`;
    const d = `M${p(a0, R + W / 2)}A${R + W / 2} ${R + W / 2} 0 ${big_} 1 ${p(end, R + W / 2)}L${p(end, R - W / 2)}A${R - W / 2} ${R - W / 2} 0 ${big_} 0 ${p(a0, R - W / 2)}Z`;
    const path = se("path", { d, fill: `var(--s-${r.key})` });
    hoverable(path, r.name, fmt(r.n), pct(r.n, total) + " of openings");
    path.addEventListener("pointerenter", () => focus(r.key)); path.addEventListener("pointerleave", () => focus(null));
    path.addEventListener("focus", () => focus(r.key)); path.addEventListener("blur", () => focus(null));
    paths[r.key] = path; svg.appendChild(path);
    const li = ce("li"), sw = ce("span", "sw"); sw.style.background = `var(--s-${r.key})`;
    li.append(sw, ce("span", null, r.name), ce("span", "n", fmt(r.n)), ce("span", "p", pct(r.n, total)));
    li.onpointerenter = () => focus(r.key); li.onpointerleave = () => focus(null);
    lis[r.key] = li; legend.appendChild(li);
    a0 = a1;
  });
  svg.append(big, lbl);
  wrap.append(svg, legend); parent.appendChild(wrap);
}

// One row per company: a stacked bar of its role mix, sized against the biggest company.
function companyBars(parent, top, nameOf) {
  const max = Math.max(1, ...top.map(c => c.total));
  top.forEach(c => {
    const row = ce("div", "hb"), name = ce("button", "name", c.company), track = ce("div", "track");
    name.title = `Show ${c.company} openings`; name.onclick = () => onCompany(c.company);
    track.style.width = (100 * c.total / max) + "%";
    ROLES.forEach(([k]) => {
      const n = c.roles[k]; if (!n) return;
      const s = ce("div", "seg"); s.style.flex = n + " 1 0"; s.style.background = `var(--s-${k})`;
      track.appendChild(hoverable(s, `${c.company} · ${nameOf[k]}`, fmt(n), pct(n, c.total) + " of its openings"));
    });
    row.append(name, track, ce("span", "val", fmt(c.total)));
    parent.appendChild(row);
  });
}

// Single-series horizontal bars (levels, locations).
function simpleBars(parent, rows, names) {
  const max = Math.max(1, ...rows.map(r => r[1])), total = rows.reduce((s, r) => s + r[1], 0);
  rows.forEach(([k, n]) => {
    const row = ce("div", "hb"), track = ce("div", "track"), s = ce("div", "seg");
    s.style.width = (100 * n / max) + "%"; s.style.background = "var(--s-one)";
    track.appendChild(hoverable(s, names[k], fmt(n), pct(n, total) + " of openings"));
    row.append(ce("span", "name", names[k]), track, ce("span", "val", fmt(n)));
    parent.appendChild(row);
  });
}

function weekly(parent, weeks) {
  const max = Math.max(1, ...weeks.map(w => w[1])), cols = ce("div", "cols"), xl = ce("div", "xl");
  const lab = iso => new Date(iso + "T12:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
  weeks.forEach(([iso, n], i) => {
    const c = ce("div", "col"), bar = ce("i");
    bar.style.height = (100 * n / max) + "%";
    c.appendChild(bar);
    hoverable(c, "Week of " + lab(iso), fmt(n), i === weeks.length - 1 ? "postings (week in progress)" : "postings");
    cols.appendChild(c);
    xl.appendChild(ce("span", null, i % 3 === (weeks.length - 1) % 3 ? lab(iso) : ""));
  });
  parent.append(cols, xl);
}

function card(title, sub) { const c = ce("section", "card"); c.append(ce("h3", null, title), ce("p", "sub", sub)); return c; }

function tableView(d, nameOf) {
  const det = ce("details"), box = ce("div", "tbl"), t = ce("table");
  det.appendChild(ce("summary", null, "Show as table"));
  const head = ce("tr"); head.appendChild(ce("th", null, "Company"));
  ROLES.forEach(([k, n]) => head.appendChild(ce("th", "num", n)));
  head.appendChild(ce("th", "num", "Total"));
  t.appendChild(head);
  d.top.forEach(c => {
    const tr = ce("tr"); tr.appendChild(ce("td", null, c.company));
    ROLES.forEach(([k]) => tr.appendChild(ce("td", "num", c.roles[k] ? fmt(c.roles[k]) : "–")));
    tr.appendChild(ce("td", "num", fmt(c.total))); t.appendChild(tr);
  });
  box.appendChild(t); det.appendChild(box);
  return det;
}

function render(d) {
  const nameOf = Object.fromEntries(ROLES);
  ui.body.replaceChildren();
  if (!d.total) {
    ui.body.appendChild(ce("p", "empty", d.boards.loaded ? "No openings match these filters." : "No openings loaded yet. The server fetches the company job boards once a day; check back shortly."));
    return;
  }
  const kpis = ce("div", "kpis");
  [[fmt(d.total), "open roles"], [fmt(d.companies), "companies hiring"], [fmt(d.new7), "posted in the last 7 days"], [pct(d.remote, d.total), "remote-eligible"]].forEach(([v, l]) => {
    const k = ce("div", "card kpi"); k.append(ce("b", null, v), ce("span", null, l)); kpis.appendChild(k);
  });
  ui.body.appendChild(kpis);

  const g1 = ce("div", "grid2");
  const c1 = card("What kind of roles", "Role family read from the job title");
  donut(c1, d.roles.map(([key, n]) => ({ key, n, name: nameOf[key] })), d.total);
  const c2 = card("Who is hiring", `Top ${d.top.length} companies by open roles, split by role family (click a name to see its openings)`);
  companyBars(c2, d.top, nameOf);
  g1.append(c1, c2);

  const g2 = ce("div", "grid2");
  const c3 = card("Seniority", "Level read from the job title");
  simpleBars(c3, d.levels, LEVEL_NAME);
  const c4 = card("Where", "A role can be both Remote and in a metro area, so these add up to more than the total");
  simpleBars(c4, d.areas, AREA_NAME);
  g2.append(c3, c4);

  const c5 = card("Posting pace", "Roles by the week they were posted (only roles still open appear, so older weeks understate)");
  c5.style.marginBottom = "12px";
  weekly(c5, d.weeks);
  ui.body.append(g1, g2, c5, tableView(d, nameOf));
}

async function load() {
  const my = ++gen, p = new URLSearchParams({ eng: f.eng ? 1 : 0 });
  if (f.days) p.set("days", f.days);
  try { if (localStorage.getItem("jobs.noqa") !== "0") p.set("noqa", 1); } catch (e) { p.set("noqa", 1); }  // same QA setting as the openings list
  el.classList.add("stale");
  try {
    const res = await fetch("/api/jobs/stats?" + p, { headers: { "X-Requested-With": "walkthrough" } });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Request failed");
    if (my !== gen) return;
    render(d);
  } catch (err) {
    if (my !== gen) return;
    ui.body.replaceChildren(ce("p", "empty", err instanceof TypeError ? "The dashboard needs the local server. In a terminal run: python3 server.py" : err.message));
  }
  if (my === gen) el.classList.remove("stale");
}

window.JobsDash = {
  // opts.onCompany(name): called when a company name is clicked.
  mount(parent, opts) {
    onCompany = opts.onCompany;
    el = ce("div", "jd");
    el.appendChild(ce("style", null, CSS));
    const row = ce("div", "row");
    const lab = ce("label"), chk = ce("input"); chk.type = "checkbox"; chk.checked = f.eng;
    lab.append(chk, document.createTextNode("Engineering roles"));
    lab.title = "Only software, data, ML, security and infrastructure titles";
    chk.onchange = () => { f.eng = chk.checked; load(); };
    const days = ce("select");
    [["", "Posted any time"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"]].forEach(([v, l]) => days.appendChild(new Option(l, v)));
    days.onchange = () => { f.days = days.value; load(); };
    row.append(days, lab);
    ui.body = ce("div");
    tip = ce("div", "tip"); tip.hidden = true;
    el.append(row, ui.body, tip);
    parent.appendChild(el);
  },
  show() { load(); },
};
})();
