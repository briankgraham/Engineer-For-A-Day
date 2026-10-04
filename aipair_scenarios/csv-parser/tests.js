// Runs with: test, assert, eq, throws, require, mkClock
const parse = (...a) => require("./csv").parseCSV(...a);
const errOf = (fn) => { try { fn(); } catch (e) { return e; } return null; };
const mustThrow = (fn, ...parts) => {
  const e = errOf(fn);
  assert(e instanceof Error, "expected an Error to be thrown");
  for (const p of parts) assert(String(e.message).includes(p), "message should contain " + JSON.stringify(p) + ", got " + JSON.stringify(e.message));
};

// Hidden edge cases: run together with the visible tests when the candidate finishes.

test("every value stays a string", () => {
  eq(parse("1,007,1e3,true,null\n"), [["1", "007", "1e3", "true", "null"]]);
});

test("newlines inside quotes are data, kept as written", () => {
  eq(parse('id,note\n1,"line one\nline two"\n2,"a\r\nb"'), [["id", "note"], ["1", "line one\nline two"], ["2", "a\r\nb"]]);
});

test("a final terminator adds no record; empty input has none", () => {
  eq(parse("a\n"), [["a"]]);
  eq(parse("a\r\n"), [["a"]]);
  eq(parse(""), []);
  eq(parse("\n"), [[""]]);
  eq(parse("a\n\n"), [["a"], [""]]);
});

test("whitespace is preserved", () => {
  eq(parse(" a , b \n"), [[" a ", " b "]]);
  eq(parse('"  x  ",\t y'), [["  x  ", "\t y"]]);
});

test("a quote inside an unquoted field is literal", () => {
  eq(parse('ab"c,d'), [['ab"c', "d"]]);
});

test("an unterminated quote reports the line it started on", () => {
  mustThrow(() => parse('a\nb,"oops\nmore'), "Unterminated quoted field", "line 2");
  mustThrow(() => parse('"'), "Unterminated quoted field", "line 1");
});

test("custom delimiters", () => {
  eq(parse("a;b,c\n1;2", { delimiter: ";" }), [["a", "b,c"], ["1", "2"]]);
  eq(parse('x\t"y\tz"\n', { delimiter: "\t" }), [["x", "y\tz"]]);
});

test("header mode returns objects", () => {
  eq(parse("name,age\nAda,36\nLin,41\n", { header: true }), [{ name: "Ada", age: "36" }, { name: "Lin", age: "41" }]);
});

test("header mode edge cases", () => {
  eq(parse("a,b\n", { header: true }), []);
  eq(parse("", { header: true }), []);
  mustThrow(() => parse("a,b,a\n1,2,3", { header: true }), "Duplicate header", "a");
});

test("a larger document", () => {
  let text = "id,name,notes\n";
  for (let i = 0; i < 3000; i++) text += i + ',"name ' + i + '","a, b ""c""\nd"\n';
  const rows = parse(text, { header: true });
  eq(rows.length, 3000);
  eq(rows[2999], { id: "2999", name: "name 2999", notes: 'a, b "c"\nd' });
});
