#!/usr/bin/env node
// Dev check for AI Pairing scenarios. Runs each scenario's hidden tests through the real in-browser harness (apHarness from workspace.js):
// A scenario with visible_tests.js (shown to the learner) is graded on visible + hidden tests together; its starter must
// pass some of the visible tests and fail others.
//   - the starter must not pass everything
//   - the reference solution (solution/) must pass every test
//   - every planted flaw in secret.json needs a mutant in mutants.json that at least one test catches
//   - review scenarios ("kind": "review"): pr.md exists, the PR's own (visible) tests all pass on the starter,
//     and every seeded issue in secret.json's "issues" also has a caught mutant
//   - debug scenarios ("kind": "debug"): incident.md exists and the job's own (visible) tests all pass on the starter
//     (CI is green), while the hidden tests fail on it
//   - object design scenarios ("kind": "lld"): scenario.json has a "followup", followup_visible_tests.js and followup_tests.js
//     exist, and the follow-up tests run with the rest (fail on the starter, pass on the solution). Flaws marked
//     "design": true are judged by the evaluator only, so they must not have a mutant.
// mutants.json: { flawOrIssueId: [ { file, from, to } | { file, fromFile: "mutants/x.js" } ] }
// Usage: node scripts/verify_aipair.js [scenario-id ...]
const fs = require("fs"), path = require("path"), vm = require("vm");
const SCENARIOS = path.join(__dirname, "..", "aipair_scenarios");
const src = fs.readFileSync(path.join(__dirname, "..", "web", "workspace.js"), "utf8");
const harness = src.slice(src.indexOf("function apHarness"), src.indexOf("// END apHarness"));
const apCombine = new Function("return " + src.slice(src.indexOf("function apCombine"), src.indexOf("// END apCombine")))();
const apJoin = new Function("return " + src.slice(src.indexOf("function apJoin"), src.indexOf("// END apJoin")))();

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

// Mutants can leave a rejected promise nobody handles; that must not kill the run.
process.on("unhandledRejection", () => {});

const read = f => fs.readFileSync(f, "utf8");
const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(SCENARIOS).filter(n => fs.existsSync(path.join(SCENARIOS, n, "scenario.json"))).sort();
let bad = 0;
const fail = msg => { bad++; console.log("  FAIL " + msg); };

(async () => {
for (const id of ids) {
  const d = path.join(SCENARIOS, id);
  const meta = JSON.parse(read(path.join(d, "scenario.json")));
  const lld = meta.kind === "lld";
  const opt = f => fs.existsSync(path.join(d, f)) ? read(path.join(d, f)) : null;
  let hidden = read(path.join(d, "tests.js"));
  let visible = opt("visible_tests.js");
  if (lld) {
    const fv = opt("followup_visible_tests.js"), fh = opt("followup_tests.js");
    if (!meta.followup || fv == null || fh == null || visible == null) { console.log(id); fail("lld scenarios need followup in scenario.json, visible_tests.js, followup_visible_tests.js and followup_tests.js"); continue; }
    const fs_ = await run(Object.fromEntries(meta.files.map(f => [f, read(path.join(d, "files", f))])), fv);
    if (fs_.total && !fs_.failed.length) { console.log(id); fail("follow-up visible tests must fail on the starter"); continue; }
    // Same composition as the browser after the follow-up is revealed (apJoin in workspace.js).
    visible = apJoin(visible, fv);
    hidden = apJoin(hidden, fh);
  }
  const tests = visible == null ? hidden : apCombine(visible, hidden);
  const starter = Object.fromEntries(meta.files.map(f => [f, read(path.join(d, "files", f))]));
  const solution = { ...starter };
  for (const f of fs.readdirSync(path.join(d, "solution"))) solution[f] = read(path.join(d, "solution", f));
  console.log(id);

  const s = await run(starter, tests);
  console.log(`  starter:  ${s.total - s.failed.length}/${s.total} passing`);
  if (s.fatal) fail("starter: " + s.fatal); else if (!s.total || s.failed.length === 0) fail("starter should not pass every test");
  const review = meta.kind === "review", debug = meta.kind === "debug";
  if (debug && (visible == null || !fs.existsSync(path.join(d, "incident.md")))) fail("debug scenarios need incident.md and visible_tests.js (the job's own tests)");
  if (review && (visible == null || !fs.existsSync(path.join(d, "pr.md")))) fail("review scenarios need pr.md and visible_tests.js (the PR's own tests)");
  if (visible != null) {
    const sv = await run(starter, visible);
    console.log(`  starter (visible only): ${sv.total - sv.failed.length}/${sv.total} passing`);
    if (sv.fatal || !sv.total) fail("visible tests must run on the starter: " + sv.fatal);
    else if (review || debug) { if (sv.failed.length) fail((review ? "review: the PR's own tests must all pass on the PR branch: " : "debug: the visible tests must all pass on the starter (CI is green): ") + sv.failed.map(c => c.name).join(" | ")) }
    else if (sv.failed.length === 0) fail("visible tests must not all pass on the starter");
    else if (sv.failed.length === sv.total && s.failed.length < s.total) fail("a starter that passes some tests should pass some visible ones too (fix-the-bugs scenarios)");
    const sh = await run(solution, visible);
    if (sh.failed.length) fail("solution must pass the visible tests: " + sh.failed.map(c => c.name).join(" | "));
  }

  const r = await run(solution, tests);
  console.log(`  solution: ${r.total - r.failed.length}/${r.total} passing`);
  if (r.fatal || !r.total || r.failed.length) fail("solution must pass all tests: " + (r.fatal || r.failed.map(c => c.name + " -> " + c.err).join(" | ")));

  const mutants = fs.existsSync(path.join(d, "mutants.json")) ? JSON.parse(read(path.join(d, "mutants.json"))) : {};
  const secret = JSON.parse(read(path.join(d, "secret.json")));
  const flaws = secret.flaws, issues = secret.issues || [];
  if (review && !issues.length) fail("review scenarios need issues in secret.json (the bugs seeded in the PR)");
  for (const fl of [...flaws, ...issues.map(x => ({ ...x, issue: true }))]) {
    const kind = fl.issue ? "issue" : "flaw";
    const edits = mutants[fl.id];
    if (fl.design) {
      if (!lld) fail(`flaw ${fl.id}: "design" flaws are only for lld scenarios`);
      if (edits) fail(`flaw ${fl.id}: design flaws are judged by the evaluator, so they must not have a mutant`);
      else console.log(`  flaw ${fl.id.padEnd(27)} design-only (evaluator judges it)`);
      continue;
    }
    if (fl.followup && !lld) fail(`flaw ${fl.id}: "followup" flaws are only for lld scenarios`);
    if (!edits) { fail(`${kind} ${fl.id}: no mutant in mutants.json`); continue; }
    const files = { ...solution };
    let ok = true;
    for (const e of edits) {
      if (e.fromFile) { files[e.file] = read(path.join(d, e.fromFile)); continue; } // whole-file mutant
      if (!files[e.file] || !files[e.file].includes(e.from)) { fail(`${kind} ${fl.id}: mutation anchor not found in ${e.file}: ${JSON.stringify(e.from.slice(0, 50))}`); ok = false; break; }
      files[e.file] = files[e.file].replace(e.from, e.to);
    }
    if (!ok) continue;
    const m = await run(files, tests);
    const caught = m.fatal || m.failed.length;
    console.log(`  ${kind} ${fl.id.padEnd(27)} ${caught ? "caught by " + (m.fatal ? "(harness error)" : m.failed.map(c => c.name).slice(0, 3).join(" | ")) : "NOT CAUGHT"}`);
    if (!caught) fail(`${kind} ${fl.id}: no test catches its mutant`);
  }
  for (const k of Object.keys(mutants)) if (!flaws.some(f => f.id === k) && !issues.some(x => x.id === k)) fail(`mutants.json has unknown flaw/issue id ${k}`);
}
console.log(bad ? `\n${bad} problem(s)` : "\nall scenarios OK");
process.exitCode = bad ? 1 : 0;
})();
