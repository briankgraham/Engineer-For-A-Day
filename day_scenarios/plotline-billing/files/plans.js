// Prices in integer cents. A year costs ten months.
const PLANS = {
  starter: { month: 1200, year: 12000 },
  team: { month: 4900, year: 49000 },
};
const INTERVAL_MONTHS = { month: 1, year: 12 };

function price(plan, interval) {
  const p = Object.prototype.hasOwnProperty.call(PLANS, plan) ? PLANS[plan] : null;
  if (!p || !Object.prototype.hasOwnProperty.call(p, interval)) throw new RangeError("unknown plan " + plan + "/" + interval);
  return p[interval];
}

module.exports = { PLANS, INTERVAL_MONTHS, price };
