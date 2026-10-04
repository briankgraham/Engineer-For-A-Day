// The local todo list. This file works; app.js builds on it.
// Items are { id, title, done, at }, where `at` is the time of the last change (used to settle conflicts).
class TodoList {
  constructor() {
    this.items = new Map(); // id -> item, in creation order
    this.nextId = 1;
  }

  add(title, at) {
    const id = "c" + this.nextId++;
    this.items.set(id, { id, title, done: false, at });
    return id;
  }

  get(id) {
    return this.items.get(id);
  }

  // Flips done and returns the new value.
  toggle(id, at) {
    const item = this.items.get(id);
    if (!item) throw new Error("no such item: " + id);
    item.done = !item.done;
    item.at = at;
    return item.done;
  }

  remove(id) {
    if (!this.items.delete(id)) throw new Error("no such item: " + id);
  }

  list() {
    return [...this.items.values()].map(i => ({ ...i }));
  }

  // Used to bring in state from the server: writes the item as given, no clock involved.
  put({ id, title, done, at }) {
    this.items.set(id, { id, title, done, at });
  }

  drop(id) {
    this.items.delete(id);
  }
}

module.exports = { TodoList };
