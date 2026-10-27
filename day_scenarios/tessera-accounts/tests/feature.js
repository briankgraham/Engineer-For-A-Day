// Hidden: ACC-411 (backfill and verification for user_emails). Runs when the day ends.
function mk(opts = {}) {
  const { createApp } = require("./app");
  const clock = mkClock();
  return createApp({ now: clock.now, ...opts });
}
// Legacy accounts: written straight to users, the way they were before the dual-write.
function legacy(app, list) {
  for (const [id, email] of list) app.db.users.set(id, { id, name: "User " + id, email, createdAt: 0 });
}
const rowOf = (app, userId) => [...app.db.userEmails.values()].filter(r => r.userId === userId);

test("backfillEmails validates batchSize", () => {
  const app = mk();
  for (const bad of [0, -1, 1001, 1.5, "10", null]) throws(() => app.backfillEmails({ batchSize: bad }), RangeError, "batchSize " + String(bad));
});

test("a batch copies at most batchSize users in id order, normalized, and moves the cursor", () => {
  const app = mk();
  legacy(app, [["u3", "Cy@Example.com"], ["u1", " Ann@Example.com "], ["u4", "dee@example.com"], ["u2", "bob@example.com"], ["u5", "eve@example.com"]]);
  const r = app.backfillEmails({ batchSize: 2 });
  eq([r.processed, r.copied, r.skipped, r.conflicts.length, r.done], [2, 2, 0, 0, false]);
  eq([...app.db.userEmails.keys()].sort(), ["ann@example.com", "bob@example.com"]);
  eq(app.db.userEmails.get("ann@example.com").userId, "u1");
  eq(app.db.userEmails.get("ann@example.com").primary, true);
  eq(app.db.meta.backfillCursor, "u2");
  const r2 = app.backfillEmails({ batchSize: 2 });
  eq([r2.processed, r2.copied, r2.done], [2, 2, false]);
  const r3 = app.backfillEmails({ batchSize: 2 });
  eq([r3.processed, r3.copied, r3.done], [1, 1, true]);
  eq(app.db.userEmails.size, 5);
  eq(app.db.meta.backfillCursor, "u5");
  const r4 = app.backfillEmails({ batchSize: 2 });
  eq([r4.processed, r4.copied, r4.skipped, r4.done], [0, 0, 0, true], "nothing left");
});

test("the backfill works with the dual-write and the new read path off, and with them on", () => {
  for (const flags of [{}, { emailsDualWrite: true, emailsReadNew: true }]) {
    const app = mk({ flags });
    legacy(app, [["u1", "ann@example.com"]]);
    eq(app.backfillEmails().copied, 1);
  }
});

test("the cursor lives in the db, so another process can continue where one stopped", () => {
  const { createApp } = require("./app");
  const first = mk();
  legacy(first, [["u1", "a@example.com"], ["u2", "b@example.com"], ["u3", "c@example.com"]]);
  first.backfillEmails({ batchSize: 2 });
  const second = createApp({ db: first.db, now: mkClock().now });
  const r = second.backfillEmails({ batchSize: 2 });
  eq([r.processed, r.copied, r.done], [1, 1, true]);
  eq(first.db.userEmails.size, 3);
});

test("running it again, or starting over, adds nothing and never duplicates", () => {
  const app = mk();
  legacy(app, [["u1", "a@example.com"], ["u2", "b@example.com"], ["u3", "c@example.com"]]);
  app.backfillEmails({ batchSize: 10 });
  const snapshot = JSON.stringify([...app.db.userEmails]);
  const again = app.backfillEmails({ batchSize: 10, restart: true });
  eq([again.processed, again.copied, again.skipped, again.conflicts.length, again.done], [3, 0, 3, 0, true]);
  eq(JSON.stringify([...app.db.userEmails]), snapshot);
  eq(app.db.meta.backfillCursor, "u3");
});

test("two accounts with the same email in different letter case: the first keeps it, the second is a reported conflict", () => {
  const app = mk();
  legacy(app, [["u1", "Sam@Example.com"], ["u2", "sam@example.com"], ["u3", "zed@example.com"]]);
  const r = app.backfillEmails({ batchSize: 10 });
  eq([r.copied, r.skipped, r.done], [2, 0, true]);
  eq(r.conflicts.map(c => [c.userId, c.email, c.takenBy]), [["u2", "sam@example.com", "u1"]]);
  eq(app.db.userEmails.get("sam@example.com").userId, "u1", "the existing row is never taken over");
  eq(rowOf(app, "u2").length, 0);
  eq(app.db.meta.conflicts.map(c => c.userId), ["u2"]);
  const again = app.backfillEmails({ batchSize: 10, restart: true });
  eq(again.conflicts.map(c => c.userId), ["u2"]);
  eq(app.db.meta.conflicts.map(c => c.userId), ["u2"], "restart replaces the list, it does not grow it");
});

test("users without a usable email are skipped, not an error", () => {
  const app = mk();
  legacy(app, [["u1", null], ["u2", ""], ["u3", "n/a"], ["u4", "ok@example.com"]]);
  const r = app.backfillEmails({ batchSize: 10 });
  eq([r.processed, r.copied, r.skipped, r.conflicts.length], [4, 1, 3, 0]);
});

test("a user who already has a primary row is left alone", () => {
  const app = mk({ flags: { emailsDualWrite: true } });
  app.createUser({ id: "u1", name: "Ann", email: "ann@example.com" });
  legacy(app, [["u2", "old@example.com"]]);
  app.db.userEmails.set("new@example.com", { email: "new@example.com", userId: "u2", primary: true, createdAt: 5 });
  const r = app.backfillEmails({ batchSize: 10 });
  eq([r.copied, r.skipped], [0, 2]);
  eq(rowOf(app, "u2").map(x => x.email), ["new@example.com"], "the newer row is not joined by a second primary");
});

test("verifyEmails reports how far user_emails is from users.email, and changes nothing", () => {
  const app = mk();
  legacy(app, [["u1", "a@example.com"], ["u2", "B@example.com"], ["u3", "c@example.com"], ["u4", "A@example.com"], ["u5", null], ["u6", "junk"], ["u7", "g@example.com"]]);
  app.db.userEmails.set("a@example.com", { email: "a@example.com", userId: "u1", primary: true, createdAt: 0 });
  app.db.userEmails.set("zzz@example.com", { email: "zzz@example.com", userId: "u3", primary: true, createdAt: 0 });
  app.db.userEmails.set("ghost@example.com", { email: "ghost@example.com", userId: "gone", primary: true, createdAt: 0 });
  const before = JSON.stringify([[...app.db.users], [...app.db.userEmails], app.db.meta]);
  const v = app.verifyEmails();
  eq([v.users, v.withEmail, v.matched], [7, 6, 1]);
  eq(v.missing, ["u2", "u7"]);
  eq(v.mismatched, ["u3"]);
  eq(v.orphaned, ["ghost@example.com"]);
  eq(v.invalid, ["u6"]);
  eq(v.conflicts, ["u4"], "u4's email is held by u1");
  eq(JSON.stringify([[...app.db.users], [...app.db.userEmails], app.db.meta]), before, "read-only");
});

test("after a backfill with no conflicts, verifyEmails is clean", () => {
  const app = mk();
  legacy(app, [["u1", "a@example.com"], ["u2", "B@example.com"], ["u3", null]]);
  while (!app.backfillEmails({ batchSize: 1 }).done) { /* batches */ }
  const v = app.verifyEmails();
  eq([v.users, v.withEmail, v.matched, v.missing, v.mismatched, v.orphaned, v.invalid, v.conflicts], [3, 2, 2, [], [], [], [], []]);
});
