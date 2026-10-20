// The expense policy engine. Finance writes the company policy as a list of rules (plain data, see the brief);
// createEngine checks the rules once, and engine.evaluate(expenses) returns the violations.
// Later levels add rule types; split this into more files however your design needs.
const { toCents } = require("./money");

function createEngine(rules) {
  // TODO
  throw new Error("not implemented");
}

module.exports = { createEngine };
