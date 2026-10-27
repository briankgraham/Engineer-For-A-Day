// Live settings. Ops change fuelPct every Monday through setFuelPct (admin endpoint), so read it when you price, not when the file loads.
module.exports = {
  fuelPct: 8.5,         // percent added on top of everything else
  minCharge: 1200,      // cents; no quote is cheaper than this
  residentialFee: 350,  // cents, flat
};
