// Turns a date string into a day number for arithmetic. This file works; streak.js builds on it.
// A date is a string like "2024-03-05" (year-month-day, always this format).
function dayNumber(dateStr) {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new RangeError("bad date: " + dateStr);
  const [y, mo, d] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(y, mo - 1, d) / 86400000);
}

module.exports = { dayNumber };
