// The book catalog: an in-memory list loaded at startup. This file works.
// A book is { id, title, author, genres, year, copies }. genres are lowercase; copies is how many are on the shelf right now.
class Catalog {
  constructor(books = []) {
    this.books = books.map(b => ({ ...b, genres: [...b.genres] })); // catalog order is the order given
  }

  all() {
    return this.books.slice();
  }

  find(id) {
    return this.books.find(b => b.id === id);
  }
}

const SAMPLE = [
  { id: "b1", title: "Dune", author: "Frank Herbert", genres: ["scifi"], year: 1965, copies: 3 },
  { id: "b2", title: "The Hobbit", author: "J.R.R. Tolkien", genres: ["fantasy"], year: 1937, copies: 0 },
  { id: "b3", title: "A Wizard of Earthsea", author: "Ursula K. Le Guin", genres: ["fantasy"], year: 1968, copies: 2 },
  { id: "b4", title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", genres: ["scifi"], year: 1969, copies: 1 },
  { id: "b5", title: "Neuromancer", author: "William Gibson", genres: ["scifi", "cyberpunk"], year: 1984, copies: 0 },
  { id: "b6", title: "Good Omens", author: "Terry Pratchett and Neil Gaiman", genres: ["fantasy", "comedy"], year: 1990, copies: 4 },
  { id: "b7", title: "The Martian", author: "Andy Weir", genres: ["scifi"], year: 2011, copies: 5 },
  { id: "b8", title: "Dune Messiah", author: "Frank Herbert", genres: ["scifi"], year: 1969, copies: 1 },
  { id: "b9", title: "C++ Primer", author: "Stanley Lippman", genres: ["programming"], year: 2012, copies: 2 },
  { id: "b10", title: "Gone Girl", author: "Gillian Flynn", genres: ["thriller", "mystery"], year: 2012, copies: 0 },
  { id: "b11", title: "The Name of the Wind", author: "Patrick Rothfuss", genres: ["fantasy"], year: 2007, copies: 1 },
  { id: "b12", title: "Project Hail Mary", author: "Andy Weir", genres: ["scifi"], year: 2021, copies: 2 },
];

module.exports = { Catalog, SAMPLE };
