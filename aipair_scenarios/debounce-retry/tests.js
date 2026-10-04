// Runs with: test, assert, eq, throws, require, mkClock
const { debounce } = require("./debounce");
const { retry } = require("./retry");

// Fake timers: nothing runs until tick(ms). Ids start at 1.
const mkTimers = () => {
  let now = 0, nextId = 1;
  const q = new Map();
  return {
    setTimeout: (fn, ms) => { const id = nextId++; q.set(id, { fn, at: now + ms }); return id; },
    clearTimeout: id => { q.delete(id); },
    tick(ms) {
      const end = now + ms;
      for (;;) {
        let pick = null;
        for (const [id, t] of q) if (t.at <= end && (!pick || t.at < pick.t.at || (t.at === pick.t.at && id < pick.id))) pick = { id, t };
        if (!pick) break;
        q.delete(pick.id);
        now = pick.t.at;
        pick.t.fn();
      }
      now = end;
    },
    count: () => q.size,
  };
};
const spy = (impl = () => undefined) => { const f = function (...args) { f.calls.push({ args, self: this }); return impl.apply(this, args); }; f.calls = []; return f; };

// ---------- debounce ----------

// Hidden edge cases: run together with the visible tests when the candidate finishes.

test("debounce: trailing call fires once, after the last call", () => {
  const t = mkTimers(), f = spy(), d = debounce(f, 100, { timers: t });
  d(1); t.tick(50); d(2); t.tick(50); d(3);
  t.tick(99);
  eq(f.calls.length, 0, "still waiting");
  t.tick(1);
  eq(f.calls.length, 1);
  eq(f.calls[0].args, [3], "uses the latest arguments");
  t.tick(1000);
  eq(f.calls.length, 1);
  eq(t.count(), 0, "no timers left");
});

test("debounce: a call after the quiet period starts a new burst", () => {
  const t = mkTimers(), f = spy(), d = debounce(f, 100, { timers: t });
  d("a"); t.tick(100);
  d("b"); t.tick(100);
  eq(f.calls.map(c => c.args[0]), ["a", "b"]);
});

test("debounce: leading fires at once with that call's arguments", () => {
  const t = mkTimers(), f = spy(), d = debounce(f, 100, { leading: true, trailing: false, timers: t });
  d(1);
  eq(f.calls.length, 1);
  eq(f.calls[0].args, [1]);
  t.tick(50); d(2); t.tick(50); d(3);
  eq(f.calls.length, 1, "no more calls inside the burst");
  t.tick(100);
  eq(f.calls.length, 1, "and no trailing call");
  d(4);
  eq(f.calls.length, 2, "a new burst leads again");
});

test("debounce: leading + trailing with several calls fires first and last", () => {
  const t = mkTimers(), f = spy(), d = debounce(f, 100, { leading: true, trailing: true, timers: t });
  d(1); d(2); d(3);
  eq(f.calls.length, 1);
  t.tick(100);
  eq(f.calls.map(c => c.args[0]), [1, 3]);
});

test("debounce: cancel drops the pending call and ends the burst", () => {
  const t = mkTimers(), f = spy(), d = debounce(f, 100, { timers: t });
  d(1);
  d.cancel();
  t.tick(500);
  eq(f.calls.length, 0);
  eq(t.count(), 0);
  const g = spy(), lead = debounce(g, 100, { leading: true, timers: t });
  lead(1);
  lead.cancel();
  lead(2);
  eq(g.calls.map(c => c.args[0]), [1, 2], "the leading edge fires again after cancel");
});

test("debounce: pending reports a scheduled trailing call", () => {
  const t = mkTimers(), d = debounce(() => {}, 100, { timers: t });
  eq(d.pending(), false);
  d();
  eq(d.pending(), true);
  t.tick(100);
  eq(d.pending(), false);
  d();
  d.cancel();
  eq(d.pending(), false);
  const lead = debounce(() => {}, 100, { leading: true, trailing: false, timers: t });
  lead(); lead();
  eq(lead.pending(), false);
});

test("retry: rejects bad arguments", () => {
  const ok = () => {};
  throws(() => retry("no", {}, ok), TypeError);
  throws(() => retry(ok, {}, "no"), TypeError);
  for (const attempts of [0, -1, 1.5, "3"]) throws(() => retry(ok, { attempts }, ok), RangeError, "attempts " + String(attempts));
  throws(() => retry(ok, { baseMs: -1 }, ok), RangeError, "baseMs");
  throws(() => retry(ok, { factor: 0.5 }, ok), RangeError, "factor");
  throws(() => retry(ok, { maxMs: -1 }, ok), RangeError, "maxMs");
});

test("retry: waits baseMs * factor ** (n - 1) between tries", () => {
  const t = mkTimers(), out = [];
  let n = 0;
  retry(cb => { n++; if (n < 4) cb(new Error("fail" + n)); else cb(null, "done"); }, { attempts: 5, baseMs: 100, factor: 2, timers: t }, (...a) => out.push(a));
  eq(n, 1);
  t.tick(99); eq(n, 1, "first wait is 100");
  t.tick(1); eq(n, 2);
  t.tick(199); eq(n, 2, "second wait is 200");
  t.tick(1); eq(n, 3);
  t.tick(399); eq(n, 3, "third wait is 400");
  eq(out.length, 0);
  t.tick(1); eq(n, 4);
  eq(out, [[null, "done"]]);
});

test("retry: attempts 1 never retries", () => {
  const t = mkTimers(), out = [];
  let n = 0;
  retry(cb => { n++; cb(new Error("x")); }, { attempts: 1, timers: t }, (...a) => out.push(a));
  eq(n, 1);
  eq(out.length, 1);
  eq(t.count(), 0);
});

test("retry: defaults are 3 tries, 100 ms base, factor 2", () => {
  const t = mkTimers();
  let n = 0;
  retry(cb => { n++; cb(new Error("x")); }, { timers: t }, () => {});
  t.tick(100); eq(n, 2);
  t.tick(199); eq(n, 2);
  t.tick(1); eq(n, 3);
  t.tick(10000); eq(n, 3);
});

test("retry: only the first cb call of a try counts", () => {
  const t = mkTimers(), out = [];
  let n = 0;
  retry(cb => { n++; cb(new Error("a")); cb(new Error("b")); cb(null, "late"); }, { attempts: 2, baseMs: 100, timers: t }, (...a) => out.push(a));
  eq(t.count(), 1, "one retry scheduled, not three");
  t.tick(100);
  eq(n, 2);
  eq(out.length, 1);
  eq(out[0][0].message, "a");
});

test("retry: cancel while waiting stops everything", () => {
  const t = mkTimers(), out = [];
  let n = 0;
  const h = retry(cb => { n++; cb(new Error("x")); }, { baseMs: 100, timers: t }, (...a) => out.push(a));
  h.cancel();
  eq(t.count(), 0, "the wait was cleared");
  t.tick(10000);
  eq(n, 1);
  eq(out.length, 0);
});

test("retry: cancel after completion is harmless", () => {
  const t = mkTimers(), out = [];
  const h = retry(cb => cb(null, 1), { timers: t }, (...a) => out.push(a));
  h.cancel();
  eq(out, [[null, 1]]);
});
