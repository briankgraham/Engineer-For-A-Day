#!/usr/bin/env node
// Dev check for Engineer for a Day scenarios (day_scenarios/<id>/). Runs the test suites through the real in-browser
// harness (apHarness and apSuites from web/workspace.js):
//   - tests/visible.js (the service's existing suite) passes on the starter and on the solution
//   - every hidden suite (tests/feature.js, tests/incident.js) fails on the starter and passes on the solution
//   - every planted flaw in secret.json has a mutant in mutants.json that some test catches, unless it is "judged": true
//     (the evaluator judges it from the transcript, so it must not have a mutant)
//   - every flaw names a persona that exists; the PR's seeded issues, the task rubrics and the files referenced exist
//   - timeline references (channel, from, unlock, after/until) resolve, and times are inside the day's clock
//   - follow-ups (coworker-initiated, written live) have a stage direction in secret.json, a fallback text, and a valid thread;
//     PR revisions they push exist, and every seeded issue's rev is a revision of the PR
// Usage: node scripts/verify_day.js [day-id ...]
const fs = require("fs"), path = require("path"), vm = require("vm");
const DAYS = path.join(__dirname, "..", "day_scenarios");
const src = fs.readFileSync(path.join(__dirname, "..", "web", "workspace.js"), "utf8");
const harness = src.slice(src.indexOf("function apHarness"), src.indexOf("// END apHarness"));
const apSuites = new Function("return " + src.slice(src.indexOf("function apSuites"), src.indexOf("// END apSuites")))();
const HIDDEN = ["feature", "incident"];

async function run(files, tests) {
  const msgs = [], quiet = { log() {}, info() {}, warn() {}, error() {} };
  try {
    const p = vm.runInNewContext(";(" + harness + ")(" + JSON.stringify({ files, tests }) + ");", { postMessage: m => msgs.push(m), console: quiet, setTimeout, clearTimeout }, { timeout: 5000 });
    if (p && typeof p.then === "function") await p;
  } catch (e) {
    msgs.push({ t: "fatal", s: "harness aborted: " + e.message });
  }
  const cases = msgs.filter(m => m.t === "case"), plan = msgs.find(m => m.t === "plan");
  return { total: plan ? plan.names.length : 0, cases, failed: cases.filter(c => !c.pass), fatal: (msgs.find(m => m.t === "fatal") || {}).s };
}

process.on("unhandledRejection", () => {});

const read = f => fs.readFileSync(f, "utf8");
const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(DAYS).filter(n => fs.existsSync(path.join(DAYS, n, "day.json"))).sort();
let bad = 0;
const fail = msg => { bad++; console.log("  FAIL " + msg); };
const mins = t => { const m = /^(\d\d):(\d\d)$/.exec(t || ""); return m ? +m[1] * 60 + +m[2] : NaN; };

(async () => {
for (const id of ids) {
  const d = path.join(DAYS, id);
  const day = JSON.parse(read(path.join(d, "day.json")));
  const secret = JSON.parse(read(path.join(d, "secret.json")));
  console.log(id);

  // ---- structure ----
  const personas = new Set(day.personas.map(p => p.id)), channels = new Set(day.channels.map(c => c.id));
  const items = new Set(["handoff", "logs", ...day.channels.map(c => "channel:" + c.id), ...day.tickets.map(t => "ticket:" + t.id), ...day.prs.map(p => "pr:" + p.id), ...day.docs.map(x => "doc:" + x.id)]);
  const events = new Set(day.timeline.map(e => e.id));
  const triggers = /^(incident_resolved|pr_(reviewed|approved|feedback):\w+|ticket_replied:[\w-]+|posted:[\w-]+)$/;
  const start = mins(day.clock.start), end = mins(day.clock.end);
  if (!(start < end)) fail("clock.start must be before clock.end");
  for (const c of day.channels) for (const m of c.members) if (!personas.has(m)) fail(`channel ${c.id}: unknown member ${m}`);
  for (const c of day.channels) if (!personas.has(c.responder)) fail(`channel ${c.id}: unknown responder ${c.responder}`);
  for (const e of day.timeline) {
    const x = e.do;
    if (e.at !== undefined && !(mins(e.at) >= start && mins(e.at) <= end)) fail(`timeline ${e.id}: at ${e.at} is outside the day`);
    if (e.when !== undefined && !triggers.test(e.when)) fail(`timeline ${e.id}: unknown trigger ${e.when}`);
    if (e.unless !== undefined && !triggers.test(e.unless)) fail(`timeline ${e.id}: unknown trigger ${e.unless}`);
    if (x.type !== "nudge" && e.at === undefined && e.when === undefined) fail(`timeline ${e.id}: needs at or when`);
    if (e.after !== undefined && !events.has(e.after)) fail(`timeline ${e.id}: after must be a timeline id`);
    if (e.delay !== undefined && (e.when === undefined || !(e.delay > 0))) fail(`timeline ${e.id}: delay needs a when trigger and must be > 0`);
    if (x.type === "followup") {
      if (!items.has(x.thread) || !x.thread.startsWith("channel:") && !x.thread.startsWith("pr:")) fail(`timeline ${e.id}: followup needs a channel: or pr: thread`);
      else if (x.thread.startsWith("pr:") && (day.prs.find(p => "pr:" + p.id === x.thread) || {}).author !== x.from) fail(`timeline ${e.id}: only the PR's author can follow up on it`);
      else if (x.thread.startsWith("channel:") && !day.channels.find(c => "channel:" + c.id === x.thread).members.includes(x.from)) fail(`timeline ${e.id}: ${x.from} is not in ${x.thread}`);
      if (!x.text) fail(`timeline ${e.id}: followup needs a fallback text`);
      if (!((secret.followups || {})[e.id] || {}).direction) fail(`timeline ${e.id}: no followups.${e.id}.direction in secret.json`);
    } else if (!channels.has(x.channel)) fail(`timeline ${e.id}: unknown channel ${x.channel}`);
    if (x.revise) {
      const pr = day.prs.find(p => p.id === x.revise.pr);
      if (!pr || !(pr.revisions || []).some(r => r.rev === x.revise.rev)) fail(`timeline ${e.id}: revise names an unknown PR revision`);
    }
    if (!personas.has(x.from)) fail(`timeline ${e.id}: unknown persona ${x.from}`);
    for (const u of x.unlock || []) if (!items.has(u)) fail(`timeline ${e.id}: unknown unlock ${u}`);
    if (x.type === "nudge") {
      if (!events.has(x.after)) fail(`timeline ${e.id}: after must be a timeline id`);
      if (!triggers.test(x.until)) fail(`timeline ${e.id}: unknown until trigger ${x.until}`);
      if (!(x.quietMinutes > 0) || !Array.isArray(x.texts) || !x.texts.length) fail(`timeline ${e.id}: nudge needs quietMinutes and texts`);
    }
  }
  for (const t of day.tasks) {
    if (!items.has(t.item)) fail(`task ${t.id}: unknown item ${t.item}`);
    if (t.unlock !== "start" && !events.has(t.unlock)) fail(`task ${t.id}: unlock must be "start" or a timeline id`);
    if (!secret.tasks || !secret.tasks[t.id] || !(secret.tasks[t.id].keyPoints || []).length) fail(`task ${t.id}: no keyPoints in secret.json`);
  }
  for (const f of [...day.prs.map(p => p.file), ...day.prs.flatMap(p => (p.revisions || []).map(r => r.file)), ...day.docs.map(x => x.file), day.logs.file]) if (!fs.existsSync(path.join(d, f))) fail(`missing ${f}`);
  for (const k of Object.keys(secret.followups || {})) if (!day.timeline.some(e => e.id === k && e.do.type === "followup")) fail(`secret.json followups.${k} is not a followup event`);
  const revs = new Set([1, ...day.prs.flatMap(p => (p.revisions || []).map(r => r.rev))]);
  for (const x of secret.issues || []) if (!revs.has(x.rev || 1)) fail(`issue ${x.id}: rev ${x.rev} is not a PR revision`);
  for (const p of personas) if (!secret.personas[p] || !secret.personas[p].agenda) fail(`persona ${p}: no agenda in secret.json`);
  if (day.prs.length && !(secret.issues || []).length) fail("a day with a PR needs the PR's seeded issues in secret.json");

  // ---- tests ----
  const starter = Object.fromEntries(day.files.map(f => [f, read(path.join(d, "files", f))]));
  const solution = { ...starter };
  for (const f of fs.readdirSync(path.join(d, "solution"))) solution[f] = read(path.join(d, "solution", f));
  const suite = n => read(path.join(d, "tests", n + ".js"));
  const visible = suite("visible");
  const all = apSuites([["", visible], ...HIDDEN.map(h => ["[" + h + "] ", suite(h)])]);

  const sv = await run(starter, visible);
  console.log(`  starter, visible suite: ${sv.total - sv.failed.length}/${sv.total} passing`);
  if (sv.fatal || !sv.total || sv.failed.length) fail("the existing suite must pass on the starter: " + (sv.fatal || sv.failed.map(c => c.name + " -> " + c.err).join(" | ")));
  for (const h of HIDDEN) {
    const s = await run(starter, apSuites([["[" + h + "] ", suite(h)]]));
    console.log(`  starter, ${h} suite: ${s.total - s.failed.length}/${s.total} passing`);
    if (s.fatal) fail(`starter ${h}: ${s.fatal}`); else if (!s.total || !s.failed.length) fail(`the ${h} suite must fail on the starter`);
  }
  const r = await run(solution, all);
  console.log(`  solution, all suites: ${r.total - r.failed.length}/${r.total} passing`);
  if (r.fatal || !r.total || r.failed.length) fail("solution must pass all suites: " + (r.fatal || r.failed.map(c => c.name + " -> " + c.err).join(" | ")));

  // ---- flaws ----
  const mutants = fs.existsSync(path.join(d, "mutants.json")) ? JSON.parse(read(path.join(d, "mutants.json"))) : {};
  for (const fl of secret.flaws) {
    if (!personas.has(fl.persona)) fail(`flaw ${fl.id}: unknown persona ${fl.persona}`);
    for (const k of ["title", "trigger", "wrongClaim", "correctBehavior"]) if (!fl[k]) fail(`flaw ${fl.id}: missing ${k}`);
    const edits = mutants[fl.id];
    if (fl.judged) {
      if (edits) fail(`flaw ${fl.id}: judged flaws must not have a mutant`);
      else console.log(`  flaw ${fl.id.padEnd(24)} judged by the evaluator`);
      continue;
    }
    if (!edits) { fail(`flaw ${fl.id}: no mutant in mutants.json`); continue; }
    const files = { ...solution };
    let ok = true;
    for (const e of edits) {
      if (!files[e.file] || !files[e.file].includes(e.from)) { fail(`flaw ${fl.id}: mutation anchor not found in ${e.file}: ${JSON.stringify(e.from.slice(0, 50))}`); ok = false; break; }
      files[e.file] = files[e.file].replace(e.from, e.to);
    }
    if (!ok) continue;
    const m = await run(files, all);
    const caught = m.fatal || m.failed.length;
    console.log(`  flaw ${fl.id.padEnd(24)} ${caught ? "caught by " + (m.fatal ? "(harness error)" : m.failed.map(c => c.name).slice(0, 2).join(" | ")) : "NOT CAUGHT"}`);
    if (!caught) fail(`flaw ${fl.id}: no test catches its mutant`);
  }
  for (const k of Object.keys(mutants)) if (!secret.flaws.some(f => f.id === k)) fail(`mutants.json has unknown flaw id ${k}`);
}
console.log(bad ? `\n${bad} problem(s)` : "\nall days OK");
process.exitCode = bad ? 1 : 0;
})();
