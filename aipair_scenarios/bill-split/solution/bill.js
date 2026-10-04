const { subtotalCents } = require("./items");

function computeBill(items, { taxBps = 0, tipPercent = 0 } = {}) {
  if (!Number.isInteger(tipPercent) || tipPercent < 0 || tipPercent > 100) throw new RangeError("bad tip");
  const subtotal = subtotalCents(items);
  const taxCents = Math.round((subtotal * taxBps) / 10000);
  const tipCents = Math.round((subtotal * tipPercent) / 100);
  return {
    subtotalCents: subtotal,
    taxCents,
    tipCents,
    totalCents: subtotal + taxCents + tipCents,
  };
}

module.exports = { computeBill };
