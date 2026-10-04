// orders-service.test.js: the service's existing test suite (CI runs it on every PR).
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
const LAMP = { sku: "LAMP-01", priceCents: 4500, qty: 1 };  // $45.00

test("createOrder totals the items in cents, with 8% tax and $5.99 shipping", () => {
  const { app } = mk();
  const o = app.createOrder("u1", [MUG]);
  eq(o.status, "pending");
  eq(o.totals, { subtotal: 3600, discount: 0, tax: 288, shipping: 599, total: 4487 });
});

test("orders of $50 or more ship free", () => {
  const { app } = mk();
  const o = app.createOrder("u1", [MUG, LAMP]);
  eq(o.totals.subtotal, 8100);
  eq(o.totals.shipping, 0);
  eq(o.totals.total, 8100 + 648);
});

test("createOrder rejects an empty order and bad items", () => {
  const { app } = mk();
  throws(() => app.createOrder("u1", []), TypeError);
  throws(() => app.createOrder("u1", [{ sku: "X", priceCents: 1.5, qty: 1 }]), TypeError);
  throws(() => app.createOrder("u1", [{ sku: "X", priceCents: 100, qty: 0 }]), TypeError);
});

test("getOrder returns a copy", () => {
  const { app } = mk();
  const o = app.createOrder("u1", [MUG]);
  const got = app.getOrder(o.id);
  got.items[0].qty = 99;
  got.totals.total = 1;
  eq(app.getOrder(o.id).items[0].qty, 2);
  eq(app.getOrder(o.id).totals.total, 4487);
});

test("checkout charges the order total once and marks the order charged", async () => {
  const { app, gateway } = mk();
  const o = app.createOrder("u1", [MUG]);
  const p = await app.checkout(o.id, "key-1");
  eq(gateway.calls.length, 1);
  eq(gateway.calls[0].amountCents, 4487);
  eq(p.amountCents, 4487);
  eq(app.getOrder(o.id).status, "charged");
});

test("retrying a finished checkout with the same key returns the same payment without charging again", async () => {
  const { app, gateway } = mk();
  const o = app.createOrder("u1", [MUG]);
  const first = await app.checkout(o.id, "key-1");
  const again = await app.checkout(o.id, "key-1");
  eq(again, first);
  eq(gateway.calls.length, 1);
});

test("checkout of an order that was already charged throws ORDER_NOT_PENDING", async () => {
  const { app } = mk();
  const o = app.createOrder("u1", [MUG]);
  await app.checkout(o.id, "key-1");
  let err = null;
  try { await app.checkout(o.id, "key-2"); } catch (e) { err = e; }
  eq(err && err.code, "ORDER_NOT_PENDING");
});

test("a charge.succeeded webhook marks the order paid and takes stock", async () => {
  const { app } = mk();
  app.setStock("MUG-BLK", 10);
  const o = app.createOrder("u1", [MUG]);
  const p = await app.checkout(o.id, "key-1");
  eq(app.handleWebhook({ id: "evt_1", type: "charge.succeeded", chargeId: p.chargeId }), { ok: true });
  eq(app.getOrder(o.id).status, "paid");
  eq(app.stock("MUG-BLK"), 8);
});

test("webhooks for unknown charges and other event types are ignored", () => {
  const { app } = mk();
  eq(app.handleWebhook({ id: "evt_1", type: "charge.succeeded", chargeId: "ch_nope" }), { ignored: true });
  eq(app.handleWebhook({ id: "evt_2", type: "charge.refunded", chargeId: "ch_1" }), { ignored: true });
});
