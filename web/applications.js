// Jobs tab, My applications: jobs you are tracking (tracked from the openings list or added by hand), kept on the server
// in var/applications.json via /api/applications. Loaded before jobs.js (see openJobs in index.html); exposes window.Apps.
(() => {
const ce = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const STATUSES = [["saved", "Saved"], ["applied", "Applied"], ["interviewing", "Interviewing"], ["offer", "Offer"], ["rejected", "Rejected"], ["withdrawn", "Withdrawn"], ["ghosted", "No response"]];
const KINDS = [["screen", "Recruiter screen"], ["technical", "Technical"], ["onsite", "Onsite / final"], ["behavioral", "Behavioral"], ["other", "Other"]];
const LABEL = Object.fromEntries(STATUSES);
const H = { "X-Requested-With": "walkthrough", "Content-Type": "application/json" };
let apps = [], loaded = null, built = false, root = null;
const f = { q: "", status: "" };
const ui = {};
const listeners = [];

const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const fmt = iso => iso ? new Date(iso + "T12:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

async function api(path, body) {
  const res = await fetch(path, body ? { method: "POST", headers: H, body: JSON.stringify(body) } : { headers: H });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error || "Request failed");
  return d;
}

function load() {
  if (!loaded) loaded = api("/api/applications").then(d => { apps = d.applications; changed(); return apps; }).catch(e => { loaded = null; throw e; });
  return loaded;
}

function changed() {
  listeners.forEach(fn => fn());
  if (built) render();
}

function put(rec) {
  const i = apps.findIndex(a => a.id === rec.id);
  if (i >= 0) apps.splice(i, 1);
  apps.unshift(rec);
  changed();
}

async function save(rec) {
  const saved = await api("/api/applications/save", rec);
  put(saved);
  return saved;
}

function build(el) {
  built = true; root = el;
  const header = ce("header"), main = ce("main");
  ui.stats = ce("div", "stats"); header.appendChild(ui.stats);
  const bar = ce("div", "controls");
  ui.q = ce("input"); ui.q.type = "search"; ui.q.placeholder = "Search company, title or notes…";
  ui.status = ce("select");
  ui.status.appendChild(new Option("All statuses", ""));
  ui.status.appendChild(new Option("Active (not closed)", "active"));
  STATUSES.forEach(([v, l]) => ui.status.appendChild(new Option(l, v)));
  const add = ce("button", null, "+ Add job");
  add.title = "Track a job you found somewhere else";
  add.onclick = () => edit(null);
  bar.append(ui.q, ui.status, add);
  header.appendChild(bar);
  const table = ce("table");
  table.innerHTML = "<thead><tr><th>Company</th><th>Title</th><th>Status</th><th class=\"num\">Applied</th><th>Last activity</th><th>Replied</th></tr></thead>";
  ui.rows = ce("tbody"); table.appendChild(ui.rows);
  main.appendChild(table);
  el.replaceChildren(header, main);
  ui.q.oninput = () => { f.q = ui.q.value.trim().toLowerCase(); render(); };
  ui.status.onchange = () => { f.status = ui.status.value; render(); };
  buildDialog();
}

const CLOSED = new Set(["rejected", "withdrawn", "ghosted"]);

// The latest dated thing that happened: an interview, their reply or your application.
function lastActivity(a) {
  const evs = a.events.filter(e => e.date && e.date <= today());
  const ev = evs[evs.length - 1];
  const next = a.events.find(e => e.date && e.date > today());
  if (next) return `Upcoming: ${KINDS.find(k => k[0] === next.kind)[1]} · ${fmt(next.date)}`;
  const cands = [];
  if (ev) cands.push([ev.date, KINDS.find(k => k[0] === ev.kind)[1]]);
  if (a.replied_on) cands.push([a.replied_on, "They replied"]);
  if (a.applied_on) cands.push([a.applied_on, "Applied"]);
  cands.sort((x, y) => y[0].localeCompare(x[0]));
  return cands.length ? `${cands[0][1]} · ${fmt(cands[0][0])}` : "";
}

function render() {
  const counts = {};
  apps.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });
  ui.stats.className = "stats";
  ui.stats.textContent = apps.length
    ? [`${apps.length} tracked`, ...STATUSES.filter(([v]) => counts[v]).map(([v, l]) => `${counts[v]} ${l.toLowerCase()}`)].join(" · ")
    : "Nothing tracked yet";
  const rows = apps.filter(a =>
    (!f.status || (f.status === "active" ? !CLOSED.has(a.status) : a.status === f.status)) &&
    (!f.q || [a.company, a.title, a.location, a.notes].some(s => s.toLowerCase().includes(f.q))));
  ui.rows.replaceChildren();
  rows.forEach(a => {
    const tr = ce("tr", "app-row");
    tr.onclick = e => { if (!e.target.closest("a,select")) edit(a); };
    tr.appendChild(ce("td", null, a.company));
    const t = ce("td"), link = ce("a", null, a.title);
    if (a.url) { link.href = a.url; link.target = "_blank"; link.rel = "noopener noreferrer"; }
    t.appendChild(link);
    if (a.location) t.appendChild(ce("div", "app-sub", a.location));
    tr.appendChild(t);
    const st = ce("td"), sel = ce("select", "app-status s-" + a.status);
    STATUSES.forEach(([v, l]) => sel.appendChild(new Option(l, v)));
    sel.value = a.status;
    sel.onchange = async () => {
      const patch = { ...a, status: sel.value };
      if (sel.value === "applied" && !a.applied_on) patch.applied_on = today();
      try { await save(patch); } catch (err) { sel.value = a.status; flash(err.message); }
    };
    st.appendChild(sel); tr.appendChild(st);
    tr.appendChild(ce("td", "num", fmt(a.applied_on) || "–"));
    tr.appendChild(ce("td", "topics", lastActivity(a)));
    const r = ce("td", null, a.replied ? "✓ " + fmt(a.replied_on) : "–");
    if (a.replied) r.style.color = "var(--easy)";
    tr.appendChild(r);
    ui.rows.appendChild(tr);
  });
  if (!rows.length) {
    const tr = ce("tr"), td = ce("td", null, apps.length ? "No applications match these filters." : "Click Track on an opening, or + Add job for one you found elsewhere.");
    td.colSpan = 6; td.style.cssText = "text-align:center;color:var(--muted);padding:28px"; tr.appendChild(td); ui.rows.appendChild(tr);
  }
}

function flash(msg) { ui.stats.textContent = msg; }

// ----- edit dialog -----
let cur = null, pending = "manual";
function field(label, input) {
  const l = ce("label", "app-field"); l.append(ce("span", null, label), input); return l;
}
function buildDialog() {
  const d = ui.dlg = ce("dialog", "app-dlg");
  const hd = ce("div", "hd"); ui.dt = ce("b"); const x = ce("button", null, "Close"); x.onclick = () => d.close();
  hd.append(ui.dt, x);
  const body = ce("form", "app-form"); body.method = "dialog";
  const inp = (type, ph) => { const i = ce("input"); i.type = type; if (ph) i.placeholder = ph; return i; };
  ui.fCompany = inp("text"); ui.fCompany.required = true;
  ui.fTitle = inp("text"); ui.fTitle.required = true;
  ui.fUrl = inp("url", "https://…");
  ui.fLoc = inp("text", "Remote, San Francisco…");
  ui.fStatus = ce("select"); STATUSES.forEach(([v, l]) => ui.fStatus.appendChild(new Option(l, v)));
  ui.fApplied = inp("date");
  const mark = ce("button", null, "Mark applied today"); mark.type = "button";
  mark.onclick = () => { ui.fApplied.value = today(); if (ui.fStatus.value === "saved") ui.fStatus.value = "applied"; };
  ui.fReplied = inp("checkbox"); ui.fRepliedOn = inp("date");
  ui.fReplied.onchange = () => { ui.fRepliedOn.disabled = !ui.fReplied.checked; if (ui.fReplied.checked && !ui.fRepliedOn.value) ui.fRepliedOn.value = today(); };
  const applied = ce("div", "app-inline"); applied.append(ui.fApplied, mark);
  const replied = ce("div", "app-inline"); const rl = ce("label", "app-inline"); rl.append(ui.fReplied, document.createTextNode("They replied")); replied.append(rl, ui.fRepliedOn);
  ui.events = ce("div", "app-events");
  const addEv = ce("button", null, "+ Add interview"); addEv.type = "button";
  addEv.onclick = () => evRow({ date: "", kind: "screen", note: "" }).querySelector("input").focus();
  ui.fNotes = ce("textarea"); ui.fNotes.rows = 4; ui.fNotes.placeholder = "Recruiter name, referral, salary range, prep notes…";
  ui.err = ce("p", "app-err");
  const foot = ce("div", "app-foot");
  ui.del = ce("button", "app-del", "Delete"); ui.del.type = "button"; ui.del.onclick = doDelete;
  ui.saveBtn = ce("button", "app-save", "Save"); ui.saveBtn.type = "submit";
  foot.append(ui.del, ui.saveBtn);
  const grid = ce("div", "app-grid");
  grid.append(field("Company", ui.fCompany), field("Title", ui.fTitle), field("Job link", ui.fUrl), field("Location", ui.fLoc),
    field("Status", ui.fStatus), field("Applied on", applied), field("Response", replied));
  const evh = ce("div", "app-evh"); evh.append(ce("b", null, "Interviews"), addEv);
  body.append(grid, evh, ui.events, field("Notes", ui.fNotes), ui.err, foot);
  body.onsubmit = e => { e.preventDefault(); doSave(); };
  d.append(hd, body);
  d.addEventListener("click", e => { if (e.target === d) d.close(); });
  document.body.appendChild(d);
}

function evRow(ev) {
  const row = ce("div", "app-ev");
  const date = ce("input"); date.type = "date"; date.value = ev.date;
  const kind = ce("select"); KINDS.forEach(([v, l]) => kind.appendChild(new Option(l, v))); kind.value = ev.kind;
  const note = ce("input"); note.type = "text"; note.placeholder = "Who, how it went…"; note.value = ev.note;
  const rm = ce("button", null, "✕"); rm.type = "button"; rm.title = "Remove"; rm.onclick = () => row.remove();
  row.append(date, kind, note, rm);
  ui.events.appendChild(row);
  return row;
}

// a: a saved record to edit, a prefill (no id; e.g. a posting from Openings) or null for a blank one.
function edit(a) {
  cur = a && a.id ? a : null;
  const v = { company: "", title: "", url: "", location: "", source: "manual", status: "saved", applied_on: "", replied: false, replied_on: "", events: [], notes: "", ...a };
  pending = v.source;
  ui.dt.textContent = cur ? `${cur.company} · ${cur.title}` : a ? "Track this posting" : "Add a job";
  ui.saveBtn.textContent = cur ? "Save" : "Track";
  ui.fCompany.value = v.company; ui.fTitle.value = v.title; ui.fUrl.value = v.url; ui.fLoc.value = v.location;
  ui.fStatus.value = v.status; ui.fApplied.value = v.applied_on;
  ui.fReplied.checked = v.replied; ui.fRepliedOn.value = v.replied_on; ui.fRepliedOn.disabled = !v.replied;
  ui.events.replaceChildren(); v.events.forEach(evRow);
  ui.fNotes.value = v.notes; ui.err.textContent = "";
  ui.del.hidden = !cur;
  ui.dlg.showModal();
}

async function doSave() {
  const rec = {
    company: ui.fCompany.value, title: ui.fTitle.value, url: ui.fUrl.value, location: ui.fLoc.value,
    source: cur ? cur.source : pending, status: ui.fStatus.value, applied_on: ui.fApplied.value,
    replied: ui.fReplied.checked, replied_on: ui.fReplied.checked ? ui.fRepliedOn.value : "",
    events: [...ui.events.children].map(r => { const [d, k, n] = r.querySelectorAll("input,select"); return { date: d.value, kind: k.value, note: n.value }; })
      .filter(e => e.date || e.note),
    notes: ui.fNotes.value,
  };
  if (cur) rec.id = cur.id;
  ui.saveBtn.disabled = true; ui.err.textContent = "";
  try { await save(rec); ui.dlg.close(); }
  catch (err) { ui.err.textContent = err instanceof TypeError ? "Server not reachable." : err.message; }
  ui.saveBtn.disabled = false;
}

async function doDelete() {
  if (!cur || !confirm(`Stop tracking ${cur.company} · ${cur.title}?`)) return;
  try {
    await api("/api/applications/delete", { id: cur.id });
    apps = apps.filter(a => a.id !== cur.id); changed(); ui.dlg.close();
  } catch (err) { ui.err.textContent = err.message; }
}

window.Apps = {
  // Where the My applications view renders; jobs.js sets it so the editor can open from Openings before that view is shown.
  mount(el) { ui.host = el; },
  // Render the My applications view into el (built once).
  show(el) {
    if (!built) build(el || ui.host);
    render();
    load().catch(err => flash(err instanceof TypeError ? "Applications need the local server. In a terminal run: python3 server.py" : err.message));
  },
  load,
  // Open the editor for a saved record, or prefilled from a posting (saving tracks it; the server returns the existing
  // record if that URL is already tracked).
  open(a) { if (!built) build(ui.host); edit(a); },
  byUrl: url => (url && apps.find(a => a.url === url)) || null,
  save,
  today,
  label: s => LABEL[s] || s,
  onChange: fn => listeners.push(fn),
};
})();
