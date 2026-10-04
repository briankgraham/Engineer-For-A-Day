// Hidden edge cases. Runs with: test, assert, eq, throws, require, mkClock, mkDeferred, flush
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
// Minimal AbortSignal stand-in (the test sandbox has no AbortController).
const mkSignal = () => {
  const ls = new Set();
  const s = {
    aborted: false, reason: undefined,
    addEventListener: (t, f) => { if (t === "abort") ls.add(f); },
    removeEventListener: (t, f) => { if (t === "abort") ls.delete(f); },
    abort(reason) { if (s.aborted) return; s.aborted = true; s.reason = reason; for (const f of [...ls]) f({ type: "abort" }); },
    listeners: () => ls.size,
  };
  return s;
};

test("a synchronous throw rejects and stops further calls", async () => {
  const err = new Error("sync"), started = [];
  const p = mapLimit([0, 1, 2, 3], 3, x => { started.push(x); if (x === 1) throw err; return x; });
  const o = track(p);
  await flush();
  eq(o.state, "rejected");
  assert(o.reason === err);
  eq(started, [0, 1], "items after the throw are never started");
});

test("a synchronous throw from a later call rejects too", async () => {
  const err = new Error("later");
  const o = track(mapLimit([0, 1, 2], 1, x => { if (x === 1) throw err; return Promise.resolve(x); }));
  await flush();
  eq(o.state, "rejected", "must not hang");
  assert(o.reason === err);
});

test("settle mode records sync throws and rejections, in order, and runs everything", async () => {
  const e1 = new Error("one"), e2 = new Error("two");
  const r = rig(), started = r.started;
  const fn = (x, i) => { if (x === 2) throw e2; return r.fn(x, i); };
  const p = mapLimit([0, 1, 2, 3], 2, fn, { settle: true });
  const o = track(p);
  await flush();
  r.defs[1].reject(e1); r.defs[0].resolve("zero");
  await flush();
  r.defs[3].resolve("three");
  await flush();
  eq(o.state, "fulfilled", "settle mode does not reject");
  eq(o.value.map(x => x.status), ["fulfilled", "rejected", "rejected", "fulfilled"]);
  assert(o.value[1].reason === e1 && o.value[2].reason === e2);
  eq([o.value[0].value, o.value[3].value], ["zero", "three"]);
  eq(started, [0, 1, 3]);
});

test("after the first failure, later results and errors are ignored", async () => {
  const r = rig(), e0 = new Error("first"), e1 = new Error("second");
  const o = track(mapLimit([0, 1, 2], 2, r.fn));
  await flush();
  r.defs[0].reject(e0);
  await flush();
  r.defs[1].reject(e1);
  await flush();
  eq(o.state, "rejected");
  assert(o.reason === e0, "the first error wins");
});

test("with limit 1 a failure stops the rest", async () => {
  const r = rig();
  const o = track(mapLimit([0, 1, 2], 1, r.fn));
  await flush();
  r.defs[0].reject(new Error("x"));
  await flush();
  eq(o.state, "rejected");
  eq(r.started, [0]);
});

test("order holds when several calls finish out of order across slots", async () => {
  const r = rig();
  const p = mapLimit(["a", "b", "c", "d"], 2, r.fn);
  await flush();
  r.defs[1].resolve("b"); await flush();
  r.defs[0].resolve("a"); await flush();
  r.defs[3].resolve("d"); await flush();
  r.defs[2].resolve("c");
  eq(await p, ["a", "b", "c", "d"]);
});

test("items can be any iterable; limit may exceed the item count", async () => {
  eq(await mapLimit(new Set([1, 2, 3]), 2, x => x + 1), [2, 3, 4]);
  function* gen() { yield "a"; yield "b"; }
  eq(await mapLimit(gen(), 1, x => x + "!"), ["a!", "b!"]);
  const r = rig();
  const p = mapLimit([1, 2], 10, r.fn);
  await flush();
  eq(r.started, [1, 2]);
  r.defs[0].resolve("x"); r.defs[1].resolve("y");
  eq(await p, ["x", "y"]);
});

test("an already aborted signal rejects with its reason and never calls fn", async () => {
  const sig = mkSignal(), reason = new Error("stop");
  sig.abort(reason);
  const r = rig();
  const o = track(mapLimit([1, 2], 2, r.fn, { signal: sig }));
  const o2 = track(mapLimit([], 2, r.fn, { signal: sig }));
  const o3 = track(mapLimit([1], 2, r.fn, { signal: sig, settle: true }));
  await flush();
  for (const x of [o, o2, o3]) { eq(x.state, "rejected"); assert(x.reason === reason); }
  eq(r.started, []);
  eq(sig.listeners(), 0);
});

test("aborting mid-run rejects with the reason and starts nothing more", async () => {
  const sig = mkSignal(), reason = new Error("cancelled"), r = rig();
  const o = track(mapLimit([0, 1, 2], 1, r.fn, { signal: sig }));
  await flush();
  eq(r.started, [0]);
  sig.abort(reason);
  await flush();
  eq(o.state, "rejected");
  assert(o.reason === reason);
  r.defs[0].resolve("late");
  await flush();
  eq(r.started, [0]);
  eq(sig.listeners(), 0);
});

test("the abort listener is removed after success and after failure", async () => {
  const sig = mkSignal(), r = rig();
  const p = mapLimit([0], 1, r.fn, { signal: sig });
  await flush();
  eq(sig.listeners(), 1, "listener is attached while running");
  r.defs[0].resolve(1);
  await p;
  eq(sig.listeners(), 0);
  const sig2 = mkSignal(), r2 = rig();
  const o = track(mapLimit([0], 1, r2.fn, { signal: sig2 }));
  await flush();
  r2.defs[0].reject(new Error("x"));
  await flush();
  eq(o.state, "rejected");
  eq(sig2.listeners(), 0);
});
