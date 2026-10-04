const { getUserRow } = require("./store");

// The queue worker calls handleEvent for every message on the fanout queue:
//   { id: "ev_123", type: "post.created", actorId: "u_1", text: "..." }  -> every follower of the author
//   { id: "ev_124", type: "security.alert", userId: "u_2", text: "..." } -> that user only
// If handleEvent throws, the queue delivers the same message again (same id), up to 5 times.
function create({ store, push, limiter, now, log }) {
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
    for (const userId of recipients) {
      const user = store.users.get(userId);
      if (!user) continue;
      if (!limiter.allowPush(userId, event.type)) {
        log.info("push.rate_limited", { eventId: event.id, userId });
        continue;
      }
      for (const token of user.devices) {
        const { messageId } = await push.send({ token, ...msg });
        store.deliveries.push({ eventId: event.id, userId, token, at: now() });
        log.info("push.sent", { eventId: event.id, userId, token, messageId });
        sent++;
      }
    }
    return { sent };
  }

  function deliveriesFor(userId) {
    return store.deliveries.filter(d => d.userId === userId).map(d => ({ ...d }));
  }

  return { handleEvent, deliveriesFor };
}

module.exports = { create };
