// Follow-up hidden edge cases: run on Finish once the follow-up has been revealed.
const make = (floors = 10, cars = 2) => require("./building").createBuilding({ floors, cars });
const run = (b, n) => {
  const opened = [];
  for (let i = 0; i < n; i++) {
    const before = b.status();
    b.step();
    b.status().forEach((s, k) => { if (s.doors === "open" && before[k].doors !== "open") opened.push(s.id + "@" + s.floor); });
  }
  return opened;
};

test("follow-up: open doors close, then the car stays shut", () => {
  const b = make();
  b.press(0, 1);
  run(b, 2); // doors open at 1
  eq(b.status()[0].doors, "open");
  b.setOutOfService(0);
  run(b, 1);
  eq(b.status()[0].doors, "closed");
  b.press(0, 4);
  eq(run(b, 10), [], "presses are ignored while out");
});

test("follow-up: with no car in service, calls wait for one to come back", () => {
  const b = make(10, 1);
  b.setOutOfService(0);
  eq(b.call(4, "up"), null);
  eq(b.call(4, "up"), null, "the same call again");
  eq(run(b, 10), []);
  b.setInService(0);
  eq(run(b, 20), ["0@4"], "served exactly once");
});

test("follow-up: a retired car's calls wait when nobody else can take them", () => {
  const b = make(10, 1);
  b.call(3, "up");
  b.call(7, "down");
  b.setOutOfService(0);
  eq(run(b, 10), []);
  b.setInService(0);
  eq(run(b, 30), ["0@3", "0@7"]);
});

test("follow-up: reassigned calls use the dispatch rule, oldest first", () => {
  const b = make(10, 3);
  b.press(0, 5);
  b.press(2, 9);
  run(b, 11); // car 0 idle at 5, car 1 idle at 0, car 2 idle at 9
  eq(b.call(6, "up"), 0);
  eq(b.call(7, "up"), 0, "car 0 is on the way, tie with car 2 goes to the lowest id");
  b.setOutOfService(0);
  // 6 up goes first, to car 2 (nearest idle), which then heads down; so 7 up goes to car 1.
  eq(b.call(6, "up"), 2);
  eq(b.call(7, "up"), 1);
});

test("follow-up: retiring twice or restoring an in-service car changes nothing", () => {
  const b = make();
  b.call(4, "up");
  b.setInService(0);
  eq(b.call(4, "up"), 0);
  b.setOutOfService(1);
  b.setOutOfService(1);
  eq(b.status().map(s => s.inService), [true, false]);
  throws(() => b.setOutOfService(2), RangeError, "no car 2");
  throws(() => b.setInService(-1), RangeError, "no car -1");
});
