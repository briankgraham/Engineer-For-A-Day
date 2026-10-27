var util = require("./util");
var config = require("./config");
var RATES = require("./rates").RATES;
var zoneFor = require("./zones").zoneFor;
var getContract = require("./customers").getContract;

// Written in 2017 and touched by many people since. Customers see these numbers, so be careful.
// Contract customers get a percentage off the rate card. Works on a copy: the rate card is shared by every request.
function applyContract(rates, contract) {
  var out = {};
  for (var z in rates) {
    out[z] = {
      base: Math.round(rates[z].base * (100 - contract.discountPct) / 100),
      perKg: Math.round(rates[z].perKg * (100 - contract.discountPct) / 100),
    };
  }
  return out;
}

// The rate for a destination: { zone, base, perKg } for the service, with the customer's contract discount if they have one.
function rateFor(req) {
  if (!req || !req.to || typeof req.to.country !== "string") throw new TypeError("a quote needs a destination");
  var service = req.service || "ground";
  var rates = RATES[service];
  if (!rates) throw util.codeError("BAD_SERVICE", "unknown service " + service);
  var zone = zoneFor(req.to.country, req.to.postcode);
  var contract = req.customerId ? getContract(req.customerId) : null;
  if (contract) rates = applyContract(rates, contract);
  return { service: service, zone: zone, base: rates[zone].base, perKg: rates[zone].perKg };
}

// The kilos a parcel is charged for: the heavier of its weight and its volume (cm / 5000), up to the next half kilo.
// parcel: { weightKg (or weight_lbs from the old checkout), dims: { l, w, h } }
function chargeableKg(parcel) {
  var w = parcel.weight_lbs ? parcel.weight_lbs * 0.4536 : parcel.weightKg;
  if (typeof w !== "number" || !(w > 0)) throw new RangeError("weight must be positive");
  if (parcel.dims) {
    var vol = parcel.dims.l * parcel.dims.w * parcel.dims.h / 5000;
    if (vol > w) w = vol;
  }
  return Math.ceil(w * 2) / 2;
}

// Everything that comes after the rate: residential fee, +15% for a Saturday or Sunday pickup (UTC), fuel, then the minimum charge.
function finish(ctx, amount, req) {
  if (req.residential) amount += config.residentialFee;
  var at = req.pickupAt === undefined ? ctx.now() : req.pickupAt;
  var day = new Date(at).getUTCDay();
  if (day === 0 || day === 6) amount = Math.round(amount * 1.15);
  amount += Math.round(amount * config.fuelPct / 100);
  if (amount < config.minCharge) amount = config.minCharge;
  return amount;
}

function create(ctx) {
  var log = ctx.log;

  // req: { service: "ground" | "air" (default "ground"), to: { country, postcode }, weightKg (or weight_lbs),
  //        dims: { l, w, h } in cm, residential, pickupAt (ms), customerId }
  // Returns { amount (cents), currency, zone, chargeableKg }.
  function quote(req) {
    var rate = rateFor(req);
    var w = chargeableKg(req);
    var amount = finish(ctx, rate.base + Math.round(w * rate.perKg), req);
    log.info("quote.priced", { service: rate.service, zone: rate.zone, kg: w, amount: amount, customer: req.customerId });
    return { amount: amount, currency: "USD", zone: rate.zone, chargeableKg: w };
  }

  return { quote: quote };
}

module.exports = { create: create, rateFor: rateFor, chargeableKg: chargeableKg, finish: finish };
