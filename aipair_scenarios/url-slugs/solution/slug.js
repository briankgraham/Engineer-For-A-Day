const { words } = require("./text");

function slugify(title, maxLength = 60) {
  if (typeof title !== "string") throw new TypeError("title must be a string");
  let slug = words(title).join("-").slice(0, maxLength);
  while (slug.endsWith("-")) slug = slug.slice(0, -1);
  return slug || "untitled";
}

module.exports = { slugify };
