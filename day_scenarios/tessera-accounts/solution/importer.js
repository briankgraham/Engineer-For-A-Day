// Bulk-creates accounts from a customer's CSV upload (enterprise onboarding). rows: [{ id, name, email }].
// Returns { created, skipped: [{ index, code }] }: rows that are invalid (BAD_ROW), already exist (USER_EXISTS) or whose email another
// account holds while the dual-write is on (EMAIL_TAKEN) are skipped. Every row goes through createUser, the one place that knows
// which tables a new account is written to.
function create({ log, users }) {
  function importUsers(rows) {
    if (!Array.isArray(rows)) throw new TypeError("rows must be an array");
    let created = 0;
    const skipped = [];
    rows.forEach((row, index) => {
      try {
        if (!row) throw new TypeError("bad row");
        if (row.email === null || row.email === undefined) throw new TypeError("an imported account needs an email");
        users.createUser({ id: row.id, name: row.name, email: row.email });
        created++;
      } catch (e) {
        skipped.push({ index, code: e.code || "BAD_ROW" });
      }
    });
    log.info("import.done", { created, skipped: skipped.length });
    return { created, skipped };
  }

  return { importUsers };
}

module.exports = { create };
