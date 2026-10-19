// Charges we know about, keyed by the provider's charge id.
// A charge is { id, account, amount, refunded }, amounts in integer cents.
class Payments {
  constructor() {
    this.byId = new Map();
  }

  get(id) {
    return this.byId.get(id) || null;
  }

  put(charge) {
    this.byId.set(charge.id, { ...charge });
    return this.get(charge.id);
  }
}

module.exports = { Payments };
