// The hours register behind the warehouse time clock.
const { WEEK, isTime, fmt } = require("./time");
const OVERTIME_AFTER = 40 * 60; // minutes a week at the regular rate

class HoursRegister {
  constructor() {
    this.workers = new Map(); // id -> { rate, shifts: [{ start, end }], openSince: null or a time }
  }

  _worker(id) {
    const w = this.workers.get(id);
    if (!w) throw new RangeError("unknown worker " + id);
    return w;
  }

  addWorker(id, hourlyRate) {
    if (typeof id !== "string" || !id) throw new RangeError("bad worker id");
    if (!Number.isInteger(hourlyRate) || hourlyRate <= 0) throw new RangeError("bad hourly rate");
    if (this.workers.has(id)) throw new RangeError("worker " + id + " already exists");
    this.workers.set(id, { rate: hourlyRate, shifts: [], openSince: null });
  }

  clockIn(id, t) {
    const w = this._worker(id);
    if (!isTime(t)) throw new RangeError("bad time");
    if (w.openSince !== null) throw new Error(id + " is already clocked in");
    if (w.shifts.some(s => s.end > t)) throw new RangeError("clock-in at " + fmt(t) + " overlaps a recorded shift");
    w.openSince = t;
  }

  clockOut(id, t) {
    const w = this._worker(id);
    if (!isTime(t)) throw new RangeError("bad time");
    if (w.openSince === null) throw new Error(id + " is not clocked in");
    if (t <= w.openSince) throw new RangeError("clock-out must be after clock-in");
    w.shifts.push({ start: w.openSince, end: t });
    w.openSince = null;
  }

  // Ids of the workers clocked in right now, sorted.
  onShift() {
    return [...this.workers].filter(([, w]) => w.openSince !== null).map(([id]) => id).sort();
  }

  // A shift someone forgot to clock, entered by a manager afterwards.
  addShift(id, start, end) {
    const w = this._worker(id);
    if (!isTime(start) || !isTime(end) || end <= start) throw new RangeError("bad shift");
    if (w.shifts.some(s => start < s.end && s.start < end)) throw new RangeError("shift at " + fmt(start) + " overlaps a recorded shift");
    if (w.openSince !== null && end > w.openSince) throw new RangeError("shift at " + fmt(start) + " overlaps the open shift");
    w.shifts.push({ start, end });
  }

  // Minutes of finished shifts inside [from, to). A shift that crosses from or to counts only its part inside.
  minutesWorked(id, from, to) {
    const w = this._worker(id);
    if (!isTime(from) || !isTime(to) || to < from) throw new RangeError("bad range");
    let total = 0;
    for (const s of w.shifts) total += Math.max(0, Math.min(s.end, to) - Math.max(s.start, from));
    return total; // the open shift counts once it is clocked out
  }

  weeklyPay(id, week) {
    const w = this._worker(id);
    if (!isTime(week)) throw new RangeError("bad week");
    const minutes = this.minutesWorked(id, week * WEEK, (week + 1) * WEEK);
    const regular = Math.min(minutes, OVERTIME_AFTER), overtime = minutes - regular;
    return Math.round((regular * w.rate + overtime * w.rate * 1.5) / 60); // rounded once, for the whole week
  }
}

module.exports = { HoursRegister };
