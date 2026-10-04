const { rateFor } = require("./rates");

// Per-user usage buckets. Module level so the nightly job reuses the same objects
// instead of allocating thousands of them for every tenant.
const buckets = new Map();

function summarize(events) {
  for (const e of events) {
    let b = buckets.get(e.userId);
    if (!b) buckets.set(e.userId, (b = { userId: e.userId, units: 0 }));
    b.units += e.units;
  }
  return [...buckets.values()];
}

function buildReport(tenant) {
  const rate = rateFor(tenant.plan);
  const rows = summarize(tenant.events).map(b => ({
    userId: b.userId,
    name: tenant.users[b.userId].name,
    units: b.units,
    costCents: Math.round((b.units * rate) / 1000),
  }));
  rows.sort((a, b) => b.costCents - a.costCents || a.name.localeCompare(b.name));
  const totalUnits = rows.reduce((n, r) => n + r.units, 0);
  return { tenant: tenant.name, rows, total: Math.round((totalUnits * rate) / 1000) };
}

module.exports = { buildReport };
