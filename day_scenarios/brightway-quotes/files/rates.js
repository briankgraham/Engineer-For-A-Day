// The carrier rate card, imported every Monday by the rates job (which overwrites this file in production).
// service -> zone -> { base, perKg }, all in cents. base is charged once; perKg is per chargeable kilo.
var RATES = {
  ground: {
    1: { base: 800, perKg: 150 },
    2: { base: 950, perKg: 190 },
    3: { base: 1300, perKg: 260 },
    9: { base: 2500, perKg: 520 },
  },
  air: {
    1: { base: 1800, perKg: 400 },
    2: { base: 2100, perKg: 450 },
    3: { base: 2900, perKg: 600 },
    9: { base: 5200, perKg: 900 },
  },
};

module.exports = { RATES: RATES };
