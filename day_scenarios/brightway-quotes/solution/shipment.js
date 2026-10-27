// BRT-204: multi-parcel shipments. See the ticket for the rules.
var quoteLib = require("./quote");

function create(ctx) {
  // req is a quote request with parcels: [{ weightKg | weight_lbs, dims }] in place of weightKg and dims.
  function quoteShipment(req) {
    var rate = quoteLib.rateFor(req);
    if (!Array.isArray(req.parcels) || req.parcels.length < 1 || req.parcels.length > 20) throw new RangeError("a shipment has 1 to 20 parcels");
    var kgs = req.parcels.map(quoteLib.chargeableKg);
    var perKgPart = kgs.reduce(function (n, kg) { return n + Math.round(kg * rate.perKg); }, 0);
    if (kgs.length >= 5) perKgPart = Math.round(perKgPart * 0.95);
    var amount = quoteLib.finish(ctx, rate.base + perKgPart, req);
    ctx.log.info("shipment.priced", { service: rate.service, zone: rate.zone, parcels: kgs.length, amount: amount, customer: req.customerId });
    return {
      amount: amount, currency: "USD", zone: rate.zone,
      chargeableKg: kgs.reduce(function (n, kg) { return n + kg; }, 0),
      parcels: kgs.map(function (kg) { return { chargeableKg: kg }; }),
    };
  }

  return { quoteShipment: quoteShipment };
}

module.exports = { create: create };
