// The text buffer. This file works; editor.js and keymap.js build on it.
class Doc {
  constructor(text = "") {
    this.text = text;
  }

  insert(pos, str) {
    if (!Number.isInteger(pos) || pos < 0 || pos > this.text.length) throw new RangeError("bad position");
    this.text = this.text.slice(0, pos) + str + this.text.slice(pos);
  }

  remove(pos, len) {
    if (!Number.isInteger(pos) || pos < 0 || len < 0 || pos + len > this.text.length) throw new RangeError("bad range");
    this.text = this.text.slice(0, pos) + this.text.slice(pos + len);
  }

  setText(text) {
    this.text = text;
  }
}

module.exports = { Doc };
