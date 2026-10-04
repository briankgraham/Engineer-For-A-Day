// Runs with: test, assert, eq, throws, require, mkClock
const load = () => require("./limiter").RateLimiter;
const make = (opts = {}) => {
  const clock = mkClock();
  const RateLimiter = load();
  return { rl: new RateLimiter({ capacity: 3, refillEveryMs: 1000, now: clock.now, ...opts }), clock };
};
const drain = (rl, key, n) => { for (let i = 0; i < n; i++) rl.tryConsume(key); };

// These are the tests you can see. More edge cases run when you finish.

test("rejects bad constructor options", () => {
  const RateLimiter = load();
  for (const capacity of [0, -1, 1.5, "3", undefined]) throws(() => new RateLimiter({ capacity, refillEveryMs: 100 }), RangeError, "capacity " + String(capacity));
  for (const refillEveryMs of [0, -5, 0.5, "x", undefined]) throws(() => new RateLimiter({ capacity: 2, refillEveryMs }), RangeError, "refillEveryMs " + String(refillEveryMs));
});

test("a denied call reports remaining and retryAfterMs", () => {
  const { rl } = make();
  drain(rl, "a", 3);
  eq(rl.tryConsume("a"), { allowed: false, remaining: 0, retryAfterMs: 1000 });
});

test("one token comes back per interval", () => {
  const { rl, clock } = make();
  drain(rl, "a", 3);
  clock.tick(1000);
  eq(rl.tryConsume("a").allowed, true);
  eq(rl.tryConsume("a").allowed, false);
  clock.tick(2000);
  eq(rl.tryConsume("a").remaining, 1, "two tokens came back, one was used");
});

test("leftover time is kept when a token is credited", () => {
  const { rl, clock } = make();
  drain(rl, "a", 3);
  clock.tick(1500); // one token credited, 500 ms of progress toward the next
  eq(rl.tryConsume("a"), { allowed: true, remaining: 0, retryAfterMs: 0 });
  eq(rl.tryConsume("a").retryAfterMs, 500);
  clock.tick(500);
  eq(rl.tryConsume("a").allowed, true, "the kept 500 ms completes the next token");
});

test("a denied call consumes nothing", () => {
  const { rl } = make({ capacity: 4 });
  drain(rl, "a", 3);
  eq(rl.tryConsume("a", 2), { allowed: false, remaining: 1, retryAfterMs: 1000 });
  eq(rl.peek("a"), 1);
  eq(rl.tryConsume("a").allowed, true);
});

test("refill is capped at capacity", () => {
  const { rl, clock } = make();
  drain(rl, "a", 3);
  clock.tick(10 * 1000);
  eq(rl.tryConsume("a").remaining, 2);
  eq(rl.peek("a"), 2);
});

test("a backwards clock adds nothing and re-bases", () => {
  const { rl, clock } = make();
  drain(rl, "a", 3);
  clock.tick(-500);
  eq(rl.tryConsume("a"), { allowed: false, remaining: 0, retryAfterMs: 1000 });
  clock.tick(1000);
  eq(rl.tryConsume("a").allowed, true);
});

test("reset makes a key full again", () => {
  const { rl } = make();
  drain(rl, "a", 3);
  rl.reset("a");
  eq(rl.tryConsume("a").remaining, 2);
  rl.reset("never-seen");
});

test("prune never hands a throttled key a fresh bucket", () => {
  const { rl, clock } = make();
  drain(rl, "hot", 3);
  clock.tick(1000); // idle for a whole interval, yet only 1 of 3 tokens is back
  eq(rl.prune(), 0);
  eq(rl.size, 1);
  eq(rl.tryConsume("hot"), { allowed: true, remaining: 0, retryAfterMs: 0 }, "not a fresh bucket");
  eq(rl.tryConsume("hot").allowed, false);
});
