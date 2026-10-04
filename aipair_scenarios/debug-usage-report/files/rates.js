// Price in cents per 1,000 units, by plan.
const RATES = { free: 0, pro: 25, team: 18 };

function rateFor(plan) {
  if (!Object.prototype.hasOwnProperty.call(RATES, plan)) throw new RangeError("unknown plan: " + plan);
  return RATES[plan];
}

module.exports = { rateFor };
