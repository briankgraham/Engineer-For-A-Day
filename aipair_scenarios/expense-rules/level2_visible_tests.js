// Level 2: trip totals.
const { createEngine } = require("./rules");
const ex = (id, tripId, expenseType, amountUsd, more = {}) => ({ id, tripId, employeeId: "ana", expenseType, vendorType: "vendor", vendorName: "Vendor", amountUsd, spentAt: "2026-03-02T12:00:00-05:00", ...more });
const list = vs => vs.map(v => [v.ruleId, v.tripId, v.expenseIds.join(",")].filter(x => x !== undefined).join(":"));

test("level 2: a trip over its total is one violation listing all its expenses", () => {
  const engine = createEngine([{ id: "trip-cap", type: "trip_total", limit: "2000.00" }]);
  const out = engine.evaluate([
    ex("e1", "nyc", "airfare", "640.00"),
    ex("e2", "nyc", "lodging", "1200.00"),
    ex("e3", "sf", "lodging", "900.00"),
    ex("e4", "nyc", "meals", "180.00"),
  ]);
  eq(list(out), ["trip-cap:nyc:e1,e2,e4"]);
  eq(out[0].tripId, "nyc");
});

test("level 2: exactly the trip limit is allowed", () => {
  const engine = createEngine([{ id: "trip-cap", type: "trip_total", limit: "1000" }]);
  eq(list(engine.evaluate([ex("e1", "t1", "lodging", "600.00"), ex("e2", "t1", "meals", "400.00")])), []);
});

test("level 2: where narrows which expenses of a trip are added up", () => {
  const engine = createEngine([{ id: "trip-meals", type: "trip_total", where: { expenseType: "meals" }, limit: "150.00" }]);
  const out = engine.evaluate([
    ex("e1", "t1", "meals", "70.00"),
    ex("e2", "t1", "lodging", "500.00"),
    ex("e3", "t1", "meals", "90.00"),
  ]);
  eq(list(out), ["trip-meals:t1:e1,e3"]);
});

test("level 2: trip rules and expense rules together, in rule order", () => {
  const engine = createEngine([
    { id: "trip-cap", type: "trip_total", limit: "1000.00" },
    { id: "meal-cap", type: "max_amount", where: { expenseType: "meals" }, limit: "75.00" },
  ]);
  const out = engine.evaluate([ex("e1", "t1", "lodging", "950.00"), ex("e2", "t1", "meals", "80.00")]);
  eq(list(out), ["trip-cap:t1:e1,e2", "meal-cap:e2"]);
});
