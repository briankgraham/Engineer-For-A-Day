// SHIP-142: discount codes.
const { quote } = require("./pricing");
const { codeError, getOrderRow } = require("./store");
const { copyOrder } = require("./orders");

function create({ store, now, log }) {
  function defineCode({ code, type, value, expiresAt = null } = {}) {
    if (typeof code !== "string" || !/^[A-Za-z0-9_-]{3,32}$/.test(code)) throw new RangeError("bad code");
    if (type === "percent") {
      if (!Number.isInteger(value) || value < 1 || value > 100) throw new RangeError("a percent code must be 1-100");
    } else if (type === "fixed") {
      if (!Number.isInteger(value) || value < 1) throw new RangeError("a fixed code must be a positive number of cents");
    } else {
      throw new RangeError("type must be percent or fixed");
    }
    if (expiresAt !== null && !Number.isFinite(expiresAt)) throw new RangeError("bad expiresAt");
    const def = { code: code.toUpperCase(), type, value, expiresAt };
    store.codes.set(def.code, def);
    return { ...def };
  }

  function lookup(code) {
    const def = typeof code === "string" ? store.codes.get(code.toUpperCase()) : undefined;
    if (!def) throw codeError("UNKNOWN_CODE", "unknown code " + code);
    if (def.expiresAt !== null && now() >= def.expiresAt) throw codeError("EXPIRED_CODE", "code " + def.code + " has expired");
    return def;
  }

  function pendingOrder(orderId) {
    const order = getOrderRow(store, orderId);
    if (order.status !== "pending") throw codeError("ORDER_NOT_PENDING", "order " + orderId + " is " + order.status);
    return order;
  }

  // One code per order: applying another replaces it.
  function applyCode(orderId, code) {
    const order = pendingOrder(orderId);
    const def = lookup(code);
    order.code = def.code;
    order.totals = quote(order.items, def);
    log.info("code.applied", { orderId, code: def.code, discount: order.totals.discount });
    return copyOrder(order);
  }

  function removeCode(orderId) {
    const order = pendingOrder(orderId);
    order.code = null;
    order.totals = quote(order.items);
    return copyOrder(order);
  }

  return { defineCode, applyCode, removeCode };
}

module.exports = { create };
