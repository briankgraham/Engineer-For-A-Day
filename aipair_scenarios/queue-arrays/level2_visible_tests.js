// Level 2: windowMax in arrays.js. More cases run when you finish.
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

test("level 2: the example from the brief", () => {
  eq(windowMax([1, 3, -1, -3, 5, 3, 6, 7], 3), [3, 3, 5, 5, 6, 7]);
});

test("level 2: k = 1 gives the array back, k = length gives one max", () => {
  eq(windowMax([4, 2, 12, 3], 1), [4, 2, 12, 3]);
  eq(windowMax([4, 2, 12, 3], 4), [12]);
});

test("level 2: a window larger than the array gives []", () => {
  eq(windowMax([1, 2], 3), []);
});

test("level 2: reads each element a constant number of times (O(n), not O(n * k))", () => {
  const n = 4000, k = 2000, nums = Array.from({ length: n }, (_, i) => (i * 7919) % 1000);
  const [p, c] = counted(nums);
  const out = windowMax(p, k);
  eq(out.length, n - k + 1);
  assert(c.reads <= 10 * n, "read nums " + c.reads + " times for n = " + n + "; the limit is " + 10 * n);
});
