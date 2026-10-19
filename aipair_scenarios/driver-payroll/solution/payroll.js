// The public API the tests use: a thin facade that validates input, keeps the pay-run bookkeeping and delegates to the drivers.
const { Driver } = require("./driver");

function createPayroll() {
  const drivers = new Map();
  let paid = 0; // cents paid by every pay run so far
  let paidUpTo = 0; // time of the latest pay run; rates before it are closed

  const checkTime = (t, what) => {
    if (!Number.isInteger(t) || t < 0) throw new RangeError(what + " must be an integer >= 0");
  };
  const checkRate = r => {
    if (!Number.isInteger(r) || r <= 0) throw new RangeError("hourlyRate must be a positive integer (cents per hour)");
  };
  const driver = id => {
    const d = drivers.get(id);
    if (!d) throw new RangeError("no driver " + id);
    return d;
  };
  const unpaid = () => [...drivers.values()].reduce((sum, d) => sum + d.unpaidTotal(), 0);

  return {
    addDriver(driverId, hourlyRate) {
      if (typeof driverId !== "string" || !driverId) throw new RangeError("driverId must be a non-empty string");
      checkRate(hourlyRate);
      if (drivers.has(driverId)) throw new RangeError("driver " + driverId + " already exists");
      drivers.set(driverId, new Driver(driverId, hourlyRate));
    },
    recordDelivery(driverId, startTime, endTime) {
      const d = driver(driverId);
      checkTime(startTime, "startTime");
      checkTime(endTime, "endTime");
      if (endTime <= startTime) throw new RangeError("a delivery must end after it starts");
      d.record(startTime, endTime);
    },
    getTotalCost() {
      return paid + unpaid();
    },
    getTotalCostUnpaid() {
      return unpaid();
    },
    payUpTo(payTime) {
      checkTime(payTime, "payTime");
      if (payTime < paidUpTo) throw new RangeError("already paid up to " + paidUpTo);
      paidUpTo = payTime;
      let run = 0;
      for (const d of drivers.values()) run += d.payUpTo(payTime);
      paid += run;
      return run;
    },
    setRate(driverId, hourlyRate, fromTime) {
      const d = driver(driverId);
      checkRate(hourlyRate);
      checkTime(fromTime, "fromTime");
      if (fromTime < paidUpTo) throw new RangeError("pay up to " + paidUpTo + " is closed");
      d.rates.set(fromTime, hourlyRate);
    },
  };
}

module.exports = { createPayroll };
