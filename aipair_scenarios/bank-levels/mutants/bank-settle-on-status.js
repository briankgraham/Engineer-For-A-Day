const { Account } = require("./account");

const DAY = 24 * 60 * 60 * 1000;
const CASHBACK_PERCENT = 2;

class Bank {
  constructor() {
    this.accounts = new Map(); // live accounts by id
    this.everyAccount = new Map(); // id -> every account that has had that id, for getBalance
    this.payments = new Map(); // payment id -> { account, amount, cashbackAt, received }
    this.pending = []; // payments waiting for cashback, in cashbackAt order
    this.paymentCount = 0;
  }

  // Credits every cashback due at or before t, at the time it was due. Runs first in every operation.
  settle(t) {
    let i = 0;
    while (i < this.pending.length && this.pending[i].cashbackAt <= t) {
      const p = this.pending[i++];
      p.account.credit(p.cashbackAt, Math.floor((p.amount * CASHBACK_PERCENT) / 100));
      p.received = true;
    }
    if (i) this.pending.splice(0, i);
  }

  createAccount(timestamp, accountId) {
    if (this.accounts.has(accountId)) return false;
    const acc = new Account(accountId, timestamp);
    this.accounts.set(accountId, acc);
    if (!this.everyAccount.has(accountId)) this.everyAccount.set(accountId, []);
    this.everyAccount.get(accountId).push(acc);
    return true;
  }

  deposit(timestamp, accountId, amount) {
    const acc = this.accounts.get(accountId);
    if (!acc) return null;
    acc.credit(timestamp, amount);
    return acc.balance;
  }

  transfer(timestamp, sourceId, targetId, amount) {
    if (sourceId === targetId) return null;
    const src = this.accounts.get(sourceId), dst = this.accounts.get(targetId);
    if (!src || !dst || src.balance < amount) return null;
    src.spend(timestamp, amount);
    dst.credit(timestamp, amount);
    return src.balance;
  }

  topSpenders(timestamp, n) {
    return [...this.accounts.values()]
      .sort((a, b) => b.outgoing - a.outgoing || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .slice(0, n)
      .map(a => `${a.id}(${a.outgoing})`);
  }

  pay(timestamp, accountId, amount) {
    const acc = this.accounts.get(accountId);
    if (!acc || acc.balance < amount) return null;
    acc.spend(timestamp, amount);
    const id = "payment" + ++this.paymentCount;
    const p = { account: acc, amount, cashbackAt: timestamp + DAY, received: false };
    this.payments.set(id, p);
    this.pending.push(p);
    return id;
  }

  getPaymentStatus(timestamp, accountId, paymentId) {
    this.settle(timestamp);
    const acc = this.accounts.get(accountId), p = this.payments.get(paymentId);
    if (!acc || !p || p.account !== acc) return null;
    return p.received ? "CASHBACK_RECEIVED" : "IN_PROGRESS";
  }

  mergeAccounts(timestamp, accountId1, accountId2) {
    if (accountId1 === accountId2) return false;
    const keep = this.accounts.get(accountId1), gone = this.accounts.get(accountId2);
    if (!keep || !gone) return false;
    keep.credit(timestamp, gone.balance);
    keep.outgoing += gone.outgoing;
    gone.closedAt = timestamp;
    this.accounts.delete(accountId2);
    // Its payments (and their pending cashback) now belong to the account that absorbed it.
    for (const p of this.payments.values()) if (p.account === gone) p.account = keep;
    return true;
  }

  getBalance(timestamp, accountId, timeAt) {
    const acc = (this.everyAccount.get(accountId) || []).find(a => a.aliveAt(timeAt));
    return acc ? acc.balanceAt(timeAt) : null;
  }
}

function createBank() {
  return new Bank();
}

module.exports = { createBank };
