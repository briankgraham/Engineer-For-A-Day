// Level 3: payments with cashback.
const { createBank } = require("./bank");
const DAY = 86400000;

test("level 3: pay withdraws and returns payment ids counted across the bank", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.createAccount(2, "bob");
  b.deposit(3, "alice", 1000); b.deposit(4, "bob", 1000);
  eq(b.pay(5, "alice", 200), "payment1");
  eq(b.pay(6, "bob", 100), "payment2");
  eq(b.deposit(7, "alice", 1), 801);
});

test("level 3: pay returns null for an unknown account or not enough money", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.deposit(2, "alice", 50);
  eq(b.pay(3, "ghost", 10), null);
  eq(b.pay(4, "alice", 51), null);
  eq(b.deposit(5, "alice", 1), 51);
});

test("level 3: 2% cashback arrives 24 hours after the payment", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.deposit(2, "alice", 1000);
  const p = b.pay(10, "alice", 500);
  eq(b.getPaymentStatus(11, "alice", p), "IN_PROGRESS");
  eq(b.getPaymentStatus(10 + DAY + 5, "alice", p), "CASHBACK_RECEIVED");
  eq(b.deposit(10 + DAY + 6, "alice", 1), 511);
});

test("level 3: payments count toward topSpenders", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.createAccount(2, "bob");
  b.deposit(3, "alice", 1000); b.deposit(4, "bob", 1000);
  b.pay(5, "alice", 100); b.transfer(6, "bob", "alice", 50);
  eq(b.topSpenders(7, 2), ["alice(100)", "bob(50)"]);
});
