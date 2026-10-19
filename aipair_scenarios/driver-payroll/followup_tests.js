// Follow-up hidden edge cases: run on Finish once the follow-up has been revealed.
const make = () => require("./payroll").createPayroll();
const HOUR = 3600;

test("follow-up: a late delivery from before a change keeps the old rate", () => {
  const p = make();
  p.addDriver("ana", HOUR);
  p.setRate("ana", 5 * HOUR, 1000);
  p.recordDelivery("ana", 1000, 1100);
  p.recordDelivery("ana", 100, 200); // recorded after the change, but happened before it
  eq(p.getTotalCost(), 500 + 100);
});

test("follow-up: rates can be set in any order, and the same time replaces", () => {
  const p = make();
  p.addDriver("ana", HOUR);
  p.setRate("ana", 4 * HOUR, 3000);
  p.setRate("ana", 2 * HOUR, 1000);
  p.setRate("ana", 3 * HOUR, 1000); // replaces the change at 1000
  p.recordDelivery("ana", 0, 10);
  p.recordDelivery("ana", 1000, 1010);
  p.recordDelivery("ana", 2999, 3009);
  p.recordDelivery("ana", 3000, 3010);
  eq(p.getTotalCost(), 10 + 30 + 30 + 40);
});

test("follow-up: what was paid never changes", () => {
  const p = make();
  p.addDriver("ana", HOUR);
  p.recordDelivery("ana", 0, 100);
  p.recordDelivery("ana", 400, 700);
  eq(p.payUpTo(500), 100);
  p.setRate("ana", 2 * HOUR, 500); // allowed: the same time as the last run
  p.recordDelivery("ana", 500, 600);
  eq(p.getTotalCost(), 100 + 300 + 200, "the running delivery started before the change");
  eq(p.payUpTo(1000), 500);
  eq(p.getTotalCost(), 600);
});

test("follow-up: each driver has their own rates", () => {
  const p = make();
  p.addDriver("ana", HOUR);
  p.addDriver("bo", HOUR);
  p.setRate("bo", 2 * HOUR, 0);
  p.recordDelivery("ana", 0, 100);
  p.recordDelivery("bo", 0, 100);
  eq(p.getTotalCost(), 300);
});

test("follow-up: rejects bad rate changes", () => {
  const p = make();
  p.addDriver("ana", HOUR);
  throws(() => p.setRate("bo", HOUR, 0), RangeError, "unknown driver");
  throws(() => p.setRate("ana", 0, 10), RangeError, "rate 0");
  throws(() => p.setRate("ana", 1.5, 10), RangeError, "fractional rate");
  throws(() => p.setRate("ana", HOUR, -1), RangeError, "negative time");
  p.recordDelivery("ana", 0, 100);
  eq(p.getTotalCost(), 100, "rejected changes change nothing");
});
