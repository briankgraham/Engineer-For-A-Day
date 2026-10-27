var ZONES = { US: 1, CA: 2, MX: 2, GB: 3, DE: 3, FR: 3, NL: 3, ES: 3, IT: 3, IE: 3 };

// Which rate zone a destination is in. Anything we do not list is zone 9.
function zoneFor(country, postcode) {
  var c = String(country).toUpperCase();
  // HI and AK are priced like Canada (BRT-12, 2019)
  if (c === "US" && /^9[69]/.test(String(postcode || ""))) return 2;
  return ZONES[c] || 9;
}

module.exports = { zoneFor: zoneFor };
