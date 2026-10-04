const tz = require("./tz");
const { price, INTERVAL_MONTHS } = require("./plans");
const { nextId, codeError, getCustomerRow, getSubRow } = require("./store");
const { chargeInvoice } = require("./invoices");

// Periods start and end at local midnight in the customer's time zone, on the subscription's anchor day
// (the day of the month they subscribed, or the last day of a shorter month).
function boundary(customer, date) {
  return Date.UTC(date.y, date.m - 1, date.d) - customer.utcOffsetMinutes * 60000;
}

// Callers always get copies, never the stored rows.
function copySub(s) {
  return { ...s, periodStartDate: { ...s.periodStartDate }, periodEndDate: { ...s.periodEndDate } };
}

function create(ctx) {
  const { store, now, log } = ctx;

  async function subscribe(customerId, { plan, interval } = {}) {
    const amountCents = price(plan, interval);
    const customer = getCustomerRow(store, customerId);
    const today = tz.localDate(customer.timeZone, now());
    const endDate = tz.addMonths(today, INTERVAL_MONTHS[interval], today.d);
    const sub = {
      id: nextId(store, "sub"), customerId, plan, interval, status: "active", anchorDay: today.d,
      periodStart: boundary(customer, today), periodEnd: boundary(customer, endDate),
      periodStartDate: today, periodEndDate: endDate, cancelOn: null,
    };
    await chargeInvoice(ctx, sub, customer, { kind: "subscribe", amountCents, periodStart: sub.periodStart, periodEnd: sub.periodEnd });
    store.subscriptions.set(sub.id, sub);
    log.info("subscription.created", { subscriptionId: sub.id, customerId, plan, interval, periodEnd: sub.periodEnd });
    return copySub(sub);
  }

  // Charges the next period and moves the subscription onto it. The renewal job calls this once a period has ended.
  async function renew(sub) {
    const customer = getCustomerRow(store, sub.customerId);
    const startDate = sub.periodEndDate;
    const endDate = tz.addMonths(startDate, INTERVAL_MONTHS[sub.interval], sub.anchorDay);
    const periodStart = sub.periodEnd, periodEnd = boundary(customer, endDate);
    const invoice = await chargeInvoice(ctx, sub, customer, { kind: "renewal", amountCents: price(sub.plan, sub.interval), periodStart, periodEnd });
    Object.assign(sub, { periodStart, periodEnd, periodStartDate: startDate, periodEndDate: endDate });
    log.info("renewal.charged", { subscriptionId: sub.id, customerId: customer.id, timeZone: customer.timeZone, offset: customer.utcOffsetMinutes, periodStart, invoiceId: invoice.id, invoiceDate: invoice.date });
    return invoice;
  }

  // Cancels at the end of the current period: the customer keeps access until then and is not charged again.
  // cancelOn is the date in the confirmation email ("Your plan ends on Nov 2").
  function cancel(subId) {
    const sub = getSubRow(store, subId);
    if (sub.status !== "active") throw codeError("SUB_NOT_ACTIVE", "subscription " + subId + " is " + sub.status);
    sub.cancelOn = tz.format(sub.periodEndDate);
    log.info("subscription.cancel_scheduled", { subscriptionId: sub.id, cancelOn: sub.cancelOn });
    return copySub(sub);
  }

  function getSubscription(id) {
    return copySub(getSubRow(store, id));
  }

  return { subscribe, cancel, getSubscription, renew };
}

module.exports = { create, boundary, copySub };
