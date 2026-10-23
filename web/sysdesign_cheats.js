// Cheat sheets for the System Design tab: a full static walkthrough per problem, for when you are completely lost.
// Keyed by SD.problems id (sysdesign_data.js). Rendered by viewCheat() in sysdesign.js; no AI call, nothing to generate.
// This file holds the easy problems; sysdesign_cheats2.js, 3 and 4 add the rest to the same object.
//   say     the one sentence to open with if your mind goes blank
//   clarify questions worth asking (and what the answer changes)
//   fr/nfr  functional / non-functional requirements to propose, with numbers
//   est     back-of-envelope lines (assumption -> result -> what it means)
//   api     endpoints
//   data    entities / tables and the access pattern each serves
//   flow    ASCII diagram of the high-level design
//   write/read  numbered walk of one write and one read through the diagram
//   deep    [{t:title, p:the problem, opts:[options compared], pick:what to choose and why}]
//   trade   trade-offs to say out loud
//   fail    failure modes and bottlenecks
//   follow  likely follow-up questions, with a short answer each ("Q -> A")
//   traps   common mistakes
//   topics  extra SD.topics ids worth reviewing (optional; the problem's own topics are always linked)
window.SD_CHEATS=window.SD_CHEATS||{};
Object.assign(window.SD_CHEATS,{

"url-shortener":{
  say:"A read-heavy key-value lookup: generate a short unique code on write, store code -> long URL, and serve redirects from a cache so the database barely sees reads.",
  clarify:[
    "Custom aliases? (changes uniqueness handling: user-chosen codes can collide, generated ones must not)",
    "Link expiry and deletion? (adds a TTL column and a cleanup job)",
    "Click analytics? (if yes, it must be off the redirect hot path: log an event, count asynchronously)",
    "Scale: new URLs per day and redirects per day? (sets the read:write ratio and code length)",
    "Redirect type: permanent 301 (browser caches, fewer hits for you, no analytics) or temporary 302 (every click reaches you)?"
  ],
  fr:["Create a short link from a long URL (optionally with a custom alias and an expiry)","Visiting a short link redirects to the long URL","Out of scope: user accounts, link editing, a full analytics dashboard (mention as an extension)"],
  nfr:["Redirect latency under 50 ms at p99, because it sits in front of every page load","Highly available: a dead redirect means a broken link on someone's page","Codes are unique and not guessable in sequence (so people cannot enumerate links)","Read-heavy, about 100:1 reads to writes","Eventual consistency is fine for analytics; a new link must work almost immediately"],
  est:[
    "Assume 100M new URLs/month -> 100M / (30 x 100k s) is about 40 writes/s average, peak about 100/s.",
    "Reads at 100:1 -> about 4,000 redirects/s average, peak about 10k/s. One database cannot be the cache, so cache.",
    "Storage: 100M/month x 12 x 5 years = 6B records. At about 500 bytes each (code, long URL, timestamps, owner) = 3 TB. Fits a sharded store, not one small box.",
    "Code length: base62 (a-zA-Z0-9) gives 62^7 = 3.5 trillion codes, far more than 6B. 7 characters is enough.",
    "Cache: the 80/20 rule says 20% of links get 80% of traffic. Caching 20% of one day's reads (about 350M redirects/day x 500 B x 0.2) is about 35 GB, which fits in a Redis cluster."
  ],
  api:[
    "POST /v1/urls {long_url, custom_alias?, expires_at?} -> 201 {short_url, code}. Requires an API key or auth for rate limiting.",
    "GET /{code} -> 301/302 with Location: long_url. 404 if unknown, 410 if expired.",
    "DELETE /v1/urls/{code} -> 204 (owner only).",
    "Rate limit creation per user or IP so the namespace cannot be drained."
  ],
  data:[
    "urls(code PK, long_url, user_id, created_at, expires_at). Single access pattern: lookup by code, so a key-value store or a sharded SQL table keyed by code is a natural fit.",
    "Optional users(user_id, ...) and click_events(code, ts, referrer, ...) in a separate analytics store (append-only, written via a queue).",
    "SQL vs NoSQL: there are no joins or transactions across records, and the volume is large, so a NoSQL key-value store (DynamoDB, Cassandra) scales most easily. SQL with sharding by code also works. Say why you picked one."
  ],
  flow:"Client -> CDN/DNS -> Load balancer -> App servers (stateless)\n                                     |-> Cache (Redis): code -> long_url\n                                     |-> DB (sharded by code)\n                                     |-> ID/code generator (or counter service)\n                                     '-> Queue -> Analytics workers -> analytics store",
  write:[
    "Client POSTs the long URL through the load balancer to an app server.",
    "Validate the URL (scheme, length, optionally a blocklist for malware).",
    "Get a unique code (see deep dive) or check that the custom alias is free.",
    "Insert (code, long_url, ...) with a conditional write so a collision fails instead of overwriting.",
    "Optionally prime the cache. Return the short URL."
  ],
  read:[
    "Browser requests GET /abc1234. The load balancer routes to any app server (stateless).",
    "Look up the code in Redis. On a hit, go to step 4.",
    "On a miss, read the database, then populate the cache with a TTL.",
    "Return a 302 (or 301) with the long URL. Emit a click event to a queue, fire-and-forget.",
    "Unknown code: return 404, and cache the negative result briefly so scanners cannot hammer the database."
  ],
  deep:[
    {t:"How to generate unique codes",p:"Codes must be unique, short, and not collide across many writers.",opts:[
      "Hash the URL (MD5/SHA, take 7 chars): stateless and the same URL maps to the same code, but truncation collides, so you need a check-and-retry loop.",
      "Random 7-char base62: simple, collision probability is small but non-zero, so a conditional insert with retry is still needed.",
      "Global counter encoded to base62: no collisions, but a single counter is a bottleneck and makes codes sequential and guessable.",
      "Range allocation: a coordinator hands each app server a block of, say, 1M numbers; each server counts locally. No per-request coordination, unique by construction."
    ],pick:"Range allocation (or a snowflake-style ID) encoded in base62. It removes the hot-path coordination and collision retries. If codes must not be guessable, shuffle the bits or XOR with a secret before encoding."},
    {t:"Making redirects fast",p:"4k-10k reads/s with a tail-latency target.",opts:[
      "Cache-aside in Redis with LRU eviction and a TTL.",
      "A CDN or edge cache for the hottest links (works with 301/302 and Cache-Control).",
      "A local in-process cache for the very hottest keys, in front of Redis."
    ],pick:"Redis cache-aside, with an LRU policy sized to about 20% of daily reads. Mention the CDN as an extension. Cache invalidation is easy because links are effectively immutable; only deletes and expiry need to evict."},
    {t:"301 vs 302",p:"Which redirect status to return.",opts:[
      "301 permanent: browsers and CDNs cache it, so fewer requests reach you, but you lose click counts and cannot change the target.",
      "302 temporary: every click hits your servers, so analytics and takedowns work."
    ],pick:"302 if you need analytics or the ability to disable a link. 301 if you only want to save load. State the trade-off; either is acceptable."},
    {t:"Expiry and cleanup",p:"Expired links should stop working and eventually free space.",opts:[
      "Check expires_at on read and return 410 (lazy).",
      "A background job deletes expired rows in batches (or use a native TTL such as DynamoDB TTL or Redis EXPIRE)."
    ],pick:"Both: lazy check for correctness, TTL or a sweeper for storage. Do not recycle codes soon after expiry, since old links may still be shared."}
  ],
  trade:["Hash vs counter: hash is stateless but collides; counter is collision-free but needs coordination.","301 vs 302: fewer hits vs analytics control.","Cache size vs hit rate: diminishing returns past the hot 20%.","Eventual consistency on analytics buys a fast redirect path."],
  fail:["Cache stampede on a viral link: use request coalescing or a short lock so one request refills the cache.","Hot key: one link gets enormous traffic; replicate the key across cache nodes or serve it from a CDN.","Code service down: app servers keep using their pre-allocated range until it runs out; allocate ranges generously.","Database shard lost: replicate each shard; reads continue from a replica.","Abuse: people shorten malware links. Add rate limits and a URL blocklist check."],
  follow:[
    "How do you stop two servers generating the same code? -> They draw from disjoint ranges, and the insert is conditional on the code not existing.",
    "How would you add analytics? -> Emit click events to a queue (Kafka) and aggregate asynchronously; never block the redirect.",
    "How do you handle the same long URL submitted twice? -> Either return a new code each time (simplest) or keep a long_url -> code index to dedupe. Say that dedupe costs an extra lookup per write.",
    "How does this scale 10x? -> Shard by code, add cache nodes, add read replicas; the structure does not change."
  ],
  traps:["Starting with the database schema before saying what the numbers imply.","Using an auto-increment ID and forgetting it is guessable and a single bottleneck.","Putting analytics writes in the redirect path.","Forgetting expiry, deletion or abuse entirely.","Saying 'hash it' without handling collisions."]
},

"pastebin":{
  say:"Store the text blob in object storage, keep a small metadata row in a database keyed by a unique paste ID, and serve reads through a cache or CDN.",
  clarify:[
    "Max paste size? (decides whether the text can live in a database row or must go to object storage)",
    "Expiry options, and are pastes editable? (immutable pastes are trivially cacheable)",
    "Private/unlisted vs public, and any auth? (affects access checks on every read)",
    "Scale: pastes per day, and read:write ratio?",
    "Syntax highlighting, search, abuse reporting? (extras; highlight on the client)"
  ],
  fr:["Create a paste with text, optional title, language and expiry; get back a URL","Read a paste by URL","Pastes expire and are deleted after their TTL","Out of scope: editing, comments, full-text search"],
  nfr:["Read latency under 100 ms at p99","99.9% available; losing a paste is worse than a brief outage (durable storage)","Unique, unguessable IDs for unlisted pastes","Read-heavy, about 5:1 to 10:1","Max paste size 10 MB"],
  est:[
    "Assume 1M new pastes/day -> 12 writes/s average, about 40 peak.",
    "Reads at 10:1 -> about 120/s average, about 400 peak. Light; one DB could survive, but the cache is cheap and tail latency matters.",
    "Average paste 10 KB -> 1M x 10 KB = 10 GB/day, 3.6 TB/year. Too big to keep in the metadata DB; that is why blobs go to object storage.",
    "Metadata row is about 200 bytes -> 1M/day x 365 x 200 B = 73 GB/year. Easily one database, shard later.",
    "Bandwidth: 400 reads/s x 10 KB = 4 MB/s peak. Trivial; a CDN is for latency and offload, not necessity."
  ],
  api:["POST /v1/pastes {content, title?, language?, expires_in?, visibility?} -> 201 {paste_id, url}","GET /v1/pastes/{paste_id} -> 200 {content, title, language, created_at} or 404/410","DELETE /v1/pastes/{paste_id} -> 204 (owner or admin)","Return the raw text at GET /raw/{paste_id} so it can be cached and curl-ed"],
  data:["pastes(paste_id PK, user_id?, title, language, visibility, created_at, expires_at, size, blob_key). Lookup by paste_id only.","Object storage holds the content at blob_key = paste_id (S3, GCS). Content never changes, so it is safe to cache forever (until expiry).","Index on expires_at for the cleanup job.","SQL is fine here (low volume, simple); NoSQL also works. Say it is the access pattern, not a religion."],
  flow:"Client -> CDN -> Load balancer -> App servers\n                             |-> Key service (pre-generated unique IDs)\n                             |-> Metadata DB (+ replicas)\n                             |-> Object store (blob)\n                             |-> Cache (Redis): hot pastes\n                             '-> Cleanup worker (deletes expired)",
  write:[
    "Client POSTs content. The app server rejects anything over the size limit.",
    "Fetch a unique ID from the key service (or generate a random 8-char base62).",
    "Upload the content to object storage under that key.",
    "Insert the metadata row. If this fails after the upload, the orphan blob is removed by a periodic sweep.",
    "Return the URL."
  ],
  read:[
    "Client GETs the paste URL (CDN first; hot pastes never reach origin).",
    "App server checks Redis for metadata. On a miss, read the DB and refill.",
    "Check visibility and expiry; return 404/410 if not allowed.",
    "Fetch the content from the object store (or from cache if small) and return it."
  ],
  deep:[
    {t:"Where the content lives",p:"Pastes can be up to megabytes; the metadata is tiny.",opts:["Store in the DB row: simple, but bloats the database and its backups, and replicas copy everything.","Store in object storage, metadata in the DB: cheap, durable, scales independently; one extra hop on reads.","Small pastes inline, big ones in object storage: optimal but two code paths."],pick:"Object storage plus metadata DB. Add a cache for small hot pastes to hide the extra hop."},
    {t:"Unique IDs without collisions",p:"IDs are the URL, so they should be short and hard to guess.",opts:["Random base62 with a conditional insert and retry.","Pre-generated keys: a key service fills a table of unused 8-char keys; app servers take batches.","Hash of the content: dedupes identical pastes, but collisions and privacy leaks (anyone who knows the text can find the paste)."],pick:"Pre-generated key batches (or random with retry). Avoid content hashes for private pastes."},
    {t:"Expiry",p:"Expired pastes must disappear and free storage.",opts:["Lazy check on read.","Background job scanning expires_at index and deleting rows plus blobs in batches.","Object store lifecycle rules for the blob."],pick:"Lazy check for correctness; sweeper plus lifecycle rules for storage. Delete the blob before the row, or keep a tombstone, so a crash does not leak data."},
    {t:"Abuse and size",p:"Public text hosting attracts spam and illegal content.",opts:["Per-IP and per-user rate limits.","Size cap and content-type checks.","Report/takedown flow and an async scanner."],pick:"Rate limit and size cap on the hot path; scanning and takedown asynchronously."}
  ],
  trade:["Blob in object store: cheaper and scalable, slightly slower than an in-DB read.","Immutable pastes: trivial caching but no editing; an edit creates a new version/ID.","Random IDs vs sequential: random is safer for unlisted pastes, sequential is easier to shard evenly."],
  fail:["Upload succeeded, DB write failed: orphan blobs; sweep blobs with no metadata.","DB write succeeded, upload failed: do the upload first so a row never points at nothing.","Cache stampede on a viral paste: coalesce, and use the CDN.","Key service outage: keep a local pool of unused keys per server.","Storage growth: lifecycle rules and expiry defaults (for example 30 days if none is chosen)."],
  follow:[
    "How do you make pastes private? -> Unguessable IDs plus an auth check, or signed URLs on the blob.",
    "How would you add search? -> Index titles asynchronously into a search engine (Elasticsearch); never in the write path.",
    "What if one paste goes viral? -> CDN absorbs it; the cache and origin barely notice.",
    "How do you version edits? -> Each edit writes a new immutable blob and updates a pointer in the metadata row."
  ],
  traps:["Putting megabytes of text in the relational row.","Ignoring expiry and cleanup.","No thought about orphaned blobs when a write half-fails.","Hashing the content for the ID with no collision handling.","Forgetting abuse."]
},

"id-generator":{
  say:"Use a Snowflake-style 64-bit ID: timestamp bits for ordering, a machine ID so servers never coordinate, and a per-millisecond sequence for throughput.",
  clarify:[
    "Do IDs need to be sortable by time, and how strictly? (rough ordering is cheap, strict ordering is not)",
    "Size limit: 64-bit numeric, or can it be a 128-bit UUID? (many databases prefer 64-bit integers)",
    "Peak IDs per second, and across how many data centers? (sets bit allocation)",
    "Must IDs be gap-free? (almost never; gap-free needs a single counter and hurts availability)",
    "Must they be unguessable? (if yes, do not expose raw sequential IDs)"
  ],
  fr:["Generate unique IDs on request from many servers","IDs are roughly sortable by creation time","IDs fit in 64 bits","Out of scope: strict global ordering, gap-free sequences"],
  nfr:["Unique even across data centers and restarts","No coordination on the hot path","Latency under 1 ms per ID","10k+ IDs per second per node, 1M+/s total","Survives clock skew and node restarts without producing duplicates"],
  est:[
    "Target 1M IDs/s system-wide. With 1,000 nodes that is 1,000 IDs/s per node, which is easy.",
    "Bit layout: 1 unused sign bit + 41 bits timestamp + 10 bits machine ID + 12 bits sequence = 64.",
    "41 bits of milliseconds = 2^41 ms = about 69 years from your custom epoch.",
    "10 bits of machine ID = 1,024 nodes (for example 5 bits datacenter + 5 bits worker).",
    "12 bits of sequence = 4,096 IDs per millisecond per node = about 4M IDs/s per node, far above need. If the sequence overflows within a millisecond, wait for the next millisecond."
  ],
  api:["GET /v1/id -> {id} (or an in-process library call: generate() with no network at all)","GET /v1/ids?count=100 -> a batch, to amortize network cost","Often best as a library embedded in each service; a network service adds latency and a failure mode"],
  data:["No database on the hot path. Each node keeps only (last_timestamp, sequence) in memory.","Machine IDs are assigned once from a coordinator (ZooKeeper, etcd, or a config/DB table) at startup; this is the only coordination, and it is off the hot path.","Optionally persist last_timestamp periodically so a restart cannot reuse a past millisecond."],
  flow:"App service -> ID generator (library or service on each node)\n                    state: lastTs, seq, machineId\n                    machineId lease <- ZooKeeper/etcd (startup only)\n                    clock <- NTP",
  write:[
    "Read the current time in milliseconds minus the custom epoch.",
    "If it equals lastTs, increment seq. If seq overflows (4096), spin until the next millisecond and reset seq to 0.",
    "If it is greater than lastTs, reset seq to 0 and set lastTs.",
    "If it is LESS than lastTs, the clock moved backwards: refuse or wait (see deep dive).",
    "Return (ts << 22) | (machineId << 12) | seq."
  ],
  read:["There is no read path: IDs are generated, not looked up. The consumer (a database, a message) simply stores the ID.","Extracting the creation time from an ID is just shifting bits, which is a useful feature for debugging and for time-range queries by ID."],
  deep:[
    {t:"Choosing the approach",p:"Several ways to make unique IDs, with very different trade-offs.",opts:[
      "UUID v4: no coordination, 128 bits, random, so poor index locality (random inserts into a B-tree cause page splits) and not sortable.",
      "DB auto-increment: simple and gap-free but a single point of failure and bottleneck; multi-master with step sizes (node A odd, node B even) is brittle.",
      "Ticket server (Flickr): a dedicated DB hands out IDs; simple but a bottleneck and SPOF unless duplicated.",
      "Snowflake: 64-bit, sortable, decentralized; depends on clocks.",
      "UUID v7 / ULID: timestamp-prefixed 128-bit, sortable, no machine IDs; bigger than 64 bits."
    ],pick:"Snowflake when 64-bit and time-ordering matter (most interview prompts). UUID v7 if you are happy with 128 bits and want zero coordination."},
    {t:"Clock skew and going backwards",p:"NTP can step the clock backwards, which would produce an ID lower than one already issued, or a duplicate.",opts:[
      "If the drift is small (a few ms), sleep until the clock catches up.",
      "If large, refuse to issue IDs and alert; fail loudly rather than risk duplicates.",
      "Use a monotonic clock for the elapsed part and anchor it to wall time once at startup.",
      "Persist lastTs so a restart after a clock regression does not reuse a past millisecond."
    ],pick:"Wait for small regressions, refuse for large ones, persist lastTs. Say that uniqueness is a hard guarantee while ordering is best effort."},
    {t:"Assigning machine IDs",p:"Two nodes sharing a machine ID can produce the same ID in the same millisecond.",opts:["Static config per host: easy but error-prone with autoscaling.","Lease from ZooKeeper/etcd with a heartbeat: auto-assigned and reclaimed.","Derive from IP/MAC: works until containers or IP reuse make collisions possible."],pick:"A lease from a coordinator at startup, kept alive by heartbeats, and not reused until the lease has expired."},
    {t:"Ordering guarantees",p:"IDs from different nodes in the same millisecond have no defined order.",opts:["Accept 'roughly sorted' (k-sorted): ordering is exact per node and approximate across nodes.","Strict global order needs a single sequencer or consensus, which costs latency and availability."],pick:"State clearly that Snowflake is roughly time-ordered, and that you cannot get strict global ordering without paying for coordination."}
  ],
  trade:["Decentralized speed vs strict ordering.","Bit allocation: more machine bits = more nodes but fewer sequence bits per ms; more timestamp bits = longer lifespan.","64-bit fits in a database bigint and JavaScript needs care (numbers above 2^53 lose precision; send IDs as strings).","Library vs service: library has no network hop but spreads the clock dependency to every host."],
  fail:["Clock regression: handled by wait/refuse/persist.","Machine ID collision: from lease bugs or duplicate config; leads to duplicate IDs.","Sequence exhaustion: spin to the next ms, which caps throughput at 4096/ms per node.","Epoch overflow after about 69 years: choose a recent custom epoch and plan the migration.","Coordinator (ZooKeeper) down: nodes already running keep generating; only new nodes cannot start."],
  follow:[
    "Why not just use UUIDs? -> They are 128 bits and random, which fragments indexes and cannot be sorted by time. Fine if size and order do not matter.",
    "What if the clock goes backwards? -> Wait or reject, never issue. Persist the last timestamp.",
    "How do you get unique IDs per user or per tenant that are also ordered? -> Shard the sequence key (tenant + counter) instead of a global one.",
    "Can you extract the time? -> Yes, shift right by 22 bits and add the epoch."
  ],
  traps:["Proposing one central counter and calling it done.","Ignoring clocks entirely.","Not saying how machine IDs are assigned.","Claiming strict global ordering.","Forgetting that JavaScript cannot hold 64-bit integers exactly."]
},

});
