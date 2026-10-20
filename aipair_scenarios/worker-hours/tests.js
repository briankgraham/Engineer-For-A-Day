// Hidden edge cases (run when the candidate finishes, on top of visible_tests.js)
const { DAY, WEEK } = require("./time");
const H = 60;
const make = (rate = 2000) => {
  const r = new (require("./register").HoursRegister)();
  r.addWorker("ana", rate);
  return r;
};
const shift = (r, id, start, end) => { r.clockIn(id, start); r.clockOut(id, end); };

test("the open shift counts for nothing until clock-out", () => {
  const r = make(2000);
  shift(r, "ana", 9 * H, 17 * H);
  r.clockIn("ana", DAY + 9 * H);
  eq(r.minutesWorked("ana", 0, WEEK), 8 * H);
  eq(r.minutesWorked("ana", DAY, 2 * DAY), 0);
  eq(r.weeklyPay("ana", 0), 8 * 2000);
  r.clockOut("ana", DAY + 12 * H);
  eq(r.minutesWorked("ana", 0, WEEK), 11 * H);
});

test("minutesWorked clips shifts to any range", () => {
  const r = make();
  shift(r, "ana", 9 * H, 17 * H);
  eq(r.minutesWorked("ana", 10 * H, 11 * H + 15), 75, "inside one shift");
  eq(r.minutesWorked("ana", 17 * H, DAY), 0, "the end minute is not part of the shift");
  eq(r.minutesWorked("ana", 5 * H, 5 * H), 0, "an empty range");
  throws(() => r.minutesWorked("ana", DAY, 0), RangeError, "to before from");
  throws(() => r.minutesWorked("zed", 0, DAY), RangeError, "unknown worker");
});

test("a Sunday night shift is split between the two weeks", () => {
  const r = make(2000);
  for (let d = 0; d < 5; d++) shift(r, "ana", d * DAY + 9 * H, d * DAY + 17 * H); // 40 hours
  shift(r, "ana", WEEK - 2 * H, WEEK + 6 * H); // Sunday 22:00 to Monday 06:00
  eq(r.minutesWorked("ana", 0, WEEK), 42 * H);
  eq(r.weeklyPay("ana", 0), 40 * 2000 + 2 * 3000, "2 hours of overtime in week 0");
  eq(r.weeklyPay("ana", 1), 6 * 2000, "6 regular hours in week 1");
});

test("overtime is weekly, not daily", () => {
  const four = make(2000);
  for (let d = 0; d < 4; d++) shift(four, "ana", d * DAY + 7 * H, d * DAY + 17 * H); // four 10-hour days
  eq(four.weeklyPay("ana", 0), 40 * 2000, "40 hours: no overtime");
  const six = make(2000);
  for (let d = 0; d < 6; d++) shift(six, "ana", d * DAY + 9 * H, d * DAY + 16 * H); // six 7-hour days
  eq(six.weeklyPay("ana", 0), 40 * 2000 + 2 * 3000, "42 hours: 2 of overtime");
});

test("overtime cents are rounded with the week, once", () => {
  const r = make(1001);
  shift(r, "ana", 0, 41 * H); // one long 41-hour stretch: 40040 + 1501.5
  eq(r.weeklyPay("ana", 0), 41542);
  const s = make(1999);
  for (let d = 0; d < 5; d++) shift(s, "ana", d * DAY + 8 * H, d * DAY + 16 * H); // 40 hours
  for (let d = 5; d < 7; d++) shift(s, "ana", d * DAY + 8 * H, d * DAY + 8 * H + 20); // 40 overtime minutes, two shifts
  eq(s.weeklyPay("ana", 0), 40 * 1999 + Math.round(40 * 1999 * 1.5 / 60));
});

test("addShift checks every recorded shift, not just the latest", () => {
  const r = make();
  shift(r, "ana", 9 * H, 17 * H); // Monday
  shift(r, "ana", 2 * DAY + 9 * H, 2 * DAY + 17 * H); // Wednesday
  throws(() => r.addShift("ana", 16 * H, 18 * H), RangeError, "overlaps Monday");
  throws(() => r.addShift("ana", 10 * H, 11 * H), RangeError, "inside Monday");
  throws(() => r.addShift("ana", 8 * H, 18 * H), RangeError, "covers Monday");
  r.addShift("ana", DAY + 9 * H, DAY + 17 * H); // Tuesday
  throws(() => r.addShift("ana", DAY + 12 * H, DAY + 13 * H), RangeError, "inside the back-filled Tuesday");
  eq(r.minutesWorked("ana", 0, WEEK), 24 * H);
});

test("back-to-back shifts do not overlap", () => {
  const r = make();
  shift(r, "ana", 9 * H, 14 * H);
  r.addShift("ana", 6 * H, 9 * H); // ends the minute the clocked shift starts
  r.addShift("ana", 14 * H, 18 * H); // starts the minute it ends
  eq(r.minutesWorked("ana", 0, DAY), 12 * H);
  r.clockIn("ana", 18 * H);
  r.clockOut("ana", 20 * H);
  eq(r.minutesWorked("ana", 0, DAY), 14 * H);
});

test("addShift and the shift a worker is clocked in on", () => {
  const r = make();
  r.clockIn("ana", DAY + 9 * H);
  r.addShift("ana", 9 * H, 17 * H); // the day before
  r.addShift("ana", DAY + 6 * H, DAY + 9 * H); // ends at the clock-in
  throws(() => r.addShift("ana", DAY + 8 * H, DAY + 10 * H), RangeError, "runs into the open shift");
  throws(() => r.addShift("ana", DAY + 12 * H, DAY + 13 * H), RangeError, "inside the open shift");
  r.clockOut("ana", DAY + 17 * H);
  eq(r.minutesWorked("ana", 0, WEEK), 19 * H);
});

test("clockIn cannot land inside a back-filled shift", () => {
  const r = make();
  r.addShift("ana", 9 * H, 17 * H);
  throws(() => r.clockIn("ana", 12 * H), RangeError);
  eq(r.onShift(), [], "the failed clock-in left nobody on shift");
  r.clockIn("ana", 17 * H);
  eq(r.onShift(), ["ana"]);
});

test("addShift rejects bad values and records nothing", () => {
  const r = make();
  throws(() => r.addShift("zed", 0, 60), RangeError, "unknown worker");
  for (const [a, b] of [[60, 0], [-60, 60], [0, 1.5], [0, "60"], [undefined, 60]]) throws(() => r.addShift("ana", a, b), RangeError, a + ".." + b);
  eq(r.minutesWorked("ana", 0, WEEK), 0);
});

test("workers are kept apart", () => {
  const r = make(2000);
  r.addWorker("bo", 3000);
  shift(r, "ana", 9 * H, 17 * H);
  r.addShift("bo", 10 * H, 12 * H); // same hours as ana: fine, different worker
  eq(r.minutesWorked("bo", 0, DAY), 2 * H);
  eq(r.weeklyPay("bo", 0), 2 * 3000);
  eq(r.weeklyPay("ana", 0), 8 * 2000);
});
