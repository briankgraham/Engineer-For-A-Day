// Hidden: BRT-204 (multi-parcel shipments). Runs when the day ends.
function mk() {
  const { createApp } = require("./app");
  return createApp({ now: mkClock().now });
}
const WED = Date.UTC(2026, 11, 2, 12);
const SAT = Date.UTC(2026, 11, 5, 12);
const US = { country: "US", postcode: "94107" };

// quote() as it priced before this ticket, case by case (amount, zone, chargeable kilos). Refactor all you like; these must not move.
const GOLDEN = {
  base: [{ to: US, weightKg: 4, pickupAt: WED }, 1519, 1, 4],
  roundsUp: [{ to: US, weightKg: 2.1, pickupAt: WED }, 1275, 1, 2.5],
  exactHalf: [{ to: US, weightKg: 2.5, pickupAt: WED }, 1275, 1, 2.5],
  minCharge: [{ to: US, weightKg: 0.5, pickupAt: WED }, 1200, 1, 0.5],
  pounds: [{ to: US, weight_lbs: 10, pickupAt: WED }, 1682, 1, 5],
  poundsWin: [{ to: US, weightKg: 1, weight_lbs: 10, pickupAt: WED }, 1682, 1, 5],
  volume: [{ to: US, weightKg: 1, dims: { l: 50, w: 40, h: 30 }, pickupAt: WED }, 2821, 1, 12],
  lightBox: [{ to: US, weightKg: 9, dims: { l: 10, w: 10, h: 10 }, pickupAt: WED }, 2333, 1, 9],
  residential: [{ to: US, weightKg: 4, residential: true, pickupAt: WED }, 1899, 1, 4],
  saturday: [{ to: US, weightKg: 4, pickupAt: SAT }, 1747, 1, 4],
  saturdayResidential: [{ to: US, weightKg: 4, residential: true, pickupAt: SAT }, 2183, 1, 4],
  hawaii: [{ to: { country: "us", postcode: "96815" }, weightKg: 4, pickupAt: WED }, 1855, 2, 4],
  europe: [{ to: { country: "GB", postcode: "SW1A" }, weightKg: 4, pickupAt: WED }, 2539, 3, 4],
  elsewhere: [{ to: { country: "JP" }, weightKg: 4, pickupAt: WED }, 4969, 9, 4],
  air: [{ service: "air", to: { country: "DE" }, weightKg: 7.2, pickupAt: WED }, 8029, 3, 7.5],
  unknownCustomer: [{ to: US, weightKg: 4, customerId: "nobody", pickupAt: WED }, 1519, 1, 4],
};

test("quote() still prices every existing case exactly as before", () => {
  for (const [name, [req, amount, zone, kg]] of Object.entries(GOLDEN)) {
    const q = mk().quote(req);
    eq([q.amount, q.zone, q.chargeableKg], [amount, zone, kg], name);
  }
});

// Contract customers get one test each, so these do not depend on the rate-card fix from the incident.
test("quote() prices a contract customer as before", () => {
  const q = mk().quote({ to: US, weightKg: 4, customerId: "acme", pickupAt: WED });
  eq([q.amount, q.zone, q.chargeableKg], [1367, 1, 4]);
});

test("quote() prices a contract customer on air with the residential fee as before", () => {
  const q = mk().quote({ service: "air", to: { country: "CA" }, weightKg: 3, customerId: "globex", residential: true, pickupAt: WED });
  eq([q.amount, q.zone, q.chargeableKg], [3563, 2, 3]);
});

test("a shipment with one parcel for a contract customer costs what quote() charges", () => {
  const s = mk().quoteShipment({ to: US, customerId: "acme", pickupAt: WED, parcels: [{ weightKg: 4 }] });
  eq([s.amount, s.zone, s.chargeableKg], [1367, 1, 4]);
});

test("a shipment with one parcel costs exactly what quote() charges for that parcel", () => {
  for (const [name, [req]] of Object.entries(GOLDEN)) {
    const { weightKg, weight_lbs, dims, ...rest } = req;
    const parcel = {};
    if (weightKg !== undefined) parcel.weightKg = weightKg;
    if (weight_lbs !== undefined) parcel.weight_lbs = weight_lbs;
    if (dims !== undefined) parcel.dims = dims;
    const s = mk().quoteShipment({ ...rest, parcels: [parcel] });
    const q = mk().quote(req);
    eq([s.amount, s.zone, s.chargeableKg, s.currency], [q.amount, q.zone, q.chargeableKg, q.currency], name);
  }
});

test("the zone's base rate is charged once and each parcel pays the per-kilo rate", () => {
  const s = mk().quoteShipment({ to: US, pickupAt: WED, parcels: [{ weightKg: 1 }, { weightKg: 2 }, { weightKg: 3 }] });
  eq(s.amount, 1845); // (800 + 150 + 300 + 450) = 1700, plus 8.5% fuel
  eq(s.chargeableKg, 6);
  eq(s.parcels.map(p => p.chargeableKg), [1, 2, 3]);
  eq(s.zone, 1);
});

test("every parcel rounds up to the next half kilo on its own", () => {
  const s = mk().quoteShipment({ to: US, pickupAt: WED, parcels: [{ weightKg: 2.1 }, { weightKg: 2.1 }] });
  eq(s.parcels.map(p => p.chargeableKg), [2.5, 2.5]);
  eq(s.chargeableKg, 5);
  eq(s.amount, 1682); // 800 + 375 + 375 = 1550, plus fuel
});

test("each parcel uses its own volume and pounds", () => {
  const s = mk().quoteShipment({ to: US, pickupAt: WED, parcels: [{ weightKg: 1, dims: { l: 50, w: 40, h: 30 } }, { weight_lbs: 10 }, { weightKg: 4, dims: { l: 10, w: 10, h: 10 } }] });
  eq(s.parcels.map(p => p.chargeableKg), [12, 5, 4]);
  eq(s.amount, 4286); // 800 + 1800 + 750 + 600 = 3950, plus fuel
});

test("residential fee, weekend uplift, fuel and the minimum charge apply once to the whole shipment", () => {
  const sat = mk().quoteShipment({ to: US, residential: true, pickupAt: SAT, parcels: [{ weightKg: 0.5 }, { weightKg: 0.5 }] });
  eq(sat.amount, 1622); // 800 + 75 + 75 + 350 = 1300, +15% = 1495, plus fuel
  const tiny = mk().quoteShipment({ to: US, pickupAt: WED, parcels: [{ weightKg: 0.5 }] });
  eq(tiny.amount, 1200);
  const small = mk().quoteShipment({ to: { country: "US", postcode: "10001" }, pickupAt: WED, parcels: [{ weightKg: 0.5 }, { weightKg: 0.5 }] });
  eq(small.amount, 1200, "950 plus fuel is below the minimum, which is charged once");
});

test("five or more parcels take 5% off the per-kilo part, before the surcharges", () => {
  const four = mk().quoteShipment({ to: US, pickupAt: WED, parcels: [{ weightKg: 2 }, { weightKg: 2 }, { weightKg: 2 }, { weightKg: 2 }] });
  eq(four.amount, 2170); // 800 + 1200 = 2000, plus fuel
  const five = mk().quoteShipment({ to: US, pickupAt: WED, parcels: [{ weightKg: 2 }, { weightKg: 2 }, { weightKg: 2 }, { weightKg: 2 }, { weightKg: 2 }] });
  eq(five.amount, 2414); // 800 + round(1500 * 0.95) = 2225, plus fuel
  const res = mk().quoteShipment({ to: US, residential: true, pickupAt: WED, parcels: [{ weightKg: 2 }, { weightKg: 2 }, { weightKg: 2 }, { weightKg: 2 }, { weightKg: 2 }] });
  eq(res.amount, 2794); // 2225 + 350 = 2575, plus fuel: the residential fee is not discounted
});

test("a contract discount applies to the shipment's rate", () => {
  const s = mk().quoteShipment({ to: US, pickupAt: WED, customerId: "acme", parcels: [{ weightKg: 1 }, { weightKg: 2 }, { weightKg: 3 }] });
  eq(s.amount, 1660); // 720 + 135 + 270 + 405 = 1530, plus fuel
});

test("quoteShipment validates the request", () => {
  const app = mk();
  throws(() => app.quoteShipment({ parcels: [{ weightKg: 1 }] }), TypeError);
  for (const bad of [undefined, null, [], "x", Array.from({ length: 21 }, () => ({ weightKg: 1 }))]) throws(() => app.quoteShipment({ to: US, parcels: bad }), RangeError, "parcels " + String(bad && bad.length));
  for (const bad of [0, -1, "2", null, NaN]) throws(() => app.quoteShipment({ to: US, parcels: [{ weightKg: 1 }, { weightKg: bad }] }), RangeError, "weight " + String(bad));
  let code = null;
  try { app.quoteShipment({ service: "boat", to: US, parcels: [{ weightKg: 1 }] }); } catch (e) { code = e.code; }
  eq(code, "BAD_SERVICE");
  eq(app.quoteShipment({ to: US, pickupAt: WED, parcels: Array.from({ length: 20 }, () => ({ weightKg: 1 })) }).parcels.length, 20);
});
