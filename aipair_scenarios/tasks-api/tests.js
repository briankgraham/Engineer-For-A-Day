// Hidden edge cases (run when the candidate finishes, on top of visible_tests.js)
const setup = () => {
  const clock = mkClock();
  const store = new (require("./store").TaskStore)({ now: clock.now });
  const route = require("./router").makeRouter(require("./handlers").makeHandlers(store));
  return { route, clock, store };
};
// Creates n tasks titled t1..tn; every even one is done.
const seed = (route, n) => {
  for (let i = 1; i <= n; i++) route("POST", "/tasks", { title: "t" + i, status: i % 2 === 0 ? "done" : "open" });
};
const titles = res => res.body.items.map(t => t.title);

test("total and totalPages count the filtered list, and the page is filled from it", () => {
  const { route } = setup();
  seed(route, 12); // 6 open (odd), 6 done (even)
  const r = route("GET", "/tasks?status=open&limit=4&page=2");
  eq(titles(r), ["t9", "t11"]);
  eq([r.body.total, r.body.totalPages], [6, 2]);
});

test("a page past the end is 200 with empty items", () => {
  const { route } = setup();
  seed(route, 5);
  const r = route("GET", "/tasks?page=9");
  eq(r.status, 200);
  eq(r.body.items, []);
  eq(r.body.total, 5);
});

test("a bad page or limit is a 400, not corrected", () => {
  const { route } = setup();
  seed(route, 5);
  for (const q of ["limit=51", "limit=0", "limit=abc", "limit=2.5", "page=0", "page=-1", "page=x"]) {
    const r = route("GET", "/tasks?" + q);
    eq(r.status, 400, q + " should be rejected");
    assert(r.body && typeof r.body.error === "string", q + " should carry an error message");
  }
});

test("limit=50 is allowed", () => {
  const { route } = setup();
  seed(route, 3);
  eq(route("GET", "/tasks?limit=50").body.limit, 50);
});

test("total leaves out deleted tasks, and includeDeleted=true puts them back", () => {
  const { route } = setup();
  seed(route, 5);
  route("DELETE", "/tasks/2");
  route("DELETE", "/tasks/3");
  eq(route("GET", "/tasks").body.total, 3);
  const all = route("GET", "/tasks?includeDeleted=true");
  eq(titles(all), ["t1", "t2", "t3", "t4", "t5"]);
  eq(all.body.total, 5);
});

test("includeDeleted=false (or anything but \"true\") still hides deleted tasks", () => {
  const { route } = setup();
  seed(route, 3);
  route("DELETE", "/tasks/1");
  eq(titles(route("GET", "/tasks?includeDeleted=false")), ["t2", "t3"]);
  eq(titles(route("GET", "/tasks?includeDeleted=1")), ["t2", "t3"]);
  eq(titles(route("GET", "/tasks?includeDeleted")), ["t2", "t3"]);
});

test("deletedAt comes from the store's clock", () => {
  const { route, store, clock } = setup();
  seed(route, 1);
  clock.tick(500);
  route("DELETE", "/tasks/1");
  eq(store.find("1").deletedAt, clock.now());
});

test("deleting twice or deleting an unknown id is a 404", () => {
  const { route } = setup();
  seed(route, 1);
  eq(route("DELETE", "/tasks/1").status, 204);
  eq(route("DELETE", "/tasks/1").status, 404);
  eq(route("DELETE", "/tasks/42").status, 404);
});

test("PATCH on a deleted task is a 404 and changes nothing", () => {
  const { route } = setup();
  seed(route, 1);
  route("DELETE", "/tasks/1");
  eq(route("PATCH", "/tasks/1", { title: "new" }).status, 404);
  route("POST", "/tasks/1/restore");
  eq(route("GET", "/tasks/1").body.title, "t1");
});

test("restore: 404 for an unknown id, 409 for a task that is not deleted", () => {
  const { route } = setup();
  seed(route, 1);
  eq(route("POST", "/tasks/9/restore").status, 404);
  const r = route("POST", "/tasks/1/restore");
  eq(r.status, 409);
  assert(typeof r.body.error === "string", "409 should carry an error message");
});

test("a restored task keeps its fields and its place in the list", () => {
  const { route } = setup();
  seed(route, 4);
  route("PATCH", "/tasks/2", { status: "open" });
  route("DELETE", "/tasks/2");
  const r = route("POST", "/tasks/2/restore");
  eq([r.body.title, r.body.status, "deletedAt" in r.body && r.body.deletedAt !== undefined], ["t2", "open", false]);
  eq(titles(route("GET", "/tasks")), ["t1", "t2", "t3", "t4"]);
});

test("restore only accepts POST", () => {
  const { route } = setup();
  seed(route, 1);
  route("DELETE", "/tasks/1");
  eq(route("GET", "/tasks/1/restore").status, 405);
});
