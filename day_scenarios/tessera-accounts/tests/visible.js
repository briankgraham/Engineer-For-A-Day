// accounts.test.js: the service's existing test suite (CI runs it on every PR).
function mk(opts = {}) {
  const { createApp } = require("./app");
  const clock = mkClock();
  const app = createApp({ now: clock.now, ...opts });
  return { app, clock };
}

test("createUser validates its input and getUser returns a copy", () => {
  const { app } = mk();
  throws(() => app.createUser({ id: "", name: "X" }), TypeError);
  throws(() => app.createUser({ id: "u1" }), TypeError);
  throws(() => app.createUser({ id: "u1", name: "Ada", email: "not an email" }), TypeError);
  const u = app.createUser({ id: "u1", name: "Ada", email: " Ada@Example.com " });
  eq(u.email, "Ada@Example.com");
  u.name = "changed";
  eq(app.getUser("u1").name, "Ada");
});

test("a user can only be created once, and unknown users throw USER_NOT_FOUND", () => {
  const { app } = mk();
  app.createUser({ id: "u1", name: "Ada", email: "ada@example.com" });
  let code = null;
  try { app.createUser({ id: "u1", name: "Again", email: "x@example.com" }); } catch (e) { code = e.code; }
  eq(code, "USER_EXISTS");
  try { app.getUser("nobody"); } catch (e) { code = e.code; }
  eq(code, "USER_NOT_FOUND");
  try { app.changeEmail("nobody", "x@example.com"); } catch (e) { code = e.code; }
  eq(code, "USER_NOT_FOUND");
});

test("findByEmail ignores letter case and surrounding spaces, and returns null when nobody has the email", () => {
  const { app } = mk();
  app.createUser({ id: "u1", name: "Ada", email: "Ada@Example.com" });
  eq(app.findByEmail("  ADA@example.COM ").id, "u1");
  eq(app.findByEmail("grace@example.com"), null);
  throws(() => app.findByEmail("nope"), TypeError);
});

test("changeEmail updates the legacy column", () => {
  const { app } = mk();
  app.createUser({ id: "u1", name: "Ada", email: "ada@example.com" });
  eq(app.changeEmail("u1", "Ada@New.org").email, "Ada@New.org");
  eq(app.findByEmail("ada@example.com"), null);
  eq(app.findByEmail("ada@new.org").id, "u1");
});

test("with the dual-write on, createUser and changeEmail keep the user's primary row in user_emails", () => {
  const { app } = mk({ flags: { emailsDualWrite: true } });
  app.createUser({ id: "u1", name: "Ada", email: "Ada@Example.com" });
  eq([...app.db.userEmails.keys()], ["ada@example.com"]);
  eq(app.db.userEmails.get("ada@example.com").userId, "u1");
  app.changeEmail("u1", "ada@new.org");
  eq([...app.db.userEmails.keys()], ["ada@new.org"], "the old primary row is replaced");
  const off = mk();
  off.app.createUser({ id: "u1", name: "Ada", email: "ada@example.com" });
  eq(off.app.db.userEmails.size, 0, "flag off: nothing written");
});

test("an email another account holds is EMAIL_TAKEN and leaves everything as it was (one transaction)", () => {
  const { app } = mk({ flags: { emailsDualWrite: true } });
  app.createUser({ id: "u1", name: "Ada", email: "ada@example.com" });
  let code = null;
  try { app.createUser({ id: "u2", name: "Imposter", email: "ADA@example.com" }); } catch (e) { code = e.code; }
  eq(code, "EMAIL_TAKEN");
  eq(app.db.users.has("u2"), false, "the user row was rolled back");
  app.createUser({ id: "u3", name: "Grace", email: "grace@example.com" });
  try { app.changeEmail("u3", "ada@example.com"); } catch (e) { code = e.code; }
  eq(code, "EMAIL_TAKEN");
  eq(app.getUser("u3").email, "grace@example.com");
  eq(app.db.userEmails.get("grace@example.com").userId, "u3");
});

test("with emailsReadNew on, findByEmail reads user_emails", () => {
  const { app } = mk({ flags: { emailsDualWrite: true, emailsReadNew: true } });
  app.createUser({ id: "u1", name: "Ada", email: "Ada@Example.com" });
  eq(app.findByEmail(" ADA@example.com ").id, "u1");
  app.db.users.set("u9", { id: "u9", name: "Legacy", email: "legacy@example.com", createdAt: 0 });
  eq(app.findByEmail("legacy@example.com"), null, "a user with no row in user_emails is not found");
});

test("login finds the account or throws NO_ACCOUNT", () => {
  const { app } = mk();
  app.createUser({ id: "u1", name: "Ada", email: "ada@example.com" });
  eq(app.login("ADA@example.com").userId, "u1");
  let code = null;
  try { app.login("grace@example.com"); } catch (e) { code = e.code; }
  eq(code, "NO_ACCOUNT");
});

test("importUsers creates the accounts and skips bad rows and existing ids", () => {
  const { app } = mk();
  app.createUser({ id: "u1", name: "Ada", email: "ada@example.com" });
  const res = app.importUsers([
    { id: "i1", name: "Ivy", email: "ivy@corp.com" },
    { id: "u1", name: "Dup", email: "dup@corp.com" },
    { id: "i2", name: "NoEmail", email: "oops" },
    { id: "i3", name: "Ian", email: "ian@corp.com" },
  ]);
  eq([res.created, res.skipped.map(s => [s.index, s.code])], [2, [[1, "USER_EXISTS"], [2, "BAD_ROW"]]]);
  eq(app.findByEmail("ivy@corp.com").id, "i1");
  throws(() => app.importUsers("rows"), TypeError);
});
