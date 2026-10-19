// Hidden level 1 cases (run when the candidate finishes)
const { createBank } = require("./bank");

test("level 1: a transfer to the same account returns null and changes nothing", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.deposit(2, "alice", 500);
  eq(b.transfer(3, "alice", "alice", 200), null);
  eq(b.deposit(4, "alice", 1), 501);
});

test("level 1: a transfer of the whole balance leaves 0", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.createAccount(2, "bob");
  b.deposit(3, "alice", 400);
  eq(b.transfer(4, "alice", "bob", 400), 0);
  eq(b.transfer(5, "alice", "bob", 1), null);
});

test("level 1: a transfer to an unknown account does not debit the source", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.deposit(2, "alice", 100);
  b.transfer(3, "alice", "ghost", 60);
  eq(b.deposit(4, "alice", 1), 101);
});

test("level 1: a duplicate createAccount does not reset the balance", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.deposit(2, "alice", 70);
  b.createAccount(3, "alice");
  eq(b.deposit(4, "alice", 1), 71);
});

test("level 1: two banks do not share accounts", () => {
  const a = createBank(), c = createBank();
  a.createAccount(1, "alice");
  eq(c.deposit(2, "alice", 5), null);
  eq(c.createAccount(3, "alice"), true);
});
