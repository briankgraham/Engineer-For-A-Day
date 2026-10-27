// Kestrel's storefront web app, without the DOM. createApp wires the modules together around one store.
// In production fetch and now are the browser's; tests pass fakes.
const { createStore, initialState } = require("./store");
const api = require("./api");
const session = require("./session");
const search = require("./search");
const cart = require("./cart");

function createLog() {
  const lines = [];
  const write = level => (event, fields = {}) => { lines.push({ level, event, ...fields }); };
  return { info: write("info"), warn: write("warn"), error: write("error"), lines };
}

// flags come from remote config. searchMinChars is the shortest query (in characters) the search box sends.
function createApp({ fetch, now = () => Date.now(), log = createLog(), flags = {} } = {}) {
  const store = createStore(initialState());
  const ctx = { store, now, log, flags: { searchMinChars: 1, ...flags } };
  ctx.api = api.create({ fetch, log });
  return {
    ...session.create(ctx),
    ...search.create(ctx),
    ...cart.create(ctx),
    store,
    log,
  };
}

module.exports = { createApp };
