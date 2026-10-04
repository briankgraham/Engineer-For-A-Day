# Paystream integration notes

Team wiki · last edited by Priya Raman · 3 months ago

Paystream is our card processor. We call it from `payments.js` (charges) and it calls us back at `POST /webhooks/paystream` (`webhooks.js`).

## Charges

- `POST /v2/charges` with `{ amount, currency, metadata: { orderId } }`.
- **Idempotency:** send an `Idempotency-Key` header and Paystream returns the original charge for any repeat of that key for 24 hours. **Without the header, every request is a new charge.** `metadata.orderId` is only stored for reporting; Paystream does not dedupe on it.
- **Timeouts:** a request that times out on our side may still have succeeded on theirs. Treat a timeout as "unknown", not "failed".
- Errors: `402 card_declined`, `402 insufficient_funds` (do not retry, the result will not change and repeated declines can get a card flagged), `409 idempotency_conflict`, `429` and `5xx` (safe to retry *with the same idempotency key*).

## Webhooks

- Event shape: `{ id: "evt_...", type: "charge.succeeded" | "charge.refunded" | ..., chargeId }`.
- **Delivery is at least once.** If we don't answer 2xx within 5 seconds, Paystream redelivers the same event (same `id`) with backoff for up to 3 days. Redeliveries are normal, not a bug on their side.
- Events can arrive out of order.

## Refunds

- `POST /v2/refunds` with `{ chargeId, amount }`. Partial refunds are allowed. Support can also refund from the Paystream dashboard.

## Status

- https://status.paystream.example (degraded performance shows up there before it shows up in our graphs)
