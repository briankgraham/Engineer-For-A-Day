// Hidden edge cases. Runs with: test, assert, eq, throws, require, mkClock, mkDeferred, flush
const mk = () => {
  const ledger = new (require("./ledger").Ledger)();
  const payments = new (require("./payments").Payments)();
  const { handle } = require("./webhooks").createHandler({ ledger, payments });
  return { ledger, payments, handle };
};
let seq = 0;
const charge = (chargeId, account, amount, id = "evt_h" + ++seq) => ({ id, type: "charge.succeeded", data: { chargeId, account, amount } });
const refund = (chargeId, amount, id = "evt_h" + ++seq) => ({ id, type: "charge.refunded", data: { chargeId, amount } });

test("two partial refunds of the same amount are different events and both apply", async () => {
  const { ledger, payments, handle } = mk();
  await handle(charge("ch_1", "acct_a", 3000));
  eq(await handle(refund("ch_1", 1000)), { status: 200, body: { ok: true } });
  eq(await handle(refund("ch_1", 1000)), { status: 200, body: { ok: true } });
  eq(ledger.balance("acct_a"), 1000);
  eq(payments.get("ch_1").refunded, 2000);
});

test("a refund whose ledger write fails is not counted in the refunded total twice after the retry", async () => {
  const { ledger, payments, handle } = mk();
  await handle(charge("ch_1", "acct_a", 3000));
  const r = refund("ch_1", 1000);
  ledger.failNextWrite();
  eq((await handle(r)).status, 500);
  eq(payments.get("ch_1").refunded, 0);
  eq(await handle(r), { status: 200, body: { ok: true } });
  eq(payments.get("ch_1").refunded, 1000);
  eq(ledger.balance("acct_a"), 2000);
});

test("a charge whose ledger write fails leaves no charge record behind", async () => {
  const { ledger, payments, handle } = mk();
  const c = charge("ch_1", "acct_a", 3000);
  ledger.failNextWrite();
  eq((await handle(c)).status, 500);
  eq(payments.get("ch_1"), null);
  eq((await handle(refund("ch_1", 500))).status, 409, "refund for a charge that never landed");
  eq(ledger.entries, []);
});

test("a refund for an unknown charge keeps getting 409 and never debits anything", async () => {
  const { ledger, handle } = mk();
  const r = refund("ch_404", 700);
  for (let i = 0; i < 3; i++) eq((await handle(r)).status, 409);
  eq(ledger.entries, []);
});

test("a duplicate that arrives while a failing first copy is in flight gets 409, and the next retry applies", async () => {
  const { ledger, handle } = mk();
  const e = charge("ch_1", "acct_a", 2500);
  ledger.failNextWrite();
  const first = handle(e), second = handle(e);
  eq((await second).status, 409);
  eq((await first).status, 500);
  eq(await handle(e), { status: 200, body: { ok: true } });
  eq(ledger.balance("acct_a"), 2500);
});

test("different events are applied concurrently without blocking each other", async () => {
  const { ledger, handle } = mk();
  const rs = await Promise.all([handle(charge("ch_1", "a", 100)), handle(charge("ch_2", "b", 200)), handle(charge("ch_3", "a", 300))]);
  eq(rs.map(r => r.status), [200, 200, 200]);
  eq([ledger.balance("a"), ledger.balance("b")], [400, 200]);
});

test("a redelivered refund is a duplicate too", async () => {
  const { ledger, handle } = mk();
  await handle(charge("ch_1", "acct_a", 3000));
  const r = refund("ch_1", 1000);
  await handle(r);
  eq(await handle(r), { status: 200, body: { duplicate: true } });
  eq(ledger.balance("acct_a"), 2000);
});

test("bad amounts and missing fields get a 400 and change nothing", async () => {
  const { ledger, payments, handle } = mk();
  const bad = [
    charge("ch_1", "acct_a", 0), charge("ch_1", "acct_a", -5), charge("ch_1", "acct_a", 10.5), charge("ch_1", "acct_a", "100"),
    charge("ch_1", undefined, 100), charge(undefined, "acct_a", 100), { id: "", type: "charge.succeeded", data: { chargeId: "ch_1", account: "a", amount: 1 } },
  ];
  for (const e of bad) eq((await handle(e)).status, 400, JSON.stringify(e));
  await handle(charge("ch_2", "acct_a", 1000));
  for (const e of [refund("ch_2", 0), refund("ch_2", 2.5), refund("ch_2", null)]) eq((await handle(e)).status, 400, JSON.stringify(e));
  eq(payments.get("ch_1"), null);
  eq(ledger.balance("acct_a"), 1000);
});

test("handle resolves with a 500 instead of rejecting when the ledger throws", async () => {
  const { ledger, handle } = mk();
  ledger.failNextWrite();
  let res, rejected = false;
  try { res = await handle(charge("ch_1", "acct_a", 100)); } catch (e) { rejected = true; }
  assert(!rejected, "handle() rejected; the provider would see a crash, not a response");
  eq(res.status, 500);
});
