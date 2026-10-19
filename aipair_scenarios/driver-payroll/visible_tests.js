// Runs with: test, assert, eq, throws, require
const make = () => require("./payroll").createPayroll();
const HOUR = 3600;

// These are the tests you can see. More edge cases run when you finish.

test("rejects bad drivers", () => {
  const p = make();
  throws(() => p.addDriver("", 2000), RangeError, "empty id");
  throws(() => p.addDriver("ana", 0), RangeError, "rate 0");
  throws(() => p.addDriver("ana", 12.5), RangeError, "rate 12.5");
  p.addDriver("ana", 2000);
  throws(() => p.addDriver("ana", 3000), RangeError, "ana twice");
});

test("rejects bad deliveries", () => {
  const p = make();
  p.addDriver("ana", 2000);
  throws(() => p.recordDelivery("bo", 0, 60), RangeError, "unknown driver");
  throws(() => p.recordDelivery("ana", 60, 60), RangeError, "ends when it starts");
  throws(() => p.recordDelivery("ana", 60, 30), RangeError, "ends before it starts");
  throws(() => p.recordDelivery("ana", -10, 30), RangeError, "negative time");
});

test("a delivery costs the hourly rate times its length", () => {
  const p = make();
  p.addDriver("ana", 2000); // $20.00 an hour
  p.recordDelivery("ana", 0, 1.5 * HOUR);
  eq(p.getTotalCost(), 3000);
  eq(p.getTotalCostUnpaid(), 3000);
});

test("each delivery is rounded to the cent on its own", () => {
  const p = make();
  p.addDriver("ana", 100); // $1.00 an hour: a minute is 1.67 cents
  p.recordDelivery("ana", 0, 60);
  p.recordDelivery("ana", 100, 160);
  p.recordDelivery("ana", 200, 260);
  eq(p.getTotalCost(), 6, "2 + 2 + 2, not round(5.0)");
});

test("totals add up across drivers", () => {
  const p = make();
  p.addDriver("ana", 2000);
  p.addDriver("bo", 3000);
  p.recordDelivery("ana", 0, HOUR);
  p.recordDelivery("bo", 0, HOUR / 2);
  p.recordDelivery("bo", HOUR, 2 * HOUR);
  eq(p.getTotalCost(), 2000 + 1500 + 3000);
});

test("a pay run pays the deliveries that have ended", () => {
  const p = make();
  p.addDriver("ana", HOUR); // a cent a second
  p.recordDelivery("ana", 0, 100);
  p.recordDelivery("ana", 200, 300);
  p.recordDelivery("ana", 250, 600); // still running at 400
  eq(p.payUpTo(400), 200);
  eq(p.getTotalCostUnpaid(), 350);
  eq(p.getTotalCost(), 550);
});

test("a pay run never pays a delivery twice", () => {
  const p = make();
  p.addDriver("ana", HOUR);
  p.recordDelivery("ana", 0, 100);
  eq(p.payUpTo(100), 100);
  eq(p.payUpTo(100), 0, "same time again");
  eq(p.payUpTo(500), 0, "later, nothing new");
  eq(p.getTotalCostUnpaid(), 0);
});
