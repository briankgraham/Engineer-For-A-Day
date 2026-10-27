// Learning tab: the Intervals track. Same schema as learn_data.js (see the header there). Loaded after learn_data.js, before learn.js.
//   viz blocks over intervals: {viz: "intervals", mode: "show" | "merge" | "sweep", intervals: [[start, end], ...], title}
//                              "show" draws the intervals on a number line; "merge" steps through sort-and-merge (the input may be
//                              unsorted); "sweep" steps through the +1/-1 events. Keep it to 6 intervals with integer ends in 0..30.
LEARN_TRACKS.push({
  id:"intervals",
  title:"Intervals",
  icon:"📏",
  tagline:"Meetings, bookings and ranges: overlap tests, merging, inserting, intersecting, greedy picking and the sweep line.",
  outcomes:[
    "Write the overlap test from memory, and say when touching ends count as overlap",
    "Sort by start to merge, insert and intersect; sort by end to keep the most",
    "Count how many intervals are active at once with a sweep line or a difference array",
    "Pick the technique from the wording of the problem",
  ],
  ready:[
    ["meeting-rooms","overlap"],["merge-intervals","merge"],["insert-interval","insert"],["interval-list-intersections","intersect"],
    ["meeting-scheduler","intersect"],["non-overlapping-intervals","greedy"],["minimum-number-of-arrows-to-burst-balloons","greedy"],
    ["meeting-rooms-ii","sweep"],["car-pooling","sweep"],["employee-free-time","choose"],["divide-intervals-into-minimum-number-of-groups","choose"],
  ],
  lessons:[

// ───────────────────────────────────────────── 1
{
  id:"overlap",
  title:"Overlap, and why sorting helps",
  goal:"Write the overlap test without drawing a picture, and use a sort to turn \"compare every pair\" into \"compare neighbors\".",
  mins:15,
  blocks:[
    {md:`An **interval** is a pair \`[start, end]\` on a number line: a meeting, a booking, a range of IDs, the time a process holds a lock. Nearly every interval problem boils down to one question about pairs: **do these two overlap, and if so, what do we do about it?**

## Two intervals, three shapes

Given \`a\` and \`b\`, one of these is true:

| Shape | Picture | Overlap? |
| --- | --- | --- |
| a is entirely before b | \`a ──\` then \`── b\` | no |
| they partly overlap | \`a ────\` over \`── b ────\` | yes |
| one contains the other | \`a ────────\` over \`── b ──\` | yes |`},
    {viz:"intervals",mode:"show",title:"Three intervals: [1, 4] and [3, 7] overlap; [8, 10] is clear of both",intervals:[[1,4],[3,7],[8,10]]},
    {md:`Instead of listing the shapes, test the **opposite**: they do *not* overlap when one ends before the other starts. So they overlap exactly when **each one starts before the other ends**:`},
    {tpl:`// half-open: [1, 5] and [5, 9] only touch, they do not overlap
const overlaps = (a, b) => a[0] < b[1] && b[0] < a[1];`,title:"Overlap test"},
    {md:`## Do touching ends overlap?

\`[1, 5]\` and \`[5, 9]\` share the single point 5. Whether that counts depends on the problem, and it is the most common source of off-by-one bugs here:

| Problem | Touching ends | Test |
| --- | --- | --- |
| Meetings and bookings: a meeting that ends at 5 frees the room at 5 | **not** an overlap | \`b[0] < a[1]\` |
| Merging ranges: [1, 4] and [4, 5] become [1, 5] | **is** an overlap | \`b[0] <= a[1]\` |

Read the statement for the word *inclusive* or an example with touching ends. If it's unclear in an interview, ask.

## Sorting makes it local

Checking every pair is O(n²). Sort by start and it becomes much easier. If any interval overlaps a later one, it overlaps the very next one: the later one starts no earlier than the next one does, and it starts before the first one ends. So after sorting you only compare **neighbors**.`},
    {tpl:`intervals.sort((a, b) => a[0] - b[0]);
for (let i = 1; i < intervals.length; i++) {
  const prev = intervals[i - 1], cur = intervals[i];
  if (cur[0] < prev[1]) {
    // cur overlaps prev
  }
}`,title:"Sort by start, compare neighbors"},
    {warn:"JavaScript's sort() with no comparator sorts as strings. [[10, 12], [9, 11]].sort() puts [10, 12] first because \"10,12\" < \"9,11\". Always pass (a, b) => a[0] - b[0]."},
  ],
  parts:[
    {type:"quiz",id:"q-overlap-test",q:"Which expression says that half-open intervals a and b overlap?",
      options:["a[0] < b[1] && b[0] < a[1]","a[0] < b[0] && a[1] < b[1]","a[1] > b[0]","a[0] === b[0] || a[1] === b[1]"],answer:0,
      why:"Each must start before the other ends. a[1] > b[0] alone checks one direction only: a = [5, 9] and b = [1, 2] gives 9 > 1, but they are far apart."},
    {type:"quiz",id:"q-touch",q:"Meeting Rooms asks whether one person can attend every meeting. Can they attend [1, 5] and [5, 9]?",
      options:["Yes: the first ends exactly as the second starts","No: both include time 5"],answer:0,
      why:"A meeting ending at 5 is over at 5. Treat the end as exclusive, so the overlap test uses strict < and touching intervals are fine."},
    {type:"quiz",id:"q-default-sort",q:"What does [[10, 12], [9, 11]].sort() return in JavaScript?",
      options:["[[9, 11], [10, 12]], since it compares the first numbers","[[10, 12], [9, 11]]: with no comparator the arrays are compared as strings, and \"10,12\" < \"9,11\"","It throws, because arrays can't be sorted","[[9, 11], [10, 12]], but only on the second call"],answer:1,
      why:"The default comparator converts elements to strings and compares them character by character. Always give a numeric comparator."},
    {type:"code",id:"do-overlap",title:"Do two intervals overlap?",fn:"doOverlap",
      prompt:"Given two half-open intervals `a` and `b` (each `[start, end]`), return `true` if they overlap. Intervals that only touch, like `[1, 4]` and `[4, 7]`, do **not** overlap.",
      starter:"function doOverlap(a, b) {\n  \n}\n",
      solution:"function doOverlap(a, b) {\n  return a[0] < b[1] && b[0] < a[1];\n}\n",
      hint:"Each one must start before the other ends.",
      tests:[
        ["partial overlap",[[1,4],[3,7]],true],
        ["touching ends",[[1,4],[4,7]],false],
        ["contained",[[1,10],[3,4]],true],
        ["contained, swapped",[[3,4],[1,10]],true],
        ["apart",[[5,9],[1,2]],false],
        ["identical",[[2,6],[2,6]],true],
      ]},
    {type:"code",id:"can-attend",title:"Can attend all meetings",fn:"canAttendAll",
      prompt:"Given a list of meeting intervals `[start, end]` (in any order), return `true` if one person can attend every meeting, meaning no two meetings overlap. A meeting that ends at `t` doesn't conflict with one starting at `t`.",
      starter:"function canAttendAll(intervals) {\n  \n}\n",
      solution:"function canAttendAll(intervals) {\n  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);\n  for (let i = 1; i < sorted.length; i++) {\n    if (sorted[i][0] < sorted[i - 1][1]) return false;\n  }\n  return true;\n}\n",
      hint:"Sort by start, then compare each meeting's start with the previous meeting's end.",
      tests:[
        ["example, overlap",[[[0,30],[5,10],[15,20]]],false],
        ["example, clear",[[[7,10],[2,4]]],true],
        ["empty",[[]],true],
        ["one meeting",[[[3,9]]],true],
        ["touching",[[[1,5],[5,9]]],true],
        ["unsorted with an overlap",[[[8,10],[1,3],[9,12],[4,6]]],false],
        ["contained",[[[1,10],[3,4]]],false],
      ]},
  ],
  leetcode:["meeting-rooms"],
},

// ───────────────────────────────────────────── 2
{
  id:"merge",
  title:"Merging intervals",
  goal:"Sort by start and merge in one pass, and explain why the new end is a max.",
  mins:20,
  blocks:[
    {md:`**Merge Intervals** is the template for the whole topic: combine every group of overlapping intervals into one. After sorting by start, you keep a list of merged intervals and look at only the **last** one:

- if the new interval starts **after** the last merged end, there is a gap: start a new merged interval
- otherwise it overlaps: **extend** the last one to \`max(last end, new end)\`

Watch it run. The input is deliberately not sorted.`},
    {viz:"intervals",mode:"merge",title:"Merge [8,10] [1,3] [2,6] [15,18] [17,20]",intervals:[[8,10],[1,3],[2,6],[15,18],[17,20]]},
    {tpl:`function merge(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of intervals) {
    const last = merged[merged.length - 1];
    if (!last || start > last[1]) merged.push([start, end]);
    else last[1] = Math.max(last[1], end);
  }
  return merged;
}`,title:"Merge intervals"},
    {md:`## Why the max

An interval can sit entirely inside the last merged one. With \`[1, 10]\` then \`[2, 3]\`, setting \`last[1] = 3\` would **shrink** the range. Taking the max keeps the longer end.

## Touching

The condition \`start > last[1]\` means intervals that touch (\`[1, 4]\` and \`[4, 5]\`) merge into \`[1, 5]\`. Use \`>=\` there instead if the problem says touching ranges stay separate.

## Cost

Sorting is O(n log n). The merge pass after it is O(n). Extra space is the output.`},
    {warn:"Push a copy ([start, end]), not the input's own array. Otherwise `last[1] = ...` quietly edits the caller's data. Also remember that sort() sorts in place; copy first with [...intervals] if the function must not change its input."},
    {md:`## Merging is the building block

Once you can merge, a lot of questions are one step further: the total length covered is the sum of merged lengths, the gaps between merged intervals are the free time, and \`merged.length\` is the number of separate groups.`},
  ],
  parts:[
    {type:"quiz",id:"q-merge-max",q:"Why does the merge step use last[1] = Math.max(last[1], end) rather than last[1] = end?",
      options:["The new interval can be fully inside the last merged one, and then its end is smaller","The input might be unsorted","To avoid mutating the input","It makes the sort faster"],answer:0,
      why:"With [1, 10] followed by [2, 3], the second starts inside the first and ends before it. Assigning the end would shrink the merged range to [1, 3]."},
    {type:"quiz",id:"q-merge-touch",q:"With the condition start > last[1] to start a new interval, what does merging [[1, 4], [4, 5]] return?",
      options:["[[1, 5]]","[[1, 4], [4, 5]]","[[1, 4]]","[[4, 5]]"],answer:0,
      why:"4 > 4 is false, so the second interval counts as overlapping and the end becomes max(4, 5) = 5. To keep touching ranges separate, test start >= last[1]."},
    {type:"quiz",id:"q-merge-cost",q:"What is the time complexity of merging n intervals that start unsorted?",
      options:["O(n)","O(n log n)","O(n²)","O(n log n) to sort, then O(n²) to merge"],answer:1,
      why:"The sort is O(n log n). The merge is a single pass over the sorted list, O(n), so the sort dominates. If the input arrives already sorted, the whole thing is O(n)."},
    {type:"code",id:"merge-intervals",title:"Merge Intervals",fn:"mergeIntervals",
      prompt:"Given an array of `intervals` where `intervals[i] = [start, end]`, merge all overlapping intervals and return the non-overlapping intervals that cover the same ranges, sorted by start. Intervals that touch (like `[1, 4]` and `[4, 5]`) count as overlapping.",
      starter:"function mergeIntervals(intervals) {\n  \n}\n",
      solution:"function mergeIntervals(intervals) {\n  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);\n  const merged = [];\n  for (const [start, end] of sorted) {\n    const last = merged[merged.length - 1];\n    if (!last || start > last[1]) merged.push([start, end]);\n    else last[1] = Math.max(last[1], end);\n  }\n  return merged;\n}\n",
      hint:"Sort by start. For each interval: if it starts after the last merged end, push it; otherwise set the last merged end to the larger of the two ends.",
      tests:[
        ["example",[[[1,3],[2,6],[8,10],[15,18]]],[[1,6],[8,10],[15,18]]],
        ["touching",[[[1,4],[4,5]]],[[1,5]]],
        ["contained",[[[1,10],[2,3]]],[[1,10]]],
        ["unsorted input",[[[8,10],[1,3],[2,6]]],[[1,6],[8,10]]],
        ["one interval",[[[5,7]]],[[5,7]]],
        ["empty",[[]],[]],
        ["a chain and a loner",[[[1,4],[2,5],[5,8],[9,9]]],[[1,8],[9,9]]],
        ["a long one swallows the rest",[[[1,20],[2,3],[4,5],[6,7]]],[[1,20]]],
      ]},
    {type:"code",id:"covered-length",title:"Total length covered",fn:"coveredLength",
      prompt:"Given a list of intervals `[start, end]` (in any order, possibly overlapping), return the **total length** of the number line they cover. Overlapping parts count once. For example `[[1, 3], [2, 6], [8, 10]]` covers `[1, 6]` and `[8, 10]`, which is 5 + 2 = 7.",
      starter:"function coveredLength(intervals) {\n  \n}\n",
      solution:"function coveredLength(intervals) {\n  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);\n  let total = 0, start = null, end = null;\n  for (const [s, e] of sorted) {\n    if (end === null || s > end) {\n      if (end !== null) total += end - start;\n      start = s;\n      end = e;\n    } else end = Math.max(end, e);\n  }\n  if (end !== null) total += end - start;\n  return total;\n}\n",
      hint:"Merge as before, but instead of storing merged intervals keep the current [start, end] and add its length to a total whenever a gap closes it (and once more at the end).",
      tests:[
        ["example",[[[1,3],[2,6],[8,10]]],7],
        ["empty",[[]],0],
        ["contained",[[[1,5],[2,3]]],4],
        ["touching",[[[1,2],[2,3]]],2],
        ["unsorted",[[[8,10],[1,3],[2,6]]],7],
        ["identical",[[[4,9],[4,9],[4,9]]],5],
      ]},
  ],
  leetcode:["merge-intervals"],
},

// ───────────────────────────────────────────── 3
{
  id:"insert",
  title:"Inserting into a sorted list",
  goal:"Insert one interval into a sorted, non-overlapping list in a single O(n) pass.",
  mins:15,
  blocks:[
    {md:`**Insert Interval** gives you a list that is already **sorted and non-overlapping**, plus one new interval. You could push it and run merge (O(n log n)), but the sorted input lets you do it in one pass with no sort. The list splits into three runs around the new interval:

1. **Before:** intervals that end before the new one starts. Copy them unchanged.
2. **Overlapping:** intervals that start no later than the new one ends. Absorb each into the new interval: \`start = min(starts)\`, \`end = max(ends)\`.
3. **After:** everything else. Push the new (grown) interval, then copy the rest.

Take \`[4, 8]\` into \`[[1,2], [3,5], [6,7], [8,10], [12,16]]\`. \`[1,2]\` is before. \`[3,5]\`, \`[6,7]\` and \`[8,10]\` all overlap, so the new interval grows to \`[3, 10]\`. \`[12,16]\` is after. The result is \`[[1,2], [3,10], [12,16]]\`.`},
    {tpl:`function insert(intervals, newInterval) {
  const out = [];
  let i = 0;
  while (i < intervals.length && intervals[i][1] < newInterval[0]) out.push(intervals[i++]);          // before
  while (i < intervals.length && intervals[i][0] <= newInterval[1]) {                                  // overlapping
    newInterval = [Math.min(newInterval[0], intervals[i][0]), Math.max(newInterval[1], intervals[i][1])];
    i++;
  }
  out.push(newInterval);
  while (i < intervals.length) out.push(intervals[i++]);                                               // after
  return out;
}`,title:"Insert interval: three runs"},
    {tip:"The two conditions are the mirror of the overlap test. \"Before\" is intervals[i][1] < new[0] (ends before the new one starts). Everything that is neither before nor after must overlap, so the second loop only needs the \"not after\" half: intervals[i][0] <= new[1]."},
    {md:`## Edge cases this handles with no special code

- empty list: both loops don't run, you push the new interval
- the new interval comes first or last: one run is empty
- the new interval swallows everything: the middle loop eats it all
- it sits inside an existing interval: the min/max change nothing`},
  ],
  parts:[
    {type:"quiz",id:"q-insert-result",q:"Insert [4, 8] into [[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]]. What is the result?",
      options:["[[1, 2], [3, 10], [12, 16]]","[[1, 2], [3, 5], [4, 8], [6, 7], [8, 10], [12, 16]]","[[1, 2], [3, 8], [8, 10], [12, 16]]","[[1, 2], [4, 8], [12, 16]]"],answer:0,
      why:"[3, 5] and [6, 7] overlap [4, 8]. [8, 10] touches it at 8, and in this problem touching merges. The group grows to [3, 10] and [1, 2] and [12, 16] are untouched."},
    {type:"quiz",id:"q-insert-cond",q:"In the \"before\" run, which condition says the existing interval is entirely before the new one?",
      options:["intervals[i][1] < newInterval[0]","intervals[i][0] < newInterval[0]","intervals[i][0] < newInterval[1]","intervals[i][1] > newInterval[0]"],answer:0,
      why:"Before means it ends before the new one starts. Comparing starts (option 2) would wrongly skip an interval that starts earlier but runs into the new one."},
    {type:"quiz",id:"q-insert-cost",q:"Why is the three-run version O(n) while \"push, then merge\" is O(n log n)?",
      options:["It never needs to sort, because the input is already sorted and non-overlapping","It uses a heap","It only looks at a few intervals","It stops early"],answer:0,
      why:"Both do a linear pass, but pushing the new interval onto the end breaks the sorted order, so merge has to sort again. The three runs insert it in the right place by construction."},
    {type:"code",id:"insert-interval",title:"Insert Interval",fn:"insertInterval",
      prompt:"`intervals` is sorted by start and non-overlapping. Insert `newInterval` and merge if necessary, so the result is still sorted and non-overlapping. Touching intervals merge. Do it in one pass, without sorting.",
      starter:"function insertInterval(intervals, newInterval) {\n  \n}\n",
      solution:"function insertInterval(intervals, newInterval) {\n  const out = [];\n  let i = 0;\n  while (i < intervals.length && intervals[i][1] < newInterval[0]) out.push(intervals[i++]);\n  while (i < intervals.length && intervals[i][0] <= newInterval[1]) {\n    newInterval = [Math.min(newInterval[0], intervals[i][0]), Math.max(newInterval[1], intervals[i][1])];\n    i++;\n  }\n  out.push(newInterval);\n  while (i < intervals.length) out.push(intervals[i++]);\n  return out;\n}\n",
      hint:"Three loops sharing one index: copy intervals that end before the new start; absorb ones that start by the new end (min of starts, max of ends); then push the new interval and copy the rest.",
      tests:[
        ["example 1",[[[1,3],[6,9]],[2,5]],[[1,5],[6,9]]],
        ["example 2",[[[1,2],[3,5],[6,7],[8,10],[12,16]],[4,8]],[[1,2],[3,10],[12,16]]],
        ["empty list",[[],[5,7]],[[5,7]]],
        ["goes first",[[[3,4]],[1,2]],[[1,2],[3,4]]],
        ["goes last",[[[1,2]],[5,6]],[[1,2],[5,6]]],
        ["swallows everything",[[[2,3],[4,5]],[1,9]],[[1,9]]],
        ["inside an existing one",[[[1,10]],[3,4]],[[1,10]]],
        ["touching",[[[1,2]],[2,3]],[[1,3]]],
        ["between two",[[[1,2],[8,9]],[4,5]],[[1,2],[4,5],[8,9]]],
      ]},
  ],
  leetcode:["insert-interval"],
},

// ───────────────────────────────────────────── 4
{
  id:"intersect",
  title:"Intersecting two lists",
  goal:"Walk two sorted interval lists with two pointers and know which pointer to advance.",
  mins:15,
  blocks:[
    {md:`Now you have **two** lists, each sorted and non-overlapping: say two people's free time, or two servers' busy windows. Where do they overlap?

Keep a pointer into each list. For the current pair \`A[i]\` and \`B[j]\`:

- the overlap, if any, is \`[max(starts), min(ends)]\`. It's real when \`lo <= hi\`.
- then **advance whichever interval ends first**. That interval can't overlap anything further along in the other list, because the other list's next interval starts after the other one ends, which is later.

Advance the one with the smaller end, and each step discards an interval, so it's **O(n + m)**.`},
    {tpl:`function intersect(A, B) {
  const out = [];
  let i = 0, j = 0;
  while (i < A.length && j < B.length) {
    const lo = Math.max(A[i][0], B[j][0]);
    const hi = Math.min(A[i][1], B[j][1]);
    if (lo <= hi) out.push([lo, hi]);
    if (A[i][1] < B[j][1]) i++; else j++;
  }
  return out;
}`,title:"Intersect two sorted interval lists"},
    {md:`## Closed or half-open

\`lo <= hi\` treats ranges as **closed**: \`[1, 5]\` and \`[5, 8]\` intersect in the single point \`[5, 5]\`. For half-open ranges use \`lo < hi\`. The problem decides.

## A close cousin: Meeting Scheduler

Given two people's availability and a meeting length, find the earliest slot that fits both. It is the same walk, with a different test: the overlap \`[lo, hi]\` has to be at least \`duration\` long. Return \`[lo, lo + duration]\` as soon as one is.`},
  ],
  parts:[
    {type:"quiz",id:"q-which-pointer",q:"After computing the overlap of A[i] and B[j], which pointer do you advance?",
      options:["The one whose interval ends first","The one whose interval starts first","Both","Whichever list is shorter"],answer:0,
      why:"The interval that ends first cannot overlap anything later in the other list, since the other list's next interval starts after the current one ends. The interval that ends last might still overlap the next one, so it stays."},
    {type:"quiz",id:"q-both",q:"Why not always advance both pointers?",
      options:["You could skip an overlap: a long interval in one list may overlap several short ones in the other","It would be slower","It would repeat results","It is fine and gives the same answer"],answer:0,
      why:"A = [[1, 10]] and B = [[2, 3], [5, 6]]: after pairing [1, 10] with [2, 3], advancing both would jump past [5, 6] and miss that overlap."},
    {type:"quiz",id:"q-lo-hi",q:"Intersecting [1, 5] with [5, 8] as closed intervals gives…",
      options:["[5, 5], a single point","nothing","[1, 8]","[4, 6]"],answer:0,
      why:"lo = max(1, 5) = 5 and hi = min(5, 8) = 5. lo <= hi, so it counts. With half-open ranges you would test lo < hi and get nothing."},
    {type:"code",id:"interval-intersection",title:"Interval List Intersections",fn:"intervalIntersection",
      prompt:"`A` and `B` are lists of closed intervals, each sorted and with no overlaps inside the list. Return the intersection of the two lists, sorted. A single shared point counts, like `[5, 5]`.",
      starter:"function intervalIntersection(A, B) {\n  \n}\n",
      solution:"function intervalIntersection(A, B) {\n  const out = [];\n  let i = 0, j = 0;\n  while (i < A.length && j < B.length) {\n    const lo = Math.max(A[i][0], B[j][0]);\n    const hi = Math.min(A[i][1], B[j][1]);\n    if (lo <= hi) out.push([lo, hi]);\n    if (A[i][1] < B[j][1]) i++;\n    else j++;\n  }\n  return out;\n}\n",
      hint:"Overlap is [max(starts), min(ends)], valid when lo <= hi. Then advance the pointer whose interval ends first.",
      tests:[
        ["example",[[[0,2],[5,10],[13,23],[24,25]],[[1,5],[8,12],[15,24],[25,26]]],[[1,2],[5,5],[8,10],[15,23],[24,24],[25,25]]],
        ["one empty",[[],[[1,3]]],[]],
        ["no overlap",[[[1,3]],[[4,5]]],[]],
        ["one long, many short",[[[1,10]],[[2,3],[5,6]]],[[2,3],[5,6]]],
        ["identical",[[[1,4],[6,9]],[[1,4],[6,9]]],[[1,4],[6,9]]],
        ["interleaved",[[[1,4],[8,12]],[[3,9]]],[[3,4],[8,9]]],
      ]},
    {type:"code",id:"earliest-slot",title:"Meeting Scheduler",fn:"earliestSlot",
      prompt:"Two people each have a list of available `[start, end]` slots (a person's slots don't overlap each other, but the lists may be in any order). Given a meeting `duration`, return the **earliest** `[start, start + duration]` that fits inside a slot of each, or `[]` if there is none.",
      starter:"function earliestSlot(slots1, slots2, duration) {\n  \n}\n",
      solution:"function earliestSlot(slots1, slots2, duration) {\n  const A = [...slots1].sort((a, b) => a[0] - b[0]);\n  const B = [...slots2].sort((a, b) => a[0] - b[0]);\n  let i = 0, j = 0;\n  while (i < A.length && j < B.length) {\n    const lo = Math.max(A[i][0], B[j][0]);\n    const hi = Math.min(A[i][1], B[j][1]);\n    if (hi - lo >= duration) return [lo, lo + duration];\n    if (A[i][1] < B[j][1]) i++;\n    else j++;\n  }\n  return [];\n}\n",
      hint:"Sort both lists, walk with two pointers, and return as soon as the overlap [lo, hi] satisfies hi - lo >= duration.",
      tests:[
        ["fits",[[[10,50],[60,120],[140,210]],[[0,15],[60,70]],8],[60,68]],
        ["too long",[[[10,50],[60,120],[140,210]],[[0,15],[60,70]],12],[]],
        ["unsorted input",[[[140,210],[10,50]],[[0,4],[45,70]],5],[45,50]],
        ["one person has no slots",[[],[[1,10]],2],[]],
        ["exact fit",[[[1,5]],[[1,5]],4],[1,5]],
      ]},
  ],
  leetcode:["interval-list-intersections","meeting-scheduler"],
},

// ───────────────────────────────────────────── 5
{
  id:"greedy",
  title:"Greedy: sort by end",
  goal:"Choose the most intervals that fit together, and say why this one sorts by end.",
  mins:20,
  blocks:[
    {md:`Merging and inserting combine intervals. A second family **chooses** among them:

- keep as many non-overlapping intervals as possible
- remove as few as possible so none overlap
- use as few arrows (or rooms, or guards) as possible to touch every interval

The classic greedy is **activity selection**: sort by **end** time, and take an interval whenever it starts at or after the end of the last one you took. The one that finishes earliest leaves the most room for the rest, so taking it is never a mistake.

## Why not sort by start?

\`[[1, 10], [2, 3], [4, 5]]\`. Sorted by start, the first pick is \`[1, 10]\`, which blocks everything: **1** interval. Sorted by end, you take \`[2, 3]\` then \`[4, 5]\`: **2** intervals.`},
    {tpl:`function maxNonOverlapping(intervals) {
  intervals.sort((a, b) => a[1] - b[1]);
  let kept = 0, lastEnd = -Infinity;
  for (const [start, end] of intervals) {
    if (start >= lastEnd) { kept++; lastEnd = end; }
  }
  return kept;
}`,title:"Activity selection: sort by end"},
    {md:`## Remove the fewest

Everything you did not keep has to be removed, so the answer to "remove the fewest so none overlap" is **n − kept**. Same code, one subtraction.

## Fewest arrows

A balloon is an interval on the x-axis, and an arrow shot at x bursts every balloon with \`start <= x <= end\`. Sort by end and shoot at the end of the first balloon: that is as far right as it can go and still hit it, so it reaches the most others. Every balloon that starts at or before that x is burst too; skip them. The next balloon that starts after x needs a new arrow.`},
    {tpl:`function minArrows(points) {
  points.sort((a, b) => a[1] - b[1]);
  let arrows = 0, x = -Infinity;
  for (const [start, end] of points) {
    if (start > x) { arrows++; x = end; }
  }
  return arrows;
}`,title:"Fewest arrows: same sort"},
    {warn:"Look at the comparison. Keeping intervals uses start >= lastEnd (touching is fine: two meetings back to back). Arrows use start > x (an arrow at 5 bursts both [1, 5] and [5, 9], so touching balloons share an arrow). Same sort, opposite touching rule."},
  ],
  parts:[
    {type:"quiz",id:"q-counter",q:"For [[1, 10], [2, 3], [4, 5]], greedily taking the interval that starts earliest, then each later one that fits, keeps how many? And by earliest end?",
      options:["1 by start, 2 by end","2 by start, 2 by end","1 by start, 1 by end","2 by start, 1 by end"],answer:0,
      why:"By start you grab [1, 10], which overlaps both others. By end you take [2, 3] then [4, 5]. Picking the interval that frees up first is what keeps the most options open."},
    {type:"quiz",id:"q-remove",q:"You want the fewest intervals to remove so the rest don't overlap. How do you get that from the activity-selection count?",
      options:["n minus the number kept","The number kept","n divided by the number kept","Run the algorithm on the reversed list"],answer:0,
      why:"Keeping the maximum set of compatible intervals means the fewest are left over. The leftovers are exactly the ones you remove."},
    {type:"quiz",id:"q-balloons",q:"Balloons [1, 5] and [5, 9]. How many arrows?",
      options:["1: an arrow at x = 5 hits both","2: they only touch"],answer:0,
      why:"Balloons are closed ranges and an arrow at 5 is inside both. That is the opposite of meetings, where [1, 5] and [5, 9] don't conflict. The tests are start >= lastEnd (keep) versus start > x (shared arrow)."},
    {type:"explain",id:"x-sort-end",title:"Sort by end, or by start?",
      prompt:"Merging intervals sorts by start, but \"keep the most non-overlapping intervals\" sorts by end. Explain why each sort order is the right one for its problem, and give a small input where sorting by start gives the wrong answer for the second problem.",
      rubric:"Strong answers: (1) merge needs overlapping intervals to be adjacent and each new interval to be compared with the running merged end, which sorting by start guarantees; (2) activity selection is greedy: the interval that ends earliest leaves the most room, so repeatedly taking it is safe, which needs the end ordering; (3) a counterexample such as [[1,10],[2,3],[4,5]] where start order picks one interval and end order picks two. Weak answers say 'sorting makes it easier' without saying what property each order gives."},
    {type:"code",id:"erase-overlap",title:"Non-overlapping Intervals",fn:"eraseOverlapIntervals",
      prompt:"Given an array of `intervals` `[start, end]`, return the **minimum number of intervals to remove** so the rest do not overlap. Intervals that only touch (like `[1, 2]` and `[2, 3]`) do not overlap.",
      starter:"function eraseOverlapIntervals(intervals) {\n  \n}\n",
      solution:"function eraseOverlapIntervals(intervals) {\n  const sorted = [...intervals].sort((a, b) => a[1] - b[1]);\n  let kept = 0, lastEnd = -Infinity;\n  for (const [start, end] of sorted) {\n    if (start >= lastEnd) {\n      kept++;\n      lastEnd = end;\n    }\n  }\n  return intervals.length - kept;\n}\n",
      hint:"Sort by end, keep every interval that starts at or after the last kept end, and return n minus the number kept.",
      tests:[
        ["example 1",[[[1,2],[2,3],[3,4],[1,3]]],1],
        ["example 2, all the same",[[[1,2],[1,2],[1,2]]],2],
        ["touching only",[[[1,2],[2,3]]],0],
        ["empty",[[]],0],
        ["one long blocker",[[[1,10],[2,3],[4,5]]],1],
        ["nested",[[[1,100],[11,22],[1,11],[2,12]]],2],
      ]},
    {type:"code",id:"min-arrows",title:"Minimum arrows to burst balloons",fn:"findMinArrowShots",
      prompt:"Each balloon is a horizontal span `[xstart, xend]`. An arrow shot straight up at `x` bursts every balloon with `xstart <= x <= xend`. Return the **minimum number of arrows** needed to burst them all. Balloons that touch at one point can share an arrow.",
      starter:"function findMinArrowShots(points) {\n  \n}\n",
      solution:"function findMinArrowShots(points) {\n  const sorted = [...points].sort((a, b) => a[1] - b[1]);\n  let arrows = 0, x = -Infinity;\n  for (const [start, end] of sorted) {\n    if (start > x) {\n      arrows++;\n      x = end;\n    }\n  }\n  return arrows;\n}\n",
      hint:"Sort by end. Shoot at the end of the first balloon and skip every balloon that starts at or before that x. A balloon that starts after x needs a new arrow, shot at its own end.",
      tests:[
        ["example 1",[[[10,16],[2,8],[1,6],[7,12]]],2],
        ["all apart",[[[1,2],[3,4],[5,6],[7,8]]],4],
        ["chain of touching",[[[1,2],[2,3],[3,4],[4,5]]],2],
        ["empty",[[]],0],
        ["nested",[[[1,5],[2,3]]],1],
        ["all the same",[[[3,3],[3,3]]],1],
      ]},
  ],
  leetcode:["non-overlapping-intervals","minimum-number-of-arrows-to-burst-balloons"],
},

// ───────────────────────────────────────────── 6
{
  id:"sweep",
  title:"The sweep line",
  goal:"Count how many intervals are active at once with events, and use a difference array when the coordinates are small.",
  mins:25,
  blocks:[
    {md:`Some questions are about **how many intervals are active at the same moment**: how many rooms do these meetings need, will the car ever exceed its capacity, what is the busiest second. Merging throws that count away. The **sweep line** keeps it.

Turn each interval \`[s, e]\` into two **events**: \`+1\` at \`s\` and \`-1\` at \`e\`. Sort the events by time and walk through them with a running total. The total is how many intervals are active right now, and the answer is the **maximum** it reaches.

Tie rule: if a meeting ends at 6 and another starts at 6 they can share a room, so at equal times process **ends before starts** (\`-1\` before \`+1\`). The sort on \`[time, delta]\` does that for free, since -1 < 1.`},
    {viz:"intervals",mode:"sweep",title:"Sweep: how many are active at once?",intervals:[[1,6],[2,4],[3,8],[6,9],[7,10]]},
    {md:`## Two sorted arrays, no event objects

You don't need to build events. Sort the starts and the ends separately and walk the starts. Before counting a new start, retire every meeting whose end is at or before it:`},
    {tpl:`function maxOverlap(intervals) {
  const starts = intervals.map(iv => iv[0]).sort((a, b) => a - b);
  const ends = intervals.map(iv => iv[1]).sort((a, b) => a - b);
  let active = 0, best = 0, j = 0;
  for (const s of starts) {
    while (ends[j] <= s) { active--; j++; }   // meetings that finished by now
    active++;
    best = Math.max(best, active);
  }
  return best;
}`,title:"Sweep with sorted starts and ends"},
    {md:`This is Meeting Rooms II without the heap from the Heaps track. Both are O(n log n); the sweep is shorter and has no data structure to write.

## When the coordinates are small: a difference array

If times are integers in a small range (stops on a route, seconds in a day) skip the sort. Put the changes in an array, \`diff[s] += n\` and \`diff[e] -= n\`, then take a running sum:`},
    {tpl:`const diff = new Array(maxTime + 2).fill(0);
for (const [n, from, to] of trips) { diff[from] += n; diff[to] -= n; }
let onboard = 0;
for (const d of diff) {
  onboard += d;
  if (onboard > capacity) return false;
}
return true;`,title:"Difference array (Car Pooling)"},
    {tip:"A difference array stores where the count changes, and the running sum recovers the count at each point. Prefix sums go the other way: they turn a range sum into a subtraction."},
  ],
  parts:[
    {type:"quiz",id:"q-sweep-tie",q:"Meetings [1, 5] and [5, 9]. At time 5 there is an end event and a start event. Which do you process first, if one room can serve both?",
      options:["The end (-1), so the count drops before it rises","The start (+1), so you can see the overlap","Either, the answer is the same","Skip both"],answer:0,
      why:"Ending first keeps the count at 1. Starting first would briefly count 2 and report two rooms for meetings that never actually overlap. Sorting events by [time, delta] puts -1 ahead of +1."},
    {type:"quiz",id:"q-sweep-meaning",q:"In the sweep, what does the running total represent, and what is the answer?",
      options:["How many intervals are active right now, and the answer is the maximum it reaches","The total length covered, and the answer is its final value","The number of merged groups, and the answer is its final value","The number of overlaps so far, and the answer is its final value"],answer:0,
      why:"+1 when an interval opens and -1 when it closes, so the sum is the number of open intervals. Rooms needed is the peak of that count."},
    {type:"quiz",id:"q-diff-when",q:"When is a difference array a better fit than sorting events?",
      options:["When coordinates are small integers, so an array indexed by time is cheap, and it gives O(n + range)","When intervals have decimal endpoints","When there are only a few intervals but they are huge","Never, sorting is always faster"],answer:0,
      why:"With stops numbered 0 to 1000 you can index straight into an array. If coordinates are huge or fractional, the array would be enormous and sorted events are the right tool."},
    {type:"code",id:"rooms-sweep",title:"Meeting Rooms II, with a sweep",fn:"minMeetingRooms",
      prompt:"Given meeting intervals `[start, end]`, return the minimum number of rooms needed. A meeting ending at `t` frees its room for one starting at `t`.\n\nSolve it with a sweep over sorted starts and ends, not with a heap.",
      starter:"function minMeetingRooms(intervals) {\n  \n}\n",
      solution:"function minMeetingRooms(intervals) {\n  const starts = intervals.map(iv => iv[0]).sort((a, b) => a - b);\n  const ends = intervals.map(iv => iv[1]).sort((a, b) => a - b);\n  let active = 0, best = 0, j = 0;\n  for (const s of starts) {\n    while (ends[j] <= s) {\n      active--;\n      j++;\n    }\n    active++;\n    best = Math.max(best, active);\n  }\n  return best;\n}\n",
      hint:"Sort the starts and the ends separately. For each start, first retire every end that is <= it, then add this meeting and track the maximum.",
      tests:[
        ["example",[[[0,30],[5,10],[15,20]]],2],
        ["no overlap",[[[7,10],[2,4]]],1],
        ["no meetings",[[]],0],
        ["all overlap",[[[1,5],[2,6],[3,7],[4,8]]],4],
        ["touching ends reuse a room",[[[1,5],[5,9]]],1],
        ["rooms free up and refill",[[[1,6],[2,4],[3,8],[6,9],[7,10]]],3],
      ]},
    {type:"code",id:"car-pooling",title:"Car Pooling",fn:"carPooling",
      prompt:"A car has `capacity` empty seats and only drives east. `trips[i] = [passengers, from, to]` picks up that many passengers at `from` and drops them at `to`. Return `true` if all trips can be completed without ever exceeding capacity. Passengers leave at `to` before new ones board there.",
      starter:"function carPooling(trips, capacity) {\n  \n}\n",
      solution:"function carPooling(trips, capacity) {\n  let maxTime = 0;\n  for (const t of trips) maxTime = Math.max(maxTime, t[2]);\n  const diff = new Array(maxTime + 2).fill(0);\n  for (const [n, from, to] of trips) {\n    diff[from] += n;\n    diff[to] -= n;\n  }\n  let onboard = 0;\n  for (const d of diff) {\n    onboard += d;\n    if (onboard > capacity) return false;\n  }\n  return true;\n}\n",
      hint:"Add `passengers` at `from` and subtract them at `to` in a difference array, then take a running sum and compare it with capacity at every point.",
      tests:[
        ["too many",[[[2,1,5],[3,3,7]],4],false],
        ["just enough",[[[2,1,5],[3,3,7]],5],true],
        ["drop before pickup",[[[2,1,5],[3,5,7]],3],true],
        ["exactly full",[[[3,2,7],[3,7,9],[8,3,9]],11],true],
        ["no trips",[[],1],true],
        ["one trip over capacity",[[[9,0,1]],8],false],
      ]},
  ],
  leetcode:["meeting-rooms-ii","car-pooling"],
},

// ───────────────────────────────────────────── 7
{
  id:"choose",
  title:"Recognizing which technique",
  goal:"Read an interval problem and pick the technique from its wording, then run an edge-case checklist.",
  mins:20,
  blocks:[
    {md:`You now have five tools. Most of the work in an interview is picking one, and the wording of the question gives it away.

| The question sounds like… | Technique |
| --- | --- |
| Do any overlap? Can one person attend all? | Sort by start, compare neighbors |
| Combine overlapping ranges; total covered; list the gaps | Sort by start, **merge** |
| Add one interval to an already-sorted list | Three runs, O(n) |
| Where do two schedules overlap? Find a shared slot | **Two pointers** over two sorted lists |
| Keep the most; remove the fewest; fewest arrows | Sort by **end**, greedy |
| How many at once? Minimum rooms; capacity; busiest moment | **Sweep line** (events) or a heap of end times |

## Edge cases to run through before you submit

- empty list and a single interval
- identical intervals and nested intervals
- touching ends: does the problem count them as overlap?
- unsorted input: do you sort, or may you assume it's sorted?
- zero-length intervals (\`[3, 3]\`)
- are you allowed to change the input, or should you copy before sorting?

## Combinations

Harder problems chain two tools. **Employee Free Time** merges everyone's busy intervals, then reads off the gaps between them. **Divide Intervals Into Minimum Number of Groups** is Meeting Rooms II in disguise: the answer is the maximum overlap. Spotting that a problem you've never seen is one you've solved is the point of this track.`},
    {tip:"If you're stuck, draw five intervals on a number line, then sort them by start and see what you need to remember as you walk across. That is usually one number (the last end), and the problem becomes merge or greedy. If what you need is a count, it's a sweep."},
  ],
  parts:[
    {type:"quiz",id:"q-pick-rooms",q:"\"Given a day of meetings, what is the minimum number of conference rooms needed?\" Which technique?",
      options:["Sweep line (or a heap of end times): it is the maximum number active at once","Merge intervals: count the merged groups","Sort by end and keep the most","Two pointers over two lists"],answer:0,
      why:"Merging would combine [1, 3] and [2, 4] into one group even though they need two rooms. Rooms is a count of simultaneous meetings, which is the peak of the sweep."},
    {type:"quiz",id:"q-pick-free",q:"\"Given a worker's busy intervals, list their free time between 9 and 18.\" Which technique?",
      options:["Sort by start and merge (or walk with a cursor), then read the gaps","Sweep line","Sort by end and keep the most","Binary search"],answer:0,
      why:"Free time is what's left once the busy time is combined, so you need the union of the busy intervals first. A cursor that tracks the furthest end seen so far finds each gap as you walk the sorted list."},
    {type:"quiz",id:"q-pick-remove",q:"\"Remove the fewest intervals so the rest don't overlap.\" Which technique?",
      options:["Sort by end, keep what fits, answer = n − kept","Sort by start and merge","Sweep line","Insert interval"],answer:0,
      why:"It is activity selection: maximize the number you keep, and the rest are what you remove."},
    {type:"explain",id:"x-calendar",title:"A booking calendar",
      prompt:"A calendar service receives booking requests one at a time. Each is a half-open interval [start, end), and the service must reject any request that overlaps an existing booking. Describe a data structure and the check you would run for each request, and give the cost compared with scanning every booking.",
      rubric:"Strong answers: (1) the overlap test with half-open ends, new.start < existing.end && existing.start < new.end; (2) keep bookings sorted by start (sorted array with binary search, or a balanced BST / ordered set) so that only the booking just before and the one just after the new start need checking, because bookings don't overlap each other; (3) O(log n) to find the neighbors (plus the insert cost: O(log n) in a tree, O(n) shifting in an array) versus O(n) to scan every booking. Weak answers only describe the O(n) scan, or compare the new booking with every pair."},
    {type:"code",id:"free-slots",title:"Free slots in a day",fn:"freeSlots",
      prompt:"`busy` is a list of `[start, end]` busy intervals in any order, possibly overlapping and possibly sticking out of the day. Return the free gaps within `[dayStart, dayEnd]` as sorted `[start, end]` intervals. Don't return empty gaps (where start equals end).",
      starter:"function freeSlots(busy, dayStart, dayEnd) {\n  \n}\n",
      solution:"function freeSlots(busy, dayStart, dayEnd) {\n  const sorted = [...busy].sort((a, b) => a[0] - b[0]);\n  const out = [];\n  let cursor = dayStart;\n  for (const [start, end] of sorted) {\n    const gapEnd = Math.min(start, dayEnd);\n    if (cursor < gapEnd) out.push([cursor, gapEnd]);\n    cursor = Math.max(cursor, end);\n  }\n  if (cursor < dayEnd) out.push([cursor, dayEnd]);\n  return out;\n}\n",
      hint:"Sort by start and keep a cursor: the furthest point known to be busy so far, beginning at dayStart. Before each busy interval, the gap from the cursor to its start (capped at dayEnd) is free. Then move the cursor to the larger of itself and the end. Close with one last gap to dayEnd.",
      tests:[
        ["example",[[[10,12],[11,14],[16,17]],9,18],[[9,10],[14,16],[17,18]]],
        ["no busy time",[[],9,18],[[9,18]]],
        ["busy all day",[[[9,18]],9,18],[]],
        ["starts before the day",[[[7,10]],9,18],[[10,18]]],
        ["touching",[[[9,10],[10,11]],9,12],[[11,12]]],
        ["entirely after the day",[[[20,22]],9,18],[[9,18]]],
        ["unsorted and nested",[[[13,14],[9,17],[10,11]],8,18],[[8,9],[17,18]]],
      ]},
  ],
  leetcode:["employee-free-time","divide-intervals-into-minimum-number-of-groups","my-calendar-i"],
},

  ],
});
