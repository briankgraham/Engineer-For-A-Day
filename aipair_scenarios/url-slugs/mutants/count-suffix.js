const { slugify } = require("./slug");

function uniqueSlug(title, existing) {
  const base = slugify(title);
  if (!existing.includes(base)) return base;
  return base + "-" + (existing.filter(s => s.startsWith(base)).length + 1);
}

module.exports = { uniqueSlug };
