// Hidden level 3 cases
const { createEngine } = require("./rules");
const ex = (id, employeeId, spentAt, amountUsd, more = {}) => ({ id, tripId: "t1", employeeId, expenseType: "meals", vendorType: "restaurant", vendorName: "Vendor", amountUsd, spentAt, ...more });
const list = vs => vs.map(v => [v.ruleId, v.employeeId, v.date, v.expenseIds.join(",")].filter(x => x !== undefined).join(":"));
const meals = [{ id: "daily-meals", type: "daily_total", where: { expenseType: "meals" }, limit: "100.00" }];

test("level 3: east of UTC, an early breakfast stays on its local day", () => {
  // 07:00 in Tokyo on March 3 is still March 2 in UTC
  const out = createEngine(meals).evaluate([
    ex("e1", "ana", "2026-03-02T20:00:00+09:00", "70.00"),
    ex("e2", "ana", "2026-03-03T07:00:00+09:00", "60.00"),
    ex("e3", "ana", "2026-03-03T12:00:00+09:00", "50.00"),
  ]);
  eq(list(out), ["daily-meals:ana:2026-03-03:e2,e3"]);
});

test("level 3: a day counts the employee's expenses from every trip, or none", () => {
  const noTrip = ex("e3", "ana", "2026-03-02T09:00:00-05:00", "30.00");
  delete noTrip.tripId;
  const out = createEngine(meals).evaluate([
    ex("e1", "ana", "2026-03-02T12:00:00-05:00", "40.00", { tripId: "t1" }),
    ex("e2", "ana", "2026-03-02T19:00:00-05:00", "40.00", { tripId: "t2" }),
    noTrip,
  ]);
  eq(list(out), ["daily-meals:ana:2026-03-02:e1,e2,e3"]);
});

test("level 3: exactly the daily limit is allowed", () => {
  const out = createEngine(meals).evaluate([
    ex("e1", "ana", "2026-03-02T12:00:00-05:00", "33.33"),
    ex("e2", "ana", "2026-03-02T13:00:00-05:00", "33.33"),
    ex("e3", "ana", "2026-03-02T19:00:00-05:00", "33.34"),
  ]);
  eq(list(out), []);
});

test("level 3: days come in the order of their first expense", () => {
  const out = createEngine(meals).evaluate([
    ex("e1", "bo", "2026-03-03T12:00:00-05:00", "80.00"),
    ex("e2", "ana", "2026-03-02T12:00:00-05:00", "80.00"),
    ex("e3", "ana", "2026-03-02T19:00:00-05:00", "80.00"),
    ex("e4", "bo", "2026-03-03T19:00:00-05:00", "80.00"),
  ]);
  eq(list(out), ["daily-meals:bo:2026-03-03:e1,e4", "daily-meals:ana:2026-03-02:e2,e3"]);
});

test("level 3: all three kinds of rule in one policy", () => {
  const engine = createEngine([
    { id: "meal-cap", type: "max_amount", where: { expenseType: "meals" }, limit: "75.00" },
    { id: "trip-cap", type: "trip_total", limit: "200.00" },
    ...meals,
  ]);
  const out = engine.evaluate([
    ex("e1", "ana", "2026-03-02T12:00:00-05:00", "80.00"),
    ex("e2", "ana", "2026-03-02T19:00:00-05:00", "50.00"),
    ex("e3", "bo", "2026-03-02T19:00:00-05:00", "90.00"),
  ]);
  eq(list(out), ["meal-cap:e1", "meal-cap:e3", "trip-cap:e1,e2,e3", "daily-meals:ana:2026-03-02:e1,e2"]);
  eq(out[2].tripId, "t1");
});

test("level 3: a daily rule needs a valid limit", () => {
  throws(() => createEngine([{ id: "d", type: "daily_total", where: { expenseType: "meals" } }]), RangeError, "missing limit");
  throws(() => createEngine([{ id: "d", type: "daily_total", limit: "100.005" }]), RangeError, "three decimals");
});
