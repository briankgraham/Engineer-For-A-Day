// Marks a key deleted inside a transaction, so reads stop there instead of falling through to an outer layer.
const TOMBSTONE = Symbol("deleted");

class KVStore {
  constructor() {
    this.layers = [new Map()]; // layers[0] is committed data; each open transaction adds one on top
  }

  get depth() {
    return this.layers.length - 1;
  }

  get _top() {
    return this.layers[this.layers.length - 1];
  }

  // The innermost entry for key: a value, or TOMBSTONE if it is deleted or missing.
  _lookup(key) {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      if (this.layers[i].has(key)) return this.layers[i].get(key);
    }
    return TOMBSTONE;
  }

  // Every live key and its value in the current view.
  _view() {
    const out = new Map();
    for (const layer of this.layers) {
      for (const [k, v] of layer) {
        if (v === TOMBSTONE) out.delete(k);
        else out.set(k, v);
      }
    }
    return out;
  }

  get(key) {
    const v = this._lookup(key);
    return v === TOMBSTONE ? undefined : v;
  }

  has(key) {
    return this._lookup(key) !== TOMBSTONE;
  }

  set(key, value) {
    if (typeof key !== "string") throw new TypeError("key must be a string");
    if (value === undefined) throw new TypeError("value must not be undefined");
    this._top.set(key, value);
  }

  delete(key) {
    if (!this.has(key)) return false;
    if (this.depth === 0) this.layers[0].delete(key);
    else this._top.set(key, TOMBSTONE);
    return true;
  }

  count(value) {
    let n = 0;
    for (const v of this._view().values()) if (v === value) n++;
    return n;
  }

  keys(prefix = "") {
    return [...this._view().keys()].filter(k => k.startsWith(prefix)).sort();
  }

  get size() {
    return this._view().size;
  }

  begin() {
    this.layers.push(new Map());
  }

  rollback() {
    if (this.depth === 0) throw new Error("no transaction to roll back");
    this.layers.pop();
  }

  commit() {
    if (this.depth === 0) throw new Error("no transaction to commit");
    const changes = this.layers.pop();
    const parent = this._top;
    for (const [k, v] of changes) {
      if (v === TOMBSTONE && this.depth === 0) parent.delete(k);
      else parent.set(k, v); // a tombstone must stay a tombstone in an outer transaction
    }
  }
}

module.exports = { KVStore };
