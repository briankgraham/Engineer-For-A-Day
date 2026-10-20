// Read-only: these are the tests you can see. A few extra edge cases run when you finish.
const setup = () => {
  const { Catalog, SAMPLE } = require("./catalog");
  return require("./router").makeRouter(new Catalog(SAMPLE));
};
const ids = res => res.body.items.map(b => b.id);

// ---- existing behavior (passes today, keep it passing) ----
test("GET /books lists every book in catalog order", () => {
  const r = setup()("GET", "/books");
  eq(r.status, 200);
  eq(ids(r), ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "b10", "b11", "b12"]);
  eq(r.body.total, 12);
});

test("GET /books/:id returns the book, or 404", () => {
  const route = setup();
  eq(route("GET", "/books/b7").body.title, "The Martian");
  eq(route("GET", "/books/b99").status, 404);
});

test("q matches the title", () => {
  eq(ids(setup()("GET", "/books?q=Dune")), ["b1", "b8"]);
});

test("genre filters by one genre", () => {
  eq(ids(setup()("GET", "/books?genre=fantasy")), ["b2", "b3", "b6", "b11"]);
});

test("minYear keeps books published that year or later", () => {
  eq(ids(setup()("GET", "/books?minYear=2011")), ["b7", "b9", "b10", "b12"]);
});

test("page and limit pick a slice of the results", () => {
  const r = setup()("GET", "/books?page=2&limit=5");
  eq(ids(r), ["b6", "b7", "b8", "b9", "b10"]);
  eq([r.body.page, r.body.limit], [2, 5]);
});

// ---- bug tickets (fail today) ----
test("ticket #412: searching \"dune\" finds nothing (search must ignore case)", () => {
  eq(ids(setup()("GET", "/books?q=dune")), ["b1", "b8"]);
});

test("ticket #415: searching by author finds nothing", () => {
  eq(ids(setup()("GET", "/books?q=le+guin")), ["b3", "b4"]);
});

test("ticket #419: genre=fantasy,scifi returns no books (it should return either genre)", () => {
  eq(ids(setup()("GET", "/books?genre=fantasy,scifi")), ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b11", "b12"]);
});

test("ticket #423: maxYear=1969 leaves out books from 1969", () => {
  eq(ids(setup()("GET", "/books?minYear=1965&maxYear=1969")), ["b1", "b3", "b4", "b8"]);
});

test("ticket #431: total shows 5 when there are 12 results", () => {
  const r = setup()("GET", "/books?limit=5");
  eq(r.body.items.length, 5);
  eq(r.body.total, 12);
});
