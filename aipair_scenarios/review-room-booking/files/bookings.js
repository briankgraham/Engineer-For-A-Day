const { toMinutes } = require("./time");

// An in-memory booking book for meeting rooms. Times are "HH:MM" strings on a single day.
function createBookings() {
  const byRoom = new Map(); // room -> [{ id, room, start, end, who }], start/end in minutes
  let nextId = 1;

  // Two bookings clash if either end of the new one falls inside an existing one.
  function clashes(list, s, e) {
    return list.some(b => (s >= b.start && s < b.end) || (e > b.start && e <= b.end));
  }

  function book(room, start, end, who) {
    const s = toMinutes(start), e = toMinutes(end);
    if (e < s) throw new RangeError("end is before start");
    const list = byRoom.get(room) || [];
    if (clashes(list, s, e)) return null;
    const b = { id: nextId++, room, start: s, end: e, who };
    list.push(b);
    byRoom.set(room, list);
    return b.id;
  }

  // Bookings for a room, earliest first. sort() already returns a new array.
  function list(room) {
    return (byRoom.get(room) || []).sort((a, b) => a.start - b.start);
  }

  function cancel(room, id) {
    const list = byRoom.get(room) || [];
    list.splice(list.findIndex(b => b.id === id), 1);
    return true;
  }

  return { book, list, cancel };
}

module.exports = { createBookings };
