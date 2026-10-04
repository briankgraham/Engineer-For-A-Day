// Runs with: test, assert, eq, throws, require, mkClock, mkDeferred, flush
// Tests may be async. flush() waits for pending promise callbacks; mkDeferred() gives { promise, resolve, reject }.
const { mapLimit } = require("./pool");
const { fulfilled, rejected } = require("./results");

// Every call to fn gets a deferred you settle by hand, so nothing depends on real time.
const rig = () => {
  const started = [], defs = [];
  let inflight = 0, peak = 0;
  const fn = (item, i) => {
    started.push(item);
    const d = (defs[i] = mkDeferred());
    inflight++; peak = Math.max(peak, inflight);
    return d.promise.finally(() => { inflight--; });
  };
  return { fn, started, defs, peak: () => peak };
};
// Watches a promise without throwing on rejection.
const track = p => {
  const o = { state: "pending" };
  p.then(v => { o.state = "fulfilled"; o.value = v; }, e => { o.state = "rejected"; o.reason = e; });
  return o;
};

test("results helpers build the settled shape", () => {
  eq(fulfilled(1), { status: "fulfilled", value: 1 });
  eq(rejected("x"), { status: "rejected", reason: "x" });
});

test("limit and fn are validated synchronously", () => {
  for (const bad of [0, -1, 1.5, "2", NaN, Infinity, undefined]) throws(() => mapLimit([1], bad, x => x), RangeError, "limit " + String(bad));
  throws(() => mapLimit([1], 1, "nope"), TypeError);
  throws(() => mapLimit([1], 2), TypeError);
});

test("empty input resolves to []; plain return values are fine", async () => {
  const p = mapLimit([], 3, x => x);
  assert(p && typeof p.then === "function", "returns a promise");
  eq(await p, []);
  eq(await mapLimit([1, 2, 3], 2, x => x * 2), [2, 4, 6]);
});

test("fn receives the item and its index", async () => {
  eq(await mapLimit(["a", "b", "c"], 5, (x, i) => [x, i]), [["a", 0], ["b", 1], ["c", 2]]);
});

test("results are in input order even when calls finish out of order", async () => {
  const r = rig();
  const p = mapLimit(["a", "b", "c"], 3, r.fn);
  await flush();
  r.defs[2].resolve("C"); r.defs[0].resolve("A"); r.defs[1].resolve("B");
  eq(await p, ["A", "B", "C"]);
});

test("never more than limit calls in flight", async () => {
  const r = rig();
  const p = mapLimit([0, 1, 2, 3, 4], 2, r.fn);
  await flush();
  eq(r.started, [0, 1]);
  r.defs[0].resolve(0);
  await flush();
  eq(r.started, [0, 1, 2]);
  for (let i = 1; i < 5; i++) { await flush(); r.defs[i].resolve(i); }
  eq(await p, [0, 1, 2, 3, 4]);
  eq(r.peak(), 2);
});

test("sliding window: a fast call frees a slot without waiting for a slow one", async () => {
  const r = rig();
  const p = mapLimit(["A", "B", "C", "D"], 2, r.fn);
  await flush();
  r.defs[1].resolve("b");
  await flush();
  eq(r.started, ["A", "B", "C"], "C starts as soon as B finishes, while A is still running");
  r.defs[0].resolve("a"); await flush();
  r.defs[2].resolve("c"); await flush();
  r.defs[3].resolve("d");
  eq(await p, ["a", "b", "c", "d"]);
});

test("first rejection rejects with that error and starts nothing new", async () => {
  const r = rig(), err = new Error("boom");
  const o = track(mapLimit([0, 1, 2, 3, 4], 2, r.fn));
  await flush();
  r.defs[0].reject(err);
  await flush();
  eq(o.state, "rejected");
  assert(o.reason === err, "rejects with the original error");
  eq(r.started, [0, 1], "no new call after the failure");
  r.defs[1].resolve("late");
  await flush();
  eq(r.started, [0, 1]);
  eq(o.state, "rejected");
});
