# RFC: Per-follower fan-out for the Creators program

Author: Ravi Menon · Status: Draft, review Thursday · Reviewers: you, Lena

## Problem

The Creators program launches next month. Creators have up to **2M followers**. Today one `post.created` event fans out to every follower inside a single `handleEvent` call. For a 2M-follower creator that would take about 40 minutes, so the last followers hear about a live stream after it has ended. Product wants every follower notified **within 2 minutes**.

## Proposal

1. When a creator posts, the API handler loads the creator's follower ids and enqueues **one message per follower** on a new `fanout-per-user` queue (SQS standard), using `SendMessageBatch` (10 per call) in a loop.
2. 200 workers consume `fanout-per-user`; each message is one recipient: check rate limit, then send to each of their devices.
3. If any send in a message fails, the worker throws and SQS retries the whole message.

## Why this works

- Each message is small, so failures are isolated to one follower.
- SQS standard delivers each message once, so the workers don't need to track what they have already sent.
- 2M messages / 200 workers is about 10k each, so we finish well under 2 minutes.
- Enqueuing in the API request means the post is only "published" once every follower is queued, so nobody is missed.

## Rollout

- Week 1: behind a flag for 5 internal accounts.
- Week 2: all Creators.

## Open questions

- Should regular (non-creator) accounts use this path too?
- Do we need a separate queue per region?
