// Hidden level 3 cases
const { createBank } = require("./bank");
const DAY = 86400000;

test("level 3: cashback is credited even if nobody checks the payment status", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.deposit(2, "alice", 1000);
  b.pay(10, "alice", 1000);
  eq(b.deposit(10 + DAY * 2, "alice", 100), 120);
});

test("level 3: cashback due exactly now is credited before the operation", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.deposit(2, "alice", 1000);
  const p = b.pay(10, "alice", 1000);
  eq(b.deposit(10 + DAY - 1, "alice", 1), 1);
  eq(b.deposit(10 + DAY, "alice", 1), 22);
  eq(b.getPaymentStatus(10 + DAY + 1, "alice", p), "CASHBACK_RECEIVED");
});

test("level 3: cashback is rounded down", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.deposit(2, "alice", 175);
  b.pay(3, "alice", 175);
  eq(b.deposit(3 + DAY, "alice", 10), 13);
  b.createAccount(4 + DAY, "bob"); b.deposit(5 + DAY, "bob", 49);
  b.pay(6 + DAY, "bob", 49);
  eq(b.deposit(6 + DAY * 2, "bob", 1), 1);
});

test("level 3: cashback for one account is credited by an operation on another", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.createAccount(2, "bob"); b.deposit(3, "alice", 1000);
  b.pay(4, "alice", 500);
  b.deposit(4 + DAY, "bob", 5);
  eq(b.transfer(5 + DAY, "alice", "bob", 510), 0);
});

test("level 3: payment status is null for another account, an unknown payment or an unknown account", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.createAccount(2, "bob"); b.deposit(3, "alice", 100);
  const p = b.pay(4, "alice", 10);
  eq(b.getPaymentStatus(5, "bob", p), null);
  eq(b.getPaymentStatus(6, "alice", "payment99"), null);
  eq(b.getPaymentStatus(7, "ghost", p), null);
});

test("level 3: failed payments do not use up a payment id", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.deposit(2, "alice", 100);
  eq(b.pay(3, "alice", 500), null);
  eq(b.pay(4, "alice", 50), "payment1");
});

test("level 3: cashback does not reduce the outgoing total", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.deposit(2, "alice", 1000);
  b.pay(3, "alice", 1000);
  eq(b.topSpenders(4 + DAY, 1), ["alice(1000)"]);
});
