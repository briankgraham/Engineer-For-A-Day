const { toMinutes } = require("./time");

// An in-memory booking book for meeting rooms. Times are "HH:MM" strings on a single day.
function createBookings() {
  const byRoom = new Map(); // room -> [{ id, room, start, end, who }], start/end in minutes
  let nextId = 1;

  // Half-open intervals [start, end) clash when they share a minute; back-to-back is fine.
  function clashes(list, s, e) {
    return list.some(b => s < b.end && b.start < e);
  }

  function book(room, start, end, who) {
    const s = toMinutes(start), e = toMinutes(end);
    if (e <= s) throw new RangeError("end must be after start");
    const list = byRoom.get(room) || [];
    if (clashes(list, s, e)) return null;
    const b = { id: nextId++, room, start: s, end: e, who };
    list.push(b);
    byRoom.set(room, list);
    return b.id;
  }

  // Bookings for a room, earliest first, as copies.
  function list(room) {
    return [...(byRoom.get(room) || [])].sort((a, b) => a.start - b.start).map(b => ({ ...b }));
  }

  function cancel(room, id) {
    const list = byRoom.get(room) || [];
    const i = list.findIndex(b => b.id === id);
    if (i === -1) return false;
    list.splice(i, 1);
    return true;
  }

  return { book, list, cancel };
}

module.exports = { createBookings };
