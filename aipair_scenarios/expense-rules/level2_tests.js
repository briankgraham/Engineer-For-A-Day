// Hidden level 2 cases
const { createEngine } = require("./rules");
const ex = (id, tripId, expenseType, amountUsd, more = {}) => ({ id, tripId, employeeId: "ana", expenseType, vendorType: "vendor", vendorName: "Vendor", amountUsd, spentAt: "2026-03-02T12:00:00-05:00", ...more });
const list = vs => vs.map(v => [v.ruleId, v.tripId, v.expenseIds.join(",")].filter(x => x !== undefined).join(":"));

test("level 2: a total of exactly the limit is not over it, whatever the cents", () => {
  const engine = createEngine([{ id: "trip-cap", type: "trip_total", limit: "1500.00" }]);
  // 1001.19 + 88.40 + 410.41 is 1500.0000000000002 in floating point
  eq(list(engine.evaluate([ex("e1", "t1", "lodging", "1001.19"), ex("e2", "t1", "meals", "88.40"), ex("e3", "t1", "airfare", "410.41")])), []);
  eq(list(engine.evaluate([ex("e1", "t1", "lodging", "1001.19"), ex("e2", "t1", "meals", "88.40"), ex("e3", "t1", "airfare", "410.42")])), ["trip-cap:t1:e1,e2,e3"]);
});

test("level 2: the violation lists every expense of the trip, not just the one that went over", () => {
  const engine = createEngine([{ id: "trip-cap", type: "trip_total", limit: "500.00" }]);
  const out = engine.evaluate([ex("e1", "t1", "lodging", "300.00"), ex("e2", "t1", "meals", "250.00"), ex("e3", "t1", "meals", "20.00")]);
  eq(list(out), ["trip-cap:t1:e1,e2,e3"]);
});

test("level 2: expenses with no trip are left out of trip rules", () => {
  const engine = createEngine([{ id: "trip-cap", type: "trip_total", limit: "100.00" }]);
  const local = ex("e2", undefined, "supplies", "150.00");
  delete local.tripId;
  const out = engine.evaluate([ex("e1", "t1", "meals", "40.00"), local, ex("e3", undefined, "supplies", "150.00")]);
  eq(list(out), []);
});

test("level 2: an expense that breaks another rule still counts toward the trip", () => {
  const engine = createEngine([
    { id: "no-air", type: "deny", where: { expenseType: "airfare" } },
    { id: "meal-cap", type: "max_amount", where: { expenseType: "meals" }, limit: "75.00" },
    { id: "trip-cap", type: "trip_total", limit: "1000.00" },
  ]);
  const out = engine.evaluate([ex("e1", "t1", "airfare", "600.00"), ex("e2", "t1", "meals", "90.00"), ex("e3", "t1", "lodging", "400.00")]);
  eq(list(out), ["no-air:e1", "meal-cap:e2", "trip-cap:t1:e1,e2,e3"]);
});

test("level 2: trips come in the order of their first expense", () => {
  const engine = createEngine([{ id: "trip-cap", type: "trip_total", limit: "100.00" }]);
  const out = engine.evaluate([
    ex("e1", "zurich", "meals", "60.00"),
    ex("e2", "austin", "meals", "60.00"),
    ex("e3", "austin", "meals", "60.00"),
    ex("e4", "zurich", "meals", "60.00"),
    ex("e5", "boston", "meals", "60.00"),
  ]);
  eq(list(out), ["trip-cap:zurich:e1,e4", "trip-cap:austin:e2,e3"]);
});

test("level 2: a trip rule needs a valid limit", () => {
  throws(() => createEngine([{ id: "trip-cap", type: "trip_total" }]), RangeError, "missing limit");
  throws(() => createEngine([{ id: "trip-cap", type: "trip_total", limit: 2000 }]), RangeError, "number limit");
});
