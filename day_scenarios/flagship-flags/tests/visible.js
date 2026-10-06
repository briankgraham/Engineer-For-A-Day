// flags.test.js: the service's existing test suite (CI runs it on every PR).
const UNI = { id: "u_1", attrs: { country: "DE", plan: "pro" } };
function mk() {
  const { createApp } = require("./app");
  const clock = mkClock();
  return { app: createApp({ now: clock.now }), clock };
}

test("createFlag validates its input and getFlag returns a copy", () => {
  const { app } = mk();
  throws(() => app.createFlag({ key: "Bad Key" }), TypeError);
  throws(() => app.createFlag({ key: "ok", enabled: "yes" }), TypeError);
  throws(() => app.createFlag({ key: "ok", rules: [{ attr: "country", values: [] }] }), TypeError);
  app.createFlag({ key: "new-checkout", allow: ["u_9"] });
  const f = app.getFlag("new-checkout");
  f.allow.push("u_x");
  eq(app.getFlag("new-checkout").allow, ["u_9"]);
  eq(app.getFlag("new-checkout").enabled, false);
  eq(app.getFlag("new-checkout").rollout, 100);
});

test("a flag key can only be created once and unknown flags throw FLAG_NOT_FOUND", () => {
  const { app } = mk();
  app.createFlag({ key: "a" });
  let code = null;
  try { app.createFlag({ key: "a" }); } catch (e) { code = e.code; }
  eq(code, "FLAG_EXISTS");
  try { app.setEnabled("nope", true); } catch (e) { code = e.code; }
  eq(code, "FLAG_NOT_FOUND");
});

test("flags start off, turn on with setEnabled, and an unknown flag evaluates to false", () => {
  const { app } = mk();
  app.createFlag({ key: "new-checkout" });
  eq(app.evaluate("new-checkout", UNI), false);
  app.setEnabled("new-checkout", true);
  eq(app.evaluate("new-checkout", UNI), true);
  app.setEnabled("new-checkout", false);
  eq(app.evaluate("new-checkout", UNI), false);
  eq(app.evaluate("does-not-exist", UNI), false);
});

test("every change bumps the flag's version by one, and an unchanged value does not", () => {
  const { app } = mk();
  app.createFlag({ key: "a" });
  eq(app.getFlag("a").version, 1);
  app.setEnabled("a", true);
  eq(app.getFlag("a").version, 2);
  app.setEnabled("a", true);
  eq(app.getFlag("a").version, 2);
  app.setAllow("a", ["u_1"]);
  eq(app.getFlag("a").version, 3);
});

test("attribute rules must all match, and the allow list bypasses them", () => {
  const { app } = mk();
  app.createFlag({ key: "eu-pro", enabled: true, rules: [{ attr: "country", values: ["DE", "FR"] }, { attr: "plan", values: ["pro"] }] });
  eq(app.evaluate("eu-pro", UNI), true);
  eq(app.evaluate("eu-pro", { id: "u_2", attrs: { country: "DE", plan: "free" } }), false);
  eq(app.evaluate("eu-pro", { id: "u_3", attrs: { country: "US", plan: "pro" } }), false);
  eq(app.evaluate("eu-pro", { id: "u_4" }), false);
  app.setAllow("eu-pro", ["u_4"]);
  eq(app.evaluate("eu-pro", { id: "u_4" }), true);
});

test("a user without an id is rejected", () => {
  const { app } = mk();
  app.createFlag({ key: "a", enabled: true });
  throws(() => app.evaluate("a", {}), TypeError);
  throws(() => app.evaluate("a", null), TypeError);
});

test("a second node applies the same changes in order", () => {
  const { createApp } = require("./app");
  const msgs = [];
  const admin = createApp({ publish: m => msgs.push(m) });
  const node = createApp();
  admin.createFlag({ key: "a", enabled: true });
  admin.setEnabled("a", false);
  admin.setEnabled("a", true);
  for (const m of msgs) node.applyUpdate(m);
  eq(node.evaluate("a", UNI), true);
  eq(Number(node.cachedVersion("a")), 3);
});

test("an older or repeated message does not replace a newer one", () => {
  const { createApp } = require("./app");
  const msgs = [];
  const admin = createApp({ publish: m => msgs.push(m) });
  const node = createApp();
  admin.createFlag({ key: "a", enabled: true });
  admin.setEnabled("a", false);
  node.applyUpdate(msgs[1]);
  eq(node.applyUpdate(msgs[0]), false, "older");
  eq(node.applyUpdate(msgs[1]), false, "repeat");
  eq(node.evaluate("a", UNI), false);
});
