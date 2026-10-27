const { validEmail, normalizeEmail } = require("./util");

// ACC-411: backfill and verification for user_emails. See the ticket for the rules.
function create({ db, now, log }) {
  // Copies the legacy email of the next batch of users (by id, after db.meta.backfillCursor) into user_emails. One batch per call:
  // the caller loops until done. Safe to repeat and to run while the dual-write is on: it only adds rows, and leaves alone any user
  // who already has a primary row (that row was written by the dual-write and is newer than the legacy email we would copy).
  function backfillEmails({ batchSize = 100, restart = false } = {}) {
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) throw new RangeError("batchSize must be an integer from 1 to 1000");
    if (restart) {
      db.meta.backfillCursor = null;
      db.meta.conflicts = [];
    }
    const after = db.meta.backfillCursor;
    const ids = [...db.users.keys()].sort().filter(id => after === null || id > after);
    const batch = ids.slice(0, batchSize);
    const res = { processed: batch.length, copied: 0, skipped: 0, conflicts: [], done: ids.length <= batchSize };
    db.transaction(() => {
      for (const id of batch) {
        const email = db.users.get(id).email;
        if (!email || !validEmail(email)) { res.skipped++; continue; }
        if ([...db.userEmails.values()].some(r => r.userId === id && r.primary)) { res.skipped++; continue; }
        const key = normalizeEmail(email);
        const held = db.userEmails.get(key);
        if (held && held.userId === id) { res.skipped++; continue; }
        if (held) {
          const conflict = { userId: id, email: key, takenBy: held.userId };
          res.conflicts.push(conflict);
          db.meta.conflicts.push({ ...conflict });
          continue;
        }
        db.userEmails.set(key, { email: key, userId: id, primary: true, createdAt: now() });
        res.copied++;
      }
      if (batch.length) db.meta.backfillCursor = batch[batch.length - 1];
    });
    log.info("emails.backfill_batch", { processed: res.processed, copied: res.copied, skipped: res.skipped, conflicts: res.conflicts.length, done: res.done });
    return res;
  }

  // A read-only report of how far user_emails is from users.email.
  function verifyEmails() {
    const out = { users: db.users.size, withEmail: 0, matched: 0, missing: [], mismatched: [], orphaned: [], invalid: [], conflicts: [] };
    const primaries = new Map();
    for (const r of db.userEmails.values()) if (r.primary) primaries.set(r.userId, r);
    for (const id of [...db.users.keys()].sort()) {
      const email = db.users.get(id).email;
      if (!email) continue;
      out.withEmail++;
      if (!validEmail(email)) { out.invalid.push(id); continue; }
      const key = normalizeEmail(email);
      const primary = primaries.get(id);
      if (primary) {
        if (primary.email === key) out.matched++;
        else out.mismatched.push(id);
        continue;
      }
      const held = db.userEmails.get(key);
      if (held && held.userId !== id) out.conflicts.push(id);
      else out.missing.push(id);
    }
    out.orphaned = [...db.userEmails.values()].filter(r => !db.users.has(r.userId)).map(r => r.email).sort();
    return out;
  }

  return { backfillEmails, verifyEmails };
}

module.exports = { create };
