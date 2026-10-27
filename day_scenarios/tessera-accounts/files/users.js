const { codeError, validEmail, normalizeEmail } = require("./util");

// ACC-388 (multiple emails per account), expand phase: besides users.email (the legacy column) every user's primary email
// can be written to the user_emails table. emailsDualWrite makes createUser and changeEmail write both, in one transaction.
// emailsReadNew makes findByEmail read user_emails instead of users.email.
function create({ db, now, log }) {
  // Makes row.email the user's primary row in user_emails, replacing their previous primary one.
  function writePrimaryEmail(userId, email) {
    const key = normalizeEmail(email);
    const taken = db.userEmails.get(key);
    if (taken && taken.userId !== userId) throw codeError("EMAIL_TAKEN", "another account already uses " + key);
    for (const [k, r] of db.userEmails) if (r.userId === userId && r.primary) db.userEmails.delete(k);
    db.userEmails.set(key, { email: key, userId, primary: true, createdAt: now() });
  }

  function createUser({ id, name, email = null } = {}) {
    if (typeof id !== "string" || !id || typeof name !== "string" || !name) throw new TypeError("a user needs an id and a name");
    if (email !== null && !validEmail(email)) throw new TypeError("bad email address");
    if (db.users.has(id)) throw codeError("USER_EXISTS", "user " + id + " already exists");
    db.transaction(() => {
      db.users.set(id, { id, name, email: email === null ? null : email.trim(), createdAt: now() });
      if (db.flags.emailsDualWrite && email !== null) writePrimaryEmail(id, email);
    });
    log.info("user.created", { userId: id });
    return getUser(id);
  }

  function changeEmail(userId, email) {
    const u = db.users.get(userId);
    if (!u) throw codeError("USER_NOT_FOUND", "no user " + userId);
    if (!validEmail(email)) throw new TypeError("bad email address");
    db.transaction(() => {
      db.users.set(userId, { ...u, email: email.trim() });
      if (db.flags.emailsDualWrite) writePrimaryEmail(userId, email);
    });
    log.info("user.email_changed", { userId });
    return getUser(userId);
  }

  // Callers always get copies, never the stored rows.
  function getUser(id) {
    const u = db.users.get(id);
    if (!u) throw codeError("USER_NOT_FOUND", "no user " + id);
    return { ...u };
  }

  // The account with this email (any letter case, surrounding spaces ignored), or null.
  function findByEmail(email) {
    const key = normalizeEmail(email);
    if (db.flags.emailsReadNew) {
      const row = db.userEmails.get(key);
      log.info("auth.lookup", { source: "user_emails", found: !!row });
      return row ? getUser(row.userId) : null;
    }
    const legacy = [...db.users.values()].find(u => u.email && u.email.toLowerCase() === key);
    log.info("auth.lookup", { source: "users", found: !!legacy });
    return legacy ? { ...legacy } : null;
  }

  return { createUser, changeEmail, getUser, findByEmail };
}

module.exports = { create };
