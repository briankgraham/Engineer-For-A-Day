# RFC: A ranked feed

Author: Ines Duarte · Status: Draft, review Thursday · Reviewers: you, Tariq

## Problem

The chronological feed shows whatever is newest, so people who follow a lot of accounts miss the posts they would care about. Competitors rank, and our "time spent" is flat.

## Proposal

1. When the feed is requested, take the newest 500 posts from the people you follow (the **candidates**).
2. Call the ranking model (a hosted service, about 40 ms for 500 candidates) to score each one for this viewer.
3. Sort by score, highest first, and return the page. The cursor is the **offset into the ranked list**, so page 2 is items 20 to 39 of the same ranking.
4. Apply the viewer's muted words and blocked accounts to each page before it is returned.
5. Roll out as an experiment: users whose id is even get the ranked feed.

## Why this works

- Ranking is a total order, so offset pagination is exactly right: item 20 is item 20.
- Scores are cheap to recompute, so there is nothing to store.
- Filtering muted posts last means the model never sees what you muted, and we keep the model request identical for everyone.
- Splitting by even and odd ids is a simple, deterministic experiment.

## Rollout

- Week 1: ranker behind a flag for staff.
- Week 2 to 3: 50% of users (even ids).
- Week 4: decide.

## Open questions

- Should 500 be 1,000 candidates?
- What do we show if the ranking service is down?
