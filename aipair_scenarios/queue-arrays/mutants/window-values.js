// Array problems for the later levels. Their requirements appear when a level unlocks.
// You can use the Deque from deque.js: const { Deque } = require("./deque");
const { Deque } = require("./deque");

// Level 2. The deque holds indices whose values are strictly decreasing from front to back:
// the front is the max of the window, and anything smaller than a newer value can never be a max again.
function windowMax(nums, k) {
  const n = nums.length, out = [];
  if (!Number.isInteger(k) || k < 1 || k > n) return out;
  const dq = new Deque();
  for (let i = 0; i < n; i++) {
    const x = nums[i];
    if (i >= k && !dq.isEmpty() && dq.peekFront() === nums[i - k]) dq.popFront();
    while (!dq.isEmpty() && dq.peekBack() <= x) dq.popBack();
    dq.pushBack(x);
    if (i >= k - 1) out.push(dq.peekFront());
  }
  return out;
}

// Level 3. With prefix sums p, a subarray (j, i] has sum p[i] - p[j]. The deque holds candidate starts j with
// increasing p[j]: a later start with a smaller or equal prefix is always at least as good, so the larger one is dropped.
function shortestSubarray(nums, k) {
  const n = nums.length;
  const p = new Array(n + 1);
  p[0] = 0;
  for (let i = 0; i < n; i++) p[i + 1] = p[i] + nums[i];
  let best = Infinity;
  const dq = new Deque();
  for (let i = 0; i <= n; i++) {
    while (!dq.isEmpty() && p[i] - p[dq.peekFront()] >= k) best = Math.min(best, i - dq.popFront());
    while (!dq.isEmpty() && p[dq.peekBack()] >= p[i]) dq.popBack();
    dq.pushBack(i);
  }
  return best === Infinity ? -1 : best;
}

module.exports = { windowMax, shortestSubarray };
