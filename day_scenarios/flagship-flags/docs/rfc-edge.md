# RFC: Evaluate flags at the edge

Author: Nadia Okafor · Status: Draft, review Thursday · Reviewers: you, Kofi

## Problem

Every page view of every Quillbox product makes a `/v1/eval` call to our eval nodes. That is 30,000 requests per second at peak, it adds a round trip to every page load, and it is the reason we run 8 nodes. We also get tail latency when a node is busy.

## Proposal

1. The control plane publishes each product's **ruleset** (all its flags, rules, allow lists and rollout percentages) as a static JSON file to our CDN: `https://flags.quillbox.example/rulesets/<product>.json`.
2. The web and mobile SDKs download the file and **evaluate flags locally**, including the percentage bucketing. No `/v1/eval` call at all.
3. The CDN caches rulesets for **60 seconds**. The SDK checks for a new one every 60 seconds.
4. Once all clients have moved, we shut down the eval nodes and the SQS/SNS sync.

## Why this works

- Evaluation becomes free: zero network on the hot path, and our infrastructure bill drops to a bucket and a CDN.
- A 60 second delay for changes is fine. Flags change a few times a day.
- Bucketing is just a hash of the user id, so every language will produce the same buckets as long as it implements the hash.
- Rulesets are only flag metadata, nothing sensitive.

## Rollout

- Week 1: publish rulesets and ship the SDK change behind a flag, 1% of clients.
- Week 2 to 3: ramp to 100%.
- Week 4: turn off the eval nodes.

## Open questions

- Is 60 seconds the right TTL or should we go to 30?
- Do we keep `/v1/eval` for the mobile apps that cannot update?
