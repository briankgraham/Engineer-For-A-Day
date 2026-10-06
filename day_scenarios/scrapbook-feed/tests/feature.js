// Hidden: SCRAP-412 (muted words). Runs when the day ends.
function mk() {
  const { createApp } = require("./app");
  const clock = mkClock();
  const app = createApp({ now: clock.now });
  for (const [id, name] of [["mia", "Mia"], ["noah", "Noah"], ["viewer", "Vera"], ["other", "Otto"]]) app.createUser({ id, name });
  app.follow("viewer", "mia");
  app.follow("viewer", "noah");
  app.follow("other", "mia");
  return { app, clock };
}
const post = (app, clock, author, text) => { clock.tick(10); return app.createPost(author, text); };
const texts = (app, who, opts) => app.getFeed(who, { limit: 50, ...opts }).items.map(p => p.text);
const HOUR = 3600 * 1000;

test("muteWord validates the phrase, the hours and the user", () => {
  const { app } = mk();
  for (const bad of ["", "   ", "x".repeat(41), null, 42, undefined]) throws(() => app.muteWord("viewer", bad), RangeError, "phrase " + String(bad));
  for (const bad of [0, -2, 1.5, "3", null]) throws(() => app.muteWord("viewer", "cat", { hours: bad }), RangeError, "hours " + String(bad));
  let code = null;
  try { app.muteWord("nobody", "cat"); } catch (e) { code = e.code; }
  eq(code, "USER_NOT_FOUND");
  app.muteWord("viewer", "x".repeat(40));
});

test("a muted word hides whole-word matches, ignoring case and punctuation", () => {
  const { app, clock } = mk();
  for (const t of ["My CAT is asleep", "cat!", "the cat's toy", "(cat)", "dogs only", "great cat, great day"]) post(app, clock, "mia", t);
  app.muteWord("viewer", "Cat");
  eq(texts(app, "viewer"), ["dogs only"]);
});

test("a muted word does not hide longer words that contain it", () => {
  const { app, clock } = mk();
  for (const t of ["category theory", "concatenate strings", "scatter plot", "bobcat sighting", "cat2 is a robot", "catalog"]) post(app, clock, "mia", t);
  app.muteWord("viewer", "cat");
  eq(texts(app, "viewer").length, 6);
});

test("digits and letters in other scripts count as part of a word", () => {
  const { app, clock } = mk();
  for (const t of ["cat5", "5cat", "catécolo", "gato cat"]) post(app, clock, "mia", t);
  app.muteWord("viewer", "cat");
  eq(texts(app, "viewer"), ["catécolo", "5cat", "cat5"]);
});

test("a phrase of several words matches them in order with any whitespace between", () => {
  const { app, clock } = mk();
  for (const t of ["SPOILER   alert: he dies", "spoiler\nalert", "alert spoiler", "a spoiler is not an alert"]) post(app, clock, "mia", t);
  app.muteWord("viewer", "  spoiler alert ");
  eq(texts(app, "viewer"), ["a spoiler is not an alert", "alert spoiler"]);
});

test("characters that are special in regular expressions are matched literally", () => {
  const { app, clock } = mk();
  for (const t of ["I love c++ and rust", "abc++ nope", "cpp", "price is $5.00 today", "price is $5x00 today"]) post(app, clock, "mia", t);
  app.muteWord("viewer", "c++");
  app.muteWord("viewer", "$5.00");
  eq(texts(app, "viewer"), ["price is $5x00 today", "cpp", "abc++ nope"]);
});

test("mutes belong to one viewer", () => {
  const { app, clock } = mk();
  post(app, clock, "mia", "all about the cat");
  app.muteWord("viewer", "cat");
  eq(texts(app, "viewer"), []);
  eq(texts(app, "other"), ["all about the cat"]);
});

test("a page is full: muted posts are skipped, not left as holes", () => {
  const { app, clock } = mk();
  for (let i = 1; i <= 30; i++) post(app, clock, i % 2 ? "mia" : "noah", (i % 2 ? "cat photo " : "dog photo ") + i);
  app.muteWord("viewer", "cat");
  const seen = [];
  let cursor = null, pages = 0;
  do {
    const page = app.getFeed("viewer", { limit: 5, cursor });
    if (page.nextCursor) eq(page.items.length, 5, "page " + (pages + 1) + " is full");
    seen.push(...page.items.map(p => p.text));
    cursor = page.nextCursor;
    pages++;
  } while (cursor && pages < 10);
  eq(pages, 3);
  eq(seen.length, 15);
  assert(seen.every(t => t.startsWith("dog")), "only unmuted posts");
  eq(new Set(seen).size, 15);
});

test("when everything left is muted the last page ends with a null cursor", () => {
  const { app, clock } = mk();
  for (let i = 1; i <= 6; i++) post(app, clock, "mia", i <= 3 ? "dog " + i : "cat " + i);
  app.muteWord("viewer", "cat");
  const page = app.getFeed("viewer", { limit: 3 });
  eq(page.items.map(p => p.text), ["dog 3", "dog 2", "dog 1"]);
  eq(page.nextCursor, null);
});

test("a mute with hours expires exactly when the time is up; without hours it never does", () => {
  const { app, clock } = mk();
  post(app, clock, "mia", "cat news");
  post(app, clock, "mia", "spoilers ahead");
  app.muteWord("viewer", "cat", { hours: 24 });
  app.muteWord("viewer", "spoilers");
  clock.tick(24 * HOUR - 1);
  eq(texts(app, "viewer"), []);
  clock.tick(1);
  eq(texts(app, "viewer"), ["cat news"]);
  clock.tick(1000 * 24 * HOUR);
  eq(texts(app, "viewer"), ["cat news"]);
});

test("muting the same phrase again replaces its expiry, whatever the case", () => {
  const { app, clock } = mk();
  post(app, clock, "mia", "cat news");
  app.muteWord("viewer", "cat");
  app.muteWord("viewer", " CAT ", { hours: 1 });
  eq(app.getMutes("viewer").length, 1);
  clock.tick(HOUR);
  eq(texts(app, "viewer"), ["cat news"]);
  app.muteWord("viewer", "cat", { hours: 1 });
  app.muteWord("viewer", "Cat");
  clock.tick(100 * HOUR);
  eq(texts(app, "viewer"), []);
});

test("getMutes lists active mutes, trimmed and lowercased, sorted, as copies", () => {
  const { app, clock } = mk();
  const t0 = clock.now();
  app.muteWord("viewer", "  Zebra ");
  app.muteWord("viewer", "Spoiler   ALERT", { hours: 2 });
  app.muteWord("viewer", "old", { hours: 1 });
  clock.tick(HOUR);
  const list = app.getMutes("viewer");
  eq(list, [{ phrase: "spoiler alert", until: t0 + 2 * HOUR }, { phrase: "zebra", until: null }]);
  list.pop();
  eq(app.getMutes("viewer").length, 2);
  eq(app.getMutes("other"), []);
});

test("unmuteWord removes a mute and says whether there was one", () => {
  const { app, clock } = mk();
  post(app, clock, "mia", "cat news");
  app.muteWord("viewer", "cat");
  eq(app.unmuteWord("viewer", " CAT"), true);
  eq(app.unmuteWord("viewer", "cat"), false);
  eq(texts(app, "viewer"), ["cat news"]);
});

test("at most 100 active mutes; replacing one or letting one expire does not count against the limit", () => {
  const { app, clock } = mk();
  for (let i = 0; i < 99; i++) app.muteWord("viewer", "word" + i);
  app.muteWord("viewer", "short", { hours: 1 });
  throws(() => app.muteWord("viewer", "one too many"), RangeError);
  app.muteWord("viewer", "word5", { hours: 3 });
  clock.tick(HOUR);
  app.muteWord("viewer", "fits now");
  eq(app.getMutes("viewer").length, 100);
});
