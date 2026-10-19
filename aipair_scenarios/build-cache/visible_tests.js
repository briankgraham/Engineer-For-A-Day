// Read-only: the build tool's own tests. They all pass in CI. More cases run when you finish.
const { build } = require("./build");
const { buildOrder, BuildError } = require("./graph");
const { createCache } = require("./cache");

// //app:cli -> //lib:fmt -> //base:strings
const cli = () => ({
  "//base:strings": { srcs: "padLeft v1", deps: [] },
  "//lib:fmt": { srcs: "table", deps: ["//base:strings"] },
  "//app:cli": { srcs: "main", deps: ["//lib:fmt"] },
});

test("build order puts every dependency before the targets that use it", () => {
  eq(buildOrder(cli(), "//app:cli"), ["//base:strings", "//lib:fmt", "//app:cli"]);
});

test("deps are visited in sorted order", () => {
  const t = { "//a": { srcs: "", deps: ["//c", "//b"] }, "//b": { srcs: "", deps: [] }, "//c": { srcs: "", deps: [] } };
  eq(buildOrder(t, "//a"), ["//b", "//c", "//a"]);
});

test("an unknown target throws BuildError", () => {
  throws(() => buildOrder(cli(), "//app:nope"), BuildError);
  const t = cli(); t["//lib:fmt"].deps = ["//base:missing"];
  throws(() => buildOrder(t, "//app:cli"), BuildError);
});

test("a cycle throws BuildError naming the loop", () => {
  const t = { "//a": { srcs: "", deps: ["//b"] }, "//b": { srcs: "", deps: ["//a"] } };
  let msg = "";
  try { buildOrder(t, "//a"); } catch (e) { assert(e instanceof BuildError, "expected a BuildError"); msg = e.message; }
  eq(msg, "dependency cycle: //a -> //b -> //a");
});

test("a target that depends on itself is a cycle", () => {
  throws(() => buildOrder({ "//a": { srcs: "", deps: ["//a"] } }, "//a"), BuildError);
});

test("a clean build compiles every target in order", () => {
  const r = build(cli(), "//app:cli", createCache());
  eq(r.built, ["//base:strings", "//lib:fmt", "//app:cli"]);
  eq(r.hits, []);
  eq(r.output, "//app:cli{main | //lib:fmt{table | //base:strings{padLeft v1}}}");
});

test("a second build with nothing changed is all cache hits", () => {
  const cache = createCache();
  build(cli(), "//app:cli", cache);
  const r = build(cli(), "//app:cli", cache);
  eq(r.built, []);
  eq(r.hits, ["//base:strings", "//lib:fmt", "//app:cli"]);
});

test("changing the root's own sources rebuilds only the root", () => {
  const cache = createCache();
  build(cli(), "//app:cli", cache);
  const t = cli(); t["//app:cli"].srcs = "main v2";
  eq(build(t, "//app:cli", cache).built, ["//app:cli"]);
});

test("changing a direct dependency rebuilds it and the root", () => {
  const cache = createCache();
  build(cli(), "//app:cli", cache);
  const t = cli(); t["//lib:fmt"].srcs = "table v2";
  const r = build(t, "//app:cli", cache);
  eq(r.built, ["//lib:fmt", "//app:cli"]);
  eq(r.output, "//app:cli{main | //lib:fmt{table v2 | //base:strings{padLeft v1}}}");
});
