// The todo app: a local list that mirrors every change to the server. Today it needs the network for each change.
const { TodoList } = require("./todo");

class TodoApp {
  constructor({ remote, now = Date.now }) {
    this.remote = remote;
    this.now = now;
    this.list = new TodoList();
    this.opCount = 0;
  }

  items() {
    return this.list.list();
  }

  _opId() {
    return "op" + ++this.opCount;
  }

  async add(title) {
    const at = this.now();
    const id = this.list.add(title, at);
    await this.remote.send({ opId: this._opId(), type: "add", id, title, at });
    return id;
  }

  async toggle(id) {
    const at = this.now();
    const done = this.list.toggle(id, at);
    await this.remote.send({ opId: this._opId(), type: "toggle", id, done, at });
  }

  async remove(id) {
    const at = this.now();
    this.list.remove(id);
    await this.remote.send({ opId: this._opId(), type: "remove", id, at });
  }
}

module.exports = { TodoApp };
