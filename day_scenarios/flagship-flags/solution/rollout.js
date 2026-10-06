const { codeError, getFlagRow } = require("./store");

// A user's bucket for a flag: 0 to 99. FNV-1a over "<flag>:<user>", so it is the same on every node and after every
// restart (no randomness, no state), and the flag key is part of the input so two flags pick different users.
function bucketOf(key, userId) {
  const s = key + ":" + userId;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 100;
}

function create({ store, commit, log }) {
  function setRollout(key, percent) {
    if (!Number.isInteger(percent) || percent < 0 || percent > 100) throw new RangeError("percent must be an integer from 0 to 100");
    const row = getFlagRow(store, key);
    if (row.rollout === percent) return;
    row.rollout = percent;
    commit(row);
    log.info("flag.rollout", { key, percent });
  }

  return { setRollout, bucketOf };
}

module.exports = { create, bucketOf };
