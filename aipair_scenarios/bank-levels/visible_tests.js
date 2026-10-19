// Level 1: accounts, deposits and transfers. More cases run when you finish.
const { createBank } = require("./bank");

test("level 1: createAccount returns true, and false for an id that already exists", () => {
  const b = createBank();
  eq(b.createAccount(1, "alice"), true);
  eq(b.createAccount(2, "bob"), true);
  eq(b.createAccount(3, "alice"), false);
});

test("level 1: deposit returns the new balance", () => {
  const b = createBank();
  b.createAccount(1, "alice");
  eq(b.deposit(2, "alice", 500), 500);
  eq(b.deposit(3, "alice", 250), 750);
});

test("level 1: deposit to an unknown account returns null", () => {
  const b = createBank();
  eq(b.deposit(1, "ghost", 100), null);
});

test("level 1: transfer returns the source balance and credits the target", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.createAccount(2, "bob");
  b.deposit(3, "alice", 1000);
  eq(b.transfer(4, "alice", "bob", 300), 700);
  eq(b.deposit(5, "bob", 1), 301);
});

test("level 1: transfer with an unknown account returns null", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.deposit(2, "alice", 100);
  eq(b.transfer(3, "alice", "ghost", 50), null);
  eq(b.transfer(4, "ghost", "alice", 50), null);
});

test("level 1: transfer without enough money returns null and changes nothing", () => {
  const b = createBank();
  b.createAccount(1, "alice"); b.createAccount(2, "bob");
  b.deposit(3, "alice", 100);
  eq(b.transfer(4, "alice", "bob", 101), null);
  eq(b.deposit(5, "alice", 1), 101);
  eq(b.deposit(6, "bob", 1), 1);
});
