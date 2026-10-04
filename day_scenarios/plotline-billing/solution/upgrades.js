// BILL-88: upgrades mid-cycle.
const tz = require("./tz");
const { price, INTERVAL_MONTHS } = require("./plans");
const { codeError, getCustomerRow, getSubRow } = require("./store");
const { chargeInvoice } = require("./invoices");
const { boundary } = require("./subscriptions");

const PLAN_RANK = { starter: 0, team: 1 };
const INTERVAL_RANK = { month: 0, year: 1 };

function create(ctx) {
  const { store, now, log } = ctx;

  // Moves an active subscription to a bigger plan and/or a longer interval, starting today.
  // The customer is credited for the unused days of the current period, counted in their own calendar days.
  async function upgrade(subId, { plan, interval } = {}) {
    const newPrice = price(plan, interval);
    const sub = getSubRow(store, subId);
    if (sub.status !== "active") throw codeError("SUB_NOT_ACTIVE", "subscription " + subId + " is " + sub.status);
    const dPlan = PLAN_RANK[plan] - PLAN_RANK[sub.plan], dInterval = INTERVAL_RANK[interval] - INTERVAL_RANK[sub.interval];
    if (dPlan < 0 || dInterval < 0 || (dPlan === 0 && dInterval === 0)) throw codeError("NOT_AN_UPGRADE", sub.plan + "/" + sub.interval + " -> " + plan + "/" + interval);

    const customer = getCustomerRow(store, sub.customerId);
    const today = tz.localDate(customer.timeZone, now());
    const periodDays = tz.daysBetween(sub.periodStartDate, sub.periodEndDate);
    const unusedDays = tz.daysBetween(today, sub.periodEndDate);
    const creditCents = Math.floor((price(sub.plan, sub.interval) * unusedDays) / periodDays);

    const endDate = tz.addMonths(today, INTERVAL_MONTHS[interval], today.d);
    const periodStart = boundary(customer, today), periodEnd = boundary(customer, endDate);
    // If the charge fails nothing below runs, so the subscription stays as it was.
    const invoice = await chargeInvoice(ctx, sub, customer, { kind: "upgrade", amountCents: newPrice - creditCents, creditCents, periodStart, periodEnd });
    Object.assign(sub, { plan, interval, anchorDay: today.d, periodStart, periodEnd, periodStartDate: today, periodEndDate: endDate, cancelOn: null });
    log.info("subscription.upgraded", { subscriptionId: sub.id, plan, interval, creditCents });
    return { ...invoice };
  }

  return { upgrade };
}

module.exports = { create };
