// Level 4: merges and balance history.
const { createBank } = require("./bank");

test("level 4: merging adds the balance and removes the second account", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.createAccount(2, "bob");
  b.deposit(3, "alice", 100); b.deposit(4, "bob", 250);
  eq(b.mergeAccounts(5, "alice", "bob"), true);
  eq(b.deposit(6, "alice", 1), 351);
  eq(b.deposit(7, "bob", 1), null);
});

test("level 4: merge returns false for the same id or an unknown account", () => {
  const b = createBank();
  b.createAccount(1, "alice");
  eq(b.mergeAccounts(2, "alice", "alice"), false);
  eq(b.mergeAccounts(3, "alice", "ghost"), false);
  eq(b.mergeAccounts(4, "ghost", "alice"), false);
});

test("level 4: outgoing totals are combined and the merged account leaves topSpenders", () => {
  const b = createBank();
  ["alice", "bob", "carol"].forEach((id, i) => { b.createAccount(i + 1, id); b.deposit(i + 10, id, 500); });
  b.transfer(20, "alice", "carol", 100); b.transfer(21, "bob", "carol", 300); b.transfer(22, "carol", "bob", 250);
  b.mergeAccounts(30, "alice", "bob");
  eq(b.topSpenders(31, 5), ["alice(400)", "carol(250)"]);
});

test("level 4: getBalance returns the balance at a past time", () => {
  const b = createBank();
  b.createAccount(10, "alice");
  b.deposit(20, "alice", 100);
  b.deposit(30, "alice", 50);
  eq(b.getBalance(40, "alice", 10), 0);
  eq(b.getBalance(41, "alice", 20), 100);
  eq(b.getBalance(42, "alice", 25), 100);
  eq(b.getBalance(43, "alice", 30), 150);
  eq(b.getBalance(44, "alice", 5), null);
});
