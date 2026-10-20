// Practice content for System Design topics, keyed by SD.topics id (sysdesign_data.js). Topics without an entry still get the
// lesson page (summary, use, trade-offs, pitfalls) with a manual "mark complete"; an entry adds the teaching extras and the
// practice steps that make completion earned.
//   goal   one sentence, shown under the title
//   mins   rough time to read and practice
//   blocks extra teaching after the topic's own sections: {md}, {tip}, {warn}
//   parts  {id,type:"quiz",q,options[],answer,why}  or  {id,type:"explain",title,prompt,rubric}  (explain is AI-reviewed)
// Part ids are persisted in sysdesign-progress-v1, so keep them stable.
const SD_LESSONS={
scaling:{
  goal:"Explain how a design grows from one server to many, and name the bottleneck before adding a component.",
  mins:12,
  blocks:[
    {md:"### The usual growth order\n1. One server: app and database together. Fine until you can name a limit.\n2. Split the database from the app server.\n3. Make app servers **stateless** and put a load balancer in front.\n4. Add a cache and read replicas for reads.\n5. Partition (shard) the data when writes or storage outgrow one node."},
    {tip:"Interviewers reward a design that grows when the numbers say so. Say \"at 50 QPS one box is fine; at 5,000 reads per second I would add a cache\" instead of drawing everything up front."}
  ],
  parts:[
    {id:"q-stateless",type:"quiz",q:"Why do designs keep app servers stateless?",options:["Stateless servers use less memory","Any server can handle any request, so you can add or remove servers freely","It removes the need for a database","It makes requests faster by skipping authentication"],answer:1,why:"If session state lives on one server, requests must stick to it. Pushing state into a database, cache or object store lets the load balancer send a request anywhere."},
    {id:"q-bottleneck",type:"quiz",q:"A service handles 20 writes/s and 2,000 reads/s, and the database CPU is pegged by reads. What is the cheapest first fix?",options:["Shard the database by user id","Add read replicas and a cache in front of the reads","Move to a bigger write-optimized database","Add more app servers"],answer:1,why:"The load is read-heavy, so scale reads: cache hot data and add replicas. Sharding fixes write or storage limits, which this system does not have. More app servers would only send more reads to the same database."},
    {id:"q-vertical",type:"quiz",q:"What is the main drawback of only scaling vertically (a bigger machine)?",options:["It needs a load balancer","It is capped by the largest machine and stays a single point of failure","It cannot run a database","It always costs less than horizontal scaling"],answer:1,why:"Vertical scaling is simple and often right at first, but there is a ceiling and one failure takes everything down. That is why the design eventually moves to horizontal scaling."},
    {id:"x-scale",type:"explain",title:"Scale a design out loud",prompt:"A photo-sharing app starts on one server and grows to 10M daily users. Walk through how you would evolve the design. Name what breaks at each step and the component you add to fix it.",rubric:"Good answers name a concrete bottleneck at each step (not just 'it gets slow'), cover stateless app servers behind a load balancer, caching and read replicas for reads, object storage plus CDN for photos, and sharding or partitioning only when writes or data size demand it. They tie each addition to a number or symptom. Penalize adding components with no justification."}
  ]
},
cache:{
  goal:"Pick a caching strategy, defend its freshness trade-off, and handle the failure modes (stampede, stale data).",
  mins:15,
  blocks:[
    {md:"### The four strategies in one table\n| Strategy | Read path | Write path | Good for |\n|---|---|---|---|\n| Cache-aside | app checks cache, on miss reads DB and fills | write DB, invalidate or update cache | the default for read-heavy data |\n| Read-through | cache fetches from DB on a miss | write DB | same as cache-aside, simpler app code |\n| Write-through | read from cache | write cache and DB together | data you cannot lose, read soon after write |\n| Write-back | read from cache | write cache, flush to DB later | very high write rates, can tolerate loss |"},
    {warn:"A cache is never the source of truth. If losing the cache would lose data, you have built a database, so design it like one."}
  ],
  parts:[
    {id:"q-aside",type:"quiz",q:"In cache-aside, what happens on a cache miss?",options:["The cache fetches from the database by itself","The app reads the database, then puts the value in the cache","The request fails and is retried","The app writes to the cache first and the database later"],answer:1,why:"With cache-aside the application owns the logic: check cache, on a miss load from the DB and fill the cache. A cache that loads by itself is read-through."},
    {id:"q-stampede",type:"quiz",q:"A hot key's TTL expires and thousands of requests hit the database at once. What is this called and what helps?",options:["Cache poisoning; use a longer key","Cache stampede; use request coalescing, a lock, or jittered TTLs","Write amplification; use write-back","Hot partition; add shards"],answer:1,why:"This is a cache stampede (thundering herd). Let one request rebuild the value while others wait or serve the stale value, and add random jitter to TTLs so keys do not all expire together."},
    {id:"q-writeback",type:"quiz",q:"Which choice carries the risk of losing acknowledged writes if the cache node dies?",options:["Cache-aside","Write-through","Write-back","Read-through"],answer:2,why:"Write-back acknowledges after writing the cache and flushes to the database later, so a crash before the flush loses data. The others write the database on the write path or leave it as the source of truth."},
    {id:"x-cache",type:"explain",title:"Cache a profile page",prompt:"Your profile service gets 50k reads/s and 200 writes/s, and the database is struggling. Describe how you would add caching: what you cache, which strategy, TTL and invalidation, and what could go wrong.",rubric:"Good answers choose cache-aside (or read-through) for read-heavy data, state what is cached and the key, justify a TTL against how stale a profile may be, describe invalidating or updating the entry on write, and name at least one failure mode with a mitigation (stampede on a hot profile, stale data, cache outage falling back to the DB without overload). Bonus for estimating hit rate or memory needs."}
  ]
},
cap:{
  goal:"Use CAP and consistency levels per operation instead of as a label for a whole system.",
  mins:12,
  blocks:[
    {md:"### What the theorem actually says\nA network partition **will** happen eventually. While it lasts, a system must either refuse some requests (stay consistent, lose availability) or answer with possibly stale data (stay available, lose consistency). Without a partition you can have both, but strong consistency still costs latency (the PACELC refinement)."},
    {tip:"In an interview, make the choice per operation: \"payments and inventory counts are strongly consistent; the like counter and the feed are eventually consistent.\""}
  ],
  parts:[
    {id:"q-partition",type:"quiz",q:"During a network partition, a system that keeps answering every request with possibly stale data has chosen:",options:["Consistency over availability","Availability over consistency","Neither; partitions cannot be tolerated","Both, because it replicates synchronously"],answer:1,why:"Answering every request from whichever side you can reach, even if it lags, is choosing availability (AP). Refusing requests that cannot be confirmed is choosing consistency (CP)."},
    {id:"q-which",type:"quiz",q:"Which feature most clearly needs strong consistency?",options:["Like counts on a post","The order of items in a news feed","Not selling the last concert ticket to two buyers","Showing a user's follower count"],answer:2,why:"Uniqueness and inventory constraints cannot tolerate two nodes disagreeing. Counts and feed order can be a little stale without harm."},
    {id:"q-ryw",type:"quiz",q:"A user edits their profile and the page reloads showing the old data from a lagging replica. Which cheap guarantee fixes this?",options:["Linearizability across the whole database","Read-your-writes (route the user's reads to the leader or a fresh replica for a while)","Removing replication","Longer cache TTLs"],answer:1,why:"Read-your-writes only promises that a user sees their own updates. It is much cheaper than making everything strongly consistent."},
    {id:"x-cap",type:"explain",title:"Choose consistency per feature",prompt:"For a ticket-booking site, pick the consistency level for: (a) seat reservation, (b) the 'tickets left' badge on the event page, (c) a user's booking history. Explain each choice and what the user sees during a partition.",rubric:"Good answers make reservation strongly consistent (single writer, or a transaction/lock per seat) and accept refusing or delaying requests during a partition; allow the badge to be eventually consistent and approximate; give booking history read-your-writes at least. They frame it as a per-operation trade-off, mention user-visible behaviour in a partition, and avoid claiming 'CAP says pick two' as a permanent label."}
  ]
},
sharding:{
  goal:"Choose a shard key and scheme from the access pattern, and name the costs of splitting data.",
  mins:15,
  blocks:[
    {md:"### Three ways to split\n- **Range**: keys A-F on shard 1, G-M on shard 2. Great for range scans, easy to create hot spots (all new rows on the last shard).\n- **Hash**: `hash(key) % N` spreads load evenly, but range queries scatter and changing N moves most keys. Consistent hashing reduces that movement.\n- **Directory**: a lookup service maps key to shard. Flexible, but the directory is another system to run."},
    {tip:"Ask what the dominant query is before choosing. The shard key should appear in it, so one request touches one shard."}
  ],
  parts:[
    {id:"q-hot",type:"quiz",q:"You shard a posts table by creation timestamp ranges. What goes wrong?",options:["Reads become impossible","Every new write lands on the newest shard, creating a hot spot","Shards become too small","Joins get faster"],answer:1,why:"A monotonically increasing key sends all current writes to one shard. Hashing a well-distributed key (or a compound key) spreads them."},
    {id:"q-key",type:"quiz",q:"A messaging app mostly loads one conversation at a time. Which shard key fits best?",options:["Message timestamp","Sender id","Conversation id","Random uuid per message"],answer:2,why:"Sharding by conversation id keeps all messages of a conversation together, so the common read hits one shard. A random id would scatter a conversation across every shard."},
    {id:"q-reshard",type:"quiz",q:"With hash(key) % N, what happens when you go from N=4 to N=5 shards?",options:["Nothing moves","Roughly a fifth of keys move","Most keys map to a different shard","Only the new shard's keys move"],answer:2,why:"Changing the modulus remaps most keys, so you would copy most of your data. Consistent hashing (or many virtual shards) limits movement to about 1/N of the keys."},
    {id:"x-shard",type:"explain",title:"Shard a database",prompt:"An orders database for a marketplace has outgrown one node. Choose a shard key and scheme, and explain what gets harder (queries, transactions, resharding) and how you would cope.",rubric:"Good answers pick a key from the dominant access pattern (for example customer or seller id, with a stated reason), choose hash vs range with its trade-off, and name concrete costs: cross-shard queries and joins (scatter-gather or denormalization), cross-shard transactions (avoid, or use sagas), hot keys, and resharding (consistent hashing or many logical shards). Penalize choosing a key without tying it to queries."}
  ]
},
queues:{
  goal:"Use a queue to decouple and smooth load, and design consumers that survive duplicates and failures.",
  mins:12,
  blocks:[
    {md:"### What a work queue gives you\n- **Decoupling**: the producer does not wait for the slow work.\n- **Buffering**: a spike fills the queue instead of overwhelming the consumer.\n- **Retries**: a message is acknowledged only after success, otherwise redelivered.\n\nThe price is that delivery is realistically **at-least-once**, so the same message can arrive twice."},
    {warn:"\"Exactly-once delivery\" is a claim to question. The practical answer is at-least-once delivery plus idempotent consumers."}
  ],
  parts:[
    {id:"q-atleast",type:"quiz",q:"A consumer processes a message and crashes before acknowledging it. What does the queue do?",options:["Drops the message","Redelivers it, so the consumer may see it twice","Moves it to the front and blocks the queue forever","Delivers it to every consumer"],answer:1,why:"Unacknowledged messages are redelivered. That is why consumers must tolerate duplicates (idempotency)."},
    {id:"q-idem",type:"quiz",q:"Which makes a 'send welcome email' consumer safe under redelivery?",options:["Increase the queue size","Record a message/idempotency key and skip if already processed","Acknowledge before sending","Run only one consumer"],answer:1,why:"Storing a processed-key (or making the operation naturally idempotent) lets a duplicate be ignored. Acknowledging first would instead risk losing the email on a crash."},
    {id:"q-growth",type:"quiz",q:"The queue depth grows steadily all day. What does this most likely mean?",options:["Producers are too slow","Consumers cannot keep up with the arrival rate","The queue is working as intended","Messages are being delivered twice"],answer:1,why:"Steady growth means arrivals exceed processing capacity. Add consumers, speed up the work, or shed load. Alert on depth and age so it is not hidden."},
    {id:"x-queue",type:"explain",title:"Add a queue to a request path",prompt:"Image uploads trigger thumbnail generation that takes seconds. Describe how a queue changes the design: what the API returns, how workers are scaled, and how you handle failures, duplicates and poison messages.",rubric:"Good answers return quickly after storing the upload and enqueueing a job, scale workers by queue depth, use acknowledgements and retries with backoff, make the worker idempotent (same input gives same output, or a dedupe key), and use a dead-letter queue for messages that keep failing. They mention how the client learns the result (polling, webhook, push) and monitoring queue depth/age."}
  ]
},
replication:{
  goal:"Explain leader-follower replication, its lag and failover risks, and how to read your own writes.",
  mins:12,
  blocks:[
    {md:"### Sync vs async\n- **Synchronous**: the leader waits for a follower before acknowledging. Durable, but slower, and one slow follower stalls writes.\n- **Asynchronous**: the leader acknowledges immediately. Fast, but followers lag and a failover can lose the most recent writes.\n\nMany systems use one synchronous follower plus asynchronous others."}
  ],
  parts:[
    {id:"q-lag",type:"quiz",q:"A user posts a comment, refreshes, and the comment is missing. The most likely cause is:",options:["The cache was full","The read hit a follower that had not yet received the write","The leader rejected the write","The load balancer dropped the request"],answer:1,why:"With asynchronous replication a follower can lag. Fix it with read-your-writes: send that user's reads to the leader (or a caught-up replica) for a short window."},
    {id:"q-failover",type:"quiz",q:"The leader dies with async replication. What risk comes with promoting a follower?",options:["The new leader is read-only","Recently acknowledged writes that had not replicated are lost","All followers become leaders","Replication cannot resume"],answer:1,why:"Writes acknowledged by the old leader but not yet copied are gone once a lagging follower takes over. Synchronous replication to at least one follower reduces this."},
    {id:"q-split",type:"quiz",q:"What is split brain and how is it prevented?",options:["Two caches disagree; use a longer TTL","Two nodes both believe they are leader; use leader election with fencing/quorum","A table is split across shards; use hashing","Followers fall behind; use sync replication"],answer:1,why:"If a partitioned old leader keeps accepting writes while a new one is elected, data diverges. A quorum-based election plus fencing tokens stops the old leader from writing."},
    {id:"x-repl",type:"explain",title:"Design for read scale and failover",prompt:"A read-heavy service uses one leader and three followers. Explain how reads and writes are routed, what staleness users may see and how you limit it, and what happens when the leader fails.",rubric:"Good answers send writes to the leader and spread reads over followers, acknowledge replication lag and propose read-your-writes or monotonic reads for sessions, choose sync vs async with a stated durability/latency trade-off, and describe failover (detect failure, elect a follower, fence the old leader, repoint clients) including possible loss of unreplicated writes."}
  ]
}
};
