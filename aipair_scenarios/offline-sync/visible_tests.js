// Read-only: these are the tests you can see. A few extra edge cases run when you finish.
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

// ---- existing behavior (passes today, keep it passing) ----
test("add puts the item in the local list and on the server, and returns its id", async () => {
  const { app, remote } = mk();
  const id = await app.add("milk");
  eq(view(app), ["milk"]);
  eq(remote.items.get(id).title, "milk");
});

test("toggle flips done locally and on the server", async () => {
  const { app, remote } = mk();
  const id = await app.add("milk");
  await app.toggle(id);
  eq(view(app), ["milk*"]);
  eq(remote.items.get(id).done, true);
  await app.toggle(id);
  eq(remote.items.get(id).done, false);
});

test("remove drops the item locally and marks it deleted on the server", async () => {
  const { app, remote } = mk();
  const id = await app.add("milk");
  await app.remove(id);
  eq(view(app), []);
  eq(remote.items.get(id).deleted, true);
});

test("items() lists in creation order", async () => {
  const { app } = mk();
  await app.add("a");
  await app.add("b");
  await app.add("c");
  eq(view(app), ["a", "b", "c"]);
});

test("toggle and remove of an unknown id reject", async () => {
  const { app } = mk();
  let errs = 0;
  await app.toggle("nope").catch(() => errs++);
  await app.remove("nope").catch(() => errs++);
  eq(errs, 2);
});

// ---- offline-first (new) ----
test("offline: add resolves with an id and shows up locally at once", async () => {
  const { app, remote } = mk();
  remote.online = false;
  const id = await app.add("milk");
  assert(typeof id === "string" && id, "add should resolve with the new id");
  eq(view(app), ["milk"]);
  eq(remote.items.size, 0);
  eq(app.pending(), 1);
});

test("offline: toggle and remove also resolve, and are queued", async () => {
  const { app, remote } = mk();
  const id = await app.add("milk"); // online
  remote.online = false;
  await app.toggle(id);
  eq(view(app), ["milk*"]);
  await app.remove(id);
  eq(view(app), []);
  eq(app.pending(), 2);
});

test("sync while offline reports { ok: false, pending } and keeps the edits", async () => {
  const { app, remote } = mk();
  remote.online = false;
  await app.add("a");
  await app.add("b");
  eq(await app.sync(), { ok: false, pending: 2 });
  eq(view(app), ["a", "b"]);
});

test("after reconnecting, sync sends the queue and reports { ok: true, pending: 0 }", async () => {
  const { app, remote } = mk();
  remote.online = false;
  const a = await app.add("a");
  await app.add("b");
  await app.toggle(a);
  remote.online = true;
  eq(await app.sync(), { ok: true, pending: 0 });
  eq(app.pending(), 0);
  eq([...remote.items.values()].map(i => i.title + (i.done ? "*" : "")), ["a*", "b"]);
});

test("queued edits are sent oldest first", async () => {
  const { app, remote } = mk();
  remote.online = false;
  const a = await app.add("a");
  await app.toggle(a);
  const b = await app.add("b");
  await app.remove(b);
  remote.online = true;
  await app.sync();
  eq(remote.received.map(o => o.type + ":" + o.id), ["add:" + a, "toggle:" + a, "add:" + b, "remove:" + b]);
});

test("sync brings in items another client added", async () => {
  const { app, remote } = mk();
  await app.add("mine");
  await other(remote, { type: "add", id: "x1", title: "theirs", at: 1500 });
  eq(await app.sync(), { ok: true, pending: 0 });
  eq(view(app), ["mine", "theirs"]);
});
