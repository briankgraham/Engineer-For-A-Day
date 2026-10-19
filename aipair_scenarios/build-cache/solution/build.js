const { checksum } = require("./hash");
const { buildOrder } = require("./graph");

// The fake compiler: a target's output is its own sources plus the outputs of its deps.
function compile(name, target, depOutputs) {
  return name + "{" + target.srcs + (depOutputs.length ? " | " + depOutputs.join(" ") : "") + "}";
}

// Builds `root` and everything it needs. Returns the root's output, the targets compiled
// this time and the ones served from the cache (both in build order).
function build(targets, root, cache) {
  const outputs = new Map(), keys = new Map();
  const built = [], hits = [];
  for (const name of buildOrder(targets, root)) {
    const t = targets[name];
    const deps = [...t.deps].sort();
    // The key covers our own sources and our deps' keys, which cover theirs, so a change
    // anywhere below us (not just in a direct dep) rebuilds us.
    const key = checksum(name, t.srcs, ...deps.map(d => keys.get(d)));
    let out = cache.get(key);
    if (out === undefined) {
      out = compile(name, t, deps.map(d => outputs.get(d)));
      cache.put(key, out);
      built.push(name);
    } else {
      hits.push(name);
    }
    keys.set(name, key);
    outputs.set(name, out);
  }
  return { output: outputs.get(root), built, hits };
}

module.exports = { build, compile };
