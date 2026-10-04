// SHIP-142: discount codes. See the ticket for the rules.
// Whatever create() returns is merged into the app in app.js, so defineCode / applyCode / removeCode
// added here are available as app.defineCode(...) and so on.
function create({ store, now, log }) {
  return {};
}

module.exports = { create };
