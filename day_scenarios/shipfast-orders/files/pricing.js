// Order totals. All money is integer cents.
const TAX_BPS = 800;              // 8.00% sales tax
const SHIPPING_CENTS = 599;
const FREE_SHIPPING_FROM = 5000;  // $50.00 or more ships free

function subtotalOf(items) {
  return items.reduce((sum, it) => sum + it.priceCents * it.qty, 0);
}

function quote(items) {
  const subtotal = subtotalOf(items);
  const tax = Math.round((subtotal * TAX_BPS) / 10000);
  const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_CENTS;
  return { subtotal, discount: 0, tax, shipping, total: subtotal + tax + shipping };
}

module.exports = { quote, subtotalOf, TAX_BPS, SHIPPING_CENTS, FREE_SHIPPING_FROM };
