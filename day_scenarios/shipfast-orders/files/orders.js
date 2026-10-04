const { quote } = require("./pricing");
const { nextId, getOrderRow } = require("./store");

// Callers always get copies, never the stored rows.
function copyOrder(o) {
  return { ...o, items: o.items.map(it => ({ ...it })), totals: { ...o.totals } };
}

function create({ store, log }) {
  function createOrder(userId, items) {
    if (!Array.isArray(items) || items.length === 0) throw new TypeError("an order needs at least one item");
    for (const it of items) {
      if (!it || typeof it.sku !== "string" || !Number.isInteger(it.priceCents) || it.priceCents < 0 || !Number.isInteger(it.qty) || it.qty < 1) {
        throw new TypeError("bad item " + JSON.stringify(it));
      }
    }
    const order = {
      id: nextId(store, "ord"),
      userId,
      items: items.map(it => ({ sku: it.sku, priceCents: it.priceCents, qty: it.qty })),
      status: "pending",  // pending -> charged -> paid
      code: null,
      totals: quote(items),
    };
    store.orders.set(order.id, order);
    log.info("order.created", { orderId: order.id, total: order.totals.total });
    return copyOrder(order);
  }

  function getOrder(id) {
    return copyOrder(getOrderRow(store, id));
  }

  return { createOrder, getOrder };
}

module.exports = { create, copyOrder };
