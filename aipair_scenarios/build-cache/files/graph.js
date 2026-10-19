class BuildError extends Error {
  constructor(message) {
    super(message);
    this.name = "BuildError";
  }
}

// Every target `root` needs (and root itself), dependencies before the targets that use them.
// Deps are visited in sorted order so the build order is the same on every machine.
function buildOrder(targets, root) {
  const order = [];
  const seen = new Set();
  const visit = (name, path) => {
    if (seen.has(name)) throw new BuildError("dependency cycle: " + [...path, name].join(" -> "));
    const t = targets[name];
    if (!t) throw new BuildError("no such target: " + name);
    seen.add(name);
    for (const dep of [...t.deps].sort()) visit(dep, [...path, name]);
    order.push(name);
  };
  visit(root, []);
  return order;
}

module.exports = { buildOrder, BuildError };
