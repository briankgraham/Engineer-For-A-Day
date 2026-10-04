const { rateFor } = require("./rates");

function summarize(events) {
  const buckets = new Map();
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
  const total = rows.reduce((n, r) => n + r.costCents, 0);
  return { tenant: tenant.name, rows, total };
}

module.exports = { buildReport };
