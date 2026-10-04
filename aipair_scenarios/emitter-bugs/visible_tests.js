// Runs with: test, assert, eq, throws, require, mkClock
const make = () => new (require("./emitter").EventEmitter)();
const caught = fn => { try { fn(); } catch (e) { return { e }; } return null; };

// These are the tests you can see. More edge cases run when you finish.

test("calls listeners in order with all arguments, and on() chains", () => {
  const e = make(), log = [];
  eq(e.on("x", (...a) => log.push(["a", ...a])), e, "on returns the emitter");
  e.on("x", (...a) => log.push(["b", ...a]));
  e.emit("x", 1, "two", { three: 3 });
  eq(log, [["a", 1, "two", { three: 3 }], ["b", 1, "two", { three: 3 }]]);
});

test("emit returns whether anyone was listening", () => {
  const e = make();
  eq(e.emit("x"), false);
  const f = () => {};
  e.on("x", f);
  eq(e.emit("x"), true);
  e.off("x", f);
  eq(e.emit("x"), false, "after the last listener is removed");
});

test("off removes only the most recently added registration", () => {
  const e = make(), log = [];
  const f = () => log.push("f");
  e.on("x", f);
  e.on("x", () => log.push("middle"));
  e.on("x", f);
  e.off("x", f);
  e.emit("x");
  eq(log, ["f", "middle"], "the later f went, the earlier f stays");
  eq(e.listenerCount("x"), 2);
});

test("once fires exactly one time", () => {
  const e = make();
  let n = 0;
  e.once("x", v => (n += v));
  e.emit("x", 5);
  e.emit("x", 5);
  eq(n, 5);
  eq(e.listenerCount("x"), 0);
});

test("once is removed before it runs", () => {
  const e = make();
  let n = 0;
  e.once("x", () => {
    n++;
    if (n < 5) e.emit("x");
  });
  e.emit("x");
  eq(n, 1, "an emit from inside must not run it again");
});

test("removing a listener during emit does not skip the next one", () => {
  const e = make(), log = [];
  const a = () => { log.push("a"); e.off("x", a); };
  e.on("x", a);
  e.on("x", () => log.push("b"));
  e.on("x", () => log.push("c"));
  e.emit("x");
  eq(log, ["a", "b", "c"]);
  log.length = 0;
  e.emit("x");
  eq(log, ["b", "c"]);
});

test("emit uses a snapshot: removed still runs, added does not", () => {
  const e = make(), log = [];
  const b = () => log.push("b");
  e.on("x", () => {
    log.push("a");
    e.off("x", b);
    e.on("x", () => log.push("late"));
  });
  e.on("x", b);
  e.emit("x");
  eq(log, ["a", "b"], "b was removed mid-emit but still runs; late is new");
  log.length = 0;
  e.emit("x");
  eq(log, ["a", "late"]);
});

test("a once listener that throws is still removed", () => {
  const e = make();
  let n = 0;
  e.once("x", () => { n++; throw new Error("boom"); });
  caught(() => e.emit("x"));
  eq(caught(() => e.emit("x")), null);
  eq(n, 1);
});

test("eventNames lists only events with listeners", () => {
  const e = make();
  const f = () => {};
  e.on("a", f);
  e.on("b", f);
  eq(e.eventNames().slice().sort(), ["a", "b"]);
  e.off("a", f);
  eq(e.eventNames(), ["b"]);
  eq(e.listenerCount("a"), 0);
  eq(e.listenerCount("never"), 0);
});
