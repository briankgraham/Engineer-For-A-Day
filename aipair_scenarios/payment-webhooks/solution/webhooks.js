// Turns payment-provider webhook events into ledger entries.
//
// An event is { id: "evt_...", type, data: { chargeId, account, amount } }, amounts in integer cents.
// Refund events carry chargeId and amount only. handle() resolves to { status, body }.
// The provider treats any 2xx as delivered and retries anything else later.
function createHandler({ ledger, payments }) {
  const processed = new Set(); // event ids that have been applied
  const inFlight = new Set();  // event ids being applied right now

  const text = v => typeof v === "string" && v.length > 0;
  const cents = v => Number.isSafeInteger(v) && v > 0;
  const valid = e => {
    if (!e || typeof e !== "object" || !text(e.id) || !e.data || typeof e.data !== "object") return false;
    const d = e.data;
    if (e.type === "charge.succeeded") return text(d.chargeId) && text(d.account) && cents(d.amount);
    if (e.type === "charge.refunded") return text(d.chargeId) && cents(d.amount);
    return true;
  };

  async function apply(event) {
    const d = event.data;

    if (event.type === "charge.succeeded") {
      // Record the charge only once the money is in the ledger, so a failed write leaves nothing behind.
      await ledger.credit(d.account, d.amount, event.id);
      payments.put({ id: d.chargeId, account: d.account, amount: d.amount, refunded: 0 });
      return { status: 200, body: { ok: true } };
    }

    if (event.type === "charge.refunded") {
      const charge = payments.get(d.chargeId);
      // Arrived before its charge: not delivered yet, so the provider retries it later.
      if (!charge) return { status: 409, body: { error: "unknown charge " + d.chargeId + ", retry later" } };
      await ledger.debit(charge.account, d.amount, event.id);
      charge.refunded += d.amount;
      return { status: 200, body: { ok: true } };
    }

    return { status: 200, body: { ignored: true } };
  }

  async function handle(event) {
    if (!valid(event)) return { status: 400, body: { error: "malformed event" } };
    const key = event.id;
    if (processed.has(key)) return { status: 200, body: { duplicate: true } };
    if (inFlight.has(key)) return { status: 409, body: { error: "already in progress, retry later" } };

    inFlight.add(key);
    try {
      const res = await apply(event);
      if (res.status === 200) processed.add(key);
      return res;
    } catch (e) {
      return { status: 500, body: { error: String((e && e.message) || e) } };
    } finally {
      inFlight.delete(key);
    }
  }

  return { handle };
}

module.exports = { createHandler };
