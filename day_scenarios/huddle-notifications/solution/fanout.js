const { codeError, getUserRow } = require("./store");
const { isQuietAt } = require("./quiet");

// The queue worker calls handleEvent for every message on the fanout queue:
//   { id: "ev_123", type: "post.created", actorId: "u_1", text: "..." }  -> every follower of the author
//   { id: "ev_124", type: "security.alert", userId: "u_2", text: "..." } -> that user only
// If handleEvent throws, the queue delivers the same message again (same id), up to 5 times.
function create({ store, push, limiter, now, log }) {
  // "eventId:token" for every push that was sent or is being sent, so a redelivered event skips those devices.
  const claimed = new Set();

  function recipientsOf(event) {
    if (event.type === "post.created") return [...(store.followers.get(event.actorId) || [])];
    if (event.type === "security.alert") return [event.userId];
    return [];
  }

  function messageFor(event) {
    if (event.type === "security.alert") return { title: "Security alert", body: event.text };
    const author = getUserRow(store, event.actorId);
    return { title: author.name + " posted", body: event.text.slice(0, 100) };
  }

  async function handleEvent(event) {
    if (!event || typeof event.id !== "string" || typeof event.type !== "string" || typeof event.text !== "string") throw new TypeError("bad event");
    const recipients = recipientsOf(event);
    if (!recipients.length) return { sent: 0 };
    const msg = messageFor(event);
    let sent = 0;
    const failed = [];
    for (const userId of recipients) {
      const user = store.users.get(userId);
      if (!user) continue;
      if (event.type !== "security.alert" && isQuietAt(user, now())) {
        const held = store.held.get(userId) || [];
        if (!held.includes(event.id)) held.push(event.id);
        store.held.set(userId, held);
        continue;
      }
      const todo = user.devices.filter(token => !claimed.has(event.id + ":" + token));
      if (!todo.length) continue;
      if (!limiter.allowPush(userId, event.type)) {
        log.info("push.rate_limited", { eventId: event.id, userId });
        continue;
      }
      for (const token of todo) {
        const key = event.id + ":" + token;
        if (claimed.has(key)) continue;
        claimed.add(key); // before the await, so another worker holding the same event skips this device
        try {
          const { messageId } = await push.send({ token, ...msg });
          store.deliveries.push({ eventId: event.id, userId, token, at: now() });
          log.info("push.sent", { eventId: event.id, userId, token, messageId });
          sent++;
        } catch (e) {
          if (e.status === 410) {
            // Unregistered: the app was uninstalled. Retrying can never work, so drop the token.
            user.devices = user.devices.filter(t => t !== token);
            log.info("push.token_removed", { userId, token });
            continue;
          }
          claimed.delete(key); // not delivered, so a redelivery may try this device again
          failed.push(token);
          log.warn("push.failed", { eventId: event.id, userId, token, status: e.status });
        }
      }
    }
    // Throwing makes the queue redeliver the event; only the devices that failed are tried again.
    if (failed.length) throw codeError("PUSH_FAILED", failed.length + " push(es) failed for " + event.id);
    return { sent };
  }

  function deliveriesFor(userId) {
    return store.deliveries.filter(d => d.userId === userId).map(d => ({ ...d }));
  }

  return { handleEvent, deliveriesFor };
}

module.exports = { create };
