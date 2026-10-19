// The bank behind the API in the brief. Every method gets the current timestamp (milliseconds) first,
// and timestamps only go up from one call to the next. Inputs are always well-formed.
// Later levels add methods to this class; split it into more files however your design needs.
class Bank {
  createAccount(timestamp, accountId) {
    throw new Error("not implemented");
  }

  deposit(timestamp, accountId, amount) {
    throw new Error("not implemented");
  }

  transfer(timestamp, sourceId, targetId, amount) {
    throw new Error("not implemented");
  }
}

function createBank() {
  return new Bank();
}

module.exports = { createBank };
