// Small helper: a set of named counters.
class Counter {
  constructor(names) {
    this.counts = {};
    for (const n of names) this.counts[n] = 0;
  }
  inc(name) {
    this.counts[name]++;
  }
  snapshot() {
    return { ...this.counts };
  }
}

module.exports = { Counter };
