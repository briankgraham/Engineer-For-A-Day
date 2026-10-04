const { getUserRow } = require("./store");

// PING-231: quiet hours. Post notifications that arrive during a user's quiet hours are held, and
// deliverHeld (a cron, every minute) sends one summary push per device once the quiet hours are over.
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MIN = 24 * 60;

function minutesOf(hhmm) {
  const m = HHMM.exec(hhmm);
  return +m[1] * 60 + +m[2];
}

// The minute of the user's local day (0-1439) at UTC time `at` (ms).
function localMinute(user, at) {
  const m = Math.floor(at / 60000) + user.utcOffsetMinutes;
  return ((m % DAY_MIN) + DAY_MIN) % DAY_MIN;
}

function isQuietAt(user, at) {
  if (!user.quiet) return false;
  const t = localMinute(user, at), start = minutesOf(user.quiet.start), end = minutesOf(user.quiet.end);
  return start < end ? start <= t && t < end : t >= start || t < end; // 22:00-07:00 wraps past midnight
}

function create({ store, push, now, log }) {
  function setQuietHours(userId, window) {
    const user = getUserRow(store, userId);
    if (window === null) {
      user.quiet = null;
      return null;
    }
    if (!window || !HHMM.test(window.start) || !HHMM.test(window.end) || window.start === window.end) {
      throw new RangeError("quiet hours need a start and an end as HH:MM, and they must differ");
    }
    user.quiet = { start: window.start, end: window.end };
    return { ...user.quiet };
  }

  function heldCount(userId) {
    getUserRow(store, userId);
    return (store.held.get(userId) || []).length;
  }

  async function deliverHeld() {
    let users = 0;
    for (const [userId, held] of store.held) {
      const user = store.users.get(userId);
      if (!user || !held.length || isQuietAt(user, now())) continue;
      store.held.delete(userId);
      const n = held.length;
      const msg = { title: "While you were away", body: n + " new notification" + (n === 1 ? "" : "s") };
      for (const token of user.devices) {
        await push.send({ token, ...msg });
        log.info("push.summary", { userId, token, count: n });
      }
      users++;
    }
    return { users };
  }

  return { setQuietHours, heldCount, deliverHeld };
}

module.exports = { create, isQuietAt };
