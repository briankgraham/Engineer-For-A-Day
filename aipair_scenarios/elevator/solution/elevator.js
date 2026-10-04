// One car: where it is, which way it is sweeping, its doors, and the stops it still has to make.
class Elevator {
  constructor(id) {
    this.id = id;
    this.floor = 0;
    this.sweep = "up"; // direction of the current sweep; only reported while the car has stops
    this.doorsOpen = false;
    this.inService = true;
    this.carStops = new Set(); // floors pressed inside the car
    this.hallCalls = new Map(); // "floor:dir" -> { floor, dir }, the hall calls assigned to this car, oldest first
  }

  get dir() {
    return this.carStops.size || this.hallCalls.size ? this.sweep : "idle";
  }

  stops() {
    return [...this.carStops, ...[...this.hallCalls.values()].map(c => c.floor)];
  }

  ahead(dir) {
    return this.stops().some(f => (dir === "up" ? f > this.floor : f < this.floor));
  }

  // An idle car turns toward its first stop.
  aim(floor, dir) {
    if (this.dir !== "idle") return;
    this.sweep = floor > this.floor ? "up" : floor < this.floor ? "down" : dir || this.sweep;
  }

  press(floor) {
    if (!this.inService) return;
    if (this.doorsOpen && floor === this.floor) return; // already open here
    this.aim(floor);
    this.carStops.add(floor);
  }

  addHallCall(floor, dir) {
    // Doors already open here and the call fits the sweep: it is served now.
    if (this.doorsOpen && floor === this.floor && (dir === this.sweep || !this.ahead(this.sweep))) {
      this.sweep = dir;
      return;
    }
    this.aim(floor, dir);
    this.hallCalls.set(floor + ":" + dir, { floor, dir });
  }

  hasCall(key) {
    return this.hallCalls.has(key);
  }

  // Leaves service where it stands; hands back its hall calls so they can go to other cars.
  retire() {
    this.inService = false;
    this.carStops.clear();
    const calls = [...this.hallCalls.values()];
    this.hallCalls.clear();
    return calls;
  }

  // Clears what can be served at this floor; true if the doors should open.
  serveHere() {
    const served = this.carStops.delete(this.floor);
    const turn = !this.ahead(this.sweep);
    const here = [...this.hallCalls.values()].filter(c => c.floor === this.floor && (c.dir === this.sweep || turn));
    // Both directions waiting here: take the one going our way first.
    const take = here.some(c => c.dir === this.sweep) ? here.filter(c => c.dir === this.sweep) : here;
    take.forEach(c => {
      this.hallCalls.delete(c.floor + ":" + c.dir);
      this.sweep = c.dir;
    });
    return served || take.length > 0;
  }

  step() {
    if (this.doorsOpen) {
      this.doorsOpen = false;
      return;
    }
    if (!this.inService) return;
    if (this.serveHere()) {
      this.doorsOpen = true;
      return;
    }
    if (this.dir === "idle") return;
    if (!this.ahead(this.sweep)) this.sweep = this.sweep === "up" ? "down" : "up";
    this.floor += this.sweep === "up" ? 1 : -1;
  }

  snapshot() {
    return { id: this.id, floor: this.floor, dir: this.dir, doors: this.doorsOpen ? "open" : "closed", inService: this.inService };
  }
}

module.exports = { Elevator };
