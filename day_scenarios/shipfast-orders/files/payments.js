const { nextId, codeError, getOrderRow } = require("./store");

// Checkout charges the order total through Paystream. The mobile and web clients send an
// Idempotency-Key with every checkout so a retried request returns the original payment.
function create({ store, gateway, log }) {
  async function checkout(orderId, idempotencyKey) {
    if (typeof idempotencyKey !== "string" || !idempotencyKey) throw new TypeError("idempotencyKey is required");
    if (store.idempotency.has(idempotencyKey)) return { ...store.idempotency.get(idempotencyKey) };

    const order = getOrderRow(store, orderId);
    if (order.status !== "pending") throw codeError("ORDER_NOT_PENDING", "order " + orderId + " is " + order.status);

    const amountCents = order.totals.total;
    log.info("charge.start", { orderId, amountCents, key: idempotencyKey });
    const { chargeId } = await gateway.charge({ orderId, amountCents });

    const payment = { id: nextId(store, "pay"), orderId, chargeId, amountCents };
    store.payments.set(payment.id, payment);
    store.idempotency.set(idempotencyKey, payment);
    order.status = "charged";
    log.info("charge.ok", { orderId, chargeId, key: idempotencyKey });
    return { ...payment };
  }

  function paymentsFor(orderId) {
    return [...store.payments.values()].filter(p => p.orderId === orderId).map(p => ({ ...p }));
  }

  return { checkout, paymentsFor };
}

module.exports = { create };
