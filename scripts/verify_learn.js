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
// Track files after learn_data.js push onto LEARN_TRACKS (same load order as the page).
const LEARN_FILES = ["learn_data.js", "learn_trees.js", "learn_heaps.js", "learn_intervals.js", "learn_tries.js", "learn_dp.js", "learn_fundamentals.js", "learn_concurrency.js"];
const LEARN_TRACKS = vm.runInNewContext(LEARN_FILES.map(f => fs.readFileSync(path.join(WEB, f), "utf8")).join("\n") + ";LEARN_TRACKS");
const slugs = new Set([...html.matchAll(/,"([a-z0-9-]+)","[^"]*"\]/g)].map(m => m[1]));

function run(code, part) {
  const spec = { name: part.fn, kind: part.kind || "function", compare: part.compare || "exact", argTypes: part.argTypes || [], returnType: part.returnType || "plain",
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

// Tree and heap visualizers take arrays: a level-order tree (null = no node) or a heap array. Check they make sense for the
// step generator that will run on them.
function parseTree(arr) {
  const val = [], left = [], right = [], parent = [];
  const mk = (v, p) => { val.push(v); left.push(-1); right.push(-1); parent.push(p); return val.length - 1; };
  if (arr.length && arr[0] != null) {
    const q = [mk(arr[0], -1)]; let i = 1;
    while (q.length && i < arr.length) {
      const u = q.shift();
      for (const side of [left, right]) { if (i < arr.length && arr[i] != null) { const c = mk(arr[i], u); side[u] = c; q.push(c); } i++; }
    }
  }
  return { val, left, right, parent };
}
function checkArrayViz(b) {
  const name = `viz "${b.title}"`;
  if (b.heap) {
    if (!b.heap.length || b.heap.some(x => typeof x !== "number")) return bad(`${name}: heap must be a non-empty array of numbers`);
    const isHeap = b.heap.every((x, i) => i === 0 || b.heap[(i - 1) >> 1] <= x);
    if (b.viz === "heapify" && isHeap) bad(`${name}: heapify needs an unordered array`);
    if (b.viz !== "heapify" && !isHeap) bad(`${name}: array is not a valid min-heap`);
    if (b.viz === "heapPush" && typeof b.value !== "number") bad(`${name}: heapPush needs a numeric value`);
    if (b.heap.length + (b.viz === "heapPush" ? 1 : 0) > 15) bad(`${name}: more than 15 nodes will not fit`);
    return;
  }
  const t = parseTree(b.tree);
  if (!t.val.length) return bad(`${name}: empty tree`);
  if (t.val.length > 12) bad(`${name}: ${t.val.length} nodes is too many to draw legibly`);
  if (/^bst/.test(b.viz) || b.viz === "bst") {
    if (new Set(t.val).size !== t.val.length) bad(`${name}: BST values must be distinct`);
    const ok = (u, lo, hi) => u < 0 || (t.val[u] > lo && t.val[u] < hi && ok(t.left[u], lo, t.val[u]) && ok(t.right[u], t.val[u], hi));
    if (!ok(0, -Infinity, Infinity)) bad(`${name}: not a valid BST`);
  }
  if (b.viz === "bstSearch" && typeof b.value !== "number") bad(`${name}: bstSearch needs a numeric value`);
  if (b.viz === "bstInsert") {
    const nw = t.val.indexOf(b.value);
    if (nw < 0) return bad(`${name}: the tree must already contain value ${b.value} (drawn hidden until attached)`);
    if (t.left[nw] >= 0 || t.right[nw] >= 0) return bad(`${name}: the inserted value must be a leaf`);
    // Walk from the root the way an insert would, skipping the new node: it must end at the new node's real parent.
    let u = 0;
    for (;;) {
      const nx = b.value < t.val[u] ? t.left[u] : t.right[u];
      if (nx === nw) break;
      if (nx < 0) { bad(`${name}: the walk falls off at ${t.val[u]}, which is not the parent of ${b.value}`); break; }
      u = nx;
    }
  }
}

// Interval timelines: a few integer intervals on a short number line.
function checkIntervalViz(b) {
  const name = `viz "${b.title}"`;
  if (!["show", "merge", "sweep"].includes(b.mode)) return bad(`${name}: mode must be show, merge or sweep`);
  if (!b.intervals.length || b.intervals.length > 6) return bad(`${name}: needs 1 to 6 intervals`);
  for (const [s, e] of b.intervals) if (!Number.isInteger(s) || !Number.isInteger(e) || s < 0 || e > 30 || s >= e) bad(`${name}: [${s}, ${e}] must be integers with 0 <= start < end <= 30`);
}

// Trie pictures: a few short lowercase words; search mode needs a query.
function checkTrieViz(b) {
  const name = `viz "${b.title}"`;
  if (!["show", "build", "search"].includes(b.mode)) return bad(`${name}: mode must be show, build or search`);
  if (!b.words.length || b.words.length > 8) return bad(`${name}: needs 1 to 8 words`);
  for (const w of b.words) if (!/^[a-z]{1,7}$/.test(w)) bad(`${name}: "${w}" must be 1 to 7 lowercase letters`);
  if (b.mode === "search" && !/^[a-z]{1,7}$/.test(b.query || "")) bad(`${name}: search needs a lowercase query`);
}

// DP tables: the model runs the recurrence, so only the inputs need checking (keep the table small enough to read).
function checkDpViz(b) {
  const name = `viz "${b.title}"`, ints = a => Array.isArray(a) && a.length && a.every(Number.isInteger);
  const need = (ok, msg) => { if (!ok) bad(`${name}: ${msg}`); };
  const kinds = ["stairs", "rob", "coins", "grid", "lcs", "edit", "knap"];
  if (!kinds.includes(b.dp)) return bad(`${name}: dp must be one of ${kinds.join(", ")}`);
  if (b.dp === "stairs") need(Number.isInteger(b.n) && b.n >= 2 && b.n <= 12, "n must be an integer from 2 to 12");
  if (b.dp === "rob") need(ints(b.nums) && b.nums.length >= 3 && b.nums.length <= 10, "nums needs 3 to 10 integers");
  if (b.dp === "coins") need(ints(b.coins) && b.coins.every(c => c > 0) && Number.isInteger(b.amount) && b.amount >= 1 && b.amount <= 14, "needs positive coins and an amount from 1 to 14");
  if (b.dp === "grid") need(Array.isArray(b.costs) && b.costs.length >= 2 && b.costs.length <= 5 && b.costs.every(r => ints(r) && r.length === b.costs[0].length && r.length <= 6), "costs must be a rectangle of integers, at most 5 x 6");
  if (b.dp === "lcs" || b.dp === "edit") need(/^[a-z]{1,8}$/.test(b.a) && /^[a-z]{1,8}$/.test(b.b), "a and b must be 1 to 8 lowercase letters");
  if (b.dp === "knap") need(ints(b.weights) && ints(b.values) && b.weights.length === b.values.length && b.weights.length <= 4 && Number.isInteger(b.cap) && b.cap >= 1 && b.cap <= 9, "needs matching weights and values (at most 4 items) and a capacity from 1 to 9");
}

let problems = 0, codeParts = 0;
const bad = msg => { problems++; console.log("  ✗ " + msg); };
for (const track of LEARN_TRACKS) {
  console.log(`Track ${track.id}`);
  const lessonIds = new Set(track.lessons.map(l => l.id));
  if (lessonIds.size !== track.lessons.length) bad("duplicate lesson ids");
  for (const [slug, lesson] of track.ready || []) {
    if (!slugs.has(slug)) bad(`ready: unknown LeetCode slug ${slug}`);
    if (!lessonIds.has(lesson)) bad(`ready: ${slug} points at unknown lesson ${lesson}`);
  }
  for (const lesson of track.lessons) {
    console.log(` ${lesson.id}`);
    const ids = new Set();
    for (const s of lesson.leetcode || []) if (!slugs.has(s)) bad(`unknown LeetCode slug ${s}`);
    for (const b of lesson.blocks) {
      if (!b.viz) continue;
      if (b.dp) { checkDpViz(b); continue; }
      if (b.intervals) { checkIntervalViz(b); continue; }
      if (b.words) { checkTrieViz(b); continue; }
      if (b.tree || b.heap) { checkArrayViz(b); continue; }
      if (b.grid) {
        const flat = b.grid.flat(), src = b.viz === "rotting" ? 2 : 0;
        if (b.grid.some(r => r.length !== b.grid[0].length)) bad(`viz "${b.title}": ragged grid`);
        if (!flat.includes(src)) bad(`viz "${b.title}": no source cells (${src}) to start from`);
        if (flat.filter(v => v === src).length > 4) bad(`viz "${b.title}": more than 4 sources, so colors repeat`);
        if (flat.length > 36) bad(`viz "${b.title}": ${flat.length} cells is too many to step through`);
        continue;
      }
      const g = b.graph;
      if (g.pos.length !== g.n) bad(`viz "${b.title}": ${g.pos.length} positions for ${g.n} vertices`);
      if (g.edges.some(e => e[0] >= g.n || e[1] >= g.n || e[0] < 0 || e[1] < 0)) bad(`viz "${b.title}": edge out of range`);
    }
    for (const part of lesson.parts) {
      if (ids.has(part.id)) bad(`duplicate part id ${part.id}`);
      ids.add(part.id);
      if (part.type === "quiz") {
        if (!(part.answer >= 0 && part.answer < part.options.length)) bad(`${part.id}: answer out of range`);
        if (part.options.length < 2) bad(`${part.id}: fewer than two options`);
        if (!part.q || !part.why) bad(`${part.id}: missing question or explanation`);
        continue;
      }
      if (part.type === "explain") {
        if (!part.title || !part.prompt || !part.rubric) bad(`${part.id}: explain part needs title, prompt and rubric`);
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
