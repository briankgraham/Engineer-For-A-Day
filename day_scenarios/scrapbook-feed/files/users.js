const { codeError, getUserRow } = require("./store");

function create({ store, log }) {
  function createUser({ id, name } = {}) {
    if (typeof id !== "string" || !id || typeof name !== "string" || !name) throw new TypeError("a user needs an id and a name");
    if (store.users.has(id)) throw codeError("USER_EXISTS", "user " + id + " already exists");
    store.users.set(id, { id, name });
    store.follows.set(id, new Set());
    log.info("user.created", { userId: id });
    return getUser(id);
  }

  // The follower's feed shows the posts of everyone they follow. Following twice is fine.
  function follow(followerId, userId) {
    getUserRow(store, followerId);
    getUserRow(store, userId);
    if (followerId === userId) throw new TypeError("users cannot follow themselves");
    store.follows.get(followerId).add(userId);
  }

  // Callers always get copies, never the stored rows.
  function getUser(id) {
    return { ...getUserRow(store, id) };
  }

  return { createUser, follow, getUser };
}

module.exports = { create };
