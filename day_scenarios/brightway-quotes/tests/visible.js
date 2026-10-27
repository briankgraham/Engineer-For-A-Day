// quotes.test.js: the service's existing test suite (CI runs it on every PR). It is short; most of the rules live in quote.js only.
function mk() {
  const { createApp } = require("./app");
  const clock = mkClock();
  return { app: createApp({ now: clock.now }), clock };
}
const WEDNESDAY = Date.UTC(2026, 11, 2, 12, 0); // 2 Dec 2026
const US = { country: "US", postcode: "94107" };

test("a ground parcel to the US is priced from the rate card plus fuel", () => {
  const { app } = mk();
  const q = app.quote({ to: US, weightKg: 4, pickupAt: WEDNESDAY });
  eq([q.amount, q.currency, q.zone, q.chargeableKg], [1519, "USD", 1, 4]);
});

test("air costs more than ground", () => {
  const { app } = mk();
  const ground = app.quote({ to: US, weightKg: 4, pickupAt: WEDNESDAY }).amount;
  const air = app.quote({ service: "air", to: US, weightKg: 4, pickupAt: WEDNESDAY }).amount;
  assert(air > ground, "air " + air + " vs ground " + ground);
});

test("a destination and a positive weight are required, and the service must exist", () => {
  const { app } = mk();
  throws(() => app.quote({ weightKg: 4 }), TypeError);
  throws(() => app.quote({ to: US, weightKg: 0 }), RangeError);
  throws(() => app.quote({ to: US }), RangeError);
  let code = null;
  try { app.quote({ service: "boat", to: US, weightKg: 4 }); } catch (e) { code = e.code; }
  eq(code, "BAD_SERVICE");
});

test("setFuelPct changes what the next quote pays in fuel, and rejects nonsense", () => {
  const { app } = mk();
  app.setFuelPct(10);
  eq(app.quote({ to: US, weightKg: 4, pickupAt: WEDNESDAY }).amount, 1540);
  throws(() => app.setFuelPct(-1), RangeError);
  throws(() => app.setFuelPct("8"), RangeError);
});
