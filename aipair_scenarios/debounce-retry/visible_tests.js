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

// These are the tests you can see. More edge cases run when you finish.

test("debounce: rejects bad arguments", () => {
  throws(() => debounce("no", 10), TypeError);
  for (const w of [-1, NaN, Infinity, "5", undefined]) throws(() => debounce(() => {}, w), RangeError, "waitMs " + String(w));
  throws(() => debounce(() => {}, 10, { leading: false, trailing: false }), RangeError);
});

test("debounce: every call restarts the wait", () => {
  const t = mkTimers(), f = spy(), d = debounce(f, 100, { timers: t });
  d(); t.tick(90); d();
  t.tick(50);
  eq(f.calls.length, 0);
  t.tick(50);
  eq(f.calls.length, 1);
});

test("debounce: trailing call keeps the latest this", () => {
  const t = mkTimers(), f = spy();
  const a = { name: "a", m: debounce(f, 10, { timers: t }) }, b = { name: "b" };
  a.m(1);
  a.m.call(b, 2);
  t.tick(10);
  assert(f.calls[0].self === b, "this of the last call");
});

test("debounce: leading + trailing with a single call fires exactly once", () => {
  const t = mkTimers(), f = spy(), d = debounce(f, 100, { leading: true, trailing: true, timers: t });
  d("only");
  t.tick(500);
  eq(f.calls.length, 1);
});

test("debounce: returns the result of the latest fn call", () => {
  const t = mkTimers(), d = debounce(x => x * 2, 100, { timers: t });
  eq(d(1), undefined, "nothing has run yet");
  t.tick(100);
  eq(d(2), 2, "the previous result");
  const lead = debounce(x => x * 3, 100, { leading: true, timers: t });
  eq(lead(5), 15, "a leading call returns its own result");
});

test("debounce: flush runs the pending call now", () => {
  const t = mkTimers(), f = spy(x => "r" + x), d = debounce(f, 100, { timers: t });
  d(1); d(2);
  eq(d.flush(), "r2");
  eq(f.calls.length, 1);
  eq(f.calls[0].args, [2]);
  t.tick(500);
  eq(f.calls.length, 1, "the timer does not fire again");
  eq(t.count(), 0);
  eq(d.flush(), "r2", "nothing pending: returns the last result");
  eq(f.calls.length, 1);
});

test("debounce: a wait of zero", () => {
  const t = mkTimers(), f = spy(), d = debounce(f, 0, { timers: t });
  d(1);
  eq(f.calls.length, 0);
  t.tick(0);
  eq(f.calls.length, 1);
});

// ---------- retry ----------
test("retry: success on the first try calls back once, right away", () => {
  const t = mkTimers(), out = [];
  const h = retry(cb => cb(null, "ok"), { timers: t }, (...a) => out.push(a));
  eq(out, [[null, "ok"]]);
  eq(t.count(), 0);
  assert(typeof h.cancel === "function", "returns { cancel }");
  const out2 = [];
  retry(cb => cb(), { timers: t }, (...a) => out2.push(a));
  eq(out2, [[null, undefined]], "no error and no value is still a success");
});

test("retry: attempts is the total number of tries; the last error is returned without waiting", () => {
  const t = mkTimers(), out = [];
  let n = 0;
  retry(cb => { n++; cb(new Error("fail" + n)); }, { attempts: 3, baseMs: 100, timers: t }, (...a) => out.push(a));
  t.tick(100);
  t.tick(200);
  eq(n, 3, "three tries in total");
  eq(out.length, 1, "called back as soon as the last try failed");
  eq(out[0][0].message, "fail3");
  eq(t.count(), 0, "no wait after the last try");
  t.tick(10000);
  eq(n, 3);
});

test("retry: maxMs caps the wait", () => {
  const t = mkTimers();
  let n = 0;
  retry(cb => { n++; cb(new Error("x")); }, { attempts: 5, baseMs: 100, factor: 10, maxMs: 250, timers: t }, () => {});
  t.tick(100); eq(n, 2, "100");
  t.tick(249); eq(n, 2);
  t.tick(1); eq(n, 3, "capped at 250");
  t.tick(249); eq(n, 3);
  t.tick(1); eq(n, 4, "still 250");
});

test("retry: shouldRetry can stop early and sees the try number", () => {
  const t = mkTimers(), seen = [], out = [];
  let n = 0;
  retry(cb => { n++; cb(new Error(n === 2 ? "fatal" : "flaky")); }, { attempts: 5, timers: t, shouldRetry: (err, k) => { seen.push([err.message, k]); return err.message !== "fatal"; } }, (...a) => out.push(a));
  t.tick(100);
  eq(n, 2);
  eq(out.length, 1);
  eq(out[0][0].message, "fatal");
  eq(seen, [["flaky", 1], ["fatal", 2]]);
  eq(t.count(), 0);
});

test("retry: works with an asynchronous task", () => {
  const t = mkTimers(), out = [];
  let n = 0;
  retry(cb => { n++; const k = n; t.setTimeout(() => (k < 2 ? cb(new Error("no")) : cb(null, "yes")), 10); }, { baseMs: 50, timers: t }, (...a) => out.push(a));
  t.tick(10); eq(n, 1);
  t.tick(50); eq(n, 2);
  eq(out.length, 0);
  t.tick(10);
  eq(out, [[null, "yes"]]);
});

test("retry: cancel while a try is in flight ignores its late answer", () => {
  const t = mkTimers(), out = [];
  const held = [];
  const h = retry(cb => held.push(cb), { timers: t }, (...a) => out.push(a));
  h.cancel();
  held[0](new Error("late failure"));
  eq(t.count(), 0, "no retry was scheduled");
  const held2 = [];
  const h2 = retry(cb => held2.push(cb), { timers: t }, (...a) => out.push(a));
  h2.cancel();
  held2[0](null, "late success");
  eq(out.length, 0, "callback never runs after cancel");
});
