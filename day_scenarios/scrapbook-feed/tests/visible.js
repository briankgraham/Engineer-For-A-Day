// feed.test.js: the service's existing test suite (CI runs it on every PR).
function mk() {
  const { createApp } = require("./app");
  const clock = mkClock();
  const app = createApp({ now: clock.now });
  for (const [id, name] of [["mia", "Mia"], ["noah", "Noah"], ["ola", "Ola"], ["viewer", "Vera"]]) app.createUser({ id, name });
  app.follow("viewer", "mia");
  app.follow("viewer", "noah");
  return { app, clock };
}
// Creates n posts by one author, one per tick of the clock, and returns their ids oldest first.
function posts(app, clock, author, n, prefix = "post") {
  const ids = [];
  for (let i = 1; i <= n; i++) { clock.tick(10); ids.push(app.createPost(author, prefix + " " + i).id); }
  return ids;
}

test("createUser validates its input and getUser returns a copy", () => {
  const { app } = mk();
  throws(() => app.createUser({ id: "", name: "X" }), TypeError);
  throws(() => app.createUser({ id: "x" }), TypeError);
  const u = app.getUser("mia");
  u.name = "changed";
  eq(app.getUser("mia").name, "Mia");
});

test("a user can only be created once, and unknown users throw USER_NOT_FOUND", () => {
  const { app } = mk();
  let code = null;
  try { app.createUser({ id: "mia", name: "Again" }); } catch (e) { code = e.code; }
  eq(code, "USER_EXISTS");
  try { app.getFeed("nobody"); } catch (e) { code = e.code; }
  eq(code, "USER_NOT_FOUND");
  throws(() => app.follow("viewer", "viewer"), TypeError);
});

test("createPost validates its input and returns the post", () => {
  const { app } = mk();
  throws(() => app.createPost("mia", ""), TypeError);
  throws(() => app.createPost("mia", "x".repeat(501)), TypeError);
  throws(() => app.createPost("mia", "ok", { at: -5 }), TypeError);
  const p = app.createPost("mia", "hello");
  eq(p.authorId, "mia");
  eq(p.text, "hello");
  assert(typeof p.id === "string" && p.id.length > 0, "an id");
});

test("the feed shows posts from people you follow, newest first", () => {
  const { app, clock } = mk();
  const a = posts(app, clock, "mia", 2);
  posts(app, clock, "ola", 2, "not followed");
  const b = posts(app, clock, "noah", 1);
  const { items, nextCursor } = app.getFeed("viewer");
  eq(items.map(p => p.id), [b[0], a[1], a[0]]);
  eq(nextCursor, null);
});

test("an empty feed is an empty page", () => {
  const { app } = mk();
  eq(app.getFeed("ola"), { items: [], nextCursor: null });
});

test("pages follow nextCursor until it is null", () => {
  const { app, clock } = mk();
  const ids = posts(app, clock, "mia", 7);
  const seen = [];
  let cursor = null, pages = 0;
  do {
    const page = app.getFeed("viewer", { limit: 3, cursor });
    assert(page.items.length <= 3, "page size");
    seen.push(...page.items.map(p => p.id));
    cursor = page.nextCursor;
    pages++;
  } while (cursor && pages < 10);
  eq(seen, [...ids].reverse());
  eq(pages, 3);
});

test("limit is an integer from 1 to 50", () => {
  const { app } = mk();
  for (const bad of [0, -1, 51, 2.5, "10"]) throws(() => app.getFeed("viewer", { limit: bad }), RangeError, "limit " + bad);
  eq(app.getFeed("viewer", { limit: 50 }).items.length, 0);
});

test("a bad cursor is a RangeError", () => {
  const { app } = mk();
  throws(() => app.getFeed("viewer", { cursor: "garbage" }), RangeError);
  throws(() => app.getFeed("viewer", { cursor: 12 }), RangeError);
});

test("deleting a post removes it from feeds, and deleting it twice throws POST_NOT_FOUND", () => {
  const { app, clock } = mk();
  const ids = posts(app, clock, "mia", 3);
  app.deletePost(ids[1]);
  eq(app.getFeed("viewer").items.map(p => p.id), [ids[2], ids[0]]);
  let code = null;
  try { app.deletePost(ids[1]); } catch (e) { code = e.code; }
  eq(code, "POST_NOT_FOUND");
});
