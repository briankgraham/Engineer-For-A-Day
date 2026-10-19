const { slugify } = require("./slug");

function uniqueSlug(title, existing) {
  const base = slugify(title);
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(base + "-" + n)) n++;
  return base + "-" + n;
}

module.exports = { uniqueSlug };
