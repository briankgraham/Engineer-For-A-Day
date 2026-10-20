// Learning tab: the fundamentals that full-stack screens open with. Five quiz-and-explain tracks (no code exercises):
// JavaScript/TypeScript, HTTP and the web, auth and security, the browser and frontend, SQL and data.
// Same shapes as learn_data.js (see the comment at its top), with `ready: []` and `leetcode: []` because there is no LeetCode checkpoint.
// Text uses « as a stand-in for a backtick so the strings below can be template literals; the loop at the bottom swaps it back.
(function(){
const TRACKS=[];

// ---------------------------------------------------------------- JavaScript and TypeScript
TRACKS.push({
  id:"js",
  title:"JavaScript and TypeScript",
  icon:"🟨",
  tagline:"The language questions that open most full-stack screens: closures, this, the event loop, coercion and the TypeScript type system.",
  outcomes:[
    "Predict the output of short snippets involving closures, hoisting and loops",
    "Say what «this» is for any call and fix a lost «this»",
    "Order synchronous code, microtasks and timers without running the code",
    "Explain what TypeScript checks at compile time and what it cannot check at runtime",
  ],
  ready:[],
  lessons:[
  {id:"closures",title:"Scope, hoisting and closures",goal:"Know what «var», «let» and «const» do, why a loop can capture the wrong value, and what a closure really holds on to.",mins:10,leetcode:[],
   blocks:[
    {md:`## Scope and hoisting

- «var» is **function-scoped** and hoisted: the declaration moves to the top of the function and starts as «undefined».
- «let» and «const» are **block-scoped**. They are hoisted too, but reading one before its line throws a «ReferenceError» (the temporal dead zone).
- «const» stops you rebinding the name. It does not freeze the value: a «const» array can still be pushed to.

## Closures

A closure is a function together with the **variables** of the scope it was created in. It keeps the variables themselves, not a copy of their values at that moment.

«««js
function makeCounter() {
  let n = 0;
  return () => ++n;   // n lives on after makeCounter returns
}
const a = makeCounter(), b = makeCounter();
a(); a();
b();   // 1: each call to makeCounter made its own n
»»»

## The loop trap

With «var» there is one «i» for the whole loop, so every callback sees its final value. With «let», each iteration gets a fresh binding.`},
    {tip:"Interviewers like closures because they test whether you know about scope, memory and async in one question. Be ready for “write a function that can only be called once” and “implement memoize” as follow-ups."},
   ],
   parts:[
    {type:"quiz",id:"q-var-loop",q:"What does this print? for (var i = 0; i < 3; i++) setTimeout(() => console.log(i), 0);",
      options:["0 1 2","3 3 3","undefined undefined undefined","2 2 2"],answer:1,
      why:"There is a single function-scoped «i». The loop finishes (i is 3) before any timer fires, and all three callbacks read that same variable."},
    {type:"quiz",id:"q-let-loop",q:"Change var to let in that loop. What does it print now?",
      options:["3 3 3","0 1 2","0 0 0","It throws a SyntaxError"],answer:1,
      why:"A «let» in a «for» header creates a new binding for each iteration, and each callback closes over its own copy of «i»."},
    {type:"quiz",id:"q-tdz",q:"What happens here? console.log(x); let x = 1;",
      options:["Prints undefined","Prints 1","Throws a ReferenceError","Prints null"],answer:2,
      why:"«let» is hoisted but uninitialized until its line runs (the temporal dead zone). With «var» you would get «undefined» instead."},
    {type:"quiz",id:"q-closure-def",q:"What does a closure keep alive?",
      options:["A snapshot of the values at the time it was created","References to the variables in its enclosing scopes","The whole call stack of the function that created it","Only the function's parameters"],answer:1,
      why:"It holds the variables, so later changes are visible. That is also why a closure can cause a memory leak: whatever it references can't be garbage collected while the closure is alive."},
    {type:"quiz",id:"q-counter",q:"With makeCounter from the lesson: const a = makeCounter(), b = makeCounter(); a(); a(); What does b() return?",
      options:["3","1","2","0"],answer:1,
      why:"Every call to «makeCounter» creates a new «n». «a» and «b» close over different variables, so «b()» is the first increment of its own counter."},
    {type:"explain",id:"e-closure",title:"Explain closures",
      prompt:"Explain what a closure is, give one practical use (for example private state, once, memoize, or a callback that remembers something), and say why the «var» in a loop with «setTimeout» prints the same value every time.",
      rubric:"Strong answers: (1) a function plus the variables of its defining scope, kept by reference, not copied; (2) a concrete use with a tiny example; (3) the var loop shares one function-scoped variable, whereas let makes a new binding per iteration (or an IIFE/closure per iteration works around it); (4) bonus: closures can retain memory."},
   ]},
  {id:"this-proto",title:"this, prototypes and classes",goal:"Work out what «this» is at a call site, fix a lost «this», and know where class methods live.",mins:10,leetcode:[],
   blocks:[
    {md:`## What is «this»?

It is decided by **how a function is called**, not where it is written (arrow functions are the exception).

| Call | «this» |
| --- | --- |
| «obj.method()» | «obj» |
| «fn()» plain call | «undefined» in strict mode (modules, classes), the global object otherwise |
| «new Fn()» | the new object |
| «fn.call(x)», «fn.apply(x)», «fn.bind(x)» | «x» |
| arrow function | whatever «this» was where the arrow was **defined** |

«bind» returns a new function; «call» and «apply» invoke immediately (apply takes an array of arguments).

## Prototypes and classes

Reading «obj.foo» looks on the object, then on its prototype, then up the chain to «Object.prototype», then gives «undefined». A «class» is syntax over this: methods are put on «Class.prototype» and **shared** by all instances.

«««js
class Button {
  count = 0;                 // class field: one per instance
  onClick = () => this.count++;  // arrow field: per instance, this is fixed
  reset() { this.count = 0 }     // on Button.prototype: shared
}
»»»`},
    {warn:"Passing a method as a callback (<button onClick={this.save}>, arr.map(obj.method), setTimeout(obj.method)) detaches it from the object, so «this» is lost."},
   ],
   parts:[
    {type:"quiz",id:"q-lost-this",q:"In strict mode: const o = { n: 1, get() { return this.n } }; const g = o.get; g(); What happens?",
      options:["Returns 1","Returns undefined","Throws a TypeError (this is undefined)","Returns null"],answer:2,
      why:"Detached from «o», the call has no receiver. In strict mode «this» is «undefined», so «this.n» throws. In sloppy mode «this» would be the global object and you would quietly get «undefined»."},
    {type:"quiz",id:"q-arrow-this",q:"Where does an arrow function get its «this»?",
      options:["From the object it is called on","From the enclosing scope where it was defined","It is always undefined","From the nearest «bind» call"],answer:1,
      why:"Arrow functions have no own «this». They capture the surrounding one, and «call», «apply» and «bind» can't change it. That makes them handy for callbacks and unsuitable as object methods that need their own receiver."},
    {type:"quiz",id:"q-bind",q:"What does fn.bind(obj) do?",
      options:["Calls fn immediately with this = obj","Returns a new function whose this is fixed to obj","Copies obj's properties onto fn","Permanently changes fn so every future call uses obj"],answer:1,
      why:"«bind» returns a new function and leaves the original alone. Use «call» or «apply» when you want to invoke right away."},
    {type:"quiz",id:"q-proto-lookup",q:"obj.foo is read and obj has no own property foo. What happens?",
      options:["undefined immediately","JavaScript walks the prototype chain, ending at Object.prototype, then gives undefined","A ReferenceError is thrown","It is created as null"],answer:1,
      why:"Property reads follow the chain. Writes go on the object itself (unless a setter exists up the chain). That asymmetry is how shadowing works."},
    {type:"quiz",id:"q-class-method",q:"In class A { m() {} }, where does m live, and what is typeof A?",
      options:["On each instance; typeof A is 'object'","On A.prototype, shared by instances; typeof A is 'function'","On A itself as a static; typeof A is 'class'","On Object.prototype; typeof A is 'function'"],answer:1,
      why:"Classes are constructor functions with nicer syntax. Methods are shared on the prototype, while class fields (including arrow functions) are created per instance, which costs memory for every instance."},
    {type:"explain",id:"e-lost-this",title:"Fix a lost «this»",
      prompt:"A teammate's class component passes «this.handleClick» to a button, and inside the handler «this» is undefined. Explain why, and give at least three ways to fix it with their tradeoffs.",
      rubric:"Strong answers: the method is passed as a bare function, so the call has no receiver (and class bodies are strict, so this is undefined, not global). Fixes: bind in the constructor, an arrow-function class field, an inline arrow at the call site (new function each render), or avoiding classes (function components/closures). Tradeoffs: arrow fields cost per-instance memory and can't be overridden via the prototype; inline arrows break referential equality for memoized children."},
   ]},
  {id:"event-loop",title:"The event loop and async",goal:"Order synchronous code, microtasks and timers correctly, and use promises without accidental serial or lost errors.",mins:12,leetcode:[],
   blocks:[
    {md:`## One thread, one loop

JavaScript runs your code on a single thread. The event loop picks work in this order:

1. Run the current script or callback to completion (the **call stack** must empty).
2. Run **all** microtasks: «.then»/«.catch»/«.finally» callbacks, «queueMicrotask», and the code after each «await».
3. The browser may render.
4. Take the next **macrotask** (a timer such as «setTimeout», an event handler, I/O) and repeat.

«««js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// 1, 4, 3, 2
»»»

## async / await

«await x» pauses the function and schedules the rest as a microtask once «x» settles. An «async» function always returns a promise, and a «throw» inside it becomes a rejection.

## Parallel or serial?

«for (const u of urls) await fetch(u)» runs requests one after another. «await Promise.all(urls.map(fetch))» starts them together.`},
    {tip:"“What does this print?” questions almost always reduce to: sync first, then promise callbacks, then timers."},
   ],
   parts:[
    {type:"quiz",id:"q-order",q:"What is the output order? console.log(1); setTimeout(() => console.log(2), 0); Promise.resolve().then(() => console.log(3)); console.log(4);",
      options:["1 2 3 4","1 4 2 3","1 4 3 2","1 3 4 2"],answer:2,
      why:"1 and 4 are synchronous. The promise callback is a microtask and runs as soon as the stack empties. The timer is a macrotask and waits for a later turn of the loop, so: 1 4 3 2."},
    {type:"quiz",id:"q-await",q:"async function f() { console.log('a'); await null; console.log('b'); } f(); console.log('c'); prints:",
      options:["a b c","a c b","c a b","b a c"],answer:1,
      why:"«f» runs synchronously up to the first «await», printing «a». The rest of «f» is queued as a microtask, so «c» prints first. Then «b»."},
    {type:"quiz",id:"q-block",q:"Why can a long synchronous loop freeze a web page?",
      options:["Timers pause while loops run in other threads","Rendering, input events and promise callbacks all wait for the call stack to empty","The browser kills long loops after 50 ms","Loops are always run in the background for async code"],answer:1,
      why:"There is one main thread. Nothing else, including painting and click handlers, runs until your code returns. Fixes: chunk the work, move it to a Web Worker, or use less work."},
    {type:"quiz",id:"q-all",q:"Promise.all([a, b]) where a rejects after 10 ms and b would succeed after 1 s. What happens?",
      options:["It waits for both, then rejects","It rejects as soon as a rejects, with a's reason","It resolves with the successful results only","It cancels b"],answer:1,
      why:"«Promise.all» fails fast. «b» is not cancelled (promises can't be) but its result is ignored. Use «Promise.allSettled» when you want every outcome."},
    {type:"quiz",id:"q-serial",q:"for (const id of ids) { await save(id); } differs from await Promise.all(ids.map(save)) because:",
      options:["It is identical in timing","The first runs saves one at a time, the second starts them all at once","The second runs saves one at a time","The first cannot catch errors"],answer:1,
      why:"Await in a loop serializes the work. That is right when order matters or you must limit load, and wasteful when the calls are independent. For large lists you usually want a concurrency limit, not unbounded «Promise.all»."},
    {type:"explain",id:"e-loop",title:"Walk through the event loop",
      prompt:"Explain how the event loop orders synchronous code, promise callbacks and «setTimeout» callbacks, using a small example. Then say what «await» does to the rest of an async function.",
      rubric:"Strong answers: single thread; the stack runs to completion; the microtask queue (promise reactions, queueMicrotask, code after await) drains completely before the next macrotask (timers, events, I/O); rendering happens between tasks; a timer delay is a minimum, not a guarantee; await suspends the function and resumes it as a microtask when the awaited promise settles. A correct worked example earns full credit."},
   ]},
  {id:"types-equality",title:"Types, coercion and numbers",goal:"Predict what coercion does, pick between «==» and «===», and avoid the usual number traps.",mins:8,leetcode:[],
   blocks:[
    {md:`## Equality and coercion

- «===» compares without conversion. «==» converts first, with rules few people remember, so default to «===».
- «+» concatenates if either side is a string. «-», «*» and «/» always convert to numbers.
- **Falsy** values: «false», «0», «-0», «0n», «""», «null», «undefined», «NaN». Everything else is truthy, including «"0"», «[]» and «{}».
- «typeof null» is «"object"», a historical bug that can't be fixed.

## Numbers

All JavaScript numbers are 64-bit floats, so «0.1 + 0.2 !== 0.3». «NaN !== NaN»; test with «Number.isNaN». Integers are exact only up to «Number.MAX_SAFE_INTEGER» (2^53 - 1); use «BigInt» beyond that.

## Defaults

«a || b» falls back on **any falsy** value. «a ?? b» falls back only on «null» or «undefined», so «0 ?? 5» is «0».`},
    {warn:"Never store money as floating-point dollars. Use integer cents (or a decimal library) and format at the edge."},
   ],
   parts:[
    {type:"quiz",id:"q-plus",q:"What is '5' + 3 - 1 ?",
      options:["7","'531'","52","NaN"],answer:2,
      why:"Evaluated left to right: «'5' + 3» is the string «'53'», then «'53' - 1» converts to a number: 52."},
    {type:"quiz",id:"q-typeof-null",q:"What is typeof null?",
      options:["'null'","'undefined'","'object'","'number'"],answer:2,
      why:"A bug from the first version of the language that was kept for compatibility. Check «x === null» explicitly."},
    {type:"quiz",id:"q-nan",q:"How do you reliably test whether x is NaN?",
      options:["x === NaN","x == NaN","Number.isNaN(x)","typeof x === 'NaN'"],answer:2,
      why:"«NaN» is the only value not equal to itself, so equality can never detect it. «Object.is(x, NaN)» also works. Prefer «Number.isNaN» over the global «isNaN», which coerces its argument first."},
    {type:"quiz",id:"q-float",q:"Why is 0.1 + 0.2 === 0.3 false, and what do you do about money?",
      options:["JavaScript has a bug; use toFixed everywhere","Binary floats can't represent most decimals exactly; use integer cents or a decimal library","Only strings can be compared exactly","Use == instead of ==="],answer:1,
      why:"This is IEEE 754 behavior shared by most languages. For comparisons use a tolerance, and for money keep integers in the smallest unit."},
    {type:"quiz",id:"q-nullish",q:"What do (0 || 5) and (0 ?? 5) return?",
      options:["5 and 5","0 and 0","5 and 0","0 and 5"],answer:2,
      why:"«||» treats «0» as missing, which is a classic bug for counts, prices and ports. «??» only replaces «null» and «undefined»."},
    {type:"explain",id:"e-equality",title:"=== versus ==",
      prompt:"When would you use «===», «==» and «Object.is», and what are two bugs that sloppy coercion or number handling can cause in a real app?",
      rubric:"Strong answers: default to === (no coercion); == is mostly avoided, the one common accepted use is x == null for null-or-undefined; Object.is distinguishes NaN and -0. Bugs: using || for defaults swallowing 0 or empty string, string concatenation instead of addition from form input, float money, IDs above 2^53 losing precision when parsed as numbers from JSON."},
   ]},
  {id:"typescript",title:"TypeScript essentials",goal:"Use «unknown», narrowing, generics and utility types correctly, and be clear that types disappear at runtime.",mins:10,leetcode:[],
   blocks:[
    {md:`## What TypeScript is

A **compile-time** checker. Types are erased when the code is compiled, so nothing about them exists at runtime. Data from the network, a database, or «JSON.parse» is untyped until you validate it (with a schema library such as Zod, or hand-written checks).

## Structural typing

Compatibility is based on shape, not name. If an object has the needed properties, it fits.

## Narrowing

«typeof», «instanceof», «in», equality checks and discriminated unions all narrow a type inside a branch.

«««ts
type Shape = { kind: 'circle'; r: number } | { kind: 'square'; side: number };
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.r ** 2;
    case 'square': return s.side ** 2;
    default: { const _never: never = s; return _never; } // compile error if a new kind is added
  }
}
»»»

## Handy tools

- «unknown» is the safe top type: you must narrow before use. «any» turns checking off.
- Generics: «function first<T>(xs: T[]): T | undefined».
- Utility types: «Partial<T>», «Required<T>», «Readonly<T>», «Pick<T, K>», «Omit<T, K>», «Record<K, V>», «ReturnType<F>».
- «interface» and «type» overlap heavily. Interfaces can be extended and merged; type aliases can name unions and mapped types.`},
   ],
   parts:[
    {type:"quiz",id:"q-unknown",q:"What is the main difference between any and unknown?",
      options:["No difference","unknown makes you narrow the value before using it; any disables type checking","any is safer","unknown can only hold objects"],answer:1,
      why:"Use «unknown» for values you haven't validated (caught errors, parsed JSON). «any» spreads silently through the code and defeats the checker."},
    {type:"quiz",id:"q-erased",q:"Your API returns JSON and you write: const user = (await res.json()) as User. What does the compiler guarantee?",
      options:["The JSON matches User","Nothing; it only trusts your assertion","The server sends the right shape because of TypeScript","Missing fields are filled with defaults"],answer:1,
      why:"A type assertion is a promise, not a check. Types are erased, so validate at boundaries (Zod, io-ts, a hand-rolled guard) and let the validated type flow inward."},
    {type:"quiz",id:"q-structural",q:"TypeScript decides whether type A can be used where type B is expected by:",
      options:["Comparing declared names","Comparing shapes (structural typing)","Checking which file defines them","Comparing runtime constructors"],answer:1,
      why:"Two unrelated types with the same members are interchangeable. If you need to tell IDs apart (UserId vs OrderId), use a branded type."},
    {type:"quiz",id:"q-utility",q:"Which utility type builds a type with every property of T optional?",
      options:["Readonly<T>","Required<T>","Partial<T>","Pick<T>"],answer:2,
      why:"«Partial<T>» is common for update payloads. «Required» does the opposite, «Readonly» blocks assignment, and «Pick» and «Omit» select or drop keys."},
    {type:"quiz",id:"q-never",q:"What does the «never» check in the default branch of a switch over a union buy you?",
      options:["Faster runtime","A compile error when someone adds a union member and forgets to handle it","It deletes unused cases","Nothing; it's only documentation"],answer:1,
      why:"If every member has been handled, the leftover type is «never» and the assignment compiles. A new member makes it fail, pointing you at every switch that needs updating."},
    {type:"explain",id:"e-types",title:"Types versus runtime validation",
      prompt:"Explain why TypeScript doesn't remove the need for runtime validation at an API boundary, and how you would handle it in a real project. Also say when you'd use «type» versus «interface».",
      rubric:"Strong answers: types are erased and only check code you wrote against assumptions; external data (request bodies, JSON.parse, localStorage, third-party APIs) can be anything; validate with a schema library or guards and derive the TS type from the schema (z.infer) so they can't drift; fail with a clear 4xx. type vs interface: interface for object shapes you extend or merge (declaration merging, implements); type for unions, intersections, mapped and conditional types; teams mostly pick one by convention."},
   ]},
  ],
});

// ---------------------------------------------------------------- HTTP and the web
TRACKS.push({
  id:"http",
  title:"HTTP and the web platform",
  icon:"🌐",
  tagline:"Methods, status codes, caching, CORS, API styles and what really happens between typing a URL and seeing a page.",
  outcomes:[
    "Choose the right method and status code, and say which methods are safe and idempotent",
    "Set caching headers for HTML versus fingerprinted assets, and explain revalidation",
    "Explain what CORS protects, what a preflight is, and why a request is blocked",
    "Compare REST, GraphQL, polling, SSE and WebSockets and walk through a page load end to end",
  ],
  ready:[],
  lessons:[
  {id:"http-basics",title:"Methods, status codes and idempotency",goal:"Pick the right verb and status code, and know why idempotency matters for retries.",mins:9,leetcode:[],
   blocks:[
    {md:`## Methods

| Method | Meaning | Safe (no side effects) | Idempotent (repeat = same result) |
| --- | --- | --- | --- |
| GET | read | yes | yes |
| HEAD / OPTIONS | metadata | yes | yes |
| PUT | replace a resource | no | yes |
| DELETE | remove | no | yes |
| POST | create / run an action | no | **no** |
| PATCH | partial update | no | not guaranteed |

**Idempotent** means doing it twice leaves the system as it would be after doing it once. That is what makes a retry safe after a timeout. For POST you add an **idempotency key** that the server remembers (payments APIs do this).

## Status codes you should know cold

- **2xx** success: 200 OK, 201 Created (+ «Location»), 204 No Content.
- **3xx** redirects: 301/308 permanent, 302/307 temporary (307 and 308 keep the method), 304 Not Modified.
- **4xx** the client's fault: 400 bad request, 401 not authenticated, 403 not allowed, 404, 409 conflict, 422 validation failed, 429 too many requests.
- **5xx** the server's fault: 500, 502 bad gateway, 503 unavailable (+ «Retry-After»), 504 gateway timeout.`},
    {tip:"401 means “I don't know who you are”. 403 means “I know who you are and you can't do this”. People mix them up constantly, so say it out loud in an interview."},
   ],
   parts:[
    {type:"quiz",id:"q-idem",q:"A client times out on a POST /payments and retries. What protects the customer from being charged twice?",
      options:["Using PUT instead of POST in the client","An idempotency key the server stores and checks","A longer timeout","HTTPS"],answer:1,
      why:"The client can't know whether the first request succeeded. Sending the same key lets the server return the original result instead of charging again."},
    {type:"quiz",id:"q-put-post",q:"Which pair is correct?",
      options:["PUT is not idempotent, POST is","PUT is idempotent, POST is not","Both are idempotent","Neither is idempotent"],answer:1,
      why:"PUT replaces the resource with a given representation, so repeating it changes nothing further. POST typically creates a new thing each time."},
    {type:"quiz",id:"q-401",q:"A logged-in user requests another user's private order. Which response is most accurate?",
      options:["401 Unauthorized","403 Forbidden (or 404 if you don't want to reveal it exists)","400 Bad Request","500 Internal Server Error"],answer:1,
      why:"The user is authenticated but not authorized. Some APIs return 404 so they don't leak which IDs exist."},
    {type:"quiz",id:"q-redirect",q:"Which redirect keeps a POST a POST when the client follows it?",
      options:["301","302","307","304"],answer:2,
      why:"307 (temporary) and 308 (permanent) preserve the method and body. Browsers historically turned POST into GET for 301 and 302."},
    {type:"quiz",id:"q-get-body",q:"Why shouldn't a GET request change server state (for example GET /delete?id=5)?",
      options:["GET can't carry parameters","Caches, prefetchers, crawlers and retries assume GET is safe and will call it freely","GET is slower","Browsers block it"],answer:1,
      why:"Anything in the path can call a GET: link previews, prefetch, a crawler, a retry layer. State changes belong on POST, PUT, PATCH or DELETE."},
    {type:"explain",id:"e-http-design",title:"Design the responses",
      prompt:"For an «/orders» API, give the method, path and status code for: creating an order, fetching one, updating one field, cancelling it, a validation failure, a double-submit of the same create, and an unknown order ID. Briefly justify each.",
      rubric:"Strong answers: POST /orders -> 201 with Location (or 202 if async); GET /orders/{id} -> 200; PATCH /orders/{id} -> 200 or 204; cancel as DELETE (204) or POST /orders/{id}/cancel when it is a state transition with rules; validation failure -> 422 or 400 with field errors; double-submit -> idempotency key returns the original 201/200, or 409 if a duplicate is detected; unknown ID -> 404. Mentions of auth (401/403) and rate limiting (429) are a plus."},
   ]},
  {id:"caching",title:"HTTP caching",goal:"Set cache headers that make assets fast and HTML fresh, and explain revalidation with ETags.",mins:9,leetcode:[],
   blocks:[
    {md:`## The headers

- «Cache-Control: max-age=N»: reuse without asking the server for N seconds.
- «no-cache»: you **may store** it but must revalidate before each reuse. «no-store»: don't keep it at all (sensitive data).
- «public» / «private»: shared caches (CDNs) may or may not store it. «s-maxage» overrides «max-age» for shared caches.
- «immutable»: it will never change, don't bother revalidating.
- «stale-while-revalidate=N»: serve the stale copy while fetching a fresh one.

## Revalidation

The server sends «ETag: "abc"» (or «Last-Modified»). Later the client asks with «If-None-Match: "abc"». If unchanged the server answers **304 Not Modified** with no body, saving the download but not the round trip.

## The standard recipe

- **Fingerprinted assets** («app.3f9c1.js»): «Cache-Control: public, max-age=31536000, immutable». A new build gets a new name.
- **HTML** (names don't change): «no-cache», so it always revalidates and picks up the new asset names.
- **API responses**: usually «private, no-cache» or short «max-age» depending on how stale you can tolerate.
- Use «Vary» when the response depends on a request header (for example «Accept-Encoding»).`},
   ],
   parts:[
    {type:"quiz",id:"q-nocache",q:"What does Cache-Control: no-cache mean?",
      options:["Never store the response","The response may be stored, but must be revalidated with the server before reuse","Cache it for zero seconds on the CDN only","Cache it forever"],answer:1,
      why:"The name misleads everyone. «no-store» is the “do not keep it” directive."},
    {type:"quiz",id:"q-304",q:"What does a 304 response mean, and what does it save?",
      options:["The server is down; it saves nothing","The cached copy is still valid; it saves downloading the body","The resource moved permanently; it saves a DNS lookup","The request was invalid; it saves bandwidth"],answer:1,
      why:"The request was conditional (If-None-Match or If-Modified-Since). A 304 has no body, but it still costs a network round trip."},
    {type:"quiz",id:"q-fingerprint",q:"Why do build tools put a content hash in file names like app.3f9c1.js?",
      options:["To make URLs shorter","So you can cache them for a year and still ship updates, since a new build means a new URL","It is required for HTTPS","To hide the source"],answer:1,
      why:"A long max-age is only safe if the content at that URL never changes. The HTML (revalidated each time) then points at the new URLs."},
    {type:"quiz",id:"q-spa-deploy",q:"After a deploy, some users keep running the old app until they hard-refresh. The most likely cause is:",
      options:["The CDN is out of memory","index.html was served with a long max-age, so browsers never saw the new asset names","The new JS has syntax errors","DNS has not propagated"],answer:1,
      why:"The entry HTML should be «no-cache» (or very short). Everything it references can be immutable."},
    {type:"quiz",id:"q-private",q:"A response contains the logged-in user's account page. Which header is correct for a CDN in front of the site?",
      options:["Cache-Control: public, max-age=3600","Cache-Control: private (or no-store)","Cache-Control: s-maxage=3600","No header is needed"],answer:1,
      why:"A shared cache that stores a personalized page can serve it to the next visitor, which is a serious data leak. Mark per-user responses «private» or «no-store»."},
    {type:"explain",id:"e-cache-plan",title:"Plan caching for a site",
      prompt:"You're deploying a single-page app with an API behind a CDN. Describe the caching headers for the HTML shell, the hashed JS/CSS, images that rarely change, and a public «GET /products» endpoint, and how an update reaches users.",
      rubric:"Strong answers: HTML no-cache with ETag; hashed assets public, max-age one year, immutable; images either hashed or moderate max-age with revalidation; products API public with short max-age/s-maxage and stale-while-revalidate, purge or surrogate keys on change, Vary on encoding; per-user responses private. Update path: new HTML references new hashed names, so users fetch the new bundle while old URLs stay cached. Bonus: old chunk URLs during a deploy and keeping prior assets for a while."},
   ]},
  {id:"cors",title:"Same-origin policy and CORS",goal:"Explain what CORS actually protects, when a preflight happens, and how to fix a blocked request properly.",mins:9,leetcode:[],
   blocks:[
    {md:`## Origins

An **origin** is scheme + host + port. «https://app.example.com» and «https://api.example.com» are different origins, as are «http://» versus «https://» and ports 3000 versus 4000.

The **same-origin policy** stops a page on one origin from reading responses from another. **CORS** is how a server opts in to being read cross-origin, using response headers like «Access-Control-Allow-Origin».

## Key facts

- It is enforced by the **browser**. curl, Postman and other servers ignore it, so it's not an API security mechanism.
- The request usually **still reaches the server**. CORS decides whether the page may see the response.
- A **preflight** («OPTIONS» with «Origin», «Access-Control-Request-Method» and «-Headers») is sent first for non-simple requests: methods other than GET/HEAD/POST, or custom headers like «Authorization», or «Content-Type: application/json».
- With cookies («credentials: 'include'»), the server must send a specific origin (not «*») and «Access-Control-Allow-Credentials: true».
- «Access-Control-Max-Age» caches the preflight result.

## Fixing it

Allow the exact origins you trust on the server, or avoid cross-origin by serving the API under the same origin through a reverse proxy.`},
    {warn:"Reflecting any Origin header back, combined with Allow-Credentials: true, lets every website read your users' authenticated responses."},
   ],
   parts:[
    {type:"quiz",id:"q-origin",q:"Which of these is the same origin as https://shop.example.com:443/cart?",
      options:["http://shop.example.com/cart","https://shop.example.com:8443/cart","https://shop.example.com/checkout","https://api.shop.example.com/cart"],answer:2,
      why:"Same scheme, host and port (443 is the default for https). Paths don't matter. The other three differ in scheme, port or host."},
    {type:"quiz",id:"q-who-enforces",q:"Your API works in curl but fails in the browser with a CORS error. Why?",
      options:["curl is faster","CORS is enforced by browsers; the response lacked the headers allowing your page's origin","The server only supports curl","CORS blocks the request from leaving the browser"],answer:1,
      why:"The server usually did process the request. The browser withheld the response from your JavaScript because the CORS headers were missing or wrong."},
    {type:"quiz",id:"q-preflight",q:"Which request triggers a preflight OPTIONS?",
      options:["A GET to another origin with no custom headers","fetch with method DELETE or an Authorization header","Loading an image with an img tag","Submitting a plain HTML form with POST"],answer:1,
      why:"Simple cross-origin requests (GET, HEAD, and form-style POSTs with simple headers) skip it. DELETE, JSON content type and Authorization all need it."},
    {type:"quiz",id:"q-wildcard",q:"Can the server answer Access-Control-Allow-Origin: * to a request made with credentials: 'include'?",
      options:["Yes, always","No; it must echo a specific allowed origin and set Allow-Credentials: true","Only for GET","Only on HTTP"],answer:1,
      why:"A wildcard with credentials is rejected. You need an explicit allow-list, plus «Vary: Origin» so caches keep responses apart."},
    {type:"quiz",id:"q-cors-security",q:"Does CORS stop an attacker from calling your API directly with a script on their server?",
      options:["Yes, CORS blocks all unauthorized callers","No; it only restricts what browsers let web pages read, so you still need real authentication","Yes, if you use HTTPS","Only if you use cookies"],answer:1,
      why:"CORS limits web pages, not other clients. Auth and authorization on the server do the actual protecting."},
    {type:"explain",id:"e-cors-debug",title:"Debug a CORS error",
      prompt:"Your React app on «http://localhost:3000» calls «http://localhost:4000/api/me» with an «Authorization» header and gets a CORS error in the console. Explain what the browser did, what the server must return, and two ways to fix it (one dev, one production).",
      rubric:"Strong answers: different origin (port), the Authorization header makes it non-simple, so the browser sent an OPTIONS preflight; the server must answer it with 2xx plus Access-Control-Allow-Origin for the origin, -Allow-Methods and -Allow-Headers including Authorization (and Allow-Credentials if cookies), and send the Allow-Origin on the real response too. Fixes: CORS middleware with an explicit allow-list; dev proxy (Vite/webpack) or reverse proxy making it same-origin. Warn against * with credentials and reflecting arbitrary origins."},
   ]},
  {id:"apis",title:"API styles: REST, GraphQL and friends",goal:"Design REST endpoints sensibly and say when GraphQL, gRPC or webhooks fit better.",mins:10,leetcode:[],
   blocks:[
    {md:`## REST in practice

- Nouns for resources, verbs from HTTP: «GET /orders/42», «POST /orders», «DELETE /orders/42/items/7».
- **Pagination**: offset (simple, slow and unstable on big or changing tables) versus **cursor/keyset** (fast and stable, can't jump to page 50).
- **Versioning**: in the path («/v2») or a header. Prefer additive, backward-compatible changes.
- **Errors**: consistent shape with a machine-readable code and a human message.
- **Idempotency keys** for unsafe retries. **Rate limits** with 429 and «Retry-After».

## GraphQL

One endpoint, the client asks for exactly the fields it needs, and a typed schema documents everything. Wins: fewer round trips, no over-fetching, good for many differing clients. Costs: **N+1 queries** on the server unless you batch (DataLoader), harder HTTP caching (everything is POST to one URL), query-cost abuse, and more server complexity.

## Others

- **gRPC**: binary Protobuf over HTTP/2, strong contracts and streaming. Great between services, awkward from browsers.
- **Webhooks**: the server calls you when something happens; verify signatures and handle retries and duplicates.`},
   ],
   parts:[
    {type:"quiz",id:"q-cursor",q:"Why do large feeds usually use cursor (keyset) pagination instead of OFFSET?",
      options:["Offset isn't supported in SQL","Offset scans and skips rows (slow deep pages) and shifts when rows are inserted; a cursor seeks directly and stays stable","Cursors allow random page jumps","Offset needs more memory on the client"],answer:1,
      why:"«WHERE id < :last ORDER BY id DESC LIMIT 20» uses an index seek. The trade-off is you can only go next/previous, not to page 50."},
    {type:"quiz",id:"q-gql-n1",q:"What is the classic server-side performance trap in GraphQL?",
      options:["Over-fetching on the client","N+1 queries from resolving each list item's child fields separately","Too many endpoints","Slow JSON parsing"],answer:1,
      why:"A resolver for «author» runs once per post. Batch and cache per-request with DataLoader (or join in the resolver), and limit query depth and cost."},
    {type:"quiz",id:"q-grpc",q:"Where is gRPC the strongest choice?",
      options:["Public APIs consumed by many browsers","Service-to-service calls where you want strict schemas, low latency and streaming","Serving static files","Browser-only apps"],answer:1,
      why:"Protobuf is compact and typed, and HTTP/2 gives multiplexing and streams. Browsers need gRPC-Web or a gateway."},
    {type:"quiz",id:"q-webhook",q:"A payment provider sends your webhook endpoint the same event twice. What must your handler do?",
      options:["Process it twice; the provider guarantees uniqueness","Verify the signature and process idempotently, for example by recording the event ID","Return 500 to stop retries","Ignore events entirely"],answer:1,
      why:"Webhooks are at-least-once. Verify the signature so nobody can forge events, store processed IDs, and return 2xx quickly (do heavy work asynchronously)."},
    {type:"quiz",id:"q-put-patch",q:"Which fits “change only the user's display name”?",
      options:["PUT /users/42 with the full user","PATCH /users/42 with {displayName}","POST /users/42/delete","GET /users/42?name=..."],answer:1,
      why:"PATCH sends a partial update. PUT is full replacement, so a client that omits fields can wipe them."},
    {type:"explain",id:"e-rest-gql",title:"REST or GraphQL?",
      prompt:"A product has a web app, an iOS app and a partner integration, all needing different slices of the same data. Argue for REST or GraphQL (or a mix), covering caching, performance, versioning and operational cost.",
      rubric:"Strong answers take a position and weigh both: GraphQL helps differing clients and avoids over-fetching and multi-round-trips, but needs DataLoader/batching, query cost limits, persisted queries, and loses simple HTTP/CDN caching; REST is simpler to cache, monitor, rate-limit and version, but may need purpose-built endpoints or a BFF per client. A reasonable hybrid: REST for the partner API, GraphQL or a BFF for first-party clients. Mentions of schema evolution (deprecation vs versions) and auth per field/resource are a plus."},
   ]},
  {id:"transport",title:"From URL to page, and real-time options",goal:"Describe the full request path from DNS to render, compare HTTP versions, and pick polling, SSE or WebSockets.",mins:11,leetcode:[],
   blocks:[
    {md:`## What happens when you type a URL

1. **Parse** the URL; check cache and HSTS (force HTTPS).
2. **DNS**: browser, OS and resolver caches, then recursive resolution to get an IP.
3. **TCP** connection (or **QUIC** for HTTP/3), then **TLS handshake**: negotiate keys, verify the server's certificate chain.
4. Send the **HTTP request**; it may pass a CDN, load balancer, reverse proxy, app server and database.
5. The response arrives; the browser **parses HTML**, discovers CSS, JS and images, and loads them.
6. It builds the DOM and CSSOM, lays out, paints and composites; JS runs and may fetch more data.

## HTTP versions

- **HTTP/1.1**: one request at a time per connection (browsers open ~6), head-of-line blocking.
- **HTTP/2**: many requests multiplexed on one TCP connection, header compression. TCP-level blocking remains.
- **HTTP/3**: over QUIC (UDP), no TCP head-of-line blocking, faster connection setup.

## Real-time options

| Option | How | Use for |
| --- | --- | --- |
| Polling | client asks every N s | simple, low frequency |
| Long polling | request held open until data | fallback, near-real-time |
| **SSE** | one-way server → client stream over HTTP, auto-reconnect | notifications, feeds, AI token streaming |
| **WebSocket** | full-duplex over one persistent connection | chat, games, collaboration |`},
   ],
   parts:[
    {type:"quiz",id:"q-order-nav",q:"Which order is right for a first visit to https://example.com?",
      options:["TLS, DNS, TCP, HTTP","DNS, TCP, TLS, HTTP","HTTP, DNS, TLS, TCP","DNS, HTTP, TCP, TLS"],answer:1,
      why:"Resolve the name to an IP, open a connection, secure it, then send the request. (With HTTP/3 the transport and TLS setup are combined in QUIC.)"},
    {type:"quiz",id:"q-h2",q:"What problem does HTTP/2 multiplexing address?",
      options:["Insecure connections","Needing many parallel TCP connections and per-request head-of-line blocking at the HTTP layer","Slow DNS","Large cookies only"],answer:1,
      why:"Many requests share one connection as interleaved streams. HTTP/3 additionally removes TCP-level blocking by using QUIC."},
    {type:"quiz",id:"q-sse",q:"You need to stream AI response tokens and live notifications from the server to the browser only. What's the simplest fit?",
      options:["WebSockets, always","Server-Sent Events","Polling every 100 ms","gRPC directly from the browser"],answer:1,
      why:"SSE is plain HTTP, one-directional, reconnects automatically and works through most proxies. Choose WebSockets when you need the client to send frequent messages back."},
    {type:"quiz",id:"q-ws-scale",q:"What is the main operational challenge of WebSockets at scale?",
      options:["They can't be encrypted","Long-lived stateful connections: load balancing, connection limits, and routing a message to the node that holds the user's socket","They only work on localhost","They block HTTP caching of images"],answer:1,
      why:"You typically need sticky routing or a pub/sub backplane (Redis, a broker) so any node can deliver to any connected user, plus graceful draining on deploys."},
    {type:"quiz",id:"q-tls",q:"What does the TLS handshake accomplish?",
      options:["It compresses the page","It authenticates the server (certificate) and sets up shared encryption keys","It resolves DNS","It sets cookies"],answer:1,
      why:"The client verifies the certificate chain and hostname, then both sides derive session keys. After that, data is encrypted and tamper-evident."},
    {type:"explain",id:"e-url-journey",title:"What happens when you type a URL?",
      prompt:"Walk through everything that happens from typing «https://example.com» and pressing Enter until the page is interactive. Go as deep as you can on the parts you know best, and say where it can be made faster.",
      rubric:"Strong answers cover: URL parsing/HSTS, DNS (caches, recursion), TCP/QUIC, TLS (certificates, key exchange), the HTTP request through CDN/load balancer/app/DB, caching headers, HTML parsing and the critical rendering path (DOM, CSSOM, layout, paint), subresource loading, JS execution and hydration. Speed-ups: CDN and caching, keep-alive, HTTP/2 or 3, preconnect/preload, compression, fewer blocking scripts, edge rendering. Depth in a few areas beats a shallow list."},
   ]},
  ],
});

// ---------------------------------------------------------------- Auth and security
TRACKS.push({
  id:"security",
  title:"Auth and web security",
  icon:"🔐",
  tagline:"Sessions versus tokens, OAuth, the big web attacks and how to defend against them, the way interviewers ask about them.",
  outcomes:[
    "Compare server sessions and JWTs, including where to store tokens and how to revoke them",
    "Walk through the OAuth 2.0 authorization code flow with PKCE and say how OIDC differs",
    "Explain XSS, CSRF and SQL injection and the layered defenses for each",
    "Store passwords and secrets properly and spot missing authorization checks",
  ],
  ready:[],
  lessons:[
  {id:"authn",title:"Sessions, cookies and JWTs",goal:"Choose between server sessions and tokens, set cookie flags correctly, and handle expiry and revocation.",mins:10,leetcode:[],
   blocks:[
    {md:`## Authentication versus authorization

**Authentication** is who you are. **Authorization** is what you may do. Most real bugs are authorization bugs.

## Server-side sessions

After login the server stores session data (in Redis or a database) and sends the browser a random **session ID** in a cookie. Each request looks the session up.

- Easy to revoke (delete the row), small cookie, server controls everything.
- Needs a shared session store across servers.

## JWTs (stateless tokens)

A signed token carrying claims («sub», «exp», roles). Any service with the key can verify it without a lookup.

- Scales across services and fits APIs and mobile.
- Hard to revoke before «exp». Use **short-lived access tokens** (minutes) plus a **refresh token** that is stored server-side and can be rotated or revoked.
- Always verify the signature, the algorithm you expect, «exp», «aud» and «iss». A JWT is **signed, not encrypted**: anyone can read the payload.

## Cookie flags

- «HttpOnly»: JavaScript can't read it, which limits what XSS can steal.
- «Secure»: only sent over HTTPS.
- «SameSite=Lax|Strict»: not sent on most cross-site requests (CSRF defense).
- Set a sensible «Domain», «Path» and expiry.

## Where to keep a token in the browser

«localStorage» is readable by any script on the page (XSS exposure). An **HttpOnly, Secure, SameSite cookie** is not readable by JS but is sent automatically, so you also need CSRF protection.`},
   ],
   parts:[
    {type:"quiz",id:"q-revoke",q:"An employee is fired and you must cut off access immediately. Which design makes that easiest?",
      options:["A 30-day JWT in localStorage","A server-side session you can delete (or short-lived JWTs plus revocable refresh tokens)","Changing the front-end routes","Asking them to clear cookies"],answer:1,
      why:"A stateless token stays valid until it expires. Sessions, or short access tokens with a revocable refresh token, shrink that window to near zero."},
    {type:"quiz",id:"q-httponly",q:"What does the HttpOnly cookie flag protect against?",
      options:["CSRF","JavaScript (for example from an XSS bug) reading the cookie","Man-in-the-middle attacks","Cookie theft from the user's disk"],answer:1,
      why:"It blocks «document.cookie» access, so a script injected into your page can't simply exfiltrate the session. It does not stop the script from making authenticated requests as the user."},
    {type:"quiz",id:"q-jwt-payload",q:"A JWT's payload contains the user's email and role. Who can read it?",
      options:["Only the server","Anyone who has the token, because it is base64-encoded and signed but not encrypted","Only the user","Nobody; it is encrypted"],answer:1,
      why:"The signature stops tampering, not reading. Never put secrets in a JWT payload (or use JWE if you must)."},
    {type:"quiz",id:"q-alg",q:"Which JWT check prevents the “alg: none” and key-confusion class of attacks?",
      options:["Checking the token length","Enforcing the expected algorithm and key on the server instead of trusting the token's header","Using shorter tokens","Base64-decoding twice"],answer:1,
      why:"Pin the algorithm in your verification config. Use a vetted library, and never accept “none”."},
    {type:"quiz",id:"q-storage",q:"Where is the safest place for a browser app's session credential?",
      options:["localStorage","A global JS variable","An HttpOnly, Secure, SameSite cookie","The URL query string"],answer:2,
      why:"JS can't read it. Pair it with CSRF defenses (SameSite plus a token or Origin check). Nothing is safe against XSS in general, but this removes the easy theft."},
    {type:"explain",id:"e-session-jwt",title:"Sessions or JWTs?",
      prompt:"You're building login for a web app plus a mobile app and several internal services. Choose an approach (sessions, JWTs, or both) and explain token lifetime, refresh, logout, revocation and where tokens are stored on each client.",
      rubric:"Strong answers commit to a design and defend it: e.g. short-lived access JWT (5-15 min) plus rotating refresh token stored hashed server-side; web uses HttpOnly Secure SameSite cookies with CSRF protection; mobile stores in the OS keychain; logout deletes the refresh token (and optionally denylists the access token's jti); refresh-token reuse detection; services verify with a public key (JWKS) and check aud/iss/exp. Notes that a plain server session is simpler if only one web app exists."},
   ]},
  {id:"oauth",title:"OAuth 2.0 and OpenID Connect",goal:"Explain the authorization code flow with PKCE, the difference between OAuth and OIDC, and common mistakes.",mins:9,leetcode:[],
   blocks:[
    {md:`## What it's for

OAuth 2.0 lets an app act on a user's behalf **without ever seeing their password**. It's about **authorization** (access to resources). **OpenID Connect (OIDC)** adds **authentication** on top: an **ID token** (a JWT) that says who the user is, plus a standard «userinfo» endpoint.

## Roles

User (resource owner), client (your app), authorization server (login and consent), resource server (the API).

## Authorization code flow with PKCE

1. The client generates a random **code verifier** and sends its hash (**code challenge**) with a «state» value as it redirects the user to the authorization server.
2. The user logs in and consents; the server redirects back with a short-lived **authorization code** and the same «state».
3. The client checks «state», then exchanges the code **plus the original verifier** at the token endpoint for an **access token** (and a refresh token, plus an ID token with OIDC).
4. The client calls the API with the access token.

- **PKCE** stops an attacker who steals the code from using it. It is recommended for all clients, and essential for SPAs and mobile apps that can't keep a client secret.
- The **state** value protects the redirect from CSRF.
- The old **implicit flow** (token in the URL fragment) and password grant are discouraged.
- **Scopes** limit what a token can do. Ask for the minimum.`},
   ],
   parts:[
    {type:"quiz",id:"q-oauth-oidc",q:"“Sign in with Google” gives your app proof of who the user is. Which standard provides that?",
      options:["Plain OAuth 2.0 access tokens only","OpenID Connect (ID token)","SAML only","Basic auth"],answer:1,
      why:"An OAuth access token says what you may call, not who the user is. OIDC standardizes the ID token and claims."},
    {type:"quiz",id:"q-pkce",q:"What attack does PKCE defend against?",
      options:["SQL injection","An attacker intercepting the authorization code and redeeming it","Clickjacking","Weak passwords"],answer:1,
      why:"Only the client that created the verifier can redeem the code, so a stolen code is useless."},
    {type:"quiz",id:"q-state",q:"What is the «state» parameter for?",
      options:["Selecting the user's country","Binding the response to the original request to prevent CSRF/login injection","Encrypting the token","Caching"],answer:1,
      why:"The client stores a random value, sends it, and rejects any callback whose state doesn't match."},
    {type:"quiz",id:"q-spa-secret",q:"Can a single-page app safely hold a client secret?",
      options:["Yes, in an environment variable","No; anything shipped to the browser is public, so use the code flow with PKCE (a public client)","Yes, if minified","Yes, in localStorage"],answer:1,
      why:"Secrets only belong in confidential clients (servers). Public clients prove possession with PKCE instead."},
    {type:"quiz",id:"q-scope",q:"What is the purpose of OAuth scopes?",
      options:["Speeding up login","Limiting what the issued token may do (least privilege) and showing the user what they're granting","Choosing a database","Setting cookie lifetime"],answer:1,
      why:"Request only what you need. The resource server must enforce the scopes on each call."},
    {type:"explain",id:"e-oauth-flow",title:"Explain the flow",
      prompt:"Describe the OAuth 2.0 authorization code flow with PKCE for a single-page app that signs users in with an identity provider. Name each party, each redirect and each token, and say what OIDC adds.",
      rubric:"Strong answers: client creates verifier/challenge and state, redirects to the authorization endpoint; user authenticates and consents at the provider; redirect back with code and state; client verifies state and posts code + verifier to the token endpoint; receives access token (short-lived), optionally refresh token, and ID token under OIDC; calls the API with the access token as a bearer; validates ID token signature, iss, aud, exp, nonce. Mentions why implicit flow was dropped and that the client never sees the user's password."},
   ]},
  {id:"web-attacks",title:"XSS, CSRF and friends",goal:"Tell XSS from CSRF, and name the defenses that actually work for each.",mins:10,leetcode:[],
   blocks:[
    {md:`## XSS (cross-site scripting)

Attacker-controlled data ends up **executing as script** in your page, so it runs with the user's identity.

- **Stored**: saved (comment, profile) then served to others. **Reflected**: echoed from a URL. **DOM-based**: client code writes untrusted data into the DOM unsafely («innerHTML», «document.write», «eval»).
- **Defenses**: escape output for its context (frameworks like React do for text by default; «dangerouslySetInnerHTML» and «v-html» opt out), sanitize allowed HTML with a proven library, set a strict **Content-Security-Policy**, use HttpOnly cookies, and avoid inline scripts.

## CSRF (cross-site request forgery)

Another site makes the user's browser send a request to yours, and **the browser attaches the user's cookies automatically**.

- **Defenses**: «SameSite=Lax/Strict» cookies, anti-CSRF tokens, checking the «Origin»/«Referer» header, and requiring a custom header (cross-site JS can't add one without CORS permission). State changes must not use GET.
- APIs authenticated by an «Authorization» header that JS adds are not exposed to CSRF (but the token's storage then matters for XSS).

## Others worth naming

- **Clickjacking**: your page framed invisibly. Use «frame-ancestors» in CSP or «X-Frame-Options».
- **SSRF**: tricking your server into fetching internal URLs (cloud metadata). Allow-list destinations.
- **Open redirects**, **path traversal**, **insecure deserialization**, **dependency vulnerabilities** (audit and update).`},
   ],
   parts:[
    {type:"quiz",id:"q-xss-csrf",q:"Which statement distinguishes XSS from CSRF?",
      options:["XSS runs attacker code in your site's context; CSRF makes the browser send an unwanted request using the user's existing credentials","They are the same attack","CSRF needs JavaScript, XSS doesn't","XSS only affects servers"],answer:0,
      why:"XSS is code injection into your origin (so it can do anything the user can, including bypass CSRF defenses). CSRF abuses automatic cookie sending from another origin."},
    {type:"quiz",id:"q-xss-fix",q:"Users can post comments that are rendered with element.innerHTML = comment. What's the right fix?",
      options:["Strip the word “script”","Render as text (textContent / framework escaping) or sanitize with a vetted library, and add a CSP","Move to POST","Encrypt the comment"],answer:1,
      why:"Blocklists fail (event handlers, SVG, encodings). Output-encode by context, and sanitize only when you truly need to allow some HTML."},
    {type:"quiz",id:"q-samesite",q:"What does SameSite=Lax do for CSRF?",
      options:["Nothing","The cookie isn't sent on cross-site subrequests and non-top-level POSTs, which blocks the typical forged form or fetch","It encrypts the cookie","It makes the cookie HttpOnly"],answer:1,
      why:"Lax still sends the cookie on top-level GET navigations (links), which is why GET must never change state. Strict never sends it cross-site."},
    {type:"quiz",id:"q-csp",q:"What does a Content-Security-Policy mainly give you?",
      options:["Faster pages","A browser-enforced allow-list of where scripts and other resources may load or run from, limiting damage from XSS","HTTPS certificates","CORS"],answer:1,
      why:"A strict CSP (nonces or hashes, no inline script, no unsafe-eval) can stop injected scripts from running even when an escaping bug slips through."},
    {type:"quiz",id:"q-ssrf",q:"A feature lets users enter a URL and your server fetches a preview. What is the main risk?",
      options:["Slow previews","SSRF: the server can be pointed at internal addresses (metadata service, admin panels)","XSS only","Clickjacking"],answer:1,
      why:"Resolve and validate the destination (block private ranges, redirects to them, and non-HTTP schemes), use an egress proxy and give the fetcher minimal network access."},
    {type:"explain",id:"e-attacks",title:"Secure a comments feature",
      prompt:"You're adding user comments with rich text and a “delete my comment” button to a site that uses cookie sessions. Which attacks are you exposed to, and what exactly do you do about each?",
      rubric:"Strong answers: stored XSS (sanitize on input or output with a library, escape on render, CSP, HttpOnly cookies); CSRF on delete (SameSite cookies, CSRF token or Origin check, DELETE/POST not GET); authorization (IDOR: check the comment belongs to the user on the server, not by hiding the button); rate limiting/spam; injection via parameterized queries; length limits. Bonus: logging and audit trail, moderation tools."},
   ]},
  {id:"app-security",title:"Passwords, injection and authorization",goal:"Hash passwords correctly, prevent SQL injection, and avoid broken access control.",mins:10,leetcode:[],
   blocks:[
    {md:`## Passwords

- Never store plaintext, never use fast hashes (MD5, SHA-256) or encryption for passwords.
- Use a **slow, salted, adaptive** algorithm: **argon2id**, scrypt or bcrypt. The salt is random per user, stored with the hash, and defeats rainbow tables. Tune the cost as hardware gets faster.
- Add rate limiting, lockout or backoff, breached-password checks and multi-factor authentication.

## SQL injection

Building SQL by concatenating user input lets the input change the query's structure.

«««js
// vulnerable
db.query("SELECT * FROM users WHERE email = '" + email + "'");
// safe: the value travels separately from the SQL text
db.query("SELECT * FROM users WHERE email = $1", [email]);
»»»

Use **parameterized queries** (ORMs do, but raw fragments can reintroduce the bug). Identifiers and sort columns can't be parameters, so allow-list them.

## Broken access control (the top web risk)

- **IDOR**: «GET /invoices/1042» works for any logged-in user who guesses the number. Check on the server that this user may see this object, on every request.
- Enforce authorization in the backend, not by hiding UI. Default to deny, apply least privilege.

## Secrets and basics

- Keep secrets out of git and client bundles. Use a secrets manager or environment injection, rotate them, scope them narrowly.
- HTTPS everywhere with HSTS, update dependencies, don't leak stack traces, log security events but never secrets.`},
   ],
   parts:[
    {type:"quiz",id:"q-hash",q:"Which is the right way to store user passwords?",
      options:["SHA-256 of the password","AES-encrypt them with a key","argon2id or bcrypt with a per-user salt","Base64"],answer:2,
      why:"You want a deliberately slow, memory-hard hash so that stolen hashes are expensive to crack. Encryption is reversible, and fast hashes can be brute-forced at billions per second."},
    {type:"quiz",id:"q-salt",q:"What does a per-user salt prevent?",
      options:["SQL injection","Precomputed (rainbow table) attacks and identical passwords producing identical hashes","Brute force entirely","Phishing"],answer:1,
      why:"It doesn't make guessing a single password harder; the slow algorithm does that. The salt forces attackers to work per user."},
    {type:"quiz",id:"q-sqli",q:"What reliably prevents SQL injection?",
      options:["Escaping quotes by hand","Parameterized queries / prepared statements","A web application firewall alone","Hiding error messages"],answer:1,
      why:"Parameters are sent separately from the query text, so input can never be parsed as SQL. A WAF and hidden errors are extra layers, not fixes."},
    {type:"quiz",id:"q-idor",q:"GET /api/invoices/1042 returns any invoice to any logged-in user who changes the number. What is this?",
      options:["CSRF","IDOR / broken access control","XSS","A CORS misconfiguration"],answer:1,
      why:"Fix it with an ownership/permission check in the data access layer. Random IDs make guessing harder but are not an authorization strategy."},
    {type:"quiz",id:"q-secrets",q:"An API key is committed to a public repo and then deleted in the next commit. What should you do?",
      options:["Nothing; it's deleted","Treat it as compromised: revoke and rotate it, then clean up history if needed","Make the repo private only","Rename the variable"],answer:1,
      why:"Bots scan for keys within minutes and git history keeps the secret. Rotation is the only real fix."},
    {type:"explain",id:"e-login-design",title:"Design a secure login",
      prompt:"Design the backend of a login endpoint: how you store passwords, what you do about brute force and credential stuffing, how you issue the session, and what you log. Name the vulnerabilities each choice prevents.",
      rubric:"Strong answers: argon2id/bcrypt with salt and tuned cost; rate limit per account and per IP with backoff, optional CAPTCHA, MFA, breached-password checks; generic error messages (no user enumeration) and constant-ish timing; HTTPS, HttpOnly Secure SameSite session cookie with rotation on login (prevents fixation); parameterized queries; log attempts (without passwords) and alert on spikes; password reset flow with single-use expiring tokens. Bonus: passkeys/WebAuthn."},
   ]},
  ],
});

// ---------------------------------------------------------------- Browser and frontend
TRACKS.push({
  id:"browser",
  title:"Browser and frontend",
  icon:"🧭",
  tagline:"How the browser renders, how events work, how React thinks, and the performance and accessibility basics interviewers probe.",
  outcomes:[
    "Describe the critical rendering path and which CSS and JS patterns cause slowness",
    "Use event bubbling, delegation and debouncing correctly",
    "Explain React's rendering, state updates, keys and effects, and avoid the classic bugs",
    "Name the main performance techniques and accessibility requirements for a real UI",
  ],
  ready:[],
  lessons:[
  {id:"rendering",title:"How the browser renders a page",goal:"Explain the critical rendering path and what makes layout, paint and scripts slow.",mins:10,leetcode:[],
   blocks:[
    {md:`## The pipeline

1. **HTML → DOM**. The parser builds the tree as bytes arrive.
2. **CSS → CSSOM**. CSS blocks rendering: the browser won't paint until it knows the styles.
3. **Render tree** = DOM + CSSOM (without «display: none» nodes).
4. **Layout (reflow)**: compute the size and position of each box.
5. **Paint**: draw pixels into layers.
6. **Composite**: GPU combines layers.

## Scripts

- A plain «<script>» **blocks HTML parsing** while it downloads and runs.
- «defer»: download in parallel, run after parsing, in order. «async»: run as soon as downloaded, in any order. «type="module"» defers by default.

## What triggers what

- Changing size, position or content → **layout** (expensive, can cascade), then paint and composite.
- Changing color or background → paint and composite.
- Changing «transform» or «opacity» → often composite only, the cheapest, and the right choice for animation.
- **Layout thrashing**: alternating DOM reads that force layout («offsetHeight») with writes in a loop. Batch reads then writes.

## Core Web Vitals

- **LCP** (largest contentful paint): loading speed.
- **INP** (interaction to next paint): responsiveness. It replaced FID.
- **CLS** (cumulative layout shift): visual stability; set image dimensions and reserve space.`},
   ],
   parts:[
    {type:"quiz",id:"q-css-block",q:"Why is CSS considered render-blocking?",
      options:["It is large","The browser won't paint until it has the styles, to avoid showing unstyled content","It runs JavaScript","It blocks DNS"],answer:1,
      why:"Keep critical CSS small and early, and defer non-critical styles (for example with media queries or loading them asynchronously)."},
    {type:"quiz",id:"q-defer",q:"What is the difference between defer and async on a script tag?",
      options:["No difference","defer runs after parsing, in document order; async runs as soon as it arrives, in any order","async blocks parsing; defer doesn't exist","defer is only for modules"],answer:1,
      why:"Use «defer» for app scripts that depend on each other or the DOM. Use «async» for independent scripts like analytics."},
    {type:"quiz",id:"q-animate",q:"Which animation is cheapest for the browser to run smoothly?",
      options:["Animating left and top","Animating width and height","Animating transform and opacity","Animating margin"],answer:2,
      why:"Those can often be handled by the compositor on the GPU without re-running layout or paint on the main thread."},
    {type:"quiz",id:"q-thrash",q:"What is layout thrashing?",
      options:["Too many CSS files","Interleaving DOM reads that force synchronous layout with DOM writes in a loop","Using flexbox","Large images"],answer:1,
      why:"Each read after a write forces the browser to recompute layout immediately. Read everything first, then write (or use requestAnimationFrame)."},
    {type:"quiz",id:"q-cls",q:"Images popping in and pushing text down hurts which Core Web Vital, and what's the fix?",
      options:["LCP; use a CDN","CLS; set width/height or aspect-ratio so space is reserved","INP; use defer","FID; use async"],answer:1,
      why:"Reserve space for images, ads and embeds, and avoid inserting content above existing content."},
    {type:"explain",id:"e-slow-page",title:"Diagnose a slow page",
      prompt:"A product page takes 6 seconds to show its main image and feels janky when scrolling. How would you investigate and what are the most likely fixes? Use the rendering pipeline and Core Web Vitals in your answer.",
      rubric:"Strong answers measure first (Lighthouse, Performance panel, WebPageTest, field data/RUM) then reason: LCP issues from the image (size and format, responsive srcset, preload the LCP image, CDN, no lazy-loading above the fold), render-blocking CSS/JS (defer, split, critical CSS), server TTFB; jank from long main-thread tasks (break up, web worker), layout thrashing, expensive scroll handlers (passive listeners, throttle), non-composited animations, too many DOM nodes (virtualize). Mentions CLS and INP and verifying the improvement."},
   ]},
  {id:"dom-events",title:"Events, the DOM and browser storage",goal:"Use bubbling, delegation and debouncing correctly, and choose the right place to store data in the browser.",mins:9,leetcode:[],
   blocks:[
    {md:`## Event flow

An event goes **capture** (window down to the target), **target**, then **bubble** (back up). Most handlers listen in the bubble phase.

- «event.target» is the element that was clicked; «event.currentTarget» is the element the handler is attached to.
- «stopPropagation()» stops the event travelling further. «preventDefault()» cancels the browser's default action (following a link, submitting a form). They are independent.
- **Delegation**: attach one listener to a parent and use «event.target.closest(selector)». It handles elements added later and uses less memory than a listener per item.
- «focus» and «blur» don't bubble; «focusin» and «focusout» do.
- Mark scroll and touch listeners «{ passive: true }» so the browser doesn't wait to see if you cancel them.

## Debounce and throttle

**Debounce**: wait until the user stops (search-as-you-type). **Throttle**: at most once per interval (scroll, resize).

## Browser storage

| Storage | Size | Notes |
| --- | --- | --- |
| Cookies | ~4 KB | sent with **every** request; can be HttpOnly |
| localStorage | ~5 MB | synchronous, strings, persists, readable by any script on the origin |
| sessionStorage | ~5 MB | per tab, cleared when it closes |
| IndexedDB | large | async, structured data, good for offline |
| Cache API / service worker | large | request/response caching, offline |`},
   ],
   parts:[
    {type:"quiz",id:"q-delegation",q:"A list has 1,000 rows added dynamically, each with a Delete button. What's the best way to handle clicks?",
      options:["One listener on each button after every render","One listener on the list container using event.target.closest('button')","setInterval to scan for clicks","Inline onclick strings"],answer:1,
      why:"Delegation uses one handler, works for rows added later, and avoids leaking listeners."},
    {type:"quiz",id:"q-stop-prevent",q:"What is the difference between preventDefault and stopPropagation?",
      options:["They are synonyms","preventDefault cancels the browser's default action; stopPropagation stops the event from reaching other listeners up (or down) the tree","preventDefault stops bubbling","stopPropagation cancels form submission"],answer:1,
      why:"Clicking a link inside a card can need one, the other, or both. Overusing stopPropagation breaks things like analytics and outside-click detection."},
    {type:"quiz",id:"q-target",q:"In a delegated handler on <ul>, what does event.currentTarget refer to?",
      options:["The li that was clicked","The ul the handler is attached to","The document","The window"],answer:1,
      why:"«target» is where the event started; «currentTarget» is where the handler is registered."},
    {type:"quiz",id:"q-debounce",q:"For a search box calling an API on every keystroke, which technique fits?",
      options:["Throttle at 10 ms","Debounce (about 200-300 ms) and cancel stale requests","Poll the server","Disable the input"],answer:1,
      why:"Debounce fires after the user pauses. Also ignore or abort out-of-date responses (AbortController) so a slow earlier request can't overwrite a newer one."},
    {type:"quiz",id:"q-storage-choice",q:"You need to keep 50 MB of structured data for offline use. What do you use?",
      options:["Cookies","localStorage","IndexedDB (or the Cache API)","sessionStorage"],answer:2,
      why:"localStorage is small, synchronous (blocks the main thread) and string-only. IndexedDB is asynchronous and built for large structured data."},
    {type:"explain",id:"e-typeahead",title:"Build a typeahead",
      prompt:"Describe how you'd implement a search typeahead in the browser: events, debouncing, handling out-of-order responses, caching, keyboard navigation and accessibility.",
      rubric:"Strong answers: input event, debounce, minimum length, AbortController or a request counter so only the latest response renders, in-memory cache keyed by query, loading and empty states, arrow-key/Enter/Escape handling, ARIA combobox pattern (role=combobox, aria-expanded, aria-activedescendant, listbox/option roles, live region for result count), escape user-provided text when highlighting matches, mobile considerations. Bonus: server-side prefix index and rate limits."},
   ]},
  {id:"react",title:"How React thinks",goal:"Explain renders, state updates, keys and effects, and avoid the bugs interviewers ask about.",mins:12,leetcode:[],
   blocks:[
    {md:`## Rendering model

A component is a function from props and state to UI. **Rendering** means calling that function. React then compares the result to the previous one (reconciliation) and updates only the DOM that changed.

A component re-renders when its **state** changes, its **parent** re-renders, or a **context** it reads changes. Changing a prop doesn't cause it by itself: the parent rendering does.

## State rules

- Never mutate state. Create a new array or object.
- Updates are **batched** and applied on the next render, so reading state right after setting it gives the old value.
- Use the **functional form** when the new value depends on the old one: «setCount(c => c + 1)».

«««jsx
setCount(count + 1);
setCount(count + 1);
setCount(count + 1);   // count increases by 1, not 3
setCount(c => c + 1);  // each call builds on the previous: +1 each
»»»

## Keys

Keys identify list items between renders. Use a stable unique ID, not the array index if the list can reorder, insert or delete, or state can end up attached to the wrong row.

## Effects

«useEffect» runs **after** render to synchronize with something outside React (network, subscriptions, timers, the DOM). The dependency array lists everything the effect reads. Return a cleanup function. A missing dependency causes **stale closures**. Don't use an effect to compute values you can derive during render.

## Performance tools

«memo», «useMemo» and «useCallback» are optimizations, not guarantees. Measure first. Prefer moving state down, or lifting content up, before reaching for memoization.`},
   ],
   parts:[
    {type:"quiz",id:"q-batch",q:"count is 0. A handler calls setCount(count + 1) three times. What is count after the next render?",
      options:["3","1","0","It depends on timing"],answer:1,
      why:"All three calls read the same snapshot of «count» (0). Use «setCount(c => c + 1)» to chain updates."},
    {type:"quiz",id:"q-rerender",q:"What causes a component to re-render?",
      options:["Only its own state changing","Its state changing, its parent re-rendering, or a context it uses changing","Any prop being read","Calling console.log"],answer:1,
      why:"That's why moving state closer to where it's used, or wrapping expensive children in «memo», helps."},
    {type:"quiz",id:"q-key-index",q:"A todo list can be reordered and items can be deleted. What should key be?",
      options:["The array index","A stable unique ID from the data","Math.random() on each render","The item's text"],answer:1,
      why:"With index keys, React reuses component instances by position, so input text or other local state can jump to the wrong item. Random keys remount everything every render."},
    {type:"quiz",id:"q-deps",q:"useEffect(() => { const t = setInterval(() => setN(n + 1), 1000); return () => clearInterval(t); }, []); counts 1, 1, 1... Why?",
      options:["Intervals are broken in React","The callback closed over the first n (stale closure) because n isn't in the deps; use setN(n => n + 1)","The cleanup runs too early","The effect needs async"],answer:1,
      why:"With an empty dependency array the effect and its closure are created once, so «n» is always the initial value. The functional update fixes it without re-subscribing."},
    {type:"quiz",id:"q-derived",q:"You store fullName in state and update it in an effect whenever firstName or lastName changes. What's wrong?",
      options:["Nothing","It's redundant state: compute fullName during render, which avoids an extra render and sync bugs","Effects can't set state","Strings can't be state"],answer:1,
      why:"Derive values from props and state when you can. Keep effects for talking to the outside world."},
    {type:"explain",id:"e-react-perf",title:"Why is my React app slow?",
      prompt:"A list with a few thousand items, each with a text input, lags on every keystroke. Explain why this happens in terms of React's rendering model and list the fixes in the order you'd try them.",
      rubric:"Strong answers: typing updates state in a parent, so the whole list re-renders; fix by moving state down into each row or the input (colocation), memoizing rows (memo with stable props, useCallback for handlers), stable keys, deferring or debouncing updates (useDeferredValue/startTransition), and virtualizing the list (react-window/virtuoso) so only visible rows render. Verify with React DevTools Profiler before and after. Warn about premature memoization and unstable props (new object or function per render) defeating memo."},
   ]},
  {id:"perf-a11y",title:"Performance and accessibility",goal:"Know the standard front-end performance techniques and the accessibility basics you're expected to apply.",mins:9,leetcode:[],
   blocks:[
    {md:`## Performance toolbox

- **Send less**: code splitting with dynamic «import()», tree shaking, compression (gzip/brotli), modern image formats (WebP/AVIF), responsive «srcset», fonts subsetted with «font-display: swap».
- **Load smarter**: «loading="lazy"» for below-the-fold images, «preload» for the LCP image or key font, «preconnect» to critical origins, avoid blocking scripts.
- **Cache well**: hashed assets, CDN, service worker where it fits.
- **Do less work**: virtualize long lists, debounce handlers, move heavy computation to a Web Worker, avoid huge DOMs.
- Measure with Lighthouse and the Performance panel (lab), and real-user monitoring (field).

## Accessibility (a11y) basics

- Use **semantic HTML**: «<button>» for actions, «<a href>» for navigation, headings in order, «<label>» tied to inputs. A «<div onClick>» isn't focusable or keyboard-operable.
- Everything usable by **keyboard**: logical tab order, visible focus, no keyboard traps, manage focus in modals and route changes.
- **Text alternatives**: meaningful «alt» (empty alt for decorative images). Captions for media.
- **Contrast**: at least 4.5:1 for normal text (WCAG AA). Don't use color alone to convey meaning.
- **ARIA** only when native elements can't do the job; “no ARIA is better than bad ARIA”. Announce dynamic updates with live regions.
- Respect «prefers-reduced-motion» and zoom/reflow.`},
   ],
   parts:[
    {type:"quiz",id:"q-split",q:"Your initial JS bundle is 2 MB because the admin dashboard is included for everyone. What's the standard fix?",
      options:["Minify harder","Route-based code splitting with dynamic import() so the admin code loads only when needed","Inline all JS in HTML","Switch to a larger CDN"],answer:1,
      why:"Split by route or heavy feature, and prefetch likely next routes. Also analyze the bundle to find big dependencies."},
    {type:"quiz",id:"q-lazy",q:"Which image should NOT use loading='lazy'?",
      options:["Images far below the fold","The hero image that is the page's LCP element","A footer logo","Thumbnails in a long list"],answer:1,
      why:"Lazy-loading the main above-the-fold image delays it. Preload or prioritize it (e.g., fetchpriority='high')."},
    {type:"quiz",id:"q-div-button",q:"Why is <div onClick={...}> a poor replacement for <button>?",
      options:["It renders slower","It isn't focusable, has no keyboard activation or role for screen readers unless you rebuild all of that","It can't have styles","It breaks React"],answer:1,
      why:"Native elements provide focus, Enter/Space activation, roles and disabled state for free. Rebuilding them with ARIA is more work and easier to get wrong."},
    {type:"quiz",id:"q-contrast",q:"What is the WCAG AA minimum contrast ratio for normal body text?",
      options:["2:1","3:1","4.5:1","10:1"],answer:2,
      why:"Large text needs 3:1. Check with browser dev tools, and don't rely on color alone (add icons or text for errors)."},
    {type:"quiz",id:"q-modal-focus",q:"When a modal dialog opens, what should happen for keyboard and screen-reader users?",
      options:["Nothing special","Move focus into the dialog, trap it there, close on Escape, and return focus to the trigger on close","Hide the dialog from screen readers","Focus the page body"],answer:1,
      why:"The native «<dialog>» element with «showModal()» handles much of this, including making the rest of the page inert."},
    {type:"explain",id:"e-ui-checklist",title:"Review a UI for production",
      prompt:"Before launch, you review a form-heavy dashboard built by a teammate. List the performance and accessibility checks you would run and the typical problems you expect to find, with how you'd fix each.",
      rubric:"Strong answers mix both: perf (Lighthouse and profiler, bundle analysis and splitting, image optimization, virtualization, avoiding re-render storms, caching); a11y (labels and error association via aria-describedby, keyboard-only walkthrough, focus management for dialogs and validation errors, contrast, semantic landmarks and headings, screen reader smoke test, reduced motion); plus tooling (eslint-plugin-jsx-a11y, axe in CI) and responsive/zoom checks. Specific fixes beat generic advice."},
   ]},
  ],
});

// ---------------------------------------------------------------- SQL and data
TRACKS.push({
  id:"sql",
  title:"SQL and data",
  icon:"🗄️",
  tagline:"Joins and NULLs, window functions, indexes, transactions and schema design: the database half of a full-stack interview.",
  outcomes:[
    "Write and reason about joins, grouping and the NULL gotchas",
    "Use window functions for rankings, top-N-per-group and running totals",
    "Choose indexes (including column order), and read a query plan",
    "Explain isolation levels, lost updates, deadlocks, N+1 queries and safe schema changes",
  ],
  ready:[],
  lessons:[
  {id:"sql-joins",title:"Joins, grouping and NULL",goal:"Pick the right join, tell WHERE from HAVING, and avoid the three-valued-logic traps.",mins:10,leetcode:[],
   blocks:[
    {md:`The examples use «users(id, name)» and «orders(id, user_id, total, created_at)».

## Joins

- «INNER JOIN»: only rows with a match on both sides.
- «LEFT JOIN»: every row from the left, with NULLs where the right has no match. Right and full joins are rarer.
- Joining on a one-to-many relationship **multiplies** rows, so aggregates can double count. Aggregate first, then join, or count distinct.

«««sql
-- users who have never ordered
SELECT u.id, u.name
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL;
»»»

## Order of evaluation

«FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT». That's why «WHERE» filters rows before grouping and can't use aggregates, while «HAVING» filters groups after.

## NULL means unknown

- «col = NULL» is never true. Use «IS NULL» / «IS NOT NULL».
- «COUNT(*)» counts rows; «COUNT(col)» skips NULLs.
- «x NOT IN (subquery)» returns **no rows** if the subquery produces any NULL. Use «NOT EXISTS» instead.
- Putting a filter on the right table in «WHERE» turns a LEFT JOIN into an inner join; put it in the «ON» clause.`},
   ],
   parts:[
    {type:"quiz",id:"q-left",q:"SELECT u.name, COUNT(o.id) FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id, u.name. A user has no orders. What's their count?",
      options:["The user is omitted","0","NULL","1"],answer:1,
      why:"The LEFT JOIN keeps the user with NULLs for the order columns, and «COUNT(o.id)» ignores NULLs, so it's 0. «COUNT(*)» would give 1 here."},
    {type:"quiz",id:"q-having",q:"Which query finds customers with more than 5 orders?",
      options:["WHERE COUNT(*) > 5","GROUP BY user_id HAVING COUNT(*) > 5","ORDER BY COUNT(*) > 5","LIMIT 5"],answer:1,
      why:"Aggregates exist only after grouping, so the filter belongs in «HAVING». Use «WHERE» to filter rows before they're grouped (for example, only this year's orders)."},
    {type:"quiz",id:"q-null-eq",q:"SELECT * FROM users WHERE deleted_at = NULL returns:",
      options:["Users that are not deleted","All users","No rows, ever","An error"],answer:2,
      why:"Comparing to NULL yields unknown, which WHERE treats as false. Write «deleted_at IS NULL»."},
    {type:"quiz",id:"q-not-in",q:"SELECT * FROM a WHERE id NOT IN (SELECT a_id FROM b) returns nothing, though many a rows have no match. A likely cause?",
      options:["b is empty","b.a_id contains a NULL, which makes every NOT IN comparison unknown","a has no primary key","You need DISTINCT"],answer:1,
      why:"With NULL in the list, «id <> NULL» is unknown for every row. «NOT EXISTS» (or a LEFT JOIN ... IS NULL) behaves as people expect."},
    {type:"quiz",id:"q-fanout",q:"You join orders to order_items and then SUM(orders.total) per customer. The totals are too high. Why?",
      options:["SUM is broken","The join repeats each order once per item, so its total is added several times","LEFT JOIN doubles everything","GROUP BY sorts incorrectly"],answer:1,
      why:"One-to-many joins fan out rows. Sum item amounts instead, aggregate in a subquery before joining, or use «COUNT(DISTINCT ...)» where appropriate."},
    {type:"explain",id:"e-sql-write",title:"Write the queries",
      prompt:"Using «users(id, name)» and «orders(id, user_id, total, created_at)», describe (or write) SQL for: (1) the 5 customers with the highest total spend in the last 30 days, (2) users with no orders, (3) the average order value per month. Mention any NULL or join pitfalls.",
      rubric:"Strong answers: (1) JOIN or aggregate orders with WHERE created_at >= now() - interval '30 days', GROUP BY user, ORDER BY SUM(total) DESC LIMIT 5, and decide how ties are handled; (2) LEFT JOIN ... WHERE o.id IS NULL or NOT EXISTS (avoid NOT IN with NULLs); (3) date_trunc('month', created_at) GROUP BY with AVG(total), consider timezone and empty months. Awareness of fan-out, NULL totals and indexes on created_at/user_id is a plus."},
   ]},
  {id:"sql-windows",title:"Window functions and CTEs",goal:"Rank within groups, compute running totals and compare to previous rows without collapsing the result.",mins:10,leetcode:[],
   blocks:[
    {md:`## Window functions

A window function computes over a set of related rows but **keeps every row**, unlike «GROUP BY». The shape is «fn() OVER (PARTITION BY ... ORDER BY ...)».

| Function | What it does |
| --- | --- |
| «ROW_NUMBER()» | 1, 2, 3, 4 (ties broken arbitrarily) |
| «RANK()» | 1, 2, 2, 4 (gaps after ties) |
| «DENSE_RANK()» | 1, 2, 2, 3 (no gaps) |
| «LAG(x)» / «LEAD(x)» | previous / next row's value |
| «SUM(x) OVER (ORDER BY d)» | running total |

## Top N per group

Windows are evaluated after «WHERE», so you can't filter on them in the same query. Wrap with a CTE or subquery.

«««sql
WITH ranked AS (
  SELECT dept, name, salary,
         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn
  FROM employees
)
SELECT dept, name, salary FROM ranked WHERE rn <= 3;
»»»

## CTEs

«WITH name AS (...)» names a subquery to make a long query readable. Recursive CTEs walk hierarchies (org charts, category trees).`},
   ],
   parts:[
    {type:"quiz",id:"q-rank",q:"Salaries 100, 90, 90, 80 ordered descending. Which function yields 1, 2, 2, 3?",
      options:["ROW_NUMBER","RANK","DENSE_RANK","NTILE"],answer:2,
      why:"«RANK» gives 1, 2, 2, 4 and «ROW_NUMBER» gives 1, 2, 3, 4. Pick by how you want ties handled; “second highest salary” is usually «DENSE_RANK» = 2."},
    {type:"quiz",id:"q-window-vs-group",q:"What is the key difference between SUM(x) OVER (PARTITION BY g) and SELECT g, SUM(x) ... GROUP BY g?",
      options:["No difference","The window version keeps every row and attaches the group total; GROUP BY collapses to one row per group","GROUP BY is slower always","The window version needs an index"],answer:1,
      why:"Use windows when you need row detail next to an aggregate (percent of group total, running totals)."},
    {type:"quiz",id:"q-where-window",q:"Why does this fail? SELECT *, ROW_NUMBER() OVER (...) AS rn FROM t WHERE rn <= 3",
      options:["ROW_NUMBER is not allowed","WHERE runs before window functions, so rn doesn't exist yet; use a CTE or subquery","rn is a reserved word","You must use HAVING"],answer:1,
      why:"The logical order is FROM, WHERE, GROUP BY, HAVING, window functions, SELECT, ORDER BY. Compute the window in an inner query and filter outside."},
    {type:"quiz",id:"q-lag",q:"You want each day's revenue minus the previous day's. Which function?",
      options:["COUNT","LAG(revenue) OVER (ORDER BY day)","MAX","COALESCE"],answer:1,
      why:"«LAG» reads the previous row in the window order. The first row gets NULL (or a default you provide)."},
    {type:"quiz",id:"q-running",q:"What does SUM(amount) OVER (ORDER BY day) return for each row?",
      options:["The grand total","The running total up to and including that day (with ties on day sharing a value by default)","The previous day's amount","The average"],answer:1,
      why:"With an ORDER BY and no frame, the default frame runs from the start to the current row's peers. Use «ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW» for strict row-by-row."},
    {type:"explain",id:"e-nth-salary",title:"Second-highest salary",
      prompt:"Find the second-highest distinct salary in «employees(id, dept, salary)», and then the top 2 earners in each department. Explain the choice between «ROW_NUMBER», «RANK» and «DENSE_RANK», and how you'd handle fewer than two salaries.",
      rubric:"Strong answers: DENSE_RANK() = 2 in a CTE (or OFFSET 1 over SELECT DISTINCT salary ORDER BY salary DESC, wrapped to return NULL when absent); per-department top 2 with PARTITION BY dept and ROW_NUMBER for exactly 2 rows or DENSE_RANK/RANK to include ties; explains tie behavior and why the filter must happen outside the window query; handles no-second-value by returning NULL (aggregate over the subquery or scalar subquery)."},
   ]},
  {id:"sql-indexes",title:"Indexes and query plans",goal:"Say how a B-tree index helps, choose column order for composite indexes, and spot why an index isn't used.",mins:10,leetcode:[],
   blocks:[
    {md:`## What an index is

A sorted structure (usually a **B-tree**) that finds rows by key in about O(log n) instead of scanning the whole table. It also supports range queries and ordering for free.

## Costs

Every index uses space and makes each **insert, update and delete slower**, because the index must be maintained. Index what you query, not everything.

## Composite indexes

An index on «(a, b)» is sorted by «a» then «b». It serves «WHERE a = ?» and «WHERE a = ? AND b = ?» (and ordering by «b» within a fixed «a»), but generally **not** a filter on «b» alone (the leftmost-prefix rule). Put equality columns first, then range or sort columns.

A **covering index** contains every column the query needs, so the database never visits the table (an index-only scan).

## Why an index might not be used

- A function on the column: «WHERE LOWER(email) = ?» (create an expression index instead).
- A leading wildcard: «LIKE '%term'».
- Mismatched types or implicit casts.
- Low selectivity: if the filter matches a large share of rows, a scan is cheaper.
- Stale statistics.

## Reading plans

«EXPLAIN» shows the plan and «EXPLAIN ANALYZE» runs it and shows actual times and rows. Look for sequential scans on big tables, big gaps between estimated and actual rows, sorts that spill, and nested loops over large inputs.`},
   ],
   parts:[
    {type:"quiz",id:"q-leftmost",q:"There is an index on orders (user_id, created_at). Which query benefits most?",
      options:["WHERE created_at > '2025-01-01'","WHERE user_id = 7 ORDER BY created_at DESC LIMIT 20","WHERE created_at IS NULL","WHERE user_id + 1 = 8"],answer:1,
      why:"The equality on the leading column plus the sort on the second is exactly what the index is ordered for. A filter on «created_at» alone can't seek, and arithmetic on the column defeats the index."},
    {type:"quiz",id:"q-func",q:"There is an index on users(email), but WHERE LOWER(email) = 'a@b.com' does a full scan. Fix?",
      options:["Drop the index","Create an index on LOWER(email), or store a normalized email column","Use OR","Use SELECT *"],answer:1,
      why:"The index is sorted by raw «email», not «LOWER(email)». An expression index (or normalizing on write) lets the planner seek."},
    {type:"quiz",id:"q-index-cost",q:"What is the main downside of adding many indexes to a write-heavy table?",
      options:["Reads get slower","Each write must update every index, and they use storage","Indexes expire","Queries can't use joins"],answer:1,
      why:"Choose indexes that serve real queries, and drop unused ones (check usage statistics)."},
    {type:"quiz",id:"q-covering",q:"What does a covering index let the database do?",
      options:["Skip WHERE","Answer a query from the index alone without reading the table rows","Avoid locking","Compress data"],answer:1,
      why:"Fewer random reads. Postgres calls it an index-only scan, and uses «INCLUDE» columns to widen an index without affecting its sort order."},
    {type:"quiz",id:"q-selectivity",q:"A boolean column is_active is true for 98% of rows. Is an index on it useful for WHERE is_active = true?",
      options:["Yes, always","Rarely; the filter matches almost everything, so a scan is cheaper (a partial index on the rare value can help)","Only for joins","Only on MySQL"],answer:1,
      why:"Indexes pay off when the predicate is selective. Querying for the rare value (is_active = false) is the case worth indexing, perhaps as a partial index."},
    {type:"explain",id:"e-slow-query",title:"Debug a slow query",
      prompt:"A page that lists a user's latest 20 orders takes 3 seconds in production: «SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20» on a table with 50 million rows. Describe how you'd diagnose it and what you'd change.",
      rubric:"Strong answers: run EXPLAIN (ANALYZE, BUFFERS) on production-like data; likely a sequential scan or index on user_id alone followed by a sort; create composite index (user_id, created_at DESC) so the planner reads 20 rows in order; avoid SELECT * (consider covering columns); check statistics/vacuum, parameter types, and connection/ORM overhead (N+1); consider keyset pagination for further pages and caching for hot users; test index creation cost (CREATE INDEX CONCURRENTLY) and write overhead."},
   ]},
  {id:"sql-tx",title:"Transactions, isolation and N+1",goal:"Explain ACID and isolation anomalies, prevent lost updates and deadlocks, and recognize the N+1 query problem.",mins:11,leetcode:[],
   blocks:[
    {md:`## ACID

- **Atomicity**: all of a transaction's changes happen, or none.
- **Consistency**: constraints hold before and after.
- **Isolation**: concurrent transactions don't see each other's half-done work (to a degree).
- **Durability**: once committed, it survives a crash.

## Anomalies and isolation levels

| Anomaly | What happens |
| --- | --- |
| Dirty read | you read another transaction's uncommitted data |
| Non-repeatable read | the same row read twice gives different values |
| Phantom | the same query returns different rows the second time |
| Lost update / write skew | two transactions overwrite or invalidate each other's decision |

Levels from weakest: **Read Committed** (default in Postgres), **Repeatable Read** (default in MySQL InnoDB), **Serializable**. Exact guarantees differ by database, so check yours.

## Preventing lost updates

«««sql
-- broken: read, compute in the app, write back
SELECT balance FROM accounts WHERE id = 1;       -- 100
UPDATE accounts SET balance = 70 WHERE id = 1;   -- both requests write 70

-- better: do it atomically, with the check in the statement
UPDATE accounts SET balance = balance - 30 WHERE id = 1 AND balance >= 30;
»»»

Other tools: «SELECT ... FOR UPDATE» (pessimistic row lock), a **version column** checked at write time (optimistic locking), or serializable transactions with retries.

## Deadlocks

Two transactions each hold a lock the other needs. The database aborts one. Reduce them by locking rows in a consistent order, keeping transactions short, and **retrying** on a deadlock error.

## N+1 queries

Loading 100 posts, then running one query per post for its author: 101 queries. Fix with a join, an «IN (...)» batch query, or the ORM's eager loading («include», «joinedload», «select_related»).`},
   ],
   parts:[
    {type:"quiz",id:"q-lost",q:"Two requests each read balance = 100, subtract 30 in application code and write 70. What happened, and what's the best fix?",
      options:["Nothing wrong; 70 is correct","A lost update; make it one atomic UPDATE with the check, or lock/version the row","A dirty read; use READ UNCOMMITTED","A phantom; add an index"],answer:1,
      why:"The final balance should be 40. Putting the arithmetic and condition in the «UPDATE» statement is the simplest, most robust fix."},
    {type:"quiz",id:"q-phantom",q:"A transaction runs SELECT COUNT(*) FROM bookings WHERE room = 5 twice and gets different counts because another transaction inserted a booking in between. This is a:",
      options:["Dirty read","Non-repeatable read","Phantom read","Deadlock"],answer:2,
      why:"The set of rows matching the predicate changed. A non-repeatable read is the same existing row changing. Serializable (or explicit locks/constraints) prevents it."},
    {type:"quiz",id:"q-deadlock",q:"What is the most common way to avoid deadlocks between transfers A→B and B→A?",
      options:["Use larger transactions","Always lock accounts in a consistent order (for example by id) and retry on deadlock errors","Disable locks","Use a bigger server"],answer:1,
      why:"If both transactions lock the lower id first, one waits instead of forming a cycle. Retrying on a deadlock error is still part of a robust design."},
    {type:"quiz",id:"q-n1",q:"A page shows 50 posts and runs 51 SQL queries. Which is the most likely cause and fix?",
      options:["Missing index; add one","N+1: fetch authors per post inside a loop; use a join or batched IN query / eager loading","Wrong isolation level","Too many columns"],answer:1,
      why:"Look for queries inside loops or lazy-loaded relations. Log SQL in development and add a test that asserts the query count."},
    {type:"quiz",id:"q-optimistic",q:"When is optimistic locking (a version column) a better fit than SELECT ... FOR UPDATE?",
      options:["When conflicts are rare and holding locks across user think-time would be bad","When conflicts are constant","When you want to avoid retries entirely","Never"],answer:0,
      why:"Optimistic locking detects a conflict at write time («UPDATE ... WHERE version = ?», 0 rows updated means conflict) and the caller retries or shows a merge error. Pessimistic locks suit short, high-contention critical sections."},
    {type:"explain",id:"e-transfer",title:"Transfer money safely",
      prompt:"Design a funds transfer between two accounts so that money is never lost or created, even with concurrent transfers and retried requests. Cover the transaction, locking or isolation, constraints, and idempotency.",
      rubric:"Strong answers: single DB transaction with both updates; conditional debit (balance >= amount) or CHECK (balance >= 0); lock/update rows in consistent id order to avoid deadlocks, retry on deadlock/serialization failure; double-entry ledger table (append-only) with the balance derived or cached; idempotency key with a unique constraint so a retry returns the same result; use integer minor units; cross-service transfers need sagas/outbox rather than distributed transactions. Mentions audit trail and reconciliation."},
   ]},
  {id:"sql-modeling",title:"Schema design and safe changes",goal:"Model relationships, know when to denormalize, and ship schema changes without downtime.",mins:10,leetcode:[],
   blocks:[
    {md:`## Modeling basics

- **Normalize first**: each fact stored once (third normal form), so updates can't leave copies disagreeing. Denormalize deliberately for read performance, accepting the cost of keeping copies in sync.
- One-to-many: a foreign key on the "many" side. **Many-to-many**: a join table with two foreign keys (and often extra columns like role or date).
- Use constraints: primary keys, foreign keys, «NOT NULL», «UNIQUE», «CHECK». The database is the last line of defense against bad data, and a unique constraint is the only reliable way to stop duplicates under concurrency.
- **Soft deletes** («deleted_at») keep history but every query and unique constraint must account for them. Consider an archive table or partial unique indexes.
- Keys: auto-increment integers are compact and ordered; random UUIDs avoid guessing and merge easily but fragment B-tree indexes. Time-ordered IDs (UUIDv7, ULID, snowflake-style) give both.

## SQL or NoSQL?

Default to a relational database: transactions, constraints, joins and flexible queries. Choose a document, key-value, wide-column or graph store when you have a clear need (huge write scale with simple access patterns, flexible schema, caching, graph traversal).

## Changing a live schema without downtime

Use **expand and contract**:

1. Add the new column or table as nullable / with no heavy default.
2. Deploy code that writes both and reads the old.
3. Backfill in small batches.
4. Switch reads to the new shape, then stop writing the old.
5. Drop the old column in a later release.

Beware operations that take long locks: building an index (use «CREATE INDEX CONCURRENTLY» in Postgres), adding a constraint (add it as «NOT VALID», then «VALIDATE»), and rewriting a big table.`},
   ],
   parts:[
    {type:"quiz",id:"q-m2m",q:"Students enroll in many courses and courses have many students. How do you model it?",
      options:["A comma-separated list of course IDs on students","A join table enrollments(student_id, course_id) with a composite primary key","Duplicate student rows per course","A JSON column on courses"],answer:1,
      why:"The join table enforces uniqueness and supports indexes and extra attributes (enrolled_at, grade) and referential integrity."},
    {type:"quiz",id:"q-unique",q:"Two signups with the same email arrive at the same moment. How do you guarantee only one account is created?",
      options:["Check with SELECT first, then INSERT","A UNIQUE constraint (on normalized email) and handle the violation","A mutex in application memory","Hope for the best"],answer:1,
      why:"Check-then-insert races. The unique index serializes the writers, and the loser gets a constraint error you turn into a friendly message."},
    {type:"quiz",id:"q-denorm",q:"When is denormalizing (for example storing order_total on orders) reasonable?",
      options:["Always","When reads are hot, the copy is cheap to maintain, and you accept the consistency work (update in the same transaction, or rebuild)","Never","Only with NoSQL"],answer:1,
      why:"Prefer to derive values until measurements show it hurts. Then keep the copy correct deliberately (transactions, triggers, or a periodic reconcile)."},
    {type:"quiz",id:"q-migrate",q:"You must add a NOT NULL column to a 200-million-row table in production. What's the safest approach?",
      options:["ALTER TABLE ... ADD COLUMN ... NOT NULL in one step during peak hours","Expand and contract: add nullable, deploy writers, backfill in batches, then add the constraint safely (NOT VALID then VALIDATE)","Drop and recreate the table","Restart the database"],answer:1,
      why:"Big table rewrites and long locks block writes. Doing it in steps keeps the site up and gives you a rollback point at each stage."},
    {type:"quiz",id:"q-uuid",q:"What is a real downside of random UUIDv4 primary keys in a large B-tree-indexed table?",
      options:["They can't be unique","Inserts land at random places in the index, causing page splits, cache misses and bigger indexes","They are slower to read from the app","They aren't supported by ORMs"],answer:1,
      why:"Time-ordered IDs (UUIDv7, ULID) keep inserts mostly appending while staying hard to guess and generatable anywhere."},
    {type:"explain",id:"e-booking-model",title:"Model a booking system",
      prompt:"Design the tables for a room-booking system (rooms, users, bookings) and guarantee that two bookings for the same room can never overlap, even under concurrent requests. Explain the keys, constraints, indexes and how you'd roll out a later change like adding a “cancelled” state.",
      rubric:"Strong answers: tables rooms, users, bookings(room_id, user_id, start_at, end_at, status) with FKs, NOT NULL and CHECK (start_at < end_at); the overlap guarantee enforced in the database, e.g. Postgres exclusion constraint with tstzrange and GiST (EXCLUDE USING gist (room_id WITH =, tstzrange(start_at,end_at) WITH &&) WHERE status <> 'cancelled'), or locking the room row / serializable with retry when the DB lacks it, not a check-then-insert; indexes for (room_id, start_at) and (user_id, start_at); store timestamptz in UTC; rollout of the status column using expand-and-contract (nullable/default, backfill, switch code, constrain)."},
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
