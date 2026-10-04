// Read-only: these are the tests you can see. A few extra edge cases run when you finish.
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

// ---- existing behavior (passes today, keep it passing) ----
test("POST /tasks creates a task with status open by default", () => {
  const { route } = setup();
  const r = route("POST", "/tasks", { title: "  write docs " });
  eq(r.status, 201);
  eq(r.body.title, "write docs");
  eq(r.body.status, "open");
});

test("POST /tasks rejects a blank title", () => {
  const { route } = setup();
  eq(route("POST", "/tasks", { title: "   " }).status, 400);
});

test("GET /tasks/:id returns the task, or 404", () => {
  const { route } = setup();
  route("POST", "/tasks", { title: "a" });
  eq(route("GET", "/tasks/1").body.title, "a");
  eq(route("GET", "/tasks/99").status, 404);
});

test("PATCH /tasks/:id updates title and status", () => {
  const { route } = setup();
  route("POST", "/tasks", { title: "a" });
  const r = route("PATCH", "/tasks/1", { status: "done" });
  eq(r.status, 200);
  eq(route("GET", "/tasks/1").body.status, "done");
});

test("GET /tasks lists tasks in creation order", () => {
  const { route } = setup();
  seed(route, 3);
  eq(titles(route("GET", "/tasks")), ["t1", "t2", "t3"]);
});

test("GET /tasks?status= filters, and rejects an unknown status", () => {
  const { route } = setup();
  seed(route, 4);
  eq(titles(route("GET", "/tasks?status=done")), ["t2", "t4"]);
  eq(route("GET", "/tasks?status=nope").status, 400);
});

// ---- pagination (new) ----
test("the list body carries page, limit, total and totalPages", () => {
  const { route } = setup();
  seed(route, 25);
  const r = route("GET", "/tasks");
  eq(r.status, 200);
  eq([r.body.page, r.body.limit, r.body.total, r.body.totalPages], [1, 10, 25, 3]);
  eq(r.body.items.length, 10);
});

test("page and limit pick a slice of the list", () => {
  const { route } = setup();
  seed(route, 25);
  eq(titles(route("GET", "/tasks?page=2&limit=10")).join(), "t11,t12,t13,t14,t15,t16,t17,t18,t19,t20");
  eq(titles(route("GET", "/tasks?page=3&limit=10")).join(), "t21,t22,t23,t24,t25");
});

// ---- soft delete (new) ----
test("DELETE returns 204 and the task disappears from the list and from GET", () => {
  const { route } = setup();
  seed(route, 3);
  eq(route("DELETE", "/tasks/2").status, 204);
  eq(titles(route("GET", "/tasks")), ["t1", "t3"]);
  eq(route("GET", "/tasks/2").status, 404);
});

test("DELETE stamps deletedAt but keeps the record around", () => {
  const { route, store } = setup();
  seed(route, 1);
  route("DELETE", "/tasks/1");
  assert(store.find("1"), "the record must still be in the store");
  assert(store.find("1").deletedAt !== undefined, "deletedAt must be set");
});

test("POST /tasks/:id/restore brings a deleted task back", () => {
  const { route } = setup();
  seed(route, 3);
  route("DELETE", "/tasks/2");
  const r = route("POST", "/tasks/2/restore");
  eq(r.status, 200);
  eq(r.body.title, "t2");
  eq(titles(route("GET", "/tasks")), ["t1", "t2", "t3"]);
});
