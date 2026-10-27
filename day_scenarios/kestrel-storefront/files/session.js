// Page start-up: loads what the shopper already has.
function create({ store, api, log }) {
  async function loadCart() {
    const res = await api.getCart();
    const items = {};
    for (const i of res.items) items[i.sku] = { sku: i.sku, title: i.title, unitPrice: i.unitPrice, qty: i.qty, confirmed: i.qty, pending: false, error: null };
    store.update(s => ({ ...s, cart: { order: res.items.map(i => i.sku), items, announcement: "" } }));
    log.info("cart.loaded", { lines: res.items.length });
  }

  return { loadCart };
}

module.exports = { create };
