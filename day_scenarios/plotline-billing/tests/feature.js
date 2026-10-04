// Hidden: BILL-88 upgrades mid-cycle. Runs when the day ends.
// Tokyo has no daylight saving time, so these do not depend on the INC-0627 fix.
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
// Subscribed at 10:00 on Oct 15 in Tokyo: the period is Oct 15 to Nov 15 (31 days).
async function tokyo(plan = "team", interval = "month") {
  const env = mk("2026-10-15T01:00:00Z");
  const c = env.app.createCustomer({ name: "Sakura KK", timeZone: "Asia/Tokyo" });
  const s = await env.app.subscribe(c.id, { plan, interval });
  return { ...env, s };
}

test("monthly to annual: credits the unused days, charges the rest, and starts a new year today", async () => {
  const { app, gateway, clock, s } = await tokyo();
  clock.set("2026-11-02T06:00:00Z");   // 15:00 on Nov 2 in Tokyo: Nov 2..14 unused = 13 of 31 days
  const inv = await app.upgrade(s.id, { plan: "team", interval: "year" });
  eq(inv.kind, "upgrade");
  eq(inv.creditCents, 2054, "floor(4900 * 13 / 31)");
  eq(inv.amountCents, 49000 - 2054);
  eq(inv.date, "2026-11-02");
  eq(gateway.calls[1].amountCents, 46946);
  const after = app.getSubscription(s.id);
  eq([after.plan, after.interval, after.anchorDay], ["team", "year", 2]);
  eq(iso(after.periodStart), "2026-11-01T15:00:00.000Z", "Nov 2 00:00 in Tokyo");
  eq(iso(after.periodEnd), "2027-11-01T15:00:00.000Z");
});

test("unused days are the customer's calendar days, today included", async () => {
  const a = await tokyo();
  a.clock.set("2026-11-02T14:59:00Z");   // 23:59 on Nov 2 in Tokyo
  eq((await a.app.upgrade(a.s.id, { plan: "team", interval: "year" })).creditCents, 2054);
  const b = await tokyo();
  b.clock.set("2026-11-02T15:00:00Z");   // 00:00 on Nov 3: 12 days left
  eq((await b.app.upgrade(b.s.id, { plan: "team", interval: "year" })).creditCents, 1896);
});

test("upgrading on the first day of a period credits all of it", async () => {
  const { app, clock, s } = await tokyo();
  clock.set("2026-10-15T05:00:00Z");
  const inv = await app.upgrade(s.id, { plan: "team", interval: "year" });
  eq(inv.creditCents, 4900);
  eq(inv.amountCents, 44100);
});

test("starter to team on the monthly interval", async () => {
  const { app, clock, s } = await tokyo("starter", "month");
  clock.set("2026-11-02T06:00:00Z");
  const inv = await app.upgrade(s.id, { plan: "team", interval: "month" });
  eq(inv.creditCents, 503);
  eq(inv.amountCents, 4900 - 503);
  eq(iso(app.getSubscription(s.id).periodEnd), "2026-12-01T15:00:00.000Z");
});

test("only upgrades are allowed: NOT_AN_UPGRADE otherwise", async () => {
  const cases = [["team", "year", "starter", "year"], ["team", "month", "team", "month"], ["starter", "year", "starter", "month"], ["starter", "year", "team", "month"]];
  for (const [p0, i0, p1, i1] of cases) {
    const { app, clock, s } = await tokyo(p0, i0);
    clock.set("2026-11-02T06:00:00Z");
    eq((await errOf(app.upgrade(s.id, { plan: p1, interval: i1 })) || {}).code, "NOT_AN_UPGRADE", `${p0}/${i0} -> ${p1}/${i1}`);
  }
});

test("unknown plans, unknown subscriptions and ended subscriptions are rejected", async () => {
  const { app, clock, s } = await tokyo();
  assert((await errOf(app.upgrade(s.id, { plan: "enterprise", interval: "year" }))) instanceof RangeError, "unknown plan -> RangeError");
  eq((await errOf(app.upgrade("sub_nope", { plan: "team", interval: "year" })) || {}).code, "SUB_NOT_FOUND");
  app.cancel(s.id);
  clock.set("2026-11-14T15:00:00Z");
  await app.runRenewals();
  eq(app.getSubscription(s.id).status, "canceled");
  eq((await errOf(app.upgrade(s.id, { plan: "team", interval: "year" })) || {}).code, "SUB_NOT_ACTIVE");
});

test("a declined upgrade changes nothing", async () => {
  const { app, gateway, clock, s } = await tokyo();
  clock.set("2026-11-02T06:00:00Z");
  gateway.declineNext();
  assert(await errOf(app.upgrade(s.id, { plan: "team", interval: "year" })), "the declined upgrade should reject");
  const after = app.getSubscription(s.id);
  eq([after.plan, after.interval, after.periodEnd], ["team", "month", s.periodEnd]);
  eq(app.invoicesFor(s.id).length, 1);
});

test("upgrading removes a scheduled cancellation", async () => {
  const { app, gateway, clock, s } = await tokyo();
  clock.set("2026-10-20T03:00:00Z");
  app.cancel(s.id);
  clock.set("2026-11-02T06:00:00Z");
  await app.upgrade(s.id, { plan: "team", interval: "year" });
  eq(app.getSubscription(s.id).cancelOn, null);
  clock.set("2026-11-14T15:00:00Z");   // the old period end
  await app.runRenewals();
  eq(app.getSubscription(s.id).status, "active");
  eq(gateway.calls.length, 2);
});

test("after an upgrade, the renewal job renews at the end of the new year at the annual price", async () => {
  const { app, gateway, clock, s } = await tokyo();
  clock.set("2026-11-02T06:00:00Z");
  await app.upgrade(s.id, { plan: "team", interval: "year" });
  clock.set("2026-11-14T15:00:00Z");
  eq((await app.runRenewals()).renewed, 0, "renewed at the old monthly period end");
  clock.set("2027-11-01T15:00:00Z");
  eq((await app.runRenewals()).renewed, 1);
  eq(gateway.calls[2].amountCents, 49000);
});
