const { Counter } = require("./stats");

class TTLCache {
  constructor({ capacity, ttlMs, now = Date.now } = {}) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError("capacity must be a positive integer");
    if (!(ttlMs > 0)) throw new RangeError("ttlMs must be a positive number");
    this.capacity = capacity;
    this.ttlMs = ttlMs;
    this.now = now;
    this.map = new Map(); // insertion order == recency order, oldest first
    this.counter = new Counter(["hits", "misses", "evictions", "expirations"]);
  }

  _live(key) {
    const e = this.map.get(key);
    if (e === undefined) return undefined;
    if (e.expiresAt <= this.now()) {
      this.map.delete(key);
      this.counter.inc("expirations");
      return undefined;
    }
    return e;
  }

  _purge() {
    const t = this.now();
    for (const [k, e] of this.map) {
      if (e.expiresAt <= t) {
        this.map.delete(k);
        this.counter.inc("expirations");
      }
    }
  }

  get(key) {
    const e = this._live(key);
    if (!e) {
      this.counter.inc("misses");
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, e);
    this.counter.inc("hits");
    return e.value;
  }

  set(key, value, ttlMs = this.ttlMs) {
    if (!(ttlMs > 0)) throw new RangeError("ttlMs must be a positive number");
    this.map.delete(key);
    this.map.set(key, { value, expiresAt: this.now() + ttlMs });
    if (this.map.size > this.capacity) {
      this._purge();
      while (this.map.size > this.capacity) {
        this.map.delete(this.map.keys().next().value);
        this.counter.inc("evictions");
      }
    }
    return this;
  }

  has(key) {
    return this._live(key) !== undefined;
  }

  delete(key) {
    return this._live(key) !== undefined && this.map.delete(key);
  }

  get size() {
    this._purge();
    return this.map.size;
  }

  stats() {
    return this.counter.snapshot();
  }
}

module.exports = { TTLCache };
