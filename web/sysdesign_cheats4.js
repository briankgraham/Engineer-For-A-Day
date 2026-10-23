// Cheat sheets, part 4: hard problems (file sync, video streaming, ride sharing, collaborative editor, message queue, payments, metrics).
// Format: see sysdesign_cheats.js.
window.SD_CHEATS=window.SD_CHEATS||{};
Object.assign(window.SD_CHEATS,{

"dropbox":{
  say:"Split files into content-addressed blocks, upload only the blocks the server does not already have, keep a metadata service as the source of truth for the file tree, and push change notifications to other devices so they sync deltas.",
  clarify:[
    "Maximum file size and total storage per user? (large files require chunking and resumable upload)",
    "Sync across devices in near real time? Offline edits and conflicts?",
    "Sharing with other users and permissions? Version history?",
    "Scale: users, files per user, daily changes?",
    "Is end-to-end encryption required? (it breaks server-side dedupe and search)"
  ],
  fr:["Upload, download and delete files","Automatically sync changes across a user's devices","Share files and folders with other users","Keep version history and allow restore","Out of scope: real-time co-editing, full-text search"],
  nfr:["Reliable: never lose or corrupt a file","Efficient: sync only what changed, minimise bandwidth","Eventually consistent across devices (seconds), with conflict handling","Scalable to hundreds of millions of users and exabytes of data","Resumable uploads on bad networks"],
  est:[
    "Assume 500M users, 100M DAU, 200 files per user at 1 MB average -> 100 PB of raw data. That requires object storage across many data centers.",
    "With block dedupe and compression, the stored volume may drop by 30-60%; say so as an optimisation, not a promise.",
    "Changes: each active user modifies 10 files/day -> 1B file changes/day = 11,500/s, about 30k/s peak, mostly small edits.",
    "Block size 4 MB: a 100 MB file = 25 blocks; changing a few bytes uploads one 4 MB block instead of 100 MB.",
    "Metadata: 500M x 200 files x 500 B = 50 TB. Sharded SQL by user_id."
  ],
  api:["POST /v1/files/init {path, size, block_hashes[]} -> {upload_id, missing_blocks[]} (the server says which blocks it lacks)","PUT /v1/blocks/{hash} (upload a missing block; resumable)","POST /v1/files/commit {upload_id, version, base_version} -> 201 or 409 on conflict","GET /v1/files/{id}?version= (returns block list; client downloads blocks from storage/CDN)","GET /v1/changes?cursor= (long poll or WebSocket for changes since cursor)","POST /v1/shares {path, user, permission}"],
  data:["Metadata DB (SQL, sharded by user/namespace): files(file_id, namespace_id, path, parent_id, is_folder, latest_version), file_versions(file_id, version, size, mtime, block_list[hashes]), shares(...).","Block store: object storage keyed by content hash (SHA-256). Same hash means the same block is stored once, across all users.","Block reference counts (or a periodic GC) to know when a block is unused.","Change log per namespace: monotonically increasing cursor of (file_id, version, op) so clients ask 'what changed since cursor X'."],
  flow:"Desktop client (watcher, chunker, local DB)\n   -> API/Metadata service -> Metadata DB (sharded) + change log\n   -> Block service -> Object storage (S3-like), content-addressed\n   -> Notification service (WebSocket/long-poll) -> other devices\n   Async: virus scan, thumbnails, dedupe/GC, cross-region replication",
  write:["The client watcher detects a changed file and splits it into blocks (for example 4 MB), hashing each.","It sends the list of hashes to the metadata service, which replies with the blocks it does not have.","The client uploads only missing blocks directly to the block store (parallel, resumable).","The client commits the new version with the base version it started from. The metadata service does a compare-and-set; on success it writes the new version and appends to the change log.","The notification service tells the user's other devices that there is a new change."],
  read:["The other device receives a notification (or polls) and asks for changes since its cursor.","It gets the new file version's block list, diffs against its local blocks, and downloads only the missing blocks (via CDN/storage).","It reassembles the file and updates its local metadata."],
  deep:[
    {t:"Chunking and deduplication",p:"Re-uploading a whole file for a small edit wastes bandwidth.",opts:["Whole-file upload: simple, wasteful.","Fixed-size blocks (4 MB): simple; an insertion at the start shifts every block.","Content-defined chunking (rolling hash): block boundaries follow the content, so an insertion changes only nearby blocks.","Content-addressed storage so identical blocks are stored once across users."],pick:"Fixed-size or content-defined chunks with SHA-256 hashes and a content-addressed store. Mention the privacy caveat of cross-user dedupe (it can reveal that someone has a file) and encrypt/segment if needed."},
    {t:"Sync protocol and notifications",p:"Devices must learn about changes quickly without constant polling.",opts:["Polling: simple, wasteful and slow.","Long polling or WebSocket: server pushes a lightweight 'something changed' signal.","Cursor-based changes API: a client resumes from its last cursor, so it never misses changes even after being offline."],pick:"Push a small notification, then pull the delta using the cursor. The log is the source of truth."},
    {t:"Conflicts",p:"Two devices edit the same file offline.",opts:["Last-writer-wins: loses data silently.","Reject the second commit (base version mismatch) and keep both: create a 'conflicted copy'.","Merge automatically: only possible for known formats."],pick:"Optimistic concurrency on version; on conflict, save the loser as a conflicted copy and let the user resolve. Never silently overwrite."},
    {t:"Metadata consistency",p:"The file tree must stay consistent (moves, renames, deletes).",opts:["Strongly consistent SQL per namespace/user with transactions.","Shard by namespace so one user's tree lives on one shard.","Cross-shard operations (sharing between users) use references and careful ordering."],pick:"SQL sharded by namespace, strongly consistent for metadata. Block storage is eventually consistent, but blocks are immutable, so that is safe."},
    {t:"Large files and reliability",p:"Uploads fail halfway on flaky networks.",opts:["Resumable multipart upload, tracked by upload_id.","Verify each block by hash on arrival.","Retry with backoff; upload blocks in parallel."],pick:"Block-level resumable uploads. Because blocks are content-addressed, a retry is naturally idempotent."},
    {t:"Storage tiers and cleanup",p:"Petabytes are expensive.",opts:["Hot blocks on fast storage, cold on cheaper tiers.","Garbage-collect blocks no longer referenced by any version.","Expire old versions after a retention period."],pick:"Tiering plus reference-counted GC with a grace period to avoid deleting a block that a concurrent upload just referenced."}
  ],
  trade:["Smaller blocks save bandwidth but add metadata and request overhead.","Cross-user dedupe saves storage but raises privacy concerns.","Strong metadata consistency costs scalability; blocks are eventually consistent safely.","Notifications are best-effort; the cursor-based pull guarantees correctness."],
  fail:["Upload interrupted: resume missing blocks only.","Commit race: compare-and-set on version, conflicted copy.","Missed notification: the client periodically pulls from its cursor.","Corrupted block: verify hash on read and repair from replicas.","Metadata shard failure: replicated with failover.","Premature GC of a block: reference counts with a grace window."],
  follow:[
    "How do you share a folder? -> A shared namespace with membership and permissions that multiple users mount into their trees.",
    "How do you support version history? -> Each commit is an immutable version row pointing to a block list; restore by committing an old block list as a new version.",
    "How would you add search? -> Index file names and extracted text asynchronously.",
    "How do you sync a huge folder initially? -> Batch metadata, parallel block downloads, and prioritise recently used files."
  ],
  traps:["Uploading whole files for every change.","Sending file bytes through the metadata service.","Silently overwriting on conflict.","Relying on push notifications alone, with no cursor to catch up.","Forgetting GC and storage cost."]
},

"youtube":{
  say:"Upload goes to object storage, a transcoding pipeline produces many bitrates and formats, and playback uses adaptive-bitrate streaming (HLS/DASH) from a CDN so viewers get small chunks from a nearby edge.",
  clarify:[
    "Upload and playback only, or live streaming too? (live has very different latency needs)",
    "Max video length and size? Supported devices and formats?",
    "Scale: DAU, videos uploaded per day, average length?",
    "Features: search, recommendations, comments, view counts? (focus on upload, transcode, stream)",
    "Global audience? (CDN strategy, regional storage)"
  ],
  fr:["Upload a video with title and metadata","Process it so it plays on any device and bandwidth","Stream a video with seeking, quality adapting to the network","View counts, likes, search (brief)","Out of scope: recommendations model, ads, monetisation"],
  nfr:["Smooth playback with fast start (under 2 s) and little buffering","Highly available; global reach","Durable: uploaded videos are never lost","Scales to millions of concurrent viewers","Cost-aware: storage and bandwidth dominate the bill"],
  est:[
    "Assume 1B DAU watching 5 videos/day = 5B views/day = 58k views/s average, about 150k peak.",
    "Bandwidth: average 3 Mbit/s stream x 100M concurrent viewers = 300 Tbit/s. Only a CDN can do this; the origin must see a small fraction (a high cache hit rate).",
    "Uploads: 500k videos/day x average 100 MB raw = 50 TB/day raw; transcoded into ~5-10 renditions adds roughly 2-3x -> about 150 TB/day, 55 PB/year.",
    "Transcoding compute: 500k videos x 5 minutes each x several formats; parallelise by splitting each video into chunks.",
    "Metadata: 500k/day x 1 KB = 0.5 GB/day. Trivial; the bytes live in object storage."
  ],
  api:["POST /v1/videos {title, description, ...} -> {video_id, upload_url} (pre-signed, resumable)","Client uploads directly to object storage in chunks, then POST /v1/videos/{id}/complete","GET /v1/videos/{id} -> metadata + manifest URL","GET manifest (.m3u8/.mpd) and segments from the CDN","POST /v1/videos/{id}/views (async counter), GET /v1/search?q="],
  data:["videos(video_id, uploader_id, title, status: UPLOADED/PROCESSING/READY/FAILED, manifest_url, duration, created_at) in a sharded SQL/NoSQL store.","Object storage: original upload, then renditions: video_id/{360p,720p,1080p,...}/segment-N.ts plus manifests.","View counts in a counter store (Redis/Kafka -> aggregation), eventually consistent.","Search index (Elasticsearch) over titles and tags, fed asynchronously."],
  flow:"Upload: Client -> pre-signed URL -> Object storage (raw)\n   -> Queue -> Transcoding pipeline (split -> encode in parallel -> merge/package)\n   -> Object storage (renditions + manifests) -> metadata status READY\nPlayback: Client -> API (metadata/manifest) -> CDN edge -> (miss) origin storage\n   Adaptive bitrate player switches renditions per segment",
  write:["The client asks for an upload URL and uploads the file in chunks straight to object storage (resumable).","On completion, a message goes to a processing queue.","A DAG of tasks runs: validate, split into GOP-aligned chunks, encode each chunk into multiple resolutions/codecs in parallel on workers, generate thumbnails, package as HLS/DASH segments and manifest.","Segments and manifests are written to object storage; the video status becomes READY.","Notify the uploader and index the metadata for search."],
  read:["The player fetches video metadata and the manifest, which lists the available renditions.","It requests the first segments from a nearby CDN edge; a miss pulls from the origin and caches.","The player measures throughput and picks a rendition for each next segment (adaptive bitrate).","Seeking requests the segment at the new timestamp.","View events are sent asynchronously to the counting pipeline."],
  deep:[
    {t:"Transcoding pipeline",p:"Encoding a long video on one machine is slow and fragile.",opts:["One worker per video: simple, slow for long videos.","Split into chunks, encode in parallel, merge: fast, retries only failed chunks.","A DAG orchestrator for stages (validate, encode, thumbnails, DRM, captions).","Priorities: new uploads and popular creators first."],pick:"Chunked parallel encoding driven by a queue and a DAG, with retries per chunk. Produce several resolutions/bitrates (240p to 4K) and codecs."},
    {t:"Adaptive bitrate streaming",p:"Viewers have varying bandwidth that changes during playback.",opts:["Single progressive file: stalls on slow networks.","HLS/DASH: video is cut into 2-10 s segments at multiple bitrates; the player picks per segment."],pick:"HLS/DASH with a manifest. It also makes CDN caching trivial since segments are static files."},
    {t:"CDN strategy",p:"Origin cannot serve 300 Tbit/s.",opts:["Cache segments at edge nodes close to viewers.","Popular videos are pushed to edges (pre-warmed); the long tail is pulled on demand.","Multi-tier caching (edge, regional, origin shield) to reduce origin load.","ISP-embedded caches for the biggest platforms."],pick:"CDN with pull-through caching and an origin shield; pre-position the hottest content. Note that most views are a small fraction of videos (power law)."},
    {t:"Storage cost",p:"Petabytes per year of mostly rarely watched videos.",opts:["Tiered storage: hot, warm, cold.","Do not pre-generate every rendition for every video: create high-resolution renditions only when views justify.","Delete originals after transcoding, or move them to cold storage.","Deduplicate identical uploads."],pick:"Tier by popularity and encode lazily for the tail. State the cost trade-off: compute vs storage."},
    {t:"Uploads and reliability",p:"Large files over unreliable networks.",opts:["Resumable chunked upload straight to object storage via pre-signed URL (never through app servers).","Verify checksums.","Process asynchronously and show 'processing' status."],pick:"Direct-to-storage resumable upload; the API only issues URLs and tracks state."},
    {t:"Metadata, views and search",p:"Counters get hammered by popular videos.",opts:["Write views to a stream and aggregate in batches rather than incrementing a row per view.","Shard metadata by video_id.","Index search asynchronously."],pick:"Event stream for views with periodic aggregation; display approximate counts. Avoid hot-row updates."}
  ],
  trade:["Number of renditions: better playback vs storage and compute cost.","Segment length: shorter gives faster adaptation but more requests and overhead.","Pre-encode everything vs lazy encode.","CDN cost vs origin load and latency.","Exact view counts vs scalable eventual counts."],
  fail:["Transcode worker fails: retry only that chunk.","CDN edge outage: DNS/anycast fails over to other edges.","Origin overload on a viral video: origin shield and request coalescing.","Corrupt upload: checksum verification, reject early.","Hot video metadata: cache aggressively.","Region outage: replicate storage across regions."],
  follow:[
    "How would you do live streaming? -> Ingest via RTMP, transcode in near real time, short segments (2 s) or low-latency HLS, accept a few seconds of delay.",
    "How do you let users resume where they left? -> Store last playback position per user/video.",
    "How do you protect content? -> Signed URLs and DRM for premium content.",
    "How do you choose thumbnails and detect bad content? -> Async ML pipelines after transcode."
  ],
  traps:["Streaming the original file over HTTP from app servers.","Uploading through the API servers.","Forgetting adaptive bitrate and multiple renditions.","Ignoring the CDN (the bandwidth numbers prove it is necessary).","Updating a view counter row on every view."]
},

"uber":{
  say:"Drivers stream their location into a geospatial index (updated in memory), the dispatch service finds nearby available drivers by cell, offers the ride to the best candidate with a timeout, and a trip state machine records the ride durably.",
  clarify:[
    "Core flow only (request, match, trip, pay) or also pooling and scheduling?",
    "Scale: riders, drivers online, location update frequency? (location updates dominate the write load)",
    "How is a match decided: nearest driver, ETA, or something richer?",
    "Cities worldwide, or one region at a time? Real-time tracking for riders?",
    "Payments and pricing (surge)? Treat as separate services and note them."
  ],
  fr:["Rider requests a ride from pickup to destination and sees an estimated fare","The system matches the rider with a nearby available driver","Driver accepts or declines; both see live location during the trip","Trip lifecycle: requested, matched, en route, in progress, completed, paid","Out of scope: detailed pricing model, ratings, driver onboarding"],
  nfr:["Match within a few seconds","Location data fresh within seconds","Highly available; a rider stranded is a disaster","Strong consistency for matching (a driver is never assigned to two rides at once)","Scales to millions of concurrent drivers and riders"],
  est:[
    "Assume 5M drivers online at peak, sending a location every 4 s -> 1.25M updates/s. This is the dominant write load.",
    "Each update about 100 B -> 125 MB/s of ingest. Need a stream (Kafka) and in-memory geo storage, not a disk-based SQL row update per ping.",
    "Ride requests: 20M rides/day = 230/s average, about 1,000/s peak. Small compared to location updates.",
    "Geo index in memory: 5M drivers x 50 B = 250 MB. Tiny; the issue is update rate, not size.",
    "Trip history: 20M/day x 2 KB = 40 GB/day; stored durably in a database."
  ],
  api:["POST /v1/rides {pickup, dropoff, ride_type} -> {ride_id, fare_estimate}","WebSocket/gRPC stream for drivers: location updates {driver_id, lat, lng, status} every few seconds","POST /v1/rides/{id}/accept (driver), /start, /complete","GET /v1/rides/{id} (status, driver location) — pushed to the rider via WebSocket","Idempotency keys on ride creation and payment"],
  data:["Driver location store: in-memory geo index (Redis GEO or custom geohash/S2 grid) keyed by cell -> set of driver IDs, with driver status (available/busy) and a last-update TTL so stale drivers fall out.","rides/trips(ride_id, rider_id, driver_id, status, pickup, dropoff, fare, timestamps) in a durable, strongly consistent store (SQL or sharded by region).","Driver state (available, offered, on_trip) with atomic transitions.","Location history stream for analytics and ETA models (Kafka -> data lake)."],
  flow:"Driver app --location stream--> Location service -> Geo index (in-memory, sharded by cell)\n                                               '-> Kafka -> analytics/ETA\nRider app -> API gateway -> Ride service -> Dispatch/Matching service\n   -> query geo index for nearby available drivers -> rank by ETA\n   -> offer to a driver (timeout) via push/WebSocket -> accept -> trip state machine\n   Trip DB (durable) | Maps/ETA service | Payment service | Notification (push)",
  write:["Drivers continuously send location updates; the location service updates the geo index (and TTL) and publishes to a stream.","A rider requests a ride; the ride service creates a ride record in REQUESTED state with an idempotency key.","The dispatch service queries drivers in the pickup cell and neighbours who are AVAILABLE.","It ranks candidates (by ETA from the maps service, rating, etc.), and picks the top one.","It atomically marks the driver OFFERED (compare-and-set) so no other ride can claim them, and pushes the offer.","If the driver accepts in time, mark MATCHED and notify the rider; if they decline or time out, release them and offer to the next candidate."],
  read:["The rider app subscribes to the ride's updates; the server pushes the driver's location every few seconds during the trip.","Nearby cars on the map: query the geo index for available drivers in the viewport (approximate, cached for a second).","Trip history comes from the trips database."],
  deep:[
    {t:"Handling a huge stream of location updates",p:"1M+ updates per second would overwhelm a database row update model.",opts:["Write each ping to SQL: far too slow.","In-memory geo store (Redis GEO or a custom grid) holding only the latest position; persist history asynchronously.","Reduce frequency adaptively (less often when stationary).","Shard by geographic cell/city so each shard handles one area."],pick:"In-memory grid sharded by region, TTL for stale drivers, async history to Kafka. Persisting only the latest position keeps writes cheap."},
    {t:"Geospatial index",p:"Find available drivers near a point, quickly, with frequent moves.",opts:["Geohash/S2/H3 cells: moving a driver is a delete from one cell set and an add to another.","Quadtree: adaptive, but rebalancing under constant movement is costly.","Query the rider's cell plus neighbours, then compute exact distance/ETA."],pick:"Fixed-size cells (S2/H3/geohash) with sets of drivers, because moving points make quadtree rebalancing expensive. Contrast with the Nearby Places problem (static data)."},
    {t:"Matching and consistency",p:"Two ride requests might pick the same driver simultaneously.",opts:["Optimistic: atomic compare-and-set on driver status (AVAILABLE -> OFFERED).","Pessimistic distributed lock per driver (heavier).","Single-threaded dispatcher per region/cell: no concurrency, but a throughput cap per partition."],pick:"Atomic status transition per driver, with a dispatcher partitioned by region. State that matching must be strongly consistent even if location data is approximate."},
    {t:"Offer timeouts and fallbacks",p:"Drivers ignore or miss offers.",opts:["Offer to one driver at a time with a 10-15 s timeout: fair, slower.","Offer to several at once: faster but wasteful and causes conflicts.","Batch matching globally for a time window to optimise overall ETA (as large platforms do)."],pick:"Sequential offers with timeout by default; mention batched global matching as an optimisation."},
    {t:"Real-time updates to riders",p:"Riders want to see the car move.",opts:["Polling: wasteful.","WebSocket or server-sent events per active trip.","Push notifications for state changes while the app is in the background."],pick:"WebSocket for the live map and push notifications for status changes."},
    {t:"Trip state machine and payment",p:"A ride must not get stuck or double charge.",opts:["Explicit states with allowed transitions, each persisted before side effects.","Idempotent payment calls and a reconciliation job.","Handle driver or rider cancellations and no-shows with timeouts."],pick:"Persisted state machine plus idempotent, asynchronous payment at completion."}
  ],
  trade:["Location freshness vs write load (update interval).","Matching quality (global batching) vs simplicity and latency.","In-memory geo index speed vs durability: losing it only loses a few seconds of positions.","One-at-a-time offers are slower but avoid conflicts."],
  fail:["Geo shard fails: replicas, and drivers re-send their position within seconds, so the index heals itself.","Driver app loses connection: TTL expires, driver is considered offline.","Dispatcher crash mid-offer: offers have timeouts and the ride is in a durable state, so it can be resumed.","Surge in a city (event ends): scale by region, queue requests.","Double assignment: prevented by the atomic status transition."],
  follow:[
    "How would you compute ETA? -> A maps service using road graph and live traffic, not straight-line distance.",
    "How do you implement surge pricing? -> Count demand and supply per cell over a window and apply a multiplier.",
    "How do you do ride pooling? -> Match riders with compatible routes; a harder optimisation problem.",
    "How do you shard by city? -> Route all traffic for a city/region to a shard; handle cross-boundary trips at the edges."
  ],
  traps:["Updating a SQL table on every location ping.","Using the Nearby Places design unchanged (it assumes static points).","No answer for two requests grabbing the same driver.","Polling for the rider's map.","Forgetting stale drivers (no TTL)."]
},

"google-docs":{
  say:"Clients send operations (not whole documents) to a server that orders them and transforms concurrent edits (Operational Transformation, or CRDTs), broadcasts the result to everyone, and persists an operation log plus periodic snapshots.",
  clarify:[
    "Plain text only, or rich text, tables and images? (rich text complicates the operation model)",
    "How many simultaneous editors per document? (tens is typical, not thousands)",
    "Offline editing required? (favours CRDTs)",
    "Version history and comments? Permissions and sharing?",
    "Scale: documents, active documents at once?"
  ],
  fr:["Create and open documents","Multiple users edit the same document at once and see each other's changes in real time","Show other users' cursors and presence","Version history with restore","Sharing and permissions"],
  nfr:["Edits appear for others in under 200-500 ms","Convergence: all clients end up with the identical document","No lost edits, even with concurrent changes","Durable and highly available","Works on flaky networks and reconnects gracefully"],
  est:[
    "Assume 100M DAU, 10M concurrent documents open, with about 3 editors each at the peak.",
    "Each active editor produces about 2 operations/s (typing) -> 30M ops/s across the system at the very extreme; realistically a fraction, since most open documents are idle. The server per document handles tens of ops/s, which is easy; the challenge is routing.",
    "Operation size about 50 B -> a heavily edited document accumulates 50 B x 100k ops = 5 MB of log; snapshot periodically.",
    "Storage: 1B documents x average 100 KB snapshot = 100 TB, plus logs and versions. Fine for sharded storage."
  ],
  api:["WebSocket /docs/{id}/edit: client sends {op, base_revision, client_id}; server sends {op, revision} and {ack}","REST: GET /v1/docs/{id} (latest snapshot + revision), POST /v1/docs, PUT /v1/docs/{id}/permissions","GET /v1/docs/{id}/revisions, POST /v1/docs/{id}/restore","Presence/cursor messages share the WebSocket"],
  data:["documents(doc_id, owner, title, latest_snapshot_ref, latest_revision) in SQL.","operation log: (doc_id, revision, client_id, op, timestamp) append-only, partitioned by doc_id. This is the authoritative history.","Snapshots: the full document at revision N (object storage), so loading does not replay millions of ops.","Permissions/ACL table, and an ephemeral presence/cursor store (Redis)."],
  flow:"Clients <-WebSocket-> Gateway -> Collaboration server (one owner per document)\n   Collaboration server: in-memory doc state + revision counter\n   -> OT/CRDT merge -> append to op log (durable) -> broadcast to other clients\n   -> Snapshot service (periodic) -> object storage\n   Routing: doc_id -> collaboration server (consistent hashing)",
  write:["A client types; it applies the change locally immediately (optimistic) and sends the operation with the revision it was based on.","The collaboration server for that document receives it. If the revision is behind, it transforms the operation against the operations the client has not seen (OT).","It assigns the next revision, appends the transformed operation to the log, and acks the sender.","It broadcasts the operation to the other connected clients, each of which applies it (transforming against its own pending local operations).","A background job snapshots the document periodically."],
  read:["Opening a document: load the latest snapshot and any operations after it, then connect via WebSocket at that revision.","Reconnect: the client sends its last known revision; the server replays the missing operations.","Version history: reconstruct a revision from the nearest snapshot plus ops."],
  deep:[
    {t:"Conflict resolution: OT vs CRDT",p:"Alice inserts at position 5 while Bob deletes at position 3; applying both naively diverges.",opts:[
      "Locking paragraphs: simple but kills the real-time experience.",
      "Last-writer-wins on the whole document: loses edits.",
      "Operational Transformation: a central server orders operations and transforms them against concurrent ones so every client converges. Proven (Google Docs) but intricate to implement correctly.",
      "CRDTs (for example sequence CRDTs): each character has a unique ID, and operations commute, so no central ordering is needed; works offline and peer to peer, with extra metadata per character."
    ],pick:"OT with a central server for a Google-Docs-like product, or a CRDT if offline and decentralised editing matter. Explain the choice and the cost: OT needs a server per doc; CRDTs carry metadata overhead."},
    {t:"Routing a document to one server",p:"The server that orders operations must be unique per document, or revisions fork.",opts:["Consistent hashing of doc_id to a collaboration server; clients connect through a gateway that routes.","Lease/lock per document in ZooKeeper/etcd for ownership, with failover.","Stateless servers with a database doing ordering: simpler but slower."],pick:"One owner per active document via consistent hashing and a lease; on failure another server loads the snapshot + log and takes over."},
    {t:"Persistence and recovery",p:"The in-memory state must survive server crashes.",opts:["Append every operation to a durable log before acking.","Periodic snapshots to bound recovery time.","Replicate the log (Kafka or a replicated database)."],pick:"Write-ahead log then snapshot; recovery is snapshot + replay of the tail."},
    {t:"Latency and network behaviour",p:"Typing must feel instant even on a slow connection.",opts:["Apply local operations immediately (optimistic UI) and reconcile when server operations arrive.","Batch keystrokes into small operations.","Compress and coalesce cursor updates, which are ephemeral and lossy."],pick:"Optimistic local apply; send ops over WebSocket; treat cursor positions as lossy and throttled."},
    {t:"Presence and cursors",p:"Showing collaborators is a high-frequency, low-value stream.",opts:["Ephemeral, in-memory, not logged.","Throttle updates to a few per second.","Expire on disconnect with a short TTL."],pick:"Keep presence off the durable path; broadcast through the collaboration server only."},
    {t:"Version history and large documents",p:"Users want to see and restore past versions without replaying everything.",opts:["Snapshots every N ops or minutes.","Named versions; store diffs between snapshots.","Compact old logs."],pick:"Periodic snapshots plus the log; restore by snapshot + replay to the target revision."}
  ],
  trade:["OT: central server, lower metadata; CRDT: decentralised and offline-friendly, more metadata.","Optimistic local apply gives instant feel at the cost of reconciliation complexity.","One server per document simplifies ordering but needs failover handling.","Snapshot frequency: faster loads vs more storage and write cost."],
  fail:["Collaboration server crash: another server restores from snapshot + log; clients reconnect and resend unacked ops (ops need IDs for dedupe).","Client disconnect: buffers ops locally, resends on reconnect with its base revision.","Split-brain (two owners): leases/fencing tokens to ensure one writer.","Hot document with thousands of editors: switch to view-only fan-out for most users.","Log growth: snapshots and compaction."],
  follow:[
    "Why not just last-write-wins? -> It would drop one user's edit on every conflict.",
    "How does undo work? -> Undo generates an inverse operation applied as a new operation, transformed against later ones.",
    "How would you add comments? -> Anchor to ranges that are transformed as the document changes.",
    "How would you scale to a document with 1,000 viewers? -> Editors on the collaboration server; viewers receive a broadcast via a pub/sub fan-out tier."
  ],
  traps:["Sending the entire document on every change.","Locking the document or paragraph.","Not explaining how concurrent edits converge.","Letting multiple servers order operations for the same document.","Persisting only snapshots with no operation log."]
},

"message-queue":{
  say:"A partitioned, replicated, append-only log: producers append to topic partitions, brokers persist them sequentially on disk and replicate to followers, and consumer groups track their own offsets to read at their own pace.",
  clarify:[
    "Delivery semantics needed: at-least-once, at-most-once, or exactly-once?",
    "Ordering: global, or per key/partition? (per-partition is what scales)",
    "Throughput and retention: messages per second, size, how long to keep data? (log vs traditional queue)",
    "Multiple consumers reading the same data (pub/sub) or competing consumers (work queue)?",
    "Latency requirements, and durability vs speed trade-off?"
  ],
  fr:["Producers publish messages to a topic","Consumers subscribe and read messages in order within a partition","Consumer groups share the work; multiple groups each get every message","Messages are retained for a configurable time and can be replayed","Out of scope: stream processing, schema registry"],
  nfr:["High throughput (millions of messages/s) and low latency","Durable: acknowledged messages survive broker failures","Scalable by adding partitions and brokers","Available when a broker fails (automatic failover)","Ordering preserved within a partition"],
  est:[
    "Assume 1M messages/s at 1 KB average = 1 GB/s ingress.",
    "Replication factor 3 triples disk writes and network between brokers: 3 GB/s written cluster-wide.",
    "Retention 7 days: 1 GB/s x 86,400 x 7 = about 600 TB x 3 replicas = 1.8 PB. Spread over, say, 100 brokers with 20 TB each.",
    "Partitions: a partition handles about 10-50 MB/s. For 1 GB/s ingress you want at least 50-100 partitions, more for consumer parallelism. Max consumers in a group = number of partitions.",
    "Sequential disk I/O (hundreds of MB/s) plus the OS page cache makes this possible on spinning or SSD disks; random I/O would not."
  ],
  api:["produce(topic, key, value, acks) -> offset (acks=0 none, 1 leader, all in-sync replicas)","consume/poll(topic, group, max) -> messages from the group's committed offset","commit(group, partition, offset)","admin: create_topic(name, partitions, replication_factor, retention)","Producers pick the partition by hash(key) so related messages stay ordered"],
  data:["Broker storage: per partition, a log split into segment files (for example 1 GB), plus a sparse offset index and a time index. Append-only; old segments are deleted by retention or compacted by key.","Metadata (topic -> partitions -> leader and replicas, broker list, consumer group membership) held in a coordinator (ZooKeeper, or a Raft controller quorum).","Consumer offsets stored per (group, topic, partition), in an internal replicated topic."],
  flow:"Producers -> Brokers (topic partitions; each partition has 1 leader + N-1 followers)\n   leader appends to log segment -> followers replicate (ISR = in-sync replicas)\n   ack to producer according to acks setting\nConsumers (group) -> each partition assigned to one consumer in the group -> poll from offset -> commit offset\nController/coordinator: leader election, metadata, group rebalancing",
  write:["The producer picks a partition (hash of key, or round robin) and finds that partition's leader from cached metadata.","It batches and compresses messages and sends them to the leader.","The leader appends to its log (sequential write, into page cache, flushed periodically).","Followers fetch from the leader and append. The leader tracks the in-sync replica set.","With acks=all, the leader replies once all in-sync replicas have it; the message offset is returned.","On failure the producer retries; idempotent producers (producer ID + sequence number) prevent duplicates."],
  read:["A consumer in a group is assigned a set of partitions.","It polls its partition leader from its current offset; the broker uses an offset index to find the segment and sends a batch (zero-copy from page cache to the network).","The consumer processes messages, then commits the offset (after processing for at-least-once).","If the consumer dies, the group rebalances and another consumer resumes from the last committed offset."],
  deep:[
    {t:"Why a log, and why it is fast",p:"Traditional queues delete on consumption and use random I/O.",opts:["Per-message queue with acks and deletion: flexible, but hard to scale and replay.","Append-only partitioned log: sequential writes, readers keep their own offsets, data retained for replay.","Batching, compression, page cache and zero-copy (sendfile) make throughput enormous."],pick:"The log model. Explain that consumers pulling by offset gives replay, multiple independent consumer groups, and simple brokers."},
    {t:"Partitioning and ordering",p:"One log cannot scale; global order cannot scale either.",opts:["Partition by key hash: all messages for a key go to one partition, ordered.","Round robin: even load, no key ordering.","More partitions: more parallelism, more overhead (files, replication, rebalances) and no way to reduce them without remapping keys."],pick:"Key-based partitioning, and state that ordering is only guaranteed within a partition. Watch for hot keys causing skew."},
    {t:"Replication and failover",p:"A broker dies; data must survive and the partition must stay available.",opts:["Leader/follower replication per partition; followers pull.","ISR: a message is committed once all in-sync replicas have it.","On leader failure, the controller elects a new leader from the ISR (no committed data lost).","Unclean election (out-of-sync replica) trades durability for availability."],pick:"Replication factor 3, min.insync.replicas=2, acks=all for durability. Say clearly which CAP side that picks and what the setting costs in latency."},
    {t:"Delivery semantics",p:"What happens on retries and consumer crashes?",opts:["At-most-once: commit offset before processing; a crash loses messages.","At-least-once: process, then commit; a crash causes redelivery, so consumers must be idempotent.","Exactly-once: idempotent producer + transactions across produce and offset commit, within the system."],pick:"At-least-once by default with idempotent consumers; exactly-once within the platform using idempotent producers and transactions, with the caveat that external side effects still need idempotency."},
    {t:"Consumer groups and rebalancing",p:"Consumers join and leave; each partition must have exactly one consumer in a group.",opts:["A group coordinator tracks membership by heartbeats.","On join/leave, partitions are reassigned (rebalance); processing pauses briefly.","Incremental/cooperative rebalancing reduces the pause."],pick:"Group coordinator with heartbeats; explain the pause and that parallelism is capped at the partition count."},
    {t:"Retention and compaction",p:"Disk is finite.",opts:["Time/size-based deletion of old segments.","Log compaction keeps only the latest value per key (good for state/changelog topics).","Tiered storage moves old segments to object storage."],pick:"Delete by retention for event streams; compaction for keyed state. Mention tiered storage for long retention."}
  ],
  trade:["Durability (acks=all, fsync) vs latency and throughput.","More partitions give parallelism but increase overhead and recovery time.","Pull-based consumers add latency vs push, but handle slow consumers naturally.","Ordering is only per partition: global order would kill scalability."],
  fail:["Broker failure: controller elects new leaders from ISR; producers/consumers refresh metadata.","Slow follower: dropped from the ISR so it does not block acks.","Consumer lag: scale consumers up to the partition count, or add partitions.","Hot partition: bad key distribution; use a better key or add salt.","Controller failure: a new controller is elected from the quorum.","Disk full: retention, alerts, and quotas per topic."],
  follow:[
    "How do you guarantee ordering? -> Within a partition only; send related events with the same key.",
    "How do you avoid duplicates? -> Idempotent producer (sequence numbers) and idempotent consumers.",
    "How is this different from RabbitMQ/SQS? -> Those delete on ack and push or lease messages; a log retains and lets consumers replay by offset.",
    "How do you add capacity? -> Add brokers and reassign partitions; throughput scales with partitions."
  ],
  traps:["Describing a single queue on one machine.","Promising global ordering and high throughput together.","Skipping replication or what happens on leader failure.","Not distinguishing delivery semantics.","Forgetting that consumer parallelism is limited by partitions."]
},

"payments":{
  say:"Correctness over speed: every payment request carries an idempotency key, the system records state transitions in a double-entry ledger, talks to external processors asynchronously, and reconciles against provider reports to catch anything that disagrees.",
  clarify:[
    "Are we the payment service provider (moving money) or integrating with one (Stripe, bank)? (usually: a payment service that orchestrates PSPs)",
    "Pay-in only (customer to merchant), or payouts too? Currencies and payment methods?",
    "Volume: transactions per second, and peak events (Black Friday)?",
    "Consistency: a payment must never be lost or processed twice (the central requirement)",
    "Compliance: PCI-DSS, so do we store card numbers? (avoid it; use tokenization)"
  ],
  fr:["Merchants create a payment for an order; customers pay with a card or wallet","Authorise, capture, and refund payments","Track payment status and notify the merchant (webhooks)","Record every money movement in a ledger","Out of scope: fraud model details, currency conversion engine"],
  nfr:["Exactly-once effect: no double charge, no lost payment","Strong consistency for money state","Highly durable and auditable (every change is recorded and immutable)","Reliable in the face of failures of external providers","Secure: card data never touches our servers (PCI scope minimised), encrypted everywhere"],
  est:[
    "Assume 1M transactions/day = 12/s average, peak 100-500/s on busy days. The scale is modest; the difficulty is correctness, not throughput.",
    "Each payment creates several ledger rows (debit, credit, fees): say 5 rows x 1M/day = 5M rows/day = 1.8B/year x 200 B = 360 GB/year. Easily handled by a sharded relational database.",
    "Provider latency: 1-3 s per authorisation call, so we need asynchronous handling and timeouts.",
    "Reconciliation: daily settlement files of 1M rows compared against our ledger: a batch job."
  ],
  api:["POST /v1/payments {order_id, amount, currency, payment_token, idempotency_key} -> 202/201 {payment_id, status}. The client retries safely with the same idempotency key and gets the same result.","GET /v1/payments/{id}","POST /v1/payments/{id}/capture, /refund {amount, idempotency_key}","Webhook to merchant: payment.succeeded/failed/refunded (signed, retried until acked)","Provider webhooks into us (verify signature, dedupe)"],
  data:["payments(payment_id, order_id, merchant_id, amount, currency, status, provider, provider_ref, idempotency_key UNIQUE, created_at). Status as a state machine: CREATED -> PENDING -> AUTHORIZED -> CAPTURED / FAILED -> REFUNDED.","ledger_entries(entry_id, transaction_id, account_id, debit/credit, amount, currency, created_at): double-entry, append-only, immutable. Every transaction's entries sum to zero.","idempotency_keys(key, request_hash, response, status) with a unique constraint.","Card data is held by the PSP/vault; we store only tokens and the last 4 digits.","SQL with ACID transactions is the right store."],
  flow:"Client/Merchant -> API gateway -> Payment service\n   -> Idempotency check + payment row (SQL, one transaction)\n   -> Payment executor -> PSP / bank (card network) [timeouts, retries]\n   -> Ledger service (double-entry) -> Ledger DB\n   Provider webhooks -> verify -> update state -> Event bus -> Merchant webhooks, notifications\n   Reconciliation job: provider settlement files vs ledger -> discrepancies for review",
  write:["The client sends a payment request with an idempotency key. The service looks the key up: if it exists, return the stored result. If not, insert the key and a payment row (state CREATED) in one transaction.","Fraud/risk checks run; the payment moves to PENDING.","The executor calls the PSP with a stable reference (our payment_id as the provider's idempotency key). Network timeouts are expected.","On a response, update the payment state and, in the same database transaction, write the double-entry ledger rows.","Emit an event (via an outbox table) to notify the merchant by webhook and update downstream systems.","If the call timed out with an unknown outcome, query the PSP for the status (or wait for its webhook) before retrying; never blindly retry a charge."],
  read:["Merchants poll GET /payments/{id} or wait for webhooks.","Balances are computed from the ledger entries (or maintained in balance rows updated in the same transaction).","Reporting reads from replicas or a data warehouse."],
  deep:[
    {t:"Idempotency",p:"The client times out and retries; the customer must not be charged twice.",opts:["No protection: duplicates happen on any retry.","Client-generated idempotency key stored with a unique constraint; the server returns the saved response for repeats.","Pass the same key to the PSP so retries there are safe too.","Hash the request body and reject the same key with different content."],pick:"Idempotency key on every mutating call, enforced by a unique DB constraint, and propagated to the PSP."},
    {t:"Unknown outcomes and the state machine",p:"A timeout after sending the charge request: did it succeed?",opts:["Assume failure and retry: may double charge.","Assume success: may ship without payment.","Mark PENDING/UNKNOWN, then query or await the provider's webhook; resolve via reconciliation."],pick:"Explicit PENDING state and status inquiry. The ability to answer 'what actually happened?' is the point of the design."},
    {t:"Ledger and consistency",p:"Money must be traceable and balances correct.",opts:["Update a balance column in place: loses history, hard to audit.","Immutable double-entry ledger where debits equal credits, balances derived (or cached) from entries.","Strong ACID transactions for the payment state change plus its ledger entries."],pick:"Append-only double-entry ledger, written in the same transaction as the state change. Corrections are new entries, never edits."},
    {t:"Distributed transactions and events",p:"A payment touches the order service, the PSP, the ledger and notifications; they cannot share one transaction.",opts:["Two-phase commit: heavy and brittle across external systems.","Saga: a sequence of local transactions with compensating actions (refund/void) on failure.","Transactional outbox: write the event in the same DB transaction as the state change; a relay publishes it, giving at-least-once delivery without dual-write bugs."],pick:"Saga with the outbox pattern; consumers must be idempotent."},
    {t:"Reconciliation",p:"Our records and the PSP's will drift (timeouts, bugs, chargebacks).",opts:["Daily compare settlement files against the ledger.","Flag mismatches (missing, amount differs, duplicate) for automated or manual fix.","Treat the PSP/bank as the source of truth for whether money moved."],pick:"A scheduled reconciliation job with alerts. It is the safety net that makes the rest trustworthy."},
    {t:"Security and PCI scope",p:"Handling raw card numbers brings heavy compliance requirements.",opts:["Client-side tokenization: the card goes straight to the PSP/vault, we receive a token.","Encrypt data at rest and in transit; restrict access and audit.","Webhook signature verification."],pick:"Tokenization so raw card data never reaches our systems."},
    {t:"Handling provider failures",p:"PSPs go down.",opts:["Timeouts, retries with backoff for safe operations (status queries).","Circuit breaker and failover to a secondary PSP for new payments.","Queue payments and process asynchronously."],pick:"Circuit breaker and routing to a backup PSP for new attempts; never retry a charge without an idempotency key."}
  ],
  trade:["Consistency over availability: it is better to fail a payment than to double charge.","Synchronous response simplicity vs asynchronous robustness (return 202 and notify).","Saga complexity vs 2PC fragility.","Strict audit trail costs storage but is mandatory."],
  fail:["Timeout with unknown result: PENDING, then status check or webhook, then reconcile.","Duplicate webhook from the PSP: dedupe by event ID.","Crash between charge and ledger write: the retry finds the PSP reference and completes the ledger entry; reconciliation catches stragglers.","Double submit: idempotency key.","Provider outage: failover and circuit breaker.","Partial refund errors: validate that refunds do not exceed captured amount, inside a transaction."],
  follow:[
    "How do you prevent double charging? -> Idempotency keys end to end, plus status inquiry before retrying.",
    "Why a double-entry ledger? -> Every movement has an equal opposite entry, so errors show up as imbalances and history is auditable.",
    "How do you scale it? -> Shard by merchant or payment ID; the throughput is modest, so correctness features matter more.",
    "How do you handle chargebacks? -> A new ledger transaction reversing funds, triggered by provider events."
  ],
  traps:["Designing for throughput and ignoring correctness.","Retrying a charge after a timeout without an idempotency key.","Updating balances without an immutable ledger.","Using an eventually consistent store for money state.","Storing raw card numbers."]
},

"metrics":{
  say:"Agents push metrics through a queue into a time-series database partitioned by time and series, aggregated and downsampled as data ages, with a separate alerting evaluator and a query layer that reads recent data from fast storage.",
  clarify:[
    "Infrastructure metrics (CPU, requests) and/or application metrics? Logs and traces too? (focus on metrics)",
    "Scale: number of hosts and metrics per host, collection interval?",
    "Retention and resolution: for example 1-second data for 1 day, 1-minute for 30 days, 1-hour for a year?",
    "Alerting: latency from event to alert, and notification channels?",
    "Push (agents send) or pull (system scrapes)?"
  ],
  fr:["Collect metrics (name, tags, value, timestamp) from many hosts and services","Store them and answer queries (rates, percentiles, group by tag) over time ranges","Dashboards visualise metrics","Alert rules evaluate metrics and notify on-call","Out of scope: log search, distributed tracing"],
  nfr:["Very high write throughput with a steady stream","Low-latency queries for recent data (dashboards load in seconds)","Highly available for ingestion and alerting (the monitor must not die when the system does)","Reasonable accuracy and eventual consistency (seconds of delay is fine)","Cost-efficient storage via compression and downsampling"],
  est:[
    "Assume 100k hosts x 100 metrics each = 10M series, each sampled every 10 s -> 1M data points/s.",
    "Each point 16 bytes raw (timestamp + value); a good TSDB compresses to about 1.5-2 bytes with delta-of-delta and XOR encoding. Raw: 16 MB/s; compressed storage about 2 MB/s.",
    "Per day: 1M x 86,400 = 86B points x 2 B compressed = 170 GB/day. 30 days of full-res = 5 TB. Downsample older data to 1-minute (6x less) and 1-hour (360x less).",
    "Cardinality is the real risk: every unique combination of tag values is a new series. Adding a user_id tag to a metric can create millions of series and blow up the index. Say it.",
    "Queries: 10k dashboard queries/min; mostly recent data, so the last hours must be cached/in memory."
  ],
  api:["Ingest: POST /v1/metrics (batched) [{name, tags:{host,region,...}, value, ts}] or agents expose /metrics for scraping","Query: GET /v1/query?expr=avg(cpu{region=\"us\"}) by (host)&start=&end=&step=","Alerts: POST /v1/alerts {expr, for: 5m, threshold, severity, notify: [...]}","Dashboards: CRUD for saved panels and layouts"],
  data:["Time-series store: series identified by (metric name + sorted tag set) -> series_id; data = ordered (timestamp, value) pairs. Stored in time-partitioned blocks (for example 2-hour blocks), compressed columnar.","Inverted index: tag -> list of series_ids, to resolve queries like region=us quickly.","Rollups: 1-min and 1-hour aggregates (min, max, sum, count) stored separately for older ranges.","Alert rules and dashboards in a small relational DB; alert state (firing/resolved) in memory or a store."],
  flow:"Agents/collectors -> Load balancer -> Ingestion gateways -> Kafka (partitioned by series)\n   -> TSDB writers (memory buffer + WAL -> compressed blocks) -> hot storage (SSD) -> cold (object storage)\n   -> Rollup/downsampling jobs\nQuery service -> index + TSDB (+ cache) -> Dashboards/API\nAlert evaluator (reads recent data on a schedule or from the stream) -> Alertmanager -> dedupe/route -> PagerDuty/Slack/email",
  write:["An agent on each host collects metrics every 10 s and sends a batched, compressed payload to an ingestion gateway.","The gateway validates, labels and publishes to Kafka, partitioned by series hash (a buffer that absorbs spikes).","TSDB writer nodes consume their partitions, append to a write-ahead log and an in-memory buffer, and periodically flush compressed blocks to disk.","Background jobs compact blocks and compute rollups (1m, 1h) for long-term storage.","Old data moves to object storage; data past retention is deleted."],
  read:["A dashboard request arrives at the query service with an expression and time range.","The service resolves tag filters using the inverted index to a set of series.","It chooses a resolution that fits the time range (raw for the last hour, 1-minute rollups for a week, 1-hour for a year) so a query does not scan billions of points.","It reads blocks from hot storage (and the in-memory buffer for the latest points), aggregates in parallel, and returns a series downsampled to the requested step.","Frequently used panels are cached."],
  deep:[
    {t:"Choosing storage",p:"Time-series data is append-heavy, ordered by time, and queried by range.",opts:["General relational DB: indexes and row-based writes do not scale to 1M points/s.","Wide-column (Cassandra): scales writes, weak for time-series queries unless carefully modelled.","Purpose-built TSDB (Prometheus, InfluxDB, M3, Gorilla-style): time-partitioned blocks, compression, tag index."],pick:"A purpose-built TSDB design: in-memory buffer + WAL, immutable compressed blocks, and an inverted tag index. Explain delta-of-delta timestamp and XOR value compression briefly."},
    {t:"Ingestion at scale",p:"1M+ points/s with bursts, and agents must not be blocked.",opts:["Direct writes from agents to the database: no buffering, spikes cause data loss.","A queue (Kafka) between ingestion and storage to buffer, replay, and decouple.","Batching and compression at the agent."],pick:"Agent batching + Kafka buffer + partitioned writers. Replays after an outage come free from the log."},
    {t:"Push vs pull collection",p:"How do metrics reach the system?",opts:["Pull (Prometheus): the server scrapes targets; easy to detect down targets and control load; needs service discovery and reachability.","Push: agents send; works for short-lived jobs and across firewalls; risk of overload and harder to know a host is silent."],pick:"Either, with a clear reason. Pull for long-lived services with discovery; push (or a push gateway) for batch jobs and edge. Many systems support both."},
    {t:"Downsampling and retention",p:"Keeping every raw point forever is too expensive, and wide queries would be slow.",opts:["Roll up to coarser resolutions as data ages, storing min/max/sum/count so averages and percentile approximations still work.","Tiered storage: SSD for recent, object storage for old.","Delete after retention."],pick:"Multi-resolution rollups with tiering. Note that you cannot recover raw detail after downsampling, and percentiles need sketches (t-digest/histograms) rather than averaging averages."},
    {t:"Cardinality",p:"Each unique tag combination is a series, and the index grows with it.",opts:["Limit tags to low-cardinality values (host, region, status), never user_id or request_id.","Enforce per-tenant series limits at ingestion.","Drop or aggregate offending metrics."],pick:"Explicit cardinality limits and guidance. This is the most common way monitoring systems fall over."},
    {t:"Alerting",p:"The system that tells you about failures must be reliable and not noisy.",opts:["An evaluator runs rules on a schedule (for example every 30 s) against recent data.","'For' durations (condition must hold for 5 minutes) to avoid flapping.","Grouping, deduplication, silencing and routing in an alert manager.","Run it redundantly in multiple zones, plus a 'dead man's switch' alert that fires if the pipeline itself stops."],pick:"Scheduled rule evaluation with a for-duration, an alert manager for dedupe and routing, and redundancy. Mention monitoring the monitor."},
    {t:"Query performance",p:"Dashboards fan out many queries.",opts:["Cache results and recent data in memory.","Pre-aggregate common queries (recording rules).","Shard queries across nodes and merge."],pick:"Recording rules for expensive queries, result caching, and resolution selection by time range."}
  ],
  trade:["Resolution and retention vs storage cost (downsampling loses detail).","Push vs pull: control and discovery vs reach and simplicity.","Eventual consistency of a few seconds is fine, which allows buffering.","Rich tags enable powerful queries but raise cardinality risk.","Alert sensitivity vs noise."],
  fail:["Ingestion spike or backend outage: Kafka buffers and writers catch up.","TSDB node loss: replicate blocks or write to two nodes; recover from WAL and object storage.","Cardinality explosion: per-tenant limits, drop the offending metric.","Alerting pipeline down: redundant evaluators and a dead man's switch.","Slow query takes down the query tier: timeouts, limits on series and range, query isolation.","Clock skew from hosts: use ingestion time as a fallback, reject points far in the future."],
  follow:[
    "How do you compute percentiles (p99) across hosts? -> Aggregate histograms or sketches (t-digest), never average the per-host percentiles.",
    "How would you reduce alert noise? -> For-durations, grouping, severity routing, and alerting on symptoms (SLOs) rather than causes.",
    "How would you add logs and traces? -> Separate pipelines with different stores (log search index, trace store) sharing tags for correlation.",
    "How do you do multi-tenancy? -> Tenant ID in every series, per-tenant quotas, and isolated query limits."
  ],
  traps:["Using a relational database for the raw points.","Ignoring cardinality.","Keeping full resolution forever or averaging averages.","Writing straight from agents to the database with no buffer.","An alerting system that depends on the thing it monitors."]
},

});
