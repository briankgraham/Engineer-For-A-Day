const { codeError } = require("./util");

// Sign-in by email. The password check lives in the credentials service; this finds the account.
function create({ users, log }) {
  function login(email) {
    const u = users.findByEmail(email);
    if (!u) {
      log.warn("login.no_account");
      throw codeError("NO_ACCOUNT", "No account with that email");
    }
    return { userId: u.id };
  }

  return { login };
}

module.exports = { create };
