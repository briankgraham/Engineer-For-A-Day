// In-memory stand-ins. Each app gets its own store, so every test starts clean.
function createStore() {
  return {
    flags: new Map(), // the control plane (Postgres): key -> { key, version, enabled, allow, rules, rollout }
    cache: new Map(), // this evaluation node's copy of every flag; evaluate() only ever reads this
  };
}

// Errors the HTTP layer maps to 4xx responses carry a machine-readable code.
function codeError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

function getFlagRow(store, key) {
  const row = store.flags.get(key);
  if (!row) throw codeError("FLAG_NOT_FOUND", "no flag " + key);
  return row;
}

module.exports = { createStore, codeError, getFlagRow };
