var util = require("./util");
var config = require("./config");
var RATES = require("./rates").RATES;
var zoneFor = require("./zones").zoneFor;
var getContract = require("./customers").getContract;

// Written in 2017 and touched by many people since. Customers see these numbers, so be careful.
// Contract customers get a percentage off the rate card.
function applyContract(rates, contract) {
  for (var z in rates) {
    rates[z].base = Math.round(rates[z].base * (100 - contract.discountPct) / 100);
    rates[z].perKg = Math.round(rates[z].perKg * (100 - contract.discountPct) / 100);
  }
  return rates;
}

function create(ctx) {
  var log = ctx.log;

  // req: { service: "ground" | "air" (default "ground"), to: { country, postcode }, weightKg (or weight_lbs),
  //        dims: { l, w, h } in cm, residential, pickupAt (ms), customerId }
  // Returns { amount (cents), currency, zone, chargeableKg }.
  function quote(req) {
    if (!req || !req.to || typeof req.to.country !== "string") throw new TypeError("a quote needs a destination");
    var service = req.service || "ground";
    var rates = RATES[service];
    if (!rates) throw util.codeError("BAD_SERVICE", "unknown service " + service);
    var w = req.weight_lbs ? req.weight_lbs * 0.4536 : req.weightKg;
    if (typeof w !== "number" || !(w > 0)) throw new RangeError("weight must be positive");
    if (req.dims) {
      var vol = req.dims.l * req.dims.w * req.dims.h / 5000;
      if (vol > w) w = vol;
    }
    w = Math.ceil(w * 2) / 2;
    var zone = zoneFor(req.to.country, req.to.postcode);
    var contract = req.customerId ? getContract(req.customerId) : null;
    if (contract) rates = applyContract(rates, contract);
    var r = rates[zone];
    var amount = r.base + Math.round(w * r.perKg);
    if (req.residential) amount += config.residentialFee;
    var at = req.pickupAt === undefined ? ctx.now() : req.pickupAt;
    var day = new Date(at).getUTCDay();
    if (day === 0 || day === 6) amount = Math.round(amount * 1.15);
    amount += Math.round(amount * config.fuelPct / 100);
    if (amount < config.minCharge) amount = config.minCharge;
    log.info("quote.priced", { service: service, zone: zone, kg: w, amount: amount, customer: req.customerId });
    return { amount: amount, currency: "USD", zone: zone, chargeableKg: w };
  }

  return { quote: quote };
}

module.exports = { create: create };
