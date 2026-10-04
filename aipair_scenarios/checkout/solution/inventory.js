class Inventory {
  constructor(stock = {}) {
    this.stock = new Map(Object.entries(stock));
    this.reservations = new Map();
  }

  available(sku) {
    return this.stock.get(sku) || 0;
  }

  reserve(orderId, lines) {
    if (this.reservations.has(orderId)) throw new Error("already reserved");
    const need = new Map();
    for (const l of lines) {
      if (!Number.isInteger(l.qty) || l.qty < 1) throw new RangeError("bad quantity");
      need.set(l.sku, (need.get(l.sku) || 0) + l.qty);
    }
    for (const [sku, qty] of need) {
      if (this.available(sku) < qty) throw new Error("insufficient stock for " + sku);
    }
    for (const [sku, qty] of need) this.stock.set(sku, this.available(sku) - qty);
    this.reservations.set(orderId, lines.map(l => ({ sku: l.sku, qty: l.qty })));
  }

  release(orderId) {
    const lines = this.reservations.get(orderId);
    if (!lines) return [];
    for (const l of lines) this.stock.set(l.sku, this.available(l.sku) + l.qty);
    this.reservations.delete(orderId);
    return lines;
  }
}

module.exports = { Inventory };
