// notifications.test.js: the service's existing test suite (CI runs it on every PR).
function fakePush() {
  const calls = [];
  let n = 0;
  return { calls, send(msg) { calls.push(msg); return Promise.resolve({ messageId: "m_" + ++n }); } };
}
function mk() {
  const { createApp } = require("./app");
  const push = fakePush(), clock = mkClock();
  const app = createApp({ push, now: clock.now });
  app.createUser({ id: "maya", name: "Maya" });
  app.createUser({ id: "ben", name: "Ben" });
  app.createUser({ id: "zoe", name: "Zoe" });
  app.registerDevice("ben", "tk_ben_phone");
  app.registerDevice("zoe", "tk_zoe_phone");
  app.registerDevice("zoe", "tk_zoe_tablet");
  app.follow("ben", "maya");
  app.follow("zoe", "maya");
  return { app, push, clock };
}
const post = (id, text = "New recipe: miso caramel") => ({ id, type: "post.created", actorId: "maya", text });

test("createUser validates its input and getUser returns a copy", () => {
  const { app } = mk();
  throws(() => app.createUser({ id: "", name: "X" }), TypeError);
  throws(() => app.createUser({ id: "x", name: "X", utcOffsetMinutes: 2.5 }), TypeError);
  const u = app.getUser("zoe");
  u.devices.push("tk_fake");
  eq(app.getUser("zoe").devices, ["tk_zoe_phone", "tk_zoe_tablet"]);
  eq(app.getUser("zoe").quiet, null);
});

test("registering the same device twice keeps it once", () => {
  const { app } = mk();
  app.registerDevice("ben", "tk_ben_phone");
  eq(app.getUser("ben").devices, ["tk_ben_phone"]);
});

test("a post sends one push to every device of every follower", async () => {
  const { app, push } = mk();
  const r = await app.handleEvent(post("ev_1"));
  eq(r.sent, 3);
  eq(push.calls.map(c => c.token).sort(), ["tk_ben_phone", "tk_zoe_phone", "tk_zoe_tablet"]);
  eq(push.calls[0].title, "Maya posted");
  eq(app.deliveriesFor("zoe").length, 2);
});

test("the push body is the first 100 characters of the post", async () => {
  const { app, push } = mk();
  await app.handleEvent(post("ev_1", "x".repeat(150)));
  eq(push.calls[0].body.length, 100);
});

test("a security alert goes only to that user", async () => {
  const { app, push } = mk();
  await app.handleEvent({ id: "ev_2", type: "security.alert", userId: "ben", text: "New sign-in from Lisbon" });
  eq(push.calls, [{ token: "tk_ben_phone", title: "Security alert", body: "New sign-in from Lisbon" }]);
});

test("a person gets at most 5 post notifications per rolling hour", async () => {
  const { app, push, clock } = mk();
  for (let i = 1; i <= 6; i++) await app.handleEvent(post("ev_" + i));
  eq(app.deliveriesFor("ben").length, 5);
  clock.tick(3600 * 1000 + 1);
  await app.handleEvent(post("ev_7"));
  eq(app.deliveriesFor("ben").length, 6);
});

test("security alerts are never rate limited", async () => {
  const { app } = mk();
  for (let i = 1; i <= 5; i++) await app.handleEvent(post("ev_" + i));
  await app.handleEvent({ id: "ev_sec", type: "security.alert", userId: "ben", text: "Password changed" });
  eq(app.deliveriesFor("ben").length, 6);
});

test("bad events throw and unknown event types send nothing", async () => {
  const { app, push } = mk();
  let err = null;
  try { await app.handleEvent({ id: "ev_1", type: "post.created" }); } catch (e) { err = e; }
  assert(err instanceof TypeError, "an event without text is rejected");
  eq((await app.handleEvent({ id: "ev_2", type: "comment.liked", actorId: "maya", text: "hi" })).sent, 0);
  eq(push.calls.length, 0);
});
