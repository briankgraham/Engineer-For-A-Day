// The cart. This file works; pricing.js and inventory.js build on it.
class Cart {
  constructor() {
    this.items = new Map();
  }

  add(sku, priceCents, qty = 1) {
    if (!Number.isInteger(priceCents) || priceCents < 0) throw new RangeError("bad price");
    if (!Number.isInteger(qty) || qty < 1) throw new RangeError("bad quantity");
    const cur = this.items.get(sku);
    if (cur) cur.qty += qty;
    else this.items.set(sku, { sku, priceCents, qty });
  }

  remove(sku) {
    return this.items.delete(sku);
  }

  lines() {
    return [...this.items.values()].map(l => ({ ...l }));
  }

  subtotalCents() {
    let total = 0;
    for (const l of this.items.values()) total += l.priceCents * l.qty;
    return total;
  }
}

module.exports = { Cart };
