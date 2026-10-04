// Follow-up: maintenance mode. Runs with: test, assert, eq, throws, require
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

test("follow-up: a car out of service is never given a call", () => {
  const b = make();
  b.setOutOfService(0);
  eq(b.call(3, "up"), 1);
  eq(b.status().map(s => s.inService), [false, true]);
});

test("follow-up: its hall calls go to another car", () => {
  const b = make();
  eq(b.call(6, "up"), 0);
  b.step(); // car 0 heads up
  b.setOutOfService(0);
  eq(run(b, 20), ["1@6"], "car 1 serves it without anyone pressing again");
  eq(b.status()[0].floor, 1, "car 0 stays where it was taken out");
});

test("follow-up: it drops its in-car stops and does not move", () => {
  const b = make();
  b.press(0, 5);
  run(b, 2);
  b.setOutOfService(0);
  eq(run(b, 10), []);
  eq([b.status()[0].floor, b.status()[0].dir], [2, "idle"]);
});

test("follow-up: setInService makes it usable again", () => {
  const b = make();
  b.setOutOfService(0);
  b.setInService(0);
  eq(b.status()[0].inService, true);
  eq(b.call(2, "up"), 0);
});
