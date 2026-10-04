const { nextId, codeError, getOrderRow } = require("./store");

// Checkout charges the order total through Paystream. The mobile and web clients send an
// Idempotency-Key with every checkout so a retried request returns the original payment.
function create({ store, gateway, log }) {
  async function checkout(orderId, idempotencyKey) {
    if (typeof idempotencyKey !== "string" || !idempotencyKey) throw new TypeError("idempotencyKey is required");
    // A retry that arrives while the first request is still waiting on Paystream gets the same in-flight result.
    if (store.idempotency.has(idempotencyKey)) return { ...(await store.idempotency.get(idempotencyKey)) };

    const order = getOrderRow(store, orderId);
    if (order.status !== "pending") throw codeError("ORDER_NOT_PENDING", "order " + orderId + " is " + order.status);
    order.status = "charging"; // claimed before the first await, so a second key cannot charge the same order

    const amountCents = order.totals.total;
    log.info("charge.start", { orderId, amountCents, key: idempotencyKey });
    const attempt = (async () => {
      // Paystream dedupes on its side too when it gets the key.
      const { chargeId } = await gateway.charge({ orderId, amountCents, idempotencyKey });
      const payment = { id: nextId(store, "pay"), orderId, chargeId, amountCents };
      store.payments.set(payment.id, payment);
      order.status = "charged";
      log.info("charge.ok", { orderId, chargeId, key: idempotencyKey });
      return payment;
    })();
    store.idempotency.set(idempotencyKey, attempt);
    try {
      return { ...(await attempt) };
    } catch (e) {
      // A failed charge is not cached: the customer can retry with the same key.
      store.idempotency.delete(idempotencyKey);
      order.status = "pending";
      log.warn("charge.failed", { orderId, key: idempotencyKey });
      throw e;
    }
  }

  function paymentsFor(orderId) {
    return [...store.payments.values()].filter(p => p.orderId === orderId).map(p => ({ ...p }));
  }

  return { checkout, paymentsFor };
}

module.exports = { create };
