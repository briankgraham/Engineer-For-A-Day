// FLAG-310: percentage rollouts. See the ticket for the rules.
// Whatever create() returns is merged into the app in app.js, so setRollout / bucketOf added here are available as
// app.setRollout(...) and so on. evaluate.js is where evaluation decides who is in. Use ctx.commit(row) after changing
// a row: it bumps the version and publishes the change to the nodes.
function create({ store, commit, log }) {
  return {};
}

module.exports = { create };
