// GET /books: search and filter the catalog. Takes the books and the parsed query
// (values are always strings, or missing, because they come straight from the URL) and returns { status, body }.
const ok = body => ({ status: 200, body });
const fail = (status, message) => ({ status, body: { error: message } });

function searchBooks(books, query = {}) {
  let results = books;
  if (query.q) {
    results = results.filter(b => b.title.includes(query.q) || b.author.includes(query.q));
  }
  if (query.genre) {
    results = results.filter(b => b.genres.includes(query.genre));
  }
  if (query.minYear) results = results.filter(b => b.year >= Number(query.minYear));
  if (query.maxYear) results = results.filter(b => b.year < Number(query.maxYear));
  if (query.available) results = results.filter(b => b.copies > 0);

  const page = query.page ? Number(query.page) : 1;
  const limit = query.limit ? Number(query.limit) : 20;
  const items = results.slice((page - 1) * limit, page * limit);
  return ok({ items, total: items.length, page, limit });
}

module.exports = { searchBooks };
