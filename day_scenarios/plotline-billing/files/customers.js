const tz = require("./tz");
const { nextId, getCustomerRow } = require("./store");

function create({ store, now, log }) {
  function createCustomer({ name, timeZone } = {}) {
    if (typeof name !== "string" || !name) throw new TypeError("name is required");
    if (!tz.isTimeZone(timeZone)) throw new RangeError("unknown time zone " + timeZone);
    // The offset is cached here so billing doesn't have to call Intl for every period boundary.
    const customer = { id: nextId(store, "cus"), name, timeZone, utcOffsetMinutes: tz.offsetMinutes(timeZone, now()) };
    store.customers.set(customer.id, customer);
    log.info("customer.created", { customerId: customer.id, timeZone, offset: customer.utcOffsetMinutes });
    return { ...customer };
  }

  function getCustomer(id) {
    return { ...getCustomerRow(store, id) };
  }

  return { createCustomer, getCustomer };
}

module.exports = { create };
