# RFC: Billing ledger on an event log

Author: Noor Haddad · Status: Draft, review Thursday · Reviewers: you, Kenji

## Problem

Billing state lives in mutable rows: a subscription row is updated in place on every renewal, upgrade and cancellation. When something goes wrong we can't tell what a subscription looked like at the time, finance reconciles Tollgate against our tables by hand every month (two days of work), and the auditors keep asking for a history of changes we don't have.

## Proposal

1. Every billing change is an event on a Kafka topic, `billing-events`: `SubscriptionCreated`, `PlanChanged`, `CancellationScheduled`, `PeriodRenewed`, `PaymentSucceeded`, `PaymentFailed`, `RefundIssued`.
2. The topic is **partitioned by event type**, so each consumer only reads the partitions for the types it cares about (the email service only needs `PaymentSucceeded`).
3. Each event carries `occurredAt`, set from the producing service's clock. Consumers sort by `occurredAt` to put events in order.
4. Invoices are no longer stored. When someone asks for an invoice, the invoice service **rebuilds it by replaying the subscription's events through the current pricing code**. Invoices are then always consistent with the latest logic: fixing a pricing bug fixes every past invoice automatically.
5. Retention: the topic default (7 days), with a nightly snapshot of the current state to S3. The log is the source of truth.
6. GDPR: when a customer asks to be deleted, we delete their events from the topic.

## Why this works

- Every change is recorded, so audit and debugging get a full history for free.
- Finance's reconciliation becomes a consumer that compares `PaymentSucceeded` events with Tollgate's report.
- New features (usage-based pricing, seats) become new event types instead of schema migrations.

## Rollout

- Weeks 1-2: dual-write events alongside the current tables.
- Week 3: switch the invoice service to rebuilding from events; stop writing the invoices table.

## Open questions

- Kafka, or an append-only Postgres table?
- How often should we snapshot?
