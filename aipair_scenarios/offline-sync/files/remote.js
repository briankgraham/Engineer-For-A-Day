// A fake server, so the app can be tried (and tested) without a network. This file works.
// Ops look like { opId, type: "add" | "toggle" | "remove", id, at, ... }.
//  - The server remembers the opIds it has applied and ignores a repeat, so an op that is sent twice with the same opId happens once.
//  - Changes settle last-writer-wins on `at`: an op older than the item's last change is ignored. A removed item stays removed.
//  - An "add" for an id that already exists under a different opId is refused with an error.
// The public fields below are here so tests can steer it.
class Remote {
  constructor() {
    this.items = new Map(); // id -> { id, title, done, deleted, at }; removed items stay as deleted: true (tombstones)
    this.seen = new Set(); // opIds already applied
    this.received = []; // every op that reached the server, retries included
    this.online = true;
    this.dropResponses = 0; // the next N sends are applied but then reject, like a response lost on the way back
    this.holdSend = null; // a promise: send() waits for it first
    this.holdPull = null; // a promise: pull() waits for it first
  }

  async send(op) {
    if (this.holdSend) await this.holdSend;
    if (!this.online) throw new Error("offline");
    this.received.push({ ...op });
    if (!this.seen.has(op.opId)) {
      this._apply(op);
      this.seen.add(op.opId);
    }
    if (this.dropResponses > 0) {
      this.dropResponses--;
      throw new Error("connection lost");
    }
    return { ok: true };
  }

  // Every item the server knows, including removed ones (deleted: true).
  async pull() {
    if (this.holdPull) await this.holdPull;
    if (!this.online) throw new Error("offline");
    return [...this.items.values()].map(i => ({ ...i }));
  }

  _apply(op) {
    const cur = this.items.get(op.id);
    if (op.type === "add") {
      if (cur) throw new Error("conflict: " + op.id + " already exists");
      this.items.set(op.id, { id: op.id, title: op.title, done: false, deleted: false, at: op.at });
      return;
    }
    if (!cur || cur.deleted || op.at < cur.at) return; // unknown, already removed, or stale
    if (op.type === "toggle") cur.done = op.done;
    if (op.type === "remove") cur.deleted = true;
    cur.at = op.at;
  }
}

module.exports = { Remote };
