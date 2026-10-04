// Read-only: the job's own tests. They all pass in CI. More cases run when you finish.
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

test("sums each user's units across their events", () => {
  eq(buildReport(acme()).rows.map(r => [r.userId, r.units]), [["u1", 51340], ["u2", 21100], ["u3", 20020]]);
});

test("cost is in whole cents at 25 cents per 1,000 units on the pro plan", () => {
  eq(buildReport(acme()).rows.map(r => r.costCents), [1284, 528, 501]);
});

test("rows are sorted by cost, highest first, ties by name", () => {
  const t = acme();
  t.events = [{ userId: "u3", units: 4000 }, { userId: "u1", units: 4000 }, { userId: "u2", units: 8000 }];
  eq(buildReport(t).rows.map(r => r.name), ["Ben", "Ana", "Cho"]);
});

test("a free plan costs nothing", () => {
  const t = acme(); t.plan = "free";
  const r = buildReport(t);
  eq(r.rows.map(x => x.costCents), [0, 0, 0]);
  eq(r.total, 0);
});

test("an unknown plan throws RangeError", () => {
  const t = acme(); t.plan = "gold";
  throws(() => buildReport(t), RangeError);
});

test("runNightly returns a report for a tenant and logs it", () => {
  const lines = [];
  const out = runNightly([acme()], (level, msg) => lines.push(level + " " + msg));
  eq(out.length, 1);
  eq(lines.length, 1);
  eq(lines[0].startsWith("info report ok tenant=acme users=3 "), true);
});
