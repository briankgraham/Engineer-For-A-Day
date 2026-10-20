// Read-only: these are the tests you can see. A few extra edge cases run when you finish.
// Level 1: rules on single expenses.
const { createEngine } = require("./rules");
const ex = (id, expenseType, amountUsd, more = {}) => ({ id, tripId: "t1", employeeId: "ana", expenseType, vendorType: "restaurant", vendorName: "Vendor", amountUsd, spentAt: "2026-03-02T12:00:00-05:00", ...more });
const list = vs => vs.map(v => v.ruleId + ":" + v.expenseIds.join(","));

test("level 1: deny rejects every expense it applies to", () => {
  const engine = createEngine([{ id: "no-air-ent", type: "deny", where: { expenseType: ["airfare", "entertainment"] } }]);
  const out = engine.evaluate([
    ex("e1", "airfare", "420.00", { vendorType: "airline" }),
    ex("e2", "meals", "30.00"),
    ex("e3", "entertainment", "80.00", { vendorType: "venue" }),
  ]);
  eq(list(out), ["no-air-ent:e1", "no-air-ent:e3"]);
});

test("level 1: max_amount allows exactly the limit and rejects anything over it", () => {
  const engine = createEngine([{ id: "meal-cap", type: "max_amount", where: { expenseType: "meals" }, limit: "75.00" }]);
  const out = engine.evaluate([
    ex("e1", "meals", "75.00"),
    ex("e2", "meals", "75.01"),
    ex("e3", "meals", "100.00"),
    ex("e4", "lodging", "180.00", { vendorType: "hotel" }),
  ]);
  eq(list(out), ["meal-cap:e2", "meal-cap:e3"]);
});

test("level 1: a rule applies only when every field in where matches", () => {
  const engine = createEngine([{ id: "restaurant-meals", type: "max_amount", where: { expenseType: "meals", vendorType: "restaurant" }, limit: "75" }]);
  const out = engine.evaluate([
    ex("e1", "meals", "90.00"),
    ex("e2", "meals", "300.00", { vendorType: "catering" }),
    ex("e3", "supplies", "90.00"),
  ]);
  eq(list(out), ["restaurant-meals:e1"]);
});

test("level 1: a rule with no where applies to every expense", () => {
  const engine = createEngine([{ id: "big-spend", type: "max_amount", limit: "5000.00" }]);
  const out = engine.evaluate([ex("e1", "meals", "40.00"), ex("e2", "lodging", "6200.00", { vendorType: "hotel" })]);
  eq(list(out), ["big-spend:e2"]);
});

test("level 1: violations come in rule order, then expense order", () => {
  const engine = createEngine([
    { id: "meal-cap", type: "max_amount", where: { expenseType: "meals" }, limit: "75.00" },
    { id: "no-air", type: "deny", where: { expenseType: "airfare" } },
  ]);
  const out = engine.evaluate([ex("e1", "airfare", "300.00"), ex("e2", "meals", "80.00"), ex("e3", "meals", "99.00")]);
  eq(list(out), ["meal-cap:e2", "meal-cap:e3", "no-air:e1"]);
  eq(out[0].expenseIds, ["e2"]);
});

test("level 1: a policy with an unknown type or a duplicate id is rejected", () => {
  throws(() => createEngine([{ id: "x", type: "max_per_month", limit: "100" }]), RangeError, "unknown type");
  throws(() => createEngine([{ id: "x", type: "deny" }, { id: "x", type: "deny" }]), RangeError, "duplicate id");
});
