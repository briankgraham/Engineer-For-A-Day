// In-memory stand-in for Postgres. Each app gets its own store, so every test starts clean.
function createStore() {
  return {
    orders: new Map(),       // id -> { id, userId, items: [{ sku, priceCents, qty }], status, code, totals }
    payments: new Map(),     // id -> { id, orderId, chargeId, amountCents }
    idempotency: new Map(),  // checkout Idempotency-Key -> payment
    codes: new Map(),        // discount codes (SHIP-142)
    stock: new Map(),        // sku -> units on hand
    seq: 1,
  };
}

function nextId(store, prefix) {
  return prefix + "_" + store.seq++;
}

// Errors the HTTP layer maps to 4xx responses carry a machine-readable code.
function codeError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

function getOrderRow(store, id) {
  const order = store.orders.get(id);
  if (!order) throw codeError("ORDER_NOT_FOUND", "no order " + id);
  return order;
}

module.exports = { createStore, nextId, codeError, getOrderRow };
