// BRT-204: multi-parcel shipments. See the ticket for the rules.
// Whatever create() returns is merged into the app in app.js, so quoteShipment added here is available as app.quoteShipment(...).
// quote.js prices a single parcel and is used by every integration today.
function create(ctx) {
  return {};
}

module.exports = { create: create };
