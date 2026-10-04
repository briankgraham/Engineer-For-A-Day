// Hidden edge cases (run when the candidate finishes, on top of visible_tests.js)
const cartOf = (...lines) => {
  const { Cart } = require("./cart");
  const c = new Cart();
  for (const [sku, price, qty] of lines) c.add(sku, price, qty);
  return c;
};
const quote = (...args) => require("./pricing").quote(...args);
const stockOf = stock => new (require("./inventory").Inventory)(stock);

test("the discount never exceeds the subtotal", () => {
  const q = quote(cartOf(["a", 1000, 2]), { coupons: [{ type: "fixed", value: 5000 }], taxBps: 1000 });
  eq(q, { subtotalCents: 2000, discountCents: 2000, taxCents: 0, totalCents: 0 });
});

test("tax rounds halves up", () => {
  eq(quote(cartOf(["a", 1000, 1]), { taxBps: 5 }).taxCents, 1);
});

test("an unknown coupon type throws RangeError", () => {
  throws(() => quote(cartOf(["a", 100, 1]), { coupons: [{ type: "bogus", value: 1 }] }), RangeError);
});

test("reserving the same order twice throws and changes nothing", () => {
  const inv = stockOf({ a: 5 });
  inv.reserve("o1", [{ sku: "a", qty: 2 }]);
  throws(() => inv.reserve("o1", [{ sku: "a", qty: 1 }]), Error);
  eq(inv.available("a"), 3);
});

test("lines for the same sku are added up before checking stock", () => {
  const inv = stockOf({ a: 5 });
  throws(() => inv.reserve("o1", [{ sku: "a", qty: 3 }, { sku: "a", qty: 3 }]), Error);
  eq(inv.available("a"), 5);
});

test("release of an unknown order is a no-op that returns []", () => {
  const inv = stockOf({ a: 5 });
  eq(inv.release("ghost"), []);
  eq(inv.available("a"), 5);
});

test("reserve rejects a bad quantity", () => {
  throws(() => stockOf({ a: 5 }).reserve("o1", [{ sku: "a", qty: 0 }]), RangeError);
});
