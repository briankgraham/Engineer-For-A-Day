// Stock on hand, plus reservations for orders in progress.
class Inventory {
  constructor(stock = {}) {
    this.stock = new Map(Object.entries(stock));
    this.reservations = new Map(); // orderId -> [{ sku, qty }]
  }

  available(sku) {
    return this.stock.get(sku) || 0;
  }

  reserve(orderId, lines) {
    // TODO
    throw new Error("not implemented");
  }

  release(orderId) {
    // TODO
    throw new Error("not implemented");
  }
}

module.exports = { Inventory };
