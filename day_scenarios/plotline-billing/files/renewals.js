const tz = require("./tz");
const { getCustomerRow } = require("./store");

// Chronos runs this every hour (see jobs.js). It renews every active subscription whose period has ended,
// and ends the ones that were cancelled.
function create({ store, now, log }, { renew }) {
  async function runRenewals() {
    const t = now();
    const out = { renewed: 0, canceled: 0, failed: 0 };
    for (const sub of store.subscriptions.values()) {
      if (sub.status !== "active") continue;
      const customer = getCustomerRow(store, sub.customerId);
      // A scheduled cancellation takes effect on the date we told the customer.
      if (sub.cancelOn && tz.localDate(customer.timeZone, t).str >= sub.cancelOn) {
        sub.status = "canceled";
        out.canceled++;
        log.info("subscription.canceled", { subscriptionId: sub.id, cancelOn: sub.cancelOn });
        continue;
      }
      if (sub.periodEnd > t) continue;
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
