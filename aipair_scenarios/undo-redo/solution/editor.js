// A single-cursor text editor on top of Doc, with undo/redo.
const { Doc } = require("./document");

class Editor {
  constructor({ text = "", maxHistory = 100 } = {}) {
    this.doc = new Doc(text);
    this.pos = text.length; // cursor starts at the end
    this.maxHistory = maxHistory;
    this.undoStack = []; // steps: { before: { text, cursor }, after: { text, cursor } }
    this.redoStack = [];
    this.typing = false; // is the top undo step a run of type() calls we can extend?
    this.batchStep = null;
  }

  get text() {
    return this.doc.text;
  }

  get cursor() {
    return this.pos;
  }

  _snapshot() {
    return { text: this.doc.text, cursor: this.pos };
  }

  _push(step) {
    this.undoStack.push(step);
    this.redoStack.length = 0;
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
  }

  // Runs one edit and records it as an undo step, or folds it into the current typing run or batch.
  _record(kind, fn) {
    if (kind !== "type") this.typing = false;
    const before = this._snapshot();
    fn();
    const after = this._snapshot();
    if (before.text === after.text) return; // nothing changed: nothing to undo
    if (this.batchStep) return;
    if (kind === "type" && this.typing) {
      this.undoStack[this.undoStack.length - 1].after = after;
      return;
    }
    this._push({ before, after });
    this.typing = kind === "type";
  }

  moveTo(pos) {
    if (!Number.isInteger(pos) || pos < 0 || pos > this.doc.text.length) throw new RangeError("bad cursor position");
    this.pos = pos;
    this.typing = false;
  }

  type(str) {
    this._record("type", () => {
      this.doc.insert(this.pos, str);
      this.pos += str.length;
    });
  }

  backspace() {
    this._record("backspace", () => {
      if (this.pos === 0) return;
      this.doc.remove(this.pos - 1, 1);
      this.pos -= 1;
    });
  }

  batch(fn) {
    if (this.batchStep) return fn(); // nested: joins the outer step
    this.typing = false;
    this.batchStep = { before: this._snapshot() };
    try {
      return fn();
    } finally {
      const { before } = this.batchStep;
      this.batchStep = null;
      const after = this._snapshot();
      if (before.text !== after.text) this._push({ before, after });
      this.typing = false;
    }
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  undo() {
    if (!this.undoStack.length) return false;
    const step = this.undoStack.pop();
    this.doc.setText(step.before.text);
    this.pos = step.before.cursor;
    this.redoStack.push(step);
    this.typing = false;
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;
    const step = this.redoStack.pop();
    this.doc.setText(step.after.text);
    this.pos = step.after.cursor;
    this.undoStack.push(step);
    this.typing = false;
    return true;
  }
}

module.exports = { Editor };
