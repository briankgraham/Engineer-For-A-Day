// Hidden level 4 cases
const { createBank } = require("./bank");
const DAY = 86400000;

test("level 4: before the merge, account 1 history does not include account 2", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.createAccount(2, "bob");
  b.deposit(3, "bob", 250); b.deposit(4, "alice", 100);
  b.mergeAccounts(10, "alice", "bob");
  eq(b.getBalance(11, "alice", 3), 0);
  eq(b.getBalance(12, "alice", 5), 100);
  eq(b.getBalance(13, "alice", 10), 350);
});

test("level 4: account 2 has its own history before the merge and none after", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.createAccount(2, "bob");
  b.deposit(3, "bob", 250);
  b.mergeAccounts(10, "alice", "bob");
  eq(b.getBalance(11, "bob", 9), 250);
  eq(b.getBalance(12, "bob", 10), null);
  eq(b.getBalance(13, "bob", 11), null);
});

test("level 4: pending cashback of a merged account is paid to account 1", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.createAccount(2, "bob");
  b.deposit(3, "bob", 1000);
  const p = b.pay(4, "bob", 1000);
  b.mergeAccounts(5, "alice", "bob");
  eq(b.getPaymentStatus(6, "alice", p), "IN_PROGRESS");
  eq(b.getPaymentStatus(7, "bob", p), null);
  eq(b.deposit(4 + DAY, "alice", 1), 21);
  eq(b.getPaymentStatus(5 + DAY, "alice", p), "CASHBACK_RECEIVED");
});

test("level 4: cashback shows in the history at the time it was due", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.deposit(2, "alice", 1000);
  b.pay(10, "alice", 500);
  eq(b.getBalance(10 + DAY * 3, "alice", 10 + DAY - 1), 500);
  eq(b.getBalance(10 + DAY * 3 + 1, "alice", 10 + DAY), 510);
});

test("level 4: a merged id can be reused for a new, empty account", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.createAccount(2, "bob");
  b.deposit(3, "bob", 70);
  b.mergeAccounts(10, "alice", "bob");
  eq(b.createAccount(20, "bob"), true);
  eq(b.deposit(21, "bob", 5), 5);
  eq(b.getBalance(30, "bob", 5), 70);
  eq(b.getBalance(31, "bob", 15), null);
  eq(b.getBalance(32, "bob", 21), 5);
  eq(b.getBalance(33, "alice", 21), 70);
});

test("level 4: a chain of merges keeps every balance and payment", () => {
  const b = createBank();
  ["a", "b", "c"].forEach((id, i) => { b.createAccount(i + 1, id); b.deposit(i + 10, id, 100 * (i + 1)); });
  const p = b.pay(20, "c", 300);
  b.mergeAccounts(21, "b", "c");
  b.mergeAccounts(22, "a", "b");
  eq(b.getPaymentStatus(23, "a", p), "IN_PROGRESS");
  eq(b.deposit(20 + DAY, "a", 1), 100 + 200 + 0 + 6 + 1);
  eq(b.topSpenders(21 + DAY, 3), ["a(300)"]);
});
