# Billing: periods, time zones, Chronos and Tollgate

Team wiki · last edited by Noor Haddad · 5 months ago

The billing service owns customers, subscriptions, renewals and invoices. Tollgate is our card processor; Chronos is the company job scheduler.

## Billing periods

- A subscription is billed for periods of one month or one year. Periods start and end at **local midnight in the customer's time zone**, on the subscription's anchor day (the day of the month they subscribed; the last day of the month when that month is shorter: an anchor of 31 renews on Feb 28).
- Customers see dates, not instants: "Your plan renews on **Nov 2**". The invoice is dated with the customer's local date at the start of the period it pays for.
- **We never charge before a period ends.** A customer can cancel up to the last minute of their period, and the cancellation takes effect when the period ends. This is in our terms, and EU consumer rules require it for EU customers.

## Time zones

- Store the customer's IANA zone name (`America/New_York`), never just an offset. An offset is only true for part of the year: New York is UTC−4 in summer (EDT) and UTC−5 in winter (EST).
- To turn a local date into an instant, use `tz.startOfLocalDay(timeZone, y, m, d)`. It asks Intl for the offset **on that date**.
- Clock changes we care about:
- **Europe** (Berlin, London, …): clocks go back on Sun Oct 25, 2026 and forward on Sun Mar 28, 2027.
- **US & Canada**: clocks go back on Sun Nov 1, 2026 (02:00 → 01:00) and forward on Sun Mar 14, 2027 (02:00 → 03:00).
- **Tokyo, Singapore, most of Asia**: no DST.

## Renewal job

- `runRenewals()` runs **every hour** on Chronos (it moved there from the billing servers' crontab on Oct 30, CHG-2207).
- It renews every active subscription with `periodEnd <= now`. Because it compares with now, a run that fails or is skipped is caught up by the next one.
- Scheduled cancellations are ended by the same job.

## Chronos

- A job has a cron expression and a `timeZone` to read it in.
- In a zone with DST, a local time that **doesn't exist** (02:30 on the spring-forward day) is **skipped**, and a local time that happens twice (01:30 on the fall-back day) runs once. There is no automatic retry of skipped runs.
- Use UTC for anything that has to run every day.

## Tollgate

- `charge({ customerId, amountCents, idempotencyKey })`. Repeating a key within 24 hours returns the original charge instead of charging again.
- Rate limit: 100 charges per second per account; above that Tollgate returns `429` with `Retry-After`. Pace big batches instead of firing them all at once.
- Refunds: `refund({ chargeId, amountCents })`, partial refunds allowed. Support can bulk-refund from a CSV of charge ids.

## Invoices

- An issued invoice is never edited or deleted. A correction is a **credit note** that references the original invoice.
