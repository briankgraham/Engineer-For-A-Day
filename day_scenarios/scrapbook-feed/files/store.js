// In-memory stand-in for Postgres. Each app gets its own store, so every test starts clean.
function createStore() {
  return {
    users: new Map(),   // id -> { id, name }
    follows: new Map(), // userId -> Set of the user ids they follow (their feed shows those people's posts)
    posts: new Map(),   // id -> { id, authorId, text, createdAt }, in the order they were created
    mutes: new Map(),   // SCRAP-412: userId -> Map(muted phrase -> until (ms), or null when it never expires)
    seq: 0,
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
