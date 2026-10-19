class BuildError extends Error {
  constructor(message) {
    super(message);
    this.name = "BuildError";
  }
}

// Every target `root` needs (and root itself), dependencies before the targets that use them.
// Deps are visited in sorted order so the build order is the same on every machine.
// A target reached twice through different paths (a diamond) is fine; only a target that is
// still on the current path when we reach it again is a cycle.
function buildOrder(targets, root) {
  const order = [];
  const done = new Set();
  const path = [];
  const visit = name => {
    if (done.has(name)) return;
    const at = path.indexOf(name);
    if (at !== -1) throw new BuildError("dependency cycle: " + [...path.slice(at), name].join(" -> "));
    const t = targets[name];
    if (!t) throw new BuildError("no such target: " + name);
    path.push(name);
    for (const dep of [...t.deps].sort()) visit(dep);
    path.pop();
    done.add(name);
    order.push(name);
  };
  visit(root);
  return order;
}

module.exports = { buildOrder, BuildError };
