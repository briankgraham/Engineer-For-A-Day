// Time zone helpers on top of Intl (the IANA time zone database ships with Node and every browser).
// Billing periods start and end at local midnight in the customer's time zone. A zone's UTC offset changes
// with daylight saving time, so going from a local date to an instant has to ask Intl about that date.
const fmts = new Map();

function fmt(timeZone) {
  if (!fmts.has(timeZone)) {
    fmts.set(timeZone, new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
    }));
  }
  return fmts.get(timeZone);
}

function isTimeZone(timeZone) {
  if (typeof timeZone !== "string" || !timeZone) return false;
  try { fmt(timeZone); return true; } catch (e) { return false; }
}

function parts(timeZone, utcMs) {
  const p = {};
  for (const x of fmt(timeZone).formatToParts(new Date(utcMs))) p[x.type] = x.value;
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour % 24, mi: +p.minute, ss: +p.second };
}

// Minutes ahead of UTC at that instant: New York is -240 in summer (EDT) and -300 in winter (EST).
function offsetMinutes(timeZone, utcMs) {
  const p = parts(timeZone, utcMs);
  const wall = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mi, p.ss);
  return Math.round((wall - Math.floor(utcMs / 1000) * 1000) / 60000);
}

// "2026-11-02"
function format({ y, m, d }) {
  return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}

// The calendar date in that zone at an instant: { y, m (1-12), d, str }.
function localDate(timeZone, utcMs) {
  const { y, m, d } = parts(timeZone, utcMs);
  return { y, m, d, str: format({ y, m, d }) };
}

// The instant local midnight starts on y-m-d (m is 1-12) in that zone.
function startOfLocalDay(timeZone, y, m, d) {
  const guess = Date.UTC(y, m - 1, d);
  const first = guess - offsetMinutes(timeZone, guess) * 60000;
  // The offset at the guess and at the answer differ when a DST change falls in between, so ask again.
  return guess - offsetMinutes(timeZone, first) * 60000;
}

function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// The date `months` after { y, m }, on day `day` or the last day of that month if it is shorter (anchor 31 -> Feb 28).
function addMonths({ y, m }, months, day) {
  const k = y * 12 + (m - 1) + months;
  const ny = Math.floor(k / 12), nm = (k % 12) + 1;
  const nd = Math.min(day, daysInMonth(ny, nm));
  return { y: ny, m: nm, d: nd, str: format({ y: ny, m: nm, d: nd }) };
}

// Whole calendar days from date a to date b.
function daysBetween(a, b) {
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
}

module.exports = { isTimeZone, offsetMinutes, localDate, startOfLocalDay, addMonths, daysBetween, daysInMonth, format };
