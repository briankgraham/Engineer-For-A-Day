class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(event, listener) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event).push(listener);
    return this;
  }

  once(event, listener) {
    const wrapper = (...args) => {
      listener(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  off(event, listener) {
    const list = this.events.get(event);
    if (!list) return this;
    const i = list.indexOf(listener);
    if (i !== -1) list.splice(i, 1);
    return this;
  }

  emit(event, ...args) {
    const list = this.events.get(event);
    if (!list) return false;
    for (const listener of list) {
      listener(...args);
    }
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
