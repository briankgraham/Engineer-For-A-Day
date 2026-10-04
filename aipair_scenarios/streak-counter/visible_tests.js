// Read-only: these are the tests you can see. A few extra edge cases run when you finish.
const { dayNumber } = require("./days");
const streak = (...args) => require("./streak").currentStreak(...args);

// ---- day numbers (already working) ----
test("day numbers increase by one per calendar day", () => {
  eq(dayNumber("2024-03-06") - dayNumber("2024-03-05"), 1);
});

test("a bad date format throws RangeError", () => {
  throws(() => dayNumber("03/05/2024"), RangeError);
});

// ---- streak ----
test("no activity gives a streak of zero", () => {
  eq(streak([], { today: "2024-03-10" }), 0);
});

test("activity today alone gives a streak of one", () => {
  eq(streak(["2024-03-10"], { today: "2024-03-10" }), 1);
});

test("consecutive days count without any grace", () => {
  eq(streak(["2024-03-08", "2024-03-09", "2024-03-10"], { today: "2024-03-10" }), 3);
});

test("a missed day breaks the streak with no grace", () => {
  eq(streak(["2024-03-07", "2024-03-08", "2024-03-10"], { today: "2024-03-10" }), 1);
});

test("one grace day bridges a single missed day", () => {
  eq(streak(["2024-03-07", "2024-03-08", "2024-03-10"], { today: "2024-03-10", graceDays: 1 }), 3);
});

test("the same day logged twice only counts once", () => {
  eq(streak(["2024-03-09", "2024-03-09", "2024-03-10"], { today: "2024-03-10" }), 2);
});

test("a streak gone cold is zero, even if it was long", () => {
  eq(streak(["2024-03-01", "2024-03-02", "2024-03-03"], { today: "2024-03-10" }), 0);
});
