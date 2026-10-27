# Accounts: the multiple-emails migration (ACC-388)

Team wiki · last edited by Anjali Rao · 2 weeks ago

People will be able to have several emails on one account. Today an account has exactly one, in the `users.email` column. This page is the plan and where we are.

## The plan (expand, then contract)

1. **Expand.** New table `user_emails` (the normalized email is unique, one row can be marked primary). Behind `emails_dual_write`, `createUser` and `changeEmail` write both tables in one transaction. **On for all nodes since Dec 1.**
2. **Backfill.** Copy every existing account's email into `user_emails`. Done once, with a SQL script, on **Dec 4** (about 1.2 million rows; it skipped 37 rows that hit the unique index, which are case-duplicate emails in the legacy data). The script is not in the repo; the ticket ACC-411 turns it into a proper job and a verification report.
3. **Read.** Behind `emails_read_new`, `findByEmail` reads `user_emails` instead of `users.email`. It is a per-node flag: **on for node n-3 only (1 of 10) since Dec 14, as a canary.**
4. **Contract.** Stop writing `users.email` and drop the column. Not scheduled.

## Who reads `users.email` today

- The web login (`findByEmail`).
- The nightly export job and the data-warehouse sync read the column directly.
- The v1 mobile API returns `email` from the column on `GET /v1/users/:id`. Old app versions use it for months.

## Writers

- The sign-up form and the settings page go through `createUser` and `changeEmail`.
- Enterprise onboarding uploads a CSV through `importUsers`.

## Flags and alerts

- Flags are remote config. `emails_dual_write` is for all nodes; `emails_read_new` is per node (ask the SRE on call to change it).
- `login_no_account_rate` pages when more than 5% of sign-ins get "No account with that email" over 15 minutes, across all nodes.
