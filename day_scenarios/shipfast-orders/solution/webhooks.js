const { getOrderRow } = require("./store");

// Paystream calls POST /webhooks/paystream with events like
// { id: "evt_123", type: "charge.succeeded", chargeId: "ch_456" }.
// Delivery is at least once: a retried delivery has the same event id.
function create({ store, log }) {
  const seen = new Set();

  function handleWebhook(event) {
    if (!event || typeof event.id !== "string" || typeof event.type !== "string") throw new TypeError("bad event");
    if (seen.has(event.id)) {
      log.info("webhook.duplicate", { eventId: event.id });
      return { duplicate: true };
    }
    if (event.type !== "charge.succeeded") return { ignored: true };

    const payment = [...store.payments.values()].find(p => p.chargeId === event.chargeId);
    if (!payment) {
      log.warn("webhook.unknown_charge", { eventId: event.id, chargeId: event.chargeId });
      return { ignored: true };
    }

    seen.add(event.id);
    const order = getOrderRow(store, payment.orderId);
    if (order.status === "paid") return { duplicate: true };
    order.status = "paid";
    for (const it of order.items) {
      store.stock.set(it.sku, (store.stock.get(it.sku) || 0) - it.qty);
      log.info("stock.update", { sku: it.sku, onHand: store.stock.get(it.sku) });
    }
    log.info("order.paid", { orderId: order.id, eventId: event.id });
    return { ok: true };
  }

  return { handleWebhook };
}

module.exports = { create };
