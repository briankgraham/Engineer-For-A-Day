// Hidden: SHIP-142 discount codes. Runs when the day ends.
function fakeGateway() {
  const calls = [];
  let n = 0;
  return { calls, charge(req) { calls.push(req); return Promise.resolve({ chargeId: "ch_" + ++n }); } };
}
function mk() {
  const { createApp } = require("./app");
  const gateway = fakeGateway(), clock = mkClock();
  return { app: createApp({ gateway, now: clock.now }), gateway, clock };
}
const MUG = { sku: "MUG-BLK", priceCents: 1800, qty: 2 };   // $36.00
const errCode = fn => { try { fn(); } catch (e) { return e.code || e.name; } return null; };

test("a percent code comes off the items before tax", () => {
  const { app } = mk();
  app.defineCode({ code: "WELCOME10", type: "percent", value: 10, expiresAt: null });
  const o = app.createOrder("u1", [MUG]);
  const t = app.applyCode(o.id, "WELCOME10").totals;
  eq(t, { subtotal: 3600, discount: 360, tax: 259, shipping: 599, total: 3600 - 360 + 259 + 599 });
  eq(app.getOrder(o.id).code, "WELCOME10");
});

test("a fixed code takes cents off", () => {
  const { app } = mk();
  app.defineCode({ code: "FIVEOFF", type: "fixed", value: 500, expiresAt: null });
  const o = app.createOrder("u1", [MUG]);
  const t = app.applyCode(o.id, "FIVEOFF").totals;
  eq(t.discount, 500);
  eq(t.tax, 248);
  eq(t.total, 3100 + 248 + 599);
});

test("codes are case-insensitive", () => {
  const { app } = mk();
  app.defineCode({ code: "Welcome10", type: "percent", value: 10, expiresAt: null });
  const o = app.createOrder("u1", [MUG]);
  eq(app.applyCode(o.id, "welcome10").totals.discount, 360);
});

test("a percent discount rounds down to the cent", () => {
  const { app } = mk();
  app.defineCode({ code: "SAVE15", type: "percent", value: 15, expiresAt: null });
  const o = app.createOrder("u1", [{ sku: "PEN", priceCents: 1999, qty: 1 }]);
  eq(app.applyCode(o.id, "SAVE15").totals.discount, 299);
});

test("a fixed code bigger than the items never takes them below zero", () => {
  const { app } = mk();
  app.defineCode({ code: "BIG", type: "fixed", value: 10000, expiresAt: null });
  const o = app.createOrder("u1", [MUG]);
  const t = app.applyCode(o.id, "BIG").totals;
  eq(t.discount, 3600);
  eq(t.tax, 0);
  eq(t.total, 599);
});

test("free shipping looks at the discounted item total", () => {
  const { app } = mk();
  app.defineCode({ code: "TWENTY", type: "percent", value: 20, expiresAt: null });
  const o = app.createOrder("u1", [{ sku: "LAMP-01", priceCents: 5500, qty: 1 }]);
  eq(o.totals.shipping, 0);
  eq(app.applyCode(o.id, "TWENTY").totals.shipping, 599);
});

test("an expired code is rejected with EXPIRED_CODE, including at the exact expiry time", () => {
  const { app, clock } = mk();
  app.defineCode({ code: "FLASH", type: "percent", value: 10, expiresAt: clock.now() + 1000 });
  const o = app.createOrder("u1", [MUG]);
  clock.tick(999);
  eq(app.applyCode(o.id, "FLASH").totals.discount, 360);
  app.removeCode(o.id);
  clock.tick(1);
  eq(errCode(() => app.applyCode(o.id, "FLASH")), "EXPIRED_CODE");
  eq(app.getOrder(o.id).totals.discount, 0);
});

test("an unknown code is rejected with UNKNOWN_CODE and changes nothing", () => {
  const { app } = mk();
  const o = app.createOrder("u1", [MUG]);
  eq(errCode(() => app.applyCode(o.id, "NOPE")), "UNKNOWN_CODE");
  eq(app.getOrder(o.id).totals.total, 4487);
});

test("one code per order: applying a second code replaces the first", () => {
  const { app } = mk();
  app.defineCode({ code: "WELCOME10", type: "percent", value: 10, expiresAt: null });
  app.defineCode({ code: "FIVEOFF", type: "fixed", value: 500, expiresAt: null });
  const o = app.createOrder("u1", [MUG]);
  app.applyCode(o.id, "WELCOME10");
  const after = app.applyCode(o.id, "FIVEOFF");
  eq(after.code, "FIVEOFF");
  eq(after.totals.discount, 500);
});

test("removeCode restores the original totals", () => {
  const { app } = mk();
  app.defineCode({ code: "WELCOME10", type: "percent", value: 10, expiresAt: null });
  const o = app.createOrder("u1", [MUG]);
  app.applyCode(o.id, "WELCOME10");
  const after = app.removeCode(o.id);
  eq(after.code, null);
  eq(after.totals, o.totals);
});

test("codes cannot change an order that was already charged", async () => {
  const { app } = mk();
  app.defineCode({ code: "WELCOME10", type: "percent", value: 10, expiresAt: null });
  const o = app.createOrder("u1", [MUG]);
  await app.checkout(o.id, "key-1");
  eq(errCode(() => app.applyCode(o.id, "WELCOME10")), "ORDER_NOT_PENDING");
});

test("checkout charges the discounted total", async () => {
  const { app, gateway } = mk();
  app.defineCode({ code: "WELCOME10", type: "percent", value: 10, expiresAt: null });
  const o = app.createOrder("u1", [MUG]);
  app.applyCode(o.id, "WELCOME10");
  await app.checkout(o.id, "key-1");
  eq(gateway.calls[0].amountCents, 3600 - 360 + 259 + 599);
});

test("defineCode rejects bad codes with RangeError", () => {
  const { app } = mk();
  throws(() => app.defineCode({ code: "P0", type: "percent", value: 0, expiresAt: null }), RangeError);
  throws(() => app.defineCode({ code: "P101", type: "percent", value: 101, expiresAt: null }), RangeError);
  throws(() => app.defineCode({ code: "HALF", type: "fixed", value: 2.5, expiresAt: null }), RangeError);
  throws(() => app.defineCode({ code: "BOGO", type: "bogo", value: 1, expiresAt: null }), RangeError);
});

test("a code with expiresAt null never expires", () => {
  const { app, clock } = mk();
  app.defineCode({ code: "FOREVER", type: "fixed", value: 100, expiresAt: null });
  clock.tick(1e12);
  const o = app.createOrder("u1", [MUG]);
  eq(app.applyCode(o.id, "FOREVER").totals.discount, 100);
});
