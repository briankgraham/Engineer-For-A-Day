// In-memory stand-in for Postgres. Each app gets its own db unless one is passed in, so every test starts clean.
// Rows are replaced, never edited in place, so a transaction can roll back by restoring the maps.
function createDb() {
  const db = {
    users: new Map(),       // id -> { id, name, email, createdAt }. email is the legacy column: as typed (trimmed), may be null
    userEmails: new Map(),  // ACC-388: normalized email -> { email, userId, primary, createdAt }. The key is unique
    meta: { backfillCursor: null, conflicts: [] },
    flags: { emailsDualWrite: false, emailsReadNew: false }, // this node's remote-config flags
  };
  // Runs fn; if it throws, users and userEmails go back to how they were and the error is rethrown.
  db.transaction = fn => {
    const users = new Map(db.users), userEmails = new Map(db.userEmails), meta = JSON.parse(JSON.stringify(db.meta));
    try {
      return fn();
    } catch (e) {
      db.users.clear(); for (const [k, v] of users) db.users.set(k, v);
      db.userEmails.clear(); for (const [k, v] of userEmails) db.userEmails.set(k, v);
      db.meta.backfillCursor = meta.backfillCursor;
      db.meta.conflicts = meta.conflicts;
      throw e;
    }
  };
  return db;
}

module.exports = { createDb };
