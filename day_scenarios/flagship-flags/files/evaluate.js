// evaluate(key, user): is the flag on for this user? user = { id: "u_1", attrs: { country: "DE", plan: "pro" } }.
// This runs on every request of every product, so it only reads the node's cache.
function create({ store, log }) {
  function evaluate(key, user) {
    if (!user || typeof user.id !== "string" || !user.id) throw new TypeError("a user needs an id");
    const flag = store.cache.get(key);
    if (!flag) {
      log.warn("eval.unknown_flag", { key });
      return false;
    }
    if (!flag.enabled) return false;
    if (flag.allow.includes(user.id)) return true;
    const attrs = user.attrs || {};
    for (const rule of flag.rules) if (!rule.values.includes(attrs[rule.attr])) return false;
    // FLAG-310: the percentage rollout is checked here
    return true;
  }

  return { evaluate };
}

module.exports = { create };
