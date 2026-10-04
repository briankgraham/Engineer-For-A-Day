// Hidden edge cases (run when the candidate finishes, on top of visible_tests.js)
const ed = opts => new (require("./editor").Editor)(opts);
const keys = (e, ...ks) => ks.map(k => require("./keymap").handleKey(e, k));

test("a new edit after an undo throws the redo history away", () => {
  const e = ed({ text: "abc" });
  e.backspace();
  e.undo();
  eq(e.canRedo(), true);
  e.moveTo(0);
  eq(e.canRedo(), true); // moving alone keeps it
  e.type("X");
  eq(e.canRedo(), false);
  eq(e.redo(), false);
  eq(e.text, "Xabc");
});

test("undo restores the cursor to before the step, redo to after it", () => {
  const e = ed({ text: "abc" });
  e.moveTo(1);
  e.type("X");
  eq([e.text, e.cursor], ["aXbc", 2]);
  e.moveTo(4);
  e.undo();
  eq([e.text, e.cursor], ["abc", 1]);
  e.redo();
  eq([e.text, e.cursor], ["aXbc", 2]);
});

test("moving the cursor ends a typing run", () => {
  const e = ed();
  e.type("a");
  e.type("b");
  e.moveTo(0);
  e.type("c");
  e.undo();
  eq(e.text, "ab");
  e.undo();
  eq(e.text, "");
});

test("backspace is its own step and also ends a typing run", () => {
  const e = ed();
  for (const c of "abc") e.type(c);
  e.backspace();
  e.type("d");
  eq(e.text, "abd");
  e.undo();
  eq(e.text, "ab");
  e.undo();
  eq(e.text, "abc");
  e.undo();
  eq(e.text, "");
  eq(e.canUndo(), false);
});

test("an undo ends a typing run too", () => {
  const e = ed();
  e.type("a");
  e.undo();
  e.type("b");
  e.type("c");
  e.undo();
  eq(e.text, "");
});

test("edits that change nothing record nothing", () => {
  const e = ed();
  e.backspace();
  e.type("");
  eq(e.canUndo(), false);
  e.type("x");
  e.moveTo(0);
  e.backspace();
  e.undo();
  eq(e.text, "");
  eq(e.canUndo(), false);
});

test("maxHistory keeps the most recent steps", () => {
  const e = ed({ text: "abcde", maxHistory: 3 });
  for (let i = 0; i < 5; i++) e.backspace();
  eq(e.text, "");
  eq([e.undo(), e.undo(), e.undo(), e.undo()], [true, true, true, false]);
  eq(e.text, "abc");
});

test("maxHistory counts a typing run as one step", () => {
  const e = ed({ maxHistory: 2 });
  for (const c of "abc") e.type(c);
  e.moveTo(0);
  e.type("X");
  e.moveTo(4);
  e.type("Y");
  eq(e.text, "XabcY");
  eq([e.undo(), e.undo(), e.undo()], [true, true, false]);
  eq(e.text, "abc");
});

test("a batch that changes nothing records nothing", () => {
  const e = ed({ text: "ab" });
  e.batch(() => {
    e.type("x");
    e.backspace();
  });
  eq(e.canUndo(), false);
});

test("nested batches join the outer step", () => {
  const e = ed();
  e.batch(() => {
    e.type("a");
    e.batch(() => {
      e.type("b");
      e.backspace();
      e.type("c");
    });
    e.type("d");
  });
  eq(e.text, "acd");
  e.undo();
  eq(e.text, "");
  eq(e.canUndo(), false);
});

test("a batch ends the typing run before and after it", () => {
  const e = ed();
  e.type("a");
  e.batch(() => e.type("b"));
  e.type("c");
  eq(e.text, "abc");
  e.undo();
  eq(e.text, "ab");
  e.undo();
  eq(e.text, "a");
  e.undo();
  eq(e.text, "");
});

test("batch returns fn's result; if fn throws the edits stay as one step and the error is rethrown", () => {
  const e = ed();
  eq(e.batch(() => 7), 7);
  throws(() => e.batch(() => {
    e.type("a");
    e.type("b");
    throw new Error("boom");
  }), Error);
  eq(e.text, "ab");
  e.undo();
  eq(e.text, "");
});

test("undo and redo return real booleans", () => {
  const e = ed();
  e.type("a");
  eq(e.undo(), true);
  eq(e.redo(), true);
  eq(e.undo(), true);
});

test("ctrl shortcuts are case-insensitive, and ctrl+shift+z redoes", () => {
  const e = ed({ text: "ab" });
  e.backspace();
  eq(keys(e, "Ctrl+Z"), [true]);
  eq(e.text, "ab");
  eq(keys(e, "ctrl+shift+z"), [true]);
  eq(e.text, "a");
  keys(e, "Ctrl+Z");
  eq(keys(e, "CTRL+Y"), [true]);
  eq(e.text, "a");
});

test("ctrl+z with nothing to undo is handled; other ctrl combos are not", () => {
  const e = ed({ text: "ab" });
  eq(keys(e, "ctrl+z", "ctrl+y", "ctrl+q", "ctrl+a"), [true, true, false, false]);
  eq(e.text, "ab");
});

test("an uppercase letter is typed as an uppercase letter", () => {
  const e = ed();
  keys(e, "H", "i", "Z");
  eq(e.text, "HiZ");
});
