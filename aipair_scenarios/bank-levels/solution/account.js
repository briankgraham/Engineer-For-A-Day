// One account for as long as it exists: its balance, what it has spent, and its balance after every change.
class Account {
  constructor(id, createdAt) {
    this.id = id;
    this.balance = 0;
    this.outgoing = 0;
    this.createdAt = createdAt;
    this.closedAt = null; // set when it is merged into another account
    this.history = [[createdAt, 0]]; // [time, balance after the change], in time order
  }

  credit(t, amount) {
    this.balance += amount;
    this.history.push([t, this.balance]);
  }

  // Transfers out and payments both count as spending for topSpenders.
  spend(t, amount) {
    this.balance -= amount;
    this.outgoing += amount;
    this.history.push([t, this.balance]);
  }

  aliveAt(t) {
    return t >= this.createdAt && (this.closedAt === null || t < this.closedAt);
  }

  // The balance after everything that happened at or before t.
  balanceAt(t) {
    let lo = 0, hi = this.history.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.history[mid][0] <= t) lo = mid; else hi = mid - 1;
    }
    return this.history[lo][1];
  }
}

module.exports = { Account };
