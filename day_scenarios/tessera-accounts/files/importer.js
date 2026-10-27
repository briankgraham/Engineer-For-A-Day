const { validEmail } = require("./util");

// Bulk-creates accounts from a customer's CSV upload (enterprise onboarding). rows: [{ id, name, email }].
// Returns { created, skipped: [{ index, code }] }: rows that are invalid (BAD_ROW) or already exist (USER_EXISTS) are skipped.
function create({ db, now, log }) {
  function importUsers(rows) {
    if (!Array.isArray(rows)) throw new TypeError("rows must be an array");
    let created = 0;
    const skipped = [];
    rows.forEach((row, index) => {
      if (!row || typeof row.id !== "string" || !row.id || typeof row.name !== "string" || !row.name || !validEmail(row.email)) {
        skipped.push({ index, code: "BAD_ROW" });
        return;
      }
      if (db.users.has(row.id)) {
        skipped.push({ index, code: "USER_EXISTS" });
        return;
      }
      db.users.set(row.id, { id: row.id, name: row.name, email: row.email.trim(), createdAt: now() });
      created++;
    });
    log.info("import.done", { created, skipped: skipped.length });
    return { created, skipped };
  }

  return { importUsers };
}

module.exports = { create };
