class RateLimiter {
  constructor({ capacity, refillEveryMs, now = Date.now } = {}) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError("capacity must be a positive integer");
    if (!Number.isInteger(refillEveryMs) || refillEveryMs < 1) throw new RangeError("refillEveryMs must be a positive integer");
    this.capacity = capacity;
    this.every = refillEveryMs;
    this.now = now;
    this.buckets = new Map();
  }

  // Brings a bucket up to date. `last` is the time up to which refill has been accounted for.
  _refill(b) {
    const t = this.now();
    if (t < b.last) {
      b.last = t; // clock went backwards: re-base, add nothing
      return;
    }
    const n = Math.floor((t - b.last) / this.every);
    if (n > 0) {
      b.tokens = Math.min(this.capacity, b.tokens + n);
      b.last += n * this.every; // keep the partial progress
    }
    if (b.tokens === this.capacity) b.last = t; // a full bucket has no partial progress
  }

  _bucket(key, create) {
    let b = this.buckets.get(key);
    if (!b) {
      if (!create) return null;
      b = { tokens: this.capacity, last: this.now() };
      this.buckets.set(key, b);
      return b;
    }
    this._refill(b);
    return b;
  }

  tryConsume(key, cost = 1) {
    if (!Number.isInteger(cost) || cost < 1 || cost > this.capacity) throw new RangeError("cost must be an integer from 1 to capacity");
    const b = this._bucket(key, true);
    if (b.tokens >= cost) {
      b.tokens -= cost;
      return { allowed: true, remaining: b.tokens, retryAfterMs: 0 };
    }
    const retryAfterMs = (cost - b.tokens) * this.every - (this.now() - b.last);
    return { allowed: false, remaining: b.tokens, retryAfterMs };
  }

  peek(key) {
    const b = this._bucket(key, false);
    return b ? b.tokens : this.capacity;
  }

  reset(key) {
    this.buckets.delete(key);
  }

  get size() {
    return this.buckets.size;
  }

  prune() {
    let removed = 0;
    for (const [k, b] of this.buckets) {
      this._refill(b);
      if (b.tokens === this.capacity) {
        this.buckets.delete(k);
        removed++;
      }
    }
    return removed;
  }
}

module.exports = { RateLimiter };
