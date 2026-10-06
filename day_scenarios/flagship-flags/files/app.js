// Flagship's evaluation service. createApp wires the modules together around one store, which stands in for one
// evaluation node plus the control plane. In production several nodes run side by side, each with its own cache.
// publish delivers a change to the nodes; here it applies it to this node, and tests pass their own.
const { createStore } = require("./store");
const flags = require("./flags");
const sync = require("./sync");
const evaluate = require("./evaluate");
const rollout = require("./rollout");

function createLog() {
  const lines = [];
  const write = level => (event, fields = {}) => { lines.push({ level, event, ...fields }); };
  return { info: write("info"), warn: write("warn"), error: write("error"), lines };
}

function createApp({ now = () => Date.now(), log = createLog(), publish } = {}) {
  const ctx = { store: createStore(), now, log };
  const syncApi = sync.create(ctx);
  ctx.publish = publish || (msg => syncApi.applyUpdate(msg));
  ctx.commit = flags.makeCommit(ctx);
  return {
    ...flags.create(ctx),
    ...syncApi,
    ...evaluate.create(ctx),
    ...rollout.create(ctx),
    log,
  };
}

module.exports = { createApp };
