// Flashcards for the System Design tab (Quiz view). Each card is recalled by typing the answer.
//   id     stable key, persisted in sysdesign-cards-v1 (don't rename)
//   topic  a SD.topics id (sysdesign_data.js), used for the topic filter and the "read the lesson" link
//   q      the prompt: a definition, a scenario or a "what's the term for..." question
//   a      accepted answers, the first is the canonical one shown on reveal (lowercase; matching ignores case, punctuation, a/an/the)
//   why    one or two sentences shown after answering
const SD_CARDS=[
// requirements
{id:"req-functional",topic:"requirements",q:"Requirements that say what the system does, such as \"a user can post a photo\".",a:["functional requirements","functional"],why:"They drive the API and data model."},
{id:"req-nonfunctional",topic:"requirements",q:"Requirements that say how well the system does it: scale, latency, availability, consistency. What kind?",a:["non-functional requirements","non functional requirements","nonfunctional requirements","non-functional","nonfunctional","quality attributes"],why:"They usually decide the architecture more than the features do."},
{id:"req-nines",topic:"requirements",q:"Roughly how much downtime per year does 99.99% availability allow?",a:["about an hour","1 hour","52 minutes","one hour","an hour"],why:"Four nines is about 52 minutes a year. 99.9% is about 9 hours."},
// scaling
{id:"scale-vertical",topic:"scaling",q:"Making one machine bigger (more CPU, RAM) instead of adding machines.",a:["vertical scaling","scale up","scaling up","scale vertically"],why:"Simple, but capped and a single point of failure."},
{id:"scale-horizontal",topic:"scaling",q:"Adding more machines behind a load balancer instead of growing one.",a:["horizontal scaling","scale out","scaling out","scale horizontally"],why:"Needs stateless services; pays in coordination and consistency complexity."},
{id:"scale-stateless",topic:"scaling",q:"A server that keeps no per-user data between requests, so any instance can serve any request.",a:["stateless","stateless service","stateless server"],why:"State goes to a database, cache or object store, which lets you scale out freely."},
// estimation
{id:"est-day-seconds",topic:"estimation",q:"About how many seconds are in a day, rounded for back-of-envelope math?",a:["100000","100k","100,000","86400","86,400","about 100k"],why:"86,400, rounded to ~100k. So 1M requests/day is about 12 QPS."},
{id:"est-peak",topic:"estimation",q:"Rule of thumb: peak QPS is roughly how many times the average?",a:["2-3x","2 to 3x","2-3","2 to 3 times","2x to 3x","3x","2x"],why:"Use 2-3x as a default and say so out loud."},
{id:"est-mem-vs-ssd",topic:"estimation",q:"A memory read takes ~100 ns and an SSD read ~100 µs. Roughly how many times slower is the SSD?",a:["1000","1000x","1,000x","1,000","1000 times","a thousand"],why:"About 1000x, which is why we put hot data in a cache."},
// CAP
{id:"cap-p",topic:"cap",q:"In CAP, which of the three can you not give up in a real distributed system, because networks do fail?",a:["partition tolerance","p","partitions"],why:"So the real choice during a partition is consistency vs availability."},
{id:"cap-cp",topic:"cap",q:"A system that refuses some requests during a partition to avoid returning stale data is choosing which two CAP properties?",a:["cp","consistency and partition tolerance","consistency + partition tolerance"],why:"Examples: ZooKeeper, etcd, HBase."},
{id:"cap-eventual",topic:"cap",q:"The guarantee that, if writes stop, all replicas will eventually converge to the same value.",a:["eventual consistency","eventually consistent"],why:"Common in AP systems such as Dynamo-style stores and Cassandra."},
{id:"cap-linearizable",topic:"cap",q:"The strongest consistency model: every read sees the latest write, as if there were one copy of the data.",a:["linearizability","linearizable","strong consistency"],why:"Expensive: needs coordination across replicas on every operation."},
// SQL vs NoSQL
{id:"sql-acid",topic:"sqlnosql",q:"The four guarantees of a relational transaction: atomicity, consistency, isolation, and what?",a:["durability","durable"],why:"ACID. Durability: once committed, it survives a crash."},
{id:"sql-index",topic:"sqlnosql",q:"The structure (often a B-tree) that makes reads on a column fast at the cost of slower writes and extra storage.",a:["index","an index","database index"],why:"Index for the access patterns you actually have."},
{id:"sql-denorm",topic:"sqlnosql",q:"Duplicating data across tables or documents to avoid joins and make reads faster.",a:["denormalization","denormalisation","denormalize","denormalizing"],why:"Faster reads, but every copy must be kept in sync on writes."},
// concurrency
{id:"conc-contention",topic:"concurrency",q:"When many transactions compete to modify the same row at the same time, the system has high ______.",a:["contention","high contention"],why:"Contention level decides optimistic vs pessimistic locking."},
{id:"conc-optimistic",topic:"concurrency",q:"Locking style that lets everyone proceed and checks for a conflict at write time (e.g. with a version column), then retries the loser.",a:["optimistic locking","optimistic concurrency control","optimistic","optimistic lock","occ"],why:"Best at low contention and when work spans a user's think-time."},
{id:"conc-pessimistic",topic:"concurrency",q:"Locking style that takes exclusive access first (SELECT ... FOR UPDATE) so conflicts can't happen.",a:["pessimistic locking","pessimistic concurrency control","pessimistic","pessimistic lock"],why:"Best at high contention on a hot row where retries would mostly fail."},
{id:"conc-lost-update",topic:"concurrency",q:"Two clients read the same value, both change it, and the second write silently overwrites the first. Name this anomaly.",a:["lost update","lost updates","the lost update problem"],why:"Fix with an atomic UPDATE, optimistic versioning or a lock."},
{id:"conc-version",topic:"concurrency",q:"What column does optimistic locking check in UPDATE ... WHERE id=? AND ______=?",a:["version","version number","version column"],why:"If zero rows updated, someone else got there first: re-read and retry."},
{id:"conc-deadlock",topic:"concurrency",q:"Two transactions each hold a lock the other needs, and neither can proceed. What is this called?",a:["deadlock","a deadlock"],why:"Avoid with a consistent lock order or timeouts; databases detect and abort one."},
{id:"conc-fencing",topic:"concurrency",q:"A monotonically increasing number attached to a distributed lock so the resource can reject writes from a stale holder.",a:["fencing token","fencing tokens","fencing"],why:"Protects you when a lock holder pauses (GC) and its lease expires."},
// API design
{id:"api-rest",topic:"api",q:"Architectural style that models things as resources addressed by URL and manipulated with HTTP verbs.",a:["rest","restful","rest api"],why:"The default for public APIs; simple and cacheable."},
{id:"api-pagination-cursor",topic:"api",q:"Pagination that returns an opaque pointer to where the last page ended, instead of an offset. What is it called?",a:["cursor pagination","cursor-based pagination","keyset pagination","cursor"],why:"Stable under inserts and fast on deep pages, unlike OFFSET."},
{id:"api-idempotent",topic:"api",q:"An operation that has the same effect whether you apply it once or many times.",a:["idempotent","idempotency","idempotent operation"],why:"Makes client retries safe."},
// load balancing
{id:"lb-l7",topic:"lb",q:"A load balancer that routes on HTTP content such as path, headers or cookies operates at which OSI layer number?",a:["7","layer 7","l7"],why:"L4 balances on IP/port only; L7 can route /api and /static differently."},
{id:"lb-sticky",topic:"lb",q:"Sending a given client to the same backend every time (e.g. via a cookie) is called ______ sessions.",a:["sticky","sticky sessions","session affinity","affinity"],why:"Convenient, but it undermines statelessness and uneven load."},
{id:"lb-rr",topic:"lb",q:"The simplest balancing algorithm: hand requests to each server in turn.",a:["round robin","round-robin"],why:"Fine for similar requests; use least-connections when request cost varies."},
// caching
{id:"cache-aside",topic:"cache",q:"The pattern where the app checks the cache first, and on a miss reads the DB and fills the cache itself.",a:["cache-aside","cache aside","lazy loading","lazy load"],why:"The most common caching pattern; the cache can fail without breaking reads."},
{id:"cache-writethrough",topic:"cache",q:"Writes go to the cache and the database together before acknowledging, keeping the cache fresh. Name the policy.",a:["write-through","write through"],why:"Slower writes, but reads never see stale data."},
{id:"cache-writeback",topic:"cache",q:"Writes land in the cache and are flushed to the database later. Fast, but data can be lost if the cache dies. Name the policy.",a:["write-back","write back","write-behind","write behind"],why:"Great for write-heavy loads where a small loss window is tolerable."},
{id:"cache-stampede",topic:"cache",q:"A hot key expires and thousands of requests hit the database at once to rebuild it. What's this called?",a:["cache stampede","thundering herd","stampede","dogpile","dog-pile","dogpile effect"],why:"Mitigate with request coalescing, locks, jittered TTLs or early refresh."},
{id:"cache-lru",topic:"cache",q:"The eviction policy that removes the entry unused for the longest time.",a:["lru","least recently used"],why:"A good default; LFU favors frequency instead."},
{id:"cache-ttl",topic:"cache",q:"A time limit after which a cached entry is considered stale and dropped. Three-letter abbreviation?",a:["ttl","time to live","time-to-live"],why:"The simplest invalidation strategy."},
// CDN
{id:"cdn-edge",topic:"cdn",q:"CDN servers that sit geographically close to users and serve cached content are called ______ servers.",a:["edge","edge servers","edge nodes","pops","points of presence"],why:"Lower latency and far less load on your origin."},
{id:"cdn-origin",topic:"cdn",q:"The server a CDN falls back to when it has a cache miss.",a:["origin","origin server"],why:"A cache-hit ratio close to 1 keeps the origin small."},
// replication
{id:"rep-leader",topic:"replication",q:"In single-leader replication, which node accepts the writes?",a:["leader","the leader","primary","master"],why:"Followers replicate from it and serve reads."},
{id:"rep-lag",topic:"replication",q:"The delay before a write on the leader appears on a follower, which can make reads stale.",a:["replication lag","lag"],why:"Mitigate with read-your-writes routing for the author."},
{id:"rep-failover",topic:"replication",q:"Promoting a follower to leader when the leader dies.",a:["failover","fail over","leader election"],why:"Watch for split-brain, where two nodes both think they're the leader."},
{id:"rep-quorum",topic:"replication",q:"With N replicas, reads of R and writes of W are guaranteed to overlap when R + W > ?",a:["n"],why:"R + W > N means any read quorum overlaps any write quorum, so it sees the latest write."},
// sharding
{id:"shard-hot",topic:"sharding",q:"One partition receiving far more traffic than the others (a celebrity user, for example). What's it called?",a:["hot shard","hot spot","hotspot","hot partition","hot key"],why:"Fix with a better key, salting, or caching the hot key."},
{id:"shard-key",topic:"sharding",q:"The field whose value decides which shard a row lives on.",a:["shard key","partition key","sharding key"],why:"Choose for even distribution and so common queries hit one shard."},
{id:"shard-scatter",topic:"sharding",q:"A query that has to ask every shard and merge the results is called a ______-gather query.",a:["scatter","scatter-gather","scatter gather"],why:"Slow and expensive; design keys to avoid it."},
// consistent hashing
{id:"ch-why",topic:"consistent-hashing",q:"What problem does consistent hashing solve compared with hash(key) % N?",a:["rebalancing","minimal remapping","minimal data movement","reshuffling","remapping"],why:"Adding or removing a node moves only ~1/N of the keys, not nearly all of them."},
{id:"ch-vnodes",topic:"consistent-hashing",q:"Placing each physical node at many points on the hash ring to even out the load. What are the points called?",a:["virtual nodes","vnodes","virtual node"],why:"Also lets stronger machines own more of the ring."},
// queues
{id:"q-dlq",topic:"queues",q:"The side queue where messages go after failing too many times, so they don't block the main queue.",a:["dead letter queue","dead-letter queue","dlq"],why:"Inspect and replay them later."},
{id:"q-backpressure",topic:"queues",q:"When consumers can't keep up, signalling producers to slow down or shedding load so the system doesn't collapse.",a:["backpressure","back pressure","back-pressure"],why:"An unbounded queue just hides the problem until memory runs out."},
{id:"q-atleastonce",topic:"queues",q:"The delivery guarantee where a message is never lost but may arrive more than once.",a:["at-least-once","at least once","at least once delivery","at-least-once delivery"],why:"Pair with idempotent consumers."},
{id:"q-decouple",topic:"queues",q:"Name the main reason to put a queue between a web request and slow work like sending email: it ______ the producer from the consumer.",a:["decouples","decouple","decoupling"],why:"Smooths bursts, isolates failures and lets each side scale independently."},
// streaming
{id:"st-partition",topic:"streaming",q:"In Kafka, ordering is guaranteed only within a ______.",a:["partition","a partition","single partition"],why:"Use a key so related events land in the same partition."},
{id:"st-offset",topic:"streaming",q:"The position a consumer has reached in a log, which it commits so it can resume after a crash.",a:["offset","consumer offset","the offset"],why:"Replaying is just resetting the offset."},
// realtime
{id:"rt-websocket",topic:"realtime",q:"A persistent two-way connection between browser and server, used for chat and live updates.",a:["websocket","websockets","web socket"],why:"Stateful connections need sticky routing and a pub/sub layer behind them."},
{id:"rt-polling",topic:"realtime",q:"The client asking the server for updates every few seconds is called ______.",a:["polling","short polling","short-polling"],why:"Simple but wasteful; long polling or SSE cut the empty round trips."},
// idempotency
{id:"idem-key",topic:"idempotency",q:"A unique client-generated value sent with a request so the server can detect and ignore duplicate retries.",a:["idempotency key","idempotency token","an idempotency key"],why:"Store the key with the result and return it for repeats (payments)."},
{id:"idem-exactlyonce",topic:"idempotency",q:"\"Exactly-once delivery\" is usually achieved in practice as at-least-once delivery plus ______ processing.",a:["idempotent","idempotent processing","deduplicated","dedup","deduplication"],why:"True exactly-once over a network isn't possible; effectively-once is."},
// rate limiting
{id:"rl-token",topic:"ratelimit",q:"Rate-limit algorithm where a bucket refills at a steady rate and each request spends one; allows short bursts.",a:["token bucket","the token bucket algorithm","token bucket algorithm"],why:"Most common; two parameters: refill rate and bucket size."},
{id:"rl-429",topic:"ratelimit",q:"The HTTP status code returned when a client is rate limited.",a:["429","http 429","429 too many requests"],why:"Include a Retry-After header."},
{id:"rl-sliding",topic:"ratelimit",q:"Fixed-window counters can let double the limit through at a window boundary. What approach fixes it by weighing the previous window?",a:["sliding window","sliding window counter","sliding window log"],why:"More accurate, slightly more memory."},
// ids
{id:"id-snowflake",topic:"ids",q:"Twitter's scheme for sortable 64-bit ids made of a timestamp, machine id and sequence number.",a:["snowflake","twitter snowflake","snowflake id","snowflake ids"],why:"Unique without coordination and roughly time-ordered."},
{id:"id-uuid",topic:"ids",q:"A 128-bit random id that needs no coordination but is large and not sortable (v4).",a:["uuid","uuidv4","uuid v4","guid"],why:"Random v4 ids hurt B-tree locality; ULID or UUIDv7 are time-ordered."},
// blob
{id:"blob-presigned",topic:"blob",q:"A temporary URL that lets a client upload straight to object storage without proxying bytes through your servers.",a:["presigned url","pre-signed url","presigned","signed url","pre-signed","presigned urls"],why:"Keeps large transfers off your app tier."},
{id:"blob-multipart",topic:"blob",q:"Splitting a big upload into chunks sent in parallel and retried independently is called ______ upload.",a:["multipart","multi-part","multipart upload","chunked","chunked upload","resumable"],why:"Lets you resume after a failure instead of restarting."},
// search
{id:"search-inverted",topic:"search",q:"The data structure behind full-text search that maps each term to the documents that contain it.",a:["inverted index","an inverted index"],why:"Elasticsearch/Lucene are built on it."},
{id:"search-tfidf",topic:"search",q:"Ranking signal that scores a term high if it's frequent in a document but rare across the corpus.",a:["tf-idf","tfidf","tf idf","bm25"],why:"BM25 is the modern refinement."},
];
