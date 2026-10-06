// How a node learns about changes. The control plane publishes the whole flag after every change (SNS to a
// per-node SQS queue); the node calls applyUpdate for each message. Delivery is at least once and not ordered.
// A node also loads everything with loadSnapshot at startup and on the 6-hourly full resync.
function create({ store, log }) {
  const copy = msg => ({ ...msg, allow: [...msg.allow], rules: msg.rules.map(r => ({ attr: r.attr, values: [...r.values] })) });

  // Returns true if the message replaced the cached flag.
  function applyUpdate(msg) {
    if (!msg || typeof msg.key !== "string") throw new TypeError("bad update");
    const cur = store.cache.get(msg.key);
    // Messages can arrive twice or out of order, so only a newer version may replace what we have.
    if (cur && !(msg.version > cur.version)) {
      log.info("sync.ignored", { key: msg.key, version: msg.version, cached: cur.version });
      return false;
    }
    store.cache.set(msg.key, copy(msg));
    log.info("sync.applied", { key: msg.key, version: msg.version });
    return true;
  }

  function loadSnapshot(rows) {
    store.cache.clear();
    for (const row of rows) store.cache.set(row.key, copy(row));
    log.info("snapshot.loaded", { flags: rows.length });
  }

  function cachedVersion(key) {
    const cur = store.cache.get(key);
    return cur ? cur.version : null;
  }

  return { applyUpdate, loadSnapshot, cachedVersion };
}

module.exports = { create };
