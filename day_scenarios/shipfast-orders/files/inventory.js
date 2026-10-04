// Units on hand per SKU. Stock is taken when an order is paid (see webhooks.js).
function create({ store }) {
  function setStock(sku, units) {
    if (typeof sku !== "string" || !Number.isInteger(units) || units < 0) throw new TypeError("bad stock update");
    store.stock.set(sku, units);
  }

  function stock(sku) {
    return store.stock.get(sku) || 0;
  }

  return { setStock, stock };
}

module.exports = { create };
