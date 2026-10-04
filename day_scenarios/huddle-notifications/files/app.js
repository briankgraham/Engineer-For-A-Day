// Huddle notifications service. createApp wires the modules together around one store.
// In production push is the Pushly client and now is Date.now; tests pass fakes.
const { createStore } = require("./store");
const users = require("./users");
const fanout = require("./fanout");
const ratelimit = require("./ratelimit");
const quiet = require("./quiet");

function createLog() {
  const lines = [];
  const write = level => (event, fields = {}) => { lines.push({ level, event, ...fields }); };
  return { info: write("info"), warn: write("warn"), error: write("error"), lines };
}

function createApp({ push, now = () => Date.now(), log = createLog() } = {}) {
  const ctx = { store: createStore(), push, now, log };
  ctx.limiter = ratelimit.create(ctx);
  return {
    ...users.create(ctx),
    ...fanout.create(ctx),
    ...quiet.create(ctx),
    ...ctx.limiter,
    log,
  };
}

module.exports = { createApp };
