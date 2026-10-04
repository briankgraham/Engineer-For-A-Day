const { codeError, getUserRow } = require("./store");

// utcOffsetMinutes is the user's offset from UTC right now (New York in winter is -300, India is 330).
// The apps update it whenever it changes, including at daylight saving switches.
function create({ store, log }) {
  function createUser({ id, name, utcOffsetMinutes = 0 } = {}) {
    if (typeof id !== "string" || !id || typeof name !== "string" || !name) throw new TypeError("a user needs an id and a name");
    if (!Number.isInteger(utcOffsetMinutes) || Math.abs(utcOffsetMinutes) > 14 * 60) throw new TypeError("bad utcOffsetMinutes");
    if (store.users.has(id)) throw codeError("USER_EXISTS", "user " + id + " already exists");
    store.users.set(id, { id, name, utcOffsetMinutes, devices: [], quiet: null });
    store.followers.set(id, new Set());
    log.info("user.created", { userId: id });
    return getUser(id);
  }

  // A phone or browser that can receive pushes. The same token registered twice is kept once.
  function registerDevice(userId, token) {
    const user = getUserRow(store, userId);
    if (typeof token !== "string" || !token) throw new TypeError("bad push token");
    if (!user.devices.includes(token)) user.devices.push(token);
  }

  function follow(followerId, userId) {
    getUserRow(store, followerId);
    getUserRow(store, userId);
    if (followerId === userId) throw new TypeError("users cannot follow themselves");
    store.followers.get(userId).add(followerId);
  }

  // Callers always get copies, never the stored rows.
  function getUser(id) {
    const u = getUserRow(store, id);
    return { ...u, devices: [...u.devices], quiet: u.quiet && { ...u.quiet } };
  }

  return { createUser, registerDevice, follow, getUser };
}

module.exports = { create };
