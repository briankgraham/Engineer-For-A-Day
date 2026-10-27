// Hidden: INC-0955 (quotes drifting below list price). Runs when the day ends.
function mk() {
  const { createApp } = require("./app");
  return createApp({ now: mkClock().now });
}
const WED = Date.UTC(2026, 11, 2, 12);
const lane = extra => ({ to: { country: "US", postcode: "94107" }, weightKg: 12, pickupAt: WED, ...extra });

test("a contract quote does not change what the next list-price quote costs", () => {
  const app = mk();
  const list = app.quote(lane()).amount;
  eq(list, 2821);
  eq(app.quote(lane({ customerId: "acme" })).amount, 2539);
  eq(app.quote(lane()).amount, list, "list price after a contract quote");
});

test("the same contract quote gives the same price every time", () => {
  const app = mk();
  const first = app.quote(lane({ customerId: "acme" })).amount;
  for (let i = 0; i < 5; i++) eq(app.quote(lane({ customerId: "acme" })).amount, first, "quote " + (i + 2));
});

test("contract customers do not affect each other", () => {
  const app = mk();
  const globex = app.quote(lane({ customerId: "globex" })).amount;
  app.quote(lane({ customerId: "acme" }));
  app.quote(lane({ customerId: "initech" }));
  eq(app.quote(lane({ customerId: "globex" })).amount, globex);
  eq(app.quote(lane({ service: "air", customerId: "acme" })).amount, mk().quote(lane({ service: "air", customerId: "acme" })).amount, "air after ground");
});

test("many contract quotes leave the rate card untouched", () => {
  const app = mk();
  const before = JSON.stringify(require("./rates").RATES);
  for (let i = 0; i < 25; i++) app.quote(lane({ customerId: i % 2 ? "acme" : "globex" }));
  eq(JSON.stringify(require("./rates").RATES), before);
  eq(app.quote(lane()).amount, 2821);
});
