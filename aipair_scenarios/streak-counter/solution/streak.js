const { dayNumber } = require("./days");

function currentStreak(activityDates, { graceDays = 0, today } = {}) {
  if (!Number.isInteger(graceDays) || graceDays < 0) throw new RangeError("bad grace days");
  const todayNum = dayNumber(today);
  const days = [...new Set(activityDates.map(dayNumber))].sort((a, b) => a - b);
  for (const d of days) if (d > todayNum) throw new RangeError("activity date is after today");
  if (days.length === 0) return 0;
  if (todayNum - days[days.length - 1] > graceDays) return 0;
  let count = 1;
  for (let i = days.length - 2; i >= 0; i--) {
    const gap = days[i + 1] - days[i];
    if (gap - 1 <= graceDays) count++;
    else break;
  }
  return count;
}

module.exports = { currentStreak };
