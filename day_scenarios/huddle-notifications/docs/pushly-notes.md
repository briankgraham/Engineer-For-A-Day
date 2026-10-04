# Pushly & the fanout queue: how sending works

Team wiki · last edited by Ravi Menon · 2 months ago

## The path of a push

1. The API publishes an event (`post.created`, `security.alert`, ...) to the **fanout** queue (SQS standard queue).
2. A fanout worker receives it and calls `handleEvent(event)` (`fanout.js`), which works out the recipients and calls Pushly once per device.
3. If `handleEvent` returns, the worker deletes the message. If it **throws**, the message is not deleted.

## Queue behaviour (SQS standard)

- **At-least-once delivery.** A message can occasionally be delivered more than once, even when nothing failed.
- **Visibility timeout: 30 s.** A received message is hidden from other workers for 30 seconds. If the worker has not deleted it by then (it threw, crashed, or is still working), the message becomes visible again and **another worker can pick it up**, with the same event id and `receive` count + 1.
- **maxReceiveCount: 5.** After the 5th receive the message goes to the dead-letter queue (`fanout-dlq`).
- Most events fan out in well under a second. A post by a big account (10k+ followers) can take minutes.

## Pushly API

- `POST /v1/send` with `{ token, title, body }`, returns `{ messageId }`. One request per device token.
- Pushly does **not** dedupe: every request is a new notification on the device. (iOS can collapse notifications that share an `apns-collapse-id`, but we don't set one today.)
- Errors:
  - `410 Unregistered`: the app was uninstalled or the token expired. **Permanent**: the token will never work again. Delete it.
  - `429 Too Many Requests`: back off and retry later.
  - `503`: Pushly is having trouble. Retry later.
  - `400`: bad payload. Don't retry.

## Dead tokens

`handleEvent` doesn't clean up dead tokens itself. The nightly **token-cleanup** job deletes every token that got a 410 in the last 24 h. Roughly 1–2% of tokens die each day (uninstalls), so without the job, dead tokens pile up quickly.

## Knobs (feature flags, SRE can flip them)

- `token_cleanup_job` (on/off): the nightly dead-token cleanup.
- `fanout_max_receives` (1–5, default 5): the queue's maxReceiveCount. 1 means no redelivery: failed sends are dropped.
- `fanout_paused` (on/off): stops the fanout workers. Events wait in the queue.

## Status

- https://status.pushly.example
