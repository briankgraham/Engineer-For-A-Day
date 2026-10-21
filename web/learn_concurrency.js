// Learning tab: concurrency and async. One quiz-and-explain track (no code exercises, because the lesson test harness is synchronous):
// promises in practice, threads vs processes vs the event loop, race conditions, locks and deadlocks, queues and backpressure,
// and the distributed version of all of it (retries, idempotency, optimistic concurrency).
// Same shapes as learn_data.js (see the comment at its top), with `ready: []` and `leetcode: []` because there is no LeetCode checkpoint.
// The event loop itself (ordering of sync code, microtasks and timers) is taught in the JavaScript track; this track builds on it.
// Text uses « as a stand-in for a backtick so the strings below can be template literals; the loop at the bottom swaps it back.
(function(){
const TRACKS=[];

TRACKS.push({
  id:"concurrency",
  title:"Concurrency and async",
  icon:"🔀",
  tagline:"Promises in practice, threads vs processes, race conditions, locks and deadlocks, queues, and how retries and idempotency carry the same ideas across machines.",
  outcomes:[
    "Choose between «Promise.all», «allSettled», «race» and «any», and spot accidentally serial «await» loops",
    "Say whether a workload is I/O-bound or CPU-bound and pick threads, processes or the event loop",
    "Find the race in a read-modify-write and fix it with atomicity, a lock or optimistic concurrency",
    "Explain the four conditions for deadlock and how lock ordering prevents it",
    "Design a retry that is safe: backoff with jitter, a timeout, and an idempotency key",
  ],
  ready:[],
  lessons:[
  {id:"promises",title:"Promises and async patterns",goal:"Run async work in parallel or in series on purpose, pick the right combinator, and handle errors, timeouts and cancellation.",mins:12,leetcode:[],
   blocks:[
    {md:`## Series vs parallel

A promise starts running the moment it is **created**. «await» only decides when you wait for it.

«««js
// Serial: each call starts after the previous one finishes (about 3 x the time)
for (const id of ids) results.push(await fetchUser(id));

// Parallel: all calls start now, then we wait for every one
const results = await Promise.all(ids.map(fetchUser));
»»»

Serial is right when each step needs the last one's result, or when you must not hammer a service. Otherwise it is usually an accident.

## The combinators

| Combinator | Resolves when | Rejects when |
| --- | --- | --- |
| «Promise.all» | all fulfil (array of values, in input order) | **any** rejects (first rejection) |
| «Promise.allSettled» | all settle (array of «{status, value/reason}») | never |
| «Promise.race» | the first settles, either way | the first settles as a rejection |
| «Promise.any» | the first **fulfils** | all reject («AggregateError») |

## Timeouts, cancellation and limits

- A promise cannot be cancelled. To stop the work, pass an **«AbortSignal»** (for example «fetch(url, {signal})») and call «controller.abort()».
- A timeout is «Promise.race([work, sleepThenReject(ms)])», but remember the work keeps running unless you also abort it.
- Parallel does not mean unlimited. Firing 10,000 requests at once exhausts sockets and trips rate limits, so cap concurrency with a pool or a semaphore (for example, N workers pulling from a shared queue).

## Errors

An unhandled rejection is a bug: in Node it can crash the process. Always «await» inside «try/catch» or attach a «.catch». Inside «forEach(async ...)» nothing awaits the callbacks, so errors vanish and the loop does not wait.`},
    {tip:"A classic follow-up is “implement a promise pool”: run at most N tasks at once, starting the next one as each finishes. Think of N workers that each loop: take the next task, await it, repeat."},
   ],
   parts:[
    {type:"quiz",id:"q-serial",q:"You need to fetch 20 independent user profiles. Which version is the fastest?",
      options:["for (const id of ids) { out.push(await get(id)); }","const out = await Promise.all(ids.map(get));","ids.forEach(async id => out.push(await get(id)));","for (const id of ids) { out.push(get(id)); }"],answer:1,
      why:"«Promise.all(ids.map(get))» starts all 20 requests at once and waits for them together. The «for/await» loop runs them one after another. The «forEach(async)» version is also parallel, but nothing waits for it, so «out» is not filled when you read it. The last one pushes promises, not values."},
    {type:"quiz",id:"q-all-reject",q:"In Promise.all([a(), b(), c()]), b() rejects after 10 ms and a() and c() are still running. What happens?",
      options:["The returned promise rejects right away with b's error; a and c keep running but their results are ignored","It waits for a and c, then rejects","It resolves with the two successes and skips b","a and c are cancelled automatically"],answer:0,
      why:"«Promise.all» is fail-fast. The other promises are not cancelled (promises can't be), so their side effects still happen. Use «allSettled» when you want every outcome."},
    {type:"quiz",id:"q-which",q:"You query three mirror servers for the same file and want the first successful answer, ignoring the ones that fail. Which combinator?",
      options:["Promise.all","Promise.race","Promise.any","Promise.allSettled"],answer:2,
      why:"«Promise.any» resolves with the first fulfilment and only rejects if all fail. «Promise.race» would return a fast failure from one mirror and give up on the others."},
    {type:"quiz",id:"q-foreach",q:"What is wrong with this? await items.forEach(async x => { await save(x); });",
      options:["Nothing, forEach awaits async callbacks","forEach returns undefined, so the await does not wait for any save; errors inside become unhandled rejections","It runs the saves one at a time","It throws a SyntaxError"],answer:1,
      why:"«forEach» ignores the promises its callback returns. Use «await Promise.all(items.map(save))» to run in parallel or a «for...of» loop to run in series."},
    {type:"quiz",id:"q-cancel",q:"You wrap a request in Promise.race with a 2 second timeout and the timeout wins. What happened to the request?",
      options:["It was cancelled","It keeps running in the background unless you also abort it with an AbortSignal","It is retried","It throws on its own"],answer:1,
      why:"«race» only decides which promise you listen to. To actually stop the work, pass an «AbortSignal» to it and call «abort()» when the timeout fires."},
    {type:"explain",id:"e-pool",title:"Limit concurrency",
      prompt:"You have 5,000 URLs to download and the server allows about 10 requests at once. Describe how you would write «promisePool(tasks, limit)» so that at most «limit» tasks run at the same time, results come back in input order, and one failure is handled sensibly. Mention what you'd do differently if each task also needs a timeout.",
      rubric:"Strong answers: start «limit» worker loops (or seed «limit» tasks) that each take the next index from a shared counter, await the task, store the result at its index (order preserved), and continue until the list is empty; the pool resolves when all workers finish («Promise.all» of workers). Failure policy stated: fail fast (reject, stop taking new tasks) or collect errors per item («allSettled» style). Timeouts: race each task against a timer and abort it with AbortController so the slot frees up and the work really stops. Bonus: mention why not Promise.all on everything (sockets, rate limits, memory), and retries with backoff."},
   ]},

  {id:"threads",title:"Threads, processes and the event loop",goal:"Tell I/O-bound from CPU-bound work and choose between the event loop, threads and processes.",mins:10,leetcode:[],
   blocks:[
    {md:`## Three ways to do many things

- **Process**: its own memory and OS resources. Isolated (a crash stays inside), but starting one is heavy and sharing data means copying or using IPC.
- **Thread**: runs inside a process and **shares its memory** with the other threads. Cheap to start and share data with, which is exactly what creates races and deadlocks.
- **Event loop** (JavaScript, Node, Python asyncio): one thread that never blocks. While one request waits on the network, it runs another callback.

## I/O-bound vs CPU-bound

| | Spends its time | Helped by |
| --- | --- | --- |
| I/O-bound | waiting on network, disk, database | async I/O, many threads, the event loop |
| CPU-bound | computing (hashing, image resize, parsing a huge file) | more **cores**: processes, worker threads |

A single-threaded event loop handles thousands of waiting connections easily. But one long synchronous loop **blocks everything**: no other request, timer or click handler runs until it returns.

## Escape hatches

- Node and browsers: **Worker threads / Web Workers** (separate heap, communicate by messages), or a **child process**, or a job queue with separate workers.
- Python: the **GIL** lets only one thread run Python bytecode at a time, so threads help I/O-bound code but not CPU-bound; use multiprocessing for the latter.
- Context switching is not free: thousands of OS threads cost memory (each has its own stack) and scheduling time. That is why servers moved to event loops and lightweight tasks.`},
    {warn:"“It's async so it's concurrent” is only true for waiting. Wrapping a CPU-heavy function in «async» or in «Promise.resolve().then» does not move it off the main thread: it still blocks."},
   ],
   parts:[
    {type:"quiz",id:"q-bound",q:"Which of these is CPU-bound?",
      options:["Calling a REST API 100 times","Hashing 2 GB of files with SHA-256","Waiting for a database query","Reading a config file"],answer:1,
      why:"Hashing keeps a core busy computing. The others spend most of their time waiting on I/O, which the event loop or threads overlap well."},
    {type:"quiz",id:"q-block",q:"A Node API runs a synchronous 3 second loop inside one request handler. What do other users experience meanwhile?",
      options:["Nothing, each request has its own thread","Their requests wait until the loop finishes, because there is one main thread","Only requests to the same route are delayed","The loop is paused automatically every few ms"],answer:1,
      why:"The event loop is cooperative. Nothing else runs until the synchronous code returns, so a long CPU task stalls every connection. Move it to a worker thread, child process or queue."},
    {type:"quiz",id:"q-share",q:"What is the key difference between threads and processes?",
      options:["Threads are faster to run","Threads share memory within a process; processes have separate memory","Processes cannot use multiple cores","Threads cannot do I/O"],answer:1,
      why:"Shared memory makes threads cheap to communicate through but needs synchronization. Separate processes are isolated, so a crash or a bug stays contained, at the price of copying data."},
    {type:"quiz",id:"q-gil",q:"In CPython, why doesn't adding threads speed up a CPU-heavy loop?",
      options:["Python has no threads","The GIL lets only one thread execute Python bytecode at a time","Threads cannot share lists","The OS limits Python to one core"],answer:1,
      why:"The global interpreter lock serializes bytecode execution. Threads still help while waiting on I/O (the lock is released), and multiprocessing gives each process its own interpreter and core."},
    {type:"quiz",id:"q-pick",q:"A service handles 20,000 mostly idle websocket connections that occasionally send small messages. Which model fits best?",
      options:["One OS process per connection","One OS thread per connection","An event loop with non-blocking I/O","A single synchronous loop that handles one client at a time"],answer:2,
      why:"Idle connections cost almost nothing on an event loop. Thread-per-connection pays a stack and scheduling overhead for each one, and process-per-connection is heavier still."},
    {type:"explain",id:"e-model",title:"Pick a concurrency model",
      prompt:"Your Node web app has an endpoint that generates a PDF report. It takes about 2 seconds of pure CPU and users request it often. The rest of the app is quick database-backed JSON. Explain what goes wrong if you just call the generator in the handler, and describe two ways to fix it, with the trade-offs.",
      rubric:"Strong answers: the generator is CPU-bound and synchronous, so it blocks the single event loop and every other request stalls (latency spikes, timeouts, health checks fail). Fixes: (1) worker threads / a worker pool (shares the process, message passing, good for moderate load, bounded pool size to avoid oversubscribing cores); (2) a job queue with separate worker processes or services (scales independently, retries, handles bursts, user polls or gets notified; adds infrastructure and latency); optionally child process or a separate service. Mentions limiting concurrency to about the core count, not blocking the main thread, returning 202 + job id for long work, and that making the function «async» alone does not help."},
   ]},

  {id:"races",title:"Race conditions",goal:"Recognize check-then-act and read-modify-write bugs, in threads, in async JavaScript and in databases, and fix them.",mins:11,leetcode:[],
   blocks:[
    {md:`## What a race is

A **race condition** is a bug where the result depends on the timing or interleaving of operations that should not have been interleaved.

«««js
// Two requests run this at the same time against a shared counter
let balance = await db.get("balance");   // both read 100
balance = balance - 30;
await db.set("balance", balance);        // both write 70 -> one withdrawal was lost
»»»

This is a **lost update**: a read-modify-write that was not atomic. The same shape appears as:

- **Check-then-act**: «if (!exists(file)) create(file)» (another caller can create it between the check and the act), or “if seats left, book one”.
- **Async interleaving in JavaScript**: there is only one thread, but every «await» is a point where other code can run. Between the read and the write above, anything else can run.
- **Stale response**: a search-as-you-type fires requests for “a”, “ab”, “abc”. If “ab” returns last, the UI shows the wrong results.

## Fixes, from best to worst

1. **Make it atomic where the data lives.** One statement: «UPDATE accounts SET balance = balance - 30 WHERE id = 1 AND balance >= 30», or an atomic increment in Redis. A unique constraint turns check-then-insert into a safe insert-and-handle-duplicate.
2. **Lock** the thing you read (a transaction with «SELECT ... FOR UPDATE», or a mutex in-process).
3. **Optimistic concurrency**: read a version number, write only if it is unchanged («WHERE version = 7»), retry on conflict.
4. **Avoid shared mutable state**: confine it to one owner (a single worker, a queue), or use immutable data.
5. For stale UI responses: ignore all but the latest request (a request counter) or abort the previous one with «AbortController».

Adding a «sleep», or hoping it is “unlikely”, is not a fix. Races are rare in testing and common at scale.`},
    {tip:"In interviews, name the invariant that must hold (“balance never goes negative”, “no double booking”), show the interleaving that breaks it, then fix it at the lowest layer that owns the data."},
   ],
   parts:[
    {type:"quiz",id:"q-lost",q:"Two requests each read stock = 5, subtract 1 and write back. What is the final stock if they overlap?",
      options:["3","4","5","It depends on the database"],answer:1,
      why:"Both read 5 and both write 4. One decrement is lost. The result should be 3, which is why the read-modify-write must be atomic."},
    {type:"quiz",id:"q-js-race",q:"JavaScript is single-threaded. Can the lost update above still happen in a Node server?",
      options:["No, single-threaded code can't race","Yes: each await lets another request's code run between the read and the write","Only with worker threads","Only in the browser"],answer:1,
      why:"Single-threaded does not mean atomic. Every «await» yields, so two requests can interleave around the read and the write. Races across async boundaries are one of the most common JS concurrency bugs."},
    {type:"quiz",id:"q-atomic",q:"Which is the best fix for double-spending a balance?",
      options:["Add await sleep(50) between the read and the write","UPDATE accounts SET balance = balance - 30 WHERE id = 1 AND balance >= 30, and check the affected row count","Read the balance twice and compare","Use a global variable to remember who is running"],answer:1,
      why:"One conditional statement checks and writes in a single atomic step inside the database. The check-then-write gap, which the other options leave open or hide, disappears."},
    {type:"quiz",id:"q-optimistic",q:"How does optimistic concurrency control detect a conflict?",
      options:["It locks the row before reading","The write includes the version it read («WHERE version = 7»); zero rows updated means someone else changed it, so retry","It runs all transactions one at a time","It compares timestamps in the client"],answer:1,
      why:"No lock is held while the user thinks or the network is slow. Conflicts are detected at write time and handled by re-reading and retrying. It works well when conflicts are rare."},
    {type:"quiz",id:"q-stale",q:"A search box sends a request on every keystroke and responses sometimes arrive out of order, showing results for an older query. What is a good fix?",
      options:["Slow the requests down with a longer server delay","Abort the previous request or ignore any response that is not for the latest query","Sort the results alphabetically","Disable the search box while loading"],answer:1,
      why:"This is a race between responses. Tracking the latest request (or aborting the previous one with «AbortController») means only the newest query can update the UI. Debouncing helps with load but doesn't remove the race."},
    {type:"explain",id:"e-booking-race",title:"Fix a double booking",
      prompt:"Two users click “Book” on the last seat at the same moment. The handler does: «seats = await getSeats(event); if (seats > 0) await setSeats(event, seats - 1); createTicket()». Walk through how both succeed, then give at least two different ways to fix it and say which you would choose.",
      rubric:"Strong answers: show the interleaving (both read seats = 1, both pass the check, both write 0, two tickets for one seat) and name it check-then-act / lost update, noting that await allows interleaving even in single-threaded JS. Fixes: a single atomic conditional update («UPDATE events SET seats = seats - 1 WHERE id = ? AND seats > 0», check rows affected); a transaction with «SELECT ... FOR UPDATE» (pessimistic lock); optimistic version column with retry; or a unique constraint on (event, seat) so the second insert fails; or serialize through a queue per event. Picks the atomic conditional update or a unique constraint as simplest and explains why (enforced in the database, no lock held across network calls). Also mentions doing the ticket creation in the same transaction."},
   ]},

  {id:"locks",title:"Locks, deadlocks and friends",goal:"Use mutexes and semaphores correctly, and explain, prevent and spot deadlocks.",mins:11,leetcode:[],
   blocks:[
    {md:`## Tools

- **Mutex (lock)**: only one holder at a time. Guards a **critical section**: the code that touches shared data.
- **Semaphore**: a counter allowing up to N holders. Use it to limit concurrency (N connections, N workers).
- **Read-write lock**: many readers *or* one writer. Good when reads vastly outnumber writes.
- **Atomic operations** (compare-and-swap, atomic increment): lock-free building blocks for single values.

Keep critical sections **small**, and never hold a lock while doing slow I/O if you can avoid it: everyone else queues behind you.

## Deadlock

Two workers each hold a lock the other needs, and both wait forever.

«««text
Thread A: lock(accounts[1]) ... then lock(accounts[2])
Thread B: lock(accounts[2]) ... then lock(accounts[1])   // A and B each wait on the other
»»»

It needs **all four** of the Coffman conditions:

1. **Mutual exclusion**: a resource is held by one at a time.
2. **Hold and wait**: a thread holds one resource while waiting for another.
3. **No preemption**: a held resource can't be taken away.
4. **Circular wait**: a cycle of threads each waiting on the next.

Break any one and deadlock is impossible. The practical favorite is breaking circular wait with a **global lock order** (always lock the lower account id first). Others: acquire everything at once, use **timeouts** and back off (try-lock), or avoid nested locks.

## Related problems

- **Livelock**: threads keep reacting to each other and make no progress (two people stepping aside in a corridor).
- **Starvation**: a thread never gets the resource because others always go first.
- **Priority inversion**: a low-priority thread holding a lock blocks a high-priority one.
- Databases detect deadlocks and abort one transaction: your code must be ready to retry.`},
    {tip:"The bank transfer is the standard deadlock question. The answer to give: lock both accounts in a fixed order (by id), regardless of which is the source and which is the destination."},
   ],
   parts:[
    {type:"quiz",id:"q-semaphore",q:"You want at most 5 concurrent database connections in use by a service. Which primitive fits?",
      options:["A mutex","A semaphore initialised to 5","A read-write lock","A condition variable with no counter"],answer:1,
      why:"A semaphore is a counter of permits. A mutex is the special case with one permit."},
    {type:"quiz",id:"q-order",q:"Transfer(a, b) locks a, then b. Another thread runs Transfer(b, a). What can happen?",
      options:["Nothing, locks are re-entrant","Deadlock: each holds one lock and waits for the other","Livelock only","The second call is skipped automatically"],answer:1,
      why:"Circular wait: the first thread holds a and wants b, the second holds b and wants a. Locking in a global order (for example, lower id first) means both threads ask for the same lock first."},
    {type:"quiz",id:"q-coffman",q:"Which one of these is NOT one of the four conditions needed for a deadlock?",
      options:["Mutual exclusion","Circular wait","Hold and wait","Context switching"],answer:3,
      why:"The four conditions are mutual exclusion, hold and wait, no preemption, and circular wait. Context switching is a scheduler feature and is unrelated."},
    {type:"quiz",id:"q-livelock",q:"Two services keep retrying a conflicting update at the same instant, each backing off and retrying again in lockstep. Nothing ever completes. What is this?",
      options:["Deadlock","Livelock","Starvation","Priority inversion"],answer:1,
      why:"Both are active but make no progress. Adding random jitter to the backoff breaks the symmetry. In a deadlock, the threads would be blocked and idle."},
    {type:"quiz",id:"q-held",q:"Which is the safest habit for a critical section?",
      options:["Hold the lock for the entire request, including network calls","Hold it as briefly as possible and avoid I/O while holding it","Use a lock only when you remember to","Acquire locks in a different order each time to be fair"],answer:1,
      why:"A lock held across slow I/O serializes everyone behind it and widens the window for deadlocks and timeouts. Do slow work outside, then lock to apply the small change."},
    {type:"explain",id:"e-deadlock",title:"Explain and prevent a deadlock",
      prompt:"Explain what a deadlock is using a bank-transfer example, name the conditions required for it, and describe two ways to prevent it. Then say how a relational database deals with deadlocks and what your application code should do.",
      rubric:"Strong answers: two transfers in opposite directions, each locking source then destination, so each holds one lock and waits for the other forever. Names the four conditions (mutual exclusion, hold and wait, no preemption, circular wait) and says breaking any one prevents it. Prevention: global lock ordering (e.g. by account id), try-lock with timeout and backoff, acquiring all locks at once, avoid nested locks, or single-writer design/queue. Databases detect cycles and abort one transaction as the victim with a deadlock error; the app should retry the whole transaction (with jitter), keep transactions short and touch rows in a consistent order."},
   ]},

  {id:"queues",title:"Queues, workers and backpressure",goal:"Use queues and worker pools to decouple producers from consumers, and keep them from overwhelming each other.",mins:10,leetcode:[],
   blocks:[
    {md:`## Producer and consumer

Instead of sharing state and locking it, **pass messages**. Producers put work on a queue; a pool of workers takes it off. The queue absorbs bursts, and each item is handled by exactly one worker, so the workers don't need to coordinate.

- **Thread pool / worker pool**: a fixed number of workers (about the core count for CPU work, more for I/O) so a spike can't create unbounded threads.
- **Job queue** (SQS, RabbitMQ, Redis-backed queues): the same idea across machines, with persistence, retries and a **dead-letter queue** for jobs that keep failing.
- The web request returns quickly with a job id («202 Accepted»); the result is polled or pushed later.

## Backpressure

If producers are faster than consumers, the queue grows without limit and you run out of memory or the wait time becomes useless. Choices:

- **Bound the queue** and make producers wait (block or reject with «429/503») when it is full.
- **Shed load**: drop the oldest or lowest-priority work.
- **Scale consumers** (autoscale on queue depth).
- **Rate limit** at the edge (token bucket, leaky bucket).

An unbounded queue does not remove overload; it hides it until memory runs out and latency is minutes.

## Delivery guarantees

- **At most once**: send and forget. Messages can be lost, never duplicated.
- **At least once**: retry until acknowledged. Nothing is lost but you **will** see duplicates, so handlers must be idempotent.
- **Exactly once** in the strict sense is not achievable over an unreliable network; systems get “effectively once” with at-least-once delivery plus idempotent processing.

Ordering is usually only guaranteed **per partition or key**, so route related messages (all events for one user) to the same partition.`},
   ],
   parts:[
    {type:"quiz",id:"q-why-queue",q:"What is the main benefit of putting a queue between a web request and slow work like sending emails?",
      options:["It makes the work itself faster","It decouples and smooths bursts: the request returns fast and workers process at their own pace, with retries","It guarantees exactly-once delivery","It removes the need for a database"],answer:1,
      why:"The queue buffers load and isolates failures. It doesn't make the work cheaper, and it doesn't give exactly-once semantics for free."},
    {type:"quiz",id:"q-unbounded",q:"Producers add 1,000 jobs/s; consumers finish 600 jobs/s; the queue has no limit. What happens over time?",
      options:["Nothing, the queue absorbs it forever","The backlog grows by 400 jobs every second until memory or latency becomes a problem","Consumers speed up automatically","Producers slow down by themselves"],answer:1,
      why:"A queue only smooths bursts. When the average arrival rate is above the service rate, the backlog and the wait time grow without bound. You need backpressure, shedding or more consumers."},
    {type:"quiz",id:"q-atleast",q:"A queue guarantees at-least-once delivery. What must your message handler be?",
      options:["Fast","Idempotent, because the same message may arrive more than once","Single-threaded","Stateless and nothing else"],answer:1,
      why:"Retries after a lost acknowledgement cause duplicates. Making the handler idempotent (dedupe by message id, upserts, conditional writes) makes duplicates harmless."},
    {type:"quiz",id:"q-order-key",q:"You need all events for the same user to be processed in order, but across users you want parallelism. What do you do?",
      options:["Use one global queue with one worker","Partition by user id so one user's events go to the same partition/worker","Process messages randomly and sort later","Use as many workers as possible on a shared list"],answer:1,
      why:"Ordering is generally guaranteed only within a partition. Keying by user id keeps each user's events in order while different users run in parallel."},
    {type:"quiz",id:"q-dlq",q:"A message fails every time it is processed and keeps being retried, blocking the worker. What is the usual remedy?",
      options:["Retry forever","Limit retries and move the message to a dead-letter queue for inspection","Delete it silently","Restart the queue"],answer:1,
      why:"A poison message should not clog the queue. After a bounded number of attempts it moves to a DLQ, where it can be alerted on, inspected and replayed after a fix."},
    {type:"explain",id:"e-queue-design",title:"Design an image-processing pipeline",
      prompt:"Users upload photos and the app must create thumbnails (CPU heavy, about 1 second each). During a big event uploads spike to 50 times normal. Design the flow using a queue and workers, and explain how you keep it from falling over: backpressure, retries, duplicates, and what the user sees.",
      rubric:"Strong answers: upload goes to object storage, request enqueues a job (id, location) and returns quickly (202 / pending state); a worker pool consumes, sized to cores and autoscaled on queue depth; results written to storage and status updated, the client polls or gets a push. Backpressure: bounded queue or rate limits per user, shedding or delaying low-priority work, 429s at the edge, alerts on queue age. Retries with backoff and jitter, max attempts, dead-letter queue. At-least-once delivery means duplicates, so the job must be idempotent (deterministic output key, overwrite is harmless, or dedupe by job id). Ordering generally unnecessary here. Mentions visibility timeout/ack after success, and monitoring (depth, age of oldest message, failures)."},
   ]},

  {id:"distributed",title:"Retries, idempotency and distributed concurrency",goal:"Retry safely across a network: timeouts, backoff with jitter, idempotency keys and optimistic concurrency.",mins:12,leetcode:[],
   blocks:[
    {md:`## The network adds a new failure: “did it work?”

When a call times out, you do not know whether the server did the work. Retrying a payment could charge twice. So you need two things: retries that don't pile on, and operations that are safe to repeat.

## Retries done well

- Always set a **timeout**. A call with no timeout can hang a worker forever.
- Retry only **transient** errors (timeouts, «503», «429», connection reset), never «400»/«404»-style errors that will fail again.
- Use **exponential backoff with jitter**: wait about «base * 2^attempt», plus a random amount, up to a cap. Without jitter, thousands of clients retry in sync and keep knocking the service over (a thundering herd).
- Cap attempts and use a **retry budget** or a **circuit breaker** so a struggling dependency isn't hit with 3x the load by its callers.

## Idempotency

An operation is **idempotent** if doing it twice has the same effect as once. «PUT» and «DELETE» are idempotent by definition; «POST /charge» is not.

Make it so with an **idempotency key**: the client generates a unique key per logical operation and sends it on every retry. The server stores the key with the result; a repeat returns the stored result instead of acting again. Other tools: upserts, conditional writes («IF NOT EXISTS»), unique constraints, deduplicating by message id.

## Concurrency across machines

- You can't use an in-process mutex across servers. Options: let the **database** arbitrate (unique constraints, conditional updates, transactions), use **optimistic versioning** (ETags and «If-Match»; “version” columns), or a **distributed lock** with a lease/expiry. Distributed locks are tricky: a client can pause (GC, network), its lease expires, and it then writes anyway. Use a **fencing token** (monotonic number the storage checks) if you truly need one.
- Prefer designs that avoid the need: partition data so one owner handles each key, and make writes commutative or idempotent.
- Clocks differ between machines, so don't use wall-clock time to order events across them.`},
    {warn:"Retrying a non-idempotent call without an idempotency key is the classic way to double-charge a customer or send two emails. State the key out loud in design interviews."},
   ],
   parts:[
    {type:"quiz",id:"q-timeout-unknown",q:"A client sends POST /payments and the request times out. What is the correct understanding?",
      options:["The payment definitely failed","The payment definitely succeeded","It is unknown whether the payment happened, so retrying needs an idempotency key","The server will cancel it automatically"],answer:2,
      why:"A timeout only tells you the client gave up waiting. The server may have processed it. With an idempotency key, the retry returns the first result instead of charging again."},
    {type:"quiz",id:"q-jitter",q:"Why add random jitter to exponential backoff?",
      options:["To make retries faster","To stop many clients from retrying at the same instants and overwhelming the service again","To avoid using timers","To make results deterministic"],answer:1,
      why:"Without jitter, clients that failed together retry together (1s, 2s, 4s, ...), producing waves of traffic. Randomizing the delay spreads the load."},
    {type:"quiz",id:"q-which-retry",q:"Which error is usually worth retrying?",
      options:["400 Bad Request","404 Not Found","503 Service Unavailable","401 Unauthorized"],answer:2,
      why:"A 503 (and timeouts, 429 with the Retry-After delay) is likely transient. The others will fail the same way, so retrying only wastes resources."},
    {type:"quiz",id:"q-idem",q:"Which HTTP method is NOT idempotent by definition?",
      options:["GET","PUT","DELETE","POST"],answer:3,
      why:"«POST» usually creates something or triggers an action each time. «GET», «PUT» and «DELETE» are defined so that repeating them leaves the same final state."},
    {type:"quiz",id:"q-lease",q:"A client takes a distributed lock with a 10 s lease, then pauses for 15 s (for example, a long GC). What can go wrong?",
      options:["Nothing, the lock is released safely","Another client acquires the lock after expiry, and the first writes when it wakes up believing it still holds the lock","The lock extends itself","The database rolls back"],answer:1,
      why:"Leases can expire while the holder is paused. A fencing token that increases on every acquisition lets the storage reject writes from the stale holder."},
    {type:"explain",id:"e-payment",title:"Make a payment endpoint safe to retry",
      prompt:"Design the client and server behaviour for «POST /payments» so that network timeouts and retries never charge a customer twice. Cover the idempotency key, what the server stores, how concurrent duplicates are handled, the client retry policy, and what you do when the same key arrives with a different request body.",
      rubric:"Strong answers: the client generates a unique key (UUID) per logical payment and sends it (e.g. Idempotency-Key header) on every retry; the server stores key -> request fingerprint and result/status in a table with a unique constraint on the key; first request inserts the key (atomically, e.g. insert-or-conflict) before charging, and later requests with the same key return the saved response, or 409/“in progress” while the first is still running (concurrent duplicates serialized by the unique constraint or a lock); the charge and the key record are made atomic, or the downstream provider is called with the same key. Same key with a different body is rejected (422/409). Keys expire after some time (e.g. 24 h). Client: timeout, retry only transient errors, exponential backoff with jitter and a cap on attempts, same key reused. Bonus: reconcile with the payment provider for unknown outcomes, and note that exactly-once is built from at-least-once plus idempotency."},
   ]},
  ],
});

// « and » stand in for backticks. Text the page renders as markdown (md, goal, prompt) gets real backticks; text it renders as plain
// strings (quiz questions, options, explanations, callouts, titles) has the markers dropped so no stray ticks show.
const MARKDOWN_FIELDS=new Set(["md","goal","prompt","rubric"]);
const fix=(v,k)=>typeof v==="string"?v.replace(/[«»]/g,MARKDOWN_FIELDS.has(k)?"`":""):
  Array.isArray(v)?v.map(x=>fix(x,k)):
  v&&typeof v==="object"?Object.fromEntries(Object.entries(v).map(([k2,x])=>[k2,fix(x,k2)])):v;
// The correct option is written second in most questions; move it to a slot derived from the question id so answers spread over A-D.
// The slot depends only on the id, so saved progress (which stores the picked index) stays valid across reloads.
const slot=(id,n)=>{let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))>>>0;return h%n};
const spread=p=>{
  if(p.type!=="quiz"||p.options.every(o=>/^[\d.:]+$/.test(o)))return p;
  const o=p.options.slice(),right=o.splice(p.answer,1)[0],to=slot(p.id,o.length+1);
  o.splice(to,0,right);
  return {...p,options:o,answer:to};
};
TRACKS.forEach(t=>{t.lessons.forEach(l=>{l.parts=l.parts.map(spread)});LEARN_TRACKS.push(fix(t))});
})();
