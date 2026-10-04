// In-memory storage for tasks. This file works; handlers.js and router.js build on it.
// `now` is injected so tests can control time.
class TaskStore {
  constructor({ now = Date.now } = {}) {
    this.now = now;
    this.tasks = new Map(); // id -> task record (insertion order is creation order)
    this.nextId = 1;
  }

  insert({ title, status = "open" }) {
    const id = String(this.nextId++);
    const task = { id, title, status, createdAt: this.now() };
    this.tasks.set(id, task);
    return task;
  }

  find(id) {
    return this.tasks.get(id);
  }

  all() {
    return [...this.tasks.values()];
  }

  remove(id) {
    return this.tasks.delete(id);
  }
}

module.exports = { TaskStore };
