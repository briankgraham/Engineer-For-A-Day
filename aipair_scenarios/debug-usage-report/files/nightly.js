const { buildReport } = require("./report");

// Builds tonight's report for every tenant. One tenant failing must not stop the others.
function runNightly(tenants, log = () => {}) {
  const reports = [];
  for (const tenant of tenants) {
    try {
      const report = buildReport(tenant);
      reports.push(report);
      log("info", `report ok tenant=${tenant.name} users=${report.rows.length} total=${report.total}`);
    } catch (err) {
      log("error", `report failed tenant=${tenant.name} ${err.stack}`);
    }
  }
  return reports;
}

module.exports = { runNightly };
