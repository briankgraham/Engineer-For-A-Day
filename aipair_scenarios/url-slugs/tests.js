// Hidden edge cases (run when the candidate finishes, on top of visible_tests.js)
const slugify = (...args) => require("./slug").slugify(...args);
const unique = (...args) => require("./unique").uniqueSlug(...args);

test("cutting to maxLength never leaves a trailing dash", () => {
  eq(slugify("Hello World", 6), "hello");
  eq(slugify("a b c d e f", 4), "a-b");
});

test("the default maxLength is 60", () => {
  const s = slugify("word ".repeat(30));
  assert(s.length <= 60, "slug is longer than 60");
  assert(!s.endsWith("-"), "slug ends with a dash");
});

test("digits are kept", () => {
  eq(slugify("Top 10 Tips for 2024"), "top-10-tips-for-2024");
});

test("non-string titles throw TypeError", () => {
  throws(() => slugify(null), TypeError);
  throws(() => slugify(42), TypeError);
});

test("a longer slug with the same prefix does not count as taken", () => {
  eq(unique("Hello", ["hello", "hello-world", "hello-kitty"]), "hello-2");
});

test("a gap in the numbers is filled first", () => {
  eq(unique("Post", ["post", "post-3"]), "post-2");
});

test("never returns a slug that is already taken", () => {
  const existing = ["news", "news-3", "news-4"];
  eq(unique("News", existing), "news-2");
  eq(unique("News", ["news", "news-2", "news-4"]), "news-3");
});

test("uniqueSlug does not modify existing", () => {
  const existing = ["post"];
  unique("Post", existing);
  eq(existing, ["post"]);
});

test("an untitled post is made unique too", () => {
  eq(unique("???", ["untitled"]), "untitled-2");
});
