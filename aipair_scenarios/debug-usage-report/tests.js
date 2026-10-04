// Hidden edge cases (run when the candidate finishes, on top of visible_tests.js)
const buildReport = (...a) => require("./report").buildReport(...a);
const runNightly = (...a) => require("./nightly").runNightly(...a);

const acme = () => ({
  name: "acme", plan: "pro",
  users: { u1: { name: "Ana" }, u2: { name: "Ben" }, u3: { name: "Cho" } },
  events: [
    { userId: "u1", units: 48240 }, { userId: "u2", units: 21020 }, { userId: "u3", units: 20020 },
    { userId: "u1", units: 3100 }, { userId: "u2", units: 80 },
  ],
});
const globex = () => ({
  name: "globex", plan: "team",
  users: { u1: { name: "Gus" }, u7: { name: "Gia" } },
  events: [{ userId: "u7", units: 10000 }, { userId: "u1", units: 5000 }],
});
// Same user ids as acme, so mixed-up state does not crash, it silently corrupts.
const clash = () => ({
  name: "initech", plan: "pro",
  users: { u1: { name: "Ivy" }, u2: { name: "Ian" }, u3: { name: "Ida" } },
  events: [{ userId: "u1", units: 1000 }, { userId: "u2", units: 2000 }, { userId: "u3", units: 3000 }],
});

test("the total is the sum of the row costs, not rounded separately", () => {
  const t = { name: "t", plan: "pro", users: { a: { name: "A" }, b: { name: "B" } }, events: [{ userId: "a", units: 20 }, { userId: "b", units: 20 }] };
  const r = buildReport(t);
  eq(r.rows.map(x => x.costCents), [1, 1]);
  eq(r.total, 2);
});

test("acme's total matches the sum of its rows (2313)", () => {
  eq(buildReport(acme()).total, 2313);
});

test("building a second tenant after the first only reports the second tenant's users", () => {
  buildReport(acme());
  const r = buildReport(globex());
  eq(r.rows.map(x => x.userId), ["u7", "u1"]);
  eq(r.rows.map(x => x.units), [10000, 5000]);
});

test("tenants with overlapping user ids do not share usage", () => {
  buildReport(acme());
  const r = buildReport(clash());
  eq(r.rows.map(x => [x.name, x.units]), [["Ida", 3000], ["Ian", 2000], ["Ivy", 1000]]);
  eq(r.total, 150);
});

test("building the same tenant twice gives the same report", () => {
  const first = buildReport(acme());
  eq(buildReport(acme()), first);
});

test("a tenant with no events gets an empty report with a zero total", () => {
  const t = acme(); t.events = [];
  eq(buildReport(t), { tenant: "acme", rows: [], total: 0 });
});

test("the tenant passed in is not modified", () => {
  const t = acme(); const before = JSON.stringify(t);
  buildReport(t);
  eq(JSON.stringify(t), before);
});

test("runNightly reports every tenant, in order", () => {
  const lines = [];
  const out = runNightly([acme(), globex(), clash()], (l, m) => lines.push(l + " " + m));
  eq(out.map(r => r.tenant), ["acme", "globex", "initech"]);
  eq(lines.every(l => l.startsWith("info ")), true);
});

test("a tenant that fails is logged and does not affect the tenants after it", () => {
  const bad = { ...globex(), plan: "gold" };
  const lines = [];
  const out = runNightly([acme(), bad, clash()], (l, m) => lines.push(l + " " + m.split("\n")[0]));
  eq(out.map(r => r.tenant), ["acme", "initech"]);
  eq(lines[1].startsWith("error report failed tenant=globex"), true);
  eq(out[1].rows.map(r => r.name), ["Ida", "Ian", "Ivy"]);
});
