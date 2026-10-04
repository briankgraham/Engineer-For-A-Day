// In-memory stand-in for Postgres. Each app gets its own store, so every test starts clean.
function createStore() {
  return {
    users: new Map(),      // id -> { id, name, utcOffsetMinutes, devices: [push tokens], quiet: null }
    followers: new Map(),  // userId -> Set of the user ids who follow them (they hear about their posts)
    deliveries: [],        // every push sent: { eventId, userId, token, at }
    recent: new Map(),     // rate limiting: userId -> times (ms) of their recent post notifications
    held: new Map(),       // quiet hours (PING-231)
  };
}

// Errors the HTTP layer maps to 4xx responses carry a machine-readable code.
function codeError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

function getUserRow(store, id) {
  const user = store.users.get(id);
  if (!user) throw codeError("USER_NOT_FOUND", "no user " + id);
  return user;
}

module.exports = { createStore, codeError, getUserRow };
