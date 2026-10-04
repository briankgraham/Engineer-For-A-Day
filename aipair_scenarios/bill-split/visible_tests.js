// Read-only: these are the tests you can see. A few extra edge cases run when you finish.
const bill = (...args) => require("./bill").computeBill(...args);
const split = (...args) => require("./split").splitEvenly(...args);
const items = [{ name: "pasta", priceCents: 1500, qty: 2 }, { name: "soda", priceCents: 300, qty: 1 }];

// ---- items and tax (already working) ----
test("subtotal is price times quantity, summed", () => {
  eq(require("./items").subtotalCents(items), 3300);
});

test("tax is charged on the subtotal", () => {
  const b = bill(items, { taxBps: 1000 });
  eq(b.taxCents, 330);
  eq(b.totalCents, 3630);
});

// ---- tip ----
test("no tip by default", () => {
  eq(bill(items).tipCents, 0);
});

test("tip is a percent of the subtotal", () => {
  const b = bill(items, { tipPercent: 20 });
  eq(b.tipCents, 660);
  eq(b.totalCents, 3960);
});

test("tip is charged before tax, not on the taxed amount", () => {
  const b = bill(items, { taxBps: 1000, tipPercent: 20 });
  eq(b, { subtotalCents: 3300, taxCents: 330, tipCents: 660, totalCents: 4290 });
});

test("every amount is a whole number of cents", () => {
  const b = bill([{ name: "x", priceCents: 999, qty: 1 }], { taxBps: 825, tipPercent: 15 });
  for (const k of ["taxCents", "tipCents", "totalCents"]) assert(Number.isInteger(b[k]), k + " must be an integer");
});

// ---- split ----
test("an even split gives everyone the same share", () => {
  eq(split(900, 3), [300, 300, 300]);
});

test("shares always add up to the total", () => {
  const shares = split(1000, 3);
  eq(shares.length, 3);
  eq(shares.reduce((a, b) => a + b, 0), 1000);
});

test("extra cents go to the first people", () => {
  eq(split(100, 3), [34, 33, 33]);
  eq(split(101, 4), [26, 25, 25, 25]);
});
