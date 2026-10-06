// How a node learns about changes. The control plane publishes the whole flag after every change (SNS to a
// per-node SQS queue); the node calls applyUpdate for each message. Delivery is at least once and not ordered.
// A node also loads everything with loadSnapshot at startup and on the 6-hourly full resync.

// Versions travel as int64 strings ("10"), so compare them as numbers: as strings "9" is greater than "10".
function toVersion(v) {
  const n = typeof v === "string" && /^\d+$/.test(v) ? Number(v) : v;
  if (!Number.isSafeInteger(n) || n < 1) throw new TypeError("bad version " + JSON.stringify(v));
  return n;
}

function create({ store, log }) {
  const copy = msg => ({ ...msg, version: toVersion(msg.version), allow: [...msg.allow], rules: msg.rules.map(r => ({ attr: r.attr, values: [...r.values] })) });

  // Returns true if the message replaced the cached flag.
  function applyUpdate(msg) {
    if (!msg || typeof msg.key !== "string") throw new TypeError("bad update");
    const version = toVersion(msg.version);
    const cur = store.cache.get(msg.key);
    // Messages can arrive twice or out of order, so only a newer version may replace what we have.
    if (cur && version <= cur.version) {
      log.info("sync.ignored", { key: msg.key, version, cached: cur.version });
      return false;
    }
    store.cache.set(msg.key, copy(msg));
    log.info("sync.applied", { key: msg.key, version });
    return true;
  }

  function loadSnapshot(rows) {
    const next = rows.map(row => [row.key, copy(row)]);
    store.cache.clear();
    for (const [key, flag] of next) store.cache.set(key, flag);
    log.info("snapshot.loaded", { flags: rows.length });
  }

  function cachedVersion(key) {
    const cur = store.cache.get(key);
    return cur ? cur.version : null;
  }

  return { applyUpdate, loadSnapshot, cachedVersion };
}

module.exports = { create };
