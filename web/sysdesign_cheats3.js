// Cheat sheets, part 3: medium problems (typeahead, web crawler, ticketing, nearby places, job scheduler). Format: see sysdesign_cheats.js.
window.SD_CHEATS=window.SD_CHEATS||{};
Object.assign(window.SD_CHEATS,{

"typeahead":{
  say:"A trie (or sorted prefix index) of popular queries with the top-K suggestions precomputed at each prefix node, rebuilt offline from query logs and served from memory behind a cache.",
  clarify:[
    "What are we suggesting: past popular queries, products, people? (decides the data source)",
    "Ranking: by global frequency, recency, or personalised? (start with global popularity)",
    "Latency target? (under 100 ms end to end, since it runs on every keystroke)",
    "How many suggestions, and how fresh must trending queries be? (minutes vs a day)",
    "Languages, typos (fuzzy matching), and offensive-content filtering?"
  ],
  fr:["Given a prefix, return the top 5-10 suggested completions","Suggestions are ranked by popularity","New trending queries show up within a reasonable delay","Out of scope: spelling correction, deep personalisation, full search results"],
  nfr:["Under 100 ms p99, ideally under 50 ms; it fires on every keystroke","Highly available; stale suggestions are fine, an error is not","Read-heavy by a huge margin","Suggestions need not be perfectly fresh (eventual consistency)","Scales to billions of queries per day"],
  est:[
    "Assume 5B searches/day; each query averages 4 words (about 25 chars) and users type about 10 keystrokes per search, but with debounce, say 5 requests per search -> 25B suggestion requests/day = 290k/s average, about 600k peak.",
    "Unique queries: assume 100M distinct queries worth indexing x 25 B = 2.5 GB of raw text, plus node and top-K overhead; about 50-100 GB for the trie. Fits across a few memory-heavy machines, or one with sharding for safety.",
    "Top-K storage: 5 suggestions x about 30 B per prefix node. The number of prefixes is bounded by total characters, so cap trie depth (for example 20 chars) and prune rare queries.",
    "Cache: the most common short prefixes ('a', 'ap', 'app') cover a large share of traffic; a small cache gives a very high hit rate."
  ],
  api:["GET /v1/suggest?q=<prefix>&limit=5&lang=en -> {suggestions:[{text, score}]}","Cacheable: add Cache-Control so browsers and CDNs keep common prefixes for a minute","Client behaviour: debounce 100-200 ms, cancel in-flight requests, cache responses locally"],
  data:["Query log events (query, timestamp, user?) go to a stream, then are aggregated into counts per query: (query, count, last_seen).","Trie / prefix table: node per character; each node stores its top-K completions (strings and scores). Alternative: a key-value map prefix -> top-K list, which is simpler to shard and cache.","The serving store is read-only, built offline and swapped in; it is not updated per query."],
  flow:"Client (debounce) -> CDN/edge cache -> Load balancer -> Suggest service\n                                         '-> in-memory trie / prefix->topK (sharded by prefix)\nOffline: Search logs -> Kafka -> Aggregator (MapReduce/Spark, hourly/daily)\n          -> build trie -> snapshot to storage -> Suggest servers load new version",
  write:["There is no user-facing write. Search queries are logged to a stream after they happen.","An aggregation job counts queries per time window (with decay or windowing for trending).","A builder constructs the trie with top-K at each node, filters blocked terms, and writes a versioned snapshot.","Suggest servers load the new snapshot and swap atomically."],
  read:["User types 'ap'; the client debounces and sends GET /suggest?q=ap.","Edge cache returns it if it is a popular prefix.","Otherwise the suggest service walks the trie to the node for 'ap' and returns its precomputed top-K.","Response in a few milliseconds; the client renders the list."],
  deep:[
    {t:"Data structure",p:"Find completions of a prefix quickly.",opts:["Trie walk then DFS to collect completions: slow for short prefixes with huge subtrees.","Trie with top-K stored at every node: O(length of prefix) lookup, more memory.","Prefix hash table (prefix -> top-K list): simple, easy to shard and cache, more entries.","Sorted array of queries with binary search for the range: compact, but ranking inside the range is expensive."],pick:"Store top-K at each node (or prefix -> list in a key-value store). It trades memory for predictable O(prefix) latency. Say how you cap depth and prune rare queries."},
    {t:"Keeping suggestions fresh",p:"Rebuilding on every query is impossible; stale data hurts trending topics.",opts:["Batch rebuild every hour or day from aggregated logs.","Stream processing (Flink/Kafka Streams) maintains windowed counts and updates a small 'trending' index, merged with the base trie at query time.","Apply decay so old popularity fades."],pick:"Batch-built base trie plus a small real-time trending layer. Snapshots are versioned and swapped atomically."},
    {t:"Scaling and sharding",p:"A single machine may not hold the whole trie or the traffic.",opts:["Replicate the full trie on many servers and load balance: simplest if it fits in memory.","Shard by first character(s): uneven, because 's' is far more common than 'x'.","Shard by hash of the prefix or use ranges chosen from the actual distribution."],pick:"Replicate if it fits; otherwise range-shard by prefix using measured load, with replicas for each shard. Use a router that maps prefix to shard."},
    {t:"Reducing load",p:"Hundreds of thousands of requests per second, mostly for the same short prefixes.",opts:["Client-side debounce and local cache.","CDN or edge cache with a short TTL.","Server-side cache of hot prefixes."],pick:"All three. Debounce and caching cut the request volume by a large factor before it hits the service."},
    {t:"Quality and safety",p:"Suggestions can be offensive or harmful, and personalised data is sensitive.",opts:["Blocklist applied at build time.","Minimum count threshold so single odd queries do not appear.","Optional personalisation blended in from a user's recent searches, stored client-side or in a per-user cache."],pick:"Filter at build time with a blocklist and min-count threshold; keep personalisation as a small re-rank step."}
  ],
  trade:["Memory (top-K at every node) vs lookup latency.","Freshness vs rebuild cost: batch is cheap but delayed; streaming is fresher but more complex.","Replication vs sharding.","Personalisation improves relevance but complicates caching."],
  fail:["Bad snapshot deployed: keep the previous version and roll back.","Suggest server crash: replicas serve; the load balancer routes around it.","Hot shard for popular prefixes: cache and replicate hot shards.","Log pipeline lag: suggestions go stale but still work.","Poisoning (bots inflate a bad query): dedupe by user/IP and rate-limit contributions."],
  follow:[
    "How would you support typo tolerance? -> Add a fuzzy layer (edit-distance index or n-gram lookup) only when the prefix returns few results.",
    "How do you handle trending events? -> A streaming windowed counter feeding a small trending index merged at read time.",
    "How big is the trie and how would you shrink it? -> Prune rare queries, cap depth, and compress with a radix (compact) trie.",
    "How do you personalise? -> Merge global top-K with the user's recent history at the service, not in the shared cache key."
  ],
  traps:["Walking the whole subtree on each request.","Updating the trie synchronously on every search.","Ignoring the client-side debounce, which cuts load by multiples.","Sharding by first letter and not noticing the skew.","No answer for how new queries reach the index."]
},

"web-crawler":{
  say:"A URL frontier feeds many fetcher workers; each fetched page is parsed for links, deduplicated, and the new URLs go back into the frontier, with per-host politeness and robots.txt enforced.",
  clarify:[
    "Purpose: search index, archive, or data mining? (decides what to store and how fresh)",
    "Scale: pages to crawl, and how often to re-crawl? (billions of pages and weekly refresh is typical)",
    "Content types: HTML only, or images and PDFs too? JavaScript-rendered pages?",
    "Politeness: do we respect robots.txt and per-site limits? (yes, always)",
    "How is freshness prioritised? Do we need to handle duplicates and spider traps?"
  ],
  fr:["Start from seed URLs and discover pages by following links","Download and store page content for downstream processing (indexing)","Avoid duplicate pages and URLs","Re-crawl pages to keep them fresh","Out of scope: indexing and ranking, rendering heavy JavaScript apps"],
  nfr:["Polite: never overload a single host; obey robots.txt","Scalable: billions of pages, horizontally scalable fetchers","Robust: survive bad HTML, timeouts, redirect loops and traps","Extensible: new content types and processors can plug in","Efficient: dedupe so bandwidth is not wasted"],
  est:[
    "Assume 1B pages per month -> 1B / (30 x 100k) = about 400 pages/s average; plan for 1,000/s peak.",
    "Storage: average page 100 KB (HTML) x 1B = 100 TB per crawl; with compression about 30-50 TB. Keep multiple versions of hot pages. Object storage, not a database.",
    "Bandwidth: 400 pages/s x 100 KB = 40 MB/s = 320 Mbit/s of download sustained.",
    "URL set: 10B URLs x 100 B = 1 TB. A 'seen URL' check needs a Bloom filter or sharded hash set (a Bloom filter at 1% false positives needs about 10 bits per URL, roughly 12 GB for 10B).",
    "Fetchers: one fetcher does about 10 pages/s with DNS + download latency -> 40-100 fetchers; with concurrency, far fewer."
  ],
  api:["Mostly internal: the frontier exposes enqueue(urls, priority) and next_batch(worker_id)","Fetcher output: store_page(url, content_hash, body) and emit (url, outlinks) to the parser","Admin API: add seeds, set per-host crawl delay, pause a domain"],
  data:["URL frontier: priority queues (front) feeding per-host queues (back), each with a next-allowed-fetch time.","seen_urls: Bloom filter or sharded key-value set of normalised URL hashes.","content_seen: hash of page content (SimHash or SHA) to detect duplicate content under different URLs.","Page store: object storage keyed by URL hash; metadata table (url, last_crawled, etag, content_hash, status).","robots cache: host -> rules with TTL. DNS cache."],
  flow:"Seeds -> URL Frontier (priority + politeness queues)\n   -> Fetcher workers (DNS cache, robots.txt check)\n   -> Content store (object storage) + metadata DB\n   -> Parser/extractor -> content dedupe -> link extractor\n   -> URL normaliser + filter + seen-URL check -> back into Frontier",
  write:["Seed URLs enter the frontier.","A scheduler picks a URL whose host is allowed to be fetched now (politeness) and hands it to a fetcher.","Fetcher resolves DNS (cached), checks robots.txt, downloads with timeouts and size limits.","The content is hashed; if already seen, drop it. Otherwise store it and emit it for indexing.","The parser extracts links, normalises them (lowercase host, strip fragments, resolve relative paths), filters bad ones, checks the seen set, and enqueues new URLs."],
  read:["The crawler has no end-user read path. Downstream systems (indexer) read pages from the content store or a stream.","Operators read crawl stats and per-host state from dashboards."],
  deep:[
    {t:"The URL frontier",p:"It must prioritise important or stale pages and also stay polite per host.",opts:["A single FIFO queue (BFS): simple, but ignores priority and hammers one host when many links point to it.","Priority queues: pages ranked by importance (PageRank-like score) or staleness.","Per-host queues, each released at the host's allowed rate (crawl-delay), mapped so each worker owns certain hosts."],pick:"Two layers: front priority queues choose what, back per-host queues enforce when. Map hosts to workers consistently so politeness needs no distributed locks."},
    {t:"Duplicate detection",p:"Many URLs lead to the same content and many pages link to the same URLs.",opts:["URL normalisation before the seen check.","Bloom filter for seen URLs: tiny and fast, with false positives (a few pages are skipped).","Exact hash set in a sharded store: precise, bigger.","Content hashing (checksums, SimHash for near-duplicates) to catch mirrors."],pick:"Normalise, Bloom filter backed by a sharded store for exactness where it matters, and content hash for duplicate content. Admit the false-positive trade-off."},
    {t:"Politeness and robots.txt",p:"Fetching too fast can take sites down and get you banned.",opts:["Fetch and cache robots.txt per host; honour disallow rules and crawl-delay.","One connection at a time per host, with a delay between requests.","Back off on 429/5xx responses."],pick:"Per-host rate limit enforced by the back queue, robots cache with TTL, and adaptive backoff."},
    {t:"Spider traps and bad content",p:"Infinite calendars, session-ID URLs and huge pages can trap a crawler.",opts:["Max URL length and depth limits.","Per-host page budget.","Detect repeating path patterns and strip session parameters.","Response size and time limits."],pick:"Combine a depth limit, per-host budget and size/time caps, and log skipped traps for review."},
    {t:"Freshness / re-crawl",p:"The web changes at different speeds.",opts:["Fixed interval for all pages: wasteful.","Adaptive: re-crawl frequently changing pages more often, using last-modified, ETag and the observed change rate.","Use conditional GET to save bandwidth."],pick:"Adaptive schedule per URL with conditional requests; give news sites minutes and static pages weeks."},
    {t:"Distribution",p:"One machine cannot do this.",opts:["Partition URLs by hash of host across crawler nodes.","Each node has its own frontier slice; discovered URLs are routed to the owning node.","Use a message queue between stages for backpressure."],pick:"Partition by host so politeness and robots caches stay local, with queues between fetch, parse and store stages."}
  ],
  trade:["BFS simplicity vs priority-based crawling.","Bloom filter memory savings vs false positives.","Crawl rate vs politeness.","Freshness vs bandwidth and cost.","Rendering JavaScript gives more content but is 10-100x more expensive."],
  fail:["Fetcher crash: work is leased from the frontier and returns to the queue after a timeout.","DNS slowness: cache and run a local resolver.","Spider traps: budgets and limits.","Host blocks you: back off and identify yourself with a User-Agent and contact info.","Frontier too large for memory: keep the bulk on disk with in-memory buffers.","Duplicate storms from mirrors: content hash dedupe."],
  follow:[
    "How do you make it distributed? -> Partition by host hash; route extracted URLs to the owning node.",
    "How do you prioritise? -> Score by link popularity, domain quality and staleness; keep a priority front queue.",
    "How do you crawl JavaScript sites? -> A headless-browser pool for a small selected set; far more expensive.",
    "How do you know you are done? -> You are not; the crawl is continuous, and the re-crawl policy drives the schedule."
  ],
  traps:["A single global queue with no politeness.","Ignoring robots.txt.","No URL normalisation or seen check.","No answer for spider traps.","Storing page bodies in a relational database."]
},

"ticketing":{
  say:"Treat seat selection as a contended write: hold a seat temporarily with an atomic compare-and-set (a reservation with a TTL), confirm it only after payment succeeds, and put a virtual waiting room in front of the hot event.",
  clarify:[
    "Reserved seating or general admission? (reserved seats mean per-seat contention; GA is a counter)",
    "How long can a user hold a seat before paying? (typically 5-10 minutes)",
    "Scale: peak concurrent users for a hot on-sale? (a million people for 50,000 seats is the real problem)",
    "Must we guarantee no double-booking? (yes, absolutely; this is the core correctness requirement)",
    "Payments: integrate an external provider? Refunds and cancellations?"
  ],
  fr:["Browse events and view seat availability","Select seats and place a temporary hold","Pay to confirm the booking; the hold expires if unpaid","Never sell the same seat twice","Out of scope: resale marketplace, detailed pricing rules"],
  nfr:["Strong consistency on seat reservation (no double-booking)","Handle huge read spikes on popular events (availability views)","Highly available for browsing; booking may degrade gracefully (queue users)","Fair: first come, first served; defend against bots","Low latency for the seat map, a few hundred ms"],
  est:[
    "Assume a hot event: 50,000 seats, 1M users hit at on-sale time. Within the first minute, 1M seat-map reads and perhaps 100k hold attempts.",
    "Reads: 1M users refreshing every 5 s = 200k reads/s on one event. That must be served from cache/CDN, not the database.",
    "Writes: successful bookings are bounded by seats (50,000), but attempts are far more. Contention is on a small set of rows.",
    "Overall platform: 10M tickets/year is only a few per second on average; the design problem is the spike, not the average.",
    "Storage is tiny: 10M bookings x 1 KB = 10 GB/year."
  ],
  api:["GET /v1/events/{id}/seats -> seat map with status (available/held/sold), cached for a second or two","POST /v1/holds {event_id, seat_ids[]} -> 201 {hold_id, expires_at} or 409 if any seat is taken","POST /v1/bookings {hold_id, payment_token, idempotency_key} -> 201 {booking_id}","DELETE /v1/holds/{hold_id}","All writes carry idempotency keys so retries do not double-charge"],
  data:["events(event_id, venue, start_time)","seats(event_id, seat_id, status: AVAILABLE/HELD/SOLD, hold_id?, hold_expires_at?, version). Partition by event_id.","holds(hold_id, user_id, seat_ids, expires_at) or the hold fields live on the seat row.","bookings(booking_id, user_id, event_id, seat_ids, payment_id, status, idempotency_key)","SQL fits: transactions and row-level locking are exactly what we need. Per-event partitioning keeps the contention local."],
  flow:"Users -> CDN -> [Virtual waiting room / queue for hot events] -> Load balancer\n   -> Booking service -> Seat DB (SQL, strong consistency, sharded by event)\n   -> Seat-map cache (Redis, short TTL)  <- invalidated/updated on change\n   -> Payment service -> external PSP\n   Hold-expiry worker releases expired holds | Notification service emails tickets",
  write:["User picks seats and sends a hold request.","The booking service runs one atomic operation: UPDATE seats SET status='HELD', hold_id=?, hold_expires_at=now()+10min WHERE event_id=? AND seat_id IN (...) AND (status='AVAILABLE' OR hold_expires_at < now()); and checks that all requested seats were updated, otherwise rolls back.","On success, return the hold and a countdown. On conflict, return 409 so the user picks others.","User pays; the payment service charges with an idempotency key.","On payment success, in one transaction mark the seats SOLD and create the booking. On failure or timeout, the hold expires and the seats become available again.","Email the ticket asynchronously."],
  read:["The seat-map request is served from a short-TTL Redis cache (or even a CDN-cached snapshot for a second).","The cache is updated or invalidated on each hold, release or sale.","The seat map is allowed to be slightly stale; the real check happens at hold time in the database."],
  deep:[
    {t:"Preventing double booking",p:"Many users click the same seat at the same instant.",opts:["Pessimistic lock: SELECT ... FOR UPDATE on the seat rows; correct, but holds locks while the user thinks, so only lock during the short hold write.","Optimistic: update with a version check (compare-and-set) and retry on conflict; works well when conflicts are not on the same row for long.","Distributed lock in Redis: possible, but the database is the source of truth, so keep the check there.","Unique constraint on (event_id, seat_id) in a bookings table: the database itself rejects the second booking."],pick:"A conditional UPDATE (compare-and-set) inside a short transaction, backed by a unique constraint as a safety net. Strong consistency is non-negotiable for this write; accept lower throughput on it."},
    {t:"Holds and expiry",p:"A user may abandon the checkout while seats stay locked.",opts:["Hold with an expiry timestamp on the seat row; treat expired holds as available at read/write time.","A sweeper job that releases expired holds and notifies the cache.","Redis key with TTL for the hold, with the database as the final authority."],pick:"Timestamp-based holds checked in the same conditional update, plus a sweeper for cleanup. This avoids needing a precise timer."},
    {t:"The on-sale stampede",p:"A million users arrive at once for 50k seats.",opts:["Virtual waiting room: admit users in batches from a queue (a randomised or first-come order).","Rate limit per user/IP and require login.","Serve the seat map from cache/CDN.","Auto-scale stateless layers; the database is protected by the queue."],pick:"A waiting room that meters traffic to what the booking database can handle, plus caching of read paths. Mention fairness (randomised draw) and bot defence (CAPTCHA, verified fans)."},
    {t:"Payment consistency",p:"Charging and booking are two systems that can disagree.",opts:["Charge first, then book: risk of charging for a seat that was lost.","Hold first, then charge, then confirm: the hold guarantees the seat during payment.","Idempotency keys and a reconciliation job to resolve stuck states (charged but not confirmed)."],pick:"Hold -> pay -> confirm, with idempotency keys and a saga-style compensation (refund) if confirmation fails."},
    {t:"Scaling the database",p:"Seat updates need a single authoritative home.",opts:["Shard by event_id: one event's contention is isolated to one shard.","A single hot event on one shard is still the limit; mitigate with the waiting room and by splitting sections into separate partitions.","Read replicas for the seat map, accepting slight staleness."],pick:"Shard by event, partition very large events by section, and use replicas/caches for reads."}
  ],
  trade:["Strong consistency on seats costs throughput, which is accepted for the correctness gain.","Short TTL cache: users may see a seat as free and then get a 409; acceptable and cheaper than perfect freshness.","Hold duration: longer is friendlier but reduces availability.","A waiting room hurts the experience but protects the system and gives fairness."],
  fail:["Payment succeeds but confirm fails: reconciliation job and idempotent retries, refund if needed.","Hold expires during payment: confirm checks the hold is still valid; if not, refund or re-hold atomically.","Database shard down: replicas and failover; the waiting room can pause admissions.","Bots grab seats: rate limits, CAPTCHA, purchase limits per account.","Cache shows stale availability: tolerated, with the database as the authority."],
  follow:[
    "How do you handle general admission? -> A counter with an atomic decrement (UPDATE ... SET remaining = remaining - n WHERE remaining >= n).",
    "How do you stop scalpers? -> Verified accounts, per-person limits, device checks, and the waiting-room draw.",
    "What if two users hold overlapping seat sets? -> The conditional update fails for the second; order seat IDs consistently to avoid deadlocks.",
    "How would you do dynamic pricing? -> A pricing service reads demand signals; the price is fixed into the hold so it does not change mid-checkout."
  ],
  traps:["Using only a cache or Redis as the source of truth for seat state.","Checking availability then updating in separate steps (race condition).","No hold expiry, so abandoned carts block seats forever.","Ignoring the on-sale spike and designing for the average.","Charging before the seat is guaranteed."]
},

"proximity":{
  say:"Index places by a geospatial cell (geohash or quadtree), query the user's cell plus its neighbours, then filter and sort by exact distance; the data is read-heavy and changes slowly, so cache and replicate it.",
  clarify:[
    "Search radius options and result limits? (5 km default, up to 20 results)",
    "Do businesses move, or are locations mostly static? (static means a read-heavy, rarely rebuilt index)",
    "Extra filters: category, rating, open now? (filters happen after the spatial lookup)",
    "Scale: number of businesses and searches per second?",
    "Do users need reviews, photos, and ranking? (keep the focus on nearby search)"
  ],
  fr:["Given a location and radius, return nearby businesses","Filter by category and sort by distance or rating","Business owners add, update and remove businesses","View a business's details","Out of scope: reviews content, maps rendering, routing"],
  nfr:["Search latency under 200 ms","Highly available; read-heavy by 100:1 or more","Eventual consistency is fine for updates (a new business can take minutes to appear)","Scales with data size and traffic, and handles dense cities","Accurate distances"],
  est:[
    "Assume 200M businesses. Each location record about 200 B -> 40 GB of location data. It fits in memory on one large node, but we shard/replicate for throughput and availability.",
    "Searches: 100M DAU x 5 searches = 500M/day = 5,800/s average, about 15k/s peak.",
    "Index size: a geohash index maps cell -> business IDs: 200M x (8 B ID + ~12 B overhead) = about 4 GB. Tiny.",
    "Updates are rare: 1M changes/day = 12/s, so writes are not a concern."
  ],
  api:["GET /v1/search/nearby?lat=&lng=&radius=&category=&limit=&cursor= -> {businesses:[{id, name, lat, lng, distance, rating}]}","GET /v1/businesses/{id}","POST/PUT/DELETE /v1/businesses (owner)"],
  data:["businesses(business_id PK, name, lat, lng, category, rating, ...) in a relational or document database; the source of truth.","geo_index(geohash_prefix -> [business_id, lat, lng]) in memory (Redis, or a database with spatial index, or an in-memory quadtree on the search service).","Index built from the business table; updated asynchronously through a change stream.","Business details cached by ID."],
  flow:"Client -> Load balancer -> Location search service\n        -> Geo index (geohash cells / quadtree; in memory, replicated)\n        -> Business service/cache -> Business DB (source of truth; replicas)\nUpdates: Business DB -> change stream (CDC) -> index updater (async)",
  write:["Owner adds or edits a business through the business service, which writes to the database.","A change event is emitted (CDC or queue).","The index updater computes the geohash for the new coordinates, and adds, moves or removes the entry in the geo index.","The business cache entry is invalidated.","Changes appear in search within seconds to minutes."],
  read:["Client sends lat/lng and radius.","The service picks a geohash precision matching the radius (for example 5 km is about 5 characters), computes the user's cell and its 8 neighbours (the edge case: nearby points can be in an adjacent cell with a different prefix).","It fetches the candidates in those cells from the index.","It computes the exact distance to each candidate, filters out those beyond the radius, applies category filters, sorts, and takes the top results.","It hydrates business details from cache and returns the page."],
  deep:[
    {t:"Choosing the geo index",p:"Searching all 200M points by distance is a full scan.",opts:[
      "Plain lat/lng columns with B-tree indexes: range queries on two dimensions are inefficient.",
      "Geohash: encodes a location into a string where a shared prefix means proximity; easy to store in any key-value store or database index. Weakness: cell boundaries.",
      "Quadtree: recursively split regions that hold too many points; adapts to density (dense cities get small cells). Needs to be built and kept in memory.",
      "Google S2 / H3: cells on a sphere with better uniformity; used in production systems.",
      "Specialised: PostGIS, Elasticsearch geo queries, Redis GEO."
    ],pick:"Geohash (simple, works in any store) or a quadtree if density varies wildly. Explain both and why you pick one; mention S2/H3 as the production-grade alternative."},
    {t:"Boundary problems",p:"Two points can be metres apart but have different geohash prefixes.",opts:["Always query the target cell plus its 8 neighbours.","Choose cell size at least as large as the search radius.","Filter by exact distance (haversine) afterwards."],pick:"Query the 3x3 block of cells then filter by true distance."},
    {t:"Dense vs sparse areas",p:"A cell in Manhattan has thousands of businesses; one in a desert has none.",opts:["Adaptive precision: start at the precision for the radius; if too few results, go up a level (wider); if too many, go down.","Quadtree adaptivity: split cells until each holds at most N points.","Rank and truncate inside dense cells."],pick:"Quadtree or variable geohash precision, chosen from the radius and result count."},
    {t:"Scaling the search",p:"15k searches per second and availability needs.",opts:["Replicate the whole index on many search nodes (it is small).","Shard by region (geohash prefix) if it grows, with replicas.","Cache results for popular cells and radii."],pick:"Replicate the in-memory index everywhere; add sharding by geohash prefix only if the dataset grows past a node. Cache hot area queries for a short TTL."},
    {t:"Keeping the index fresh",p:"Businesses open, close and move.",opts:["Rebuild the entire index nightly: simple, but stale.","Incremental updates from a change stream: fresh, a bit more machinery.","Dual approach: nightly full rebuild for correctness plus incremental updates."],pick:"Incremental updates through a change stream with a periodic full rebuild as a safety net. Accept eventual consistency."}
  ],
  trade:["Geohash simplicity vs quadtree adaptivity.","In-memory index speed vs rebuild and memory cost.","Cell size: bigger cells mean more candidates to filter, smaller cells mean more cells to query.","Freshness vs the simplicity of batch updates."],
  fail:["Index node lost: replicas serve; rebuild from the source database.","Hot city cells: more replicas and caching.","Stale index shows a closed business: show 'last verified' and fix via updates.","Poles and the antimeridian break geohash neighbours: handle wrap-around.","Database outage: search still works from the index; details come from cache."],
  follow:[
    "How is this different from Uber's drivers? -> Drivers move constantly, so it is write-heavy and needs a different structure (see the ride-sharing problem).",
    "How do you rank results? -> Distance, rating, popularity and relevance; compute a score on candidates.",
    "What if the radius is huge? -> Use coarser cells, a result cap, and rank before hydration.",
    "How do you support 'open now'? -> Store hours and filter on candidates, or precompute per time bucket."
  ],
  traps:["Scanning every business computing distance.","Searching only the user's cell and missing neighbours.","Forgetting the exact-distance filter after the cell lookup.","Treating moving objects and static places the same.","Proposing heavyweight infrastructure for a small, rarely changing dataset."]
},

"job-scheduler":{
  say:"Persist jobs and their next run time in a database; a set of scheduler nodes pick due jobs using leases (so only one runs each), push them to a queue, and stateless workers execute them with retries and idempotency.",
  clarify:[
    "One-off delayed jobs, recurring (cron) jobs, or both? (recurring jobs generate their next run after each execution)",
    "Job types and duration: short tasks or hours-long batch? Do they need dependencies (DAGs)?",
    "Delivery guarantee: at-least-once with idempotent jobs is the realistic default",
    "Scale: jobs per day and peak jobs due in the same second? (the 9:00 AM thundering herd)",
    "Timing accuracy: within a second, or a minute is fine? Retries, priorities, and multi-tenancy?"
  ],
  fr:["Submit a job with a schedule (once at a time, or cron) and a payload","Execute jobs on time on a pool of workers","Retry failed jobs with backoff; support cancel and pause","See job status and execution history","Out of scope: complex workflow DAGs (mention as an extension)"],
  nfr:["Jobs run at the right time (within seconds)","At-least-once execution; no job silently lost","No job run twice concurrently by design (best effort), so jobs should be idempotent","Highly available scheduler with no single point of failure","Horizontally scalable to millions of jobs"],
  est:[
    "Assume 100M scheduled jobs registered, with 1B executions per day = 11,500/s average. Peaks at round times (the top of the hour) could be 10x: 100k+/s.",
    "Job metadata: 100M x 1 KB = 100 GB. Execution history: 1B x 200 B = 200 GB/day, so keep it short-lived or archive.",
    "The scheduler's hot set is only jobs due soon. Index by next_run_time, and a poll every second reading the next few seconds of jobs touches a small slice.",
    "Workers: if the average job takes 1 s and we need 11,500/s, we need roughly 12k concurrent execution slots (e.g., 400 workers x 30 slots)."
  ],
  api:["POST /v1/jobs {name, schedule: {type: once|cron, at|expr}, payload, retry_policy, timeout, priority, idempotency_key} -> 201 {job_id}","GET /v1/jobs/{id}, GET /v1/jobs/{id}/runs","PUT /v1/jobs/{id} (pause/resume/update), DELETE /v1/jobs/{id}","Worker side: lease(job_run) -> payload; heartbeat(run_id); complete(run_id, result) or fail(run_id, error)"],
  data:["jobs(job_id, owner, schedule, payload, retry_policy, status, next_run_time). Index on (status, next_run_time) to find due jobs.","job_runs(run_id, job_id, scheduled_time, started_at, finished_at, status, attempt, worker_id) append-only history.","Leases: a column (lease_owner, lease_expires_at) on the run row, or a locking primitive in ZooKeeper/etcd.","Partition jobs across scheduler nodes by hash(job_id) or by time bucket so nodes do not scan the same rows."],
  flow:"Clients -> Job API -> Jobs DB (partitioned, index on next_run_time)\nScheduler nodes (partitioned): poll due jobs -> claim with lease -> enqueue run\n   -> Queue (by priority) -> Worker pool (stateless) -> execute\nWorkers: heartbeat, report result -> Jobs DB / runs; failures -> retry with backoff -> DLQ\nMonitor: reclaims jobs whose lease expired (worker died)",
  write:["A client creates a job; the API stores it with next_run_time computed from the schedule.","A scheduler node (owning that partition) polls every second for jobs where next_run_time <= now and status is active.","It claims each one atomically (UPDATE ... SET lease_owner=me, lease_expires_at=... WHERE lease is free), creates a run record, and publishes the run to a queue.","For recurring jobs, it computes and stores the next next_run_time immediately.","A worker takes the run, executes with a timeout, sends heartbeats, and reports the result.","On failure, the run is rescheduled with exponential backoff up to max attempts, then sent to a dead-letter queue."],
  read:["Status queries read the jobs and runs tables (replicas).","The dashboard shows queue depth, lag (now - scheduled_time), failures and per-tenant usage.","Users filter runs by job and time."],
  deep:[
    {t:"Finding due jobs efficiently",p:"Scanning 100M jobs every second is impossible.",opts:["Index by next_run_time and range-scan the next few seconds.","Time-bucketed storage: bucket by minute; load the current and next bucket into memory.","Hierarchical timing wheel in memory for imminent jobs.","Delayed message queue (for simple delays)."],pick:"A next_run_time index with a rolling window loaded into memory by each scheduler partition. State the cost: the DB must handle many range scans, so partition it."},
    {t:"Avoiding double execution",p:"Several scheduler nodes might pick the same job, or a worker may be slow and be assumed dead.",opts:["Atomic claim with a compare-and-set lease: only one node wins.","Partition ownership: each node owns a hash range, so there is no overlap (needs failover on node loss, using leader election).","Distributed lock (ZooKeeper/etcd) per job: correct but heavier.","Idempotent job design as the final defence."],pick:"Partition ownership plus an atomic lease on each run, with idempotent jobs. Be clear that exactly-once is not achievable; you get at-least-once plus idempotency."},
    {t:"Worker failure and long jobs",p:"A worker can die mid-job.",opts:["Heartbeat extends the lease; if it stops, the lease expires and the run is requeued.","Visibility timeout on the queue (like SQS).","Checkpoint progress for long jobs so a retry can resume."],pick:"Lease with heartbeats; on expiry, retry on another worker. Require idempotency or checkpoints for long jobs."},
    {t:"Retries, priorities and fairness",p:"One tenant's flood should not starve others; transient failures should retry.",opts:["Exponential backoff with jitter and a max attempt limit, then a dead-letter queue.","Separate queues per priority (and optionally per tenant) with weighted consumption.","Per-tenant concurrency limits."],pick:"Priority queues with per-tenant quotas, and backoff retries ending in a DLQ."},
    {t:"Thundering herd at round times",p:"Millions of jobs are set to run at 00:00.",opts:["Spread with jitter at registration when exact timing is not required.","Pre-stage the due jobs a few seconds early into the queue.","Autoscale workers on queue depth."],pick:"Pre-fetch upcoming jobs, allow small jitter where acceptable, and autoscale on lag."},
    {t:"Scheduler high availability",p:"The scheduler must not be a single point of failure.",opts:["Leader election (ZooKeeper/etcd/Raft) with a standby.","Multiple active schedulers, each owning a partition, with rebalancing when a node dies."],pick:"Active partitions with lease-based ownership; if a node dies its leases expire and another takes over."}
  ],
  trade:["At-least-once with idempotency vs the impossibility of cheap exactly-once.","Polling frequency vs database load and timing precision.","Strict timing vs batching efficiency.","Central DB simplicity vs sharding for scale."],
  fail:["Scheduler node dies: leases expire and another node takes its partition.","Worker dies: heartbeat stops, the run is requeued.","DB overload from polling: partition and index; keep imminent jobs in memory.","Clock skew between nodes: use DB time or a single time source for due comparisons.","Poison job that always fails: retry limit and DLQ with alerts.","Long jobs outlive their lease: heartbeat extension and fencing tokens so a zombie worker cannot write results."],
  follow:[
    "How would you add job dependencies? -> Store a DAG; a job becomes ready when its parents succeed (a workflow engine like Airflow).",
    "How do you stop a job running twice? -> You cannot guarantee it; design jobs to be idempotent and use leases to make duplicates rare.",
    "How do you handle timezones and DST in cron? -> Store the timezone with the schedule and compute next runs with a library; define behavior for skipped or repeated hours.",
    "How does this differ from a message queue? -> A scheduler decides WHEN; the queue just moves work. The scheduler feeds a queue."
  ],
  traps:["A single cron box that is a single point of failure.","Scanning the whole jobs table each tick.","Claiming exactly-once execution.","No plan for workers that die mid-job.","Ignoring the load spike at round times."]
},

"feature-flags":{
  say:"A control plane stores flags and rules and publishes changes; SDKs in every service download the rules, cache them in memory and evaluate locally, so a flag check is a function call with no network hop, and a streaming connection pushes updates within seconds.",
  clarify:[
    "Who evaluates flags: backend services, web and mobile clients, or all three? (client-side SDKs cannot be trusted with the full rule set)",
    "Simple on/off, or also multivariate values and targeting by user attributes? Percentage rollouts and experiments?",
    "How fast must a change take effect: seconds or minutes? (this picks push vs poll)",
    "Scale: number of flags, number of SDK instances, evaluations per second? Multiple environments and teams?",
    "Do we need audit, approvals, and kill switches for incidents?"
  ],
  fr:["Create, edit and delete flags per environment (dev, staging, prod)","Targeting rules: by user id, attributes (country, plan), and segments","Percentage rollout that is sticky per user","Evaluate a flag from any service or client with a default value","Audit log and rollback of every change","Out of scope: full experimentation statistics (mention as an extension)"],
  nfr:["Evaluation adds microseconds and no network call on the hot path","Flags keep working when the control plane is down (serve last known rules)","Changes propagate to SDKs within a few seconds","Highly available read path; the write path can be less available","Consistent results: the same user gets the same variant everywhere"],
  est:[
    "Assume 10k flags and 50k SDK instances (servers plus clients). One flag-set payload is about 500 KB for all rules, so 50k x 500 KB = 25 GB if all fetched at once. That is why we use a CDN, caching and delta updates.",
    "Evaluations: 100k requests/s x 20 flag checks each = 2M evals/s. Done centrally that would be a huge, fragile dependency. Locally it is free CPU.",
    "Writes are tiny: maybe 100 flag changes a day. This is a read-heavy, write-rare system, so optimise distribution, not writes.",
    "Evaluation events (for usage stats) are the real volume: sample or aggregate in the SDK and flush every 30 s."
  ],
  api:["Admin: POST /v1/projects/{p}/flags {key, type, variations, rules, default}, PUT /v1/flags/{key} (with version for optimistic concurrency), GET /v1/flags/{key}/audit","SDK bootstrap: GET /sdk/{env}/flags -> full ruleset + version (ETag, served from CDN/edge)","SDK stream: GET /sdk/{env}/stream (SSE) -> events {flag_updated, version}","SDK API: variation(flagKey, user, default) -> value (local call, never throws)","Events: POST /sdk/events (batched, aggregated counts)"],
  data:["flags(project, env, key, version, enabled, variations, rules, fallthrough, updated_by, updated_at): the source of truth in a relational DB; rules stored as JSON.","segments(id, rules or member list) so many flags can share one audience.","audit_log(id, flag, env, before, after, actor, ts) append-only.","Compiled ruleset per environment (all flags in one versioned blob) in object storage/CDN and a cache; this is what SDKs read.","Evaluation counters in a time-series or analytics store, aggregated by (flag, variation, hour)."],
  flow:"Admin UI/API -> Flag service -> Flags DB (+ audit log)\n   -> Publisher: compile env ruleset (versioned) -> Object store/CDN\n   -> Pub/sub (changed env, version)\nSDKs in services/apps: boot from CDN -> keep in-memory rules -> evaluate locally\n   <- Streaming gateways (SSE) push 'version N' -> SDK refetches delta\nClient-side SDKs -> Edge evaluation service (rules never leave the server)\nSDKs -> batched events -> Ingest -> analytics store",
  write:["An engineer edits a flag in the UI; the API validates the rules and writes the new version with an optimistic-concurrency check.","The change and the previous value are appended to the audit log in the same transaction.","A publisher recompiles the environment's ruleset, uploads it to object storage behind the CDN, and bumps the environment version.","It publishes a 'env X is now version N' message to pub/sub.","Streaming gateways forward it over SSE to connected SDKs; SDKs fetch the new ruleset (or a diff) and swap it in atomically.","SDKs that missed the push catch up on their next poll (every 30-60 s) by comparing versions."],
  read:["A service calls variation('new-checkout', user, false).","The SDK finds the flag in its in-memory ruleset, checks if it is enabled, and walks the rules in order (individual targets, segments, attribute matches).","If a percentage rule matches, it computes hash(flag_key + salt + user_id) mod 10000 and compares to the rollout buckets.","It returns the variation (or the default if the flag is missing or the SDK has no rules yet) and records an aggregated counter.","No network call happens on this path."],
  deep:[
    {t:"Where to evaluate: server vs SDK",p:"Calling a central service for each check adds latency and makes every request depend on it.",opts:["Central evaluation API: simple, rules stay private, but a network hop per check and a hard dependency.","Local evaluation in server-side SDKs: the SDK downloads rules and evaluates in memory.","Edge/evaluation proxy for browsers and mobile: they send user context, the server returns only the resulting values."],pick:"Local evaluation for backends. For untrusted clients, evaluate on the server or edge and return only the values, so targeting rules and other customers' data never leak."},
    {t:"Propagating changes quickly",p:"A flag used as a kill switch has to take effect in seconds on 50k instances.",opts:["Polling: simple and robust, but latency equals the interval and the load grows with the fleet.","Streaming (SSE/WebSocket): near-instant, but needs many long-lived connections and gateways.","Push a tiny version number over a stream and let SDKs fetch the ruleset from the CDN.","Polling as a fallback in every SDK."],pick:"Stream a version notification and fetch the data from a CDN, with polling as a backstop. The stream layer only carries small messages, and the CDN absorbs the payload fan-out."},
    {t:"Sticky percentage rollouts",p:"A user must not flip between on and off as the rollout goes from 5% to 50%.",opts:["Random per request: not sticky, a terrible experience.","Store each user's assignment in a database: sticky but needs a lookup and storage.","Deterministic hash of (flag salt + user id) into 10,000 buckets; the rollout percentage selects buckets."],pick:"Deterministic hashing. Growing the percentage only adds buckets, so users already on stay on. A per-flag salt keeps different flags uncorrelated. Same hash in every SDK language, with test vectors."},
    {t:"Resilience when the control plane fails",p:"The flag service must never take down the apps that use it.",opts:["Fail closed: no rules, treat everything as off or error. Dangerous.","SDK keeps the last known ruleset in memory and optionally on disk.","Code-supplied default for each flag as the last line of defence.","A relay proxy in each region or cluster that caches rules."],pick:"Last known good in memory plus a safe default in code. Startup blocks briefly for the initial fetch with a timeout, then continues with defaults. Evaluation never throws."},
    {t:"Rule model and ordering",p:"Targeting rules need to be expressive but fast and predictable.",opts:["Ordered rules: individual targets first, then segment rules, then percentage rollout, then the fallthrough value.","A general expression language: powerful, harder to validate and slower to run.","Prerequisite flags (flag B only if flag A is on): powerful but needs cycle detection."],pick:"Ordered, declarative rules with a small set of operators, validated on write (no cycles in prerequisites). First match wins."},
    {t:"Safety and governance",p:"A bad flag change is as dangerous as a bad deploy.",opts:["Per-environment permissions and an approval flow for production.","Audit log with diff and actor, plus one-click rollback to a prior version.","Flag lifecycle: owner, expiry date, and alerts on stale flags to avoid tech debt.","Gradual rollout tied to health metrics for automatic rollback."],pick:"Audit and rollback are mandatory; approvals for prod; stale-flag cleanup reminders. Automatic rollback on metrics is a strong extension."}
  ],
  trade:["Local evaluation (fast, resilient) vs central evaluation (private rules, instant consistency).","Streaming (fast propagation) vs polling (simplicity, fewer connections).","Eventual consistency across SDKs (seconds of skew) vs the cost of strong consistency, which this use case does not need.","Rich targeting vs ruleset size and evaluation cost.","Many long-lived flags vs the code complexity they add."],
  fail:["Control plane or DB down: SDKs keep serving the last known rules; admin edits are unavailable, evaluations are not.","Streaming gateway outage: SDKs fall back to polling, so propagation slows to the poll interval.","CDN serves a stale ruleset: version compare and ETag; SDKs only move forward in version.","Bad flag change: audit, instant rollback, and a kill switch.","SDK starts with no ruleset (cold start, network blocked): safe code defaults, a short startup timeout, and a metric for 'serving defaults'.","Clock or version races between two admins: optimistic concurrency on the flag version."],
  follow:[
    "How do you run A/B experiments? -> Log which variation each user saw (exposure events), join with outcome metrics, and compute significance offline.",
    "How do you keep percentage rollouts consistent across web, iOS and backend? -> One hashing algorithm and test vectors in every SDK, keyed by the same user id.",
    "How do you stop client-side flags leaking unreleased features? -> Evaluate server-side, send only the values the client needs, and keep unreleased flag keys out of client bundles.",
    "How do you handle thousands of flags per environment? -> Segment the ruleset by project, send diffs, and let SDKs subscribe only to the flags they use."
  ],
  traps:["Calling the flag service on every request.","Failing hard or blocking when the flag service is unreachable.","Random, non-sticky percentage rollouts.","Shipping the full rule set to browsers.","No audit log or rollback for a system that can break production.","Letting flags live forever with no owner or cleanup."]
},

});
