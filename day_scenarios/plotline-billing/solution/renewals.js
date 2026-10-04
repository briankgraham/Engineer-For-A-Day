// Chronos runs this every hour (see jobs.js). It renews every active subscription whose period has ended,
// and ends the ones that were cancelled.
function create({ store, now, log }, { renew }) {
  async function runRenewals() {
    const t = now();
    const out = { renewed: 0, canceled: 0, failed: 0 };
    for (const sub of store.subscriptions.values()) {
      if (sub.status !== "active") continue;
      if (sub.periodEnd > t) continue;
      // A cancelled subscription ends when its period does, instead of renewing: decided by the period, not by comparing dates.
      if (sub.cancelOn) {
        sub.status = "canceled";
        out.canceled++;
        log.info("subscription.canceled", { subscriptionId: sub.id, cancelOn: sub.cancelOn });
        continue;
      }
      try {
        await renew(sub);
        out.renewed++;
      } catch (e) {
        sub.status = "past_due";
        out.failed++;
        log.warn("renewal.failed", { subscriptionId: sub.id, status: e.status });
      }
    }
    log.info("renewals.run", out);
    return out;
  }

  return { runRenewals };
}

module.exports = { create };
