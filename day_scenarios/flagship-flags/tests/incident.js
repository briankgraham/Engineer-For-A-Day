// Hidden: INC-0733 (the new-checkout kill switch did not reach some nodes). Runs when the day ends.
// admin is the control plane; node is an evaluation node that gets its messages, as strings, like production.
function pair() {
  const { createApp } = require("./app");
  const msgs = [];
  const admin = createApp({ publish: m => msgs.push(m) });
  const node = createApp();
  const deliver = () => { while (msgs.length) node.applyUpdate(msgs.shift()); };
  return { admin, node, msgs, deliver };
}
const U = { id: "u_1", attrs: {} };
// Moves the flag to version n (a flag toggled n-1 times after it was created), ending enabled.
function toVersion(admin, key, n) {
  admin.createFlag({ key, enabled: true });
  for (let v = 2; v <= n; v++) admin.setEnabled(key, v % 2 === 1);
}

test("the kill switch reaches a node when a flag goes from version 9 to 10", () => {
  const { admin, node, deliver } = pair();
  toVersion(admin, "new-checkout", 9);
  deliver();
  eq(node.evaluate("new-checkout", U), true);
  admin.setEnabled("new-checkout", false);
  deliver();
  eq(node.cachedVersion("new-checkout"), 10);
  eq(node.evaluate("new-checkout", U), false, "flag was switched off");
});

test("and from 99 to 100, and from 2 to 10", () => {
  const { admin, node, deliver } = pair();
  toVersion(admin, "a", 99);
  deliver();
  admin.setEnabled("a", false);
  deliver();
  eq(node.cachedVersion("a"), 100);
  eq(node.evaluate("a", U), false);
  toVersion(admin, "b", 2);
  deliver();
  for (let i = 0; i < 8; i++) admin.setEnabled("b", !admin.getFlag("b").enabled);
  deliver();
  eq(node.cachedVersion("b"), 10);
});

test("a node that loaded its snapshot with string versions still applies the next update", () => {
  const { node } = pair();
  const row = { key: "new-checkout", version: "9", enabled: true, allow: [], rules: [], rollout: 100 };
  node.loadSnapshot([row]);
  eq(node.evaluate("new-checkout", U), true);
  eq(node.applyUpdate({ ...row, version: "10", enabled: false }), true);
  eq(node.evaluate("new-checkout", U), false);
});

test("an older message that arrives late does not undo a newer one, whatever the digits", () => {
  const { node } = pair();
  const row = { key: "a", enabled: true, allow: [], rules: [], rollout: 100 };
  eq(node.applyUpdate({ ...row, version: "10", enabled: false }), true);
  eq(node.applyUpdate({ ...row, version: "9", enabled: true }), false, "9 is older than 10");
  eq(node.evaluate("a", U), false);
  eq(node.applyUpdate({ ...row, version: "100", enabled: true }), true);
  eq(node.applyUpdate({ ...row, version: "11", enabled: false }), false, "11 is older than 100");
  eq(node.cachedVersion("a"), 100);
  eq(node.evaluate("a", U), true);
});

test("a repeated message is ignored and the same version does not replace the flag", () => {
  const { node } = pair();
  const row = { key: "a", version: "7", enabled: true, allow: [], rules: [], rollout: 100 };
  eq(node.applyUpdate(row), true);
  eq(node.applyUpdate({ ...row, enabled: false }), false);
  eq(node.evaluate("a", U), true);
});

test("each flag has its own version", () => {
  const { node } = pair();
  const f = (key, version, enabled) => ({ key, version, enabled, allow: [], rules: [], rollout: 100 });
  node.applyUpdate(f("a", "10", true));
  eq(node.applyUpdate(f("b", "2", true)), true, "b has no version yet");
  eq(node.applyUpdate(f("b", "3", false)), true);
  eq(node.evaluate("a", U), true);
  eq(node.evaluate("b", U), false);
});

test("a bad version is rejected and leaves the cached flag as it was", () => {
  const { node } = pair();
  const row = { key: "a", version: "9", enabled: true, allow: [], rules: [], rollout: 100 };
  node.applyUpdate(row);
  for (const bad of ["abc", "", "0", "1.5", "-3", null, undefined]) {
    throws(() => node.applyUpdate({ ...row, version: bad, enabled: false }), TypeError, "version " + String(bad));
  }
  eq(node.cachedVersion("a"), 9);
  eq(node.evaluate("a", U), true);
});

test("a bad row in a snapshot leaves the cache as it was", () => {
  const { node } = pair();
  const row = { key: "a", version: "3", enabled: true, allow: [], rules: [], rollout: 100 };
  node.loadSnapshot([row]);
  throws(() => node.loadSnapshot([{ ...row, key: "b", version: "1" }, { ...row, key: "c", version: "oops" }]), TypeError);
  eq(node.evaluate("a", U), true, "the old cache is still there");
});
