# RFC: Move the accounts database to a new cluster

Author: Anjali Rao · Status: Draft, review Thursday · Reviewers: you, Kofi

## Problem

The accounts database (about 600 GB) runs on a cluster we cannot grow any more, on a Postgres version that goes out of support in the spring. We need to move it.

## Proposal

1. Pick a Saturday at 02:00 UTC, when traffic is lowest, as a maintenance window of 90 minutes.
2. At the start of the window put the service in read-only mode (sign-in keeps working but writes fail), take a `pg_dump`, restore it into the new cluster, and point the service at the new cluster.
3. Show a "maintenance" banner on the web app for the two hours around the window and post on the status page.
4. If something goes wrong, restore the old cluster from the dump and switch back.
5. We rehearse once, in staging.

## Why this works

- `pg_dump` and `pg_restore` are boring, well-understood tools. We do not need to learn logical replication or build anything new.
- Saturday 02:00 UTC has the least traffic of the week.
- Staging restores 60 GB in about 9 minutes, so production should fit in the window.
- Rolling back is just pointing the service at the old cluster again.

## Open questions

- Is 90 minutes enough, or should we ask for 3 hours?
- Who is on call for the window?
