// Runs with: test, assert, eq, throws, require, mkClock
const parse = (...a) => require("./csv").parseCSV(...a);
const errOf = (fn) => { try { fn(); } catch (e) { return e; } return null; };
const mustThrow = (fn, ...parts) => {
  const e = errOf(fn);
  assert(e instanceof Error, "expected an Error to be thrown");
  for (const p of parts) assert(String(e.message).includes(p), "message should contain " + JSON.stringify(p) + ", got " + JSON.stringify(e.message));
};

// These are the tests you can see. More edge cases run when you finish.

test("simple rows", () => {
  eq(parse("a,b,c\n1,2,3"), [["a", "b", "c"], ["1", "2", "3"]]);
});

test("quoted fields may contain the delimiter and escaped quotes", () => {
  eq(parse('"a,b","say ""hi""",""'), [["a,b", 'say "hi"', ""]]);
  eq(parse('"""quoted"""'), [['"quoted"']]);
});

test("CRLF ends a record without leaving a stray CR", () => {
  eq(parse("a,b\r\nc,d\r\n"), [["a", "b"], ["c", "d"]]);
});

test("a blank line in the middle is a record with one empty field", () => {
  eq(parse("a\n\nb"), [["a"], [""], ["b"]]);
});

test("empty fields, leading and trailing", () => {
  eq(parse("a,,c"), [["a", "", "c"]]);
  eq(parse("a,b,"), [["a", "b", ""]]);
  eq(parse(",a"), [["", "a"]]);
  eq(parse(","), [["", ""]]);
});

test("junk after a closing quote is an error with its line", () => {
  mustThrow(() => parse('a,b\n"x"y,z'), "Unexpected character after closing quote", "line 2");
  mustThrow(() => parse('"a\nb"c'), "Unexpected character after closing quote", "line 2");
});

test("a leading BOM is ignored", () => {
  eq(parse("\uFEFFa,b\n1,2"), [["a", "b"], ["1", "2"]]);
});

test("bad arguments", () => {
  for (const delimiter of ["", ",,", '"', "\n", "\r", 5, null]) throws(() => parse("a", { delimiter }), RangeError, "delimiter " + JSON.stringify(delimiter));
  for (const bad of [undefined, null, 42, ["a"]]) throws(() => parse(bad), TypeError, "text " + JSON.stringify(bad));
});

test("header mode fills short records and rejects long ones", () => {
  eq(parse("a,b,c\n1,2\n\n", { header: true }), [{ a: "1", b: "2", c: "" }, { a: "", b: "", c: "" }]);
  mustThrow(() => parse("a,b\n1,2\n1,2,3", { header: true }), "Row 2");
});

test("header mode with quoted names and multi-line values", () => {
  eq(parse('"first name",note\nAda,"x\ny"', { header: true }), [{ "first name": "Ada", note: "x\ny" }]);
});
