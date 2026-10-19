// Turns a post title into a URL slug. words() in text.js does the hard part.
const { words } = require("./text");

function slugify(title, maxLength = 60) {
  // TODO: dashes between words, maxLength, "untitled", TypeError
  return words(title).join(" ");
}

module.exports = { slugify };
