// Order totals. All money is integer cents.
const TAX_BPS = 800;              // 8.00% sales tax
const SHIPPING_CENTS = 599;
const FREE_SHIPPING_FROM = 5000;  // $50.00 or more ships free

function subtotalOf(items) {
  return items.reduce((sum, it) => sum + it.priceCents * it.qty, 0);
}

// code: null, or a defined discount code { type: "percent" | "fixed", value }.
// Percent discounts round down to the cent; a fixed discount never exceeds the subtotal.
function discountFor(subtotal, code) {
  if (!code) return 0;
  if (code.type === "percent") return Math.floor((subtotal * code.value) / 100);
  return Math.min(code.value, subtotal);
}

// The discount comes off the items before tax, and free shipping looks at what the customer pays for the items.
function quote(items, code = null) {
  const subtotal = subtotalOf(items);
  const discount = discountFor(subtotal, code);
  const taxable = subtotal - discount;
  const tax = Math.round((taxable * TAX_BPS) / 10000);
  const shipping = taxable >= FREE_SHIPPING_FROM ? 0 : SHIPPING_CENTS;
  return { subtotal, discount, tax, shipping, total: taxable + tax + shipping };
}

module.exports = { quote, subtotalOf, TAX_BPS, SHIPPING_CENTS, FREE_SHIPPING_FROM };
