const tz = require("./tz");
const { nextId } = require("./store");

// Charges the customer through Tollgate and records a paid invoice. Throws (and records nothing) if the charge fails.
// The invoice is dated with the customer's local date at the start of the period it pays for.
async function chargeInvoice({ store, gateway, log }, sub, customer, { kind, amountCents, creditCents = 0, periodStart, periodEnd }) {
  const date = tz.localDate(customer.timeZone, periodStart).str;
  const idempotencyKey = sub.id + ":" + kind + ":" + periodStart;
  const { chargeId } = await gateway.charge({ customerId: customer.id, amountCents, idempotencyKey });
  const invoice = { id: nextId(store, "inv"), subscriptionId: sub.id, kind, amountCents, creditCents, date, periodStart, periodEnd, chargeId, status: "paid" };
  store.invoices.set(invoice.id, invoice);
  log.info("invoice.paid", { invoiceId: invoice.id, subscriptionId: sub.id, kind, amountCents, date });
  return invoice;
}

function create({ store }) {
  function invoicesFor(subscriptionId) {
    return [...store.invoices.values()].filter(i => i.subscriptionId === subscriptionId).map(i => ({ ...i }));
  }

  return { invoicesFor };
}

module.exports = { create, chargeInvoice };
