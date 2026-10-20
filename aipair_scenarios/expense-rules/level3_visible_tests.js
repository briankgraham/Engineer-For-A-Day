// Level 3: daily limits per employee.
const { createEngine } = require("./rules");
const ex = (id, employeeId, spentAt, amountUsd, more = {}) => ({ id, tripId: "t1", employeeId, expenseType: "meals", vendorType: "restaurant", vendorName: "Vendor", amountUsd, spentAt, ...more });
const list = vs => vs.map(v => [v.ruleId, v.employeeId, v.date, v.expenseIds.join(",")].filter(x => x !== undefined).join(":"));
const meals = [{ id: "daily-meals", type: "daily_total", where: { expenseType: "meals" }, limit: "100.00" }];

test("level 3: an employee's meals are added up per day", () => {
  const out = createEngine(meals).evaluate([
    ex("e1", "ana", "2026-03-02T08:00:00-05:00", "20.00"),
    ex("e2", "ana", "2026-03-02T12:30:00-05:00", "45.00"),
    ex("e3", "ana", "2026-03-02T19:00:00-05:00", "60.00"),
    ex("e4", "ana", "2026-03-03T19:00:00-05:00", "90.00"),
    ex("e5", "ana", "2026-03-02T15:00:00-05:00", "500.00", { expenseType: "lodging" }),
  ]);
  eq(list(out), ["daily-meals:ana:2026-03-02:e1,e2,e3"]);
  eq(out[0].date, "2026-03-02");
});

test("level 3: the day is the local date written in spentAt, not the UTC date", () => {
  // 21:30 in New York on March 2 is already March 3 in UTC
  const out = createEngine(meals).evaluate([
    ex("e1", "ana", "2026-03-02T21:30:00-05:00", "70.00"),
    ex("e2", "ana", "2026-03-03T08:00:00-05:00", "60.00"),
  ]);
  eq(list(out), []);
});

test("level 3: each employee has their own daily allowance", () => {
  const out = createEngine(meals).evaluate([
    ex("e1", "ana", "2026-03-02T19:00:00-05:00", "70.00"),
    ex("e2", "bo", "2026-03-02T19:00:00-05:00", "70.00"),
    ex("e3", "bo", "2026-03-02T22:00:00-05:00", "40.00"),
  ]);
  eq(list(out), ["daily-meals:bo:2026-03-02:e2,e3"]);
});
