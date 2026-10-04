// Hidden edge cases (run when the candidate finishes, on top of visible_tests.js)
const bill = (...args) => require("./bill").computeBill(...args);
const split = (...args) => require("./split").splitEvenly(...args);

test("tip rounds halves up", () => {
  eq(bill([{ name: "x", priceCents: 10, qty: 1 }], { tipPercent: 5 }).tipCents, 1);
});

test("a tip over 100 or a fractional tip throws RangeError", () => {
  const one = [{ name: "x", priceCents: 100, qty: 1 }];
  throws(() => bill(one, { tipPercent: 101 }), RangeError);
  throws(() => bill(one, { tipPercent: -1 }), RangeError);
  throws(() => bill(one, { tipPercent: 12.5 }), RangeError);
});

test("a bill that is tipped, taxed and split still adds up", () => {
  const b = bill([{ name: "x", priceCents: 1999, qty: 1 }], { taxBps: 725, tipPercent: 18 });
  const shares = split(b.totalCents, 7);
  eq(shares.reduce((a, c) => a + c, 0), b.totalCents);
  assert(Math.max(...shares) - Math.min(...shares) <= 1, "shares differ by more than a cent");
});

test("splitting fewer cents than people gives some people 0", () => {
  eq(split(2, 5), [1, 1, 0, 0, 0]);
});

test("splitting 0 gives everyone 0", () => {
  eq(split(0, 3), [0, 0, 0]);
});

test("one person pays the whole total", () => {
  eq(split(1234, 1), [1234]);
});

test("split rejects bad input", () => {
  throws(() => split(100, 0), RangeError);
  throws(() => split(100, 2.5), RangeError);
  throws(() => split(-1, 2), RangeError);
  throws(() => split(10.5, 2), RangeError);
});
