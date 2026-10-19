// Follow-up: rate changes. Runs with: test, assert, eq, throws, require
const make = () => require("./payroll").createPayroll();
const HOUR = 3600;

test("follow-up: a new rate applies to deliveries that start at or after it", () => {
  const p = make();
  p.addDriver("ana", HOUR); // a cent a second
  p.setRate("ana", 2 * HOUR, 1000);
  p.recordDelivery("ana", 0, 600);
  p.recordDelivery("ana", 1000, 1600);
  eq(p.getTotalCost(), 600 + 1200);
});

test("follow-up: a delivery is paid at the rate when it started", () => {
  const p = make();
  p.addDriver("ana", HOUR);
  p.setRate("ana", 2 * HOUR, 1000);
  p.recordDelivery("ana", 900, 1500); // the raise happens mid-delivery
  eq(p.getTotalCost(), 600);
});

test("follow-up: a delivery recorded before the change but starting after it gets the new rate", () => {
  const p = make();
  p.addDriver("ana", HOUR);
  p.recordDelivery("ana", 2000, 2100);
  p.setRate("ana", 3 * HOUR, 2000);
  eq(p.getTotalCostUnpaid(), 300);
});

test("follow-up: a paid period is closed", () => {
  const p = make();
  p.addDriver("ana", HOUR);
  p.recordDelivery("ana", 0, 100);
  p.payUpTo(500);
  throws(() => p.setRate("ana", 2 * HOUR, 400), RangeError, "before the last pay run");
  eq(p.getTotalCost(), 100);
});
