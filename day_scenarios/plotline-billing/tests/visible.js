// billing.test.js: the service's existing test suite (CI runs it on every PR).
function fakeGateway() {
  const calls = [];
  let n = 0, decline = false;
  return {
    calls,
    declineNext() { decline = true; },
    charge(req) {
      calls.push(req);
      if (decline) { decline = false; const e = new Error("Tollgate: card_declined"); e.status = 402; return Promise.reject(e); }
      return Promise.resolve({ chargeId: "ch_" + ++n });
    },
  };
}
function mk(start) {
  const { createApp } = require("./app");
  let t = Date.parse(start);
  const clock = { now: () => t, set: s => { t = Date.parse(s); } };
  const gateway = fakeGateway();
  return { app: createApp({ gateway, now: clock.now }), gateway, clock };
}
const iso = ms => new Date(ms).toISOString();
const errOf = async p => { try { await p; } catch (e) { return e; } return null; };

test("subscribe charges the first period, which starts at local midnight today", async () => {
  const { app, gateway } = mk("2026-01-15T10:00:00Z");
  const c = app.createCustomer({ name: "Acme", timeZone: "UTC" });
  const s = await app.subscribe(c.id, { plan: "team", interval: "month" });
  eq(s.status, "active");
  eq(s.anchorDay, 15);
  eq(iso(s.periodStart), "2026-01-15T00:00:00.000Z");
  eq(iso(s.periodEnd), "2026-02-15T00:00:00.000Z");
  eq(gateway.calls[0].amountCents, 4900);
  const [inv] = app.invoicesFor(s.id);
  eq(inv.kind, "subscribe");
  eq(inv.date, "2026-01-15");
});

test("periods follow the customer's time zone (Tokyo is UTC+9)", async () => {
  const { app } = mk("2026-01-15T10:00:00Z");   // 19:00 on Jan 15 in Tokyo
  const c = app.createCustomer({ name: "Sakura KK", timeZone: "Asia/Tokyo" });
  const s = await app.subscribe(c.id, { plan: "starter", interval: "month" });
  eq(iso(s.periodStart), "2026-01-14T15:00:00.000Z");
  eq(iso(s.periodEnd), "2026-02-14T15:00:00.000Z");
  eq(app.invoicesFor(s.id)[0].date, "2026-01-15");
});

test("an annual plan ends on the same date next year", async () => {
  const { app, gateway } = mk("2026-03-01T12:00:00Z");
  const c = app.createCustomer({ name: "Acme", timeZone: "UTC" });
  const s = await app.subscribe(c.id, { plan: "team", interval: "year" });
  eq(iso(s.periodEnd), "2027-03-01T00:00:00.000Z");
  eq(gateway.calls[0].amountCents, 49000);
});

test("runRenewals renews a subscription when its period ends, not before", async () => {
  const { app, gateway, clock } = mk("2026-01-15T10:00:00Z");
  const c = app.createCustomer({ name: "Acme", timeZone: "UTC" });
  const s = await app.subscribe(c.id, { plan: "team", interval: "month" });
  clock.set("2026-02-14T23:59:00Z");
  eq((await app.runRenewals()).renewed, 0);
  clock.set("2026-02-15T00:00:00Z");
  eq((await app.runRenewals()).renewed, 1);
  const invs = app.invoicesFor(s.id);
  eq(invs.length, 2);
  eq(invs[1].kind, "renewal");
  eq(invs[1].date, "2026-02-15");
  eq(gateway.calls[1].amountCents, 4900);
  eq(iso(app.getSubscription(s.id).periodEnd), "2026-03-15T00:00:00.000Z");
});

test("the anchor day survives short months", async () => {
  const { app, clock } = mk("2026-01-31T09:00:00Z");
  const c = app.createCustomer({ name: "Acme", timeZone: "UTC" });
  const s = await app.subscribe(c.id, { plan: "starter", interval: "month" });
  eq(iso(s.periodEnd), "2026-02-28T00:00:00.000Z");
  clock.set("2026-02-28T00:00:00Z");
  await app.runRenewals();
  eq(iso(app.getSubscription(s.id).periodEnd), "2026-03-31T00:00:00.000Z");
});

test("a cancelled subscription keeps access to the period end and is not charged again", async () => {
  const { app, gateway, clock } = mk("2026-01-15T10:00:00Z");
  const c = app.createCustomer({ name: "Acme", timeZone: "UTC" });
  const s = await app.subscribe(c.id, { plan: "team", interval: "month" });
  clock.set("2026-01-20T08:00:00Z");
  const after = app.cancel(s.id);
  eq(after.cancelOn, "2026-02-15");
  eq(after.status, "active");
  clock.set("2026-02-15T00:00:00Z");
  await app.runRenewals();
  eq(app.getSubscription(s.id).status, "canceled");
  eq(gateway.calls.length, 1);
  eq(app.invoicesFor(s.id).length, 1);
});

test("a declined renewal marks the subscription past_due", async () => {
  const { app, gateway, clock } = mk("2026-01-15T10:00:00Z");
  const c = app.createCustomer({ name: "Acme", timeZone: "UTC" });
  const s = await app.subscribe(c.id, { plan: "team", interval: "month" });
  gateway.declineNext();
  clock.set("2026-02-15T00:00:00Z");
  eq((await app.runRenewals()).failed, 1);
  eq(app.getSubscription(s.id).status, "past_due");
  eq(app.invoicesFor(s.id).length, 1);
});

test("renewal charges carry an idempotency key per subscription and period", async () => {
  const { app, gateway, clock } = mk("2026-01-15T10:00:00Z");
  const c = app.createCustomer({ name: "Acme", timeZone: "UTC" });
  await app.subscribe(c.id, { plan: "team", interval: "month" });
  clock.set("2026-02-15T00:00:00Z");
  await app.runRenewals();
  assert(gateway.calls[1].idempotencyKey && gateway.calls[1].idempotencyKey !== gateway.calls[0].idempotencyKey, "a distinct key per period");
});

test("bad input is rejected", async () => {
  const { app } = mk("2026-01-15T10:00:00Z");
  throws(() => app.createCustomer({ name: "Acme", timeZone: "Mars/Olympus" }), RangeError);
  const c = app.createCustomer({ name: "Acme", timeZone: "UTC" });
  const e = await errOf(app.subscribe(c.id, { plan: "enterprise", interval: "month" }));
  assert(e instanceof RangeError, "unknown plan -> RangeError");
  eq((await errOf(app.subscribe("cus_nope", { plan: "team", interval: "month" }))).code, "CUSTOMER_NOT_FOUND");
});

test("getSubscription returns a copy", async () => {
  const { app } = mk("2026-01-15T10:00:00Z");
  const c = app.createCustomer({ name: "Acme", timeZone: "UTC" });
  const s = await app.subscribe(c.id, { plan: "team", interval: "month" });
  const got = app.getSubscription(s.id);
  got.status = "canceled";
  got.periodEndDate.d = 1;
  eq(app.getSubscription(s.id).status, "active");
  eq(app.getSubscription(s.id).periodEndDate.d, 15);
});
