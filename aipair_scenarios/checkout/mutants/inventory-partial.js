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
    for (const l of lines) {
      if (!Number.isInteger(l.qty) || l.qty < 1) throw new RangeError("bad quantity");
      if (this.available(l.sku) < l.qty) throw new Error("insufficient stock for " + l.sku);
      this.stock.set(l.sku, this.available(l.sku) - l.qty);
    }
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
