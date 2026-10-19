// Level 1: the Deque in deque.js. Some of these fail today; find out why. More cases run when you finish.
const { Deque } = require("./deque");

test("level 1: pushBack then popFront is first in, first out", () => {
  const q = new Deque();
  q.pushBack("a"); q.pushBack("b"); q.pushBack("c");
  eq([q.popFront(), q.popFront(), q.popFront()], ["a", "b", "c"]);
  eq(q.size, 0);
});

test("level 1: pushFront then popFront is last in, first out", () => {
  const q = new Deque();
  q.pushFront(1); q.pushFront(2); q.pushFront(3);
  eq(q.toArray(), [3, 2, 1]);
  eq(q.popFront(), 3);
});

test("level 1: grows past its capacity and keeps the order", () => {
  const q = new Deque(4);
  for (let i = 1; i <= 10; i++) q.pushBack(i);
  eq(q.size, 10);
  eq(q.toArray(), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("level 1: peeks and pops on an empty deque return undefined", () => {
  const q = new Deque();
  eq(q.peekFront(), undefined);
  eq(q.peekBack(), undefined);
  eq(q.popBack(), undefined);
  eq(q.isEmpty(), true);
});

test("level 1: keeps first-in-first-out order when it grows after wrapping around", () => {
  // Like the job queue: workers take jobs off the front while new ones arrive at the back.
  const q = new Deque(4);
  q.pushBack("j1"); q.pushBack("j2"); q.pushBack("j3");
  eq(q.popFront(), "j1");
  eq(q.popFront(), "j2");
  for (const j of ["j4", "j5", "j6", "j7", "j8"]) q.pushBack(j);
  eq(q.toArray(), ["j3", "j4", "j5", "j6", "j7", "j8"]);
});

test("level 1: popBack and peekBack work after wrapping around", () => {
  const q = new Deque(4);
  q.pushBack(1); q.pushBack(2); q.pushBack(3);
  q.popFront(); q.popFront();
  q.pushBack(4); q.pushBack(5); // 5 wraps around to the start of the buffer
  eq(q.peekBack(), 5);
  eq(q.popBack(), 5);
  eq(q.popBack(), 4);
  eq(q.toArray(), [3]);
});

test("level 1: polling an empty deque does not break it", () => {
  const q = new Deque();
  eq(q.popFront(), undefined);
  eq(q.size, 0);
  q.pushBack("next job");
  eq(q.size, 1);
  eq(q.popFront(), "next job");
});
