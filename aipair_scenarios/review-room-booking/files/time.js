// "HH:MM" (24-hour, zero-padded) to minutes after midnight. Throws RangeError on anything else.
function toMinutes(hhmm) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm));
  if (!m) throw new RangeError("bad time: " + hhmm);
  return Number(m[1]) * 60 + Number(m[2]);
}

module.exports = { toMinutes };
