// Hidden edge cases (run when the candidate finishes, on top of visible_tests.js)
const setup = () => {
  const { Catalog, SAMPLE } = require("./catalog");
  return require("./router").makeRouter(new Catalog(SAMPLE));
};
const ids = res => res.body.items.map(b => b.id);

test("q is trimmed, and a blank q matches everything", () => {
  const route = setup();
  eq(ids(route("GET", "/books?q=++hobbit+")), ["b2"]);
  eq(route("GET", "/books?q=+++").body.total, 12);
});

test("q is plain text, not a pattern", () => {
  const route = setup();
  eq(ids(route("GET", "/books?q=c%2B%2B")), ["b9"]);
  const r = route("GET", "/books?q=(");
  eq(r.status, 200);
  eq(ids(r), []);
  eq(ids(route("GET", "/books?q=d.ne")), []);
});

test("genre ignores case and spaces around each name", () => {
  eq(ids(setup()("GET", "/books?genre=Fantasy,+COMEDY")), ["b2", "b3", "b6", "b11"]);
});

test("a book with several genres matches when any one is asked for", () => {
  eq(ids(setup()("GET", "/books?genre=cyberpunk,mystery")), ["b5", "b10"]);
});

test("available=true keeps books on the shelf, available=false keeps the ones out", () => {
  const route = setup();
  eq(ids(route("GET", "/books?available=true")), ["b1", "b3", "b4", "b6", "b7", "b8", "b9", "b11", "b12"]);
  eq(ids(route("GET", "/books?available=false")), ["b2", "b5", "b10"]);
});

test("available must be \"true\" or \"false\"", () => {
  const route = setup();
  for (const v of ["yes", "1", ""]) eq(route("GET", "/books?available=" + v).status, 400, "available=" + v);
});

test("total counts every match, and pages are filled after filtering", () => {
  const r = setup()("GET", "/books?genre=scifi&limit=2&page=2");
  eq(ids(r), ["b5", "b7"]);
  eq(r.body.total, 6);
});

test("a page past the end is 200 with empty items and the real total", () => {
  const r = setup()("GET", "/books?genre=fantasy&page=3&limit=2");
  eq(r.status, 200);
  eq(ids(r), []);
  eq(r.body.total, 4);
});

test("filters combine", () => {
  const route = setup();
  eq(ids(route("GET", "/books?q=weir&minYear=2015")), ["b12"]);
  eq(ids(route("GET", "/books?genre=scifi&available=false")), ["b5"]);
  eq(ids(route("GET", "/books?q=herbert&maxYear=1965")), ["b1"]);
});

test("a malformed number is a 400 with an error, not ignored", () => {
  const route = setup();
  for (const qs of ["minYear=abc", "maxYear=19x5", "minYear=-5", "minYear=", "page=0", "page=two", "limit=0", "limit=101", "limit=2.5"]) {
    const r = route("GET", "/books?" + qs);
    eq(r.status, 400, qs + " should be rejected");
    assert(r.body && typeof r.body.error === "string", qs + " should carry an error message");
  }
});

test("limit=100 is allowed", () => {
  eq(setup()("GET", "/books?limit=100").body.limit, 100);
});

test("searching does not change the catalog", () => {
  const { Catalog, SAMPLE } = require("./catalog");
  const catalog = new Catalog(SAMPLE);
  const route = require("./router").makeRouter(catalog);
  route("GET", "/books?genre=fantasy,scifi&q=the&available=true");
  eq(catalog.all().map(b => b.id).join(), "b1,b2,b3,b4,b5,b6,b7,b8,b9,b10,b11,b12");
  eq(catalog.find("b5").genres, ["scifi", "cyberpunk"]);
});
