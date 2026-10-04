// Hidden: PING-231 quiet hours. Runs when the day ends.
function fakePush() {
  const calls = [];
  let n = 0;
  return { calls, send(msg) { calls.push(msg); return Promise.resolve({ messageId: "m_" + ++n }); } };
}
// A clock you can set to a UTC time of day on 2026-10-06.
function utcClock() {
  let t = Date.UTC(2026, 9, 6, 12, 0);
  return { now: () => t, set(hhmm) { const [h, m] = hhmm.split(":").map(Number); t = Date.UTC(2026, 9, 6, h, m); } };
}
function mk({ offset = 0 } = {}) {
  const { createApp } = require("./app");
  const push = fakePush(), clock = utcClock();
  const app = createApp({ push, now: clock.now });
  app.createUser({ id: "maya", name: "Maya" });
  app.createUser({ id: "ben", name: "Ben", utcOffsetMinutes: offset });
  app.registerDevice("ben", "tk_phone");
  app.registerDevice("ben", "tk_tablet");
  app.follow("ben", "maya");
  return { app, push, clock };
}
let seq = 0;
const post = () => ({ id: "ev_" + ++seq, type: "post.created", actorId: "maya", text: "hello" });
const errOf = fn => { try { fn(); } catch (e) { return e.code || e.name; } return null; };

test("setQuietHours validates HH:MM times and stores the window", () => {
  const { app } = mk();
  eq(errOf(() => app.setQuietHours("ben", { start: "7:00", end: "09:00" })), "RangeError");
  eq(errOf(() => app.setQuietHours("ben", { start: "24:00", end: "07:00" })), "RangeError");
  eq(errOf(() => app.setQuietHours("ben", { start: "22:00", end: "22:00" })), "RangeError");
  eq(errOf(() => app.setQuietHours("ben", { start: "22:00" })), "RangeError");
  eq(errOf(() => app.setQuietHours("nobody", { start: "22:00", end: "07:00" })), "USER_NOT_FOUND");
  app.setQuietHours("ben", { start: "22:00", end: "07:00" });
  eq(app.getUser("ben").quiet, { start: "22:00", end: "07:00" });
  app.setQuietHours("ben", null);
  eq(app.getUser("ben").quiet, null);
});

test("posts during quiet hours are held instead of sent", async () => {
  const { app, push, clock } = mk();
  app.setQuietHours("ben", { start: "13:00", end: "15:00" });
  clock.set("14:00");
  await app.handleEvent(post());
  eq(push.calls.length, 0);
  eq(app.heldCount("ben"), 1);
  clock.set("15:30");
  await app.handleEvent(post());
  eq(push.calls.length, 2, "outside quiet hours both devices get the push");
});

test("the start minute is quiet and the end minute is not", async () => {
  const { app, push, clock } = mk();
  app.setQuietHours("ben", { start: "13:00", end: "15:00" });
  clock.set("13:00");
  await app.handleEvent(post());
  eq(push.calls.length, 0);
  clock.set("15:00");
  await app.handleEvent(post());
  eq(push.calls.length, 2);
});

test("a window that crosses midnight is quiet late at night and early in the morning", async () => {
  const { app, push, clock } = mk();
  app.setQuietHours("ben", { start: "22:00", end: "07:00" });
  for (const t of ["23:30", "00:00", "06:59"]) {
    clock.set(t);
    await app.handleEvent(post());
    eq(push.calls.length, 0, "quiet at " + t);
  }
  clock.set("21:59");
  await app.handleEvent(post());
  eq(push.calls.length, 2, "not quiet at 21:59");
});

test("quiet hours are in the user's own time zone", async () => {
  const { app, push, clock } = mk({ offset: -300 }); // UTC-5
  app.setQuietHours("ben", { start: "22:00", end: "07:00" });
  clock.set("03:00"); // 22:00 for Ben
  await app.handleEvent(post());
  eq(push.calls.length, 0, "22:00 local is quiet");
  clock.set("23:00"); // 18:00 for Ben
  await app.handleEvent(post());
  eq(push.calls.length, 2, "18:00 local is not quiet");
});

test("a positive UTC offset that pushes local time past midnight", async () => {
  const { app, push, clock } = mk({ offset: 330 }); // UTC+5:30
  app.setQuietHours("ben", { start: "23:00", end: "06:00" });
  clock.set("18:00"); // 23:30 for Ben
  await app.handleEvent(post());
  eq(push.calls.length, 0);
  clock.set("01:00"); // 06:30 for Ben
  await app.handleEvent(post());
  eq(push.calls.length, 2);
});

test("security alerts are sent even during quiet hours", async () => {
  const { app, push, clock } = mk();
  app.setQuietHours("ben", { start: "22:00", end: "07:00" });
  clock.set("02:00");
  await app.handleEvent({ id: "ev_sec", type: "security.alert", userId: "ben", text: "New sign-in" });
  eq(push.calls.length, 2);
  eq(app.heldCount("ben"), 0);
});

test("when quiet hours end, deliverHeld sends one summary push per device and clears the held posts", async () => {
  const { app, push, clock } = mk();
  app.setQuietHours("ben", { start: "22:00", end: "07:00" });
  clock.set("23:00");
  for (let i = 0; i < 3; i++) await app.handleEvent(post());
  clock.set("07:01");
  await app.deliverHeld();
  eq(push.calls.map(c => c.token).sort(), ["tk_phone", "tk_tablet"]);
  eq(push.calls[0].title, "While you were away");
  eq(push.calls[0].body, "3 new notifications");
  eq(app.heldCount("ben"), 0);
  await app.deliverHeld();
  eq(push.calls.length, 2, "nothing left to send");
});

test("one held post makes a singular summary", async () => {
  const { app, push, clock } = mk();
  app.setQuietHours("ben", { start: "22:00", end: "07:00" });
  clock.set("23:00");
  await app.handleEvent(post());
  clock.set("08:00");
  await app.deliverHeld();
  eq(push.calls[0].body, "1 new notification");
});

test("deliverHeld sends nothing while the user is still in quiet hours", async () => {
  const { app, push, clock } = mk();
  app.setQuietHours("ben", { start: "22:00", end: "07:00" });
  clock.set("23:00");
  await app.handleEvent(post());
  clock.set("03:00");
  await app.deliverHeld();
  eq(push.calls.length, 0);
  eq(app.heldCount("ben"), 1);
});

test("held posts do not use up the hourly rate limit", async () => {
  const { app, push, clock } = mk();
  app.setQuietHours("ben", { start: "13:00", end: "15:00" });
  clock.set("14:00");
  for (let i = 0; i < 6; i++) await app.handleEvent(post());
  clock.set("15:01");
  await app.deliverHeld();
  await app.handleEvent(post());
  eq(push.calls.filter(c => c.title === "Maya posted").length, 2, "the first post after quiet hours is sent");
});

test("an event redelivered during quiet hours is held once", async () => {
  const { app, clock } = mk();
  app.setQuietHours("ben", { start: "22:00", end: "07:00" });
  clock.set("23:00");
  const ev = post();
  await app.handleEvent(ev);
  await app.handleEvent({ ...ev });
  eq(app.heldCount("ben"), 1);
});

test("clearing quiet hours sends posts straight away again", async () => {
  const { app, push, clock } = mk();
  app.setQuietHours("ben", { start: "22:00", end: "07:00" });
  clock.set("23:00");
  app.setQuietHours("ben", null);
  await app.handleEvent(post());
  eq(push.calls.length, 2);
});
