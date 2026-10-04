// Runs with: test, assert, eq, throws, require, mkClock
const load = () => require("./cache").TTLCache;
const make = (opts = {}) => {
  const clock = mkClock();
  const TTLCache = load();
  return { c: new TTLCache({ capacity: 3, ttlMs: 100, now: clock.now, ...opts }), clock };
};

// These are the tests you can see. More edge cases run when you finish.

test("rejects a bad capacity", () => {
  const TTLCache = load();
  for (const capacity of [0, -1, 1.5, "3", undefined, NaN]) {
    throws(() => new TTLCache({ capacity, ttlMs: 10 }), RangeError, "capacity " + String(capacity));
  }
});

test("works with the default clock", () => {
  const TTLCache = load();
  const c = new TTLCache({ capacity: 2, ttlMs: 60000 });
  c.set("a", 1);
  eq(c.get("a"), 1);
});

test("stores falsy values", () => {
  const { c } = make({ capacity: 5 });
  c.set("zero", 0).set("empty", "").set("no", false).set("nil", null);
  eq(c.get("zero"), 0);
  eq(c.get("empty"), "");
  eq(c.get("no"), false);
  eq(c.get("nil"), null);
  assert(c.has("zero"), "has(zero)");
  eq(c.stats().hits, 4, "hits");
});

test("per-entry ttl overrides the default", () => {
  const { c, clock } = make();
  c.set("short", 1, 10);
  c.set("long", 2, 500);
  clock.tick(50);
  eq(c.get("short"), undefined);
  clock.tick(300);
  eq(c.get("long"), 2);
  throws(() => c.set("bad", 1, 0), RangeError, "per-entry ttl 0");
});

test("evicts the least recently used entry", () => {
  const { c } = make({ capacity: 2 });
  c.set("a", 1);
  c.set("b", 2);
  c.get("a");
  c.set("c", 3);
  eq(c.get("b"), undefined, "b evicted");
  eq(c.get("a"), 1);
  eq(c.get("c"), 3);
});

test("purges expired entries before evicting a live one", () => {
  const { c, clock } = make({ capacity: 2 });
  c.set("b", 2, 1000);
  c.set("a", 1, 50);
  clock.tick(100);
  c.set("c", 3);
  eq(c.get("b"), 2, "live b must survive");
  eq(c.get("c"), 3);
  eq(c.stats().evictions, 0, "nothing live was evicted");
  eq(c.stats().expirations, 1, "a expired");
});

test("has ignores hits and misses; respects expiry", () => {
  const { c, clock } = make();
  c.set("a", 1);
  c.has("a");
  c.has("zzz");
  eq(c.stats().hits + c.stats().misses, 0, "has is not counted");
  clock.tick(100);
  eq(c.has("a"), false);
});

test("size counts only live entries", () => {
  const { c, clock } = make();
  c.set("a", 1, 10);
  c.set("b", 2, 100);
  c.set("c", 3, 1000);
  eq(c.size, 3);
  clock.tick(10);
  eq(c.size, 2);
  clock.tick(90);
  eq(c.size, 1);
});

test("capacity 1 keeps only the latest entry", () => {
  const { c } = make({ capacity: 1 });
  c.set("a", 1);
  c.set("b", 2);
  eq(c.has("a"), false);
  eq(c.get("b"), 2);
});
