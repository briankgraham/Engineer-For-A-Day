// Learning tab: the Trees track. Same schema as learn_data.js (see the header there). Loaded after learn_data.js, before learn.js.
//
// Extra fields used here:
//   viz blocks over trees:   {viz: "tree" | "preorder" | "inorder" | "postorder" | "levelorder" | "bstSearch" | "bstInsert",
//                             tree: [level-order array, null = no node], value (bstSearch / bstInsert), title}
//                            bstInsert's tree must already contain `value` as a leaf; it is drawn hidden until it is attached.
//   code parts over trees:   argTypes: ["tree", ...] turns a level-order array in the tests into TreeNodes; returnType: "tree" turns
//                            the returned TreeNode back into a level-order array. A test input like [[1,2,3]] is one tree argument.
const TREE_NODE_DOC = "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *   this.val = (val===undefined ? 0 : val)\n *   this.left = (left===undefined ? null : left)\n *   this.right = (right===undefined ? null : right)\n * }\n */\n";
LEARN_TRACKS.push({
  id:"trees",
  title:"Trees",
  icon:"🌳",
  tagline:"From “what is a binary tree” to validating a BST, lowest common ancestor and rebuilding a tree from its traversals.",
  outcomes:[
    "Write a recursive tree function by naming the base case and what each child returns",
    "Write pre-, in- and post-order DFS and level-order BFS from memory",
    "Use the BST property to search, insert and validate in O(height)",
    "Tell “pass information down” from “return information up” and use both",
  ],
  ready:[
    ["maximum-depth-of-binary-tree","recursion"],["same-tree","recursion"],["invert-binary-tree","recursion"],["symmetric-tree","recursion"],
    ["binary-tree-inorder-traversal","dfs"],["binary-tree-level-order-traversal","bfs"],["binary-tree-right-side-view","bfs"],["minimum-depth-of-binary-tree","bfs"],
    ["validate-binary-search-tree","bst"],["kth-smallest-element-in-a-bst","bst"],["insert-into-a-binary-search-tree","bst"],
    ["lowest-common-ancestor-of-a-binary-search-tree","paths"],["path-sum","paths"],["count-good-nodes-in-binary-tree","paths"],["diameter-of-binary-tree","paths"],
    ["balanced-binary-tree","patterns"],["lowest-common-ancestor-of-a-binary-tree","paths"],["construct-binary-tree-from-preorder-and-inorder-traversal","patterns"],
    ["binary-tree-maximum-path-sum","paths"],["serialize-and-deserialize-binary-tree","patterns"],
  ],
  lessons:[

// ───────────────────────────────────────────── 1
{
  id:"anatomy",
  title:"What a tree is",
  goal:"Name the parts of a binary tree and see why almost every tree problem is solved by recursion.",
  mins:15,
  blocks:[
    {md:`A **tree** is a connected graph with no cycles, drawn with one special vertex on top, the **root**. Every other node has exactly one **parent**. Nodes with no children are **leaves**.

In interviews you almost always get a **binary tree**: each node has at most two children, called \`left\` and \`right\`.

\`\`\`js
function TreeNode(val, left, right) {
  this.val = val;
  this.left = left === undefined ? null : left;
  this.right = right === undefined ? null : right;
}
\`\`\`

Your function receives only the \`root\`. Everything else is reached by following \`left\` and \`right\`. An empty tree is just \`root === null\`.`},
    {viz:"tree",title:"A binary tree: 9 nodes, 5 leaves",tree:[8,3,10,1,6,null,14,null,null,4,7,13]},
    {md:`## The vocabulary

| Term | Meaning |
| --- | --- |
| **Root** | The top node. The only one with no parent |
| **Leaf** | A node with no children (both \`left\` and \`right\` are null) |
| **Depth** of a node | How many edges from the root down to it. The root has depth 0 |
| **Height** of a tree | The longest root-to-leaf path. Count it in **nodes** or in **edges**; LeetCode problems say which |
| **Subtree** | A node together with everything below it. **Every subtree is itself a tree** |
| **Balanced** | The left and right heights differ by at most 1 at every node. Height stays near log n |
| **Complete** | Every level full except possibly the last, which fills from the left. Heaps are complete trees |

## Why recursion fits so well

Every subtree is a smaller tree of the same shape. So a function on a tree can ask its two children the same question, and combine the answers. That is the whole technique, and the next lesson is about doing it fluently.`},
    {tip:"Tree problems are given as level-order arrays like [3,9,20,null,null,15,7]. Read it row by row: 3 is the root, 9 and 20 are its children, then 9 has no children (null, null) and 20 has 15 and 7."},
  ],
  parts:[
    {type:"quiz",id:"q-height",q:"A binary tree has 7 nodes. What are the smallest and largest possible heights, counting nodes on the longest root-to-leaf path?",
      options:["2 and 7","3 and 7","3 and 4","4 and 7"],answer:1,
      why:"A perfect tree packs 7 nodes into 3 levels (1 + 2 + 4). A chain, where every node has one child, stretches them into 7 levels. Balanced trees have height about log n; degenerate ones have height n, which is why “worst case O(height)” matters."},
    {type:"quiz",id:"q-nulls",q:"A binary tree has n nodes. How many null child pointers does it contain in total?",
      options:["n - 1","n","n + 1","2n"],answer:2,
      why:"Each node has two child slots: 2n in all. The tree has n - 1 edges, so n - 1 slots are filled and 2n - (n - 1) = n + 1 are null. It's the reason recursive code hits its base case so often."},
    {type:"quiz",id:"q-recursion",q:"Why does recursion fit trees so naturally?",
      options:["Trees are always small","Each child is the root of a smaller tree of the same shape, so the function can call itself on it","Recursion is faster than loops","Trees have no cycles, so there is nothing to track"],answer:1,
      why:"A subtree is a tree. Solve the question for the left and right subtrees, combine the answers, and you have solved it for this node. (No cycles does help: unlike a general graph, you never need a visited set.)"},
    {type:"code",id:"leaves",title:"Count the leaves",fn:"countLeaves",argTypes:["tree"],
      prompt:"Given the `root` of a binary tree, return how many **leaves** it has. A leaf is a node with no children. An empty tree has 0 leaves.\n\nA node with only one child is **not** a leaf.",
      starter:TREE_NODE_DOC+"function countLeaves(root) {\n  \n}\n",
      solution:"function countLeaves(root) {\n  if (!root) return 0;\n  if (!root.left && !root.right) return 1;\n  return countLeaves(root.left) + countLeaves(root.right);\n}\n",
      hint:"Three cases: no node (0), a leaf (1), or an inner node (the leaves on the left plus the leaves on the right).",
      tests:[
        ["single node",[[1]],1],
        ["empty tree",[[]],0],
        ["perfect tree",[[1,2,3,4,5,6,7]],4],
        ["one-child nodes are not leaves",[[1,2,null,3]],1],
        ["mixed",[[1,2,3,null,4]],2],
      ]},
  ],
  leetcode:[],
},

// ───────────────────────────────────────────── 2
{
  id:"recursion",
  title:"Thinking recursively",
  goal:"Write a recursive tree function by answering two questions: what is the base case, and what do my children tell me?",
  mins:25,
  blocks:[
    {md:`Almost every tree function is the same three lines:

1. **Base case.** What is the answer for an empty tree (\`null\`)? Often \`0\`, \`true\`, \`null\` or \`[]\`.
2. **Trust the recursion.** Call the function on \`root.left\` and \`root.right\`, and assume each call returns the right answer for its subtree.
3. **Combine.** Use the two answers, plus \`root.val\`, to build this node's answer.`},
    {tpl:`// Maximum depth (in nodes). The shape of most tree recursions.
function maxDepth(root) {
  if (!root) return 0;                // 1. base case: an empty tree has depth 0
  const l = maxDepth(root.left);      // 2. trust the recursion
  const r = maxDepth(root.right);
  return 1 + Math.max(l, r);          // 3. combine: this node adds one level
}`,title:"Recursive tree function"},
    {md:`## Two-tree recursion

Some problems walk **two** trees at once (same tree, symmetric tree, subtree of another). The base case now has three branches: both null, one null, or both present. Then you recurse on the matching pair of children.`},
    {tpl:`function isSameTree(p, q) {
  if (!p && !q) return true;          // both empty: same
  if (!p || !q) return false;         // only one empty: different
  return p.val === q.val
    && isSameTree(p.left, q.left)
    && isSameTree(p.right, q.right);
}`,title:"Walking two trees together"},
    {warn:"The most common crash is reading root.val or root.left when root is null. If you can reach a null node, your base case must handle it before you touch any field."},
  ],
  parts:[
    {type:"quiz",id:"q-base",q:"What is the right base-case return for “is this tree a valid …” style checks (like isSameTree) when both trees are empty?",
      options:["false, there is nothing to compare","true, two empty trees are identical","null","It throws"],answer:1,
      why:"Two empty trees are equal, and an empty subtree should never make its parent fail. Returning true for the base case (and letting a real mismatch return false) is what makes && chains work."},
    {type:"quiz",id:"q-leafdepth",q:"maxDepth is called on a tree with one node. How many calls to maxDepth happen in total (including the first)?",
      options:["1","2","3","4"],answer:2,
      why:"The root's call, plus one call each for its null left and null right children. This is why recursive tree code visits n + (n + 1) positions, and why the base case is hit so often."},
    {type:"code",id:"max-depth",title:"Maximum depth",fn:"maxDepth",argTypes:["tree"],
      prompt:"Return the **maximum depth** of a binary tree: the number of nodes along the longest path from the root down to a leaf. An empty tree has depth 0.",
      starter:TREE_NODE_DOC+"function maxDepth(root) {\n  \n}\n",
      solution:"function maxDepth(root) {\n  if (!root) return 0;\n  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));\n}\n",
      hint:"An empty tree is 0. Otherwise it is 1 plus the deeper of the two subtrees.",
      tests:[
        ["example",[[3,9,20,null,null,15,7]],3],
        ["empty",[[]],0],
        ["single node",[[1]],1],
        ["right chain",[[1,null,2]],2],
        ["left chain of four",[[1,2,null,3,null,4]],4],
      ]},
    {type:"code",id:"same-tree",title:"Same tree",fn:"isSameTree",argTypes:["tree","tree"],
      prompt:"Given the roots of two binary trees `p` and `q`, return `true` if they have the **same structure and the same values** in every node.",
      starter:TREE_NODE_DOC+"function isSameTree(p, q) {\n  \n}\n",
      solution:"function isSameTree(p, q) {\n  if (!p && !q) return true;\n  if (!p || !q) return false;\n  return p.val === q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right);\n}\n",
      hint:"Three base cases: both null (true), exactly one null (false). Then compare the values and recurse on both pairs of children.",
      tests:[
        ["identical",[[1,2,3],[1,2,3]],true],
        ["same values, different shape",[[1,2],[1,null,2]],false],
        ["same shape, different values",[[1,2,1],[1,1,2]],false],
        ["both empty",[[],[]],true],
        ["one empty",[[1],[]],false],
      ]},
    {type:"code",id:"invert",title:"Invert a binary tree",fn:"invertTree",argTypes:["tree"],returnType:"tree",
      prompt:"Invert the tree (mirror it left to right) and return its root. Every node's left and right children swap.",
      starter:TREE_NODE_DOC+"function invertTree(root) {\n  \n}\n",
      solution:"function invertTree(root) {\n  if (!root) return null;\n  const left = invertTree(root.left);\n  const right = invertTree(root.right);\n  root.left = right;\n  root.right = left;\n  return root;\n}\n",
      hint:"Invert both subtrees first, then swap the two (already inverted) children.",
      tests:[
        ["example",[[4,2,7,1,3,6,9]],[4,7,2,9,6,3,1]],
        ["small",[[2,1,3]],[2,3,1]],
        ["empty",[[]],[]],
        ["one child",[[1,2]],[1,null,2]],
        ["left chain becomes right chain",[[1,2,null,3]],[1,null,2,null,3]],
      ]},
    {type:"explain",id:"x-recursion",title:"In your own words",
      prompt:"Explain to a teammate how you'd write any recursive tree function from scratch. What questions do you ask yourself, and where do beginners usually go wrong?",
      rubric:"Names the base case (null node, and what to return for it); trusting the recursive call to solve the subtree; combining left, right and the current value; examples such as maxDepth or invertTree; common mistakes: touching fields of null, forgetting the base case, returning the wrong value for the empty tree, recomputing work, confusing depth counted in nodes vs edges; mentions O(n) time and O(height) stack space."},
  ],
  leetcode:["maximum-depth-of-binary-tree","same-tree","invert-binary-tree","symmetric-tree"],
},

// ───────────────────────────────────────────── 3
{
  id:"dfs",
  title:"Depth-first traversals",
  goal:"Write pre-order, in-order and post-order from memory and know which one a problem wants.",
  mins:25,
  blocks:[
    {md:`A **traversal** visits every node once. **Depth-first** goes all the way down one side before coming back. The three flavors differ only in **when you visit the node** relative to its two subtrees:

| Order | Sequence | Typical use |
| --- | --- | --- |
| **Pre-order** | node, left, right | Copy a tree, serialize it, anything that needs the parent before its children |
| **In-order** | left, node, right | On a BST this gives the values in **sorted order** |
| **Post-order** | left, right, node | Anything that needs the children's answers first: heights, sizes, deleting a tree |

Step through all three. The call stack on the right is the recursion; watch when each value lands in the output.`},
    {viz:"preorder",title:"Pre-order: node, left, right",tree:[1,2,3,4,5,null,6]},
    {viz:"inorder",title:"In-order: left, node, right (on a BST this is sorted)",tree:[4,2,6,1,3,5,7]},
    {viz:"postorder",title:"Post-order: left, right, node",tree:[1,2,3,4,5,null,6]},
    {tpl:`// All three orders are the same function with the visit line moved.
function inorder(root, out = []) {
  if (!root) return out;
  inorder(root.left, out);
  out.push(root.val);               // pre-order: move this line above the left call
  inorder(root.right, out);         // post-order: move it below the right call
  return out;
}`,title:"Recursive traversal"},
    {tpl:`// Iterative in-order with an explicit stack: go left as far as you can, visit, then go right.
function inorderTraversal(root) {
  const out = [], stack = [];
  let cur = root;
  while (cur || stack.length) {
    while (cur) { stack.push(cur); cur = cur.left; }
    cur = stack.pop();
    out.push(cur.val);
    cur = cur.right;
  }
  return out;
}`,title:"Iterative in-order (stack)"},
    {tip:"Recursion depth equals the tree's height. A skewed tree with 100,000 nodes can overflow the call stack. That's the reason to know the iterative version."},
  ],
  parts:[
    {type:"quiz",id:"q-which-order",q:"You want to delete every node of a tree safely, freeing each node only after its children are gone. Which order?",
      options:["Pre-order","In-order","Post-order","Level-order"],answer:2,
      why:"Post-order handles both children before the node. In a language with manual memory management this prevents using a node after freeing it. Computing heights and subtree sums uses the same shape."},
    {type:"quiz",id:"q-sorted",q:"Which traversal of a binary search tree produces its values in sorted order?",
      options:["Pre-order","In-order","Post-order","None of them"],answer:1,
      why:"Everything in the left subtree is smaller than the node and everything in the right subtree is larger, so left, node, right is ascending. “Kth smallest in a BST” is an in-order traversal that stops at the kth value."},
    {type:"quiz",id:"q-pre",q:"The pre-order of a tree is [1, 2, 4, 5, 3]. Which node is the root?",
      options:["1","2","3","It can't be known"],answer:0,
      why:"Pre-order visits the root first. This is the key fact behind rebuilding a tree from its traversals: pre-order tells you the root, in-order tells you what falls on each side of it."},
    {type:"code",id:"inorder",title:"In-order traversal",fn:"inorderTraversal",argTypes:["tree"],
      prompt:"Return the in-order traversal of the tree as an array of values: left subtree, node, right subtree.",
      starter:TREE_NODE_DOC+"function inorderTraversal(root) {\n  \n}\n",
      solution:"function inorderTraversal(root) {\n  const out = [];\n  const go = (node) => {\n    if (!node) return;\n    go(node.left);\n    out.push(node.val);\n    go(node.right);\n  };\n  go(root);\n  return out;\n}\n",
      hint:"Write a helper that appends to one shared array: recurse left, push the value, recurse right.",
      tests:[
        ["example",[[1,null,2,3]],[1,3,2]],
        ["empty",[[]],[]],
        ["single",[[1]],[1]],
        ["BST is sorted",[[4,2,6,1,3,5,7]],[1,2,3,4,5,6,7]],
      ]},
    {type:"code",id:"postorder",title:"Post-order traversal",fn:"postorderTraversal",argTypes:["tree"],
      prompt:"Return the post-order traversal of the tree as an array of values: left subtree, right subtree, node.",
      starter:TREE_NODE_DOC+"function postorderTraversal(root) {\n  \n}\n",
      solution:"function postorderTraversal(root) {\n  const out = [];\n  const go = (node) => {\n    if (!node) return;\n    go(node.left);\n    go(node.right);\n    out.push(node.val);\n  };\n  go(root);\n  return out;\n}\n",
      hint:"Same helper as in-order, with the push moved after both recursive calls.",
      tests:[
        ["example",[[1,null,2,3]],[3,2,1]],
        ["perfect tree",[[4,2,6,1,3,5,7]],[1,3,2,5,7,6,4]],
        ["empty",[[]],[]],
        ["root with two leaves",[[1,2,3]],[2,3,1]],
      ]},
    {type:"code",id:"inorder-iter",title:"In-order without recursion",fn:"inorderIterative",argTypes:["tree"],
      prompt:"Return the in-order traversal again, but use an explicit **stack** and a loop instead of recursion. This is how you avoid a stack overflow on a very deep tree, and a common follow-up question.",
      starter:TREE_NODE_DOC+"function inorderIterative(root) {\n  \n}\n",
      solution:"function inorderIterative(root) {\n  const out = [], stack = [];\n  let cur = root;\n  while (cur || stack.length) {\n    while (cur) {\n      stack.push(cur);\n      cur = cur.left;\n    }\n    cur = stack.pop();\n    out.push(cur.val);\n    cur = cur.right;\n  }\n  return out;\n}\n",
      hint:"Push nodes while walking left. When you can't go further left, pop one, record it, and move to its right child.",
      tests:[
        ["example",[[1,null,2,3]],[1,3,2]],
        ["BST is sorted",[[4,2,6,1,3,5,7]],[1,2,3,4,5,6,7]],
        ["left chain",[[3,2,null,1]],[1,2,3]],
        ["empty",[[]],[]],
      ]},
  ],
  leetcode:["binary-tree-inorder-traversal","binary-tree-preorder-traversal","binary-tree-postorder-traversal"],
},

// ───────────────────────────────────────────── 4
{
  id:"bfs",
  title:"Level by level (BFS)",
  goal:"Process a tree one level at a time with a queue, and know when BFS beats DFS.",
  mins:25,
  blocks:[
    {md:`**Breadth-first search** visits the root, then everything one step away, then everything two steps away. It uses a **queue** instead of the call stack.

For trees the useful trick is processing **one level per pass of the outer loop**: before the inner loop, snapshot \`queue.length\`. Those are exactly the nodes of this level; the children you enqueue meanwhile belong to the next.`},
    {viz:"levelorder",title:"Level-order traversal",tree:[3,9,20,null,null,15,7]},
    {tpl:`// Level-order: returns an array of levels.
function levelOrder(root) {
  if (!root) return [];
  const levels = [];
  const queue = [root];
  while (queue.length) {
    const size = queue.length;          // nodes in this level
    const level = [];
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    levels.push(level);
  }
  return levels;
}`,title:"BFS by levels"},
    {md:`## DFS or BFS?

- **Level-based questions** (level order, right side view, zigzag, average of each level): BFS.
- **Shortest path to the nearest leaf** (minimum depth): BFS can stop at the first leaf it dequeues. DFS must look at every node.
- **Anything that combines the answers of subtrees** (height, path sums, validity): DFS.
- Memory: BFS holds up to a whole level (O(width)); DFS holds O(height).`},
    {tip:"In JavaScript, queue.shift() is O(n) on huge arrays. For interview-size input it's fine; mention it, or use an index pointer (head) instead of shifting."},
  ],
  parts:[
    {type:"quiz",id:"q-size",q:"In the level-order loop, why do we save `const size = queue.length` before the inner for loop?",
      options:["To avoid an infinite loop on cyclic trees","The queue grows as we enqueue children, so we need to know how many nodes belong to the current level","It makes the loop faster","Because shift() requires it"],answer:1,
      why:"While you process this level you push the next level's nodes. Reading queue.length in the for condition would mix levels together."},
    {type:"quiz",id:"q-mindepth",q:"For “minimum depth of a binary tree”, why can BFS be better than DFS?",
      options:["BFS uses less memory on every tree","BFS returns as soon as it reaches the first leaf, without exploring deeper levels","DFS can't compute depth","BFS visits fewer nodes in the worst case"],answer:1,
      why:"The first leaf BFS dequeues is the shallowest one. In the worst case (a chain) both visit every node, but on a wide tree with a shallow leaf BFS stops early."},
    {type:"code",id:"level-order",title:"Level-order traversal",fn:"levelOrder",argTypes:["tree"],
      prompt:"Return the level-order traversal as an array of arrays: the values of each level, left to right, from the root down.",
      starter:TREE_NODE_DOC+"function levelOrder(root) {\n  \n}\n",
      solution:"function levelOrder(root) {\n  if (!root) return [];\n  const levels = [];\n  const queue = [root];\n  while (queue.length) {\n    const size = queue.length;\n    const level = [];\n    for (let i = 0; i < size; i++) {\n      const node = queue.shift();\n      level.push(node.val);\n      if (node.left) queue.push(node.left);\n      if (node.right) queue.push(node.right);\n    }\n    levels.push(level);\n  }\n  return levels;\n}\n",
      hint:"Queue starts with the root. Each outer pass: record size = queue.length, process exactly that many nodes, and enqueue their children.",
      tests:[
        ["example",[[3,9,20,null,null,15,7]],[[3],[9,20],[15,7]]],
        ["single",[[1]],[[1]]],
        ["empty",[[]],[]],
        ["uneven",[[1,2,3,4,null,null,5]],[[1],[2,3],[4,5]]],
      ]},
    {type:"code",id:"right-view",title:"Right side view",fn:"rightSideView",argTypes:["tree"],
      prompt:"Imagine standing on the right side of the tree. Return the values you can see, top to bottom: the **last node of each level**.\n\nA node on the left can be visible if the right side is shorter at that depth.",
      starter:TREE_NODE_DOC+"function rightSideView(root) {\n  \n}\n",
      solution:"function rightSideView(root) {\n  if (!root) return [];\n  const out = [];\n  let queue = [root];\n  while (queue.length) {\n    out.push(queue[queue.length - 1].val);\n    const next = [];\n    for (const node of queue) {\n      if (node.left) next.push(node.left);\n      if (node.right) next.push(node.right);\n    }\n    queue = next;\n  }\n  return out;\n}\n",
      hint:"Level-order, but keep only the last value of each level.",
      tests:[
        ["example",[[1,2,3,null,5,null,4]],[1,3,4]],
        ["only right",[[1,null,3]],[1,3]],
        ["empty",[[]],[]],
        ["left is deeper",[[1,2,3,4]],[1,3,4]],
        ["left only",[[1,2]],[1,2]],
      ]},
    {type:"code",id:"min-depth",title:"Minimum depth",fn:"minDepth",argTypes:["tree"],
      prompt:"Return the **minimum depth**: the number of nodes on the shortest path from the root down to a **leaf**. An empty tree is 0.\n\nCareful: a node with one child is not a leaf, so `[1,2]` has minimum depth 2, not 1.",
      starter:TREE_NODE_DOC+"function minDepth(root) {\n  \n}\n",
      solution:"function minDepth(root) {\n  if (!root) return 0;\n  let queue = [root];\n  let depth = 1;\n  while (queue.length) {\n    const next = [];\n    for (const node of queue) {\n      if (!node.left && !node.right) return depth;\n      if (node.left) next.push(node.left);\n      if (node.right) next.push(node.right);\n    }\n    queue = next;\n    depth++;\n  }\n  return depth;\n}\n",
      hint:"BFS by levels. The first node you see with no children ends the search; return the current level number.",
      tests:[
        ["example",[[3,9,20,null,null,15,7]],2],
        ["long chain",[[2,null,3,null,4,null,5,null,6]],5],
        ["empty",[[]],0],
        ["one child is not a leaf",[[1,2]],2],
        ["single",[[1]],1],
      ]},
  ],
  leetcode:["binary-tree-level-order-traversal","binary-tree-right-side-view","minimum-depth-of-binary-tree","binary-tree-zigzag-level-order-traversal"],
},

// ───────────────────────────────────────────── 5
{
  id:"bst",
  title:"Binary search trees",
  goal:"Use the ordering property to search, insert and validate in O(height).",
  mins:30,
  blocks:[
    {md:`A **binary search tree** (BST) adds one rule: for every node, **everything in its left subtree is smaller, and everything in its right subtree is larger**. (Not just its children: the whole subtree.)

That rule lets one comparison discard half the tree, like binary search. Search, insert and delete cost **O(height)**: O(log n) when balanced, O(n) when the tree is a chain.`},
    {viz:"bstSearch",title:"Search for 7: each comparison discards a subtree",tree:[8,3,10,1,6,null,14,null,null,4,7,13],value:7},
    {tpl:`// Search: go left or right, never both.
function searchBST(root, val) {
  while (root && root.val !== val) {
    root = val < root.val ? root.left : root.right;
  }
  return root;                         // the node, or null
}`,title:"BST search"},
    {md:`## Insert

Walk down exactly as a search would, until you fall off the tree. The empty spot you reach is where the new node belongs. **No existing node moves.**`},
    {viz:"bstInsert",title:"Insert 5",tree:[8,3,10,1,6,null,14,null,null,5],value:5},
    {tpl:`function insertIntoBST(root, val) {
  if (!root) return new TreeNode(val);   // fell off the tree: this is the spot
  if (val < root.val) root.left = insertIntoBST(root.left, val);
  else root.right = insertIntoBST(root.right, val);
  return root;
}`,title:"BST insert (recursive)"},
    {md:`## Validating a BST

The classic bug is checking only each node against its **parent**. That misses a node deep in the left subtree that is bigger than an ancestor. The fix is to pass a **range** down: every node must lie strictly between a lower and an upper bound, and going left tightens the upper bound, going right tightens the lower one.`},
    {tpl:`function isValidBST(root, lo = -Infinity, hi = Infinity) {
  if (!root) return true;
  if (root.val <= lo || root.val >= hi) return false;
  return isValidBST(root.left, lo, root.val)
      && isValidBST(root.right, root.val, hi);
}`,title:"Validate with bounds"},
    {warn:"Duplicates: LeetCode's BST problems say whether equal values are allowed. In Validate BST they are not, which is why the checks use <= and >=."},
  ],
  parts:[
    {type:"quiz",id:"q-worst",q:"What is the worst-case time to search a BST with n nodes?",
      options:["O(1)","O(log n)","O(n)","O(n log n)"],answer:2,
      why:"If values were inserted in sorted order the tree is a chain, and search walks all n nodes. Self-balancing trees (AVL, red-black) exist to guarantee O(log n)."},
    {type:"quiz",id:"q-badvalidate",q:"Someone validates a BST by checking, at each node, that left.val < node.val < right.val. Which tree fools that check?",
      options:["[2,1,3]","[5,1,4,null,null,3,6]","[1]","[3,1,5]"],answer:1,
      why:"Every node is fine against its own children (1 < 5 > 4 on the root's side, 3 < 4 < 6), yet 3 sits in the right subtree of 5 and is smaller than 5. Only a range check, or comparing an in-order traversal against sorted order, catches it."},
    {type:"quiz",id:"q-inorder",q:"A quick way to check a BST is to do an in-order traversal. What should you see?",
      options:["Values in strictly increasing order","Values in non-decreasing order, allowing duplicates","The root first","Values equal to the level order"],answer:0,
      why:"In-order on a valid BST is strictly ascending. If any value is not greater than the one before it, the tree is not a valid BST (and that's also the heart of the Kth Smallest solution)."},
    {type:"code",id:"search-bst",title:"Search in a BST",fn:"searchBST",argTypes:["tree","plain"],returnType:"tree",
      prompt:"Given the `root` of a BST and a value `val`, return the **subtree** rooted at the node whose value equals `val`, or `null` if there is none.",
      starter:TREE_NODE_DOC+"function searchBST(root, val) {\n  \n}\n",
      solution:"function searchBST(root, val) {\n  while (root && root.val !== val) {\n    root = val < root.val ? root.left : root.right;\n  }\n  return root;\n}\n",
      hint:"Loop: if val is smaller than the current value go left, otherwise go right, until you hit val or null.",
      tests:[
        ["found with children",[[4,2,7,1,3],2],[2,1,3]],
        ["not found",[[4,2,7,1,3],5],[]],
        ["root",[[5],5],[5]],
        ["leaf on the right",[[4,2,7,1,3],7],[7]],
      ]},
    {type:"code",id:"insert-bst",title:"Insert into a BST",fn:"insertIntoBST",argTypes:["tree","plain"],returnType:"tree",
      prompt:"Insert `val` into the BST and return the root. `val` is not already in the tree. Attach it as a **new leaf**; do not rearrange existing nodes.\n\n`TreeNode` is defined at the top of the starter so you can create nodes.",
      starter:"function TreeNode(val, left, right) {\n  this.val = val === undefined ? 0 : val;\n  this.left = left === undefined ? null : left;\n  this.right = right === undefined ? null : right;\n}\n\nfunction insertIntoBST(root, val) {\n  \n}\n",
      solution:"function TreeNode(val, left, right) {\n  this.val = val === undefined ? 0 : val;\n  this.left = left === undefined ? null : left;\n  this.right = right === undefined ? null : right;\n}\n\nfunction insertIntoBST(root, val) {\n  if (!root) return new TreeNode(val);\n  if (val < root.val) root.left = insertIntoBST(root.left, val);\n  else root.right = insertIntoBST(root.right, val);\n  return root;\n}\n",
      hint:"If root is null, return a new node. Otherwise recurse into the correct side and assign the result back to that child pointer.",
      tests:[
        ["example",[[4,2,7,1,3],5],[4,2,7,1,3,5]],
        ["empty tree",[[],5],[5]],
        ["deeper",[[40,20,60,10,30,50,70],25],[40,20,60,10,30,50,70,null,null,25]],
        ["goes left",[[2],1],[2,1]],
      ]},
    {type:"code",id:"valid-bst",title:"Validate a BST",fn:"isValidBST",argTypes:["tree"],
      prompt:"Return `true` if the tree is a valid BST: every node's left subtree holds only **smaller** values and its right subtree only **larger** values. Duplicates make it invalid.",
      starter:TREE_NODE_DOC+"function isValidBST(root) {\n  \n}\n",
      solution:"function isValidBST(root, lo = -Infinity, hi = Infinity) {\n  if (!root) return true;\n  if (root.val <= lo || root.val >= hi) return false;\n  return isValidBST(root.left, lo, root.val) && isValidBST(root.right, root.val, hi);\n}\n",
      hint:"Carry a (lo, hi) range down. Going left sets hi to the current value; going right sets lo to it. Every node must be strictly inside its range.",
      tests:[
        ["valid",[[2,1,3]],true],
        ["right child too small",[[5,1,4,null,null,3,6]],false],
        ["deep violation",[[5,4,6,null,null,3,7]],false],
        ["single",[[1]],true],
        ["empty",[[]],true],
        ["duplicates",[[2,2,2]],false],
        ["bigger tree",[[3,1,5,0,2,4,6]],true],
      ]},
    {type:"code",id:"kth-smallest",title:"Kth smallest in a BST",fn:"kthSmallest",argTypes:["tree","plain"],
      prompt:"Return the `k`th smallest value (1-indexed) in a BST. Use what you know about in-order traversal.",
      starter:TREE_NODE_DOC+"function kthSmallest(root, k) {\n  \n}\n",
      solution:"function kthSmallest(root, k) {\n  const stack = [];\n  let cur = root;\n  while (cur || stack.length) {\n    while (cur) {\n      stack.push(cur);\n      cur = cur.left;\n    }\n    cur = stack.pop();\n    if (--k === 0) return cur.val;\n    cur = cur.right;\n  }\n  return -1;\n}\n",
      hint:"In-order visits values in ascending order. Count as you visit and stop at the kth. The iterative version can return early.",
      tests:[
        ["example",[[3,1,4,null,2],1],1],
        ["third",[[5,3,6,2,4,null,null,1],3],3],
        ["last",[[2,1,3],3],3],
        ["root only",[[1],1],1],
      ]},
  ],
  leetcode:["validate-binary-search-tree","kth-smallest-element-in-a-bst","insert-into-a-binary-search-tree"],
},

// ───────────────────────────────────────────── 6
{
  id:"paths",
  title:"Paths, sums and ancestors",
  goal:"Choose between passing information down and returning information up, and use both together.",
  mins:35,
  blocks:[
    {md:`Most medium and hard tree problems are one of two shapes, or a mix:

- **Pass down.** The parent hands the child some state: a running sum, the maximum seen so far, a lower/upper bound. (Validate BST used this.)
- **Return up.** The child returns a result to its parent: its height, whether it's balanced, whether it found a target. The parent combines the two answers.

Ask: *does this node need to know something about what's above it, or about what's below it?*`},
    {tpl:`// Pass down: carry state in a parameter.
function hasPathSum(root, target) {
  if (!root) return false;
  if (!root.left && !root.right) return root.val === target;     // only a LEAF ends a path
  const rest = target - root.val;
  return hasPathSum(root.left, rest) || hasPathSum(root.right, rest);
}`,title:"Pass information down"},
    {tpl:`// Return up, and update a best-so-far on the way.
function diameterOfBinaryTree(root) {
  let best = 0;
  const height = (node) => {
    if (!node) return 0;
    const l = height(node.left);
    const r = height(node.right);
    best = Math.max(best, l + r);      // the longest path THROUGH this node bends here
    return 1 + Math.max(l, r);         // but the parent can only extend ONE side
  };
  height(root);
  return best;
}`,title:"Return up, track the best"},
    {md:`The diameter pattern solves a whole family: **the best path may bend at any node, but a path handed upward to the parent must go straight**. Binary Tree Maximum Path Sum is the same idea with values instead of edges, and with \`Math.max(0, child)\` to drop negative branches.

## Lowest common ancestor

In a **BST**, the LCA of two values is the first node on the walk down whose value lies between them (or equals one of them). If both are smaller, go left; both larger, go right; otherwise you've found the split point.

In a **general** binary tree there is no ordering, so recurse: if a subtree contains one target and the other subtree contains the other, the current node is the LCA.`},
    {tpl:`// BST LCA: walk down until p and q are split (or one equals the node).
function lcaBST(root, p, q) {
  let cur = root;
  while (cur) {
    if (p < cur.val && q < cur.val) cur = cur.left;
    else if (p > cur.val && q > cur.val) cur = cur.right;
    else return cur.val;
  }
  return null;
}`,title:"LCA in a BST"},
  ],
  parts:[
    {type:"quiz",id:"q-leaf",q:"hasPathSum asks for a root-to-LEAF path summing to the target. On the tree [1,2] with target 1, what is correct?",
      options:["true: the root alone sums to 1","false: the path must end at a leaf, and 1 → 2 sums to 3","true: 1 → 2 sums to 1","It's undefined"],answer:1,
      why:"The root has a child, so it isn't a leaf. The only root-to-leaf path is 1 → 2 (sum 3). Checking the sum before the leaf test is the classic bug."},
    {type:"quiz",id:"q-down-up",q:"“Count the good nodes: those no smaller than every node on the path from the root to them.” Pass down or return up?",
      options:["Return up: each child returns its count of good nodes","Pass down: each child needs to know the maximum on the path above it","Neither; use BFS","Both are impossible"],answer:1,
      why:"Whether a node is good depends on its ancestors, so the maximum so far travels down as a parameter. (The counts do return up and get added, so it's a mix, but the key piece of state flows downward.)"},
    {type:"quiz",id:"q-diameter",q:"In the diameter solution, why does `height` return `1 + Math.max(l, r)` but the `best` update uses `l + r`?",
      options:["It's an optimization","The longest path through a node can use both sides, but a path extended upward by the parent can only continue down one side","l + r overflows","They are the same value"],answer:1,
      why:"A path is a straight line that may bend once (at its highest node). That bend can use both subtrees, so best considers l + r. The value given to the parent is a straight branch, so it takes the better single side."},
    {type:"code",id:"path-sum",title:"Path sum",fn:"hasPathSum",argTypes:["tree","plain"],
      prompt:"Return `true` if the tree has a **root-to-leaf** path whose values add up to `targetSum`.",
      starter:TREE_NODE_DOC+"function hasPathSum(root, targetSum) {\n  \n}\n",
      solution:"function hasPathSum(root, targetSum) {\n  if (!root) return false;\n  if (!root.left && !root.right) return root.val === targetSum;\n  const rest = targetSum - root.val;\n  return hasPathSum(root.left, rest) || hasPathSum(root.right, rest);\n}\n",
      hint:"Subtract the node's value from the target as you go down. At a leaf, check whether what's left equals the leaf's value.",
      tests:[
        ["example",[[5,4,8,11,null,13,4,7,2,null,null,null,1],22],true],
        ["no such path",[[1,2,3],5],false],
        ["empty",[[],0],false],
        ["must end at a leaf",[[1,2],1],false],
        ["single node",[[1],1],true],
      ]},
    {type:"code",id:"good-nodes",title:"Count good nodes",fn:"goodNodes",argTypes:["tree"],
      prompt:"A node is **good** if no node on the path from the root to it has a larger value. Return the number of good nodes. The root is always good.",
      starter:TREE_NODE_DOC+"function goodNodes(root) {\n  \n}\n",
      solution:"function goodNodes(root) {\n  const go = (node, max) => {\n    if (!node) return 0;\n    const good = node.val >= max ? 1 : 0;\n    const next = Math.max(max, node.val);\n    return good + go(node.left, next) + go(node.right, next);\n  };\n  return go(root, -Infinity);\n}\n",
      hint:"Pass the maximum seen so far down. A node is good when its value is at least that maximum; the new maximum goes to both children.",
      tests:[
        ["example",[[3,1,4,3,null,1,5]],4],
        ["equal values count",[[3,3,null,4,2]],3],
        ["single",[[1]],1],
        ["empty",[[]],0],
      ]},
    {type:"code",id:"diameter",title:"Diameter of a binary tree",fn:"diameterOfBinaryTree",argTypes:["tree"],
      prompt:"Return the **diameter**: the number of **edges** on the longest path between any two nodes. The path may or may not pass through the root.",
      starter:TREE_NODE_DOC+"function diameterOfBinaryTree(root) {\n  \n}\n",
      solution:"function diameterOfBinaryTree(root) {\n  let best = 0;\n  const height = (node) => {\n    if (!node) return 0;\n    const l = height(node.left);\n    const r = height(node.right);\n    best = Math.max(best, l + r);\n    return 1 + Math.max(l, r);\n  };\n  height(root);\n  return best;\n}\n",
      hint:"Compute heights bottom-up. At each node, l + r is the longest path that bends there; keep the maximum in a variable outside the recursion.",
      tests:[
        ["example",[[1,2,3,4,5]],3],
        ["two nodes",[[1,2]],1],
        ["single",[[1]],0],
        ["path avoids the root",[[1,2,3,4,5,null,null,6,null,null,7]],4],
      ]},
    {type:"code",id:"lca-bst",title:"LCA of a BST",fn:"lcaBST",argTypes:["tree","plain","plain"],
      prompt:"Given a BST and two values `p` and `q` that are both in the tree, return the value of their **lowest common ancestor**: the deepest node that has both as descendants (a node counts as a descendant of itself).\n\nUse the BST ordering. You should not need to visit more than one node per level.",
      starter:TREE_NODE_DOC+"function lcaBST(root, p, q) {\n  \n}\n",
      solution:"function lcaBST(root, p, q) {\n  let cur = root;\n  while (cur) {\n    if (p < cur.val && q < cur.val) cur = cur.left;\n    else if (p > cur.val && q > cur.val) cur = cur.right;\n    else return cur.val;\n  }\n  return null;\n}\n",
      hint:"If both values are smaller than the node, the LCA is to the left; if both are larger, to the right. Otherwise the current node splits them.",
      tests:[
        ["split at the root",[[6,2,8,0,4,7,9,null,null,3,5],2,8],6],
        ["ancestor of the other",[[6,2,8,0,4,7,9,null,null,3,5],2,4],2],
        ["deeper",[[6,2,8,0,4,7,9,null,null,3,5],3,5],4],
        ["tiny tree",[[2,1],2,1],2],
      ]},
    {type:"explain",id:"x-diameter",title:"Explain the diameter trick",
      prompt:"Explain, as you would in an interview, how to compute the diameter of a binary tree in O(n). Why is a naive approach slow, and why does the helper return one thing while updating another?",
      rubric:"Naive: compute height at every node separately gives O(n^2) on a skewed tree; better: one post-order pass computing height and updating a global best with left + right at each node; the helper returns 1 + max(l, r) because a path continued upward can only use one side; diameter counted in edges vs nodes; O(n) time, O(height) stack; same pattern solves max path sum (with negative branches clamped to 0)."},
  ],
  leetcode:["lowest-common-ancestor-of-a-binary-search-tree","path-sum","count-good-nodes-in-binary-tree","diameter-of-binary-tree","lowest-common-ancestor-of-a-binary-tree","binary-tree-maximum-path-sum"],
},

// ───────────────────────────────────────────── 7
{
  id:"patterns",
  title:"Patterns and rebuilding trees",
  goal:"Recognize which technique a tree problem wants, and rebuild a tree from its traversals.",
  mins:30,
  blocks:[
    {md:`## Which technique?

| The problem says… | Reach for |
| --- | --- |
| “depth”, “height”, “count nodes”, “is it balanced / symmetric / the same” | Recursive DFS that returns a value up |
| “each level”, “right side”, “zigzag”, “nearest leaf” | BFS with a level loop |
| “BST”, “sorted”, “kth smallest”, “validate” | In-order, or ranges passed down |
| “path”, “sum from root”, “good node” | DFS with state passed down |
| “longest path”, “maximum path sum”, “diameter” | Post-order, return a straight branch, track the best bend |
| “common ancestor” | Recurse and combine; or walk down a BST |
| “serialize”, “copy”, “rebuild” | Pre-order, plus null markers; or pre-order + in-order |

## Balanced tree: return a sentinel

“Is the tree height-balanced?” done naively recomputes heights at every node, O(n²) on a chain. Bottom-up, one pass: each call returns the height, or \`-1\` as soon as it finds an imbalance, and the parent passes the -1 along.

## Rebuilding a tree

Pre-order's **first** value is the root. In the in-order array, everything to the **left** of the root belongs to the left subtree and everything to the right belongs to the right. The number of values on the left tells you how to slice the pre-order too. Recurse on both halves. Keep a map from value to in-order index so finding the root is O(1).`},
    {tpl:`function buildTree(preorder, inorder) {
  const index = new Map(inorder.map((v, i) => [v, i]));
  let pre = 0;                                   // next root, read from preorder
  const build = (lo, hi) => {                    // inorder range [lo, hi]
    if (lo > hi) return null;
    const rootVal = preorder[pre++];
    const node = new TreeNode(rootVal);
    const mid = index.get(rootVal);
    node.left = build(lo, mid - 1);              // left must be built BEFORE right
    node.right = build(mid + 1, hi);
    return node;
  };
  return build(0, inorder.length - 1);
}`,title:"Rebuild from pre-order + in-order"},
    {tip:"Serialize/deserialize (the hard LeetCode problem) is pre-order with an explicit marker for null, e.g. \"1,2,#,#,3,#,#\". The marker makes the traversal alone enough to rebuild the tree, with no second traversal needed."},
  ],
  parts:[
    {type:"quiz",id:"q-pick-1",q:"“Return the values you'd see looking at the tree from the left side.” Best technique?",
      options:["Pre-order DFS only","BFS by levels, keeping the first node of each level","In-order traversal","Post-order with a global"],answer:1,
      why:"One value per level means level-order, taking the first (or, for the right side, last) node of each level. A DFS can do it too by tracking depth, but BFS is the direct fit."},
    {type:"quiz",id:"q-pick-2",q:"“Find the maximum sum of any path in the tree; the path can start and end anywhere.” Which pattern?",
      options:["BFS by levels","Pass the running sum down","Post-order: return the best straight branch up and update a global best at each bend","In-order traversal"],answer:2,
      why:"Same shape as diameter: at each node the best bend is node + left branch + right branch (negative branches clamped to 0), while the value returned upward is node + the better single branch."},
    {type:"quiz",id:"q-two-orders",q:"Can you uniquely rebuild a binary tree from its pre-order and post-order traversals alone (no null markers, values distinct)?",
      options:["Always","Never","Only when every internal node has two children","Only for BSTs"],answer:2,
      why:"A node with a single child is ambiguous: the child could hang on the left or the right and produce the same two sequences. Pre-order + in-order is always unique, and so is a BST from its pre-order alone."},
    {type:"code",id:"is-balanced",title:"Balanced binary tree",fn:"isBalanced",argTypes:["tree"],
      prompt:"Return `true` if the tree is **height-balanced**: at every node, the heights of the left and right subtrees differ by at most 1.\n\nAim for O(n): don't recompute heights at every node.",
      starter:TREE_NODE_DOC+"function isBalanced(root) {\n  \n}\n",
      solution:"function isBalanced(root) {\n  const height = (node) => {\n    if (!node) return 0;\n    const l = height(node.left);\n    if (l === -1) return -1;\n    const r = height(node.right);\n    if (r === -1) return -1;\n    if (Math.abs(l - r) > 1) return -1;\n    return 1 + Math.max(l, r);\n  };\n  return height(root) !== -1;\n}\n",
      hint:"Let the helper return the height, or -1 once it has seen an imbalance. Pass -1 straight up, and compare the two child heights otherwise.",
      tests:[
        ["balanced",[[3,9,20,null,null,15,7]],true],
        ["deep left",[[1,2,2,3,3,null,null,4,4]],false],
        ["empty",[[]],true],
        ["chain of three",[[1,2,null,3]],false],
        ["single",[[1]],true],
      ]},
    {type:"code",id:"build-tree",title:"Build a tree from traversals",fn:"buildTree",argTypes:["plain","plain"],returnType:"tree",
      prompt:"Given the `preorder` and `inorder` traversals of a binary tree with **distinct** values, rebuild the tree and return its root.\n\nDefine `TreeNode` yourself (the definition is in the starter) because you create the nodes.",
      starter:"function TreeNode(val, left, right) {\n  this.val = val === undefined ? 0 : val;\n  this.left = left === undefined ? null : left;\n  this.right = right === undefined ? null : right;\n}\n\nfunction buildTree(preorder, inorder) {\n  \n}\n",
      solution:"function TreeNode(val, left, right) {\n  this.val = val === undefined ? 0 : val;\n  this.left = left === undefined ? null : left;\n  this.right = right === undefined ? null : right;\n}\n\nfunction buildTree(preorder, inorder) {\n  const index = new Map(inorder.map((v, i) => [v, i]));\n  let pre = 0;\n  const build = (lo, hi) => {\n    if (lo > hi) return null;\n    const rootVal = preorder[pre++];\n    const node = new TreeNode(rootVal);\n    const mid = index.get(rootVal);\n    node.left = build(lo, mid - 1);\n    node.right = build(mid + 1, hi);\n    return node;\n  };\n  return build(0, inorder.length - 1);\n}\n",
      hint:"The next unused pre-order value is the root of the current range. Find it in the in-order array (use a Map); it splits the range into the left and right subtrees. Build the left one first.",
      tests:[
        ["example",[[3,9,20,15,7],[9,3,15,20,7]],[3,9,20,null,null,15,7]],
        ["single",[[-1],[-1]],[-1]],
        ["left child only",[[1,2],[2,1]],[1,2]],
        ["right child only",[[1,2],[1,2]],[1,null,2]],
        ["full three",[[1,2,3],[2,1,3]],[1,2,3]],
      ]},
    {type:"explain",id:"x-serialize",title:"Design: serialize a tree",
      prompt:"You need to store a binary tree as a string and read it back (LeetCode's “Serialize and Deserialize Binary Tree”). Describe your format and the algorithm for each direction, and say why plain pre-order values aren't enough.",
      rubric:"Pre-order (or level-order) traversal with an explicit null marker so structure is recoverable; deserialize consumes tokens in the same order recursively (or with a queue for BFS); why values alone are ambiguous (same preorder for different shapes, a missing child); delimiter handling for multi-digit and negative numbers; O(n) time and space; mention that a BST can be rebuilt from pre-order alone using bounds."},
  ],
  leetcode:["balanced-binary-tree","construct-binary-tree-from-preorder-and-inorder-traversal","serialize-and-deserialize-binary-tree","binary-tree-maximum-path-sum"],
},

  ],
});
