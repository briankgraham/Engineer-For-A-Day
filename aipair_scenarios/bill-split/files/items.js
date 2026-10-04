// Line items on a bill. This file works; bill.js and split.js build on it.
// An item is { name, priceCents, qty }. All money is whole integer cents.
function subtotalCents(items) {
  let total = 0;
  for (const it of items) {
    if (!Number.isInteger(it.priceCents) || it.priceCents < 0) throw new RangeError("bad price");
    if (!Number.isInteger(it.qty) || it.qty < 1) throw new RangeError("bad quantity");
    total += it.priceCents * it.qty;
  }
  return total;
}

module.exports = { subtotalCents };
