// Hidden: INC-0841 (duplicate and missing posts while scrolling). Runs when the day ends.
function mk() {
  const { createApp } = require("./app");
  const clock = mkClock();
  const app = createApp({ now: clock.now });
  for (const [id, name] of [["mia", "Mia"], ["noah", "Noah"], ["viewer", "Vera"]]) app.createUser({ id, name });
  app.follow("viewer", "mia");
  app.follow("viewer", "noah");
  return { app, clock };
}
const add = (app, clock, author, text) => { clock.tick(10); return app.createPost(author, text).id; };
const addN = (app, clock, author, n, prefix = "p") => Array.from({ length: n }, (_, i) => add(app, clock, author, prefix + (i + 1)));

test("posts that arrive between two page requests are not shown twice", () => {
  const { app, clock } = mk();
  const old = addN(app, clock, "mia", 10);
  const p1 = app.getFeed("viewer", { limit: 4 });
  addN(app, clock, "noah", 3, "new");
  const p2 = app.getFeed("viewer", { limit: 4, cursor: p1.nextCursor });
  const p3 = app.getFeed("viewer", { limit: 4, cursor: p2.nextCursor });
  const seen = [...p1.items, ...p2.items, ...p3.items].map(p => p.id);
  eq(seen, [...old].reverse(), "every old post exactly once, in order");
  eq(p3.nextCursor, null);
});

test("a post deleted from a page you already saw does not make the next page skip one", () => {
  const { app, clock } = mk();
  const ids = addN(app, clock, "mia", 10);
  const p1 = app.getFeed("viewer", { limit: 4 });
  app.deletePost(p1.items[0].id);
  const p2 = app.getFeed("viewer", { limit: 4, cursor: p1.nextCursor });
  const p3 = app.getFeed("viewer", { limit: 4, cursor: p2.nextCursor });
  eq([...p2.items, ...p3.items].map(p => p.id), [...ids].reverse().slice(4), "the six older posts, none skipped");
});

test("the cursor still works when the post it points at has been deleted", () => {
  const { app, clock } = mk();
  const ids = addN(app, clock, "mia", 9);
  const p1 = app.getFeed("viewer", { limit: 3 });
  app.deletePost(p1.items[2].id);
  const p2 = app.getFeed("viewer", { limit: 3, cursor: p1.nextCursor });
  eq(p2.items.map(p => p.id), [ids[5], ids[4], ids[3]]);
});

test("posts with the same timestamp are all returned once, in a stable order, whatever the page size", () => {
  const { app, clock } = mk();
  clock.tick(500);
  const at = clock.now();
  const ids = [];
  for (let i = 1; i <= 7; i++) ids.push(app.createPost(i % 2 ? "mia" : "noah", "import " + i, { at }).id);
  for (const limit of [1, 2, 3, 7]) {
    const seen = [];
    let cursor = null, pages = 0;
    do {
      const page = app.getFeed("viewer", { limit, cursor });
      seen.push(...page.items.map(p => p.id));
      cursor = page.nextCursor;
      pages++;
    } while (cursor && pages < 20);
    eq(seen, [...ids].reverse(), "limit " + limit);
  }
});

test("a newer post with an older timestamp (a late import) shows up in its place", () => {
  const { app, clock } = mk();
  const ids = addN(app, clock, "mia", 6);
  const p1 = app.getFeed("viewer", { limit: 2 });
  const late = app.createPost("noah", "late import", { at: p1.items[1].createdAt - 5 }).id;
  const p2 = app.getFeed("viewer", { limit: 10, cursor: p1.nextCursor });
  eq(p1.items.map(p => p.id), [ids[5], ids[4]]);
  assert(p2.items.some(p => p.id === late), "a post older than the cursor appears on the later page");
  eq(new Set([...p1.items, ...p2.items].map(p => p.id)).size, 7, "no repeats");
});

test("the last page has a null cursor and cursors are strings", () => {
  const { app, clock } = mk();
  addN(app, clock, "mia", 5);
  const p1 = app.getFeed("viewer", { limit: 5 });
  eq(p1.nextCursor, null, "exactly one page of posts");
  const p2 = app.getFeed("viewer", { limit: 2 });
  assert(typeof p2.nextCursor === "string" && p2.nextCursor.length > 0, "a string cursor");
});

test("a cursor that was not issued by getFeed is a RangeError", () => {
  const { app, clock } = mk();
  addN(app, clock, "mia", 3);
  for (const bad of ["garbage", "c:abc:def", "c:5:", "", 7, {}]) throws(() => app.getFeed("viewer", { cursor: bad }), RangeError, JSON.stringify(bad));
});

test("one cursor works for another page size", () => {
  const { app, clock } = mk();
  const ids = addN(app, clock, "mia", 8);
  const p1 = app.getFeed("viewer", { limit: 3 });
  const p2 = app.getFeed("viewer", { limit: 5, cursor: p1.nextCursor });
  eq(p2.items.map(p => p.id), [ids[4], ids[3], ids[2], ids[1], ids[0]]);
});
