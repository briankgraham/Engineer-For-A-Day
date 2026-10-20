#!/usr/bin/env node
// Dev check for the Learning tab curriculum (web/learn_data.js). Runs every code exercise through the real in-browser
// harness (harness() from web/index.html):
//   - the reference solution must pass every test
//   - the starter code must not pass every test
// and checks the rest of the shape: unique ids, quiz answers in range, LeetCode slugs that exist in the problem list,
// readiness entries that point at real lessons, and visualizer graphs whose edges reference real vertices.
// Usage: node scripts/verify_learn.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const WEB = path.join(__dirname, "..", "web");
const html = fs.readFileSync(path.join(WEB, "index.html"), "utf8");
const harness = html.slice(html.indexOf("function harness(spec){"), html.indexOf("// Runs `code` against the exercise's tests"));
const LEARN_TRACKS = vm.runInNewContext(fs.readFileSync(path.join(WEB, "learn_data.js"), "utf8") + ";LEARN_TRACKS");
const slugs = new Set([...html.matchAll(/,"([a-z0-9-]+)","[^"]*"\]/g)].map(m => m[1]));

function run(code, part) {
  const spec = { name: part.fn, kind: part.kind || "function", compare: part.compare || "exact", argTypes: [], returnType: "plain",
    tests: part.tests.map(([, input, expected]) => ({ input: JSON.stringify(input), expected: JSON.stringify(expected) })) };
  const msgs = [];
  try {
    vm.runInNewContext(code + "\n;(" + harness + ")(" + JSON.stringify(spec) + ");", { postMessage: m => msgs.push(m), console: { log() {} } }, { timeout: 5000 });
  } catch (e) {
    msgs.push({ t: "fatal", s: e.message });
  }
  const fatal = msgs.find(m => m.t === "fatal"), cases = msgs.filter(m => m.t === "case");
  return { fatal: fatal && fatal.s, cases, passed: cases.filter(c => c.pass).length };
}

let problems = 0, codeParts = 0;
const bad = msg => { problems++; console.log("  ✗ " + msg); };
for (const track of LEARN_TRACKS) {
  console.log(`Track ${track.id}`);
  const lessonIds = new Set(track.lessons.map(l => l.id));
  if (lessonIds.size !== track.lessons.length) bad("duplicate lesson ids");
  for (const [slug, lesson] of track.ready) {
    if (!slugs.has(slug)) bad(`ready: unknown LeetCode slug ${slug}`);
    if (!lessonIds.has(lesson)) bad(`ready: ${slug} points at unknown lesson ${lesson}`);
  }
  for (const lesson of track.lessons) {
    console.log(` ${lesson.id}`);
    const ids = new Set();
    for (const s of lesson.leetcode) if (!slugs.has(s)) bad(`unknown LeetCode slug ${s}`);
    for (const b of lesson.blocks) {
      if (!b.viz) continue;
      const g = b.graph;
      if (g.pos.length !== g.n) bad(`viz "${b.title}": ${g.pos.length} positions for ${g.n} vertices`);
      if (g.edges.some(e => e[0] >= g.n || e[1] >= g.n || e[0] < 0 || e[1] < 0)) bad(`viz "${b.title}": edge out of range`);
    }
    for (const part of lesson.parts) {
      if (ids.has(part.id)) bad(`duplicate part id ${part.id}`);
      ids.add(part.id);
      if (part.type === "quiz") {
        if (!(part.answer >= 0 && part.answer < part.options.length)) bad(`${part.id}: answer out of range`);
        continue;
      }
      if (part.type !== "code") continue;
      codeParts++;
      const total = part.tests.length, sol = run(part.solution, part), st = run(part.starter, part);
      if (sol.fatal || sol.passed !== total) {
        bad(`${part.id}: solution passes ${sol.passed}/${total}${sol.fatal ? " (" + sol.fatal + ")" : ""}`);
        sol.cases.filter(c => !c.pass).forEach(c => console.log(`      test ${c.i + 1}: got ${c.got || c.err} expected ${c.expected}`));
      } else if (!st.fatal && st.passed === total) bad(`${part.id}: the starter passes every test`);
      else console.log(`  ✓ ${part.id} (${total} tests)`);
    }
  }
}
console.log(problems ? `\n${problems} problem(s)` : `\nAll good: ${codeParts} code exercises verified.`);
process.exit(problems ? 1 : 0);
