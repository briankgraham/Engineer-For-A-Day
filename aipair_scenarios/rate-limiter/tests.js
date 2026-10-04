// Runs with: test, assert, eq, throws, require, mkClock
const load = () => require("./limiter").RateLimiter;
const make = (opts = {}) => {
  const clock = mkClock();
  const RateLimiter = load();
  return { rl: new RateLimiter({ capacity: 3, refillEveryMs: 1000, now: clock.now, ...opts }), clock };
};
const drain = (rl, key, n) => { for (let i = 0; i < n; i++) rl.tryConsume(key); };

// Hidden edge cases: run together with the visible tests when the candidate finishes.

test("a new key starts full and drains one token at a time", () => {
  const { rl } = make();
  eq(rl.tryConsume("a"), { allowed: true, remaining: 2, retryAfterMs: 0 });
  eq(rl.tryConsume("a").remaining, 1);
  eq(rl.tryConsume("a").remaining, 0);
  eq(rl.tryConsume("a").allowed, false);
});

test("keys have independent buckets", () => {
  const { rl } = make();
  drain(rl, "a", 3);
  eq(rl.tryConsume("a").allowed, false);
  eq(rl.tryConsume("b").allowed, true);
});

test("partial progress survives denied calls", () => {
  const { rl, clock } = make();
  drain(rl, "a", 3);
  clock.tick(400);
  eq(rl.tryConsume("a").retryAfterMs, 600);
  clock.tick(400);
  eq(rl.tryConsume("a").retryAfterMs, 200, "progress must not restart at each call");
  clock.tick(200);
  eq(rl.tryConsume("a").allowed, true);
});

test("retryAfterMs is exact", () => {
  const { rl, clock } = make();
  drain(rl, "a", 3);
  clock.tick(300);
  const { retryAfterMs } = rl.tryConsume("a");
  eq(retryAfterMs, 700);
  clock.tick(retryAfterMs - 1);
  eq(rl.tryConsume("a").allowed, false, "1 ms early");
  clock.tick(1);
  eq(rl.tryConsume("a").allowed, true, "exactly on time");
});

test("cost above one", () => {
  const { rl, clock } = make({ capacity: 5 });
  eq(rl.tryConsume("a", 3), { allowed: true, remaining: 2, retryAfterMs: 0 });
  eq(rl.tryConsume("a", 3), { allowed: false, remaining: 2, retryAfterMs: 1000 });
  clock.tick(1000);
  eq(rl.tryConsume("a", 3).allowed, true);
  for (const cost of [0, -1, 1.5, 6, "2"]) throws(() => rl.tryConsume("a", cost), RangeError, "cost " + String(cost));
});

test("a full bucket discards partial progress", () => {
  const { rl, clock } = make({ capacity: 2 });
  rl.tryConsume("a"); // 1 left
  clock.tick(1500); // regains 1 (full); the leftover 500 ms is discarded
  eq(rl.peek("a"), 2);
  eq(rl.tryConsume("a").remaining, 1);
  clock.tick(500);
  eq(rl.peek("a"), 1, "the next token is a full interval away");
  clock.tick(500);
  eq(rl.peek("a"), 2);
});

test("peek does not consume or create buckets", () => {
  const { rl } = make();
  eq(rl.peek("nobody"), 3);
  eq(rl.size, 0);
  rl.tryConsume("a");
  eq(rl.peek("a"), 2);
  eq(rl.peek("a"), 2);
});

test("prune removes only full buckets", () => {
  const { rl, clock } = make();
  rl.tryConsume("a");
  clock.tick(500);
  eq(rl.prune(), 0, "a is still short of full");
  eq(rl.size, 1);
  clock.tick(500);
  eq(rl.prune(), 1);
  eq(rl.size, 0);
});

test("many keys", () => {
  const { rl, clock } = make();
  for (let i = 0; i < 1000; i++) rl.tryConsume("k" + i);
  eq(rl.size, 1000);
  clock.tick(1000);
  eq(rl.prune(), 1000);
  eq(rl.size, 0);
});
