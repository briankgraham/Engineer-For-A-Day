// Hidden: INC-0987 (people who cannot sign in on some nodes). Runs when the day ends.
function mk(flags) {
  const { createApp } = require("./app");
  return createApp({ now: mkClock().now, flags });
}
const rows = [{ id: "i1", name: "Ivy", email: "Ivy@Corp.com" }, { id: "i2", name: "Ian", email: " ian@corp.com " }];

test("with the dual-write on, imported accounts get their primary row in user_emails", () => {
  const app = mk({ emailsDualWrite: true });
  eq(app.importUsers(rows).created, 2);
  eq([...app.db.userEmails.keys()].sort(), ["ian@corp.com", "ivy@corp.com"]);
  eq([app.db.userEmails.get("ivy@corp.com").userId, app.db.userEmails.get("ivy@corp.com").primary], ["i1", true]);
  eq(app.db.users.get("i1").email, "Ivy@Corp.com", "the legacy column is still written as typed");
});

test("imported accounts can sign in on a node that reads the new table", () => {
  const app = mk({ emailsDualWrite: true, emailsReadNew: true });
  app.importUsers(rows);
  eq(app.login("IVY@corp.com").userId, "i1");
  eq(app.login("  ian@corp.com").userId, "i2");
});

test("an imported email another account holds is skipped as EMAIL_TAKEN, and the account is not half-created", () => {
  const app = mk({ emailsDualWrite: true });
  app.createUser({ id: "u1", name: "Ada", email: "ivy@corp.com" });
  const res = app.importUsers(rows);
  eq([res.created, res.skipped.map(s => [s.index, s.code])], [1, [[0, "EMAIL_TAKEN"]]]);
  eq(app.db.users.has("i1"), false);
  eq(app.db.userEmails.get("ivy@corp.com").userId, "u1");
  eq(app.db.userEmails.get("ian@corp.com").userId, "i2");
});

test("with the dual-write off, importing still works and writes only the legacy column", () => {
  const app = mk({});
  eq(app.importUsers(rows).created, 2);
  eq(app.db.userEmails.size, 0);
  eq(app.findByEmail("ivy@corp.com").id, "i1");
});

test("importing the same file twice changes nothing the second time", () => {
  const app = mk({ emailsDualWrite: true });
  app.importUsers(rows);
  const before = JSON.stringify([...app.db.userEmails]);
  const again = app.importUsers(rows);
  eq([again.created, again.skipped.map(s => s.code)], [0, ["USER_EXISTS", "USER_EXISTS"]]);
  eq(JSON.stringify([...app.db.userEmails]), before);
});
