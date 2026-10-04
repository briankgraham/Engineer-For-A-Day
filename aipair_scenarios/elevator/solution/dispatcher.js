// Decides which car takes each hall call, and which cars may take calls at all.
class Dispatcher {
  constructor(cars) {
    this.cars = cars;
    this.waiting = new Map(); // calls made while no car was in service, oldest first
  }

  // The car for a hall call: the nearest car that is idle or already heading toward it in the call's direction,
  // else the nearest in-service car. Ties go to the lowest id. null when no car is in service.
  pick(floor, dir) {
    const live = this.cars.filter(c => c.inService);
    const dist = c => Math.abs(c.floor - floor);
    const nearest = list => list.reduce((best, c) => (!best || dist(c) < dist(best) ? c : best), null);
    const onTheWay = c => c.dir === "idle" || (c.dir === dir && (dir === "up" ? floor >= c.floor : floor <= c.floor));
    return nearest(live.filter(onTheWay)) || nearest(live);
  }

  // Returns the id of the car that has the call, or null if it has to wait for a car.
  call(floor, dir) {
    const key = floor + ":" + dir;
    const owner = this.cars.find(c => c.hasCall(key));
    if (owner) return owner.id;
    if (this.waiting.has(key)) return null;
    const car = this.pick(floor, dir);
    if (!car) {
      this.waiting.set(key, { floor, dir });
      return null;
    }
    car.addHallCall(floor, dir);
    return car.id;
  }

  retire(car) {
    if (!car.inService) return;
    car.retire().forEach(c => this.call(c.floor, c.dir));
  }

  restore(car) {
    if (car.inService) return;
    car.inService = true;
    const waiting = [...this.waiting.values()];
    this.waiting.clear();
    waiting.forEach(c => this.call(c.floor, c.dir));
  }
}

module.exports = { Dispatcher };
