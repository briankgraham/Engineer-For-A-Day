// Learning tab curriculum: tracks of lessons. Each lesson teaches with `blocks` and then practices with `parts`.
// Loaded by learn.js; checked by scripts/verify_learn.js (every reference solution must pass its tests).
//
// Blocks:  {md}                       markdown: ## headings, paragraphs, - lists, | tables |, ```code```, `inline`, **bold**
//          {tpl, title}               a code template worth memorizing (blurred while you drill from memory)
//          {tip} / {warn}             a callout
//          {viz, graph, start, title} a graph picture; viz: "graph" (static), "adj" (click a node to see its list/matrix row),
//                                     or a step-through: "dfs", "bfs", "components", "topo", "dijkstra"
//          {viz, grid, title}         a grid picture, step-through: "multiBfs" (0s are sources) or "rotting" (2 rotten, 1 fresh, 0 empty)
//                                     graph: {n, edges, directed, weighted, pos: [[x, y], ...] in a 100 x 60 box}
//          {drill: "adj"}             the adjacency-list drill (a random graph you write the adjacency list for)
// Parts:   {type: "code", id, title, prompt, fn, kind: "function" | "class", compare: "exact" | "unordered",
//           starter, solution, hint, tests: [[name, args (or {ops, args} for a class), expected], ...]}
//          {type: "quiz", id, q, options, answer (index), why}
//          {type: "explain", id, title, prompt, rubric}   free-text answer, reviewed by AI against the rubric
// leetcode: slugs from the LeetCode tab that this lesson prepares you for.
const LEARN_TRACKS=[{
  id:"graphs",
  title:"Graphs",
  icon:"🕸️",
  tagline:"From “what is an adjacency list” to Course Schedule, Dijkstra, and when a graph database earns its place.",
  outcomes:[
    "Build an adjacency list from an edge list without thinking about it",
    "Write DFS, BFS, union-find, topological sort and Dijkstra from memory",
    "Recognize which technique a graph problem is asking for",
    "Argue for or against a graph database in a system design interview",
  ],
  // The checkpoint: problems from the LeetCode tab, in the order to try them, with the lesson that prepares you for each.
  ready:[
    ["find-if-path-exists-in-graph","dfs"],["flood-fill","grids"],["number-of-islands","grids"],["max-area-of-island","grids"],
    ["keys-and-rooms","dfs"],["clone-graph","dfs"],["rotting-oranges","grids"],["01-matrix","grids"],
    ["number-of-provinces","components"],["redundant-connection","components"],["course-schedule","topo"],["course-schedule-ii","topo"],
    ["is-graph-bipartite","patterns"],["pacific-atlantic-water-flow","grids"],["network-delay-time","weighted"],
    ["cheapest-flights-within-k-stops","weighted"],["accounts-merge","components"],["word-ladder","patterns"],["alien-dictionary","topo"],
  ],
  lessons:[

// ───────────────────────────────────────────── 1
{
  id:"basics",
  title:"What a graph is",
  goal:"Name the parts of a graph, and spot graph problems that don't say “graph”.",
  mins:15,
  blocks:[
    {md:`A **graph** is a set of **vertices** (also called nodes) and **edges** that connect pairs of them. That is the whole definition.

Trees, linked lists, grids, social networks, road maps, course prerequisites and web links are all graphs. A lot of interview problems are graph problems that never use the word.`},
    {viz:"graph",title:"A small undirected graph: 6 vertices, 7 edges",graph:{n:6,edges:[[0,1],[0,2],[1,2],[1,3],[2,4],[3,4],[4,5]],pos:[[12,30],[34,12],[34,48],[60,12],[60,48],[86,30]]}},
    {md:`## The vocabulary

| Term | Meaning |
| --- | --- |
| **Directed** | Edges have a direction: \`a → b\` doesn't imply \`b → a\` (follows, prerequisites, one-way streets) |
| **Undirected** | Edges go both ways (friendships, roads) |
| **Weighted** | Each edge carries a number: distance, cost, time |
| **Path** | A sequence of vertices where each consecutive pair is joined by an edge |
| **Cycle** | A path that starts and ends at the same vertex |
| **Connected component** | A group of vertices that can all reach each other, and nothing outside it |
| **Degree** | How many edges touch a vertex. Directed graphs split it into in-degree and out-degree |
| **DAG** | Directed acyclic graph: directed, with no cycles. Dependencies and schedules are DAGs |
| **Tree** | A connected graph with no cycles. A tree with \`n\` vertices always has \`n - 1\` edges |
| **Sparse / dense** | Few edges (about V) versus many (close to V²). Real graphs are almost always sparse |`},
    {tip:"In interviews, vertices are usually numbered 0 to n-1 and edges come as a list of pairs like [[0,1],[1,2]]. Almost every solution starts by turning that list into an adjacency list. That's the next lesson."},
    {md:`## Graphs in disguise

- **A grid of land and water.** Each cell is a vertex, with edges to its up, down, left and right neighbors.
- **Word ladder** (hit → hot → dot → dog). Each word is a vertex. Words one letter apart share an edge.
- **Course prerequisites.** An edge \`prereq → course\`. "Can I finish every course?" means "is there a cycle?"
- **Accounts that share an email.** Accounts are vertices, joined when they share an email. Merging them means finding connected components.
- **A lock with 4 dials.** Each combination is a vertex, and one turn is an edge. "Fewest turns" is a shortest path.

## Questions to ask about any graph problem

1. What are the vertices and what are the edges?
2. Directed or undirected? Weighted?
3. Can it have cycles? Is it connected?
4. How big is it? V and E decide what's fast enough.
5. What's being asked: reachability, shortest path, ordering, grouping, or counting?`},
  ],
  parts:[
    {type:"quiz",id:"q-courses",q:"Courses with prerequisites (“take 101 before 201”). What kind of graph is that?",
      options:["Undirected and unweighted","Directed, and it should have no cycles (a DAG)","Weighted and undirected","Always a tree"],
      answer:1,why:"A prerequisite has a direction (101 comes before 201), and a cycle would make the courses impossible to finish. A DAG can still have a course with two prerequisites, so it isn't necessarily a tree."},
    {type:"quiz",id:"q-tree-edges",q:"A tree has 10 vertices. How many edges does it have?",
      options:["10","9","45","It depends on the shape"],answer:1,
      why:"Every connected acyclic graph on n vertices has exactly n - 1 edges. Graph Valid Tree is solved by checking this (edges.length === n - 1) and that the graph is connected."},
    {type:"quiz",id:"q-grid",q:"In “Number of Islands” (a grid of '1' land and '0' water), what are the vertices and edges?",
      options:["Each island is a vertex","Each land cell is a vertex, with an edge to each adjacent land cell up/down/left/right","Each row is a vertex","There is no graph; it's a dynamic programming problem"],
      answer:1,why:"Cells are vertices and 4-directional adjacency gives the edges. Counting islands is counting connected components. You never build an adjacency list; you compute neighbors on the fly."},
    {type:"code",id:"degrees",title:"Count degrees",fn:"degrees",
      prompt:"Given `n` vertices (0 to n-1) and an **undirected** edge list, return an array where `result[v]` is the degree of `v`: how many edges touch it.",
      starter:"function degrees(n, edges) {\n  \n}\n",
      solution:"function degrees(n, edges) {\n  const deg = new Array(n).fill(0);\n  for (const [u, v] of edges) {\n    deg[u]++;\n    deg[v]++;\n  }\n  return deg;\n}\n",
      hint:"Start with an array of n zeros. Each undirected edge [u, v] adds 1 to both ends.",
      tests:[
        ["triangle with a tail",[4,[[0,1],[1,2],[2,0],[2,3]]],[2,2,3,1]],
        ["isolated vertex",[3,[[0,1]]],[1,1,0]],
        ["no edges",[2,[]],[0,0]],
        ["star",[5,[[0,1],[0,2],[0,3],[0,4]]],[4,1,1,1,1]],
      ]},
    {type:"code",id:"sources",title:"Where could you start?",fn:"sources",
      prompt:"Given `n` vertices and a **directed** edge list (`[from, to]`), return every vertex with **in-degree 0** (no edges pointing into it), in ascending order.\n\nIn a prerequisites graph, these are the courses you can take on day one. Topological sort starts here.",
      starter:"function sources(n, edges) {\n  \n}\n",
      solution:"function sources(n, edges) {\n  const indeg = new Array(n).fill(0);\n  for (const [, to] of edges) indeg[to]++;\n  const out = [];\n  for (let v = 0; v < n; v++) if (indeg[v] === 0) out.push(v);\n  return out;\n}\n",
      hint:"Count in-degrees: each edge [from, to] adds 1 to `to` only. Then collect the vertices still at 0.",
      tests:[
        ["chain",[3,[[0,1],[1,2]]],[0]],
        ["two roots",[5,[[0,2],[1,2],[2,3],[2,4]]],[0,1]],
        ["isolated vertices count",[4,[[1,2]]],[0,1,3]],
        ["a cycle has no start",[3,[[0,1],[1,2],[2,0]]],[]],
      ]},
  ],
  leetcode:["find-the-town-judge"],
},

// ───────────────────────────────────────────── 2
{
  id:"representations",
  title:"Storing a graph",
  goal:"Turn an edge list into an adjacency list (or a matrix, or a map) from memory, and know when to use which.",
  mins:25,
  blocks:[
    {md:`The same graph can be stored three common ways. Click a vertex below to see its entry in each one.`},
    {viz:"adj",title:"One graph, three representations",graph:{n:5,edges:[[0,1],[0,2],[1,2],[1,3],[3,4]],pos:[[14,30],[38,12],[38,48],[64,30],[88,30]]}},
    {md:`- **Edge list:** \`[[0,1],[0,2],[1,2],[1,3],[3,4]]\`. This is how input usually arrives. It's compact, but answering "who are 1's neighbors?" means scanning every edge.
- **Adjacency list:** \`adj[v]\` is an array of v's neighbors. This is what nearly every graph algorithm wants.
- **Adjacency matrix:** \`m[u][v]\` is 1 if there's an edge. Checking an edge is O(1), but it costs V² space.

| | Edge list | Adjacency list | Adjacency matrix |
| --- | --- | --- | --- |
| Space | O(E) | O(V + E) | O(V²) |
| Is u–v an edge? | O(E) | O(degree of u) | O(1) |
| Visit all neighbors of u | O(E) | O(degree of u) | O(V) |
| Good for | Input, Kruskal's MST | Almost everything (BFS, DFS, Dijkstra) | Small dense graphs, Floyd–Warshall |`},
    {tpl:`// Adjacency list from an edge list. Learn this until it's automatic.
const adj = Array.from({ length: n }, () => []);
for (const [u, v] of edges) {
  adj[u].push(v);
  adj[v].push(u); // delete this line when the graph is directed
}`,title:"The template: numbered vertices"},
    {warn:"Don't write new Array(n).fill([]). fill puts the same array object in every slot, so adj[0].push(1) adds 1 to all of them. Use Array.from({ length: n }, () => []) so each vertex gets its own array."},
    {tpl:`// Vertices are labels (strings) rather than 0..n-1: use a Map.
const adj = new Map();
for (const [from, to] of pairs) {
  if (!adj.has(from)) adj.set(from, []);
  if (!adj.has(to)) adj.set(to, []);   // so leaf vertices still show up
  adj.get(from).push(to);
}

// Weighted: store [neighbor, weight] pairs.
for (const [u, v, w] of edges) adj[u].push([v, w]);`,title:"Variations: labels and weights"},
    {md:`## Implicit graphs

Sometimes you never build the graph at all. In a grid, the neighbors of \`(r, c)\` are computed on the fly. In word ladder, they're the words one letter away. The algorithm stays the same and only the "get neighbors" step changes. Grids get their own lesson.`},
    {md:`## Drill: from picture to adjacency list

This is the skill that has to become automatic. Write each vertex's neighbors as comma-separated numbers (order doesn't matter). A new random graph appears every time.`},
    {drill:"adj"},
  ],
  parts:[
    {type:"code",id:"adj-list",title:"Build an adjacency list",fn:"buildAdjList",
      prompt:"Given `n`, an edge list, and a boolean `directed`, return the adjacency list as an array of `n` arrays.\n\nAdd neighbors in the order the edges appear. For an undirected edge `[u, v]`, push `v` onto `adj[u]` first, then `u` onto `adj[v]`.",
      starter:"function buildAdjList(n, edges, directed) {\n  \n}\n",
      solution:"function buildAdjList(n, edges, directed) {\n  const adj = Array.from({ length: n }, () => []);\n  for (const [u, v] of edges) {\n    adj[u].push(v);\n    if (!directed) adj[v].push(u);\n  }\n  return adj;\n}\n",
      hint:"Array.from({ length: n }, () => []) gives each vertex its own array. Then one loop over the edges.",
      tests:[
        ["undirected",[4,[[0,1],[0,2],[1,2],[2,3]],false],[[1,2],[0,2],[0,1,3],[2]]],
        ["directed",[4,[[0,1],[0,2],[1,2],[2,3]],true],[[1,2],[2],[3],[]]],
        ["isolated vertex",[3,[[0,1]],false],[[1],[0],[]]],
        ["no edges",[2,[],true],[[],[]]],
        ["catches the fill([]) bug",[3,[[0,1]],true],[[1],[],[]]],
      ]},
    {type:"code",id:"adj-matrix",title:"Build an adjacency matrix",fn:"buildAdjMatrix",
      prompt:"Given `n` and an **undirected** edge list, return an `n × n` matrix of 0s and 1s, where `m[u][v] = 1` when u and v share an edge.",
      starter:"function buildAdjMatrix(n, edges) {\n  \n}\n",
      solution:"function buildAdjMatrix(n, edges) {\n  const m = Array.from({ length: n }, () => new Array(n).fill(0));\n  for (const [u, v] of edges) {\n    m[u][v] = 1;\n    m[v][u] = 1;\n  }\n  return m;\n}\n",
      hint:"Same trap as before: each row must be its own array. Set both m[u][v] and m[v][u].",
      tests:[
        ["path of 3",[3,[[0,1],[1,2]]],[[0,1,0],[1,0,1],[0,1,0]]],
        ["no edges",[2,[]],[[0,0],[0,0]]],
        ["two separate edges",[4,[[0,3],[1,2]]],[[0,0,0,1],[0,0,1,0],[0,1,0,0],[1,0,0,0]]],
      ]},
    {type:"code",id:"adj-map",title:"Labels instead of numbers",fn:"buildAdjMap",
      prompt:"Flights arrive as **directed** `[from, to]` pairs of airport codes. Return a plain object mapping each airport to an array of the airports it flies to, in input order. Airports with no outgoing flights still appear, with `[]`.\n\nReturn a plain object `{}`, not a `Map`, so the tests can compare it.",
      starter:"function buildAdjMap(pairs) {\n  \n}\n",
      solution:"function buildAdjMap(pairs) {\n  const adj = {};\n  for (const [from, to] of pairs) {\n    if (!adj[from]) adj[from] = [];\n    if (!adj[to]) adj[to] = [];\n    adj[from].push(to);\n  }\n  return adj;\n}\n",
      hint:"Create the entry for both ends of every pair before pushing, so destinations with no outgoing flights still get a key.",
      tests:[
        ["flights",[[["JFK","SFO"],["JFK","ATL"],["SFO","ATL"],["ATL","JFK"]]],{JFK:["SFO","ATL"],SFO:["ATL"],ATL:["JFK"]}],
        ["leaf still listed",[[["a","b"]]],{a:["b"],b:[]}],
        ["empty",[[]],{}],
      ]},
    {type:"code",id:"edge-list",title:"And back again",fn:"edgeList",
      prompt:"Given an **undirected** adjacency list, return its edge list. List each edge once as `[u, v]` with `u < v`, sorted by `u` and then `v`.",
      starter:"function edgeList(adj) {\n  \n}\n",
      solution:"function edgeList(adj) {\n  const out = [];\n  adj.forEach((nbrs, u) => {\n    for (const v of nbrs) if (u < v) out.push([u, v]);\n  });\n  return out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);\n}\n",
      hint:"Every undirected edge appears twice (in adj[u] and adj[v]). Keep only the copy where u < v, then sort.",
      tests:[
        ["four edges",[[[1,2],[0,2],[0,1,3],[2]]],[[0,1],[0,2],[1,2],[2,3]]],
        ["no edges",[[[],[]]],[]],
        ["unsorted neighbors",[[[3],[2],[1],[0]]],[[0,3],[1,2]]],
      ]},
    {type:"quiz",id:"q-sparse",q:"A social network has 1 million users and each has about 200 friends. Which representation?",
      options:["Adjacency matrix","Adjacency list","Either; they're the same size"],answer:1,
      why:"A matrix needs 10¹² cells, almost all zeros. An adjacency list needs about 2 × 10⁸ entries (each friendship stored twice). Real graphs are sparse, so the list wins."},
    {type:"quiz",id:"q-fill",q:"const adj = new Array(3).fill([]); adj[0].push(1); What is adj?",
      options:["[[1], [], []]","[[1], [1], [1]]","An error"],answer:1,
      why:"fill puts the same array object in all three slots. It's one of the most common bugs in JavaScript graph code, and an easy one to miss under interview pressure."},
    {type:"explain",id:"x-rep",title:"In your own words",
      prompt:"Explain to a teammate when you'd choose an adjacency list over an adjacency matrix, and the one situation where the matrix is the better choice.",
      rubric:"Mentions space O(V+E) vs O(V^2); real graphs are sparse; list makes iterating neighbors proportional to degree; matrix gives O(1) edge lookup and suits small dense graphs or algorithms like Floyd-Warshall; optionally a set-of-sets for O(1) lookup with sparse space."},
  ],
  leetcode:["find-the-town-judge","reconstruct-itinerary"],
},

// ───────────────────────────────────────────── 3
{
  id:"dfs",
  title:"Depth-first search",
  goal:"Write recursive and iterative DFS from memory, and know why `visited` matters.",
  mins:30,
  blocks:[
    {md:`DFS explores a graph the way you'd explore a maze with one hand on the wall: go as **deep** as you can along one path, and back up only when you hit a dead end. Recursion does the backing up for you.

Step through it below. Watch the **call stack** grow as DFS goes deeper and shrink as it backtracks. It visits neighbors in ascending order.`},
    {viz:"dfs",start:0,title:"DFS from vertex 0",graph:{n:7,edges:[[0,1],[0,2],[1,3],[1,4],[2,5],[4,5],[5,6]],pos:[[10,30],[32,14],[32,46],[56,6],[56,30],[64,52],[90,52]]}},
    {tpl:`// Recursive DFS: mark first, then recurse into unvisited neighbors.
const visited = new Array(n).fill(false);
function dfs(u) {
  visited[u] = true;
  // ...do something with u...
  for (const v of adj[u]) {
    if (!visited[v]) dfs(v);
  }
}
dfs(start);`,title:"Recursive DFS"},
    {tpl:`// Iterative DFS with an explicit stack (no recursion depth limit).
const visited = new Array(n).fill(false);
const stack = [start];
visited[start] = true;
while (stack.length) {
  const u = stack.pop();
  // ...do something with u...
  for (const v of adj[u]) {
    if (!visited[v]) {
      visited[v] = true;
      stack.push(v);
    }
  }
}`,title:"Iterative DFS"},
    {warn:"Without a visited check, DFS on an undirected graph loops forever: 0 → 1 → 0 → 1 … because every edge points both ways. Mark a vertex the moment you first reach it."},
    {tip:"JavaScript's call stack overflows at roughly 10,000 levels of recursion. If the graph could be a long chain (say 10⁵ vertices in a line), use the iterative version. Say this out loud in an interview; it's a good signal."},
    {md:`## What DFS is good for

- **Reachability:** can I get from A to B?
- **Connected components:** start a DFS from every unvisited vertex and count how many you start.
- **All paths / backtracking:** un-mark a vertex when you return, so other paths can use it.
- **Cycle detection and topological order:** these use the order DFS finishes vertices in (lesson 7).

**Complexity:** O(V + E) time, because every vertex is visited once and every edge looked at once or twice, and O(V) space for \`visited\` plus the stack.`},
  ],
  parts:[
    {type:"code",id:"has-path",title:"Is there a path?",fn:"hasPath",
      prompt:"Given `n`, an **undirected** edge list, `source` and `destination`, return `true` if there's a path between them.",
      starter:"function hasPath(n, edges, source, destination) {\n  \n}\n",
      solution:"function hasPath(n, edges, source, destination) {\n  const adj = Array.from({ length: n }, () => []);\n  for (const [u, v] of edges) {\n    adj[u].push(v);\n    adj[v].push(u);\n  }\n  const seen = new Array(n).fill(false);\n  const stack = [source];\n  seen[source] = true;\n  while (stack.length) {\n    const u = stack.pop();\n    if (u === destination) return true;\n    for (const v of adj[u]) if (!seen[v]) { seen[v] = true; stack.push(v); }\n  }\n  return false;\n}\n",
      hint:"Build the adjacency list, then DFS from source. If you ever reach destination, return true.",
      tests:[
        ["triangle",[3,[[0,1],[1,2],[2,0]],0,2],true],
        ["two islands",[6,[[0,1],[0,2],[3,5],[5,4],[4,3]],0,5],false],
        ["source is destination",[1,[],0,0],true],
        ["second component",[4,[[0,1],[2,3]],3,2],true],
      ]},
    {type:"code",id:"dfs-order",title:"Record the visit order",fn:"dfsOrder",
      prompt:"Given `n`, an **undirected** edge list and `start`, return the order in which **recursive** DFS visits vertices. Visit each vertex's neighbors in **ascending** order. Include only the vertices reachable from `start`.\n\nThis is the same traversal as the visualizer above.",
      starter:"function dfsOrder(n, edges, start) {\n  \n}\n",
      solution:"function dfsOrder(n, edges, start) {\n  const adj = Array.from({ length: n }, () => []);\n  for (const [u, v] of edges) {\n    adj[u].push(v);\n    adj[v].push(u);\n  }\n  adj.forEach(a => a.sort((x, y) => x - y));\n  const seen = new Array(n).fill(false), order = [];\n  const dfs = u => {\n    seen[u] = true;\n    order.push(u);\n    for (const v of adj[u]) if (!seen[v]) dfs(v);\n  };\n  dfs(start);\n  return order;\n}\n",
      hint:"Sort each adjacency list numerically: a.sort((x, y) => x - y). The default sort compares as strings, so 10 would come before 9.",
      tests:[
        ["diamond-ish",[6,[[0,1],[0,2],[1,3],[2,4],[3,4],[4,5]],0],[0,1,3,4,2,5]],
        ["edges out of order",[4,[[0,3],[0,1],[1,2]],0],[0,1,2,3]],
        ["only what's reachable",[4,[[0,1],[2,3]],2],[2,3]],
        ["start in the middle",[5,[[0,1],[1,2],[2,3],[3,4]],2],[2,1,0,3,4]],
        ["numeric, not string, sort",[11,[[0,10],[0,9]],0],[0,9,10]],
      ]},
    {type:"code",id:"all-paths",title:"All paths in a DAG",fn:"allPaths",
      prompt:"`graph` is the adjacency list of a **directed acyclic** graph with vertices `0..n-1`. Return every path from `0` to `n - 1`, as arrays of vertices. Any order of paths is fine.\n\nThis is DFS with backtracking: push the vertex onto the current path, recurse, then pop it off.",
      compare:"unordered",
      starter:"function allPaths(graph) {\n  \n}\n",
      solution:"function allPaths(graph) {\n  const target = graph.length - 1, out = [], path = [0];\n  const dfs = u => {\n    if (u === target) { out.push([...path]); return; }\n    for (const v of graph[u]) {\n      path.push(v);\n      dfs(v);\n      path.pop();\n    }\n  };\n  dfs(0);\n  return out;\n}\n",
      hint:"Keep one `path` array. When you reach the target, push a copy ([...path]), not path itself, because you keep mutating it. No visited set is needed here because a DAG has no cycles.",
      tests:[
        ["two routes",[[[1,2],[3],[3],[]]],[[0,1,3],[0,2,3]]],
        ["five routes",[[[4,3,1],[3,2,4],[3],[4],[]]],[[0,4],[0,3,4],[0,1,3,4],[0,1,2,3,4],[0,1,4]]],
        ["single edge",[[[1],[]]],[[0,1]]],
        ["no route",[[[],[]]],[]],
      ]},
    {type:"quiz",id:"q-visited",q:"In iterative DFS, why mark a vertex visited when you push it, rather than when you pop it?",
      options:["It's required for correctness: otherwise DFS never terminates","It stops the same vertex being pushed many times, which keeps the stack small","Popping is slower than pushing"],
      answer:1,why:"Marking on pop still terminates (you skip already-visited vertices when popped), but a vertex can be pushed once per incoming edge, so the stack can grow to O(E). Marking on push caps it at O(V). For BFS, marking on enqueue also keeps distances correct."},
  ],
  leetcode:["find-if-path-exists-in-graph","keys-and-rooms","all-paths-from-source-to-target","clone-graph"],
},

// ───────────────────────────────────────────── 4
{
  id:"bfs",
  title:"Breadth-first search",
  goal:"Use BFS to find shortest paths in unweighted graphs, and process the graph level by level.",
  mins:30,
  blocks:[
    {md:`BFS explores like a ripple in a pond. First everything 1 edge away, then everything 2 edges away, and so on. Because it reaches vertices in order of distance, **the first time BFS reaches a vertex is along a shortest path** (when every edge costs the same).

Watch the **queue**: vertices go in the back and come out the front. The number under each vertex is its distance from the start.`},
    {viz:"bfs",start:0,title:"BFS from vertex 0",graph:{n:8,edges:[[0,1],[0,2],[1,3],[2,3],[2,4],[3,5],[4,6],[5,7],[6,7]],pos:[[8,30],[28,12],[28,48],[50,18],[50,52],[72,10],[72,52],[92,30]]}},
    {tpl:`// BFS shortest distances (unweighted). JS has no queue type, so use an
// array plus a head index: q.shift() is O(n) and turns BFS into O(V²).
const dist = new Array(n).fill(-1);
const q = [start];
dist[start] = 0;
for (let head = 0; head < q.length; head++) {
  const u = q[head];
  for (const v of adj[u]) {
    if (dist[v] === -1) {        // dist doubles as "visited"
      dist[v] = dist[u] + 1;     // set it when you ENQUEUE, not when you dequeue
      q.push(v);
    }
  }
}`,title:"BFS with distances"},
    {tpl:`// Level by level: process one whole "ring" per iteration.
let frontier = [start], level = 0;
seen[start] = true;
while (frontier.length) {
  const next = [];
  for (const u of frontier) {
    for (const v of adj[u]) if (!seen[v]) { seen[v] = true; next.push(v); }
  }
  frontier = next;
  level++;
}`,title:"Level-order BFS"},
    {warn:"Mark visited when you enqueue. If you mark when you dequeue, a vertex can be enqueued several times before it's processed. That wastes work and can give wrong distances if you set dist on dequeue."},
    {md:`## BFS or DFS?

| You need | Use |
| --- | --- |
| Shortest path when every edge costs the same | **BFS** |
| "Minimum number of moves/steps/turns" | **BFS** |
| Anything level by level ("nodes k hops away") | **BFS** |
| Reachability, components, flood fill | Either one. DFS is usually shorter to write |
| All paths, backtracking, topological order via finish times | **DFS** |

Both are O(V + E).`},
  ],
  parts:[
    {type:"code",id:"shortest",title:"Fewest edges",fn:"shortestPath",
      prompt:"Given `n`, an **undirected** edge list, `src` and `dst`, return the minimum number of edges on a path from `src` to `dst`, or `-1` if there's no path.",
      starter:"function shortestPath(n, edges, src, dst) {\n  \n}\n",
      solution:"function shortestPath(n, edges, src, dst) {\n  const adj = Array.from({ length: n }, () => []);\n  for (const [u, v] of edges) {\n    adj[u].push(v);\n    adj[v].push(u);\n  }\n  const dist = new Array(n).fill(-1);\n  const q = [src];\n  dist[src] = 0;\n  for (let head = 0; head < q.length; head++) {\n    const u = q[head];\n    if (u === dst) return dist[u];\n    for (const v of adj[u]) if (dist[v] === -1) { dist[v] = dist[u] + 1; q.push(v); }\n  }\n  return -1;\n}\n",
      hint:"BFS from src with a dist array initialized to -1. Return dist[dst] at the end, or as soon as you dequeue dst.",
      tests:[
        ["shortcut through 4",[6,[[0,1],[1,2],[2,3],[0,4],[4,3],[3,5]],0,5],3],
        ["unreachable",[3,[[0,1]],0,2],-1],
        ["same vertex",[1,[],0,0],0],
        ["around the ring",[5,[[0,1],[1,2],[2,3],[3,4],[0,4]],1,4],2],
      ]},
    {type:"code",id:"levels",title:"Group by distance",fn:"bfsLevels",
      prompt:"Given `n`, an **undirected** edge list and `src`, return the vertices grouped by distance from `src`: `result[k]` holds every vertex exactly `k` edges away, in ascending order. Leave out unreachable vertices.",
      starter:"function bfsLevels(n, edges, src) {\n  \n}\n",
      solution:"function bfsLevels(n, edges, src) {\n  const adj = Array.from({ length: n }, () => []);\n  for (const [u, v] of edges) {\n    adj[u].push(v);\n    adj[v].push(u);\n  }\n  const seen = new Array(n).fill(false), levels = [];\n  let frontier = [src];\n  seen[src] = true;\n  while (frontier.length) {\n    levels.push([...frontier].sort((a, b) => a - b));\n    const next = [];\n    for (const u of frontier) for (const v of adj[u]) if (!seen[v]) { seen[v] = true; next.push(v); }\n    frontier = next;\n  }\n  return levels;\n}\n",
      hint:"Use the level-order template: each pass of the while loop is one level. Sort a copy of each frontier before saving it.",
      tests:[
        ["diamond",[6,[[0,1],[0,2],[1,3],[2,3],[3,4]],0],[[0],[1,2],[3],[4]]],
        ["single vertex",[1,[],0],[[0]]],
        ["star then leaves",[7,[[3,0],[3,1],[3,2],[0,4],[1,5],[2,6]],3],[[3],[0,1,2],[4,5,6]]],
        ["square cycle",[4,[[0,1],[1,2],[2,3],[3,0]],0],[[0],[1,3],[2]]],
      ]},
    {type:"quiz",id:"q-bfs-dfs",q:"“Minimum number of moves for a knight to reach a square.” Which traversal?",
      options:["DFS, because it explores every path","BFS, because every move costs the same","Dijkstra"],answer:1,
      why:"Every move costs 1, so BFS reaches each square first by a shortest route. DFS finds a route, not the shortest one. Dijkstra would work but is unnecessary when all weights are equal."},
    {type:"quiz",id:"q-shift",q:"Why does the template use a head index instead of q.shift()?",
      options:["shift() reverses the queue","shift() is O(n) in JavaScript arrays, making BFS O(V²) on big inputs","shift() doesn't exist"],answer:1,
      why:"shift() moves every remaining element down by one. With 10⁵ vertices that's billions of moves. A head pointer makes each dequeue O(1)."},
  ],
  leetcode:["shortest-path-in-binary-matrix","rotting-oranges","word-ladder"],
},

// ───────────────────────────────────────────── 5
{
  id:"grids",
  title:"Grids are graphs",
  goal:"Run DFS/BFS on a 2D grid without building an adjacency list, including multi-source BFS.",
  mins:30,
  blocks:[
    {md:`A grid is a graph you never have to build. Cell \`(r, c)\` is a vertex, and its neighbors are the cells next to it. Grid problems are some of the most frequently asked graph questions, and they all share the same skeleton.

\`\`\`
  1 1 0 0 0        Each 1 is land. Land cells joined up/down/left/right
  1 1 0 0 0        form an island, which is a connected component.
  0 0 1 0 0        This grid has 3 islands.
  0 0 0 1 1
\`\`\``},
    {tpl:`const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const rows = grid.length, cols = grid[0].length;

for (const [dr, dc] of DIRS) {
  const nr = r + dr, nc = c + dc;
  if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue; // off the grid
  // ...neighbor (nr, nc)...
}`,title:"Neighbors of (r, c)"},
    {tpl:`// Count islands: one DFS per unvisited land cell.
let count = 0;
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    if (grid[r][c] === 1) { count++; sink(r, c); }
  }
}
function sink(r, c) {
  if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== 1) return;
  grid[r][c] = 0;               // mark visited by changing the cell itself
  for (const [dr, dc] of DIRS) sink(r + dr, c + dc);
}`,title:"Connected regions"},
    {tip:"Changing the grid in place (land → water) saves a visited array. Ask the interviewer first: “Is it OK to modify the input?” If not, use a visited matrix or a Set of r * cols + c keys."},
    {md:`## Multi-source BFS

"Distance from every cell to the **nearest** 0" or "minutes until every orange rots" sounds like one BFS per cell, which is O((RC)²). Instead, put **all** the sources in the queue at distance 0 and run a **single** BFS. The ripples spread from every source at once, and each cell is reached first by its nearest source.

### Why one BFS is enough

Picture an invisible **super-source** vertex wired to every real source. BFS from that one vertex is ordinary single-source BFS: level 1 is all the real sources, level 2 is everything one step from any of them, and so on. We skip the invisible vertex and just start with the whole of level 0 already in the queue.

The queue is also what makes "first to arrive = nearest" true. BFS hands out cells in order of distance, so the queue only ever holds cells at distance \`d\` followed by cells at distance \`d + 1\`. If a cell has already been claimed when you reach it again, whoever claimed it was at least as close.

Step through it below. Each source gets a color, and a cell takes the color of the source that reaches it first. Watch the rings grow outward at the same speed and stop where they meet. The highlighted lines of code are the ones running at each step. Use **Next level** to jump one whole ring at a time.`},
    {viz:"multiBfs",title:"Distance to the nearest 0: all three 0s spread at once",grid:[[1,1,1,1,1,1],[1,0,1,1,1,1],[1,1,1,1,0,1],[0,1,1,1,1,1]]},
    {md:`Things to notice in the animation:

- **Seeding comes first.** All the 0s are in the queue before the first dequeue. If you ran a full BFS from one 0, then another, you'd be back to one BFS per source.
- **A cell is written once.** Marking \`dist\` when you **enqueue** (not when you dequeue) keeps a cell from entering the queue twice, so total work is O(rows × cols) however many sources there are.
- **Ties don't matter.** When two rings reach a cell on the same step, either answer for the distance is the same number. Only the color (which source) depends on dequeue order.`},
    {tpl:`const dist = grid.map(row => row.map(() => -1));
const q = [];
for (let r = 0; r < rows; r++)
  for (let c = 0; c < cols; c++)
    if (isSource(r, c)) { dist[r][c] = 0; q.push([r, c]); }

for (let head = 0; head < q.length; head++) {
  const [r, c] = q[head];
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || dist[nr][nc] !== -1) continue;
    dist[nr][nc] = dist[r][c] + 1;
    q.push([nr, nc]);
  }
}`,title:"Multi-source BFS"},
    {md:`### The same idea as a story: Rotting Oranges

Here the sources are the rotten oranges (\`2\`), \`1\` is a fresh orange, and \`0\` is an empty cell (the gray squares, which BFS never enters). Every BFS level is one **minute**. The answer is the last level reached, or **-1** if a fresh orange is never reached.`},
    {viz:"rotting",title:"Rotting oranges: two rotten oranges spread together, one level per minute",grid:[[2,1,1,1,0],[1,1,0,1,1],[0,1,1,1,2],[1,1,0,1,1]]},
    {warn:"Do not loop over the sources and run a BFS from each one, keeping the minimum. That is O(sources × cells). The fix is always the same: seed the queue with every source, then run one BFS."},
  ],
  parts:[
    {type:"code",id:"grid-nbrs",title:"Neighbors with bounds checks",fn:"gridNeighbors",compare:"unordered",
      prompt:"Return the in-bounds 4-directional neighbors of cell `(r, c)` in a `rows × cols` grid, as `[row, col]` pairs, in any order.",
      starter:"function gridNeighbors(rows, cols, r, c) {\n  \n}\n",
      solution:"function gridNeighbors(rows, cols, r, c) {\n  const out = [];\n  for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {\n    const nr = r + dr, nc = c + dc;\n    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push([nr, nc]);\n  }\n  return out;\n}\n",
      hint:"Loop over the four directions and skip anything with a row or column below 0 or past the edge.",
      tests:[
        ["center",[3,3,1,1],[[0,1],[2,1],[1,0],[1,2]]],
        ["corner",[3,3,0,0],[[1,0],[0,1]]],
        ["1×1 grid",[1,1,0,0],[]],
        ["bottom-right of 2×4",[2,4,1,3],[[0,3],[1,2]]],
      ]},
    {type:"code",id:"islands",title:"Count islands",fn:"countIslands",
      prompt:"`grid` is a 2D array of `1` (land) and `0` (water). Return the number of islands: groups of land cells connected up, down, left or right (diagonals don't count).",
      starter:"function countIslands(grid) {\n  \n}\n",
      solution:"function countIslands(grid) {\n  const rows = grid.length, cols = grid[0].length;\n  const sink = (r, c) => {\n    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== 1) return;\n    grid[r][c] = 0;\n    sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1);\n  };\n  let count = 0;\n  for (let r = 0; r < rows; r++)\n    for (let c = 0; c < cols; c++)\n      if (grid[r][c] === 1) { count++; sink(r, c); }\n  return count;\n}\n",
      hint:"Scan every cell. When you find land, add one to the count and flood-fill (sink) the whole island so you don't count it again.",
      tests:[
        ["three islands",[[[1,1,0,0,0],[1,1,0,0,0],[0,0,1,0,0],[0,0,0,1,1]]],3],
        ["all water",[[[0,0],[0,0]]],0],
        ["diagonals don't connect",[[[1,0],[0,1]]],2],
        ["one winding island",[[[1,1,1],[0,1,0],[1,1,1]]],1],
        ["single cell",[[[1]]],1],
      ]},
    {type:"code",id:"island-sizes",title:"Size of every island",fn:"islandSizes",
      prompt:"Same grid of `1`s and `0`s. Return the size (number of cells) of every island, in **ascending** order.\n\nThe change from the last exercise: your DFS has to **return** something.",
      starter:"function islandSizes(grid) {\n  \n}\n",
      solution:"function islandSizes(grid) {\n  const rows = grid.length, cols = grid[0].length;\n  const size = (r, c) => {\n    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== 1) return 0;\n    grid[r][c] = 0;\n    return 1 + size(r + 1, c) + size(r - 1, c) + size(r, c + 1) + size(r, c - 1);\n  };\n  const out = [];\n  for (let r = 0; r < rows; r++)\n    for (let c = 0; c < cols; c++)\n      if (grid[r][c] === 1) out.push(size(r, c));\n  return out.sort((a, b) => a - b);\n}\n",
      hint:"Have the DFS return 1 + the sizes returned by its four recursive calls, and 0 for water, out-of-bounds or already-visited cells.",
      tests:[
        ["three islands",[[[1,1,0,0],[1,0,0,1],[0,0,1,1],[1,0,0,0]]],[1,3,3]],
        ["no land",[[[0]]],[]],
        ["one block",[[[1,1],[1,1]]],[4]],
      ]},
    {type:"code",id:"nearest-zero",title:"Distance to the nearest 0",fn:"nearestZero",
      prompt:"`grid` holds `0`s and `1`s (at least one `0`). Return a grid of the same shape where each cell is its distance, in up/down/left/right steps, to the nearest `0`.\n\nUse a single multi-source BFS.",
      starter:"function nearestZero(grid) {\n  \n}\n",
      solution:"function nearestZero(grid) {\n  const rows = grid.length, cols = grid[0].length;\n  const dist = grid.map(row => row.map(() => -1)), q = [];\n  for (let r = 0; r < rows; r++)\n    for (let c = 0; c < cols; c++)\n      if (grid[r][c] === 0) { dist[r][c] = 0; q.push([r, c]); }\n  for (let head = 0; head < q.length; head++) {\n    const [r, c] = q[head];\n    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {\n      const nr = r + dr, nc = c + dc;\n      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || dist[nr][nc] !== -1) continue;\n      dist[nr][nc] = dist[r][c] + 1;\n      q.push([nr, nc]);\n    }\n  }\n  return dist;\n}\n",
      hint:"Seed the queue with every 0 at distance 0, then run one BFS. The first time BFS reaches a cell, that's its distance.",
      tests:[
        ["one cell far away",[[[0,0,0],[0,1,0],[1,1,1]]],[[0,0,0],[0,1,0],[1,2,1]]],
        ["a single row",[[[0,1,1,1]]],[[0,1,2,3]]],
        ["zero in the corner",[[[1,1],[1,0]]],[[2,1],[1,0]]],
      ]},
    {type:"quiz",id:"q-multi",q:"Rotting oranges: every minute, rotten oranges rot their fresh neighbors. How do you find how many minutes until everything rots?",
      options:["BFS from each fresh orange, take the max","One BFS starting from all rotten oranges at once; the answer is the last level reached","DFS from the first rotten orange"],answer:1,
      why:"That's multi-source BFS: put every rotten orange in the queue at minute 0. Each BFS level is one minute. If any fresh orange is never reached, the answer is -1."},
  ],
  leetcode:["number-of-islands","flood-fill","max-area-of-island","rotting-oranges","01-matrix","pacific-atlantic-water-flow","surrounded-regions","walls-and-gates"],
},

// ───────────────────────────────────────────── 6
{
  id:"components",
  title:"Components and union-find",
  goal:"Count connected groups with DFS, then build union-find for when edges arrive one at a time.",
  mins:35,
  blocks:[
    {md:`A **connected component** is a group of vertices that can all reach each other. The DFS way to count them: loop over every vertex, and each time you find one that isn't visited yet, that's a new component, so DFS from it to mark the whole group.`},
    {viz:"components",title:"Counting components: each new color is one more DFS from the outer loop",graph:{n:9,edges:[[0,1],[1,2],[0,2],[3,4],[5,6],[6,7],[5,7],[7,8]],pos:[[8,16],[26,8],[22,34],[46,20],[50,48],[70,10],[90,14],[78,38],[92,54]]}},
    {md:`## Union-find (disjoint set union)

Sometimes edges show up **one at a time** and you need to answer "are these two connected yet?" after each one. Re-running DFS each time would be slow. **Union-find** keeps each group as a tree with a representative (its root):

- \`find(x)\` follows parent pointers up to the root. **Path compression** points everything on that path straight at the root, so the next call is faster.
- \`union(a, b)\` finds both roots and, if they differ, hangs the smaller tree under the bigger one (**union by size**).

With both tricks, each operation is effectively O(1). (It's technically O(α(n)), the inverse Ackermann function, which is under 5 for any input you'll ever see.)`},
    {tpl:`class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i); // everyone is their own root
    this.size = new Array(n).fill(1);
    this.groups = n;
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]; // path compression (halving)
      x = this.parent[x];
    }
    return x;
  }
  union(a, b) {
    let ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false;                    // already connected: this edge closes a cycle
    if (this.size[ra] < this.size[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;                           // smaller tree under the bigger one
    this.size[ra] += this.size[rb];
    this.groups--;
    return true;
  }
}`,title:"Union-find"},
    {md:`## DFS or union-find?

| Situation | Reach for |
| --- | --- |
| The graph is given all at once and you need the components | DFS/BFS (simpler) |
| Edges arrive one by one, with "connected yet?" questions in between | **Union-find** |
| "Which edge creates a cycle?" in an undirected graph | **Union-find**: \`union\` returns false |
| Merging things that share a key (accounts sharing emails) | **Union-find** |
| Kruskal's minimum spanning tree | **Union-find** |`},
  ],
  parts:[
    {type:"code",id:"count-components",title:"Count components",fn:"countComponents",
      prompt:"Given `n` and an **undirected** edge list, return how many connected components there are. Isolated vertices count as their own component.",
      starter:"function countComponents(n, edges) {\n  \n}\n",
      solution:"function countComponents(n, edges) {\n  const adj = Array.from({ length: n }, () => []);\n  for (const [u, v] of edges) {\n    adj[u].push(v);\n    adj[v].push(u);\n  }\n  const seen = new Array(n).fill(false);\n  let count = 0;\n  for (let s = 0; s < n; s++) {\n    if (seen[s]) continue;\n    count++;\n    const stack = [s];\n    seen[s] = true;\n    while (stack.length) {\n      const u = stack.pop();\n      for (const v of adj[u]) if (!seen[v]) { seen[v] = true; stack.push(v); }\n    }\n  }\n  return count;\n}\n",
      hint:"Outer loop over every vertex. Each unvisited vertex you find starts a new component; DFS from it to mark the rest of the group.",
      tests:[
        ["two groups",[5,[[0,1],[1,2],[3,4]]],2],
        ["one chain",[5,[[0,1],[1,2],[2,3],[3,4]]],1],
        ["no edges",[4,[]],4],
        ["duplicate edge and loners",[6,[[0,1],[2,3],[1,0]]],4],
      ]},
    {type:"code",id:"union-find",title:"Build union-find",fn:"UnionFind",kind:"class",
      prompt:"Implement `class UnionFind`:\n\n- `constructor(n)`: vertices `0..n-1`, each in its own group\n- `find(x)`: the representative (root) of x's group\n- `union(a, b)`: merge the two groups; return `true` if they were separate, `false` if already connected\n- `connected(a, b)`: `true` if a and b are in the same group\n- `count()`: the current number of groups\n\nUse path compression and union by size. Try writing it without looking at the template above.",
      starter:"class UnionFind {\n  constructor(n) {\n    \n  }\n  find(x) {\n    \n  }\n  union(a, b) {\n    \n  }\n  connected(a, b) {\n    \n  }\n  count() {\n    \n  }\n}\n",
      solution:"class UnionFind {\n  constructor(n) {\n    this.parent = Array.from({ length: n }, (_, i) => i);\n    this.size = new Array(n).fill(1);\n    this.groups = n;\n  }\n  find(x) {\n    while (this.parent[x] !== x) {\n      this.parent[x] = this.parent[this.parent[x]];\n      x = this.parent[x];\n    }\n    return x;\n  }\n  union(a, b) {\n    let ra = this.find(a), rb = this.find(b);\n    if (ra === rb) return false;\n    if (this.size[ra] < this.size[rb]) [ra, rb] = [rb, ra];\n    this.parent[rb] = ra;\n    this.size[ra] += this.size[rb];\n    this.groups--;\n    return true;\n  }\n  connected(a, b) {\n    return this.find(a) === this.find(b);\n  }\n  count() {\n    return this.groups;\n  }\n}\n",
      hint:"parent[i] = i to start. find walks up until parent[x] === x. union links one root under the other and decrements the group count only when the roots differ.",
      tests:[
        ["basic merges",{ops:["UnionFind","count","union","union","connected","connected","union","count"],args:[[5],[],[0,1],[1,2],[0,2],[0,3],[0,2],[]]},[null,5,true,true,true,false,false,3]],
        ["merging groups",{ops:["UnionFind","union","union","union","connected","connected","count"],args:[[6],[0,1],[2,3],[1,3],[0,2],[4,5],[]]},[null,true,true,true,true,false,3]],
        ["one vertex",{ops:["UnionFind","count","connected","union","count"],args:[[1],[],[0,0],[0,0],[]]},[null,1,true,false,1]],
        ["long chain stays fast",{ops:["UnionFind",...Array(2000).fill("union"),"connected","count"],args:[[2001],...Array.from({length:2000},(_,i)=>[i,i+1]),[0,2000],[]]},[null,...Array(2000).fill(true),true,1]],
      ]},
    {type:"code",id:"redundant",title:"The edge that closes a cycle",fn:"redundantEdge",
      prompt:"Edges of an **undirected** graph with `n` vertices arrive in the order given. Return the **first** edge whose two endpoints were already connected, because adding it creates a cycle. Return `[]` if no edge does.",
      starter:"function redundantEdge(n, edges) {\n  \n}\n",
      solution:"function redundantEdge(n, edges) {\n  const parent = Array.from({ length: n }, (_, i) => i);\n  const find = x => {\n    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }\n    return x;\n  };\n  for (const [u, v] of edges) {\n    const ru = find(u), rv = find(v);\n    if (ru === rv) return [u, v];\n    parent[ru] = rv;\n  }\n  return [];\n}\n",
      hint:"Union each edge in order. The first time both ends already have the same root, that edge is the answer.",
      tests:[
        ["triangle",[3,[[0,1],[0,2],[1,2]]],[1,2]],
        ["square closes on 0–3",[5,[[0,1],[1,2],[2,3],[0,3],[0,4]]],[0,3]],
        ["a forest has none",[4,[[0,1],[2,3]]],[]],
        ["first of two cycles",[4,[[0,1],[1,2],[2,0],[2,3],[3,1]]],[2,0]],
      ]},
    {type:"quiz",id:"q-uf",q:"You get 10⁵ “connect a and b” and “are a and b connected?” requests, interleaved. What do you use?",
      options:["Rebuild an adjacency list and DFS on each question","Union-find","BFS from every vertex up front"],answer:1,
      why:"The graph keeps changing, so precomputing doesn't work, and a DFS per question is O(V + E) each time. Union-find answers each request in near O(1)."},
  ],
  leetcode:["number-of-provinces","number-of-connected-components-in-an-undirected-graph","redundant-connection","graph-valid-tree","accounts-merge"],
},

// ───────────────────────────────────────────── 7
{
  id:"topo",
  title:"Cycles and topological sort",
  goal:"Order a DAG with Kahn's algorithm, and detect cycles in directed and undirected graphs.",
  mins:35,
  blocks:[
    {md:`A **topological order** lists the vertices of a directed graph so that every edge points forward: if \`a → b\`, then a comes before b. It only exists when there's **no cycle**, which is why "can all courses be finished?" and "give me a valid course order" are the same problem.

**Kahn's algorithm** works like peeling an onion. Start with every vertex that has in-degree 0 (nothing depends on it). Take one, append it to the order, and "remove" its outgoing edges by decrementing its neighbors' in-degrees. Any neighbor that drops to 0 is now ready. The number on each vertex below is its remaining in-degree.`},
    {viz:"topo",title:"Kahn's algorithm",graph:{n:7,directed:true,edges:[[0,2],[1,2],[1,3],[2,4],[3,4],[4,5],[3,6]],pos:[[10,14],[10,46],[36,22],[36,50],[62,32],[88,20],[70,56]]}},
    {tpl:`function topoSort(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  const indeg = new Array(n).fill(0);
  for (const [u, v] of edges) { adj[u].push(v); indeg[v]++; }

  const q = [];
  for (let v = 0; v < n; v++) if (indeg[v] === 0) q.push(v);

  const order = [];
  for (let head = 0; head < q.length; head++) {
    const u = q[head];
    order.push(u);
    for (const v of adj[u]) if (--indeg[v] === 0) q.push(v);
  }
  return order.length === n ? order : []; // fewer than n => there's a cycle
}`,title:"Kahn's algorithm"},
    {tip:"If the order ends up shorter than n, the leftover vertices are stuck in or behind a cycle, because their in-degree never reached 0. That one check solves Course Schedule."},
    {md:`## Cycle detection with DFS (directed graphs)

A plain \`visited\` flag isn't enough in a directed graph. Reaching a visited vertex might just mean two paths meet (a diamond), not a cycle. Use **three colors** instead:

- **white (0):** not visited yet
- **gray (1):** on the current DFS path, still being explored
- **black (2):** finished

Reaching a **gray** vertex means you've looped back onto your own path, so there's a cycle. Reaching a black one is fine.`},
    {tpl:`const color = new Array(n).fill(0);
function hasCycleFrom(u) {
  color[u] = 1;                                 // gray: on the path
  for (const v of adj[u]) {
    if (color[v] === 1) return true;            // back edge: a cycle
    if (color[v] === 0 && hasCycleFrom(v)) return true;
  }
  color[u] = 2;                                 // black: done
  return false;
}`,title:"Three-color DFS"},
    {md:`## Undirected graphs are different

In an undirected graph every edge points both ways, so each vertex "sees" the parent it came from. Either skip the parent during DFS (any other visited neighbor means a cycle), or use union-find: an edge whose ends are already connected closes a cycle.`},
  ],
  parts:[
    {type:"code",id:"cycle-directed",title:"Cycle in a directed graph",fn:"hasCycle",
      prompt:"Given `n` and a **directed** edge list, return `true` if the graph contains a cycle. A self-loop `[v, v]` counts.",
      starter:"function hasCycle(n, edges) {\n  \n}\n",
      solution:"function hasCycle(n, edges) {\n  const adj = Array.from({ length: n }, () => []);\n  for (const [u, v] of edges) adj[u].push(v);\n  const color = new Array(n).fill(0);\n  const dfs = u => {\n    color[u] = 1;\n    for (const v of adj[u]) {\n      if (color[v] === 1) return true;\n      if (color[v] === 0 && dfs(v)) return true;\n    }\n    color[u] = 2;\n    return false;\n  };\n  for (let v = 0; v < n; v++) if (color[v] === 0 && dfs(v)) return true;\n  return false;\n}\n",
      hint:"Three colors, and DFS from every white vertex (the graph may not be connected). Or use Kahn's algorithm and check whether the order has all n vertices.",
      tests:[
        ["triangle",[3,[[0,1],[1,2],[2,0]]],true],
        ["diamond is not a cycle",[4,[[0,1],[0,2],[1,3],[2,3]]],false],
        ["self-loop",[2,[[0,0]]],true],
        ["cycle in a second piece",[5,[[0,1],[1,2],[3,4],[4,3]]],true],
        ["no edges",[3,[]],false],
      ]},
    {type:"code",id:"cycle-undirected",title:"Cycle in an undirected graph",fn:"hasCycleUndirected",
      prompt:"Given `n` and an **undirected** edge list (no duplicate edges, no self-loops), return `true` if the graph has a cycle.",
      starter:"function hasCycleUndirected(n, edges) {\n  \n}\n",
      solution:"function hasCycleUndirected(n, edges) {\n  const parent = Array.from({ length: n }, (_, i) => i);\n  const find = x => {\n    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }\n    return x;\n  };\n  for (const [u, v] of edges) {\n    const ru = find(u), rv = find(v);\n    if (ru === rv) return true;\n    parent[ru] = rv;\n  }\n  return false;\n}\n",
      hint:"Union-find: if an edge's two ends already share a root, it closes a cycle. With DFS, pass the parent along and ignore it.",
      tests:[
        ["triangle",[3,[[0,1],[1,2],[2,0]]],true],
        ["a tree",[4,[[0,1],[1,2],[1,3]]],false],
        ["cycle off to the side",[5,[[0,1],[2,3],[3,4],[4,2]]],true],
        ["one edge is not a cycle",[2,[[0,1]]],false],
      ]},
    {type:"code",id:"topo-order",title:"Topological order",fn:"topoOrder",
      prompt:"Given `n` and a **directed** edge list (`[before, after]`), return a topological order of all `n` vertices, or `[]` if there's a cycle.\n\nThe test graphs each have exactly one valid order, so any correct algorithm passes.",
      starter:"function topoOrder(n, edges) {\n  \n}\n",
      solution:"function topoOrder(n, edges) {\n  const adj = Array.from({ length: n }, () => []);\n  const indeg = new Array(n).fill(0);\n  for (const [u, v] of edges) { adj[u].push(v); indeg[v]++; }\n  const q = [];\n  for (let v = 0; v < n; v++) if (indeg[v] === 0) q.push(v);\n  const order = [];\n  for (let head = 0; head < q.length; head++) {\n    const u = q[head];\n    order.push(u);\n    for (const v of adj[u]) if (--indeg[v] === 0) q.push(v);\n  }\n  return order.length === n ? order : [];\n}\n",
      hint:"Kahn's algorithm: count in-degrees, queue the zeros, and pop and decrement until the queue is empty. Check the order's length at the end.",
      tests:[
        ["a chain",[3,[[0,1],[1,2]]],[0,1,2]],
        ["shuffled labels",[4,[[3,1],[1,0],[0,2],[3,0]]],[3,1,0,2]],
        ["with shortcuts",[5,[[0,1],[1,2],[2,3],[3,4],[0,4],[1,3]]],[0,1,2,3,4]],
        ["cycle",[3,[[0,1],[1,2],[2,1]]],[]],
        ["single vertex",[1,[]],[0]],
      ]},
    {type:"quiz",id:"q-colors",q:"Why can't directed cycle detection use a single “visited” flag?",
      options:["It can; visited is enough","A visited vertex might be finished on another branch (like a diamond), which isn't a cycle. Only a vertex on the current path means a cycle","Directed graphs don't have cycles"],answer:1,
      why:"In 0→1→3 and 0→2→3, DFS reaches 3 twice, but there's no cycle. Gray means “still on my path”; black means “finished, safe to meet again”."},
    {type:"explain",id:"x-course",title:"Talk through Course Schedule",
      prompt:"Out loud, the way you would in an interview: how would you solve “Can you finish all numCourses given prerequisite pairs [course, prereq]?” Cover what the vertices and edges are (watch the edge direction), the algorithm, and the time and space complexity.",
      rubric:"Vertices = courses, edges prereq -> course (pairs are [course, prereq], so the direction must be flipped consciously); finishing all courses == no cycle; Kahn's: in-degree counts, queue zeros, count processed == numCourses, or 3-color DFS; O(V+E) time and space; edge cases: no prerequisites, self-dependency, disconnected courses."},
  ],
  leetcode:["course-schedule","course-schedule-ii","alien-dictionary","graph-valid-tree"],
},

// ───────────────────────────────────────────── 8
{
  id:"weighted",
  title:"Weighted shortest paths",
  goal:"Write a min-heap and Dijkstra's algorithm in JavaScript, and know when BFS isn't enough.",
  mins:40,
  blocks:[
    {md:`Once edges have **weights**, BFS breaks: the path with the fewest edges isn't always the cheapest. **Dijkstra's algorithm** fixes this. Instead of a plain queue it uses a **priority queue** and always expands the closest vertex it hasn't finished yet. With non-negative weights, the first time a vertex comes off the heap, its distance is final.

The labels show the best distance found so far (∞ = not reached yet). Watch for the moment a shorter route **relaxes** (improves) a distance.`},
    {viz:"dijkstra",start:0,title:"Dijkstra from vertex 0",graph:{n:6,directed:true,weighted:true,edges:[[0,1,7],[0,2,2],[2,1,3],[1,3,1],[2,3,8],[2,4,10],[3,4,2],[4,5,1],[3,5,6]],pos:[[8,30],[36,10],[36,50],[64,10],[64,50],[92,30]]}},
    {warn:"JavaScript has no built-in priority queue. In an interview you'll either write a small binary heap (below, about 25 lines) or say “assume a MinPriorityQueue” if they allow it. Practice writing it so it takes two minutes, not ten."},
    {tpl:`class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a; a.push(x);
    let i = a.length - 1;
    while (i > 0) {                               // sift up
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]]; i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {                                  // sift down
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top;
  }
}`,title:"A binary min-heap"},
    {tpl:`function dijkstra(n, edges, src) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) adj[u].push([v, w]);

  const dist = new Array(n).fill(Infinity);
  dist[src] = 0;
  const heap = new MinHeap((x, y) => x[0] < y[0]);   // entries are [distance, vertex]
  heap.push([0, src]);
  while (heap.size()) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue;                      // stale entry: u was already settled cheaper
    for (const [v, w] of adj[u]) {
      if (d + w < dist[v]) {                        // relax the edge
        dist[v] = d + w;
        heap.push([dist[v], v]);
      }
    }
  }
  return dist;
}`,title:"Dijkstra (lazy deletion)"},
    {md:`**Complexity:** O((V + E) log V) with a heap.

## Which shortest-path algorithm?

| Graph | Algorithm |
| --- | --- |
| Unweighted (every edge costs the same) | **BFS**, O(V + E) |
| Weights are only 0 or 1 | **0-1 BFS** with a deque: 0-edges go to the front |
| Non-negative weights | **Dijkstra**, O((V + E) log V) |
| Negative weights, or "at most k edges" | **Bellman-Ford**: relax every edge V-1 times (or k times) |
| All pairs, small V (≤ ~400) | **Floyd-Warshall**, O(V³) |
| Connect everything at minimum total cost | That isn't a shortest path. It's a **minimum spanning tree** (Kruskal with union-find, or Prim with a heap) |`},
  ],
  parts:[
    {type:"code",id:"min-heap",title:"Build a min-heap",fn:"MinHeap",kind:"class",
      prompt:"Implement `class MinHeap` for numbers:\n\n- `push(x)`: add a number\n- `pop()`: remove and return the smallest (`null` when empty)\n- `peek()`: return the smallest without removing it (`null` when empty)\n- `size()`: how many items it holds\n\nAim for O(log n) push and pop, using an array-backed binary heap. Sorting on every push doesn't count.",
      starter:"class MinHeap {\n  constructor() {\n    this.a = [];\n  }\n  push(x) {\n    \n  }\n  pop() {\n    \n  }\n  peek() {\n    \n  }\n  size() {\n    \n  }\n}\n",
      solution:"class MinHeap {\n  constructor() {\n    this.a = [];\n  }\n  push(x) {\n    const a = this.a;\n    a.push(x);\n    let i = a.length - 1;\n    while (i > 0) {\n      const p = (i - 1) >> 1;\n      if (a[p] <= a[i]) break;\n      [a[i], a[p]] = [a[p], a[i]];\n      i = p;\n    }\n  }\n  pop() {\n    const a = this.a;\n    if (!a.length) return null;\n    const top = a[0], last = a.pop();\n    if (a.length) {\n      a[0] = last;\n      let i = 0;\n      for (;;) {\n        const l = 2 * i + 1, r = l + 1;\n        let m = i;\n        if (l < a.length && a[l] < a[m]) m = l;\n        if (r < a.length && a[r] < a[m]) m = r;\n        if (m === i) break;\n        [a[i], a[m]] = [a[m], a[i]];\n        i = m;\n      }\n    }\n    return top;\n  }\n  peek() {\n    return this.a.length ? this.a[0] : null;\n  }\n  size() {\n    return this.a.length;\n  }\n}\n",
      hint:"Parent of i is (i - 1) >> 1; children are 2i + 1 and 2i + 2. push: append, then swap upward while smaller than the parent. pop: move the last item to the root, then swap downward with the smaller child.",
      tests:[
        ["basic",{ops:["MinHeap","push","push","push","peek","pop","pop","size","pop","pop"],args:[[],[5],[1],[3],[],[],[],[],[],[]]},[null,null,null,null,1,1,3,1,5,null]],
        ["duplicates and negatives",{ops:["MinHeap","push","push","push","push","pop","pop","pop","pop"],args:[[],[2],[-1],[2],[0],[],[],[],[]]},[null,null,null,null,null,-1,0,2,2]],
        ["interleaved",{ops:["MinHeap","push","push","pop","push","push","pop","pop","size","peek"],args:[[],[10],[4],[],[7],[1],[],[],[],[]]},[null,null,null,4,null,null,1,7,1,10]],
        ["ten in reverse",{ops:["MinHeap",...Array(10).fill("push"),...Array(10).fill("pop")],args:[[],...[9,8,7,6,5,4,3,2,1,0].map(x=>[x]),...Array(10).fill([])]},[null,...Array(10).fill(null),0,1,2,3,4,5,6,7,8,9]],
        ["peek on empty",{ops:["MinHeap","peek","size"],args:[[],[],[]]},[null,null,0]],
      ]},
    {type:"code",id:"dijkstra",title:"Dijkstra",fn:"dijkstra",
      prompt:"Given `n`, a **directed** weighted edge list `[from, to, weight]` (weights ≥ 0) and `src`, return the shortest distance from `src` to every vertex, using `-1` for unreachable vertices.\n\nYou'll need a priority queue. Paste in the heap you just wrote, or use a comparator-based one.",
      starter:"function dijkstra(n, edges, src) {\n  \n}\n",
      solution:"function dijkstra(n, edges, src) {\n  const adj = Array.from({ length: n }, () => []);\n  for (const [u, v, w] of edges) adj[u].push([v, w]);\n  const dist = new Array(n).fill(Infinity);\n  dist[src] = 0;\n  // [distance, vertex] pairs in a small binary heap\n  const h = [[0, src]];\n  const push = x => {\n    h.push(x);\n    let i = h.length - 1;\n    while (i > 0) {\n      const p = (i - 1) >> 1;\n      if (h[p][0] <= h[i][0]) break;\n      [h[i], h[p]] = [h[p], h[i]];\n      i = p;\n    }\n  };\n  const pop = () => {\n    const top = h[0], last = h.pop();\n    if (h.length) {\n      h[0] = last;\n      let i = 0;\n      for (;;) {\n        const l = 2 * i + 1, r = l + 1;\n        let m = i;\n        if (l < h.length && h[l][0] < h[m][0]) m = l;\n        if (r < h.length && h[r][0] < h[m][0]) m = r;\n        if (m === i) break;\n        [h[i], h[m]] = [h[m], h[i]];\n        i = m;\n      }\n    }\n    return top;\n  };\n  while (h.length) {\n    const [d, u] = pop();\n    if (d > dist[u]) continue;\n    for (const [v, w] of adj[u]) {\n      if (d + w < dist[v]) {\n        dist[v] = d + w;\n        push([dist[v], v]);\n      }\n    }\n  }\n  return dist.map(d => (d === Infinity ? -1 : d));\n}\n",
      hint:"Heap entries are [distance, vertex]. Pop the smallest; skip it if it's stale (d > dist[u]); otherwise relax each outgoing edge and push any improvement. Convert Infinity to -1 at the end.",
      tests:[
        ["cheaper via 2",[4,[[0,1,4],[0,2,1],[2,1,2],[1,3,1],[2,3,5]],0],[0,3,1,4]],
        ["unreachable",[3,[[0,1,1]],0],[0,1,-1]],
        ["start elsewhere",[2,[[0,1,5],[1,0,1]],1],[1,0]],
        ["zero-weight edges",[3,[[0,1,0],[1,2,0]],0],[0,0,0]],
        ["the visualizer graph",[6,[[0,1,7],[0,2,2],[2,1,3],[1,3,1],[2,3,8],[2,4,10],[3,4,2],[4,5,1],[3,5,6]],0],[0,5,2,6,8,9]],
      ]},
    {type:"code",id:"route",title:"Return the route, not just the cost",fn:"shortestRoute",
      prompt:"Same input as Dijkstra plus a `dst`. Return the vertices on the cheapest path from `src` to `dst` (including both ends), or `[]` if `dst` can't be reached. The tests have a single cheapest path.\n\nTrick: when you relax an edge, remember `prev[v] = u`. At the end, walk back from `dst`.",
      starter:"function shortestRoute(n, edges, src, dst) {\n  \n}\n",
      solution:"function shortestRoute(n, edges, src, dst) {\n  const adj = Array.from({ length: n }, () => []);\n  for (const [u, v, w] of edges) adj[u].push([v, w]);\n  const dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false);\n  dist[src] = 0;\n  // Simple O(V^2) Dijkstra: fine for small graphs, and no heap needed.\n  for (let k = 0; k < n; k++) {\n    let u = -1;\n    for (let v = 0; v < n; v++) if (!done[v] && dist[v] < Infinity && (u === -1 || dist[v] < dist[u])) u = v;\n    if (u === -1) break;\n    done[u] = true;\n    for (const [v, w] of adj[u]) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }\n  }\n  if (dist[dst] === Infinity) return [];\n  const path = [];\n  for (let v = dst; v !== -1; v = prev[v]) path.push(v);\n  return path.reverse();\n}\n",
      hint:"Keep prev = new Array(n).fill(-1). Whenever dist[v] improves through u, set prev[v] = u. Then rebuild: start at dst, follow prev until -1, and reverse.",
      tests:[
        ["cheaper via 2",[4,[[0,1,4],[0,2,1],[2,1,2],[1,3,1],[2,3,5]],0,3],[0,2,1,3]],
        ["unreachable",[3,[[0,1,1]],0,2],[]],
        ["already there",[2,[],0,0],[0]],
        ["the visualizer graph",[6,[[0,1,7],[0,2,2],[2,1,3],[1,3,1],[2,3,8],[2,4,10],[3,4,2],[4,5,1],[3,5,6]],0,5],[0,2,1,3,4,5]],
      ]},
    {type:"quiz",id:"q-neg",q:"Your graph has an edge with weight -3 (a refund). Is Dijkstra safe?",
      options:["Yes, Dijkstra handles any weights","No. A settled vertex could later get cheaper; use Bellman-Ford","Yes, if you take absolute values"],answer:1,
      why:"Dijkstra assumes that once a vertex is popped, nothing can make it cheaper. A negative edge breaks that. Bellman-Ford handles negative weights and can detect negative cycles."},
    {type:"quiz",id:"q-kstops",q:"“Cheapest flight from A to B with at most k stops.” Plain Dijkstra on cost alone is wrong. Why?",
      options:["It ignores the stop limit: a cheaper path with too many stops can block a valid one","Dijkstra can't handle directed graphs","Flights have negative prices"],answer:0,
      why:"The state is (city, stops used), not just the city. Use Bellman-Ford limited to k + 1 rounds, or BFS/Dijkstra over (city, stops) states."},
  ],
  leetcode:["network-delay-time","path-with-minimum-effort","cheapest-flights-within-k-stops","min-cost-to-connect-all-points"],
},

// ───────────────────────────────────────────── 9
{
  id:"patterns",
  title:"Pick the right tool",
  goal:"Read a problem statement and name the graph, the technique, and the complexity before you write any code.",
  mins:25,
  blocks:[
    {md:`Most of the difficulty in graph interview questions is recognizing which technique applies. Once you know that, you're mostly writing templates you've already drilled. Use this table as the bridge from the lessons to LeetCode.

| When the problem says… | Think | Lesson |
| --- | --- | --- |
| "minimum steps / moves / transformations", every move equal | **BFS** | 4 |
| "distance to the nearest X" from many X's | **Multi-source BFS** | 5 |
| "number of islands / regions / provinces / groups" | **DFS/BFS components**, or union-find | 5, 6 |
| "connect / merge / are they in the same group", streaming | **Union-find** | 6 |
| "prerequisites / order / dependencies / build order" | **Topological sort** (Kahn's) | 7 |
| "is it possible to finish / is there a cycle" (directed) | **Kahn's or 3-color DFS** | 7 |
| "cheapest / fastest / minimum cost path", weights ≥ 0 | **Dijkstra** | 8 |
| "at most k stops / edges" | **Bellman-Ford** (k rounds) or BFS over (node, k) | 8 |
| "connect all points at minimum total cost" | **Minimum spanning tree** (Kruskal + union-find) | 6, 8 |
| "split into two groups with no conflicts" | **Bipartite check**: BFS two-coloring | 4 |
| "all paths / all combinations" | **DFS + backtracking** | 3 |
| "a / b = 2.0, what is a / c?" | Weighted graph, **DFS multiplying** edge weights | 3 |

## The 5-step opener (say this out loud in an interview)

1. **The graph:** what are the vertices and edges? Directed? Weighted?
2. **The size:** V and E. That tells you whether O(V + E), O(E log V) or O(V²) is fine.
3. **The question type:** reachability, shortest path, ordering, grouping, or enumeration.
4. **The technique and template** from the table above.
5. **Edge cases:** empty graph, single vertex, disconnected parts, cycles, self-loops, duplicate edges.`},
    {tip:"The bipartite check is BFS where every vertex you reach gets the opposite color from its parent. If an edge ever joins two vertices of the same color, the graph isn't bipartite. Run it from every uncolored vertex, because the graph may be disconnected."},
  ],
  parts:[
    {type:"quiz",id:"p-ladder",q:"Word Ladder: turn “hit” into “cog” changing one letter at a time, each word in a dictionary. Fewest steps?",
      options:["DFS through the dictionary","BFS where each word is a vertex and one-letter changes are edges","Dijkstra with letter distances","Topological sort"],answer:1,
      why:"Each change costs one step, so it's unweighted shortest path: BFS. The usual trick is to generate neighbors with wildcard patterns like h*t rather than comparing every pair of words."},
    {type:"quiz",id:"p-alien",q:"Alien Dictionary: given words sorted in an unknown alphabet, find the letter order.",
      options:["Union-find over letters","Topological sort, with an edge from each first differing letter of adjacent words","BFS from 'a'","Sort the letters"],answer:1,
      why:"Each adjacent word pair gives at most one ordering constraint, a directed edge. A cycle means no valid alphabet. Watch for the trap where a word comes before its own prefix (\"abc\" before \"ab\"), which is invalid."},
    {type:"quiz",id:"p-accounts",q:"Accounts Merge: accounts that share any email belong to the same person.",
      options:["Topological sort","Union-find (or DFS) over accounts or emails, then group","Dijkstra","Binary search"],answer:1,
      why:"\"Share any element, so same group\" is a connectivity question. Union each account's emails together, then gather the emails by root."},
    {type:"quiz",id:"p-effort",q:"Path With Minimum Effort: a route's cost is the largest height jump along it. Minimize that cost.",
      options:["BFS","Dijkstra where a path's cost is the max edge so far, not the sum","Topological sort","DFS on all paths"],answer:1,
      why:"Dijkstra works for any path cost that never decreases as the path grows. Here you replace d + w with max(d, w). Binary search on the answer plus BFS also works."},
    {type:"quiz",id:"p-bipartite",q:"Possible Bipartition: split people into two groups so no two who dislike each other share a group.",
      options:["Union-find on dislikes","Two-color the dislike graph with BFS/DFS","Topological sort","Minimum spanning tree"],answer:1,
      why:"That's exactly the definition of a bipartite graph. Two-color with BFS; a same-colored edge means it's impossible."},
    {type:"quiz",id:"p-mst",q:"Min Cost to Connect All Points: connect n points with the minimum total wire, where cost is Manhattan distance.",
      options:["Dijkstra from point 0","A minimum spanning tree (Prim's on the dense graph, or Kruskal + union-find)","BFS","Topological sort"],answer:1,
      why:"Connecting everything at minimum total cost is the definition of an MST. Dijkstra minimizes the distance from one source, which isn't the same thing."},
    {type:"explain",id:"x-opener",title:"Run the 5-step opener",
      prompt:"Pick one: Rotting Oranges, Course Schedule II, or Network Delay Time. Name which one you picked, then run the 5-step opener on it: the graph, its size, the question type, the technique, and the edge cases. Finish with the time and space complexity.",
      rubric:"Names the problem; correctly identifies vertices/edges and direction/weights; identifies question type; picks the right technique (Rotting Oranges: multi-source BFS with levels as minutes and -1 if fresh remain; Course Schedule II: Kahn's topological sort returning [] on cycle; Network Delay Time: Dijkstra from k, answer = max dist or -1); gives correct complexity; lists relevant edge cases."},
  ],
  leetcode:["word-ladder","alien-dictionary","accounts-merge","path-with-minimum-effort","is-graph-bipartite","min-cost-to-connect-all-points","evaluate-division"],
},

// ───────────────────────────────────────────── 10
{
  id:"graphdb",
  title:"Graph databases in system design",
  goal:"Know what a graph database is good at, when it's the wrong call, and how to talk about it in a design interview.",
  mins:30,
  system:true,
  blocks:[
    {md:`Everything so far ran in memory on one machine. In system design, the question becomes **where the graph lives** when it has a billion vertices and has to answer queries in milliseconds.

## What a graph database is

A graph database (Neo4j, Amazon Neptune, JanusGraph, TigerGraph) stores the **property graph** model directly:

- **Nodes** with labels and properties: \`(:Person {name: "Ada"})\`
- **Relationships** with a type, a direction, and their own properties: \`-[:FOLLOWS {since: 2021}]->\`

The point is **cheap traversal**. Many graph databases store each node's relationships right next to it ("index-free adjacency"), so following an edge is a pointer hop rather than an index lookup. The cost of a query grows with **the part of the graph you touch**, not with the size of the whole table.`},
    {viz:"graph",title:"Friends-of-friends: 2 hops from Ada",graph:{n:7,edges:[[0,1],[0,2],[1,3],[2,3],[2,4],[3,5],[4,6]],pos:[[10,30],[34,12],[34,48],[60,20],[60,52],[86,12],[86,52]],labels:["Ada","Bo","Cy","Di","Ed","Fay","Gus"]}},
    {md:`## The same question in SQL and in Cypher

"Who are Ada's friends-of-friends that she doesn't know yet, ranked by mutual friends?"`},
    {tpl:`-- Relational: friendships(a, b), stored both directions
SELECT f2.b AS suggestion, COUNT(*) AS mutual
FROM friendships f1
JOIN friendships f2 ON f2.a = f1.b
WHERE f1.a = :ada
  AND f2.b <> :ada
  AND f2.b NOT IN (SELECT b FROM friendships WHERE a = :ada)
GROUP BY f2.b
ORDER BY mutual DESC;
-- Fine at 2 hops. Each extra hop is another self-join, and
-- "any depth" needs a recursive CTE whose cost can explode.`,title:"SQL"},
    {tpl:`// Cypher (Neo4j)
MATCH (me:Person {id: $ada})-[:FRIEND]-(f)-[:FRIEND]-(fof)
WHERE fof <> me AND NOT (me)-[:FRIEND]-(fof)
RETURN fof, count(f) AS mutual
ORDER BY mutual DESC

// Variable depth is one character: -[:FRIEND*1..4]-`,title:"Cypher"},
    {md:`## When a graph database fits

- **Many hops, or a variable number of them:** "anyone within 4 hops", shortest path between two people, "how is X connected to Y?"
- **The relationships are the data:** recommendations, fraud rings (accounts sharing devices, cards and addresses), knowledge graphs, network and service dependency maps, supply chains.
- **The schema keeps changing:** new node and relationship types appear often, and you'd otherwise keep adding join tables.
- **Permissions as relationships:** "can user U see doc D through any group or folder chain?" (Google's Zanzibar models this as relation tuples.)

## When it's the wrong call

- **The queries are 1 hop.** "A user's followers" is just an adjacency list. A key-value or relational table keyed by user (\`followers:{userId}\`) is simpler and scales out easily.
- **Aggregations over everything:** revenue by country, daily active users. That's analytics, so use a warehouse or column store.
- **Simple CRUD on entities:** orders, products, payments. Relational is the safe default, with transactions, a mature ecosystem, and an on-call team that knows it.
- **Huge write throughput or extreme scale.** Graphs are **hard to shard**: any partitioning cuts edges, and traversals that cross machines get slow. Many large companies run a graph *API* on sharded MySQL plus caching (Facebook's TAO) or a custom in-memory graph service (LinkedIn's LIquid), rather than an off-the-shelf graph database.

## Things to raise in the interview

| Concern | What to say |
| --- | --- |
| **Supernodes** | A celebrity with 100M followers makes any traversal through them explode. Cap the fan-out, sample, or treat high-degree vertices specially. |
| **Sharding** | Partition by vertex (user ID) and accept cross-shard hops, or co-locate communities. Say that cross-shard traversal is the cost. |
| **Precompute vs. live** | "People you may know" is usually batch-computed offline (Spark over the edge list) and served from a key-value store. A live graph query handles only freshness. |
| **Consistency** | Edges are often stored twice (a→b and b→a). Discuss how both writes happen and what readers see in between. |
| **Caching** | Hot adjacency lists in Redis or Memcached, invalidated on edge writes. |`},
    {tip:"A strong answer doesn't pick a graph database because the data is a graph. All data is a graph. Pick one when the queries are deep, variable-depth traversals, and say what you'd use for everything else."},
  ],
  parts:[
    {type:"code",id:"fof",title:"Friends-of-friends, in memory",fn:"friendsOfFriends",
      prompt:"This is what the Cypher query above computes. Given **undirected** friendship edges (integer IDs) and a `user`, return suggestions: people exactly 2 hops away who aren't `user` and aren't already friends, as `[id, mutualFriends]` pairs. Sort by `mutualFriends` descending, then `id` ascending.",
      starter:"function friendsOfFriends(edges, user) {\n  \n}\n",
      solution:"function friendsOfFriends(edges, user) {\n  const adj = new Map();\n  const add = (a, b) => { if (!adj.has(a)) adj.set(a, new Set()); adj.get(a).add(b); };\n  for (const [a, b] of edges) { add(a, b); add(b, a); }\n  const mine = adj.get(user) || new Set(), mutual = new Map();\n  for (const f of mine)\n    for (const fof of adj.get(f))\n      if (fof !== user && !mine.has(fof)) mutual.set(fof, (mutual.get(fof) || 0) + 1);\n  return [...mutual].sort((x, y) => y[1] - x[1] || x[0] - y[0]);\n}\n",
      hint:"Use a Map of Sets so “are they already friends?” is O(1). For each friend f and each friend-of-f, count how many times you reach each candidate.",
      tests:[
        ["two suggestions",[[[1,2],[1,3],[2,4],[3,4],[3,5],[4,6]],1],[[4,2],[5,1]]],
        ["no friends",[[[2,3]],1],[]],
        ["tie broken by id",[[[0,1],[0,2],[1,3],[2,4],[1,4],[2,3]],0],[[3,2],[4,2]]],
        ["skips existing friends",[[[0,1],[0,2],[1,2],[2,3]],0],[[3,1]]],
      ]},
    {type:"quiz",id:"g-orders",q:"“Show a customer their last 20 orders.” Where should that data live?",
      options:["A graph database: customers and orders are nodes","A relational database (or a key-value store keyed by customer)","A data warehouse"],answer:1,
      why:"It's a 1-hop lookup with transactions and an obvious index (customer_id, created_at). A graph database adds cost and nothing else."},
    {type:"quiz",id:"g-fraud",q:"Find rings of accounts linked through shared devices, cards or addresses, up to 4 hops apart, while a payment is being authorized.",
      options:["A relational database with self-joins","A graph database, or an in-memory graph service","A data warehouse, queried nightly"],answer:1,
      why:"Variable-depth traversal over mixed relationship types, with low latency, is the textbook case for a graph database. A nightly warehouse job is too late to stop the payment."},
    {type:"quiz",id:"g-revenue",q:"“Revenue by country by day for the last 2 years.” Which store?",
      options:["A graph database","A data warehouse or column store","Redis"],answer:1,
      why:"That's a scan-and-aggregate analytics query. Column stores are built for it. Graph databases are bad at whole-dataset aggregation."},
    {type:"quiz",id:"g-supernode",q:"Your “friends within 3 hops” query times out for anyone connected to a celebrity with 50M followers. What's the fix?",
      options:["Add more RAM","Treat high-degree vertices specially: cap or sample the fan-out, skip them in traversals, or precompute","Switch to BFS"],answer:1,
      why:"That's the supernode problem. One vertex multiplies the traversal by 50M. Real systems cap the fan-out, exclude celebrity edges from friend traversals, or precompute the results offline."},
    {type:"explain",id:"x-pymk",title:"Design: People You May Know",
      prompt:"You're designing “People You May Know” for a social network with 500M users and an average of 300 friends each. Would you use a graph database? Describe where the friendship graph lives, how suggestions are computed and served, and how you handle celebrities.",
      rubric:"Recognizes 2-hop (friends-of-friends) as the core query; estimates scale (500M*300/2 = 75B edges) and notes that's hard for a single graph DB; strong answers precompute suggestions offline (batch over the edge list, e.g. Spark) and serve from a KV store, optionally with a graph service or graph DB for fresh/online traversals; sharding by user ID; handles supernodes (exclude/cap high-degree vertices); mentions ranking signals (mutual count, shared schools/companies); caching; freshness after new friendships."},
    {type:"explain",id:"x-migrate",title:"Push back on a migration",
      prompt:"A teammate proposes moving the whole e-commerce backend (products, orders, payments, reviews) to Neo4j “because everything is connected”. What questions do you ask, and what do you recommend?",
      rubric:"Asks which queries actually need multi-hop traversal (likely only recommendations); notes orders/payments need ACID transactions and are 1-hop lookups well served by relational; considers operational maturity, team familiarity, migration risk, analytics needs; recommends keeping relational as the system of record and, if needed, a graph DB or graph service fed by CDC/events for recommendations only."},
  ],
  leetcode:[],
},
  ],
}];
