// The todo app, offline-first: every change applies locally at once and is queued; sync() sends the queue and pulls the server state.
const { TodoList } = require("./todo");

class TodoApp {
  constructor({ remote, now = Date.now }) {
    this.remote = remote;
    this.now = now;
    this.list = new TodoList();
    this.opCount = 0;
    this.queue = []; // ops not yet acknowledged, oldest first
    this.current = null; // the sync running now
    this.next = null; // the sync waiting to start after it
  }

  items() {
    return this.list.list();
  }

  pending() {
    return this.queue.length;
  }

  _enqueue(op) {
    this.queue.push({ opId: "op" + ++this.opCount, ...op });
  }

  async add(title) {
    const at = this.now();
    const id = this.list.add(title, at);
    this._enqueue({ type: "add", id, title, at });
    await this.sync();
    return id;
  }

  async toggle(id) {
    const at = this.now();
    const done = this.list.toggle(id, at);
    this._enqueue({ type: "toggle", id, done, at });
    await this.sync();
  }

  async remove(id) {
    const at = this.now();
    this.list.remove(id);
    this._enqueue({ type: "remove", id, at });
    await this.sync();
  }

  // One sync at a time. A call made during a sync gets a further full sync after it, so edits made meanwhile are included.
  sync() {
    if (!this.current) {
      this.current = this._run().finally(() => {
        this.current = null;
      });
      return this.current;
    }
    if (!this.next) {
      this.next = this.current.then(() => {
        this.next = null;
        return this.sync();
      });
    }
    return this.next;
  }

  async _run() {
    while (this.queue.length) {
      try {
        await this.remote.send(this.queue[0]);
      } catch (e) {
        return { ok: false, pending: this.queue.length };
      }
      this.queue.shift();
    }
    let snapshot;
    try {
      snapshot = await this.remote.pull();
    } catch (e) {
      return { ok: false, pending: this.queue.length };
    }
    this._merge(snapshot);
    return { ok: true, pending: this.queue.length };
  }

  // Bring in the server's state, except for items this client has unsent changes to.
  _merge(snapshot) {
    const pending = new Set(this.queue.map(op => op.id));
    for (const r of snapshot) {
      if (pending.has(r.id)) continue;
      if (r.deleted) this.list.drop(r.id);
      else this.list.put(r);
    }
  }
}

module.exports = { TodoApp };
