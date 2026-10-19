// Hidden level 1 cases (run when the candidate finishes)
const { Deque } = require("./deque");

// Small deterministic pseudo-random generator, so every run sees the same operations.
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

test("level 1: pushBack and pushFront return the new size", () => {
  const q = new Deque(2);
  eq(q.pushBack("a"), 1);
  eq(q.pushFront("b"), 2);
  eq(q.pushBack("c"), 3);
});

test("level 1: popBack on a deque filled exactly to capacity", () => {
  const q = new Deque(4);
  for (let i = 1; i <= 4; i++) q.pushBack(i);
  eq(q.peekBack(), 4);
  eq(q.popBack(), 4);
  eq(q.popBack(), 3);
  eq(q.toArray(), [1, 2]);
});

test("level 1: at() is undefined past the last item, even when the buffer is full", () => {
  const q = new Deque(4);
  for (let i = 1; i <= 4; i++) q.pushBack(i);
  eq(q.at(0), 1);
  eq(q.at(3), 4);
  eq(q.at(4), undefined);
  eq(q.at(-1), undefined);
});

test("level 1: growing with items pushed at the front keeps the order", () => {
  const q = new Deque(4);
  q.pushBack(3); q.pushFront(2); q.pushFront(1); q.pushBack(4);
  q.pushFront(0); q.pushBack(5);
  eq(q.toArray(), [0, 1, 2, 3, 4, 5]);
  eq(q.peekFront(), 0);
  eq(q.peekBack(), 5);
});

test("level 1: popping from both ends of an empty deque many times leaves it usable", () => {
  const q = new Deque(2);
  for (let i = 0; i < 5; i++) { q.popFront(); q.popBack(); }
  eq(q.size, 0);
  q.pushBack(1); q.pushFront(0); q.pushBack(2);
  eq(q.toArray(), [0, 1, 2]);
  eq(q.size, 3);
});

test("level 1: matches a plain array over thousands of random operations", () => {
  const r = rng(42), q = new Deque(1), model = [];
  for (let step = 0; step < 4000; step++) {
    // Slightly more pushes than pops, so the deque grows, shrinks and wraps around many times.
    const x = r(), op = x < 0.25 ? 0 : x < 0.45 ? 1 : x < 0.63 ? 2 : x < 0.8 ? 3 : x < 0.9 ? 4 : 5, v = step;
    if (op === 0) eq(q.pushBack(v), model.push(v), "pushBack at step " + step);
    else if (op === 1) { model.unshift(v); eq(q.pushFront(v), model.length, "pushFront at step " + step); }
    else if (op === 2) eq(q.popFront(), model.shift(), "popFront at step " + step);
    else if (op === 3) eq(q.popBack(), model.pop(), "popBack at step " + step);
    else if (op === 4) { eq(q.peekFront(), model[0], "peekFront at step " + step); eq(q.peekBack(), model[model.length - 1], "peekBack at step " + step); }
    else { const i = Math.floor(r() * (model.length + 2)) - 1; eq(q.at(i), model[i], "at(" + i + ") at step " + step); }
    eq(q.size, model.length, "size at step " + step);
  }
  eq(q.toArray(), model);
});
