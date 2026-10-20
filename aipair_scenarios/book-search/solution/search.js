// GET /books: search and filter the catalog. Takes the books and the parsed query
// (values are always strings, or missing, because they come straight from the URL) and returns { status, body }.
const ok = body => ({ status: 200, body });
const fail = (status, message) => ({ status, body: { error: message } });

// A whole number written as plain digits ("2001"); undefined when missing, NaN when malformed.
const int = v => (v === undefined ? undefined : /^\d+$/.test(v) ? Number(v) : NaN);

function searchBooks(books, query = {}) {
  const minYear = int(query.minYear), maxYear = int(query.maxYear);
  const page = query.page === undefined ? 1 : int(query.page);
  const limit = query.limit === undefined ? 20 : int(query.limit);
  if (Number.isNaN(minYear)) return fail(400, "bad minYear");
  if (Number.isNaN(maxYear)) return fail(400, "bad maxYear");
  if (!(page >= 1)) return fail(400, "bad page");
  if (!(limit >= 1 && limit <= 100)) return fail(400, "bad limit");
  if (query.available !== undefined && query.available !== "true" && query.available !== "false") return fail(400, "bad available");

  let results = books;
  const q = (query.q || "").trim().toLowerCase();
  if (q) results = results.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
  const genres = (query.genre || "").split(",").map(g => g.trim().toLowerCase()).filter(Boolean);
  if (genres.length) results = results.filter(b => b.genres.some(g => genres.includes(g)));
  if (minYear !== undefined) results = results.filter(b => b.year >= minYear);
  if (maxYear !== undefined) results = results.filter(b => b.year <= maxYear);
  if (query.available !== undefined) results = results.filter(b => (b.copies > 0) === (query.available === "true"));

  const start = (page - 1) * limit;
  return ok({ items: results.slice(start, start + limit), total: results.length, page, limit });
}

module.exports = { searchBooks };
