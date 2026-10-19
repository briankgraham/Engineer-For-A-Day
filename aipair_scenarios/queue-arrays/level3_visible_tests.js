// Level 3: shortestSubarray in arrays.js. More cases run when you finish.
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

test("level 3: a single element that is enough", () => {
  eq(shortestSubarray([1], 1), 1);
});

test("level 3: -1 when no subarray reaches k", () => {
  eq(shortestSubarray([1, 2], 4), -1);
});

test("level 3: negative numbers: the examples from the brief", () => {
  eq(shortestSubarray([2, -1, 2], 3), 3);
  eq(shortestSubarray([84, -37, 32, 40, 95], 167), 3);
});

test("level 3: reads each element a constant number of times (O(n))", () => {
  const n = 4000, nums = Array.from({ length: n }, (_, i) => ((i * 7919) % 201) - 100);
  const [p, c] = counted(nums);
  shortestSubarray(p, 500);
  assert(c.reads <= 10 * n, "read nums " + c.reads + " times for n = " + n + "; the limit is " + 10 * n);
});
