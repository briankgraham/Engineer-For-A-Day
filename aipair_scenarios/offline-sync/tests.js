// Hidden edge cases (run when the candidate finishes, on top of visible_tests.js)
const mk = () => {
  const clock = mkClock();
  const remote = new (require("./remote").Remote)();
  const app = new (require("./app").TodoApp)({ remote, now: clock.now });
  return { clock, remote, app };
};
// "title" for open items, "title*" for done ones.
const view = app => app.items().map(i => i.title + (i.done ? "*" : ""));
// Simulates another client talking to the server directly.
let n = 0;
const other = (remote, op) => remote.send({ opId: "other-" + ++n, ...op });

test("a failed send stops the sync: nothing is skipped, and everything is sent later", async () => {
  const { app, remote } = mk();
  remote.online = false;
  await app.add("a");
  await app.add("b");
  await app.add("c");
  eq(await app.sync(), { ok: false, pending: 3 });
  eq(app.pending(), 3);
  remote.online = true;
  eq(await app.sync(), { ok: true, pending: 0 });
  eq([...remote.items.values()].map(i => i.title), ["a", "b", "c"]);
});

test("a retry after a lost response reuses the opId and causes no error or duplicate", async () => {
  const { app, remote } = mk();
  remote.dropResponses = 1; // the server applies the add, but the app never hears back
  const id = await app.add("milk");
  eq(app.pending(), 1);
  eq(await app.sync(), { ok: true, pending: 0 });
  eq(remote.items.size, 1);
  eq(remote.items.get(id).title, "milk");
  eq(new Set(remote.received.map(o => o.opId)).size, 1);
  eq(remote.received.length, 2);
});

test("ops keep the time of the edit, so an older offline edit loses to a newer edit from another client", async () => {
  const { app, remote, clock } = mk();
  const id = await app.add("milk"); // t = 1000, synced
  remote.online = false;
  clock.tick(100);
  await app.toggle(id); // done = true, made at t = 1100
  remote.online = true;
  await other(remote, { type: "toggle", id, done: false, at: 1500 }); // the other client's later edit
  remote.online = false;
  clock.tick(1000); // it is 2100 by the time we reconnect
  remote.online = true;
  await app.sync();
  eq(remote.items.get(id).done, false);
  eq(view(app), ["milk"]);
});

test("two syncs at once send every op exactly once", async () => {
  const { app, remote } = mk();
  const d = mkDeferred();
  remote.holdSend = d.promise;
  const p1 = app.add("a");
  const p2 = app.add("b");
  await flush();
  d.resolve();
  await Promise.all([p1, p2]);
  eq(remote.received.map(o => o.type + ":" + o.title), ["add:a", "add:b"]);
  eq(app.pending(), 0);
  eq([...remote.items.values()].map(i => i.title), ["a", "b"]);
});

test("a sync called during a sync includes the changes made meanwhile", async () => {
  const { app, remote } = mk();
  const d = mkDeferred();
  remote.holdSend = d.promise;
  const p1 = app.add("a"); // its sync is stuck waiting on the send
  await flush();
  const p2 = app.add("b");
  const s = app.sync();
  d.resolve();
  await Promise.all([p1, p2]);
  eq(await s, { ok: true, pending: 0 });
  eq([...remote.items.values()].map(i => i.title), ["a", "b"]);
});

test("a pull does not overwrite local changes that are still queued", async () => {
  const { app, remote } = mk();
  const x = await app.add("x");
  const y = await app.add("y");
  const pullGate = mkDeferred();
  remote.holdPull = pullGate.promise;
  const s = app.sync(); // flushes nothing, then waits on the pull
  await flush();
  const sendGate = mkDeferred();
  remote.holdSend = sendGate.promise; // the follow-up sync cannot finish until we say so
  const p1 = app.remove(x); // local edits made while the pull is in flight
  const p2 = app.toggle(y);
  pullGate.resolve(); // the pull returns the old server state: x live, y open
  await s;
  eq(view(app), ["y*"]);
  sendGate.resolve();
  await Promise.all([p1, p2]);
  eq(view(app), ["y*"]);
  eq(remote.items.get(x).deleted, true);
  eq(remote.items.get(y).done, true);
});

test("an item removed by another client disappears locally, and a removed unknown item is not created", async () => {
  const { app, remote } = mk();
  const id = await app.add("milk");
  await app.add("eggs");
  await other(remote, { type: "remove", id, at: 1500 });
  await other(remote, { type: "add", id: "z9", title: "ghost", at: 1200 });
  await other(remote, { type: "remove", id: "z9", at: 1300 });
  await app.sync();
  eq(view(app), ["eggs"]);
});

test("a change made by another client replaces the local copy when nothing is queued", async () => {
  const { app, remote } = mk();
  const id = await app.add("milk");
  await other(remote, { type: "toggle", id, done: true, at: 3000 });
  await app.sync();
  eq(view(app), ["milk*"]);
});

test("a failed pull reports { ok: false } and leaves the list as it was", async () => {
  const { app, remote } = mk();
  await app.add("a");
  remote.holdPull = Promise.resolve().then(() => {
    remote.online = false;
  });
  eq(await app.sync(), { ok: false, pending: 0 });
  eq(view(app), ["a"]);
});

test("edits made offline survive a failed sync and are all sent, in order, once the network is back", async () => {
  const { app, remote } = mk();
  const a = await app.add("a");
  remote.online = false;
  await app.toggle(a);
  await app.add("b");
  await app.sync();
  eq(app.pending(), 2);
  remote.online = true;
  await app.sync();
  eq(remote.received.map(o => o.type), ["add", "toggle", "add"]);
});
