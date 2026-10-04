// Plotline billing service. createApp wires the modules together around one store.
// In production the gateway is the Tollgate client and now is Date.now; tests pass fakes.
const { createStore } = require("./store");
const customers = require("./customers");
const subscriptions = require("./subscriptions");
const invoices = require("./invoices");
const renewals = require("./renewals");
const upgrades = require("./upgrades");

function createLog() {
  const lines = [];
  const write = level => (event, fields = {}) => { lines.push({ level, event, ...fields }); };
  return { info: write("info"), warn: write("warn"), error: write("error"), lines };
}

function createApp({ gateway, now = () => Date.now(), log = createLog() } = {}) {
  const ctx = { store: createStore(), gateway, now, log };
  const { renew, ...subs } = subscriptions.create(ctx);
  return {
    ...customers.create(ctx),
    ...subs,
    ...invoices.create(ctx),
    ...renewals.create(ctx, { renew }),
    ...upgrades.create(ctx),
    log,
  };
}

module.exports = { createApp };
