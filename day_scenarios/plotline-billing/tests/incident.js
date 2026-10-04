// Hidden: INC-0627 (charged after cancelling; invoices dated a day early). Runs when the day ends.
function fakeGateway() {
  const calls = [];
  let n = 0;
  return { calls, charge(req) { calls.push(req); return Promise.resolve({ chargeId: "ch_" + ++n }); } };
}
function mk(start) {
  const { createApp } = require("./app");
  let t = Date.parse(start);
  const clock = { now: () => t, set: s => { t = Date.parse(s); } };
  const gateway = fakeGateway();
  return { app: createApp({ gateway, now: clock.now }), gateway, clock };
}
const iso = ms => new Date(ms).toISOString();
async function nySummerSignup() {
  const env = mk("2026-10-02T16:00:00Z");   // noon on Oct 2 in New York (EDT, UTC-4)
  const c = env.app.createCustomer({ name: "Fernway", timeZone: "America/New_York" });
  const s = await env.app.subscribe(c.id, { plan: "team", interval: "month" });
  return { ...env, s };
}

test("a New York subscription from the summer ends at local midnight after DST ends", async () => {
  const { s } = await nySummerSignup();
  eq(iso(s.periodEnd), "2026-11-02T05:00:00.000Z", "Nov 2 00:00 EST");
});

test("the renewal is not charged before the customer's local midnight, and the invoice has their local date", async () => {
  const { app, clock, s } = await nySummerSignup();
  clock.set("2026-11-02T04:00:00Z");   // 23:00 on Nov 1 in New York
  eq((await app.runRenewals()).renewed, 0, "renewed at 23:00 the day before");
  clock.set("2026-11-02T05:00:00Z");
  eq((await app.runRenewals()).renewed, 1);
  const invs = app.invoicesFor(s.id);
  eq(invs[1].date, "2026-11-02");
  eq(iso(app.getSubscription(s.id).periodEnd), "2026-12-02T05:00:00.000Z");
});

test("a customer who cancelled for the end of the period is never charged for the next one", async () => {
  const { app, gateway, clock, s } = await nySummerSignup();
  clock.set("2026-10-20T14:00:00Z");
  eq(app.cancel(s.id).cancelOn, "2026-11-02");
  for (const h of ["03", "04", "05", "06"]) {   // the hourly job around midnight New York time
    clock.set(`2026-11-02T${h}:00:00Z`);
    await app.runRenewals();
  }
  eq(gateway.calls.length, 1, "Tollgate charges");
  eq(app.invoicesFor(s.id).length, 1);
  eq(app.getSubscription(s.id).status, "canceled");
});

test("Berlin: a period that ends after the EU clock change (Oct 25) ends at local midnight", async () => {
  const { app } = mk("2026-09-26T10:00:00Z");   // 12:00 in Berlin (CEST, UTC+2)
  const c = app.createCustomer({ name: "Kranich GmbH", timeZone: "Europe/Berlin" });
  const s = await app.subscribe(c.id, { plan: "starter", interval: "month" });
  eq(iso(s.periodEnd), "2026-10-25T23:00:00.000Z", "Oct 26 00:00 CET");
});

test("spring forward: a subscription from the winter ends at local midnight in daylight time", async () => {
  const { app } = mk("2027-02-15T15:00:00Z");   // 10:00 in New York (EST, UTC-5)
  const c = app.createCustomer({ name: "Fernway", timeZone: "America/New_York" });
  const s = await app.subscribe(c.id, { plan: "team", interval: "month" });
  eq(iso(s.periodEnd), "2027-03-15T04:00:00.000Z", "Mar 15 00:00 EDT");
});
