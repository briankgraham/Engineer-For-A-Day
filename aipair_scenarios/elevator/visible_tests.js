// Runs with: test, assert, eq, throws, require
const make = (floors = 10, cars = 1) => require("./building").createBuilding({ floors, cars });
// Ticks n times and returns where doors opened, in order, as "car@floor".
const run = (b, n) => {
  const opened = [];
  for (let i = 0; i < n; i++) {
    const before = b.status();
    b.step();
    b.status().forEach((s, k) => { if (s.doors === "open" && before[k].doors !== "open") opened.push(s.id + "@" + s.floor); });
  }
  return opened;
};
const pick = (s, ...keys) => keys.map(k => s[k]);

// These are the tests you can see. More edge cases run when you finish.

test("rejects a bad building", () => {
  const { createBuilding } = require("./building");
  throws(() => createBuilding({ floors: 1, cars: 1 }), RangeError, "1 floor");
  throws(() => createBuilding({ floors: 5, cars: 0 }), RangeError, "0 cars");
  throws(() => createBuilding({ floors: 2.5, cars: 1 }), RangeError, "2.5 floors");
});

test("cars start idle at floor 0 with doors closed", () => {
  const b = make(10, 2);
  eq(b.status().map(s => pick(s, "id", "floor", "dir", "doors")), [[0, 0, "idle", "closed"], [1, 0, "idle", "closed"]]);
});

test("a car moves one floor per tick, opens, then closes", () => {
  const b = make();
  b.press(0, 2);
  b.step();
  eq(pick(b.status()[0], "floor", "dir", "doors"), [1, "up", "closed"]);
  b.step();
  eq(pick(b.status()[0], "floor", "doors"), [2, "closed"], "arriving is its own tick");
  b.step();
  eq(pick(b.status()[0], "floor", "dir", "doors"), [2, "idle", "open"]);
  b.step();
  eq(pick(b.status()[0], "floor", "dir", "doors"), [2, "idle", "closed"]);
});

test("finishes the sweep before turning around (LOOK)", () => {
  const b = make();
  b.press(0, 7);
  run(b, 3); // now at floor 3 going up
  b.press(0, 1); // closer, but behind
  eq(run(b, 30), ["0@7", "0@1"]);
});

test("a car going down passes an up call and comes back for it", () => {
  const b = make();
  b.press(0, 9);
  eq(run(b, 11), ["0@9"]);
  b.press(0, 0);
  eq(b.call(5, "up"), 0);
  eq(run(b, 40), ["0@0", "0@5"]);
});

test("the nearest idle car takes a hall call", () => {
  const b = make(10, 2);
  b.press(1, 8);
  run(b, 10); // car 1 now idle at 8
  eq(b.call(6, "down"), 1);
  eq(b.call(2, "up"), 0);
});

test("a hall call is not given out twice", () => {
  const b = make(10, 2);
  b.press(1, 8);
  run(b, 10); // car 0 at 0, car 1 at 8, both idle
  eq(b.call(4, "down"), 0, "tie goes to the lowest id");
  b.step(); // car 0 heads up toward 4, so it is no longer idle
  eq(b.call(4, "down"), 0, "same call again");
  eq(run(b, 20), ["0@4"]);
});

test("rejects bad buttons", () => {
  const b = make(5, 1);
  throws(() => b.call(4, "up"), RangeError, "up on the top floor");
  throws(() => b.call(0, "down"), RangeError, "down on floor 0");
  throws(() => b.call(2, "sideways"), RangeError, "bad direction");
  throws(() => b.press(1, 2), RangeError, "no car 1");
  throws(() => b.press(0, 5), RangeError, "no floor 5");
});
