// The public API the tests use. Keep createBuilding and the methods on the object it returns;
// design everything behind them however you like (elevator.js and dispatcher.js are there if you want them).

function createBuilding({ floors, cars } = {}) {
  throw new Error("not implemented");
  // return {
  //   call(floor, dir) {},    // hall button: "up" or "down"; returns the id of the car that takes it
  //   press(carId, floor) {}, // button inside a car
  //   step() {},              // one tick
  //   status() {},            // [{ id, floor, dir, doors }]
  // };
}

module.exports = { createBuilding };
