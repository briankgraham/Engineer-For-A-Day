const { codeError, getFlagRow } = require("./store");

const KEY = /^[a-z0-9][a-z0-9-]{0,39}$/;

// The message the control plane publishes after every change: the whole flag. The API serializes int64 as strings
// (JavaScript cannot hold every int64 exactly), so version travels as a string like "10" (FLAG-298).
function snapshot(row) {
  return {
    ...row,
    version: String(row.version),
    allow: [...row.allow],
    rules: row.rules.map(r => ({ attr: r.attr, values: [...r.values] })),
  };
}

// Every change goes through commit: bump the flag's version and publish the new state to the evaluation nodes.
function makeCommit(ctx) {
  return row => {
    row.version += 1;
    ctx.publish(snapshot(row));
  };
}

function checkRules(rules) {
  if (!Array.isArray(rules)) throw new TypeError("rules must be an array");
  for (const r of rules) {
    if (!r || typeof r.attr !== "string" || !r.attr) throw new TypeError("a rule needs an attr");
    if (!Array.isArray(r.values) || !r.values.length || r.values.some(v => typeof v !== "string")) throw new TypeError("a rule needs a non-empty list of string values");
  }
}

function checkIds(ids) {
  if (!Array.isArray(ids) || ids.some(id => typeof id !== "string" || !id)) throw new TypeError("allow must be an array of user ids");
}

function create({ store, commit, log }) {
  // New flags start off. rules: [{ attr: "country", values: ["DE", "FR"] }]; a user must match every rule.
  function createFlag({ key, enabled = false, allow = [], rules = [] } = {}) {
    if (typeof key !== "string" || !KEY.test(key)) throw new TypeError("bad flag key");
    if (typeof enabled !== "boolean") throw new TypeError("enabled must be a boolean");
    checkIds(allow);
    checkRules(rules);
    if (store.flags.has(key)) throw codeError("FLAG_EXISTS", "flag " + key + " already exists");
    const row = { key, version: 0, enabled, allow: [...allow], rules: rules.map(r => ({ attr: r.attr, values: [...r.values] })), rollout: 100 };
    store.flags.set(key, row);
    commit(row);
    log.info("flag.created", { key });
    return getFlag(key);
  }

  // A copy of the control plane's row, never the stored row.
  function getFlag(key) {
    const row = getFlagRow(store, key);
    return { ...row, allow: [...row.allow], rules: row.rules.map(r => ({ attr: r.attr, values: [...r.values] })) };
  }

  function setEnabled(key, enabled) {
    if (typeof enabled !== "boolean") throw new TypeError("enabled must be a boolean");
    const row = getFlagRow(store, key);
    if (row.enabled === enabled) return getFlag(key);
    row.enabled = enabled;
    commit(row);
    log.info("flag.updated", { key, enabled });
    return getFlag(key);
  }

  // Users on the allow list always get the flag while it is enabled.
  function setAllow(key, ids) {
    checkIds(ids);
    const row = getFlagRow(store, key);
    row.allow = [...ids];
    commit(row);
    return getFlag(key);
  }

  return { createFlag, getFlag, setEnabled, setAllow };
}

module.exports = { create, makeCommit };
