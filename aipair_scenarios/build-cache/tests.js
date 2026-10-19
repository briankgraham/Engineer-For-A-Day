// Hidden edge cases (run when the candidate finishes, on top of visible_tests.js)
const { build } = require("./build");
const { buildOrder, BuildError } = require("./graph");
const { createCache } = require("./cache");

const cli = () => ({
  "//base:strings": { srcs: "padLeft v1", deps: [] },
  "//lib:fmt": { srcs: "table", deps: ["//base:strings"] },
  "//app:cli": { srcs: "main", deps: ["//lib:fmt"] },
});
// The diamond from the incident: //lib:log and //lib:net both use //base:strings.
const server = () => ({
  "//base:strings": { srcs: "padLeft v1", deps: [] },
  "//lib:log": { srcs: "log", deps: ["//base:strings"] },
  "//lib:net": { srcs: "net", deps: ["//base:strings"] },
  "//lib:fmt": { srcs: "table", deps: ["//base:strings"] },
  "//base:time": { srcs: "now", deps: [] },
  "//app:server": { srcs: "serve", deps: ["//lib:net", "//lib:log", "//base:time"] },
});
const cycleMessage = (t, root) => {
  try { buildOrder(t, root); } catch (e) { assert(e instanceof BuildError, "expected a BuildError, got " + e); return e.message; }
  return "(no error)";
};

test("a diamond is not a cycle: a shared dependency appears once", () => {
  eq(buildOrder(server(), "//app:server"), ["//base:time", "//base:strings", "//lib:log", "//lib:net", "//app:server"]);
});

test("a deeper diamond with several shared deps builds in order", () => {
  const t = {
    "//d": { srcs: "", deps: [] },
    "//c": { srcs: "", deps: ["//d"] },
    "//b1": { srcs: "", deps: ["//c", "//d"] },
    "//b2": { srcs: "", deps: ["//c"] },
    "//a": { srcs: "", deps: ["//b2", "//b1", "//d"] },
  };
  eq(buildOrder(t, "//a"), ["//d", "//c", "//b1", "//b2", "//a"]);
});

test("a cycle below the root names only the loop", () => {
  const t = { "//root": { srcs: "", deps: ["//a"] }, "//a": { srcs: "", deps: ["//b"] }, "//b": { srcs: "", deps: ["//c"] }, "//c": { srcs: "", deps: ["//a"] } };
  eq(cycleMessage(t, "//root"), "dependency cycle: //a -> //b -> //c -> //a");
});

test("a cycle reached after a diamond is still caught", () => {
  const t = server(); t["//base:strings"].deps = ["//lib:net"];
  eq(cycleMessage(t, "//app:server"), "dependency cycle: //base:strings -> //lib:net -> //base:strings");
});

test("a self-dependency is reported as a one-step loop", () => {
  const t = cli(); t["//lib:fmt"].deps = ["//base:strings", "//lib:fmt"];
  eq(cycleMessage(t, "//app:cli"), "dependency cycle: //lib:fmt -> //lib:fmt");
});

test("the diamond builds, compiling the shared dependency once", () => {
  const r = build(server(), "//app:server", createCache());
  eq(r.built, ["//base:time", "//base:strings", "//lib:log", "//lib:net", "//app:server"]);
  eq(r.output, "//app:server{serve | //base:time{now} //lib:log{log | //base:strings{padLeft v1}} //lib:net{net | //base:strings{padLeft v1}}}");
});

test("a change two levels down rebuilds the whole chain (CL 48213)", () => {
  const cache = createCache();
  build(cli(), "//app:cli", cache);
  const t = cli(); t["//base:strings"].srcs = "padLeft v2";
  const r = build(t, "//app:cli", cache);
  eq(r.built, ["//base:strings", "//lib:fmt", "//app:cli"]);
  eq(r.hits, []);
  eq(r.output, "//app:cli{main | //lib:fmt{table | //base:strings{padLeft v2}}}");
});

test("a deep change rebuilds exactly its dependents and nothing else", () => {
  const cache = createCache();
  build(server(), "//app:server", cache);
  const t = server(); t["//base:strings"].srcs = "padLeft v2";
  const r = build(t, "//app:server", cache);
  eq(r.built, ["//base:strings", "//lib:log", "//lib:net", "//app:server"]);
  eq(r.hits, ["//base:time"]);
});

test("a change in one chain does not rebuild an unrelated target sharing the cache", () => {
  const cache = createCache();
  build(server(), "//app:server", cache);
  const t = server(); t["//base:time"].srcs = "now v2";
  eq(build(t, "//app:server", cache).built, ["//base:time", "//app:server"]);
  eq(build(t, "//lib:fmt", cache).built, ["//lib:fmt"]);
});

test("changing a dependency and changing it back reuses the original outputs", () => {
  const cache = createCache();
  const first = build(cli(), "//app:cli", cache);
  const t = cli(); t["//base:strings"].srcs = "padLeft v2";
  build(t, "//app:cli", cache);
  const back = build(cli(), "//app:cli", cache);
  eq(back.built, []);
  eq(back.output, first.output);
});

test("listing deps in a different order does not change any key", () => {
  const cache = createCache();
  build(server(), "//app:server", cache);
  const t = server(); t["//app:server"].deps = ["//base:time", "//lib:log", "//lib:net"];
  eq(build(t, "//app:server", cache).built, []);
});

test("the targets passed in are not modified", () => {
  const t = server(); const before = JSON.stringify(t);
  buildOrder(t, "//app:server");
  build(t, "//app:server", createCache());
  eq(JSON.stringify(t), before);
});
