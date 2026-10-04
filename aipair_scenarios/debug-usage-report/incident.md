# INC-0733: nightly usage reports failing for most tenants

**Severity:** SEV-3 · **Opened by:** dee-oncall · **Owner:** you (usage-job)

## Summary

Since Tuesday's run, the nightly usage report job only succeeds for the first tenant. Every other tenant logs an error and gets no emailed report. Support also has one open ticket about a wrong total (below).

## What we know

- Started with the Tuesday 02:00 run. Monday was fine. The job runs the tenants in the order they appear in `tenants.json`.
- Restarting the job did not help: same result, same tenant order.
- Dee re-ran `globex` by hand (`node scripts/one.js globex`) and got a normal report.
- Changes shipped since Monday: bumped the `team` rate from 20 to 18 (PRICE-31), reuse bucket objects in `report.js` to cut GC (PERF-12), log `err.stack` in `nightly.js` (OPS-9).
- No upstream data change that we know of. The events table looks normal.

## Job log, Tuesday 02:00

```
02:00:03 info  report ok tenant=acme users=3 total=2312
02:00:03 error report failed tenant=globex TypeError: Cannot read properties of undefined (reading 'name')
    at /srv/usage-job/src/report.js:20:37
    at Array.map (<anonymous>)
    at buildReport (/srv/usage-job/src/report.js:18:46)
    at runNightly (/srv/usage-job/src/nightly.js:8:24)
02:00:03 error report failed tenant=initech TypeError: Cannot read properties of undefined (reading 'name')
    at /srv/usage-job/src/report.js:20:37
    at Array.map (<anonymous>)
    at buildReport (/srv/usage-job/src/report.js:18:46)
    at runNightly (/srv/usage-job/src/nightly.js:8:24)
02:00:03 error report failed tenant=umbrella TypeError: Cannot read properties of undefined (reading 'name')
    at /srv/usage-job/src/report.js:20:37
    at Array.map (<anonymous>)
    at buildReport (/srv/usage-job/src/report.js:18:46)
    at runNightly (/srv/usage-job/src/nightly.js:8:24)
02:00:03 info  done: 1 ok, 3 failed
```

## Support ticket SUP-5521 (acme)

> The PDF you email us says our total is **$23.12**, but the dashboard, which adds up the per-user rows, says **$23.13**. It's only a cent, but our finance team reconciles these every month and wants them to match.

The per-user rows in the report: Ana 1284¢, Ben 528¢, Cho 501¢. The dashboard adds those up. The emailed total comes from `buildReport`.

## Your task

Find out why the job fails and why the totals disagree, and fix both. Verify what you find, don't assume it. The job's own tests (the read-only test tab) are all green in CI.
