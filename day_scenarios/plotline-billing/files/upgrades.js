// BILL-88: upgrades mid-cycle. See the ticket for the rules.
// Whatever create() returns is merged into the app in app.js, so an upgrade() added here is available as app.upgrade(...).
// chargeInvoice (invoices.js), boundary (subscriptions.js) and the date helpers in tz.js are there to use.
function create({ store, now, gateway, log }) {
  return {};
}

module.exports = { create };
