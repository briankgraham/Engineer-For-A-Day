// At most 5 post notifications per person per rolling hour, so a busy author cannot flood their followers.
// Security alerts are never limited. (In production this lives in Redis, so every worker shares it.)
const MAX_PER_HOUR = 5;
const HOUR_MS = 3600 * 1000;

function create({ store, now }) {
  // Returns true and counts the push if this person may get one more push now.
  function allowPush(userId, type) {
    if (type === "security.alert") return true;
    const t = now();
    const recent = (store.recent.get(userId) || []).filter(at => at > t - HOUR_MS);
    if (recent.length >= MAX_PER_HOUR) {
      store.recent.set(userId, recent);
      return false;
    }
    recent.push(t);
    store.recent.set(userId, recent);
    return true;
  }

  return { allowPush };
}

module.exports = { create };
