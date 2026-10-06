// SCRAP-412: muted words. See the ticket for the rules.
// Whatever create() returns is merged into the app in app.js, so muteWord / unmuteWord / getMutes added here are
// available as app.muteWord(...) and so on. feed.js decides which posts a person sees. store.mutes holds the data.
function create({ store, now, log }) {
  return {};
}

module.exports = { create };
