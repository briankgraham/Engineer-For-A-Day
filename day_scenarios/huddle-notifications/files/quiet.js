// PING-231: quiet hours. See the ticket for the rules.
// Whatever create() returns is merged into the app in app.js, so setQuietHours / heldCount / deliverHeld
// added here are available as app.setQuietHours(...) and so on. fanout.js decides who gets a push.
function create({ store, push, now, log }) {
  return {};
}

module.exports = { create };
