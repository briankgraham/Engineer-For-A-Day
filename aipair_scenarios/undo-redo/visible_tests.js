// Read-only: these are the tests you can see. A few extra edge cases run when you finish.
const ed = opts => new (require("./editor").Editor)(opts);
const keys = (e, ...ks) => ks.map(k => require("./keymap").handleKey(e, k));

// ---- existing behavior (passes today, keep it passing) ----
test("a new editor starts with the cursor at the end", () => {
  const e = ed({ text: "abc" });
  eq([e.text, e.cursor], ["abc", 3]);
});

test("type inserts at the cursor and moves it", () => {
  const e = ed({ text: "ac" });
  e.moveTo(1);
  e.type("b");
  eq([e.text, e.cursor], ["abc", 2]);
});

test("moveTo rejects a position outside the text", () => {
  const e = ed({ text: "ab" });
  throws(() => e.moveTo(3), RangeError);
  throws(() => e.moveTo(-1), RangeError);
});

test("backspace deletes the character before the cursor, and does nothing at the start", () => {
  const e = ed({ text: "abc" });
  e.backspace();
  eq([e.text, e.cursor], ["ab", 2]);
  e.moveTo(0);
  e.backspace();
  eq([e.text, e.cursor], ["ab", 0]);
});

test("keymap types characters, Enter, and moves with the arrows", () => {
  const e = ed();
  eq(keys(e, "h", "i", "Enter", "ArrowLeft", "x", "ArrowRight", "ArrowRight"), [true, true, true, true, true, true, true]);
  eq(e.text, "hix\n");
});

test("keymap returns false for keys it does not know", () => {
  eq(keys(ed(), "F5", "Escape"), [false, false]);
});

// ---- undo and redo (new) ----
test("undo reverses a backspace and redo applies it again", () => {
  const e = ed({ text: "abc" });
  e.backspace();
  eq(e.undo(), true);
  eq(e.text, "abc");
  eq(e.redo(), true);
  eq(e.text, "ab");
});

test("undo and redo return false when there is nothing to do", () => {
  const e = ed({ text: "abc" });
  eq([e.undo(), e.redo(), e.canUndo(), e.canRedo()], [false, false, false, false]);
});

test("a run of typing is one undo step", () => {
  const e = ed();
  for (const c of "hello") e.type(c);
  e.undo();
  eq(e.text, "");
  e.redo();
  eq(e.text, "hello");
});

test("batch groups several edits into one step", () => {
  const e = ed({ text: "abc" });
  e.batch(() => {
    e.backspace();
    e.backspace();
    e.type("Z");
  });
  eq(e.text, "aZ");
  e.undo();
  eq(e.text, "abc");
  eq(e.canUndo(), false);
});

test("ctrl+z undoes and ctrl+y redoes through the keymap", () => {
  const e = ed({ text: "ab" });
  e.backspace();
  eq(keys(e, "ctrl+z"), [true]);
  eq(e.text, "ab");
  eq(keys(e, "ctrl+y"), [true]);
  eq(e.text, "a");
});
