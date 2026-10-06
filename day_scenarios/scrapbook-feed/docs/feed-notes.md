# The feed API: how it works

Team wiki · last edited by Ines Duarte · 5 months ago

Scrapbook's home feed is the posts of the people you follow, newest first. This page is about `getFeed` and everything around it.

## How a feed is built

- There are **no precomputed timelines**. A feed is computed from the posts table when it is asked for (a follower-limit of 5,000 keeps this cheap enough, and it means a new post shows up for everyone immediately).
- `GET /v1/feed?limit=20&cursor=...` returns `{ items, nextCursor }`. `limit` is 1 to 50 and the apps ask for 20. `nextCursor` is `null` on the last page.
- **Cursors are opaque.** Clients start with no cursor and pass back whatever `nextCursor` they got. They must never parse or build one.
- The response is `Cache-Control: private, no-store`. The CDN bypasses `/v1/feed`.

## Who calls it

- The iOS and Android apps (infinite scroll: they ask for the next page when you are 70% down, since 7.12; 90% before that).
- The web app (same, with a 20-item page).
- Clients keep several app versions alive at once. 7.11 and 7.12 together are about 85% of sessions.

## What changes underneath a feed

- New posts arrive all the time (about 3 per second at the morning and evening peaks for a user who follows a few hundred accounts).
- People and moderation delete posts. Moderation purges spam waves in bulk.
- The partner import job (`feed_bulk_import`) writes batches of posts that all carry the **same timestamp**, the time of the original post on the partner site.

## Monitoring

- The `feed-audit` job samples scroll sessions (consecutive page requests by the same user) and reports `duplicates` and `gaps`. The alert `feed_duplicate_rate` fires above 0.5% of sampled sessions.
- Runbook flags (ask the SRE on call): `feed_page_size` (what the apps ask for, default 20) and `feed_bulk_import` (the partner job).
