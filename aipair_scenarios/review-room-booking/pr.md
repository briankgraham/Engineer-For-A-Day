# PR #214: Prevent double-booking, add cancel, sort room lists

**sam-k** wants to merge 2 commits into `main` from `sam/booking-clashes` · closes ROOM-88

## Description

Users keep double-booking the big rooms, so `book()` now rejects a booking that clashes with an existing one (returns `null`, as agreed in ROOM-88). Also:

- added `cancel(room, id)` so the UI can free a slot
- `list()` now returns bookings earliest first. I replaced the `.map` copy with the sort, since `sort()` already returns a new array, so the extra copy was redundant
- validation for an end time before the start time
- new test file `bookings.test.js` (9 tests, see the read-only test tab)

Should be a quick one, all green ✅

## Checks

- ✅ CI / unit tests: 9 passed
- ✅ lint

## Review bot

**review-bot** commented:
> LGTM 👍 The clash check covers both ends of the new booking, `cancel` uses `findIndex` + `splice` idiomatically, and the tests cover overlap, back-to-back bookings, sorting and validation. No issues found. Safe to merge.

## Files changed: bookings.js (+18 −5), bookings.test.js (new)

```diff
--- a/bookings.js
+++ b/bookings.js
@@ -5,21 +5,34 @@
   const byRoom = new Map(); // room -> [{ id, room, start, end, who }], start/end in minutes
   let nextId = 1;
 
+  // Two bookings clash if either end of the new one falls inside an existing one.
+  function clashes(list, s, e) {
+    return list.some(b => (s >= b.start && s < b.end) || (e > b.start && e <= b.end));
+  }
+
   function book(room, start, end, who) {
     const s = toMinutes(start), e = toMinutes(end);
+    if (e < s) throw new RangeError("end is before start");
     const list = byRoom.get(room) || [];
+    if (clashes(list, s, e)) return null;
     const b = { id: nextId++, room, start: s, end: e, who };
     list.push(b);
     byRoom.set(room, list);
     return b.id;
   }
 
-  // Bookings for a room, as copies.
+  // Bookings for a room, earliest first. sort() already returns a new array.
   function list(room) {
-    return (byRoom.get(room) || []).map(b => ({ ...b }));
+    return (byRoom.get(room) || []).sort((a, b) => a.start - b.start);
   }
 
-  return { book, list };
+  function cancel(room, id) {
+    const list = byRoom.get(room) || [];
+    list.splice(list.findIndex(b => b.id === id), 1);
+    return true;
+  }
+
+  return { book, list, cancel };
 }
 
 module.exports = { createBookings };
```
