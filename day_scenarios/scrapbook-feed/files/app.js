// Scrapbook's feed service. createApp wires the modules together around one store.
// In production now is Date.now; tests pass a fake clock.
const { createStore } = require("./store");
const users = require("./users");
const posts = require("./posts");
const feed = require("./feed");
const mutes = require("./mutes");

function createLog() {
  const lines = [];
  const write = level => (event, fields = {}) => { lines.push({ level, event, ...fields }); };
  return { info: write("info"), warn: write("warn"), error: write("error"), lines };
}

function createApp({ now = () => Date.now(), log = createLog() } = {}) {
  const ctx = { store: createStore(), now, log };
  return {
    ...users.create(ctx),
    ...posts.create(ctx),
    ...feed.create(ctx),
    ...mutes.create(ctx),
    log,
  };
}

module.exports = { createApp };
