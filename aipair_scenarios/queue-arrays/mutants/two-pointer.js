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
    if (!dq.isEmpty() && dq.peekFront() <= i - k) dq.popFront();
    while (!dq.isEmpty() && nums[dq.peekBack()] <= x) dq.popBack();
    dq.pushBack(i);
    if (i >= k - 1) out.push(nums[dq.peekFront()]);
  }
  return out;
}

// Level 3. With prefix sums p, a subarray (j, i] has sum p[i] - p[j]. The deque holds candidate starts j with
// increasing p[j]: a later start with a smaller or equal prefix is always at least as good, so the larger one is dropped.
function shortestSubarray(nums, k) {
  let best = Infinity, sum = 0, left = 0;
  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];
    while (sum >= k && left <= right) {
      best = Math.min(best, right - left + 1);
      sum -= nums[left++];
    }
  }
  return best === Infinity ? -1 : best;
}

module.exports = { windowMax, shortestSubarray };
