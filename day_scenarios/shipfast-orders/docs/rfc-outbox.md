# RFC: Transactional outbox for payment events

Author: Priya Raman · Status: Draft, review Thursday · Reviewers: you, Marco

## Problem

When an order is paid, `webhooks.js` updates the order and stock, and then (in the real service) calls the email and fulfillment services inline over HTTP. If one of those calls fails or the process restarts halfway through, the order is paid but nobody ships it or emails the customer. This happened 14 times last month and each one was a manual fix by support.

## Proposal

1. In the same database transaction that marks the order paid, insert a row into an `outbox` table: `{ id, type: "order.paid", orderId, payload, createdAt, sentAt: null }`.
2. A **relay** process polls `outbox` every 500 ms for rows with `sentAt IS NULL`, publishes each to an SQS FIFO queue, then sets `sentAt`.
3. **Consumers** (email, fulfillment) read from the queue and do their work.
4. Remove the inline HTTP calls from the webhook handler.

## Why this works

- The order update and the outbox row commit together, so we never lose an event.
- SQS FIFO gives us **exactly-once delivery**, so consumers can stay simple and do not need to track what they have already processed.
- FIFO also keeps every event in order across the whole system.

## Rollout

- Week 1: relay + queue behind a flag, dual-write (inline calls stay on).
- Week 2: switch consumers to the queue, remove inline calls.

## Open questions

- Polling interval: 500 ms OK, or should we use LISTEN/NOTIFY?
- Do we need to keep outbox rows after they are sent?
