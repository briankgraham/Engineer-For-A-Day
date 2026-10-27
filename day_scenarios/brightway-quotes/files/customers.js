// Customers with a negotiated discount off the rate card, in percent. Sales edits this list.
var CONTRACTS = {
  acme: { discountPct: 10 },
  globex: { discountPct: 15 },
  initech: { discountPct: 5 },
};

function getContract(customerId) {
  return CONTRACTS[customerId] || null;
}

module.exports = { getContract: getContract };
