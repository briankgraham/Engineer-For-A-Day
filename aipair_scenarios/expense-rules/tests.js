// Hidden level 1 cases (run when the candidate finishes)
const { createEngine } = require("./rules");
const ex = (id, expenseType, amountUsd, more = {}) => ({ id, tripId: "t1", employeeId: "ana", expenseType, vendorType: "restaurant", vendorName: "Vendor", amountUsd, spentAt: "2026-03-02T12:00:00-05:00", ...more });
const list = vs => vs.map(v => v.ruleId + ":" + v.expenseIds.join(","));

test("level 1: a typo in a rule type fails loudly instead of enforcing nothing", () => {
  throws(() => createEngine([{ id: "meal-cap", type: "max_amount", limit: "75" }, { id: "no-air", type: "Deny", where: { expenseType: "airfare" } }]), RangeError, "type Deny");
  throws(() => createEngine([{ id: "no-air", where: { expenseType: "airfare" } }]), RangeError, "no type");
});

test("level 1: malformed rules are rejected", () => {
  throws(() => createEngine({ id: "x", type: "deny" }), RangeError, "not an array");
  throws(() => createEngine([{ type: "deny" }]), RangeError, "missing id");
  throws(() => createEngine([{ id: "", type: "deny" }]), RangeError, "empty id");
  throws(() => createEngine([null]), RangeError, "null rule");
  for (const limit of [undefined, 75, "75.001", "-5", "$75", "", "seventy"]) throws(() => createEngine([{ id: "cap", type: "max_amount", limit }]), RangeError, "limit " + limit);
  for (const where of ["meals", ["meals"], null, { expenseType: 5 }, { expenseType: [] }, { expenseType: ["meals", 3] }]) throws(() => createEngine([{ id: "w", type: "deny", where }]), RangeError, "where " + JSON.stringify(where));
});

test("level 1: deny needs no limit, and an empty where applies to everything", () => {
  const engine = createEngine([{ id: "freeze", type: "deny", where: {} }]);
  eq(list(engine.evaluate([ex("e1", "meals", "1.00"), ex("e2", "supplies", "2.00")])), ["freeze:e1", "freeze:e2"]);
});

test("level 1: a where field the expense does not have never matches", () => {
  const engine = createEngine([{ id: "deny-bar", type: "deny", where: { vendorType: "bar" } }]);
  const noVendor = ex("e1", "meals", "20.00");
  delete noVendor.vendorType;
  eq(list(engine.evaluate([noVendor, ex("e2", "meals", "20.00", { vendorType: "bar" })])), ["deny-bar:e2"]);
});

test("level 1: an array and a string in one where", () => {
  const engine = createEngine([{ id: "w", type: "max_amount", where: { expenseType: ["meals", "entertainment"], vendorType: "restaurant" }, limit: "50" }]);
  const out = engine.evaluate([
    ex("e1", "meals", "60.00"),
    ex("e2", "entertainment", "60.00"),
    ex("e3", "entertainment", "60.00", { vendorType: "venue" }),
    ex("e4", "lodging", "60.00"),
  ]);
  eq(list(out), ["w:e1", "w:e2"]);
});

test("level 1: amounts are compared as money, not as text", () => {
  const engine = createEngine([{ id: "cap", type: "max_amount", limit: "9.50" }]);
  eq(list(engine.evaluate([ex("e1", "meals", "10.00"), ex("e2", "meals", "9.5"), ex("e3", "meals", "100")])), ["cap:e1", "cap:e3"]);
});

test("level 1: evaluate can run again and changes nothing it was given", () => {
  const rules = [{ id: "meal-cap", type: "max_amount", where: { expenseType: "meals" }, limit: "75.00" }];
  const engine = createEngine(rules);
  const batch = [ex("e1", "meals", "80.00")];
  const before = JSON.stringify([rules, batch]);
  eq(list(engine.evaluate(batch)), ["meal-cap:e1"]);
  eq(list(engine.evaluate([ex("e9", "meals", "10.00")])), []);
  eq(list(engine.evaluate(batch)), ["meal-cap:e1"]);
  eq(engine.evaluate([]), []);
  eq(JSON.stringify([rules, batch]), before);
});
