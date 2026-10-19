// A driver's hourly rate over time: the first rate applies from the beginning of time, each change from its own time on.
class RateHistory {
  constructor(hourlyRate) {
    this.changes = [{ from: -Infinity, rate: hourlyRate }]; // sorted by from
  }

  // The rate in effect at time t: the change with the latest from at or before t.
  at(t) {
    let rate = this.changes[0].rate;
    for (const c of this.changes) {
      if (c.from > t) break;
      rate = c.rate;
    }
    return rate;
  }

  set(from, hourlyRate) {
    const i = this.changes.findIndex(c => c.from >= from);
    if (i === -1) this.changes.push({ from, rate: hourlyRate });
    else if (this.changes[i].from === from) this.changes[i].rate = hourlyRate;
    else this.changes.splice(i, 0, { from, rate: hourlyRate });
  }
}

module.exports = { RateHistory };
