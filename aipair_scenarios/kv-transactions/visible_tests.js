// Runs with: test, assert, eq, throws, require
const make = () => new (require("./store").KVStore)();

// These are the tests you can see. More edge cases run when you finish.

test("set, get, has and delete", () => {
  const s = make();
  eq(s.get("a"), undefined);
  eq(s.has("a"), false);
  s.set("a", 1);
  eq(s.get("a"), 1);
  eq(s.has("a"), true);
  s.set("a", 2);
  eq(s.get("a"), 2, "set replaces");
  eq(s.delete("a"), true);
  eq(s.delete("a"), false, "already gone");
  eq(s.get("a"), undefined);
});

test("rejects bad keys and undefined values", () => {
  const s = make();
  for (const key of [1, null, undefined, {}]) throws(() => s.set(key, 1), TypeError, "key " + String(key));
  throws(() => s.set("a", undefined), TypeError, "undefined value");
  eq(s.size, 0, "nothing was stored");
});

test("rollback discards only the innermost transaction", () => {
  const s = make();
  s.set("a", 1);
  s.begin();
  s.set("a", 2);
  s.begin();
  s.set("a", 3);
  eq(s.depth, 2);
  s.rollback();
  eq(s.get("a"), 2);
  eq(s.depth, 1);
  s.rollback();
  eq(s.get("a"), 1);
  eq(s.depth, 0);
});

test("commit merges only the innermost transaction", () => {
  const s = make();
  s.begin();
  s.set("a", 1);
  s.begin();
  s.set("b", 2);
  s.commit();
  eq(s.depth, 1, "the outer transaction is still open");
  eq(s.get("b"), 2);
  s.rollback();
  eq(s.get("a"), undefined);
  eq(s.get("b"), undefined, "the inner commit went into the outer transaction, which was rolled back");
});

test("a delete inside a transaction hides the key until rollback", () => {
  const s = make();
  s.set("a", 1);
  s.begin();
  eq(s.delete("a"), true);
  eq(s.get("a"), undefined);
  eq(s.has("a"), false);
  s.rollback();
  eq(s.get("a"), 1, "rollback brings it back");
});

test("count sees uncommitted changes", () => {
  const s = make();
  s.set("a", "x");
  s.set("b", "x");
  s.set("c", "y");
  eq(s.count("x"), 2);
  s.begin();
  s.set("c", "x");
  eq(s.count("x"), 3);
  eq(s.count("y"), 0);
  eq(s.count("missing"), 0);
});

test("keys filters by prefix and sorts", () => {
  const s = make();
  for (const k of ["user:2", "user:10", "team:1", "user:1"]) s.set(k, true);
  eq(s.keys("user:"), ["user:1", "user:10", "user:2"]);
  eq(s.keys(), ["team:1", "user:1", "user:10", "user:2"]);
  eq(s.keys("nope"), []);
});

test("commit and rollback need an open transaction", () => {
  const s = make();
  for (const op of ["commit", "rollback"]) {
    let msg = "";
    try { s[op](); } catch (e) { msg = e.message; }
    assert(msg.includes("no transaction"), op + "() with no transaction should throw \"no transaction\", got " + JSON.stringify(msg));
  }
});
