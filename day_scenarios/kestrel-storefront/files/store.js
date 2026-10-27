// The page's state lives in one store. State is replaced, never mutated: update(fn) gets the current state and returns the
// next one. Subscribers run only when fn returned a different object, so modules should keep the parts they did not touch
// (store.update(s => ({ ...s, search: ... })) keeps s.cart as the same object).
function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    getState: () => state,
    update(fn) {
      const next = fn(state);
      if (next === state) return;
      state = next;
      for (const s of [...subs]) s(state);
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

// search: query is what is in the box now; status is idle | loading | ready | error; items are the results on screen and
//   resultsFor is the query they answer.
// cart: order is the sku order the server sent; items maps sku -> { sku, title, unitPrice (cents), qty (what the shopper
//   sees), confirmed (what the server last confirmed), pending, error }. announcement is the text for the screen-reader live region.
function initialState() {
  return {
    search: { query: "", status: "idle", items: [], resultsFor: "", error: null },
    cart: { order: [], items: {}, announcement: "" },
  };
}

// Errors the UI maps to messages carry a machine-readable code.
function codeError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

module.exports = { createStore, initialState, codeError };
