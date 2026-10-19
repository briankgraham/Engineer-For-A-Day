// Read-only: these are the tests you can see. A few extra edge cases run when you finish.
const mk = () => {
  const ledger = new (require("./ledger").Ledger)();
  const payments = new (require("./payments").Payments)();
  const { handle } = require("./webhooks").createHandler({ ledger, payments });
  return { ledger, payments, handle };
};
let seq = 0;
const charge = (chargeId, account, amount, id = "evt_" + ++seq) => ({ id, type: "charge.succeeded", data: { chargeId, account, amount } });
const refund = (chargeId, amount, id = "evt_" + ++seq) => ({ id, type: "charge.refunded", data: { chargeId, amount } });

// ---- existing behavior (passes today, keep it passing) ----
test("a successful charge credits the account and records the charge", async () => {
  const { ledger, payments, handle } = mk();
  const res = await handle(charge("ch_1", "acct_a", 2500));
  eq(res, { status: 200, body: { ok: true } });
  eq(ledger.balance("acct_a"), 2500);
  eq(payments.get("ch_1"), { id: "ch_1", account: "acct_a", amount: 2500, refunded: 0 });
});

test("a refund debits the charge's account and adds to its refunded total", async () => {
  const { ledger, payments, handle } = mk();
  await handle(charge("ch_1", "acct_a", 2500));
  eq(await handle(refund("ch_1", 1000)), { status: 200, body: { ok: true } });
  eq(ledger.balance("acct_a"), 1500);
  eq(payments.get("ch_1").refunded, 1000);
});

test("ledger entries carry the event id as their ref", async () => {
  const { ledger, handle } = mk();
  await handle(charge("ch_1", "acct_a", 2500, "evt_c"));
  await handle(refund("ch_1", 500, "evt_r"));
  eq(ledger.entries, [{ account: "acct_a", cents: 2500, ref: "evt_c" }, { account: "acct_a", cents: -500, ref: "evt_r" }]);
});

test("event types we don't handle are acknowledged and ignored", async () => {
  const { ledger, handle } = mk();
  eq(await handle({ id: "evt_x", type: "customer.updated", data: { name: "Ada" } }), { status: 200, body: { ignored: true } });
  eq(ledger.entries, []);
});

test("a malformed event gets a 400 and changes nothing", async () => {
  const { ledger, handle } = mk();
  for (const bad of [null, {}, { type: "charge.succeeded", data: { chargeId: "ch_1", account: "a", amount: 1 } }, { id: "evt_1", type: "charge.succeeded" }]) {
    eq((await handle(bad)).status, 400, JSON.stringify(bad));
  }
  eq(ledger.entries, []);
});

// ---- new behavior (fails today) ----
test("a redelivered event is acknowledged but applied only once", async () => {
  const { ledger, handle } = mk();
  const e = charge("ch_1", "acct_a", 2500);
  eq(await handle(e), { status: 200, body: { ok: true } });
  eq(await handle(e), { status: 200, body: { duplicate: true } });
  eq(await handle({ ...e, data: { ...e.data } }), { status: 200, body: { duplicate: true } });
  eq(ledger.balance("acct_a"), 2500);
});

test("if the ledger write fails the event gets a 500, and the provider's retry applies it", async () => {
  const { ledger, handle } = mk();
  const e = charge("ch_1", "acct_a", 2500);
  ledger.failNextWrite();
  const res = await handle(e);
  eq(res.status, 500);
  assert(typeof res.body.error === "string", "500 body has an error message");
  eq(ledger.balance("acct_a"), 0);
  eq(await handle(e), { status: 200, body: { ok: true } });
  eq(ledger.balance("acct_a"), 2500);
});

test("a refund that arrives before its charge gets a 409, then applies when retried after the charge", async () => {
  const { ledger, payments, handle } = mk();
  const r = refund("ch_1", 1000);
  eq((await handle(r)).status, 409);
  eq(ledger.entries, []);
  await handle(charge("ch_1", "acct_a", 2500));
  eq(await handle(r), { status: 200, body: { ok: true } });
  eq(ledger.balance("acct_a"), 1500);
  eq(payments.get("ch_1").refunded, 1000);
});

test("a redelivery that arrives while the first copy is still being applied gets a 409", async () => {
  const { ledger, handle } = mk();
  const e = charge("ch_1", "acct_a", 2500);
  const first = handle(e), second = handle(e);
  eq((await second).status, 409);
  eq(await first, { status: 200, body: { ok: true } });
  eq(ledger.balance("acct_a"), 2500);
  eq(await handle(e), { status: 200, body: { duplicate: true } });
});
