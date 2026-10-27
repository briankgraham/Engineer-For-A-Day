// Brightway's quote service. createApp wires the modules together.
// In production now is Date.now; tests pass a fake clock.
var quote = require("./quote");
var shipment = require("./shipment");
var admin = require("./admin");

function createLog() {
  var lines = [];
  function write(level) { return function (event, fields) { lines.push(Object.assign({ level: level, event: event }, fields || {})); }; }
  return { info: write("info"), warn: write("warn"), error: write("error"), lines: lines };
}

function createApp(opts) {
  opts = opts || {};
  var ctx = { now: opts.now || Date.now, log: opts.log || createLog() };
  return Object.assign({}, quote.create(ctx), shipment.create(ctx), admin.create(ctx), { log: ctx.log });
}

module.exports = { createApp: createApp };
