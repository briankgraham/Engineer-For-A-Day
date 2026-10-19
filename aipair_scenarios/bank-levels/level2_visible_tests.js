// Level 2: top spenders.
const { createBank } = require("./bank");

const setup = () => {
  const b = createBank();
  ["alice", "bob", "carol"].forEach((id, i) => b.createAccount(i + 1, id));
  b.deposit(10, "alice", 1000); b.deposit(11, "bob", 1000); b.deposit(12, "carol", 1000);
  return b;
};

test("level 2: ranks accounts by outgoing total, highest first", () => {
  const b = setup();
  b.transfer(20, "bob", "alice", 300);
  b.transfer(21, "carol", "alice", 100);
  b.transfer(22, "bob", "carol", 50);
  eq(b.topSpenders(30, 3), ["bob(350)", "carol(100)", "alice(0)"]);
});

test("level 2: returns at most n, and every account if there are fewer", () => {
  const b = setup();
  b.transfer(20, "carol", "bob", 10);
  eq(b.topSpenders(30, 1), ["carol(10)"]);
  eq(b.topSpenders(31, 10).length, 3);
});

test("level 2: money received and failed transfers do not count", () => {
  const b = setup();
  b.transfer(20, "alice", "bob", 200);
  b.transfer(21, "bob", "alice", 5000);
  eq(b.topSpenders(30, 2), ["alice(200)", "bob(0)"]);
});
