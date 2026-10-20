// Learning tab: the Heaps and priority queues track. Same schema as learn_data.js (see the header there) and learn_trees.js
// (for the viz fields). Loaded after learn_data.js, before learn.js.
//   viz blocks over heaps:  {viz: "heap" | "heapPush" | "heapPop" | "heapify", heap: [array], value (heapPush only), title}
//                           "heap", "heapPush" and "heapPop" need a valid min-heap array; "heapify" needs an unordered one.
// JavaScript has no built-in heap, so exercises that are about a pattern (top-K, two heaps) start with this class already written.
const HEAP_SRC = `// Provided: a binary heap. less(a, b) says a should come out before b (default: a min-heap of numbers).
class Heap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }
  size() { return this.a.length; }
  peek() { return this.a.length ? this.a[0] : null; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    if (!a.length) return null;
    const top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}
`;
LEARN_TRACKS.push({
  id:"heaps",
  title:"Heaps and priority queues",
  icon:"⛰️",
  tagline:"From “what is a heap” to top-K, merging sorted streams, scheduling and a running median.",
  outcomes:[
    "Explain how a heap lives in an array and write push and pop from memory",
    "Say why building a heap is O(n) and a push or pop is O(log n)",
    "Use a size-K heap to find the top K of anything in O(n log K)",
    "Recognize merge-K, scheduling and running-median problems as heap problems",
  ],
  ready:[
    ["kth-largest-element-in-a-stream","topk"],["last-stone-weight","topk"],["kth-largest-element-in-an-array","topk"],["top-k-frequent-elements","topk"],
    ["k-closest-points-to-origin","topk"],["merge-k-sorted-lists","merge"],["meeting-rooms-ii","merge"],["task-scheduler","merge"],
    ["reorganize-string","merge"],["find-median-from-data-stream","twoheaps"],
  ],
  lessons:[

// ───────────────────────────────────────────── 1
{
  id:"what",
  title:"What a heap is",
  goal:"Explain the heap rule, and how a tree is stored in a plain array.",
  mins:15,
  blocks:[
    {md:`A **priority queue** is a collection where you can add items and always remove the one with the **highest priority** (smallest or largest). A **heap** is the data structure that implements it well:

| Operation | Heap | Sorted array | Unsorted array |
| --- | --- | --- | --- |
| Peek at the best | O(1) | O(1) | O(n) |
| Add an item | **O(log n)** | O(n) | O(1) |
| Remove the best | **O(log n)** | O(1) or O(n) | O(n) |

A **min-heap** is a **complete binary tree** where every node is **no larger than its children**. The smallest value is always at the root. (A max-heap flips the rule.) Notice what it does *not* promise: siblings are not ordered, and a heap is **not sorted**. It only guarantees the top.`},
    {viz:"heap",title:"A min-heap of 7 values: every parent ≤ its children",heap:[2,5,3,9,6,8,4]},
    {md:`## Stored in an array

Because the tree is **complete** (every level full, last level filled left to right), there are no gaps and no pointers are needed. Node \`i\` lives at \`a[i]\`, and:

- parent: \`(i - 1) >> 1\` (integer division by 2)
- left child: \`2i + 1\`
- right child: \`2i + 2\`

Check it on the picture: the array form on the right is \`[2, 5, 3, 9, 6, 8, 4]\`. Index 1 (value 5) has children at indexes 3 and 4 (9 and 6), and its parent is index 0.

## Heights

A complete tree with n nodes has height about log₂ n. Everything a heap does walks one root-to-leaf path at most, which is where **O(log n)** comes from.`},
    {tip:"Most languages ship a heap (Python's heapq, Java's PriorityQueue, C++'s priority_queue). JavaScript doesn't, so in an interview you either write a small one or ask whether you may assume one. That's why you practice writing it."},
  ],
  parts:[
    {type:"quiz",id:"q-parent",q:"In the array form of a heap, where is the parent of the node at index 5?",
      options:["2","2.5","3","4"],answer:0,
      why:"parent(i) = (i - 1) >> 1 = (5 - 1) >> 1 = 2. And index 2 has children at 5 and 6, which checks out."},
    {type:"quiz",id:"q-sorted",q:"Is a heap sorted? Which statement is true of the min-heap [2, 5, 3, 9, 6, 8, 4]?",
      options:["It is sorted, so binary search works","Only the minimum is guaranteed to be at the front; the rest is only partially ordered","The maximum is always at the end","Siblings are always in order"],answer:1,
      why:"The heap rule only relates each parent to its children. 9 comes before 6 here, and 5 > 3 are siblings out of order. You get the minimum in O(1), nothing more."},
    {type:"quiz",id:"q-find",q:"Which is NOT something a binary heap does efficiently?",
      options:["Get the minimum","Insert a value","Remove the minimum","Check whether a particular value is present"],answer:3,
      why:"Searching for an arbitrary value is O(n): the heap rule says nothing about where a value lives beyond its ancestors and descendants. If you need membership as well, pair the heap with a Set or Map."},
    {type:"code",id:"is-min-heap",title:"Is this array a min-heap?",fn:"isMinHeap",
      prompt:"Given an array `a`, return `true` if, read as a complete binary tree (children of `i` at `2i+1` and `2i+2`), it satisfies the **min-heap** rule: no node is smaller than its parent.\n\nAn empty array and a one-element array are valid heaps.",
      starter:"function isMinHeap(a) {\n  \n}\n",
      solution:"function isMinHeap(a) {\n  for (let i = 1; i < a.length; i++) {\n    if (a[(i - 1) >> 1] > a[i]) return false;\n  }\n  return true;\n}\n",
      hint:"You only need to compare each node (from index 1 on) with its parent at (i - 1) >> 1.",
      tests:[
        ["valid",[[1,3,2,4,5]],true],
        ["single",[[1]],true],
        ["empty",[[]],true],
        ["root too big",[[2,1]],false],
        ["leaf smaller than a grandparent's child",[[1,2,3,4,0]],false],
        ["equal values are fine",[[5,5,5,6]],true],
        ["sorted ascending is always a heap",[[5,6,7,8,9,10]],true],
      ]},
  ],
  leetcode:[],
},

// ───────────────────────────────────────────── 2
{
  id:"pushpop",
  title:"Push and pop",
  goal:"Write push (sift up) and pop (sift down) from memory.",
  mins:30,
  blocks:[
    {md:`Both operations keep the tree **complete** first, and repair the heap rule second. Only one root-to-leaf path is ever touched.

**Push.** Put the new value in the next free slot (the end of the array), so the tree stays complete. It may be smaller than its parent now, so **sift up**: swap with the parent while it's smaller.`},
    {viz:"heapPush",title:"Push 1: it climbs to the root",heap:[2,5,3,9,6,8,4],value:1},
    {md:`**Pop.** The answer is the root. Take the **last** element, move it into the root (the tree stays complete), then **sift down**: swap it with its **smaller** child while a child is smaller than it.

Swapping with the *smaller* child matters. If you swapped with the larger one, the smaller child would end up as the new parent of a bigger sibling and break the rule.`},
    {viz:"heapPop",title:"Pop: the last value takes the root, then sinks",heap:[1,2,3,5,6,8,4]},
    {tpl:`class MinHeap {
  constructor() { this.a = []; }
  size() { return this.a.length; }
  peek() { return this.a.length ? this.a[0] : null; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;                          // sift up
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p] <= a[i]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    if (!a.length) return null;
    const top = a[0], last = a.pop();              // take the last element...
    if (a.length) {
      a[0] = last;                                  // ...and put it at the root
      let i = 0;                                    // sift down
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l] < a[m]) m = l;     // pick the smaller child
        if (r < a.length && a[r] < a[m]) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}`,title:"Min-heap: push and pop"},
    {warn:"Pop when the heap has one element: after a.pop() the array is empty, so there is nothing to put at the root. Guard with `if (a.length)`, or you'll write undefined into a[0]."},
  ],
  parts:[
    {type:"quiz",id:"q-cost",q:"How many swaps can one push or pop need, at most?",
      options:["1","About log₂ n (the height of the tree)","About n","About n log n"],answer:1,
      why:"Sifting walks at most one root-to-leaf path, and a complete tree with n nodes has height about log₂ n. For a million items that's about 20 swaps."},
    {type:"quiz",id:"q-smaller",q:"When sifting down, which child should the moving value swap with?",
      options:["Always the left child","Always the right child","The smaller child, and only if it's smaller than the moving value","The larger child"],answer:2,
      why:"The smaller child becomes the parent of the other child, so it must be no larger than it. Swapping with the larger child could leave a parent bigger than its other child."},
    {type:"quiz",id:"q-maxheap",q:"You need a max-heap and only have the MinHeap class. What's the quickest trick for numbers?",
      options:["Pop and reverse","Push the negated values and negate them again on the way out","Sort the array each time","It's impossible"],answer:1,
      why:"Negation flips the order: the smallest negative is the largest original value. It's the standard trick in languages with only a min-heap. A comparator-based heap (like the Heap class in later lessons) makes it unnecessary."},
    {type:"code",id:"min-heap",title:"Build a min-heap",fn:"MinHeap",kind:"class",
      prompt:"Implement `class MinHeap` for numbers, backed by an array:\n\n- `push(x)`: add a number\n- `pop()`: remove and return the smallest (`null` when empty)\n- `peek()`: return the smallest without removing it (`null` when empty)\n- `size()`: how many items it holds\n\nDo not call `sort` anywhere: sift up on push and sift down on pop.",
      starter:"class MinHeap {\n  constructor() {\n    this.a = [];\n  }\n  push(x) {\n    \n  }\n  pop() {\n    \n  }\n  peek() {\n    \n  }\n  size() {\n    \n  }\n}\n",
      solution:"class MinHeap {\n  constructor() {\n    this.a = [];\n  }\n  push(x) {\n    const a = this.a;\n    a.push(x);\n    let i = a.length - 1;\n    while (i > 0) {\n      const p = (i - 1) >> 1;\n      if (a[p] <= a[i]) break;\n      [a[p], a[i]] = [a[i], a[p]];\n      i = p;\n    }\n  }\n  pop() {\n    const a = this.a;\n    if (!a.length) return null;\n    const top = a[0], last = a.pop();\n    if (a.length) {\n      a[0] = last;\n      let i = 0;\n      for (;;) {\n        const l = 2 * i + 1, r = l + 1;\n        let m = i;\n        if (l < a.length && a[l] < a[m]) m = l;\n        if (r < a.length && a[r] < a[m]) m = r;\n        if (m === i) break;\n        [a[i], a[m]] = [a[m], a[i]];\n        i = m;\n      }\n    }\n    return top;\n  }\n  peek() {\n    return this.a.length ? this.a[0] : null;\n  }\n  size() {\n    return this.a.length;\n  }\n}\n",
      hint:"Parent of i is (i - 1) >> 1; children are 2i + 1 and 2i + 2. push: append, then swap upward while smaller than the parent. pop: move the last item to the root, then swap downward with the smaller child.",
      tests:[
        ["mixed",{ops:["MinHeap","push","push","push","push","peek","pop","pop","push","pop","size","pop","pop","pop"],args:[[],[9],[4],[7],[1],[],[],[],[2],[],[],[],[],[]]},[null,null,null,null,null,1,1,4,null,2,2,7,9,null]],
        ["empty heap",{ops:["MinHeap","peek","pop","size","push","peek"],args:[[],[],[],[],[3],[]]},[null,null,null,0,null,3]],
        ["duplicates and negatives",{ops:["MinHeap","push","push","push","push","pop","pop","pop","pop"],args:[[],[3],[3],[-5],[3],[],[],[],[]]},[null,null,null,null,null,-5,3,3,3]],
        ["descending input",{ops:["MinHeap","push","push","push","push","push","pop","pop","pop","pop","pop"],args:[[],[5],[4],[3],[2],[1],[],[],[],[],[]]},[null,null,null,null,null,null,1,2,3,4,5]],
      ]},
  ],
  leetcode:["kth-largest-element-in-a-stream"],
},

// ───────────────────────────────────────────── 3
{
  id:"build",
  title:"Building a heap, and heap sort",
  goal:"Build a heap from an array in O(n), and use a heap to sort.",
  mins:20,
  blocks:[
    {md:`To turn an unordered array into a heap you could push the values one at a time: n pushes at O(log n) each is **O(n log n)**. There is a smarter way: **heapify**.

Treat the array as a complete tree already. The bottom half of the nodes are leaves, and a leaf on its own is a valid heap. So start at the **last parent** (index \`n/2 - 1\`) and **sift each node down**, moving backwards to the root. By the time you sift a node, both its subtrees are already heaps.`},
    {viz:"heapify",title:"Heapify an unordered array",heap:[9,4,7,1,2,6,3]},
    {md:`## Why it's O(n), not O(n log n)

Sifting a node costs at most its **height**, and most nodes are near the bottom. Half the nodes are leaves (cost 0), a quarter have height 1, an eighth have height 2, and so on. The sum n/4·1 + n/8·2 + n/16·3 + … converges to about n. A single push costs O(log n), but heapify's total cost is **O(n)**.

## Heap sort

Push every value, then pop them all: the pops come out in order. That is **O(n log n)** time. (The in-place version, which repeatedly swaps the root to the end of the array, also needs O(1) extra space, but "put it all in a heap and pop" is the idea behind every top-K trick.)`},
    {tip:"A common interview question: “what is the complexity of building a heap?” The answer they want is O(n), with the reason. Inserting n elements one by one is O(n log n)."},
  ],
  parts:[
    {type:"quiz",id:"q-start",q:"Heapify sifts down starting from which index?",
      options:["0, the root","n - 1, the last element","The last parent, index n/2 - 1 (integer division), moving backwards to 0","The middle element only"],answer:2,
      why:"Everything after the last parent is a leaf and already a valid heap. Working backwards guarantees both subtrees of the node you're sifting are heaps already, which is what sift-down assumes."},
    {type:"quiz",id:"q-complexity",q:"Building a heap from n unordered values with heapify takes…",
      options:["O(n)","O(n log n)","O(log n)","O(n²)"],answer:0,
      why:"Most nodes are near the leaves, so most sift-downs are very short. The total work sums to about 2n. Calling push n times is the slower O(n log n)."},
    {type:"quiz",id:"q-stable",q:"Is heap sort stable (equal elements keep their original order)?",
      options:["Yes","No"],answer:1,
      why:"Swapping a leaf to the root and sifting jumps equal values over each other. If you need a stable sort, use merge sort (or sort with the original index as a tiebreaker)."},
    {type:"code",id:"heap-sort",title:"Heap sort",fn:"heapSort",
      prompt:"Return `nums` sorted in ascending order using a **heap**: put the values in a min-heap and pop them out. Do not use `Array.prototype.sort`.\n\nThe `Heap` class from the first lessons is provided in the starter; read it before you use it.",
      starter:HEAP_SRC+"\nfunction heapSort(nums) {\n  \n}\n",
      solution:HEAP_SRC+"\nfunction heapSort(nums) {\n  const heap = new Heap();\n  for (const x of nums) heap.push(x);\n  const out = [];\n  while (heap.size()) out.push(heap.pop());\n  return out;\n}\n",
      hint:"Push every number, then pop until the heap is empty and collect what comes out.",
      tests:[
        ["with duplicates",[[5,2,9,1,5,6]],[1,2,5,5,6,9]],
        ["empty",[[]],[]],
        ["single",[[3]],[3]],
        ["reversed",[[3,2,1]],[1,2,3]],
        ["negatives",[[-1,4,-3,0]],[-3,-1,0,4]],
      ]},
    {type:"explain",id:"x-heapify",title:"Explain the O(n) build",
      prompt:"A teammate says: “building a heap from n values must be O(n log n), because each insert is O(log n).” Explain why heapify is actually O(n), and when it matters.",
      rubric:"Heapify sifts down from the last parent backwards instead of pushing n times; most nodes are near the leaves and sift only a short distance (half the nodes are leaves with zero work, a quarter move at most 1 level, ...); the sum of height * nodes at that height converges to O(n); push-n-times is O(n log n) because each of the n pushes can climb log n; matters for building a priority queue from a known list (e.g. Python heapq.heapify) and top-K selections; heap sort overall remains O(n log n) because the n pops cost log n each."},
  ],
  leetcode:[],
},

// ───────────────────────────────────────────── 4
{
  id:"topk",
  title:"The top-K pattern",
  goal:"Find the K best of anything in O(n log K) using a heap of size K, and know why the heap is the opposite of what you expect.",
  mins:30,
  blocks:[
    {md:`“Kth largest”, “top K frequent”, “K closest points”, “K smallest”: all the same problem. You could sort everything in O(n log n). A heap of size **K** does it in **O(n log K)** and works on a stream too, because you never need all n items in memory.

## The counterintuitive part

To keep the **K largest** values, use a **min-heap** of size K:

1. Push each new value.
2. If the heap now holds more than K, pop. The minimum leaves, which is the one that can't be in the top K.
3. When the scan ends, the heap holds exactly the K largest, and its **root is the Kth largest**.

The root of the min-heap is the weakest member of the current top K, which is exactly the one to evict next. (For the K *smallest*, use a max-heap.)`},
    {tpl:`// Kth largest: a min-heap that never grows past k.
function kthLargest(nums, k) {
  const heap = new Heap();                  // min-heap
  for (const x of nums) {
    heap.push(x);
    if (heap.size() > k) heap.pop();        // evict the smallest of the k+1
  }
  return heap.peek();                       // the weakest of the top k = kth largest
}`,title:"Size-K min-heap"},
    {md:`## Heaps of pairs

To rank by something other than the value (frequency, distance), push \`[priority, item]\` and give the heap a comparator: \`new Heap((a, b) => a[0] < b[0])\`.

## Alternatives, and when to choose them

| Approach | Time | When |
| --- | --- | --- |
| Sort everything | O(n log n) | Simplest; fine for small n |
| Size-K heap | O(n log K) | K is much smaller than n, or the input is a stream |
| Quickselect | O(n) average | You need just the Kth value and can modify the array |
| Bucket sort by count | O(n) | Top-K frequent, where counts are bounded by n |`},
  ],
  parts:[
    {type:"quiz",id:"q-which-heap",q:"You scan numbers and want to keep the 3 LARGEST seen so far. Which heap, and what do you evict?",
      options:["A max-heap; evict the maximum","A min-heap of size 3; evict the minimum when it grows to 4","A max-heap of size 3; evict the minimum","A min-heap; never evict"],answer:1,
      why:"The minimum of the current top 3 is the one that a new, bigger value would push out. A min-heap exposes exactly that element at the root."},
    {type:"quiz",id:"q-time",q:"Finding the Kth largest of n numbers with a size-K heap costs…",
      options:["O(n)","O(n log K)","O(K log n)","O(n log n)"],answer:1,
      why:"n pushes, each at most log K (the heap never exceeds K + 1 items), plus at most n pops of the same cost. When K is small this beats a full sort, and it only needs O(K) memory."},
    {type:"quiz",id:"q-stream",q:"“Design a class that, after each new number, returns the Kth largest so far.” What's the core data structure?",
      options:["A sorted array re-sorted on every add","A min-heap of size K","A max-heap of all numbers","A hash map"],answer:1,
      why:"Keep a min-heap of the K largest. Adding a number is O(log K), and the answer is always the root. Re-sorting every time costs O(n log n) per add."},
    {type:"code",id:"kth-largest",title:"Kth largest element",fn:"kthLargest",
      prompt:"Return the `k`th largest element of `nums` (the kth in sorted descending order, counting duplicates). Use a **min-heap of size k**, not a sort.",
      starter:HEAP_SRC+"\nfunction kthLargest(nums, k) {\n  \n}\n",
      solution:HEAP_SRC+"\nfunction kthLargest(nums, k) {\n  const heap = new Heap();\n  for (const x of nums) {\n    heap.push(x);\n    if (heap.size() > k) heap.pop();\n  }\n  return heap.peek();\n}\n",
      hint:"Push every number. Whenever the heap grows past k items, pop the smallest. What's left at the top is the kth largest.",
      tests:[
        ["example",[[3,2,1,5,6,4],2],5],
        ["duplicates count",[[3,2,3,1,2,4,5,5,6],4],4],
        ["single",[[1],1],1],
        ["all equal",[[7,7,7],2],7],
        ["k is n: the minimum",[[4,9,2],3],2],
      ]},
    {type:"code",id:"top-k-frequent",title:"Top K frequent elements",fn:"topKFrequent",compare:"unordered",
      prompt:"Return the `k` most frequent values of `nums`, in any order. The answer is guaranteed to be unique.\n\nCount with a Map, then keep a **min-heap of size k** ordered by count. The `Heap` class is provided; give it a comparator over `[count, value]` pairs.",
      starter:HEAP_SRC+"\nfunction topKFrequent(nums, k) {\n  \n}\n",
      solution:HEAP_SRC+"\nfunction topKFrequent(nums, k) {\n  const count = new Map();\n  for (const x of nums) count.set(x, (count.get(x) || 0) + 1);\n  const heap = new Heap((a, b) => a[0] < b[0]);\n  for (const [value, c] of count) {\n    heap.push([c, value]);\n    if (heap.size() > k) heap.pop();\n  }\n  const out = [];\n  while (heap.size()) out.push(heap.pop()[1]);\n  return out;\n}\n",
      hint:"Same pattern as kthLargest, but the heap holds [count, value] and compares by count. When it passes k entries, drop the least frequent.",
      tests:[
        ["example",[[1,1,1,2,2,3],2],[1,2]],
        ["single",[[1],1],[1]],
        ["one winner",[[1,2,3,3,2,3],1],[3]],
        ["two of three",[[4,4,4,5,5,6,6,6,6],2],[6,4]],
      ]},
  ],
  leetcode:["kth-largest-element-in-a-stream","last-stone-weight","kth-largest-element-in-an-array","top-k-frequent-elements","k-closest-points-to-origin"],
},

// ───────────────────────────────────────────── 5
{
  id:"twoheaps",
  title:"Two heaps: the running median",
  goal:"Keep the median of a growing stream by balancing a max-heap of the lower half against a min-heap of the upper half.",
  mins:25,
  blocks:[
    {md:`The median is the middle value of a sorted list. After each new number you want it again, quickly. Re-sorting is O(n log n) per add, and inserting into a sorted array is O(n).

**Split the numbers into two halves** and keep each in a heap:

- **\`lo\`**: a **max-heap** holding the smaller half. Its root is the largest of the small numbers.
- **\`hi\`**: a **min-heap** holding the larger half. Its root is the smallest of the large numbers.

The median sits at the boundary, so it is always one or both of the two roots. If the heaps are the same size, it's the average of the roots. If one is bigger by one, its root is the median.

## Keeping them balanced

\`lo\` is allowed to be one bigger than \`hi\`, no more. To add \`x\`:

1. Push \`x\` into \`lo\`.
2. Move \`lo\`'s root to \`hi\`. (This guarantees every value in \`lo\` is ≤ every value in \`hi\`, whichever side \`x\` belonged on.)
3. If \`hi\` is now bigger than \`lo\`, move \`hi\`'s root back to \`lo\`.`},
    {tpl:`class MedianFinder {
  constructor() {
    this.lo = new Heap((a, b) => a > b);   // max-heap: smaller half
    this.hi = new Heap();                   // min-heap: larger half
  }
  addNum(x) {
    this.lo.push(x);
    this.hi.push(this.lo.pop());            // lo's max may belong in the upper half
    if (this.hi.size() > this.lo.size()) this.lo.push(this.hi.pop());
  }
  findMedian() {
    return this.lo.size() > this.hi.size()
      ? this.lo.peek()
      : (this.lo.peek() + this.hi.peek()) / 2;
  }
}`,title:"Median of a stream"},
    {tip:"Add: O(log n). Median: O(1). The same idea (“two heaps around a boundary”) solves sliding-window median, IPO-style problems and any “maintain the middle” task."},
  ],
  parts:[
    {type:"quiz",id:"q-kinds",q:"In the two-heap median, which kind of heap holds the SMALLER half of the numbers?",
      options:["A min-heap","A max-heap","Either one","A sorted array"],answer:1,
      why:"You need quick access to the largest of the small numbers, since that's the one closest to the median. That's a max-heap root. The larger half is a min-heap for the same reason."},
    {type:"quiz",id:"q-size",q:"After adding 5 numbers, with lo allowed to be at most one larger than hi, how many numbers are in each?",
      options:["lo: 2, hi: 3","lo: 3, hi: 2","lo: 5, hi: 0","lo: 4, hi: 1"],answer:1,
      why:"With an odd total, lo has the extra one and its root is the median. With an even total both have the same size and the median averages the two roots."},
    {type:"code",id:"median-finder",title:"Find median from a data stream",fn:"MedianFinder",kind:"class",
      prompt:"Implement `class MedianFinder`:\n\n- `addNum(num)`: add a number from the stream\n- `findMedian()`: return the median of all numbers so far (the average of the two middle values when the count is even)\n\nThe `Heap` class is provided (pass a comparator for a max-heap). Both operations should be O(log n) or better.",
      starter:HEAP_SRC+"\nclass MedianFinder {\n  constructor() {\n    \n  }\n  addNum(num) {\n    \n  }\n  findMedian() {\n    \n  }\n}\n",
      solution:HEAP_SRC+"\nclass MedianFinder {\n  constructor() {\n    this.lo = new Heap((a, b) => a > b);\n    this.hi = new Heap();\n  }\n  addNum(num) {\n    this.lo.push(num);\n    this.hi.push(this.lo.pop());\n    if (this.hi.size() > this.lo.size()) this.lo.push(this.hi.pop());\n  }\n  findMedian() {\n    return this.lo.size() > this.hi.size() ? this.lo.peek() : (this.lo.peek() + this.hi.peek()) / 2;\n  }\n}\n",
      hint:"A max-heap for the lower half and a min-heap for the upper half. Add to the max-heap, move its top over, and rebalance so the max-heap is never smaller.",
      tests:[
        ["example",{ops:["MedianFinder","addNum","addNum","findMedian","addNum","findMedian"],args:[[],[1],[2],[],[3],[]]},[null,null,null,1.5,null,2]],
        ["negatives, descending",{ops:["MedianFinder","addNum","addNum","findMedian","addNum","findMedian","addNum","findMedian","addNum","findMedian"],args:[[],[-1],[-2],[],[-3],[],[-4],[],[-5],[]]},[null,null,null,-1.5,null,-2,null,-2.5,null,-3]],
        ["single value",{ops:["MedianFinder","addNum","findMedian"],args:[[],[5],[]]},[null,null,5]],
        ["outliers",{ops:["MedianFinder","addNum","addNum","addNum","findMedian","addNum","findMedian","addNum","findMedian"],args:[[],[1],[100],[2],[],[99],[],[3],[]]},[null,null,null,null,2,null,50.5,null,3]],
      ]},
    {type:"explain",id:"x-median",title:"Why two heaps?",
      prompt:"Explain how you'd maintain the running median of a stream. Why two heaps, which kind is which, how do you keep them balanced, and what's the cost of each operation? What would you do if the numbers were integers in a small range, like ages from 0 to 120?",
      rubric:"Max-heap for the lower half and min-heap for the upper half so the roots are the two middle candidates; the invariant that every value in lo is <= every value in hi and sizes differ by at most one; add by pushing into one heap, moving the top across and rebalancing; median in O(1), add in O(log n); mention that sorting every time or an insertion into a sorted array is too slow; for a small range of integers a counting array/buckets gives O(1) add and O(range) or O(1) median with a cursor, no heaps needed."},
  ],
  leetcode:["find-median-from-data-stream"],
},

// ───────────────────────────────────────────── 6
{
  id:"merge",
  title:"Merging and scheduling",
  goal:"Use a heap to merge K sorted sources and to manage “the next thing to finish”.",
  mins:30,
  blocks:[
    {md:`## Merge K sorted lists

Merging two sorted lists is a two-pointer walk. With K lists, the next output is always the smallest of the **K current heads**. A min-heap of size K gives it in O(log K):

1. Push the first element of each list, as \`[value, whichList, indexInList]\`.
2. Pop the smallest, append its value to the output, and push the **next** element from the same list (if any).
3. Repeat until the heap is empty.

Time is **O(N log K)** for N total elements, and extra memory is O(K). Compare O(N log N) for dumping everything into one array and sorting.`},
    {tpl:`function mergeKSorted(lists) {
  const heap = new Heap((a, b) => a[0] < b[0]);        // [value, which list, index in it]
  lists.forEach((list, i) => { if (list.length) heap.push([list[0], i, 0]); });
  const out = [];
  while (heap.size()) {
    const [val, i, j] = heap.pop();
    out.push(val);
    if (j + 1 < lists[i].length) heap.push([lists[i][j + 1], i, j + 1]);
  }
  return out;
}`,title:"Merge K sorted lists"},
    {md:`## “The next thing to finish”: meeting rooms

How many rooms do you need so no meetings overlap? Sort the meetings by **start time**. Keep a **min-heap of end times** for the rooms in use: its root is the room that frees up first.

For each meeting: if the earliest-ending room is free by this start (\`heap.peek() <= start\`), reuse it (pop it). Then push this meeting's end. The heap's final size is the number of rooms ever needed at once.

The same shape (“a heap of things in progress, keyed by when they finish”) powers CPU schedulers, task schedulers with cooldowns, and event simulation.

## Where you've seen this

**Dijkstra** from the Graphs track is a heap of \`[distance, vertex]\`: pop the closest unsettled vertex, relax its edges, push the improvements. Same structure, different priority.`},
  ],
  parts:[
    {type:"quiz",id:"q-merge-cost",q:"Merging K sorted lists with N elements in total, using a heap of size K, costs…",
      options:["O(N)","O(N log K)","O(N log N)","O(K log N)"],answer:1,
      why:"Every one of the N elements is pushed and popped once, and the heap never holds more than K items, so each operation is O(log K). Collecting everything and sorting would be O(N log N)."},
    {type:"quiz",id:"q-rooms",q:"In Meeting Rooms II, what does the heap contain?",
      options:["Start times of all meetings","The end times of meetings currently occupying a room","The meetings sorted by length","The free rooms"],answer:1,
      why:"The root is the earliest end time: the room that frees up first. If even that room is still busy at the new meeting's start, every room is busy and you need a new one."},
    {type:"quiz",id:"q-touching",q:"Meetings [1,5] and [5,9]. Do they need two rooms?",
      options:["Yes, they overlap at 5","No, the first ends exactly when the second starts, so one room suffices"],answer:1,
      why:"Intervals are half-open here: a meeting ending at 5 frees the room at 5. That's the difference between heap.peek() <= start (reuse) and < start (a new room)."},
    {type:"code",id:"merge-k",title:"Merge K sorted arrays",fn:"mergeKSorted",
      prompt:"Given an array of `lists`, each one sorted ascending (some may be empty), return a single sorted array of all their values.\n\nUse a min-heap of the current head of each list so the cost is O(N log K). The `Heap` class is provided.",
      starter:HEAP_SRC+"\nfunction mergeKSorted(lists) {\n  \n}\n",
      solution:HEAP_SRC+"\nfunction mergeKSorted(lists) {\n  const heap = new Heap((a, b) => a[0] < b[0]);\n  lists.forEach((list, i) => {\n    if (list.length) heap.push([list[0], i, 0]);\n  });\n  const out = [];\n  while (heap.size()) {\n    const [val, i, j] = heap.pop();\n    out.push(val);\n    if (j + 1 < lists[i].length) heap.push([lists[i][j + 1], i, j + 1]);\n  }\n  return out;\n}\n",
      hint:"Heap entries are [value, listIndex, indexInList]. After popping one, push the next value from the same list if there is one.",
      tests:[
        ["example",[[[1,4,5],[1,3,4],[2,6]]],[1,1,2,3,4,4,5,6]],
        ["no lists",[[]],[]],
        ["one empty list",[[[]]],[]],
        ["empties mixed in",[[[],[1],[]]],[1]],
        ["uneven lengths",[[[5],[1,2,3]]],[1,2,3,5]],
      ]},
    {type:"code",id:"meeting-rooms",title:"Meeting Rooms II",fn:"minMeetingRooms",
      prompt:"Given meeting time intervals `[start, end]`, return the **minimum number of rooms** needed so that no two meetings in the same room overlap. A meeting that ends at time `t` frees its room for one starting at `t`.\n\nSort by start, and use a min-heap of end times. The `Heap` class is provided.",
      starter:HEAP_SRC+"\nfunction minMeetingRooms(intervals) {\n  \n}\n",
      solution:HEAP_SRC+"\nfunction minMeetingRooms(intervals) {\n  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);\n  const ends = new Heap();\n  for (const [start, end] of sorted) {\n    if (ends.size() && ends.peek() <= start) ends.pop();\n    ends.push(end);\n  }\n  return ends.size();\n}\n",
      hint:"Sort by start. For each meeting, if the earliest end time in the heap is <= this start, pop it (reuse that room). Then push this meeting's end. The heap's size is the answer.",
      tests:[
        ["example",[[[0,30],[5,10],[15,20]]],2],
        ["no overlap",[[[7,10],[2,4]]],1],
        ["no meetings",[[]],0],
        ["all overlap",[[[1,5],[2,6],[3,7],[4,8]]],4],
        ["touching ends reuse a room",[[[1,5],[5,9]]],1],
      ]},
  ],
  leetcode:["merge-k-sorted-lists","meeting-rooms-ii","task-scheduler","reorganize-string"],
},

  ],
});
