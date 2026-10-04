// In-memory stand-in for Postgres. Each app gets its own store, so every test starts clean.
function createStore() {
  return {
    customers: new Map(),      // id -> { id, name, timeZone, utcOffsetMinutes }
    subscriptions: new Map(),  // id -> { id, customerId, plan, interval, status, anchorDay, periodStart, periodEnd, periodStartDate, periodEndDate, cancelOn }
    invoices: new Map(),       // id -> { id, subscriptionId, kind, amountCents, creditCents, date, periodStart, periodEnd, chargeId, status }
    seq: 1,
  };
}

function nextId(store, prefix) {
  return prefix + "_" + store.seq++;
}

// Errors the HTTP layer maps to 4xx responses carry a machine-readable code.
function codeError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

function getCustomerRow(store, id) {
  const c = store.customers.get(id);
  if (!c) throw codeError("CUSTOMER_NOT_FOUND", "no customer " + id);
  return c;
}

function getSubRow(store, id) {
  const s = store.subscriptions.get(id);
  if (!s) throw codeError("SUB_NOT_FOUND", "no subscription " + id);
  return s;
}

module.exports = { createStore, nextId, codeError, getCustomerRow, getSubRow };
