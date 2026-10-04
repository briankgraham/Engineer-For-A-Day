// Hidden: INC-0412 (double charges, stock going negative). Runs when the day ends.
// The gateway here lets each test decide when a charge settles, like a slow Paystream.
function slowGateway() {
  const calls = [], pending = [];
  let n = 0;
  return {
    calls, pending,
    charge(req) { calls.push(req); const d = mkDeferred(); pending.push(d); return d.promise; },
    settle(i) { pending[i].resolve({ chargeId: "ch_" + ++n }); },
    fail(i) { const e = new Error("Paystream: card_declined"); e.status = 402; pending[i].reject(e); },
  };
}
function mk() {
  const { createApp } = require("./app");
  const gateway = slowGateway(), clock = mkClock();
  return { app: createApp({ gateway, now: clock.now }), gateway };
}
const MUG = { sku: "MUG-BLK", priceCents: 1800, qty: 2 };
const settleAll = async gw => { for (let i = 0; i < gw.pending.length; i++) gw.settle(i); await flush(); };

test("a retry with the same key while the first charge is in flight charges once and returns the same payment", async () => {
  const { app, gateway } = mk();
  const o = app.createOrder("u1", [MUG]);
  const a = app.checkout(o.id, "key-1");
  await flush();
  const b = app.checkout(o.id, "key-1");
  await flush();
  await settleAll(gateway);
  const [pa, pb] = await Promise.all([a, b]);
  eq(gateway.calls.length, 1, "Paystream charges");
  eq(pb, pa);
  eq(app.paymentsFor(o.id).length, 1);
});

test("a second checkout with a different key while the first is in flight does not charge again", async () => {
  const { app, gateway } = mk();
  const o = app.createOrder("u1", [MUG]);
  const a = app.checkout(o.id, "key-1");
  await flush();
  let err = null;
  const b = app.checkout(o.id, "key-2").catch(e => { err = e; });
  await flush();
  await settleAll(gateway);
  await a; await b;
  eq(gateway.calls.length, 1, "Paystream charges");
  eq(err && err.code, "ORDER_NOT_PENDING");
});

test("the idempotency key is passed to Paystream", async () => {
  const { app, gateway } = mk();
  const o = app.createOrder("u1", [MUG]);
  const a = app.checkout(o.id, "key-1");
  await flush();
  eq(gateway.calls[0].idempotencyKey, "key-1");
  await settleAll(gateway);
  await a;
});

test("a failed charge is not cached: the same key can retry, and the order is pending again", async () => {
  const { app, gateway } = mk();
  const o = app.createOrder("u1", [MUG]);
  const a = app.checkout(o.id, "key-1").then(() => null, e => e);
  await flush();
  gateway.fail(0);
  const err = await a;
  assert(err, "the declined checkout should reject");
  eq(app.getOrder(o.id).status, "pending");
  const b = app.checkout(o.id, "key-1");
  await flush();
  eq(gateway.calls.length, 2, "the retry reaches Paystream");
  gateway.settle(1);
  const p = await b;
  assert(p && p.chargeId, "the retry succeeds");
  eq(app.getOrder(o.id).status, "charged");
});

test("the same webhook event delivered twice takes stock once", async () => {
  const { app, gateway } = mk();
  app.setStock("MUG-BLK", 1 + 2);
  const o = app.createOrder("u1", [MUG]);
  const a = app.checkout(o.id, "key-1");
  await flush(); gateway.settle(0);
  const p = await a;
  const ev = { id: "evt_771", type: "charge.succeeded", chargeId: p.chargeId };
  app.handleWebhook(ev);
  const second = app.handleWebhook({ ...ev });
  eq(app.stock("MUG-BLK"), 1);
  eq(app.getOrder(o.id).status, "paid");
  assert(!(second && second.ok), "a redelivered event should not be processed as new");
});
