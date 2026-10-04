// Read-only: these are the tests you can see. A few extra edge cases run when you finish.
const cartOf = (...lines) => {
  const { Cart } = require("./cart");
  const c = new Cart();
  for (const [sku, price, qty] of lines) c.add(sku, price, qty);
  return c;
};
const quote = (...args) => require("./pricing").quote(...args);
const stockOf = stock => new (require("./inventory").Inventory)(stock);

// ---- cart ----
test("cart merges the same sku and adds up quantity", () => {
  const c = cartOf(["a", 500, 1], ["a", 500, 2]);
  eq(c.lines(), [{ sku: "a", priceCents: 500, qty: 3 }]);
});

test("cart subtotal is price times quantity, summed", () => {
  eq(cartOf(["a", 500, 2], ["b", 250, 1]).subtotalCents(), 1250);
});

test("cart rejects a bad price or quantity", () => {
  const { Cart } = require("./cart");
  throws(() => new Cart().add("a", 1.5), RangeError);
  throws(() => new Cart().add("a", 100, 0), RangeError);
});

// ---- pricing ----
test("no coupon and no tax: total equals the subtotal", () => {
  eq(quote(cartOf(["a", 1000, 2])), { subtotalCents: 2000, discountCents: 0, taxCents: 0, totalCents: 2000 });
});

test("a percent coupon reduces the subtotal", () => {
  const q = quote(cartOf(["a", 1000, 2]), { coupons: [{ type: "percent", value: 10 }] });
  eq(q.discountCents, 200);
  eq(q.totalCents, 1800);
});

test("fixed coupons stack, and apply after the percent coupon", () => {
  const q = quote(cartOf(["a", 1000, 2]), { coupons: [{ type: "fixed", value: 100 }, { type: "percent", value: 10 }] });
  eq(q.discountCents, 300);
  eq(q.totalCents, 1700);
});

test("tax is charged on the discounted amount", () => {
  const q = quote(cartOf(["a", 1000, 2]), { coupons: [{ type: "percent", value: 10 }], taxBps: 1000 });
  eq(q.taxCents, 180);
  eq(q.totalCents, 1980);
});

test("only the largest percent coupon applies", () => {
  const q = quote(cartOf(["a", 1000, 2]), { coupons: [{ type: "percent", value: 10 }, { type: "percent", value: 20 }] });
  eq(q.discountCents, 400);
});

// ---- inventory ----
test("available reports stock on hand, 0 for unknown skus", () => {
  const inv = stockOf({ a: 5 });
  eq(inv.available("a"), 5);
  eq(inv.available("nope"), 0);
});

test("reserve takes units out of available stock", () => {
  const inv = stockOf({ a: 5, b: 2 });
  inv.reserve("o1", [{ sku: "a", qty: 2 }, { sku: "b", qty: 1 }]);
  eq(inv.available("a"), 3);
  eq(inv.available("b"), 1);
});

test("reserve is all-or-nothing when one line is short", () => {
  const inv = stockOf({ a: 5, b: 1 });
  let err;
  try {
    inv.reserve("o1", [{ sku: "a", qty: 2 }, { sku: "b", qty: 2 }]);
  } catch (e) {
    err = e;
  }
  assert(err && /insufficient/i.test(err.message), "expected an 'insufficient stock' error");
  eq(inv.available("a"), 5, "stock of a must be untouched");
  eq(inv.available("b"), 1, "stock of b must be untouched");
});

test("release puts the reserved units back and returns the lines", () => {
  const inv = stockOf({ a: 5 });
  inv.reserve("o1", [{ sku: "a", qty: 3 }]);
  eq(inv.release("o1"), [{ sku: "a", qty: 3 }]);
  eq(inv.available("a"), 5);
});
