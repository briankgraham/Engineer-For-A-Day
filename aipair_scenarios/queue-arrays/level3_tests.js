// Hidden level 3 cases
const { shortestSubarray } = require("./arrays");

// Wraps an array so the tests can count how often your code reads its elements (and check it never writes).
function counted(arr) {
  const c = { reads: 0, writes: 0 };
  const isIndex = k => typeof k === "string" && /^\d+$/.test(k);
  const p = new Proxy(arr, {
    get(t, k, r) { if (isIndex(k)) c.reads++; return Reflect.get(t, k, r); },
    set(t, k, v, r) { c.writes++; return Reflect.set(t, k, v, r); },
    deleteProperty(t, k) { c.writes++; return Reflect.deleteProperty(t, k); },
  });
  return [p, c];
}

// Small deterministic pseudo-random generator, so every run sees the same arrays.
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function brute(nums, k) {
  let best = -1;
  for (let i = 0; i < nums.length; i++) {
    let sum = 0;
    for (let j = i; j < nums.length; j++) {
      sum += nums[j];
      if (sum >= k && (best === -1 || j - i + 1 < best)) { best = j - i + 1; break; }
    }
  }
  return best;
}

test("level 3: a big negative number in the middle resets the best start", () => {
  eq(shortestSubarray([1, 1, -10, 3, 4], 7), 2);
  eq(shortestSubarray([5, -100, 3, 3], 6), 2);
});

test("level 3: a later start with a smaller prefix beats an earlier one", () => {
  eq(shortestSubarray([3, -2, 5, 1], 6), 2);
  eq(shortestSubarray([-1, 4, -6, 4, 4], 8), 2);
});

test("level 3: all negative numbers give -1", () => {
  eq(shortestSubarray([-1, -2, -3], 1), -1);
});

test("level 3: the whole array is the only answer", () => {
  eq(shortestSubarray([1, 2, 3, 4], 10), 4);
});

test("level 3: never modifies nums", () => {
  const nums = [2, -1, 2, 5, -3];
  const [p, c] = counted(nums);
  eq(shortestSubarray(p, 5), 1);
  eq(c.writes, 0, "writes to nums");
});

test("level 3: stays O(n) when the answer is -1", () => {
  const n = 4000, nums = Array.from({ length: n }, (_, i) => (i % 2 ? 1 : -1));
  const [p, c] = counted(nums);
  eq(shortestSubarray(p, 3), -1);
  assert(c.reads <= 10 * n, "read nums " + c.reads + " times for n = " + n);
});

test("level 3: matches a brute force on random arrays with negative numbers", () => {
  const r = rng(11);
  for (let t = 0; t < 300; t++) {
    const n = 1 + Math.floor(r() * 25), k = 1 + Math.floor(r() * 30);
    const nums = Array.from({ length: n }, () => Math.floor(r() * 21) - 8);
    eq(shortestSubarray(nums, k), brute(nums, k), JSON.stringify(nums) + ", k = " + k);
  }
});
