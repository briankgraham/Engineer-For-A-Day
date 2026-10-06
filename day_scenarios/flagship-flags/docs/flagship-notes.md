# Flagship: how flags reach your code

Team wiki · last edited by Nadia Okafor · 4 months ago

Flagship is the feature-flag service every Quillbox product calls. A flag is a key plus rules (`enabled`, an allow list, attribute rules). Products ask "is `new-checkout` on for this user?" and we answer in under 5 ms.

## The pieces

- **Control plane** (`flagship-admin`): the only writer. It stores flags in Postgres and bumps the flag's `version` by one on every change. The version only goes up, per flag.
- **Evaluation nodes** (`flagship-eval`, 8 of them behind a load balancer): each keeps **its own in-memory copy of every flag**. `evaluate()` never touches Postgres. A request can land on any node, and two requests from the same user often land on different ones.
- **SDKs** (web and mobile): call `/v1/eval` and cache the answers for **5 minutes** on the client.

## Sync: how a change reaches the nodes

1. The control plane commits the change, then publishes the whole flag (not a diff) to an SNS topic.
2. Each node has its own SQS queue subscribed to the topic. It calls `applyUpdate(msg)` for every message.
3. **Delivery is at least once and not ordered.** A node can see the same message twice, or version 7 after version 8. So `applyUpdate` only replaces its copy if the message is **newer** than the one it has.
4. At startup a node loads everything with `loadSnapshot` from the control plane API.
5. Safety net: every node runs a **full resync every 6 hours** (cron at 00:00, 06:00, 12:00 and 18:00) that replaces its whole cache from the control plane.

## Operating it

- `POST /admin/resync` on a node reloads that node's cache from the control plane right now (about 2 s, no downtime). `flagshipctl resync --all` does it for every node.
- `flagshipctl rolling-restart eval --batch 2` restarts the nodes two at a time. A restarted node comes back with a fresh snapshot.
- The control plane is the source of truth. If a node disagrees with `GET /v1/flags/<key>`, the node is wrong.
- Kill switches (turning a flag off in an emergency) are expected to reach every node **within seconds**. This is why we use push and not polling.

## Things people ask

- *"The flag is off in the admin UI but a user still sees the feature."* Usually the user's SDK cache (5 minutes). If it lasts longer than that, check the nodes.
- *"Can we evaluate on the client?"* See the edge RFC.
