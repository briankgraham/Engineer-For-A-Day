// ACC-411: backfill and verification for user_emails. See the ticket for the rules.
// Whatever create() returns is merged into the app in app.js, so backfillEmails / verifyEmails added here are available as
// app.backfillEmails(...) and so on. users.js has the dual-write and the read path; db.js has the tables and db.meta.
function create({ db, now, log, users }) {
  return {};
}

module.exports = { create };
