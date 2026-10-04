// Totals a bill. Tax works today; the tip is still to do.
const { subtotalCents } = require("./items");

function computeBill(items, { taxBps = 0 } = {}) {
  const subtotal = subtotalCents(items);
  const taxCents = Math.round((subtotal * taxBps) / 10000);
  return {
    subtotalCents: subtotal,
    taxCents,
    totalCents: subtotal + taxCents,
  };
}

module.exports = { computeBill };
