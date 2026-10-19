// Turns payment-provider webhook events into ledger entries.
//
// An event is { id: "evt_...", type, data: { chargeId, account, amount } }, amounts in integer cents.
// Refund events carry chargeId and amount only. handle() resolves to { status, body }.
// The provider treats any 2xx as delivered and retries anything else later.
function createHandler({ ledger, payments }) {
  const valid = e => e && typeof e.id === "string" && e.data && typeof e.data.chargeId === "string";

  async function handle(event) {
    if (!valid(event)) return { status: 400, body: { error: "malformed event" } };
    const d = event.data;

    if (event.type === "charge.succeeded") {
      payments.put({ id: d.chargeId, account: d.account, amount: d.amount, refunded: 0 });
      await ledger.credit(d.account, d.amount, event.id);
      return { status: 200, body: { ok: true } };
    }

    if (event.type === "charge.refunded") {
      const charge = payments.get(d.chargeId);
      charge.refunded += d.amount;
      await ledger.debit(charge.account, d.amount, event.id);
      return { status: 200, body: { ok: true } };
    }

    return { status: 200, body: { ignored: true } };
  }

  return { handle };
}

module.exports = { createHandler };
