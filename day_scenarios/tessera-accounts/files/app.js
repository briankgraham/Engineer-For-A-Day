// Tessera's accounts service. createApp wires the modules together around one db.
// In production now is Date.now; tests pass a fake clock and may pass a db to share between apps.
const { createDb } = require("./db");
const users = require("./users");
const importer = require("./importer");
const auth = require("./auth");
const emails = require("./emails");

function createLog() {
  const lines = [];
  const write = level => (event, fields = {}) => { lines.push({ level, event, ...fields }); };
  return { info: write("info"), warn: write("warn"), error: write("error"), lines };
}

// flags are this node's remote-config flags: emailsDualWrite and emailsReadNew.
function createApp({ db = createDb(), now = () => Date.now(), log = createLog(), flags = {} } = {}) {
  Object.assign(db.flags, flags);
  const ctx = { db, now, log };
  const u = users.create(ctx);
  ctx.users = u;
  return {
    ...u,
    ...importer.create(ctx),
    ...auth.create(ctx),
    ...emails.create(ctx),
    setFlags: f => Object.assign(db.flags, f),
    db,
    log,
  };
}

module.exports = { createApp };
