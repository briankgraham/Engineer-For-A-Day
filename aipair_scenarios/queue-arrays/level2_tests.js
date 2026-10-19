// Hidden level 2 cases
const { windowMax } = require("./arrays");

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
  const out = [];
  for (let i = 0; i + k <= nums.length; i++) out.push(Math.max(...nums.slice(i, i + k)));
  return out;
}

test("level 2: repeated values: an equal max that is still in the window counts", () => {
  eq(windowMax([3, 3, 1], 2), [3, 3]);
  eq(windowMax([5, 5, 5, 1, 1], 3), [5, 5, 5]);
  eq(windowMax([2, 1, 2, 1, 2], 2), [2, 2, 2, 2]);
});

test("level 2: strictly decreasing and strictly increasing arrays", () => {
  eq(windowMax([9, 7, 5, 3, 1], 2), [9, 7, 5, 3]);
  eq(windowMax([1, 3, 5, 7, 9], 3), [5, 7, 9]);
});

test("level 2: negative numbers", () => {
  eq(windowMax([-5, -2, -8, -1], 2), [-2, -2, -1]);
});

test("level 2: an empty array, k = 0 or a negative k give []", () => {
  eq(windowMax([], 1), []);
  eq(windowMax([1, 2, 3], 0), []);
  eq(windowMax([1, 2, 3], -2), []);
});

test("level 2: never modifies nums", () => {
  const nums = [4, 1, 7, 3, 8, 2];
  const [p, c] = counted(nums);
  windowMax(p, 3);
  eq(c.writes, 0, "writes to nums");
  eq(nums, [4, 1, 7, 3, 8, 2]);
});

test("level 2: stays O(n) on decreasing input, where the window keeps every element", () => {
  const n = 4000, k = 2000, nums = Array.from({ length: n }, (_, i) => n - i);
  const [p, c] = counted(nums);
  eq(windowMax(p, k).slice(0, 3), [4000, 3999, 3998]);
  assert(c.reads <= 10 * n, "read nums " + c.reads + " times for n = " + n);
});

test("level 2: matches a brute force on random arrays with many repeats", () => {
  const r = rng(7);
  for (let t = 0; t < 200; t++) {
    const n = 1 + Math.floor(r() * 30), k = 1 + Math.floor(r() * n);
    const nums = Array.from({ length: n }, () => Math.floor(r() * 5) - 2);
    eq(windowMax(nums, k), brute(nums, k), JSON.stringify(nums) + ", k = " + k);
  }
});
