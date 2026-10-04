// Prices a cart. Some of this is wrong: the tests will show you which parts.
function quote(cart, { coupons = [], taxBps = 0 } = {}) {
  const subtotalCents = cart.subtotalCents();

  let percent = 0;
  let fixed = 0;
  for (const c of coupons) {
    if (c.type === "percent") percent += c.value;
    else if (c.type === "fixed") fixed += c.value;
    else throw new RangeError("unknown coupon type");
  }

  const discountCents = Math.round((subtotalCents * percent) / 100) + fixed;
  const taxCents = Math.floor((subtotalCents * taxBps) / 10000);
  return {
    subtotalCents,
    discountCents,
    taxCents,
    totalCents: subtotalCents - discountCents + taxCents,
  };
}

module.exports = { quote };
