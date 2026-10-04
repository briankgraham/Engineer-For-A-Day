// Tests added in PR #214. CI runs these, and they all pass on the PR branch.
const { createBookings } = require("./bookings");

test("book returns increasing ids", () => {
  const b = createBookings();
  const a = b.book("Oak", "09:00", "10:00", "ana");
  const c = b.book("Oak", "10:00", "11:00", "ben");
  assert(typeof a === "number" && c > a, "ids should be increasing numbers");
});

test("a booking that starts inside another is rejected", () => {
  const b = createBookings();
  b.book("Oak", "09:00", "10:00", "ana");
  eq(b.book("Oak", "09:30", "10:30", "ben"), null);
});

test("a booking that ends inside another is rejected", () => {
  const b = createBookings();
  b.book("Oak", "09:00", "10:00", "ana");
  eq(b.book("Oak", "08:30", "09:15", "ben"), null);
});

test("back-to-back bookings are allowed", () => {
  const b = createBookings();
  b.book("Oak", "09:00", "10:00", "ana");
  assert(b.book("Oak", "10:00", "11:00", "ben") !== null, "10:00-11:00 right after 09:00-10:00");
  assert(b.book("Oak", "08:00", "09:00", "cy") !== null, "08:00-09:00 right before 09:00-10:00");
});

test("different rooms never clash", () => {
  const b = createBookings();
  b.book("Oak", "09:00", "10:00", "ana");
  assert(b.book("Elm", "09:00", "10:00", "ben") !== null);
});

test("list is sorted by start time", () => {
  const b = createBookings();
  b.book("Oak", "13:00", "14:00", "ana");
  b.book("Oak", "09:00", "10:00", "ben");
  eq(b.list("Oak").map(x => x.who), ["ben", "ana"]);
});

test("cancel removes the booking", () => {
  const b = createBookings();
  const id = b.book("Oak", "09:00", "10:00", "ana");
  eq(b.cancel("Oak", id), true);
  eq(b.list("Oak"), []);
});

test("end before start throws", () => {
  const b = createBookings();
  throws(() => b.book("Oak", "10:00", "09:00", "ana"), RangeError);
});

test("bad time format throws", () => {
  const b = createBookings();
  throws(() => b.book("Oak", "9:00", "10:00", "ana"), RangeError);
});
