// KES-318: the cart quantity stepper. See the ticket for the rules.
// Whatever create() returns is merged into the app in app.js, so setQuantity / undoRemove / getCart / renderCart added here are
// available as app.setQuantity(...) and so on. session.js loads the cart into store.cart; api.js talks to the server.
function create({ store, api, now, log }) {
  return {};
}

module.exports = { create };
