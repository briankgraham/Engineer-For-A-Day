// The public API the tests use. Keep createPayroll and the methods on the object it returns;
// design everything behind them however you like (driver.js and rates.js are there if you want them).

function createPayroll() {
  throw new Error("not implemented");
  // return {
  //   addDriver(driverId, hourlyRate) {},              // hourlyRate in cents per hour
  //   recordDelivery(driverId, startTime, endTime) {}, // times in seconds
  //   getTotalCost() {},                               // cents, paid and unpaid
  //   payUpTo(payTime) {},                             // a pay run; returns the cents it paid
  //   getTotalCostUnpaid() {},                         // cents
  // };
}

module.exports = { createPayroll };
