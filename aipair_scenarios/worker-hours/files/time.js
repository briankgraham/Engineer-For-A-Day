// Time helpers. This file works.
// Every time is a whole number of minutes since Monday 00:00 of week 0, so day d covers
// [d * DAY, (d + 1) * DAY) and week w covers [w * WEEK, (w + 1) * WEEK).
const DAY = 24 * 60;
const WEEK = 7 * DAY;
const NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const isTime = t => Number.isInteger(t) && t >= 0;
const dayOf = t => Math.floor(t / DAY);
const weekOf = t => Math.floor(t / WEEK);

// For error messages and logs: fmt(1450) === "w0 Tue 00:10"
function fmt(t) {
  const m = t % DAY, pad = n => String(n).padStart(2, "0");
  return `w${weekOf(t)} ${NAMES[dayOf(t) % 7]} ${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

module.exports = { DAY, WEEK, isTime, dayOf, weekOf, fmt };
