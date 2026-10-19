// Runs with: test, assert, eq, throws, require
const make = () => require("./payroll").createPayroll();
const HOUR = 3600;

// Hidden edge cases: run together with the visible tests when the candidate finishes.

test("rejects more bad input", () => {
  const p = make();
  throws(() => p.addDriver(7, 2000), RangeError, "numeric id");
  throws(() => p.addDriver("ana", "2000"), RangeError, "rate as a string");
  throws(() => p.addDriver("ana", -5), RangeError, "negative rate");
  p.addDriver("ana", 2000);
  throws(() => p.recordDelivery("ana", 0.5, 60), RangeError, "fractional start");
  throws(() => p.recordDelivery("ana", 0, "60"), RangeError, "end as a string");
  throws(() => p.payUpTo(-1), RangeError, "negative pay time");
  throws(() => p.payUpTo(1.5), RangeError, "fractional pay time");
  eq(p.getTotalCost(), 0, "nothing recorded by the rejected calls");
});

test("a delivery ending exactly at the pay time is paid", () => {
  const p = make();
  p.addDriver("ana", HOUR);
  p.recordDelivery("ana", 0, 100);
  eq(p.payUpTo(100), 100);
});

test("a delivery that started but has not ended is not paid, not even partly", () => {
  const p = make();
  p.addDriver("ana", HOUR);
  p.recordDelivery("ana", 50, 150);
  eq(p.payUpTo(100), 0);
  eq(p.getTotalCostUnpaid(), 100);
  eq(p.payUpTo(150), 100, "paid in full by the next run");
});

test("half a cent rounds up", () => {
  const p = make();
  p.addDriver("ana", 1);
  p.recordDelivery("ana", 0, 1800);
  eq(p.getTotalCost(), 1);
});

test("a pay run does not change the total cost", () => {
  const p = make();
  p.addDriver("ana", 2000);
  p.addDriver("bo", 100);
  p.recordDelivery("ana", 0, HOUR);
  p.recordDelivery("bo", 0, 60);
  p.recordDelivery("bo", 7000, 7060);
  eq(p.getTotalCost(), 2004);
  eq(p.payUpTo(HOUR), 2002);
  eq(p.getTotalCost(), 2004);
  eq(p.getTotalCostUnpaid(), 2);
});

test("a late delivery is paid by the next pay run", () => {
  const p = make();
  p.addDriver("ana", HOUR);
  p.recordDelivery("ana", 0, 100);
  eq(p.payUpTo(1000), 100);
  p.recordDelivery("ana", 200, 500); // ended before the last run, recorded after it
  eq(p.getTotalCostUnpaid(), 300);
  eq(p.getTotalCost(), 400);
  eq(p.payUpTo(1000), 300, "same pay time again pays it");
  eq(p.getTotalCostUnpaid(), 0);
});

test("pay runs go forward", () => {
  const p = make();
  p.addDriver("ana", HOUR);
  p.recordDelivery("ana", 0, 100);
  p.payUpTo(500);
  throws(() => p.payUpTo(499), RangeError, "earlier than the last run");
  eq(p.payUpTo(500), 0);
});

test("overlapping and identical deliveries are each paid", () => {
  const p = make();
  p.addDriver("ana", HOUR);
  p.recordDelivery("ana", 0, 100);
  p.recordDelivery("ana", 0, 100);
  p.recordDelivery("ana", 50, 120);
  eq(p.getTotalCost(), 270);
  eq(p.payUpTo(200), 270);
});

test("a pay run with nothing recorded pays 0", () => {
  const p = make();
  eq(p.payUpTo(0), 0);
  eq(p.getTotalCost(), 0);
  eq(p.getTotalCostUnpaid(), 0);
});
