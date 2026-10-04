// Shipfast orders service. createApp wires the modules together around one store.
// In production the gateway is the Paystream client and now is Date.now; tests pass fakes.
const { createStore } = require("./store");
const orders = require("./orders");
const payments = require("./payments");
const webhooks = require("./webhooks");
const inventory = require("./inventory");
const discounts = require("./discounts");

function createLog() {
  const lines = [];
  const write = level => (event, fields = {}) => { lines.push({ level, event, ...fields }); };
  return { info: write("info"), warn: write("warn"), error: write("error"), lines };
}

function createApp({ gateway, now = () => Date.now(), log = createLog() } = {}) {
  const ctx = { store: createStore(), gateway, now, log };
  return {
    ...orders.create(ctx),
    ...payments.create(ctx),
    ...webhooks.create(ctx),
    ...inventory.create(ctx),
    ...discounts.create(ctx),
    log,
  };
}

module.exports = { createApp };
