// Maps "METHOD /path?query" onto the catalog and the search. This file works.
const { searchBooks } = require("./search");

function parseQuery(qs) {
  const query = {};
  for (const pair of qs.split("&")) {
    if (!pair) continue;
    const i = pair.indexOf("=");
    const key = decodeURIComponent(i < 0 ? pair : pair.slice(0, i));
    query[key] = i < 0 ? "" : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, " "));
  }
  return query;
}

function makeRouter(catalog) {
  return function route(method, url) {
    const q = url.indexOf("?");
    const path = q < 0 ? url : url.slice(0, q);
    const query = q < 0 ? {} : parseQuery(url.slice(q + 1));
    const parts = path.split("/").filter(Boolean);

    if (parts[0] !== "books" || parts.length > 2) return { status: 404, body: { error: "no such route" } };
    if (method !== "GET") return { status: 405, body: { error: "method not allowed" } };
    if (parts.length === 1) return searchBooks(catalog.all(), query);
    const book = catalog.find(parts[1]);
    return book ? { status: 200, body: book } : { status: 404, body: { error: "not found" } };
  };
}

module.exports = { makeRouter };
