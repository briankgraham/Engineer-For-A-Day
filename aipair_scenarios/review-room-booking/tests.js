const { createBookings } = require("./bookings");

test("a booking that covers another is rejected", () => {
  const b = createBookings();
  b.book("Oak", "10:00", "11:00", "ana");
  eq(b.book("Oak", "09:00", "12:00", "ben"), null);
});

test("a booking inside another is rejected", () => {
  const b = createBookings();
  b.book("Oak", "09:00", "12:00", "ana");
  eq(b.book("Oak", "10:00", "11:00", "ben"), null);
});

test("the exact same slot is rejected", () => {
  const b = createBookings();
  b.book("Oak", "09:00", "10:00", "ana");
  eq(b.book("Oak", "09:00", "10:00", "ben"), null);
});

test("a zero-length booking throws", () => {
  const b = createBookings();
  throws(() => b.book("Oak", "10:00", "10:00", "ana"), RangeError);
});

test("cancel with an unknown id returns false and keeps every booking", () => {
  const b = createBookings();
  b.book("Oak", "09:00", "10:00", "ana");
  b.book("Oak", "11:00", "12:00", "ben");
  eq(b.cancel("Oak", 999), false);
  eq(b.list("Oak").map(x => x.who), ["ana", "ben"]);
});

test("cancel in the wrong room returns false and keeps the booking", () => {
  const b = createBookings();
  const id = b.book("Oak", "09:00", "10:00", "ana");
  b.book("Elm", "09:00", "10:00", "ben");
  eq(b.cancel("Elm", id), false);
  eq(b.list("Elm").length, 1);
  eq(b.list("Oak").length, 1);
});

test("cancel in an unknown room returns false", () => {
  eq(createBookings().cancel("Nowhere", 1), false);
});

test("a cancelled slot can be booked again", () => {
  const b = createBookings();
  const id = b.book("Oak", "09:00", "10:00", "ana");
  b.cancel("Oak", id);
  assert(b.book("Oak", "09:00", "10:00", "ben") !== null);
});

test("changing the list() array does not change the bookings", () => {
  const b = createBookings();
  b.book("Oak", "09:00", "10:00", "ana");
  const l = b.list("Oak");
  l.length = 0;
  eq(b.list("Oak").length, 1);
});

test("changing a listed booking does not change the stored one", () => {
  const b = createBookings();
  b.book("Oak", "09:00", "10:00", "ana");
  b.list("Oak")[0].end = 24 * 60;
  assert(b.book("Oak", "10:00", "11:00", "ben") !== null, "the stored booking must still end at 10:00");
});

test("list for an unknown room is empty", () => {
  eq(createBookings().list("Nowhere"), []);
});
