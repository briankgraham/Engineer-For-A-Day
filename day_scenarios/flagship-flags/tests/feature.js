// Hidden: FLAG-310 (percentage rollouts). Runs when the day ends.
function mk() {
  const { createApp } = require("./app");
  const msgs = [];
  const app = createApp({ publish: m => { msgs.push(m); } });
  return { app, msgs };
}
// A normal app whose node applies its own changes, for tests that only care about evaluate().
function mkLocal() {
  const { createApp } = require("./app");
  return createApp();
}
const users = n => Array.from({ length: n }, (_, i) => ({ id: "user_" + i, attrs: { country: "DE" } }));
const countOn = (app, key, us) => us.filter(u => app.evaluate(key, u)).length;
const onSet = (app, key, us) => new Set(us.filter(u => app.evaluate(key, u)).map(u => u.id));

test("setRollout validates the percent and the flag", () => {
  const app = mkLocal();
  app.createFlag({ key: "a", enabled: true });
  for (const bad of [-1, 101, 1.5, NaN, "50", null, undefined]) throws(() => app.setRollout("a", bad), RangeError, "percent " + String(bad));
  let code = null;
  try { app.setRollout("nope", 50); } catch (e) { code = e.code; }
  eq(code, "FLAG_NOT_FOUND");
  eq(app.getFlag("a").rollout, 100);
  app.setRollout("a", 25);
  eq(app.getFlag("a").rollout, 25);
});

test("a new flag is on for everyone who matches (100%)", () => {
  const app = mkLocal();
  app.createFlag({ key: "a", enabled: true });
  eq(countOn(app, "a", users(500)), 500);
});

test("0% means nobody, except users on the allow list", () => {
  const app = mkLocal();
  app.createFlag({ key: "a", enabled: true, allow: ["user_7"] });
  app.setRollout("a", 0);
  eq(countOn(app, "a", users(500)), 1);
  eq(app.evaluate("a", { id: "user_7" }), true);
});

test("bucketOf is an integer from 0 to 99, and a user is in exactly when bucket < percent", () => {
  const app = mkLocal();
  app.createFlag({ key: "a", enabled: true });
  const us = users(300);
  for (const u of us) {
    const b = app.bucketOf("a", u.id);
    assert(Number.isInteger(b) && b >= 0 && b <= 99, "bucket " + b);
  }
  const u = us[0], b = app.bucketOf("a", u.id);
  app.setRollout("a", b);
  eq(app.evaluate("a", u), false, "percent equal to the bucket is out");
  app.setRollout("a", b + 1);
  eq(app.evaluate("a", u), true, "percent one above the bucket is in");
});

test("the same user always gets the same answer, on every node and after a restart", () => {
  const a = mkLocal(), b = mkLocal();
  for (const app of [a, b]) { app.createFlag({ key: "a", enabled: true }); app.setRollout("a", 37); }
  const us = users(1000);
  eq([...onSet(a, "a", us)].join(), [...onSet(b, "a", us)].join());
  eq([...onSet(a, "a", us)].join(), [...onSet(a, "a", us)].join());
  eq(a.bucketOf("a", "user_42"), b.bucketOf("a", "user_42"));
});

test("users are spread evenly: 20% and 50% land near 20% and 50% of 10,000 users", () => {
  const app = mkLocal();
  app.createFlag({ key: "a", enabled: true });
  const us = users(10000);
  app.setRollout("a", 20);
  const n20 = countOn(app, "a", us);
  assert(n20 >= 1800 && n20 <= 2200, "20% selected " + n20);
  app.setRollout("a", 50);
  const n50 = countOn(app, "a", us);
  assert(n50 >= 4700 && n50 <= 5300, "50% selected " + n50);
});

test("raising the percentage never removes anyone and lowering never adds anyone", () => {
  const app = mkLocal();
  app.createFlag({ key: "a", enabled: true });
  const us = users(3000);
  const sets = [];
  for (const p of [5, 20, 60, 100]) { app.setRollout("a", p); sets.push(onSet(app, "a", us)); }
  for (let i = 1; i < sets.length; i++) for (const id of sets[i - 1]) assert(sets[i].has(id), id + " dropped out when the percentage went up");
  assert(sets[0].size < sets[1].size && sets[1].size < sets[2].size, "each step adds users");
  app.setRollout("a", 20);
  eq([...onSet(app, "a", us)].join(), [...sets[1]].join(), "back to 20% gives the same 20%");
});

test("two flags at 50% pick different halves of the users", () => {
  const app = mkLocal();
  app.createFlag({ key: "new-checkout", enabled: true });
  app.createFlag({ key: "dark-mode", enabled: true });
  app.setRollout("new-checkout", 50);
  app.setRollout("dark-mode", 50);
  const us = users(10000);
  const a = onSet(app, "new-checkout", us), b = onSet(app, "dark-mode", us);
  let both = 0;
  for (const id of a) if (b.has(id)) both++;
  assert(both >= 2200 && both <= 2800, "users in both flags: " + both + " (independent flags overlap by about 25%)");
});

test("rules and the enabled switch come before the percentage; the allow list is always in", () => {
  const app = mkLocal();
  app.createFlag({ key: "a", enabled: true, allow: ["user_1"], rules: [{ attr: "country", values: ["DE"] }] });
  app.setRollout("a", 100);
  eq(app.evaluate("a", { id: "user_5", attrs: { country: "US" } }), false, "rule does not match");
  eq(app.evaluate("a", { id: "user_5", attrs: { country: "DE" } }), true);
  app.setRollout("a", 0);
  eq(app.evaluate("a", { id: "user_1", attrs: { country: "US" } }), true, "allow list beats rules and the percentage");
  app.setEnabled("a", false);
  eq(app.evaluate("a", { id: "user_1", attrs: { country: "US" } }), false, "a disabled flag is off for everyone");
});

test("changing the percentage publishes the new version; setting the same percentage does not", () => {
  const { app, msgs } = mk();
  app.createFlag({ key: "a", enabled: true });
  const before = msgs.length;
  app.setRollout("a", 30);
  eq(msgs.length, before + 1);
  eq(app.getFlag("a").version, 2);
  app.setRollout("a", 30);
  eq(msgs.length, before + 1, "no message for an unchanged percentage");
  eq(app.getFlag("a").version, 2);
});

test("another node that applies the update evaluates with the new percentage", () => {
  const { createApp } = require("./app");
  const msgs = [];
  const admin = createApp({ publish: m => msgs.push(m) });
  const node = createApp();
  admin.createFlag({ key: "a", enabled: true });
  admin.setRollout("a", 0);
  for (const m of msgs) node.applyUpdate(m);
  eq(countOn(node, "a", users(200)), 0);
  admin.setRollout("a", 100);
  node.applyUpdate(msgs[msgs.length - 1]);
  eq(countOn(node, "a", users(200)), 200);
});
