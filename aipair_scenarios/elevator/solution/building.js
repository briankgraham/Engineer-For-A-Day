// The public API the tests use: a thin facade that validates input and delegates to the cars and the dispatcher.
const { Elevator } = require("./elevator");
const { Dispatcher } = require("./dispatcher");

function createBuilding({ floors, cars } = {}) {
  if (!Number.isInteger(floors) || floors < 2) throw new RangeError("floors must be an integer >= 2");
  if (!Number.isInteger(cars) || cars < 1) throw new RangeError("cars must be an integer >= 1");
  const elevators = Array.from({ length: cars }, (_, i) => new Elevator(i));
  const dispatcher = new Dispatcher(elevators);

  const checkFloor = f => {
    if (!Number.isInteger(f) || f < 0 || f >= floors) throw new RangeError("no floor " + f);
  };
  const car = id => {
    if (!Number.isInteger(id) || !elevators[id]) throw new RangeError("no car " + id);
    return elevators[id];
  };

  return {
    call(floor, dir) {
      checkFloor(floor);
      if (dir !== "up" && dir !== "down") throw new RangeError("dir must be up or down");
      if ((dir === "up" && floor === floors - 1) || (dir === "down" && floor === 0)) throw new RangeError("no " + dir + " button on floor " + floor);
      return dispatcher.call(floor, dir);
    },
    press(carId, floor) {
      const c = car(carId);
      checkFloor(floor);
      c.press(floor);
    },
    step() {
      elevators.forEach(c => c.step());
    },
    status() {
      return elevators.map(c => c.snapshot());
    },
    setOutOfService(carId) {
      dispatcher.retire(car(carId));
    },
    setInService(carId) {
      dispatcher.restore(car(carId));
    },
  };
}

module.exports = { createBuilding };
