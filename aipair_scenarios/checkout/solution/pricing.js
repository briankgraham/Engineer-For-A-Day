function quote(cart, { coupons = [], taxBps = 0 } = {}) {
  const subtotalCents = cart.subtotalCents();

  let percent = 0;
  let fixed = 0;
  for (const c of coupons) {
    if (c.type === "percent") percent = Math.max(percent, c.value);
    else if (c.type === "fixed") fixed += c.value;
    else throw new RangeError("unknown coupon type");
  }

  const afterPercent = subtotalCents - Math.round((subtotalCents * percent) / 100);
  const discounted = Math.max(0, afterPercent - fixed);
  const taxCents = Math.round((discounted * taxBps) / 10000);
  return {
    subtotalCents,
    discountCents: subtotalCents - discounted,
    taxCents,
    totalCents: discounted + taxCents,
  };
}

module.exports = { quote };
