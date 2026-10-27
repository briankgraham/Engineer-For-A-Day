var util = require("./util");
var config = require("./config");

// Ops endpoint, called every Monday with the carrier's new fuel percentage.
function create(ctx) {
  function setFuelPct(pct) {
    if (typeof pct !== "number" || !(pct >= 0 && pct <= 40)) throw new RangeError("fuel percentage must be from 0 to 40");
    config.fuelPct = pct;
    ctx.log.info("config.fuel", { fuelPct: pct });
  }

  return { setFuelPct: setFuelPct };
}

module.exports = { create: create };
