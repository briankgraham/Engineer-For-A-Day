// Runs with: test, assert, eq, throws, require, mkClock
const make = () => new (require("./emitter").EventEmitter)();
const caught = fn => { try { fn(); } catch (e) { return { e }; } return null; };

// Hidden edge cases: run together with the visible tests when the candidate finishes.

test("on rejects a non-function", () => {
  const e = make();
  for (const bad of [undefined, null, "fn", 42, {}]) throws(() => e.on("x", bad), TypeError, String(bad));
  throws(() => e.once("x", "nope"), TypeError, "once");
});

test("the same function registered twice runs twice", () => {
  const e = make();
  let n = 0;
  const f = () => n++;
  e.on("x", f).on("x", f);
  e.emit("x");
  eq(n, 2);
  eq(e.listenerCount("x"), 2);
});

test("off is a no-op for unknown listeners and events", () => {
  const e = make();
  const f = () => {};
  eq(e.off("nothing", f), e);
  e.on("x", () => {});
  eq(e.off("x", f), e);
  eq(e.listenerCount("x"), 1);
});

test("a once listener can be removed with the original function", () => {
  const e = make();
  let n = 0;
  const f = () => n++;
  e.once("x", f);
  eq(e.listenerCount("x"), 1);
  e.off("x", f);
  eq(e.listenerCount("x"), 0);
  e.emit("x");
  eq(n, 0);
});

test("a once listener already fired by a nested emit does not fire again", () => {
  const e = make();
  let nested = false, fired = 0;
  e.on("x", () => {
    if (!nested) {
      nested = true;
      e.emit("x");
    }
  });
  e.once("x", () => fired++);
  e.emit("x");
  eq(fired, 1);
});

test("several once listeners in a row all fire", () => {
  const e = make(), log = [];
  e.once("x", () => log.push(1));
  e.once("x", () => log.push(2));
  e.once("x", () => log.push(3));
  e.emit("x");
  eq(log, [1, 2, 3]);
});

test("a throwing listener does not stop the others; the first error is rethrown", () => {
  const e = make(), log = [];
  e.on("x", () => { log.push(1); throw new Error("first"); });
  e.on("x", () => log.push(2));
  e.on("x", () => { log.push(3); throw new Error("second"); });
  e.on("x", () => log.push(4));
  const r = caught(() => e.emit("x"));
  assert(r && r.e.message === "first", "expected the first error to be rethrown, got " + (r && r.e.message));
  eq(log, [1, 2, 3, 4]);
});

test("unhandled 'error' events throw", () => {
  const e = make();
  const err = new Error("bad");
  const r = caught(() => e.emit("error", err));
  assert(r && r.e === err, "the same Error instance is thrown");
  const s = caught(() => e.emit("error", "just a string"));
  assert(s && s.e instanceof Error && /just a string/.test(s.e.message), "a non-Error payload is wrapped in an Error");
  let seen = null;
  e.on("error", x => (seen = x));
  eq(e.emit("error", err), true);
  assert(seen === err, "a listener receives it");
});

test("removeAllListeners for one event or for all", () => {
  const e = make();
  const f = () => {};
  e.on("a", f).on("b", f).on("c", f);
  eq(e.removeAllListeners("a"), e);
  eq(e.eventNames().slice().sort(), ["b", "c"]);
  eq(e.removeAllListeners(), e);
  eq(e.eventNames(), []);
  eq(e.emit("b"), false);
});
