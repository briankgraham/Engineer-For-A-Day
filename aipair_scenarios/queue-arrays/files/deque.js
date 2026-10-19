// Double-ended queue on a ring buffer: O(1) push and pop at both ends, grows by doubling when full.
// Items live in buf[head], buf[head + 1], ... wrapping around the end of buf.
class Deque {
  constructor(capacity = 4) {
    this.buf = new Array(Math.max(1, capacity));
    this.head = 0;
    this.size = 0;
  }

  get capacity() {
    return this.buf.length;
  }

  // Slot of the i-th item from the front.
  _slot(i) {
    return (this.head + i) % this.buf.length;
  }

  _grow() {
    const next = new Array(this.buf.length * 2);
    for (let i = 0; i < this.size; i++) next[i] = this.buf[i];
    this.buf = next;
    this.head = 0;
  }

  pushBack(x) {
    if (this.size === this.buf.length) this._grow();
    this.buf[this._slot(this.size)] = x;
    return ++this.size;
  }

  pushFront(x) {
    if (this.size === this.buf.length) this._grow();
    this.head = (this.head - 1 + this.buf.length) % this.buf.length;
    this.buf[this.head] = x;
    return ++this.size;
  }

  popFront() {
    const x = this.buf[this.head];
    this.buf[this.head] = undefined;
    this.head = this._slot(1);
    this.size--;
    return x;
  }

  popBack() {
    if (this.size === 0) return undefined;
    const i = this.head + this.size - 1;
    const x = this.buf[i];
    this.buf[i] = undefined;
    this.size--;
    return x;
  }

  peekFront() {
    return this.size === 0 ? undefined : this.buf[this.head];
  }

  peekBack() {
    return this.size === 0 ? undefined : this.buf[this.head + this.size - 1];
  }

  // The i-th item from the front (0-based), or undefined when i is out of range.
  at(i) {
    return Number.isInteger(i) && i >= 0 && i <= this.size ? this.buf[this._slot(i)] : undefined;
  }

  isEmpty() {
    return this.size === 0;
  }

  toArray() {
    const out = [];
    for (let i = 0; i < this.size; i++) out.push(this.buf[this._slot(i)]);
    return out;
  }
}

module.exports = { Deque };
