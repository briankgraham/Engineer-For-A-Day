// Text helpers. This file works; slug.js builds on it.
// stripAccents("Café Déjà") === "Cafe Deja"
function stripAccents(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// The words in s: accents removed, lowercased, split on anything that is not a-z or 0-9.
// words("Hello,  Wörld! 2024") is ["hello", "world", "2024"]; words("!!!") is [].
function words(s) {
  return stripAccents(s).toLowerCase().split(/[^a-z0-9]+/).filter(w => w !== "");
}

module.exports = { stripAccents, words };
