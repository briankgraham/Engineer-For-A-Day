class EventEmitter {
  constructor() {
    this.events = new Map(); // event -> [{ listener, once, fired }] in registration order
  }

  _add(event, listener, once) {
    if (typeof listener !== "function") throw new TypeError("listener must be a function");
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event).push({ listener, once, fired: false });
    return this;
  }

  _splice(event, list, i) {
    list.splice(i, 1);
    if (list.length === 0) this.events.delete(event);
  }

  _remove(event, entry) {
    const list = this.events.get(event);
    const i = list ? list.indexOf(entry) : -1;
    if (i !== -1) this._splice(event, list, i);
  }

  on(event, listener) {
    return this._add(event, listener, false);
  }

  once(event, listener) {
    return this._add(event, listener, true);
  }

  off(event, listener) {
    const list = this.events.get(event);
    if (!list) return this;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].listener === listener) {
        this._splice(event, list, i);
        break;
      }
    }
    return this;
  }

  emit(event, ...args) {
    const list = this.events.get(event);
    if (!list || list.length === 0) {
      if (event === "error") {
        const err = args[0];
        throw err instanceof Error ? err : new Error("Unhandled 'error' event: " + String(err));
      }
      return false;
    }
    const snapshot = list.slice();
    let failed = false, firstError;
    for (const entry of snapshot) {
      if (entry.once) {
        if (entry.fired) continue;
        entry.fired = true;
        this._remove(event, entry);
      }
      try {
        entry.listener(...args);
      } catch (e) {
        if (!failed) {
          failed = true;
          firstError = e;
        }
      }
    }
    if (failed) throw firstError;
    return true;
  }

  listenerCount(event) {
    const list = this.events.get(event);
    return list ? list.length : 0;
  }

  eventNames() {
    return [...this.events.keys()];
  }

  removeAllListeners(event) {
    if (event === undefined) this.events.clear();
    else this.events.delete(event);
    return this;
  }
}

module.exports = { EventEmitter };
