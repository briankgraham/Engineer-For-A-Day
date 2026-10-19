// A fake ledger standing in for the database. Writes are async, like a real database call.
// Amounts are integer cents; a refund is a negative entry. Each entry keeps the event id as its ref.
// Test hook: failNextWrite() makes the next credit or debit throw, as if the database timed out.
class Ledger {
  constructor() {
    this.entries = [];
    this._fail = 0;
  }

  failNextWrite(n = 1) {
    this._fail += n;
  }

  async credit(account, cents, ref) {
    return this._write(account, cents, ref);
  }

  async debit(account, cents, ref) {
    return this._write(account, -cents, ref);
  }

  async _write(account, cents, ref) {
    await null;
    if (this._fail > 0) {
      this._fail--;
      throw new Error("ledger unavailable");
    }
    if (!Number.isInteger(cents)) throw new TypeError("cents must be an integer");
    this.entries.push({ account, cents, ref });
  }

  balance(account) {
    return this.entries.filter(e => e.account === account).reduce((sum, e) => sum + e.cents, 0);
  }
}

module.exports = { Ledger };
