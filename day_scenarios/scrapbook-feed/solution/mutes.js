// SCRAP-412: muted words. See the ticket for the rules.
const { codeError, getUserRow } = require("./store");

const MAX_MUTES = 100;
const HOUR_MS = 3600 * 1000;

const normalize = s => s.trim().replace(/\s+/g, " ").toLowerCase();
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The phrase is matched literally, case-insensitively, with any whitespace between its words, and it must not touch a
// letter or digit on either side: "cat" matches "my Cat!" and "the cat's toy" but not "category".
function toRegex(phrase) {
  const body = phrase.split(" ").map(escapeRe).join("\\s+");
  return new RegExp("(?<![\\p{L}\\p{N}])" + body + "(?![\\p{L}\\p{N}])", "iu");
}

// The user's mutes that have not expired, as [phrase, until].
function activeMutes(store, now, userId) {
  const mine = store.mutes.get(userId);
  if (!mine) return [];
  const t = now();
  for (const [phrase, until] of mine) if (until !== null && t >= until) mine.delete(phrase);
  return [...mine];
}

// A predicate for "has this person muted this post?". feed.js builds it once per page.
function hiddenBy(store, now, userId) {
  const res = activeMutes(store, now, userId).map(([phrase]) => toRegex(phrase));
  return post => res.some(re => re.test(post.text));
}

function create({ store, now, log }) {
  function muteWord(userId, phrase, { hours } = {}) {
    getUserRow(store, userId);
    if (typeof phrase !== "string") throw new RangeError("phrase must be a string");
    const p = normalize(phrase);
    if (!p || p.length > 40) throw new RangeError("a muted phrase has 1 to 40 characters");
    if (hours !== undefined && (!Number.isInteger(hours) || hours < 1)) throw new RangeError("hours must be a positive integer");
    const active = activeMutes(store, now, userId);
    if (!store.mutes.has(userId)) store.mutes.set(userId, new Map());
    const mine = store.mutes.get(userId);
    if (!mine.has(p) && active.length >= MAX_MUTES) throw new RangeError("at most " + MAX_MUTES + " muted phrases");
    const until = hours === undefined ? null : now() + hours * HOUR_MS;
    mine.set(p, until);
    log.info("mute.set", { userId, phrase: p });
    return { phrase: p, until };
  }

  function unmuteWord(userId, phrase) {
    getUserRow(store, userId);
    if (typeof phrase !== "string") return false;
    const had = activeMutes(store, now, userId).some(([p]) => p === normalize(phrase));
    if (had) store.mutes.get(userId).delete(normalize(phrase));
    return had;
  }

  function getMutes(userId) {
    getUserRow(store, userId);
    return activeMutes(store, now, userId).map(([phrase, until]) => ({ phrase, until })).sort((a, b) => (a.phrase < b.phrase ? -1 : 1));
  }

  return { muteWord, unmuteWord, getMutes };
}

module.exports = { create, hiddenBy };
