// Read-only: these are the tests you can see. A few extra edge cases run when you finish.
// Times are minutes since Monday 00:00 of week 0.
const { DAY, WEEK } = require("./time");
const H = 60;
const make = (rate = 2000) => {
  const r = new (require("./register").HoursRegister)();
  r.addWorker("ana", rate);
  return r;
};
const shift = (r, id, start, end) => { r.clockIn(id, start); r.clockOut(id, end); };

// ---- existing behavior (passes today, keep it passing) ----
test("addWorker rejects bad and duplicate workers", () => {
  const r = make();
  throws(() => r.addWorker("ana", 2000), RangeError, "duplicate id");
  throws(() => r.addWorker("", 2000), RangeError, "empty id");
  for (const rate of [0, -100, 12.5, "2000"]) throws(() => r.addWorker("bo", rate), RangeError, "rate " + rate);
});

test("clock in and out, with the usual mistakes rejected", () => {
  const r = make();
  throws(() => r.clockIn("zed", 0), RangeError, "unknown worker");
  throws(() => r.clockOut("ana", 60), Error, "not clocked in");
  r.clockIn("ana", 9 * H);
  throws(() => r.clockIn("ana", 10 * H), Error, "already clocked in");
  throws(() => r.clockOut("ana", 9 * H), RangeError, "clock-out must be after clock-in");
  r.clockOut("ana", 17 * H);
  throws(() => r.clockIn("ana", 16 * H), RangeError, "overlaps the shift just recorded");
});

test("onShift lists who is clocked in, sorted", () => {
  const r = make();
  r.addWorker("cy", 2000);
  r.addWorker("bo", 2000);
  r.clockIn("cy", 8 * H);
  r.clockIn("ana", 9 * H);
  r.clockIn("bo", 9 * H);
  r.clockOut("bo", 12 * H);
  eq(r.onShift(), ["ana", "cy"]);
});

// ---- new behavior (fails today) ----
test("minutesWorked totals the shifts in a range", () => {
  const r = make();
  shift(r, "ana", 9 * H, 12 * H);
  shift(r, "ana", 13 * H, 17 * H + 30);
  shift(r, "ana", DAY + 9 * H, DAY + 17 * H);
  eq(r.minutesWorked("ana", 0, DAY), 7 * H + 30, "Monday");
  eq(r.minutesWorked("ana", DAY, 2 * DAY), 8 * H, "Tuesday");
  eq(r.minutesWorked("ana", 0, WEEK), 15 * H + 30, "the week");
});

test("a night shift is split at midnight", () => {
  const r = make();
  shift(r, "ana", 22 * H, DAY + 6 * H); // Monday 22:00 to Tuesday 06:00
  eq(r.minutesWorked("ana", 0, DAY), 2 * H, "Monday");
  eq(r.minutesWorked("ana", DAY, 2 * DAY), 6 * H, "Tuesday");
});

test("addShift records a forgotten shift and rejects one that overlaps", () => {
  const r = make();
  shift(r, "ana", DAY + 9 * H, DAY + 17 * H); // Tuesday
  r.addShift("ana", 9 * H, 17 * H); // Monday, entered afterwards
  eq(r.minutesWorked("ana", 0, DAY), 8 * H);
  throws(() => r.addShift("ana", DAY + 16 * H, DAY + 18 * H), RangeError, "overlaps Tuesday");
  throws(() => r.addShift("ana", 2 * DAY + 9 * H, 2 * DAY + 9 * H), RangeError, "empty shift");
  eq(r.minutesWorked("ana", 0, WEEK), 16 * H, "the rejected shifts were not recorded");
});

test("weeklyPay pays the week's hours at the hourly rate", () => {
  const r = make(2000);
  for (let d = 0; d < 4; d++) shift(r, "ana", d * DAY + 9 * H, d * DAY + 17 * H);
  eq(r.weeklyPay("ana", 0), 32 * 2000);
  eq(r.weeklyPay("ana", 1), 0, "nothing worked in week 1");
});

test("hours past 40 in a week are paid at 1.5x", () => {
  const r = make(2000);
  for (let d = 0; d < 5; d++) shift(r, "ana", d * DAY + 8 * H, d * DAY + 17 * H); // five 9-hour days
  eq(r.weeklyPay("ana", 0), 40 * 2000 + 5 * 3000);
});

test("pay is rounded once for the week, not per shift", () => {
  const r = make(1999);
  for (let d = 0; d < 3; d++) shift(r, "ana", d * DAY + 9 * H, d * DAY + 9 * H + 20);
  eq(r.weeklyPay("ana", 0), 1999, "an hour in total at 1999 cents an hour");
});
