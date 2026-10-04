// Runs with: test, assert, eq, throws, require, mkClock
const load = () => require("./cache").TTLCache;
const make = (opts = {}) => {
  const clock = mkClock();
  const TTLCache = load();
  return { c: new TTLCache({ capacity: 3, ttlMs: 100, now: clock.now, ...opts }), clock };
};

// Hidden edge cases: run together with the visible tests when the candidate finishes.

test("rejects a bad ttlMs", () => {
  const TTLCache = load();
  for (const ttlMs of [0, -5, "x", undefined]) {
    throws(() => new TTLCache({ capacity: 2, ttlMs }), RangeError, "ttlMs " + String(ttlMs));
  }
});

test("set and get; missing key is undefined", () => {
  const { c } = make();
  eq(c.set("a", 1), c, "set returns the cache");
  eq(c.get("a"), 1);
  eq(c.get("nope"), undefined);
});

test("entry expires exactly at its ttl", () => {
  const { c, clock } = make();
  c.set("a", 1);
  clock.tick(99);
  eq(c.get("a"), 1, "alive at 99ms");
  c.set("b", 2);
  clock.tick(100);
  eq(c.get("b"), undefined, "expired at exactly ttl");
});

test("overwriting a key refreshes its expiry", () => {
  const { c, clock } = make();
  c.set("a", 1);
  clock.tick(60);
  c.set("a", 2);
  clock.tick(60);
  eq(c.get("a"), 2);
});

test("overwriting a key makes it most recently used", () => {
  const { c } = make({ capacity: 2 });
  c.set("a", 1);
  c.set("b", 2);
  c.set("a", 10);
  c.set("c", 3);
  eq(c.has("b"), false, "b evicted");
  eq(c.get("a"), 10);
});

test("has does not refresh recency", () => {
  const { c } = make({ capacity: 2 });
  c.set("a", 1);
  c.set("b", 2);
  eq(c.has("a"), true);
  c.set("c", 3);
  eq(c.has("a"), false, "a is still the LRU and gets evicted");
  eq(c.has("b"), true);
});

test("delete returns true only for a live entry", () => {
  const { c, clock } = make();
  c.set("a", 1);
  c.set("b", 2);
  eq(c.delete("a"), true);
  eq(c.delete("a"), false, "already deleted");
  eq(c.delete("never"), false);
  clock.tick(100);
  eq(c.delete("b"), false, "expired");
  eq(c.size, 0);
});

test("stats add up", () => {
  const { c, clock } = make({ capacity: 2 });
  c.set("a", 1);
  c.get("a");
  c.get("z");
  c.set("b", 2);
  c.set("c", 3);
  clock.tick(100);
  c.get("b");
  eq(c.size, 0);
  eq(c.stats(), { hits: 1, misses: 2, evictions: 1, expirations: 2 });
});

test("many entries stay bounded and ordered", () => {
  const { c } = make({ capacity: 100, ttlMs: 1e9 });
  for (let i = 0; i < 10000; i++) c.set(i, i);
  eq(c.size, 100);
  eq(c.has(9899), false);
  eq(c.has(9900), true);
  eq(c.has(9999), true);
});
