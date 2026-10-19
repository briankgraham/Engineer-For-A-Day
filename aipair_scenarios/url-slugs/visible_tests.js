// Read-only: these are the tests you can see. A few extra edge cases run when you finish.
const slugify = (...args) => require("./slug").slugify(...args);
const unique = (...args) => require("./unique").uniqueSlug(...args);

// ---- words (already working) ----
test("words splits a title into clean lowercase words", () => {
  eq(require("./text").words("Hello,  Wörld! 2024"), ["hello", "world", "2024"]);
  eq(require("./text").words("!!!"), []);
});

test("a single word is lowercased", () => {
  eq(slugify("Hello"), "hello");
});

test("accented letters become plain letters", () => {
  eq(slugify("Crème"), "creme");
});

// ---- dashes ----
test("spaces become dashes", () => {
  eq(slugify("My First Post"), "my-first-post");
});

test("a run of spaces and punctuation becomes one dash", () => {
  eq(slugify("Hello,  World!"), "hello-world");
  eq(slugify("Tips & Tricks"), "tips-tricks");
});

test("no dash at the start or end", () => {
  eq(slugify("  -- Why? --  "), "why");
});

test("a title with nothing usable is untitled", () => {
  eq(slugify("!!!"), "untitled");
});

// ---- length ----
test("long slugs are cut to maxLength", () => {
  eq(slugify("abcdefghij", 4), "abcd");
});

// ---- unique ----
test("a free slug is used as is", () => {
  eq(unique("Hello World", ["other-post"]), "hello-world");
});

test("a taken slug gets -2", () => {
  eq(unique("Hello World", ["hello-world"]), "hello-world-2");
});

test("it keeps counting until it finds a free one", () => {
  eq(unique("Hello World", ["hello-world", "hello-world-2", "hello-world-3"]), "hello-world-4");
});
