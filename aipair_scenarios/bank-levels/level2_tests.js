// Hidden level 2 cases
const { createBank } = require("./bank");

test("level 2: ties are sorted by account id, not by creation order", () => {
  const b = createBank();
  ["zed", "mia", "amy"].forEach((id, i) => { b.createAccount(i + 1, id); b.deposit(i + 10, id, 100); });
  b.transfer(20, "zed", "amy", 40);
  b.transfer(21, "amy", "mia", 40);
  eq(b.topSpenders(30, 3), ["amy(40)", "zed(40)", "mia(0)"]);
});

test("level 2: deposits never count as spending", () => {
  const b = createBank();
  b.createAccount(1, "a"); b.createAccount(2, "b");
  b.deposit(3, "a", 999);
  eq(b.topSpenders(4, 2), ["a(0)", "b(0)"]);
});

test("level 2: outgoing totals add up across many transfers", () => {
  const b = createBank();
  b.createAccount(1, "a"); b.createAccount(2, "b"); b.deposit(3, "a", 100);
  for (let i = 0; i < 5; i++) b.transfer(10 + i, "a", "b", 7);
  b.transfer(20, "b", "a", 1);
  eq(b.topSpenders(30, 2), ["a(35)", "b(1)"]);
});
