// Hidden edge cases (run when the candidate finishes, on top of visible_tests.js)
const streak = (...args) => require("./streak").currentStreak(...args);

test("grace days can bridge more than one missed day", () => {
  eq(streak(["2024-03-01", "2024-03-05"], { today: "2024-03-05", graceDays: 3 }), 2);
});

test("a gap one day too large for the grace still breaks the streak", () => {
  eq(streak(["2024-03-01", "2024-03-05"], { today: "2024-03-05", graceDays: 2 }), 1);
});

test("grace also covers the gap up to today, not just gaps between activity days", () => {
  eq(streak(["2024-03-05", "2024-03-06", "2024-03-07"], { today: "2024-03-09", graceDays: 2 }), 3);
  eq(streak(["2024-03-05", "2024-03-06", "2024-03-07"], { today: "2024-03-10", graceDays: 2 }), 0);
});

test("unsorted input is handled the same as sorted input", () => {
  eq(streak(["2024-03-10", "2024-03-08", "2024-03-09"], { today: "2024-03-10" }), 3);
});

test("negative or fractional grace days throw RangeError", () => {
  throws(() => streak(["2024-03-10"], { today: "2024-03-10", graceDays: -1 }), RangeError);
  throws(() => streak(["2024-03-10"], { today: "2024-03-10", graceDays: 1.5 }), RangeError);
});

test("activity after today throws RangeError", () => {
  throws(() => streak(["2024-03-11"], { today: "2024-03-10" }), RangeError);
});

test("a long unbroken streak counts every distinct day", () => {
  const dates = [];
  for (let i = 0; i < 10; i++) dates.push(new Date(Date.UTC(2024, 2, 1 + i)).toISOString().slice(0, 10));
  eq(streak(dates, { today: dates[dates.length - 1] }), 10);
});
