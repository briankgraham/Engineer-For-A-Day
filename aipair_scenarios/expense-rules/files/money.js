// Money helpers. This file works.
// Dollar amounts are strings with at most two decimals ("49.99", "75", "0.10"), never floats,
// so work in integer cents: toCents("49.99") === 4999.
function toCents(usd) {
  if (typeof usd !== "string" || !/^\d+(\.\d{1,2})?$/.test(usd)) throw new RangeError("bad dollar amount " + JSON.stringify(usd));
  const [dollars, cents = ""] = usd.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
}

// For messages and logs: fromCents(4999) === "49.99"
function fromCents(cents) {
  return Math.floor(cents / 100) + "." + String(cents % 100).padStart(2, "0");
}

module.exports = { toCents, fromCents };
