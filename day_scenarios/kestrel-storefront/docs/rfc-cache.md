# RFC: Cache search results in the browser

Author: Priya Raman · Status: Draft, review Thursday · Reviewers: you, Dev

## Problem

Shoppers repeat searches all the time (they open a product, go back, the results load again), and on slow connections the second load is as slow as the first. We want repeat searches to feel instant.

## Proposal

1. After every successful search, store the whole response in `localStorage`, keyed by the lowercased query.
2. When a query is searched again, show the cached results immediately and refresh them from the API in the background (stale-while-revalidate). Replace what is on screen when the fresh answer arrives.
3. Entries live for 24 hours. We do not evict anything else: `localStorage` is plenty.
4. Roll it out to 100% of shoppers in the Thursday release.

## Why this works

- The cache is private to the shopper's browser, so there is nothing sensitive in it.
- Prices rarely change inside a day, and the refresh fixes the rare case.
- The key is just the query, so lookups are trivial.
- No flag is needed: the worst case is that a shopper sees yesterday's results for a second.

## Open questions

- Should the lifetime be 24 hours or 7 days?
- Should we also cache product pages the same way?
