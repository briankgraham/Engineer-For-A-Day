// The hours register behind the warehouse time clock. Workers, clock-in and clock-out work today;
// back-filled shifts, hours reports and weekly pay are still to do.
const { isTime, fmt } = require("./time");

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

  addShift(id, start, end) {
    // TODO
    throw new Error("not implemented");
  }

  minutesWorked(id, from, to) {
    // TODO
    throw new Error("not implemented");
  }

  weeklyPay(id, week) {
    // TODO
    throw new Error("not implemented");
  }
}

module.exports = { HoursRegister };
