// Job schedules for Chronos (the jobs moved off the app servers' crontab on Oct 30).
// schedule is a cron expression, read in timeZone.
module.exports = {
  renewals: { schedule: "0 * * * *", timeZone: "UTC", run: app => app.runRenewals() },
};
