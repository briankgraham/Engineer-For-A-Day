// One driver: their rate history and the deliveries not paid yet. A pay run takes the deliveries it pays off the driver.
const { RateHistory } = require("./rates");

class Driver {
  constructor(id, hourlyRate) {
    this.id = id;
    this.rates = new RateHistory(hourlyRate);
    this.unpaid = []; // { start, end }
  }

  // Paid at the rate in effect when the delivery starts, rounded to the cent on its own.
  cost(d) {
    return Math.round((this.rates.at(d.start) * (d.end - d.start)) / 3600);
  }

  record(start, end) {
    this.unpaid.push({ start, end });
  }

  unpaidTotal() {
    return this.unpaid.reduce((sum, d) => sum + this.cost(d), 0);
  }

  // Pays every unpaid delivery that has ended by t, late ones included, and returns the cents paid.
  payUpTo(t) {
    const done = d => d.end <= t;
    const due = this.unpaid.filter(done);
    this.unpaid = this.unpaid.filter(d => !done(d));
    return due.reduce((sum, d) => sum + this.cost(d), 0);
  }
}

module.exports = { Driver };
