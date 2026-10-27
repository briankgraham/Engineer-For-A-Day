// Learning tab: the Dynamic programming track. Same schema as learn_data.js (see the header there). Loaded after learn_data.js, before learn.js.
//   viz blocks over DP tables: {viz: "dp", dp: "stairs" | "rob" | "coins" | "grid" | "lcs" | "edit" | "knap", title, ...inputs}
//                              The table is filled one cell per step by running the real recurrence. Inputs by kind:
//                              stairs {n}, rob {nums}, coins {coins, amount}, grid {costs}, lcs and edit {a, b}, knap {weights, values, cap}.
//   starter and solution strings are template literals here (no backticks, backslashes or dollar-brace inside them).
LEARN_TRACKS.push({
  id:"dp",
  title:"Dynamic programming",
  icon:"🧮",
  tagline:"Turn a slow recursion into a table: define the state, write the transition, fill from the base case. Stairs to knapsack to edit distance.",
  outcomes:[
    "Spot the two signs of a DP problem: overlapping subproblems and an optimal choice built from smaller ones",
    "Write state, transition and base case before any code, then go from recursion to memo to table",
    "Solve 1D, grid, knapsack and two-string problems from a template",
    "Squash a table to one row when the recurrence only looks one step back",
    "Explain why greedy fails on coin change, and why loop order decides combinations vs permutations",
  ],
  ready:[
    ["climbing-stairs","think"],["min-cost-climbing-stairs","think"],["house-robber","oned"],["maximum-subarray","oned"],["coin-change","oned"],
    ["longest-increasing-subsequence","oned"],["word-break","oned"],["decode-ways","oned"],["unique-paths","grid"],["unique-paths-ii","grid"],
    ["minimum-path-sum","grid"],["triangle","grid"],["maximal-square","grid"],["partition-equal-subset-sum","knapsack"],["target-sum","knapsack"],
    ["coin-change-ii","knapsack"],["ones-and-zeroes","knapsack"],["longest-common-subsequence","strings"],["edit-distance","strings"],
    ["longest-palindromic-subsequence","strings"],["distinct-subsequences","strings"],["house-robber-ii","choose"],
    ["best-time-to-buy-and-sell-stock-with-cooldown","choose"],["regular-expression-matching","choose"],
  ],
  lessons:[

// ───────────────────────────────────────────── 1
{
  id:"think",
  title:"Thinking in states",
  goal:"Take a recursion that repeats itself, cache it, then turn the cache into a table. Learn the three things to write down first.",
  mins:25,
  blocks:[
    {md:`**Dynamic programming** (DP) sounds like a technique. It is really one idea: *if a problem is made of smaller copies of itself, and the same small copies come up again and again, solve each copy once and remember the answer.*

Start with a question: how many ways can you climb \`n\` stairs, taking 1 or 2 steps at a time? Think about the **last move**. You arrived at step \`n\` from step \`n-1\` (a 1-step) or from step \`n-2\` (a 2-step). So:

\`ways(n) = ways(n-1) + ways(n-2)\`

That is a recursion. Written directly it works, and it is terrible:`},
    {tpl:`function ways(n) {
  if (n <= 1) return 1;
  return ways(n - 1) + ways(n - 2);
}
// ways(5) calls ways(4) and ways(3). ways(4) calls ways(3) again, and so on.
// The number of calls roughly doubles with every extra step: O(2^n).`,title:"Plain recursion: correct but exponential"},
    {md:`\`ways(3)\` is computed twice, \`ways(2)\` three times, and it only gets worse. These repeats are called **overlapping subproblems**, and they are the reason DP exists. Cache each answer the first time and the cost collapses to one computation per distinct input.

## Three things to write before any code

1. **State**: what do the arguments of the function mean? Here, \`ways(i)\` = the number of ways to reach step \`i\`. If you cannot say it in one plain sentence, the rest will not work.
2. **Transition**: how does one state follow from smaller ones? Here, \`ways(i) = ways(i-1) + ways(i-2)\`.
3. **Base case**: the states you can answer without the transition. Here, \`ways(0) = 1\` and \`ways(1) = 1\`.

Fill it in left to right and watch each cell depend on the two before it:`},
    {viz:"dp",dp:"stairs",n:7,title:"Climbing stairs: ways(i) = ways(i-1) + ways(i-2)"},
    {md:`## Three ways to write the same thing

The same state, transition and base case can be coded three ways. Know all three, and which to pick.`},
    {tpl:`// 1. Top-down: the recursion plus a cache ("memoization").
function waysMemo(n, memo = new Map()) {
  if (n <= 1) return 1;
  if (memo.has(n)) return memo.get(n);
  const r = waysMemo(n - 1, memo) + waysMemo(n - 2, memo);
  memo.set(n, r);
  return r;
}

// 2. Bottom-up: fill a table from the base cases up. No recursion.
function waysTable(n) {
  const dp = [1, 1];
  for (let i = 2; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];
  return dp[n];
}

// 3. Bottom-up, keeping only what the next step needs: O(1) memory.
function waysConstant(n) {
  let prev = 1, cur = 1;
  for (let i = 2; i <= n; i++) [prev, cur] = [cur, prev + cur];
  return cur;
}`,title:"Memo, table, and constant space"},
    {md:`| | Top-down (memo) | Bottom-up (table) |
| --- | --- | --- |
| Easiest to write | Yes: copy the recurrence, add a cache | You must pick the fill order |
| Computes only what is needed | Yes | No, the whole table |
| Stack depth | As deep as the recursion (can overflow at ~10,000) | None |
| Can drop old rows to save memory | Hard | Easy |

A good interview path: write the recursion, add the memo to show it is fast, and mention that you could convert it to a table if the depth worries you.

## Cost of a DP

Count the **states**, then multiply by the work done per state. Stairs has \`n\` states and O(1) work each, so O(n). Edit distance (later) has \`m × n\` states and O(1) work each. If each state tries every coin, it is states × coins.`},
    {warn:"A memo only helps when states repeat. Memoizing a recursion where every call has different arguments (like generating all permutations) just burns memory. Ask: \"can two different paths reach the same state?\""},
  ],
  parts:[
    {type:"quiz",id:"q-overlap",q:"Why is the plain recursive ways(n) so slow?",
      options:["Recursion is always slower than loops","It recomputes the same subproblems, such as ways(3), many times, so the call count grows exponentially","It uses too much memory per call","JavaScript has no tail-call optimization"],answer:1,
      why:"The speed-up from DP is not about recursion vs loops. It is about computing each distinct state once. The plain version recomputes states over and over; the memo version does not."},
    {type:"quiz",id:"q-three-things",q:"Which list is what you should write down before coding a DP?",
      options:["The input size, the output size, and the time limit","The state, the transition and the base case","The loop order, the array name and the return type","The brute-force answer, a hash map and a stack"],answer:1,
      why:"State (what the arguments mean), transition (how a state is built from smaller states) and base case (where the recursion stops). Most wrong DP answers come from a vague state."},
    {type:"quiz",id:"q-states",q:"A DP has states (i, j) with 0 <= i < 500 and 0 <= j < 500, and each state does O(1) work. How long does it take?",
      options:["O(500)","O(500 + 500)","About 250,000 steps: states times work per state","Exponential"],answer:2,
      why:"Number of states times work per state: 500 × 500 × O(1). That is also the size of the table and the reason a 2D DP needs to be checked against memory limits."},
    {type:"code",id:"climb",title:"Climbing stairs",fn:"climbStairs",
      prompt:"You can climb 1 or 2 steps at a time. Return the number of distinct ways to climb to the top of a staircase with `n` steps (`1 <= n <= 45`).\n\nWrite the state, transition and base case first. Then code it bottom-up using only two variables.",
      starter:`function climbStairs(n) {

}
`,
      solution:`function climbStairs(n) {
  let prev = 1, cur = 1;
  for (let i = 2; i <= n; i++) {
    const next = prev + cur;
    prev = cur;
    cur = next;
  }
  return cur;
}
`,
      hint:"ways(i) = ways(i-1) + ways(i-2) with ways(0) = ways(1) = 1. Each step only needs the previous two values, so two variables are enough.",
      tests:[
        ["one step",[1],1],
        ["two steps",[2],2],
        ["three steps",[3],3],
        ["five steps",[5],8],
        ["ten steps",[10],89],
        ["big n needs a loop or memo",[45],1836311903],
      ]},
    {type:"code",id:"min-cost-stairs",title:"Min cost climbing stairs",fn:"minCostClimbingStairs",
      prompt:"`cost[i]` is the price of stepping **off** stair `i`. After paying you may climb 1 or 2 stairs. You may start on stair 0 or stair 1, and you need to get past the last stair (to index `cost.length`). Return the minimum total cost.\n\nHint on the state: `best[i]` = the cheapest way to *stand on* index `i`. The top is `best[n]`.",
      starter:`function minCostClimbingStairs(cost) {

}
`,
      solution:`function minCostClimbingStairs(cost) {
  const n = cost.length;
  let a = 0, b = 0; // best[i-2], best[i-1]; starting on stair 0 or 1 is free
  for (let i = 2; i <= n; i++) {
    const c = Math.min(b + cost[i - 1], a + cost[i - 2]);
    a = b;
    b = c;
  }
  return b;
}
`,
      hint:"best[i] = min(best[i-1] + cost[i-1], best[i-2] + cost[i-2]), with best[0] = best[1] = 0 because you may start on either. The answer is best[n].",
      tests:[
        ["example",[[10,15,20]],15],
        ["example 2",[[1,100,1,1,1,100,1,1,100,1]],6],
        ["two stairs",[[5,10]],5],
        ["all zero",[[0,0]],0],
        ["four stairs",[[10,15,20,25]],30],
        ["start on the second",[[100,1,100,1]],2],
      ]},
  ],
  leetcode:["climbing-stairs","min-cost-climbing-stairs"],
},

// ───────────────────────────────────────────── 2
{
  id:"oned",
  title:"One-dimensional DP",
  goal:"Solve problems where the state is a single index or amount: house robber, coin change, increasing subsequences and word break.",
  mins:35,
  blocks:[
    {md:`In 1D DP the state is one number: a position \`i\` in the array, or an amount. The table is a single row, and the whole skill is choosing **what \`dp[i]\` means** and **which earlier cells it looks at**.

## House Robber: "take it or leave it"

Rob a row of houses for the most money, but never two neighbors. Define \`best[i]\` = the most you can get from houses \`0..i\`. For house \`i\` you have two choices:

- **Skip it**: you keep \`best[i-1]\`
- **Rob it**: you cannot have robbed \`i-1\`, so you get \`best[i-2] + nums[i]\`

\`best[i] = max(best[i-1], best[i-2] + nums[i])\``},
    {viz:"dp",dp:"rob",nums:[2,7,9,3,1],title:"House Robber: skip it, or rob it and jump back two"},
    {md:`This "take it or leave it" shape is everywhere. A close cousin is **Maximum Subarray (Kadane)**: let \`best[i]\` be the best sum of a subarray *ending exactly at* \`i\`. Either extend the previous one or start fresh: \`best[i] = max(nums[i], best[i-1] + nums[i])\`, and the answer is the max over all \`i\`. Note that the answer is not always the last cell: the state ("ends at i") differs from the question ("ends anywhere").

## Coin Change: "try every last move"

Fewest coins to make an amount. Let \`fewest[a]\` = the minimum number of coins that sum to \`a\`. The last coin could be any \`c\` in \`coins\`, leaving \`a - c\` to make:

\`fewest[a] = 1 + min(fewest[a - c])\` over the coins with \`c <= a\`, and \`fewest[0] = 0\`.

Unreachable amounts stay at \`Infinity\`.`},
    {viz:"dp",dp:"coins",coins:[1,3,4],amount:6,title:"Coin change with [1, 3, 4] for 6: greedy would pick 4+1+1, DP finds 3+3"},
    {tpl:`function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}   // O(amount * coins) time, O(amount) memory`,title:"Coin change, fewest coins"},
    {md:`## Longest Increasing Subsequence: "ending at i"

Let \`len[i]\` = the length of the longest increasing subsequence that **ends at index \`i\`**. It extends any earlier, smaller value:

\`len[i] = 1 + max(len[j])\` over \`j < i\` with \`nums[j] < nums[i]\` (or just \`1\` if none).

The answer is the max of the whole array. That is O(n²). (A cleverer O(n log n) version uses binary search; know it exists.)

## Word Break: "can the prefix be built?"

\`ok[i]\` = can the first \`i\` letters of \`s\` be split into dictionary words? True if some \`j < i\` has \`ok[j]\` true **and** \`s.slice(j, i)\` is a word. \`ok[0] = true\` (the empty prefix).`},
    {tip:"Pick the state by asking what you need to know to decide the next step. \"Best up to i\" (house robber), \"best ending exactly at i\" (LIS, Kadane), \"is prefix i possible\" (word break) and \"best for amount a\" (coins) are the four 1D shapes. When a recurrence feels impossible, try the other shape."},
  ],
  parts:[
    {type:"quiz",id:"q-rob-state",q:"In House Robber, why is the transition best[i] = max(best[i-1], best[i-2] + nums[i]) and not best[i-1] + nums[i]?",
      options:["Because nums[i] could be negative","Robbing house i means house i-1 was not robbed, so you can only build on the best up to i-2","Because best[i-1] is not computed yet","It is the same thing"],answer:1,
      why:"best[i-1] may include house i-1. Adding house i on top would rob two neighbors. Robbing i is only legal on top of a solution that ends at i-2 or earlier."},
    {type:"quiz",id:"q-greedy-coins",q:"Coins [1, 3, 4], amount 6. Taking the largest coin first gives 4+1+1 (3 coins). What does DP return, and why?",
      options:["3, because greedy is optimal for any coins","2 (3+3), because DP checks every possible last coin instead of committing to the biggest","6, because only 1s are safe","-1"],answer:1,
      why:"Greedy commits to the 4 and cannot go back. DP evaluates every coin as the last move for every amount, so it finds 3+3."},
    {type:"quiz",id:"q-lis-answer",q:"For LIS with len[i] = longest increasing subsequence ending at i, what do you return?",
      options:["len[n-1]","The max over all len[i]","The sum of len","len[0]"],answer:1,
      why:"The best subsequence can end at any index. The state fixes where it ends, so the answer is the best over all possible end points."},
    {type:"code",id:"rob",title:"House Robber",fn:"rob",
      prompt:"`nums[i]` is the money in house `i`. You cannot rob two adjacent houses. Return the most you can rob.",
      starter:`function rob(nums) {

}
`,
      solution:`function rob(nums) {
  let skip = 0, take = 0; // best up to i-2, best up to i-1
  for (const x of nums) {
    const next = Math.max(take, skip + x);
    skip = take;
    take = next;
  }
  return take;
}
`,
      hint:"Keep two numbers: the best up to the house before last and the best up to the last house. For each house, the new best is max(last best, before-last best + this house).",
      tests:[
        ["example",[[1,2,3,1]],4],
        ["example 2",[[2,7,9,3,1]],12],
        ["one house",[[5]],5],
        ["two houses",[[2,1]],2],
        ["zero",[[0]],0],
        ["big prize at the end",[[1,3,1,3,100]],103],
        ["alternating",[[10,1,10,1,10]],30],
      ]},
    {type:"code",id:"coin-change",title:"Coin change",fn:"coinChange",
      prompt:"Given `coins` (positive integers, unlimited supply of each) and an `amount`, return the **fewest coins** that sum to `amount`, or `-1` if it is impossible. `amount` may be 0.",
      starter:`function coinChange(coins, amount) {

}
`,
      solution:`function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}
`,
      hint:"dp[a] = 1 + min(dp[a - c]) over the coins c that fit. Start every cell at Infinity except dp[0] = 0, and convert Infinity to -1 at the end.",
      tests:[
        ["example",[[1,2,5],11],3],
        ["impossible",[[2],3],-1],
        ["amount zero",[[1],0],0],
        ["greedy fails",[[1,3,4],6],2],
        ["one coin exact",[[7],7],1],
        ["no coin small enough",[[5,10],3],-1],
        ["big amount (a recursion without memo times out)",[[186,419,83,408],6249],20],
      ]},
    {type:"code",id:"lis",title:"Longest increasing subsequence",fn:"lengthOfLIS",
      prompt:"Return the length of the longest **strictly increasing subsequence** of `nums`. A subsequence keeps the order but may skip elements.\n\nUse `len[i]` = the length of the best subsequence **ending at index `i`**. An O(n²) solution is fine.",
      starter:`function lengthOfLIS(nums) {

}
`,
      solution:`function lengthOfLIS(nums) {
  const len = nums.map(() => 1);
  let best = 0;
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i] && len[j] + 1 > len[i]) len[i] = len[j] + 1;
    }
    best = Math.max(best, len[i]);
  }
  return best;
}
`,
      hint:"Start every len[i] at 1. For each i, look at every earlier j with nums[j] < nums[i] and take len[j] + 1 if it is bigger. Return the largest len[i].",
      tests:[
        ["example",[[10,9,2,5,3,7,101,18]],4],
        ["example 2",[[0,1,0,3,2,3]],4],
        ["all equal is not increasing",[[7,7,7,7]],1],
        ["one element",[[5]],1],
        ["already sorted",[[1,2,3,4,5]],5],
        ["descending",[[5,4,3,2,1]],1],
        ["not the last one",[[1,2,3,0,-1]],3],
      ]},
    {type:"code",id:"word-break",title:"Word break",fn:"wordBreak",
      prompt:"Given a string `s` and a list `wordDict`, return `true` if `s` can be split into a sequence of dictionary words (words may be reused).\n\nState: `ok[i]` = can the first `i` letters be split?",
      starter:`function wordBreak(s, wordDict) {

}
`,
      solution:`function wordBreak(s, wordDict) {
  const words = new Set(wordDict);
  const ok = new Array(s.length + 1).fill(false);
  ok[0] = true;
  for (let i = 1; i <= s.length; i++) {
    for (let j = 0; j < i; j++) {
      if (ok[j] && words.has(s.slice(j, i))) {
        ok[i] = true;
        break;
      }
    }
  }
  return ok[s.length];
}
`,
      hint:"ok[0] = true. ok[i] is true if some j < i has ok[j] true and s.slice(j, i) is in the dictionary. Put the words in a Set for fast lookups.",
      tests:[
        ["example",["leetcode",["leet","code"]],true],
        ["word reuse",["applepenapple",["apple","pen"]],true],
        ["not possible",["catsandog",["cats","dog","sand","and","cat"]],false],
        ["no matching word",["a",["b"]],false],
        ["must backtrack from 4 to 3",["aaaaaaa",["aaaa","aaa"]],true],
        ["a tempting wrong first word",["cars",["car","ca","rs"]],true],
      ]},
  ],
  leetcode:["house-robber","maximum-subarray","coin-change","longest-increasing-subsequence","word-break","decode-ways"],
},

// ───────────────────────────────────────────── 3
{
  id:"grid",
  title:"Grid DP",
  goal:"Fill a 2D table where each cell depends on the cell above and the cell to the left: counting paths, cheapest paths and the biggest square.",
  mins:30,
  blocks:[
    {md:`When the input is a grid, the state is usually **the cell itself**: \`dp[r][c]\` answers the question *for the sub-grid ending at (r, c)*. If you can only move right and down, a cell is reached from exactly two neighbors, **above** and **left**, and the table fills row by row.

## Minimum path sum

\`cost[r][c]\` = the cheapest path from the top-left to \`(r, c)\`. Arrive from above or from the left, take the cheaper, then pay for this cell:

\`cost[r][c] = grid[r][c] + min(cost[r-1][c], cost[r][c-1])\`

The first row and first column have only one way in, so they are the base cases. Step through it:`},
    {viz:"dp",dp:"grid",costs:[[1,3,1],[1,5,1],[4,2,1]],title:"Cheapest path from the top-left, moving right or down"},
    {md:`## Counting paths, and walls

Replace \`min\` with \`+\` and you are **counting** paths instead: \`paths[r][c] = paths[r-1][c] + paths[r][c-1]\`, with \`paths[0][0] = 1\`. Add obstacles by setting \`paths[r][c] = 0\` on a wall: nothing flows through it. Counting is the same shape as optimizing; only the combine step changes (\`+\` vs \`min\` vs \`max\`).`},
    {tpl:`function minPathSum(grid) {
  const R = grid.length, C = grid[0].length;
  const dp = grid.map(row => row.slice());           // copy, so we don't wreck the input
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (r === 0 && c === 0) continue;
      const up = r > 0 ? dp[r - 1][c] : Infinity;
      const left = c > 0 ? dp[r][c - 1] : Infinity;
      dp[r][c] += Math.min(up, left);
    }
  }
  return dp[R - 1][C - 1];
}`,title:"Grid DP: out-of-range neighbors count as Infinity"},
    {md:`## Space: keep one row

Cell \`(r, c)\` only reads row \`r-1\` and its own row to the left. So one array of length \`C\` is enough: when you update \`dp[c]\`, it still holds the value from the row above (the "up"), and \`dp[c-1]\` is already the new value (the "left"). O(R·C) memory becomes O(C).

## Maximal Square: a less obvious state

Find the largest square of 1s. Let \`side[r][c]\` = the side of the biggest all-1 square whose **bottom-right corner** is \`(r, c)\`. If the cell is 1:

\`side[r][c] = 1 + min(side[r-1][c], side[r][c-1], side[r-1][c-1])\`

Why min of three? A square of side \`k\` at the corner needs squares of side \`k-1\` ending above, to the left and diagonally. The smallest of those limits how far you can grow. If the cell is 0, \`side = 0\`. The answer is the largest side seen, squared.`},
    {warn:"Out-of-range neighbors need care. For min problems they should act as Infinity (never chosen); for counting they should act as 0. Mixing these up is the most common grid DP bug. Handle the first row and column explicitly, or pad the table with an extra row and column."},
  ],
  parts:[
    {type:"quiz",id:"q-grid-order",q:"For cost[r][c] = grid[r][c] + min(cost[r-1][c], cost[r][c-1]), which fill order is valid?",
      options:["Any order","Row by row, left to right: above and left are always ready","Right to left, bottom to top","Random"],answer:1,
      why:"A cell needs its upper and left neighbors first. Row-major order guarantees both are filled. Always check the dependencies before choosing loops."},
    {type:"quiz",id:"q-count-vs-min",q:"You change 'cheapest path' to 'number of paths' in a grid with no obstacles. What changes in the recurrence?",
      options:["Nothing","min becomes +, and the start is 1 rather than grid[0][0]","The table becomes 3D","You must use recursion"],answer:1,
      why:"The state and the dependencies (above, left) stay the same. Only the combine step changes: add the two counts instead of choosing the smaller cost, and the single path to the start counts as 1."},
    {type:"quiz",id:"q-square-min",q:"In Maximal Square, why is it min of the three neighbors plus 1, rather than the max?",
      options:["Min is faster to compute","A square of side k needs squares of side k-1 above, left and diagonal, so the smallest neighbor limits the growth","Max would overflow","It is just a convention"],answer:1,
      why:"If any one of the three smaller squares is missing, there is a 0 hole or an edge inside the larger square. The weakest neighbor decides how big the square at this corner can be."},
    {type:"code",id:"unique-paths-2",title:"Unique paths with obstacles",fn:"uniquePathsWithObstacles",
      prompt:"A robot starts at the top-left of a grid and wants to reach the bottom-right, moving only **right** or **down**. A cell of `1` is an obstacle and cannot be entered; `0` is free. Return the number of distinct paths (0 if the start or the end is blocked).",
      starter:`function uniquePathsWithObstacles(grid) {

}
`,
      solution:`function uniquePathsWithObstacles(grid) {
  const R = grid.length, C = grid[0].length;
  const dp = Array.from({ length: R }, () => new Array(C).fill(0));
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (grid[r][c] === 1) continue;
      if (r === 0 && c === 0) { dp[r][c] = 1; continue; }
      dp[r][c] = (r > 0 ? dp[r - 1][c] : 0) + (c > 0 ? dp[r][c - 1] : 0);
    }
  }
  return dp[R - 1][C - 1];
}
`,
      hint:"paths[r][c] = paths[r-1][c] + paths[r][c-1], with paths[0][0] = 1. A wall cell stays at 0. Out-of-range neighbors count as 0.",
      tests:[
        ["example",[[[0,0,0],[0,1,0],[0,0,0]]],2],
        ["tiny",[[[0,1],[0,0]]],1],
        ["blocked end",[[[0,0],[0,1]]],0],
        ["single free cell",[[[0]]],1],
        ["single wall",[[[1]]],0],
        ["blocked start",[[[1,0]]],0],
        ["a wall row closes the grid",[[[0,0],[1,1]]],0],
        ["open 3 by 3",[[[0,0,0],[0,0,0],[0,0,0]]],6],
      ]},
    {type:"code",id:"min-path-sum",title:"Minimum path sum",fn:"minPathSum",
      prompt:"Given a grid of non-negative numbers, find a path from the top-left to the bottom-right, moving only right or down, that has the **smallest sum** of the numbers on it. Return that sum.",
      starter:`function minPathSum(grid) {

}
`,
      solution:`function minPathSum(grid) {
  const R = grid.length, C = grid[0].length;
  const dp = grid.map(row => row.slice());
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (r === 0 && c === 0) continue;
      const up = r > 0 ? dp[r - 1][c] : Infinity;
      const left = c > 0 ? dp[r][c - 1] : Infinity;
      dp[r][c] += Math.min(up, left);
    }
  }
  return dp[R - 1][C - 1];
}
`,
      hint:"cost[r][c] = grid[r][c] + min(cost above, cost to the left). The first row and column only have one neighbor, so treat the missing one as Infinity.",
      tests:[
        ["example",[[[1,3,1],[1,5,1],[4,2,1]]],7],
        ["two rows",[[[1,2,3],[4,5,6]]],12],
        ["one cell",[[[5]]],5],
        ["a detour is cheaper",[[[1,2],[1,1]]],3],
        ["single row",[[[1,2,3]]],6],
        ["single column",[[[4],[1],[2]]],7],
      ]},
    {type:"code",id:"maximal-square",title:"Maximal square",fn:"maximalSquare",
      prompt:"`matrix` is a grid of the **strings** `\"0\"` and `\"1\"`. Return the **area** of the largest square made only of `\"1\"`s.\n\nState: `side[r][c]` = the side of the largest square whose bottom-right corner is `(r, c)`.",
      starter:`function maximalSquare(matrix) {

}
`,
      solution:`function maximalSquare(matrix) {
  const R = matrix.length, C = matrix[0].length;
  const side = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(0)); // padded
  let best = 0;
  for (let r = 1; r <= R; r++) {
    for (let c = 1; c <= C; c++) {
      if (matrix[r - 1][c - 1] === "1") {
        side[r][c] = 1 + Math.min(side[r - 1][c], side[r][c - 1], side[r - 1][c - 1]);
        best = Math.max(best, side[r][c]);
      }
    }
  }
  return best * best;
}
`,
      hint:"If the cell is '1', side = 1 + min(above, left, diagonal); if it is '0', side = 0. Track the biggest side and return its square. A padding row and column of zeros avoids bounds checks.",
      tests:[
        ["example",[[["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]],4],
        ["diagonal zeros",[[["0","1"],["1","0"]]],1],
        ["single zero",[[["0"]]],0],
        ["single one",[[["1"]]],1],
        ["a 2 by 2 of ones",[[["1","1"],["1","1"]]],4],
        ["3 by 3 of ones",[[["1","1","1"],["1","1","1"],["1","1","1"]]],9],
        ["a rectangle is not a square",[[["1","1","1","1"],["1","1","1","1"]]],4],
      ]},
  ],
  leetcode:["unique-paths","unique-paths-ii","minimum-path-sum","triangle","maximal-square"],
},

// ───────────────────────────────────────────── 4
{
  id:"knapsack",
  title:"Knapsack and subset sum",
  goal:"Decide, item by item, whether to take or skip it. Squash the table to one row, and know when the loop order changes the answer.",
  mins:35,
  blocks:[
    {md:`The **0/1 knapsack** is the model for any "pick a subset under a budget" problem. You have items with a weight and a value, and a bag with a capacity. Each item can be used **once**. Maximize the value.

State: \`best[i][w]\` = the most value using only the **first \`i\` items** with capacity \`w\`. For item \`i\` there are exactly two choices:

- **skip it**: \`best[i-1][w]\`
- **take it** (if it fits): \`best[i-1][w - weight] + value\`

\`best[i][w] = max(skip, take)\`. Watch the highlighted cells: the cell above, and the cell *weight* columns to the left in the row above.`},
    {viz:"dp",dp:"knap",weights:[1,3,4],values:[15,20,30],cap:4,title:"0/1 knapsack, capacity 4: each cell looks at the row above"},
    {tpl:`function knapsack(weights, values, cap) {
  const dp = new Array(cap + 1).fill(0);        // dp[w] = best value with capacity w
  for (let i = 0; i < weights.length; i++) {
    for (let w = cap; w >= weights[i]; w--) {   // BACKWARD, so item i is used at most once
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }
  return dp[cap];
}`,title:"0/1 knapsack in one row"},
    {md:`## Why the loop goes backward

Squashing the 2D table to one row works because row \`i\` only reads row \`i-1\`. But you overwrite \`dp[w]\` in place. If you loop \`w\` **upward**, then \`dp[w - weight]\` has *already* been updated for item \`i\`, so item \`i\` can be counted again. Going **downward** guarantees \`dp[w - weight]\` is still the old row.

| Loop over capacity | Meaning | Problem type |
| --- | --- | --- |
| Downward (\`cap\` to \`weight\`) | each item at most once | 0/1 knapsack, partition, target sum |
| Upward (\`weight\` to \`cap\`) | an item can be reused | unbounded knapsack, coin change |

## Subset sum is a knapsack with booleans

*Can some subset of \`nums\` sum to exactly \`T\`?* Let \`can[s]\` = is sum \`s\` reachable. Start with \`can[0] = true\`. For each number \`x\` (looping \`s\` from \`T\` down to \`x\`): \`can[s] ||= can[s - x]\`.

**Partition Equal Subset Sum** is that with \`T = total / 2\`: if the total is odd, return false at once.

## Counting instead of maximizing

Swap \`max\` for \`+\` and you count subsets or combinations. **Coin Change II** asks for the number of *combinations* that make an amount. Here the order of the two loops matters:`},
    {tpl:`function change(amount, coins) {
  const ways = new Array(amount + 1).fill(0);
  ways[0] = 1;                                   // one way to make 0: take nothing
  for (const c of coins) {                       // coins OUTSIDE ...
    for (let a = c; a <= amount; a++) {          // ... amounts inside, upward: reuse allowed
      ways[a] += ways[a - c];
    }
  }
  return ways[amount];
}
// Swap the loops (amounts outside, coins inside) and 1+2 and 2+1 both get counted:
// that counts ordered sequences ("permutations"), which is Combination Sum IV.`,title:"Coin change II: combinations"},
    {tip:"Rule of thumb for the order: to count combinations (order does not matter), loop over the items on the outside, so each item is considered once, in a fixed order. To count sequences, loop over the target on the outside, so every item can come next at every amount."},
    {warn:"A very large capacity (like 10^9) makes the table impossible. Knapsack DP is O(items × capacity), which is only fast when the capacity is small. If a problem gives huge weights but few items, think meet-in-the-middle or a different approach."},
  ],
  parts:[
    {type:"quiz",id:"q-backward",q:"In the one-row 0/1 knapsack, what goes wrong if the capacity loop runs upward?",
      options:["Nothing, it is faster","An item can be taken more than once, because dp[w - weight] has already been updated for the same item","The answer is always 0","It returns the min instead of the max"],answer:1,
      why:"Going upward makes the cell you read (smaller capacity) a value that already includes the current item. That is exactly the unbounded knapsack. Going downward keeps it the old row."},
    {type:"quiz",id:"q-orders",q:"For coins [1, 2] and amount 3, change() returns 2 (1+1+1 and 1+2). If you swap the loops (amount outside, coins inside), what does it count?",
      options:["Still 2","3: it counts 1+1+1, 1+2 and 2+1 as different","1","It throws"],answer:1,
      why:"With the amount outside, every coin can be the next one at each step, so 1+2 and 2+1 are separate sequences. That is Combination Sum IV, which counts permutations."},
    {type:"quiz",id:"q-partition",q:"For Partition Equal Subset Sum, why can you return false immediately when the total is odd?",
      options:["Odd totals take too long","Two equal halves would each be total/2, which is not an integer","The array must be sorted first","Negative numbers"],answer:1,
      why:"If the two parts have the same sum, the total is twice that sum, so it must be even. Otherwise there is nothing to search."},
    {type:"code",id:"knapsack-01",title:"0/1 knapsack",fn:"knapsack",
      prompt:"`weights[i]` and `values[i]` describe item `i`. Each item can be used **at most once**. Return the maximum total value that fits in a bag of capacity `cap` (total weight `<= cap`).",
      starter:`function knapsack(weights, values, cap) {

}
`,
      solution:`function knapsack(weights, values, cap) {
  const dp = new Array(cap + 1).fill(0);
  for (let i = 0; i < weights.length; i++) {
    for (let w = cap; w >= weights[i]; w--) {
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }
  return dp[cap];
}
`,
      hint:"One array dp[w] = best value with capacity w. For each item, loop w from cap DOWN to the item's weight: dp[w] = max(dp[w], dp[w - weight] + value).",
      tests:[
        ["classic",[[1,3,4,5],[1,4,5,7],7],9],
        ["small",[[2,3,4],[3,4,5],5],7],
        ["nothing fits",[[5],[10],4],0],
        ["exact fit",[[2,2],[3,4],4],7],
        ["a single item cannot be repeated",[[1],[10],5],10],
        ["the best two beat the heaviest one",[[1,1,1],[1,2,3],2],5],
        ["no items",[[],[],10],0],
      ]},
    {type:"code",id:"partition",title:"Partition equal subset sum",fn:"canPartition",
      prompt:"Given an array of positive integers `nums`, return `true` if it can be split into **two subsets with the same sum**.\n\nThis is subset sum: is there a subset adding up to `total / 2`? Use a boolean array `can[s]`.",
      starter:`function canPartition(nums) {

}
`,
      solution:`function canPartition(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2) return false;
  const target = total / 2;
  const can = new Array(target + 1).fill(false);
  can[0] = true;
  for (const x of nums) {
    for (let s = target; s >= x; s--) {
      if (can[s - x]) can[s] = true;
    }
  }
  return can[target];
}
`,
      hint:"Return false for an odd total. Otherwise can[0] = true, and for each number x loop s from target DOWN to x: if can[s - x] is true then can[s] becomes true.",
      tests:[
        ["example",[[1,5,11,5]],true],
        ["no split",[[1,2,3,5]],false],
        ["two equal",[[2,2]],true],
        ["single number",[[1]],false],
        ["odd total",[[1,2,5]],false],
        ["needs the right pair",[[3,3,3,4,5]],true],
        ["one big number",[[1,1,1,1,8]],false],
      ]},
    {type:"code",id:"coin-change-ii",title:"Coin change II",fn:"change",
      prompt:"Given an `amount` and a list of distinct `coins` (unlimited supply), return the number of **combinations** that make up the amount. Order does not matter: 1+2 and 2+1 are the same combination. Return 0 if it is impossible, and 1 for amount 0.\n\nNote the parameter order: `change(amount, coins)`.",
      starter:`function change(amount, coins) {

}
`,
      solution:`function change(amount, coins) {
  const ways = new Array(amount + 1).fill(0);
  ways[0] = 1;
  for (const c of coins) {
    for (let a = c; a <= amount; a++) {
      ways[a] += ways[a - c];
    }
  }
  return ways[amount];
}
`,
      hint:"ways[0] = 1. Put the loop over coins on the outside and the loop over amounts (upward, from the coin value) on the inside: ways[a] += ways[a - coin].",
      tests:[
        ["example",[5,[1,2,5]],4],
        ["impossible",[3,[2]],0],
        ["a single coin",[10,[10]],1],
        ["amount zero",[0,[7]],1],
        ["order must not matter",[4,[1,2,3]],4],
        ["more coins",[10,[2,5,3,6]],5],
      ]},
  ],
  leetcode:["partition-equal-subset-sum","target-sum","coin-change-ii","ones-and-zeroes","last-stone-weight-ii","combination-sum-iv"],
},

// ───────────────────────────────────────────── 5
{
  id:"strings",
  title:"Two strings: LCS and edit distance",
  goal:"Compare two sequences with a table whose rows are one string and columns are the other. Read the answer off the corner.",
  mins:35,
  blocks:[
    {md:`When a problem involves **two strings** (or two arrays), make the state a pair of prefix lengths: \`dp[i][j]\` answers the question for the first \`i\` letters of \`a\` and the first \`j\` letters of \`b\`. The table has an extra empty row and column for the empty prefix, which become your base cases.

## Longest common subsequence (LCS)

A **subsequence** keeps the order but may skip letters. Look at the last letters of the two prefixes:

- **They match**: that letter can be part of the subsequence. \`dp[i][j] = dp[i-1][j-1] + 1\`
- **They differ**: at most one of them is used. Drop one and keep the better: \`dp[i][j] = max(dp[i-1][j], dp[i][j-1])\``},
    {viz:"dp",dp:"lcs",a:"abcde",b:"ace",title:"LCS of \"abcde\" and \"ace\": matches use the diagonal, mismatches take the better neighbor"},
    {tpl:`function longestCommonSubsequence(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}   // O(m * n) time and memory (O(n) with two rows)`,title:"LCS"},
    {md:`## Edit distance

The fewest operations (**insert**, **delete**, **replace** one letter) to turn \`a\` into \`b\`. State: \`dp[i][j]\` = the cost to turn the first \`i\` letters of \`a\` into the first \`j\` of \`b\`.

- **Base cases**: turning \`i\` letters into nothing costs \`i\` deletes; turning nothing into \`j\` letters costs \`j\` inserts
- **Letters match**: free. \`dp[i][j] = dp[i-1][j-1]\`
- **Letters differ**: pay 1 and take the cheapest way in: \`1 + min(\`**delete** \`dp[i-1][j],\` **insert** \`dp[i][j-1],\` **replace** \`dp[i-1][j-1])\``},
    {viz:"dp",dp:"edit",a:"cat",b:"cut",title:"Edit distance cat → cut: one replace"},
    {viz:"dp",dp:"edit",a:"horse",b:"ros",title:"Edit distance horse → ros"},
    {md:`## The same shape elsewhere

Many problems are LCS or edit distance in disguise. Recognize them by "two strings, compare in order":

| Problem | Reduction |
| --- | --- |
| Longest Palindromic Subsequence | LCS of \`s\` and its **reverse** |
| Delete Operation for Two Strings | \`m + n - 2 × LCS\` |
| Uncrossed Lines | LCS on two integer arrays |
| Distinct Subsequences | same table, but count: \`dp[i][j] = dp[i-1][j] + (match ? dp[i-1][j-1] : 0)\` |
| Interleaving String, Regex / Wildcard Matching | prefix-pair tables with their own match rules |

## Reading the table back

The answer is the corner, but the *actual* subsequence or edit script comes from walking back from the corner: at each cell, go to the neighbor the value came from (diagonal on a match, otherwise the larger one). Interviewers sometimes ask for it.`},
    {tip:"For one string where the order matters from both ends (palindromes), the state is often a substring [i..j] instead of two prefixes, and the table fills by increasing length."},
  ],
  parts:[
    {type:"quiz",id:"q-lcs-match",q:"In LCS, a[i-1] equals b[j-1]. Why is dp[i][j] = dp[i-1][j-1] + 1 safe (instead of also considering the other neighbors)?",
      options:["It isn't safe; you must take the max with the neighbors","Matching these two letters never hurts: any common subsequence of the shorter prefixes can be extended by the pair","Because the letters are lowercase","Because the diagonal is always the largest"],answer:1,
      why:"If the last letters are equal, some optimal subsequence uses them as its last pair. So the answer is the best for both prefixes minus that letter, plus one."},
    {type:"quiz",id:"q-edit-base",q:"What is edit distance dp[3][0] for any string a, and why?",
      options:["0","1","3: delete the 3 letters to reach the empty string","Infinity"],answer:2,
      why:"The first 3 letters of a must become the empty string, which takes three deletes. The base row and column are therefore i and j, not 0. Using 0 for them is a classic bug."},
    {type:"quiz",id:"q-lps",q:"How can Longest Palindromic Subsequence be solved using the LCS code you already have?",
      options:["LCS of s with itself","LCS of s with its reverse","LCS of s with its sorted letters","It cannot"],answer:1,
      why:"A palindrome reads the same in both directions, so a subsequence of s that is also a subsequence of reverse(s) in the same order is a palindromic subsequence. The longest such is the LCS."},
    {type:"code",id:"lcs",title:"Longest common subsequence",fn:"longestCommonSubsequence",
      prompt:"Return the length of the longest common **subsequence** of strings `a` and `b` (0 if there is none). A subsequence keeps the order but may skip letters.",
      starter:`function longestCommonSubsequence(a, b) {

}
`,
      solution:`function longestCommonSubsequence(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}
`,
      hint:"Make a (m+1) by (n+1) table of zeros. If a[i-1] === b[j-1] then dp[i][j] = dp[i-1][j-1] + 1, otherwise the max of the cell above and the cell to the left.",
      tests:[
        ["example",["abcde","ace"],3],
        ["identical",["abc","abc"],3],
        ["nothing in common",["abc","def"],0],
        ["one shared letter",["bl","yby"],1],
        ["longer",["abcba","abcbcba"],5],
        ["single letters",["a","a"],1],
        ["interleaved",["axbycz","abc"],3],
      ]},
    {type:"code",id:"edit-distance",title:"Edit distance",fn:"minDistance",
      prompt:"Given two strings `word1` and `word2`, return the minimum number of operations to convert `word1` into `word2`. The operations are **insert** a letter, **delete** a letter, or **replace** a letter.",
      starter:`function minDistance(word1, word2) {

}
`,
      solution:`function minDistance(word1, word2) {
  const m = word1.length, n = word2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = word1[i - 1] === word2[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
`,
      hint:"Base cases: dp[i][0] = i and dp[0][j] = j. If the letters match copy the diagonal; otherwise it is 1 + min(above, left, diagonal).",
      tests:[
        ["example",["horse","ros"],3],
        ["example 2",["intention","execution"],5],
        ["from empty",["","abc"],3],
        ["to empty",["abc",""],3],
        ["both empty",["",""],0],
        ["same",["same","same"],0],
        ["one replace",["a","b"],1],
        ["sunday saturday",["sunday","saturday"],3],
      ]},
    {type:"code",id:"lps",title:"Longest palindromic subsequence",fn:"longestPalindromeSubseq",
      prompt:"Return the length of the longest **palindromic subsequence** of `s`.\n\nReduce it to something you have already written: the LCS of `s` and its reverse.",
      starter:`function longestPalindromeSubseq(s) {

}
`,
      solution:`function longestPalindromeSubseq(s) {
  const t = [...s].reverse().join("");
  const n = s.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = s[i - 1] === t[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[n][n];
}
`,
      hint:"Build the reversed string, then run the LCS table on s and the reversed string. The answer is the bottom-right cell.",
      tests:[
        ["example",["bbbab"],4],
        ["example 2",["cbbd"],2],
        ["single letter",["a"],1],
        ["no repeated letters",["abcde"],1],
        ["skip letters in the middle",["agbdba"],5],
        ["whole string",["racecar"],7],
      ]},
  ],
  leetcode:["longest-common-subsequence","edit-distance","longest-palindromic-subsequence","distinct-subsequences","delete-operation-for-two-strings","uncrossed-lines"],
},

// ───────────────────────────────────────────── 6
{
  id:"choose",
  title:"Recognizing DP and designing states",
  goal:"Decide when a problem is DP, choose a state that carries enough information, and extend a state with a mode (the stock problems).",
  mins:30,
  blocks:[
    {md:`## Is it DP?

Look for these signs together:

- You are asked for a **count**, a **maximum or minimum**, or a **yes/no** over many ways of doing something (not for the ways themselves)
- A choice now leaves a **smaller version of the same problem**
- A brute-force recursion would **revisit the same sub-situation** by different routes
- The inputs are small enough for a table: a few thousand states, not billions

If the problem asks to **list every** solution (all subsets, all permutations), that is backtracking: the output is already exponential, so caching cannot help. If a **local best choice is provably safe** (interval scheduling by end time), greedy is simpler and faster. Coin change with [1, 3, 4] shows why you check before trusting greedy.

## A checklist for designing the state

1. What is the **question**? Write it as a function: \`f(...) = the best/number/possible\`
2. What do the **arguments** need to say so the future does not depend on anything else? A state must capture *everything the remaining decisions depend on*
3. What are the **choices** at a state, and what state does each lead to?
4. What are the **base cases**?
5. In what **order** can you fill the table so dependencies are ready? What is the **answer cell**?
6. Can it be done in **less memory** (only the last row or two)?

## When the state needs a mode

In **Best Time to Buy and Sell Stock with Cooldown**, knowing the day is not enough. What you can do tomorrow depends on whether you *hold* a share, just *sold*, or are *resting*. So the state is **(day, mode)**:

- \`hold\`: best profit while holding a share
- \`sold\`: best profit having just sold today (tomorrow is the cooldown)
- \`rest\`: best profit holding nothing and free to buy

Each day moves between modes:

- \`hold = max(hold, rest - price)\`: keep it, or buy (only from \`rest\`, which is what enforces the cooldown)
- \`sold = hold + price\`: sell what you hold
- \`rest = max(rest, sold)\` using yesterday's \`sold\`: do nothing, or come out of the cooldown

This is a tiny **state machine**. Many "with a constraint" DPs (at most k transactions, no two same colors in a row) are the same idea: add the constraint to the state.`},
    {tpl:`function maxProfit(prices) {
  let hold = -Infinity, sold = 0, rest = 0;
  for (const p of prices) {
    const prevSold = sold;
    sold = hold + p;                    // sell today
    hold = Math.max(hold, rest - p);    // keep, or buy from a free state
    rest = Math.max(rest, prevSold);    // idle, or cooldown ends
  }
  return Math.max(sold, rest);
}`,title:"Stock with cooldown as a state machine"},
    {md:`## Reducing a new problem to an old one

House Robber II puts the houses in a **circle**, so the first and last are neighbors. You cannot rob both. Split into two linear cases and take the better:

- rob from houses \`0..n-2\` (the last house is excluded)
- rob from houses \`1..n-1\` (the first house is excluded)

Every valid plan falls into one of the two, and each one is the House Robber you already solved. Look for this move before inventing a new recurrence.

## Common mistakes

- **Vague state.** If you cannot finish "\`dp[i]\` means ...", stop and fix that first
- **Wrong base case.** Empty input, one element, amount 0, and the empty prefix are where most bugs hide
- **Reading a cell before it is filled.** Check the fill order against the dependencies
- **Mutating shared state in a memo.** Memo keys must capture the whole state; do not memoize on \`i\` when the answer also depends on \`j\`
- **Forgetting the answer cell.** It may be the corner, the last cell, or the max of all cells (Kadane, LIS)`},
    {tip:"In an interview, say it in this order: the state in a sentence, the transition, the base cases, then the order and complexity. Then code. Interviewers grade the reasoning at least as much as the code."},
  ],
  parts:[
    {type:"quiz",id:"q-dp-or-bt",q:"\"Return all the ways to split a string into dictionary words.\" Versus \"Return whether it can be split.\" Which one is a better fit for plain DP?",
      options:["The first: it lists all the solutions","The second: it only needs a yes/no per prefix, so each state is computed once","Neither","Both are identical"],answer:1,
      why:"Listing all answers has an output that can itself be exponential, which is backtracking territory (a memo can still help). A yes/no or a count per prefix is the classic DP shape."},
    {type:"quiz",id:"q-state-enough",q:"What does a good DP state have to contain?",
      options:["As few variables as possible, whatever the problem","Everything the remaining decisions depend on, and nothing more","The full input","The previous answer only"],answer:1,
      why:"Too small and the recurrence is wrong (it ignores a constraint, like the cooldown). Too large and the table explodes. The right state is the minimum information needed to decide the future."},
    {type:"quiz",id:"q-circle",q:"How is House Robber II (houses in a circle) solved with the original House Robber?",
      options:["Run it once; the circle changes nothing","Run it on houses 0..n-2 and on houses 1..n-1, and take the larger","Run it twice on the whole array and add them","Rob the first house, then run it on the rest"],answer:1,
      why:"The only new rule is that the first and last houses cannot both be robbed. Every plan leaves out either the first or the last, so the best of the two linear cases is the answer."},
    {type:"code",id:"rob-ii",title:"House Robber II",fn:"robCircular",
      prompt:"The houses are arranged in a **circle**, so the first and last houses are neighbors and cannot both be robbed. Return the most you can rob. With one house, rob it.\n\nSolve the straight-line version as a helper, then call it twice.",
      starter:`function robCircular(nums) {

}
`,
      solution:`function robCircular(nums) {
  if (nums.length === 1) return nums[0];
  const line = (from, to) => {
    let skip = 0, take = 0;
    for (let i = from; i <= to; i++) {
      const next = Math.max(take, skip + nums[i]);
      skip = take;
      take = next;
    }
    return take;
  };
  return Math.max(line(0, nums.length - 2), line(1, nums.length - 1));
}
`,
      hint:"Write rob over a range [from, to]. The answer is max(rob(0..n-2), rob(1..n-1)). Handle n = 1 separately, because both ranges would be empty.",
      tests:[
        ["example",[[2,3,2]],3],
        ["example 2",[[1,2,3,1]],4],
        ["three houses",[[1,2,3]],3],
        ["one house",[[5]],5],
        ["two houses",[[1,2]],2],
        ["the first house is best",[[200,3,140,20,10]],340],
        ["rob around the ends",[[4,1,1,4,1]],8],
      ]},
    {type:"code",id:"stock-cooldown",title:"Stock with cooldown",fn:"maxProfit",
      prompt:"`prices[i]` is the price of a stock on day `i`. You may buy and sell as many times as you like, holding at most one share, with one rule: **after you sell you cannot buy on the next day** (a one-day cooldown). Return the maximum profit.\n\nUse three running values for the modes: `hold`, `sold` and `rest`.",
      starter:`function maxProfit(prices) {

}
`,
      solution:`function maxProfit(prices) {
  let hold = -Infinity, sold = 0, rest = 0;
  for (const p of prices) {
    const prevSold = sold;
    sold = hold + p;
    hold = Math.max(hold, rest - p);
    rest = Math.max(rest, prevSold);
  }
  return Math.max(sold, rest);
}
`,
      hint:"Each day: sold = hold + price, hold = max(hold, rest - price), rest = max(rest, yesterday's sold). Start with hold = -Infinity, sold = rest = 0. Use the old sold value when updating rest.",
      tests:[
        ["example",[[1,2,3,0,2]],3],
        ["one day",[[1]],0],
        ["falling prices",[[2,1]],0],
        ["a rising run",[[1,2,4]],3],
        ["the cooldown forces one big trade",[[1,4,2,7]],6],
        ["a longer series",[[6,1,6,4,3,0,2]],7],
        ["empty",[[]],0],
      ]},
    {type:"explain",id:"e-greedy-vs-dp",title:"Why greedy fails on coin change",
      prompt:"For coin change with coins [1, 3, 4] and amount 6, a greedy 'take the biggest coin that fits' gives 3 coins but the best answer is 2. Explain (1) why greedy fails here, and (2) define the DP state, transition and base case that solve it, with the time and memory it costs for an amount A and k coin types.",
      rubric:"A strong answer: (1) says greedy commits to the largest coin (4) and cannot reconsider; the locally best choice leaves 2, which needs two 1s, whereas 3+3 is better; greedy works only for special coin systems; (2) defines the state as fewest[a] = the fewest coins that make amount a; the transition fewest[a] = 1 + min over coins c <= a of fewest[a - c]; base case fewest[0] = 0 and unreachable amounts as infinity (answer -1 if fewest[A] is infinity); (3) gives O(A * k) time and O(A) memory; (4) explains that DP tries every coin as the last one at every amount, which is why it does not miss the 3+3 answer."},
  ],
  leetcode:["house-robber-ii","best-time-to-buy-and-sell-stock-with-cooldown","regular-expression-matching","wildcard-matching"],
},

  ],
});
