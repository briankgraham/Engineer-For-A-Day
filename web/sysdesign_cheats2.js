// Cheat sheets, part 2: medium problems (rate limiter, key-value store, news feed, chat, notifications). Format: see sysdesign_cheats.js.
window.SD_CHEATS=window.SD_CHEATS||{};
Object.assign(window.SD_CHEATS,{

"rate-limiter":{
  say:"A shared counter per client key in Redis, checked atomically on every request using a token bucket, placed at the gateway and failing open if the limiter is down.",
  clarify:[
    "Limit what: per user, per IP, per API key, per endpoint? (decides the key)",
    "Client-side or server-side, and where does it sit: gateway, middleware, or a separate service?",
    "Hard limit or soft (allow short bursts)? (token bucket allows bursts; fixed window does not smooth them)",
    "One region or multi-region? Must the limit be globally exact? (exactness across regions is expensive; approximate is usually fine)",
    "What happens on rejection: HTTP 429 with Retry-After? Queue the request instead?"
  ],
  fr:["Limit requests per client to N per time window (configurable per rule)","Reject excess requests with 429 and tell the client when to retry","Rules are configurable without a deploy","Out of scope: billing quotas, DDoS mitigation at the network layer"],
  nfr:["Adds under 5 ms to a request","Highly available: if the limiter fails, requests should still flow (fail open) unless the rule is security critical","Accurate enough: allow small overshoot, never wildly wrong","Works across many app servers (distributed, not per-process)","Scales to 1M+ requests/s total"],
  est:[
    "Assume 10M users, 1M requests/s at peak across the fleet. Each check is one Redis operation.",
    "One Redis node does roughly 100k ops/s, so about 10 shards for 1M/s. Shard by client key.",
    "Memory per counter: key (about 40 B) + count + timestamp, about 100 B. 10M active keys = 1 GB. Trivial.",
    "Sliding window log costs more: one timestamp per request. 100 requests/min/user x 10M = 1B timestamps x 8 B = 8 GB. That is why counters or token buckets win."
  ],
  api:["Internal: allow(client_id, rule_id) -> {allowed, remaining, retry_after}","On every response: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset; on reject: 429 + Retry-After","Admin: PUT /rules/{id} {key, limit, window, algorithm}"],
  data:["Rules store (config DB, cached in memory by the limiter): (rule_id, match: endpoint/tier, limit, window).","Counters in Redis: key = rate:{rule}:{client}. Token bucket stores (tokens, last_refill_ts). Fixed window stores a count with TTL = window.","Counters are ephemeral: losing them is acceptable (limits reset), so no durable storage."],
  flow:"Client -> API gateway / middleware -> [Rate limiter check] -> App servers\n                                     |  reads rules (local cache)\n                                     '-> Redis cluster (counters, sharded by client key)\n429 Too Many Requests <- limiter when over limit",
  write:["Request arrives at the gateway; extract the client key (API key, user ID, or IP).","Look up the matching rule from the local rule cache.","Run one atomic Redis operation (a Lua script): refill tokens based on elapsed time, try to take one, return allowed/remaining.","If allowed, forward to the app and add rate-limit headers. If not, return 429 with Retry-After immediately."],
  read:["There is no separate read path. Clients can read their remaining quota from the response headers.","Operators read counters and rejection metrics from dashboards."],
  deep:[
    {t:"Which algorithm",p:"Different algorithms trade accuracy, memory and burst behaviour.",opts:[
      "Fixed window counter: tiny and simple, but allows 2x the limit at a window boundary (N at the end of one window plus N at the start of the next).",
      "Sliding window log: exact, but stores every timestamp, so memory-heavy.",
      "Sliding window counter: weights the previous window's count by overlap; close to exact with two counters.",
      "Token bucket: refill at a steady rate, allow bursts up to bucket size; two numbers per key.",
      "Leaky bucket: smooths output to a constant rate using a queue; good for protecting a backend, adds latency."
    ],pick:"Token bucket by default (cheap, allows bursts, easy to explain) or sliding window counter if boundary spikes matter. Name the trade-off, then commit."},
    {t:"Atomicity under concurrency",p:"Two servers read the same count, both see room, both increment: the limit is exceeded (a race).",opts:[
      "Read-then-write from the app: racy.",
      "Redis INCR on a fixed-window key: atomic, but only fits that algorithm.",
      "A Lua script (runs atomically in Redis) that does refill + take: correct for token bucket.",
      "Locks: correct but slow."
    ],pick:"Lua script or INCR; do the whole check-and-update in one atomic Redis call."},
    {t:"Distributed and multi-region",p:"Many app servers and possibly many regions must share one view of the count.",opts:[
      "Central Redis cluster per region, sharded by key: exact within a region.",
      "Local counters with periodic sync: low latency and cheap, but can overshoot by (servers x sync interval).",
      "Sticky routing by client key so one limiter instance owns a client: no shared state, but hot clients cannot spread.",
      "Global limit across regions: split the quota per region (each gets 1/N) or accept eventual sync."
    ],pick:"Redis shards keyed by client for in-region exactness; per-region quotas for multi-region. Say overshoot is acceptable and bounded."},
    {t:"Failure behavior",p:"The limiter is now on the critical path of every request.",opts:["Fail open (allow all) when Redis is unreachable: availability first.","Fail closed (reject): safer for abuse-sensitive endpoints such as login.","Local in-memory fallback limits with conservative values."],pick:"Fail open for general APIs, fail closed (or a stricter local limit) for login/payment endpoints, and alert either way."}
  ],
  trade:["Accuracy vs memory vs speed across the algorithms.","Centralized counters are accurate but add a network hop; local counters are fast but approximate.","Fail open vs fail closed: availability vs protection.","Rule granularity: more rules means more lookups and operational complexity."],
  fail:["Redis shard down: replicate and fail open; counters reset, which is acceptable.","Hot key: one abusive client hammers one shard; the limiter itself must be cheap enough to reject at line speed, and a coarse per-IP limit at the edge helps.","Clock skew between servers: use Redis time (TIME inside the script) rather than app server time.","Thundering herd after a reset: add jitter to Retry-After.","Rule misconfiguration blocks real users: staged rollout and a dry-run (log-only) mode."],
  follow:[
    "Where do you put it? -> At the API gateway, so it protects every service; fine-grained limits can live in services.",
    "How do you rate limit by user and by IP at once? -> Multiple rules per request; reject if any is exceeded.",
    "What do clients do on 429? -> Exponential backoff with jitter, honouring Retry-After.",
    "How do you test it? -> Load test at 2x the limit and verify the allowed fraction; use dry-run mode in production first."
  ],
  traps:["Per-server in-memory counters in a multi-server fleet (each server allows the full limit).","Non-atomic read-modify-write on the counter.","Forgetting the boundary burst of a fixed window.","No answer for what happens when the limiter is down.","Not returning Retry-After / headers."]
},

"kv-store":{
  say:"A Dynamo-style ring: partition keys with consistent hashing, replicate each key to N nodes, tune consistency with quorums (R + W > N), and repair divergence with hinted handoff, read repair and anti-entropy.",
  clarify:[
    "Strong consistency or eventual? Availability or consistency under a partition? (this is the CAP choice; it drives everything)",
    "Value size and total data size? (small values and TBs mean sharding for capacity)",
    "Read:write ratio, and target latency? (single-digit ms at p99 is typical)",
    "Do we need range queries or just get/put by key? (range scans need ordered partitioning rather than hash)",
    "Single data center or multi-region?"
  ],
  fr:["put(key, value) and get(key), delete(key)","Scales horizontally to petabytes by adding nodes","Configurable replication and consistency per request","Out of scope: secondary indexes, transactions across keys, SQL"],
  nfr:["Highly available for writes (the 'always writable' Dynamo goal)","Low latency: single-digit ms p99","Durable: no data loss after an acknowledged write","Incremental scalability: add a node without downtime or massive reshuffle","Tunable consistency (eventual by default, stronger on request)"],
  est:[
    "Assume 100 TB of data, 1 KB average value -> 100B keys. With replication factor 3, 300 TB raw.",
    "A node holds about 2-4 TB comfortably -> roughly 100 nodes. Each node also carries virtual nodes (for example 128-256) for balance.",
    "Traffic: 1M ops/s total / 100 nodes = 10k ops/s per node, within one commodity node's ability.",
    "Quorum: N=3, W=2, R=2 means R+W=4 > 3, so a read always overlaps the latest successful write."
  ],
  api:["put(key, value, context?) -> ack; context carries version info (vector clock) if conflict detection is used","get(key) -> value(s) + context; may return several conflicting versions","delete(key) -> writes a tombstone","Client libraries pick a coordinator node; any node can coordinate"],
  data:["Each node stores its key range in an LSM-tree engine (memtable + commit log + SSTables) because writes are heavy: append to a log, write to memory, flush sorted files, compact in the background.","Per key: value, version metadata (vector clock or timestamp), tombstone flag.","Cluster metadata (ring membership) is gossiped between nodes, not held in a central database."],
  flow:"Client -> any node (coordinator)\n   hash(key) -> position on ring -> N successor nodes (replicas)\n   Coordinator forwards to replicas, waits for W acks (write) or R replies (read)\n   Node: commit log -> memtable -> SSTables (LSM)\n   Gossip: membership & failure detection | Hinted handoff | Merkle-tree anti-entropy",
  write:["Client sends put to any node, which becomes the coordinator for this request.","Hash the key to find the owning node and the next N-1 distinct physical nodes on the ring (the preference list).","Coordinator sends the write to all N replicas and waits for W acknowledgements.","Each replica appends to its commit log, updates its memtable, and acks.","If a replica is down, a healthy node keeps a hint and replays it when the replica returns (hinted handoff).","Return success once W acks arrive."],
  read:["Client sends get to any node (coordinator), which finds the N replicas.","Ask replicas for the value; wait for R responses.","Compare versions. If they differ, return the newest (by vector clock or timestamp) or return all siblings for the client to merge.","Read repair: write the newest value back to replicas that returned stale data."],
  deep:[
    {t:"Partitioning with consistent hashing",p:"Adding or removing a node with hash(key) mod N would remap almost every key.",opts:["Hash(key) mod N: simple, but reshuffles nearly everything when N changes.","Consistent hashing ring: keys map to the next node clockwise, so a join/leave moves only about 1/N of keys.","Virtual nodes: each physical node owns many points on the ring, which balances load and lets stronger machines take more."],pick:"Consistent hashing with virtual nodes. Mention that a new node takes over ranges gradually via streaming."},
    {t:"Replication and quorums",p:"Choose how many copies and how many must agree.",opts:["N=3 replicas on distinct racks/zones.","W=1,R=1: fastest, eventual consistency, stale reads possible.","W=2,R=2 (R+W>N): reads see the latest successful write.","W=N: durable but one dead node blocks writes; R=1 W=N gives fast reads."],pick:"N=3 with W=2, R=2 as the default; let clients lower for latency or raise for safety per request. Make the point that R+W>N gives consistency only while no node is stale beyond hints."},
    {t:"Conflict resolution",p:"Concurrent writes to the same key through different coordinators diverge.",opts:["Last-write-wins by timestamp: simple but can silently drop a write and depends on clocks.","Vector clocks: detect concurrent updates and keep siblings for the application to merge (Dynamo, Riak).","CRDTs: data types that merge automatically (counters, sets)."],pick:"Last-write-wins if the use case tolerates it, vector clocks for correctness. Be honest about the cost: vector clocks add client complexity and metadata growth."},
    {t:"Failure handling and repair",p:"Nodes crash, and partitions isolate groups of them.",opts:["Gossip protocol to detect failures without a central master.","Sloppy quorum + hinted handoff: writes go to the next healthy node temporarily to stay available.","Read repair: fix stale replicas on the read path.","Anti-entropy with Merkle trees: replicas compare hash trees of their key ranges and sync only differing subranges."],pick:"All of the above, and say which problem each solves: gossip detects, hints bridge short outages, read repair fixes hot keys, Merkle trees fix cold data."},
    {t:"The storage engine",p:"Writes are frequent; random disk writes are slow.",opts:["B-tree: good reads, random writes.","LSM-tree: sequential writes (commit log + memtable + SSTables); reads check memtable, Bloom filters and SSTables; compaction merges files."],pick:"LSM-tree, with a Bloom filter per SSTable to skip files that cannot contain the key. Mention tombstones and compaction for deletes."}
  ],
  trade:["Availability and latency vs consistency (CAP): you choose AP with tunable quorums, or CP with Raft/Paxos per range.","Quorum size: durability and consistency vs latency and availability.","Vector clocks: correct conflict detection vs client complexity.","LSM: write speed vs read amplification and compaction cost."],
  fail:["Node crash: hinted handoff and re-replication from the other replicas.","Network partition: AP side keeps accepting writes and reconciles later; CP side blocks the minority.","Hot key/partition: add virtual nodes, cache, or split the key.","Slow node (tail latency): hedged requests, and ignoring the slowest replica if R is met.","Clock skew breaks LWW: prefer logical clocks for important data.","Data center failure: replicate across zones/regions with a placement policy."],
  follow:[
    "How would you make it strongly consistent? -> Use consensus (Raft/Paxos) per partition with a leader; accept lower availability during partitions.",
    "How do you add a node? -> It gets virtual-node positions, streams the ranges it owns from existing replicas, then starts serving.",
    "How do you handle deletes? -> Tombstones, kept until all replicas have seen them (garbage collection grace period).",
    "How do you do range queries? -> Not with hash partitioning; use range partitioning (like Bigtable/HBase) and accept hot ranges."
  ],
  traps:["Stopping at 'shard with hash mod N'.","Not saying what happens when a replica is down.","Forgetting conflict resolution when allowing multiple writers.","Saying 'consistent and available and partition tolerant'.","Skipping the single-node storage engine."]
},

"news-feed":{
  say:"Precompute feeds on write (fan-out on write) for ordinary users, pull celebrity posts at read time, merge the two, and keep each user's feed as a capped list in a cache.",
  clarify:[
    "Which feed: friends/follows chronological, or ranked? (ranking adds an ML service; start chronological)",
    "Scale: DAUs, average followers, and the max (celebrities with 10M+)? (the max drives fan-out strategy)",
    "Media in posts? (images/video go to object storage and a CDN; the feed carries references)",
    "How fresh must the feed be? (seconds of delay is fine for most feeds)",
    "Features: likes, comments, notifications? (keep to post and view feed; mention others)"
  ],
  fr:["Create a post (text and media)","Follow and unfollow users","View a home feed of recent posts from people you follow, paginated","Out of scope: ranking model details, comments, ads, search"],
  nfr:["Feed load under 200 ms at p99","Highly available; eventual consistency is fine (a post may take seconds to appear)","Scales to hundreds of millions of users, reads much more than writes","Posts are durable; a deleted post disappears soon","Handles celebrity accounts without melting down"],
  est:[
    "Assume 300M DAU, each opens the feed 5 times/day -> 1.5B feed reads/day / 100k = 15k reads/s average, about 50k peak.",
    "Posts: 100M posts/day -> 1,200 writes/s average, about 3k peak.",
    "Fan-out on write: average 200 followers -> 100M x 200 = 20B feed insertions/day = 230k/s. That is the cost of fast reads.",
    "Feed storage: keep the latest 500 post IDs per user x 8 B = 4 KB per user. 300M users = 1.2 TB in Redis. Shardable.",
    "Post storage: 100M/day x 1 KB metadata = 100 GB/day = 36 TB/year; media goes to object storage and dwarfs it (images at 200 KB = 20 TB/day)."
  ],
  api:["POST /v1/posts {text, media_ids?} -> 201 {post_id}","GET /v1/feed?cursor=<last_post_id>&limit=20 -> {posts[], next_cursor}. Use cursor pagination, not page numbers, because the feed changes while you scroll.","POST /v1/follow/{user_id}, DELETE /v1/follow/{user_id}","GET /v1/users/{id}/posts (profile timeline)"],
  data:["posts(post_id PK, author_id, text, media_keys, created_at). Post IDs are time-sortable (snowflake).","follows(follower_id, followee_id) with an index in both directions: who do I follow (for read-time pull), who follows me (for write-time fan-out).","feed cache: Redis list or sorted set per user: user_id -> [post_id, ...] newest first, capped at N entries.","Users, and an object store for media. Feed holds IDs only; post bodies are hydrated from a post cache by ID."],
  flow:"Write: Client -> Post service -> Posts DB (+media to object store/CDN)\n                  '-> Fan-out queue -> Fan-out workers -> followers' feed lists in Redis\nRead:  Client -> Feed service -> Redis feed list (post IDs)\n                  + pull recent posts from followed celebrities\n                  -> hydrate post IDs from post cache/DB -> merge, rank, return",
  write:["User posts; the Post service stores the post and returns immediately.","It publishes a 'new post' event to a queue.","Fan-out workers look up the author's followers and push the post ID onto each follower's feed list (skip inactive users; skip celebrities).","Trim each list to the latest N entries.","Media was uploaded earlier to object storage; the CDN serves it."],
  read:["Client asks for the feed with a cursor.","Feed service reads the user's precomputed list of post IDs from Redis.","It also fetches recent posts from the celebrity accounts this user follows (pull) and merges by time.","Hydrate IDs into full posts from the post cache (batch get), plus author info and counts.","Optionally rank, then return a page and the next cursor."],
  deep:[
    {t:"Fan-out on write vs on read",p:"Where do you do the work of building a feed?",opts:[
      "Fan-out on read (pull): when a user opens the feed, fetch recent posts from everyone they follow and merge. Cheap writes, slow reads that get worse with follows.",
      "Fan-out on write (push): on each post, insert it into every follower's feed list. Reads are one cache lookup; writes cost followers x posts.",
      "Hybrid: push for normal users, pull for celebrities, merged at read time."
    ],pick:"Hybrid. Push gives the fast read path the requirement wants; pull for accounts with more than, say, 100k followers avoids millions of writes per post (the celebrity problem)."},
    {t:"Celebrity and inactive users",p:"One post by a user with 50M followers is 50M list updates.",opts:["Skip fan-out above a follower threshold and pull their posts at read time.","Fan-out only to recently active followers; rebuild the feed for returning users on demand.","Rate-limit and batch the fan-out through the queue so a burst does not overload Redis."],pick:"Threshold-based hybrid plus active-user-only fan-out. Mention that a returning inactive user triggers a feed rebuild by pull."},
    {t:"Feed storage and pagination",p:"Feeds change constantly; page numbers would skip or repeat items.",opts:["Redis sorted set scored by post time (or post ID) with capped length.","Cursor pagination: 'give me 20 posts older than this post_id'.","Only IDs in the feed; hydrate from a separate post cache so edits and deletes show up."],pick:"Capped Redis list/sorted set of IDs, cursor pagination, and hydration at read time. Deleted posts are filtered at hydration."},
    {t:"Ranking (optional)",p:"Chronological feeds are simple but not always the most relevant.",opts:["Reverse chronological: simple and predictable.","Score = recency x affinity x engagement, computed by a ranking service on the candidate set (for example the latest 500 IDs).","Precompute scores offline for heavy models."],pick:"Chronological first; if asked, rank the candidate set at read time with a lightweight model and explain it adds latency."},
    {t:"Media",p:"Images and videos are big.",opts:["Upload directly from the client to object storage via a pre-signed URL.","Serve through a CDN; store several resolutions.","The post only stores media keys."],pick:"Pre-signed upload, CDN delivery, keys in the post. Keeps heavy bytes out of the app servers."}
  ],
  trade:["Push: fast reads, expensive writes and storage. Pull: cheap writes, slow reads. Hybrid balances them at some complexity.","Cache memory vs recency: cap the feed length.","Eventual consistency: a post may appear seconds late; deletes may linger briefly.","Ranking adds relevance and latency."],
  fail:["Fan-out queue backlog: feeds go stale; scale workers, prioritise active users, alert on lag.","Redis node loss: rebuild a feed lazily from follows + posts DB; keep replicas.","Celebrity posts spike traffic to one author's post: cache the post object and CDN media.","Follow graph hot rows: shard by user ID.","Deleted post still in feeds: filter on hydration."],
  follow:[
    "What if I follow 5,000 accounts? -> Fan-out on write is unaffected; on read the cost is bounded because only celebrities are pulled.",
    "How do you handle unfollow? -> Remove that author's posts from the cached feed lazily, or filter at hydration time.",
    "How does a new user get a feed? -> Pull recent posts from followed accounts and cache the result.",
    "How would you add likes counts? -> Increment counters asynchronously in a counter store; show approximate counts."
  ],
  traps:["Pure fan-out on write with no answer for celebrities.","Page-number pagination on a moving list.","Storing full post bodies in every follower's feed.","Making users wait for fan-out before the post call returns.","Forgetting media delivery."]
},

"chat":{
  say:"Keep a persistent WebSocket per online user to a chat server, route messages through a message broker keyed by recipient, persist every message before acknowledging, and deliver offline messages from storage when they reconnect.",
  clarify:[
    "1:1 only or group chat too, and max group size? (large groups change fan-out)",
    "Online presence, read receipts, typing indicators? (extras with their own load)",
    "Message history retention and multi-device sync?",
    "Media attachments? (object storage + CDN, messages carry a reference)",
    "Scale: DAU and messages per second? End-to-end encryption required?"
  ],
  fr:["Send and receive messages 1:1 in real time","Group chats (up to a few hundred members)","Messages are stored and delivered even if the recipient is offline","Delivery status (sent, delivered, read) and online presence","Out of scope: voice/video calls, end-to-end encryption details"],
  nfr:["Message delivery under 200 ms when both users are online","Messages are never lost (durable) and are ordered within a conversation","Highly available","Supports tens of millions of concurrent connections","At-least-once delivery with dedup, so the user sees each message once"],
  est:[
    "Assume 500M DAU, 40 messages sent per user per day -> 20B messages/day = 230k/s average, about 700k peak.",
    "Message size ~100 B text + 100 B metadata = 200 B -> 4 TB/day, about 1.5 PB/year. Needs a write-optimised, sharded store.",
    "Concurrent connections: assume 20% of DAU online = 100M. One server holds about 100k connections -> 1,000 chat servers.",
    "Bandwidth is modest for text: 230k/s x 200 B = 46 MB/s. Media is separate and dominates (served by CDN)."
  ],
  api:["WebSocket /ws: client sends {type:send, conv_id, client_msg_id, text}; server pushes {type:message, ...}, {type:ack, client_msg_id, server_msg_id}","REST (non-realtime): GET /v1/conversations, GET /v1/conversations/{id}/messages?before=<id>&limit=50 for history","POST /v1/media/upload-url -> pre-signed URL","client_msg_id lets the server dedupe retried sends (idempotency)"],
  data:["messages(conversation_id, message_id, sender_id, body, created_at). Partition key = conversation_id, sort key = message_id (time-ordered). Query: latest N messages of a conversation. A wide-column store (Cassandra/HBase) fits: write-heavy, append-mostly, range scans per partition.","conversations / group_members(conv_id, user_id) in a relational or key-value store.","Session registry: user_id -> chat server holding their connection (Redis).","Per-user unread/offline queue or an 'undelivered' pointer; presence in Redis with TTL heartbeat."],
  flow:"Client A <-WebSocket-> Chat server 1 --+\n                                      |--> Message store (Cassandra), written first\n                                      |--> Session registry (user -> server)\n                                      '--> Broker / direct route to Chat server 2 <-WebSocket-> Client B\nOffline B: push notification service -> APNs/FCM; on reconnect B pulls from store\nREST for history, media via object storage + CDN",
  write:["A sends a message over its WebSocket to its chat server with a client_msg_id.","The server assigns a server_msg_id (time-ordered, per conversation) and persists the message.","It acks A ('sent') only after the write succeeds.","It looks up B's chat server in the session registry. If B is online, forward to that server, which pushes it down B's WebSocket.","B acks receipt; mark 'delivered' and notify A.","If B is offline, store only and send a push notification; deliver on reconnect."],
  read:["Opening a conversation: REST call fetches the latest N messages from the partition for that conversation.","Scrolling up: request messages before the oldest message_id (cursor pagination).","Reconnect: client sends the last server_msg_id it has; the server replays everything newer."],
  deep:[
    {t:"Real-time transport",p:"The server must push to clients, not wait for polls.",opts:["HTTP polling: wasteful and slow.","Long polling: works everywhere, but one request per message cycle.","WebSocket: persistent, full duplex, lowest latency, but stateful connections.","Server-sent events: server to client only."],pick:"WebSocket for chat traffic, with a fallback to long polling. Keep API calls (history, profile) as ordinary stateless REST."},
    {t:"Routing between chat servers",p:"A and B are connected to different servers; how does A's message reach B?",opts:["A session registry (user -> server) and direct server-to-server forward.","Pub/sub: each chat server subscribes to channels for its connected users; publish to the recipient's channel.","Sticky sharding: hash user_id to a chat server so the target is computable."],pick:"Registry plus pub/sub (Redis pub/sub or Kafka topics per user shard). Explain that the registry is updated on connect/disconnect with a TTL heartbeat."},
    {t:"Ordering and message IDs",p:"Messages in a conversation must appear in a consistent order.",opts:["Use timestamps from clients: unreliable clocks.","Per-conversation sequence assigned by the server (monotonic within the conversation).","A snowflake-style time-ordered ID, with ties broken by server_msg_id."],pick:"Server-assigned time-ordered IDs, ordered per conversation (not globally). Total global order is unnecessary."},
    {t:"Delivery guarantees",p:"Networks drop connections mid-send.",opts:["At-most-once: lose messages on failure.","At-least-once with client_msg_id dedup: retries are safe.","Exactly-once: really at-least-once plus idempotent handling."],pick:"At-least-once with idempotency keys: the sender retries until acked, the server dedupes by client_msg_id, and the receiver acks to advance 'delivered'."},
    {t:"Group chat",p:"One message goes to many recipients.",opts:["Fan-out on write for small groups: store once, push to each online member.","For large groups, store once and let clients pull (like a channel).","Membership lookup cached per group."],pick:"Store the message once per conversation (not per recipient) and fan out delivery events. Cap group size or switch to pull for very large groups."},
    {t:"Presence",p:"Showing who is online costs a lot if done naively.",opts:["Heartbeat every ~30 s, key with TTL in Redis; online if the key exists.","Only fetch presence for the contacts on screen; do not broadcast every change to everyone."],pick:"Heartbeat with TTL, lazily fetched for visible contacts, with a small grace period so flaky networks do not flap."}
  ],
  trade:["Stateful WebSocket servers are harder to scale and deploy than stateless HTTP but give real-time push.","Per-conversation ordering is cheap; global ordering is expensive and unnecessary.","Store-before-ack is slower but never loses a message.","Presence accuracy vs heartbeat traffic."],
  fail:["Chat server crash: clients reconnect (backoff with jitter) to another server and replay from last message ID; registry entries expire by TTL.","Reconnect storm after an outage: jittered backoff and connection throttling.","Message store hot partition (huge group): bucket partitions by (conversation, time bucket).","Duplicate delivery: client dedupes by message_id.","Push notification provider down: messages remain in the store; retry later."],
  follow:[
    "How do you support multiple devices? -> Treat each device as a session; sync by per-device last-seen message ID.",
    "How do you add end-to-end encryption? -> Clients hold keys; servers store and route ciphertext only, so no server-side search or content moderation.",
    "How do you show unread counts? -> Keep a counter per (user, conversation), incremented on delivery and reset on read.",
    "How do you scale to 100M concurrent connections? -> Add chat servers (about 100k each), with connection servers separated from business logic."
  ],
  traps:["Polling for new messages.","Acking the sender before the message is persisted.","Ignoring the server-to-server routing problem.","Global ordering when per-conversation is enough.","No story for offline users or reconnection."]
},

"notifications":{
  say:"An asynchronous pipeline: services publish a notification request to a queue, workers apply user preferences and templates, then hand off to per-channel providers (push, SMS, email), with retries, deduplication and rate limits at each step.",
  clarify:[
    "Which channels: mobile push, SMS, email, in-app? (each has a different provider and failure mode)",
    "Real-time, scheduled, or both? Is any of it critical (OTP codes) vs bulk marketing?",
    "Scale: notifications per day, and peak bursts (a flash sale)?",
    "User preferences, opt-out and quiet hours required? (legal: must honour unsubscribe)",
    "Delivery guarantee: at-least-once is typical; exactly-once is not realistic across third parties."
  ],
  fr:["Other services can send a notification to a user on one or more channels","Users set preferences per channel and type, and can opt out","Templates with variables and localisation","Scheduled and bulk sends; track status (sent, delivered, failed)","Out of scope: building the push/SMS/email gateways themselves"],
  nfr:["Critical notifications (OTP) delivered in seconds; bulk can take minutes","Highly available and no silent loss","At-least-once delivery with deduplication so users do not get duplicates","Burst tolerant: absorb spikes without dropping","Respect provider and per-user rate limits"],
  est:[
    "Assume 10M notifications/day average -> 120/s. A marketing blast to 10M users in 10 minutes = 17k/s. Size for bursts, not averages.",
    "Mix: 7M push, 2M email, 1M SMS. SMS is the expensive one (cost per message), so it needs per-user and global caps.",
    "Log storage: 10M x 500 B = 5 GB/day = 1.8 TB/year of delivery records; keep 90 days hot, archive the rest.",
    "Device tokens: 100M users x 2 devices x 200 B = 40 GB. Easily one sharded store."
  ],
  api:["POST /v1/notifications {user_ids|segment, type, template_id, params, channels?, priority, schedule_at?, idempotency_key} -> 202 {notification_id} (accepted, processed asynchronously)","GET /v1/notifications/{id} -> status per channel","PUT /v1/users/{id}/preferences {channel, type, enabled, quiet_hours}","Webhook from providers for delivery receipts and bounces"],
  data:["notification_requests(id, type, payload, priority, status, idempotency_key)","user_prefs(user_id, channel, type, enabled, quiet_hours) cached in Redis","devices(user_id, platform, push_token) and contact_info(user_id, email, phone), stored securely","templates(template_id, locale, body)","delivery_log(notification_id, user_id, channel, status, provider_msg_id, timestamp) append-only"],
  flow:"Services -> Notification API -> Kafka/queue (by priority & channel)\n    -> Workers: dedupe, prefs check, rate limit, render template\n    -> Channel queues: push | SMS | email\n    -> Provider adapters (APNs/FCM, Twilio, SES) -> user devices\n    Provider webhooks -> status updates -> delivery_log; failures -> retry queue -> dead-letter queue",
  write:["A service calls the API with a request and an idempotency key; the API validates and enqueues, returning 202.","A worker reads the message: checks the idempotency key (drop duplicates).","It fetches the user's preferences and contact info; drops or delays if opted out or in quiet hours.","It renders the template in the user's locale and applies a per-user rate limit.","It publishes to the right channel queue (push/SMS/email) at the right priority.","A channel worker calls the provider; on success, it records 'sent'. Provider webhooks later update to 'delivered' or 'bounced'.","On failure, retry with exponential backoff, then dead-letter after N attempts."],
  read:["Status check: look up delivery_log by notification ID.","In-app inbox: query recent notifications for a user (user_id, created_at).","Analytics: aggregate delivery_log offline for open and failure rates."],
  deep:[
    {t:"Decoupling with queues",p:"Providers are slow and flaky; callers must not wait or fail with them.",opts:["Synchronous call to providers: simple, but the caller blocks and a provider outage fails the caller.","One queue per channel and priority: isolates failures and lets you scale each worker pool independently."],pick:"Queues per channel with a separate high-priority lane for OTPs, so a marketing blast cannot delay a login code."},
    {t:"Reliability and retries",p:"A worker may crash mid-send or the provider may time out.",opts:["At-most-once: lose messages on failure.","At-least-once: retry until acknowledged, which risks duplicates.","Dedup by idempotency key (notification_id + channel) before sending."],pick:"At-least-once with idempotent sends and a dedup store. Retries use exponential backoff with jitter, then a dead-letter queue for inspection."},
    {t:"Preferences, rate limits and fatigue",p:"Spamming users causes opt-outs and legal trouble.",opts:["Check opt-out per channel and type on every send (cached).","Per-user rate limit (for example 3 marketing pushes/day) and global SMS budget.","Quiet hours by user timezone; schedule rather than drop."],pick:"All three, enforced in the worker before the channel queue. Transactional messages bypass fatigue limits but not opt-outs required by law."},
    {t:"Bulk and scheduled sends",p:"Sending to 10M users cannot be one request.",opts:["Segment service expands the audience into batches published to the queue.","Throttle to provider limits so you are not blocked.","Scheduler (delayed queue or time-bucketed store) releases scheduled sends."],pick:"Chunk the audience into batches (for example 1,000 users), publish as messages, and throttle by channel. Scheduling uses a time-ordered store polled by a scheduler."},
    {t:"Provider failover and tracking",p:"A provider can be down or slow.",opts:["Multiple providers per channel with failover.","Circuit breaker on failing provider calls.","Webhooks for delivery receipts; reconcile missing ones by polling."],pick:"Primary + backup provider behind an adapter, a circuit breaker, and webhook-driven status updates."}
  ],
  trade:["Latency vs reliability: queues add delay, but isolation and retries are worth it.","At-least-once means occasional duplicates; dedup narrows but cannot eliminate them across third parties.","Priority lanes cost extra infrastructure but protect critical messages.","Per-user limits protect users but may delay important messages (hence the transactional exemption)."],
  fail:["Provider outage: failover provider, circuit breaker, retry later.","Queue backlog from a blast: separate lanes and autoscaled workers.","Invalid or expired device tokens: remove tokens on provider feedback.","Duplicate sends on retry: idempotency keys.","Poison messages: dead-letter queue with alerting.","Template error sends bad content to millions: staged rollout and a canary segment."],
  follow:[
    "How do you guarantee an OTP is not delayed by marketing? -> Separate high-priority queue and worker pool.",
    "How do you avoid sending twice? -> Idempotency key checked before send; providers may still duplicate rarely.",
    "How do you track opens? -> Tracking pixel or link redirect that logs an event to an analytics pipeline.",
    "How do you honour unsubscribe immediately? -> Write to the preference store and cache; workers check at send time."
  ],
  traps:["Calling providers synchronously from the request path.","One shared queue for OTPs and marketing.","No dedup or idempotency.","Ignoring opt-outs, quiet hours and rate limits.","No story for provider outages or dead tokens."]
},

});
