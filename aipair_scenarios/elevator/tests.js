// Runs with: test, assert, eq, throws, require
const make = (floors = 10, cars = 1) => require("./building").createBuilding({ floors, cars });
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

// Hidden edge cases: run together with the visible tests when the candidate finishes.

test("rejects a missing or non-integer building size", () => {
  const { createBuilding } = require("./building");
  throws(() => createBuilding({ floors: 10 }), RangeError, "no cars");
  throws(() => createBuilding({ floors: "10", cars: 1 }), RangeError, "floors as a string");
  throws(() => createBuilding({ floors: 10, cars: 1.5 }), RangeError, "1.5 cars");
});

test("status objects are copies", () => {
  const b = make();
  const s = b.status();
  s[0].floor = 7;
  s[0].doors = "open";
  s.pop();
  eq(pick(b.status()[0], "floor", "doors"), [0, "closed"]);
  eq(b.status().length, 1);
});

test("a car going up does not stop for a down call on the way", () => {
  const b = make();
  b.press(0, 8);
  b.call(4, "down");
  eq(run(b, 30), ["0@8", "0@4"]);
});

test("serves a hall call in the opposite direction when nothing is left ahead", () => {
  const b = make();
  eq(b.call(6, "down"), 0);
  eq(run(b, 8), ["0@6"]);
  eq(b.status()[0].dir, "idle");
});

test("stops once for an in-car stop and a hall call on the same floor", () => {
  const b = make();
  b.press(0, 5);
  b.call(5, "up");
  eq(run(b, 20), ["0@5"]);
});

test("pressing the floor the car is open at adds nothing", () => {
  const b = make();
  b.press(0, 3);
  run(b, 4); // doors open at 3
  eq(b.status()[0].doors, "open");
  b.press(0, 3);
  eq(run(b, 10), [], "it does not reopen");
  eq(pick(b.status()[0], "dir", "doors"), ["idle", "closed"]);
});

test("a call at an idle car's floor opens it on the next tick", () => {
  const b = make();
  eq(b.call(0, "up"), 0);
  eq(run(b, 1), ["0@0"]);
});

test("a moving car heading toward the call beats a nearer car going the other way", () => {
  const b = make(10, 2);
  b.press(1, 6);
  run(b, 8); // car 1 idle at 6
  b.press(1, 0);
  b.press(0, 9);
  run(b, 2); // car 0 at 2 going up, car 1 at 4 going down
  eq(b.call(5, "up"), 0);
});

test("a car going the other way does not count as on the way", () => {
  const b = make(10, 2);
  b.press(0, 9);
  run(b, 3); // car 0 at 3 going up; car 1 idle at 0
  eq(b.call(5, "down"), 1, "car 0 is going up, so the idle car takes the down call");
});

test("a call behind a moving car does not count as on the way", () => {
  const b = make(10, 2);
  b.press(1, 9);
  run(b, 11); // car 1 idle at 9
  b.press(0, 8);
  run(b, 5); // car 0 at 5 going up
  eq(b.call(3, "up"), 1, "floor 3 is behind car 0");
});

test("with no car on the way, the nearest car takes the call", () => {
  const b = make(10, 2);
  b.press(0, 9);
  b.press(1, 9);
  run(b, 4); // both at 4 going up
  b.step();
  eq(b.call(2, "up"), 0, "both at 5, tie to the lowest id");
});

test("LOOK across several stops in both directions", () => {
  const b = make(12, 1);
  b.press(0, 6);
  run(b, 2); // at 2 going up
  b.press(0, 9);
  b.press(0, 1);
  b.call(4, "down");
  b.call(7, "up");
  eq(run(b, 60), ["0@6", "0@7", "0@9", "0@4", "0@1"]);
});

test("every request is eventually served and the cars go idle", () => {
  const b = make(15, 3);
  let seed = 7;
  const rnd = n => (seed = (seed * 1103515245 + 12345) % 2147483648) % n;
  for (let t = 0; t < 200; t++) {
    const f = rnd(15);
    if (t % 3 === 0) b.press(rnd(3), f);
    else if (f > 0 && f < 14) b.call(f, rnd(2) ? "up" : "down");
    b.step();
  }
  run(b, 400);
  eq(b.status().map(s => pick(s, "dir", "doors")), [["idle", "closed"], ["idle", "closed"], ["idle", "closed"]]);
});
