// Runs with: test, assert, eq, throws, require
const make = () => new (require("./store").KVStore)();

// Hidden edge cases: run together with the visible tests when the candidate finishes.

test("falsy values are real values", () => {
  const s = make();
  for (const [k, v] of [["zero", 0], ["empty", ""], ["no", false], ["nil", null]]) {
    s.set(k, v);
    eq(s.get(k), v, k);
    eq(s.has(k), true, k);
  }
  eq(s.size, 4);
  eq(s.count(null), 1);
});

test("null set in a transaction shadows the outer value", () => {
  const s = make();
  s.set("a", 1);
  s.begin();
  s.set("a", null);
  eq(s.get("a"), null);
  eq(s.has("a"), true);
  eq(s.count(1), 0);
  s.rollback();
  eq(s.get("a"), 1);
});

test("a deleted key leaves keys and size", () => {
  const s = make();
  s.set("a", 1);
  s.set("b", 2);
  s.begin();
  s.delete("a");
  eq(s.keys(), ["b"]);
  eq(s.size, 1);
  eq(s.count(1), 0);
  s.rollback();
  eq(s.keys(), ["a", "b"]);
  eq(s.size, 2);
});

test("delete reports whether the key existed in the current view", () => {
  const s = make();
  s.begin();
  eq(s.delete("ghost"), false);
  s.set("a", 1);
  eq(s.delete("a"), true);
  eq(s.delete("a"), false, "already deleted in this transaction");
  s.commit();
  eq(s.has("a"), false);
  eq(s.size, 0);
});

test("set after delete in the same transaction", () => {
  const s = make();
  s.set("a", 1);
  s.begin();
  s.delete("a");
  s.set("a", 5);
  eq(s.get("a"), 5);
  s.commit();
  eq(s.get("a"), 5);
});

test("a delete committed into an outer transaction stays deleted", () => {
  const s = make();
  s.set("a", 1);
  s.begin();
  s.begin();
  s.delete("a");
  s.commit();
  eq(s.get("a"), undefined, "the outer transaction now holds the delete");
  eq(s.keys(), []);
  s.commit();
  eq(s.get("a"), undefined, "and committed data does too");
  eq(s.size, 0);
});

test("rolling back the outer transaction undoes an inner delete it absorbed", () => {
  const s = make();
  s.set("a", 1);
  s.begin();
  s.begin();
  s.delete("a");
  s.commit();
  s.rollback();
  eq(s.get("a"), 1);
});

test("count is right after a rollback", () => {
  const s = make();
  s.set("a", "x");
  s.begin();
  s.set("b", "x");
  s.set("a", "y");
  eq(s.count("x"), 1);
  s.rollback();
  eq(s.count("x"), 1, "a holds x again and b is gone");
  eq(s.count("y"), 0);
});

test("count uses strict equality", () => {
  const s = make();
  s.set("a", 1);
  s.set("b", "1");
  eq(s.count(1), 1);
  eq(s.count("1"), 1);
});

test("deep nesting commits step by step", () => {
  const s = make();
  for (let i = 1; i <= 5; i++) {
    s.begin();
    s.set("k" + i, i);
  }
  eq(s.depth, 5);
  s.commit();
  s.commit();
  eq(s.depth, 3);
  eq(s.keys("k"), ["k1", "k2", "k3", "k4", "k5"]);
  s.rollback();
  eq(s.keys("k"), ["k1", "k2"]);
  s.commit();
  s.commit();
  eq(s.depth, 0);
  eq(s.keys("k"), ["k1", "k2"]);
});

test("an unbalanced rollback leaves committed data alone", () => {
  const s = make();
  s.set("a", 1);
  throws(() => s.rollback(), Error);
  eq(s.get("a"), 1);
  eq(s.depth, 0);
});
