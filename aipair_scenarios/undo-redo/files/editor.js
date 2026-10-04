// A single-cursor text editor on top of Doc. Everything here works today.
const { Doc } = require("./document");

class Editor {
  constructor({ text = "", maxHistory = 100 } = {}) {
    this.doc = new Doc(text);
    this.pos = text.length; // cursor starts at the end
    this.maxHistory = maxHistory;
  }

  get text() {
    return this.doc.text;
  }

  get cursor() {
    return this.pos;
  }

  moveTo(pos) {
    if (!Number.isInteger(pos) || pos < 0 || pos > this.doc.text.length) throw new RangeError("bad cursor position");
    this.pos = pos;
  }

  type(str) {
    this.doc.insert(this.pos, str);
    this.pos += str.length;
  }

  backspace() {
    if (this.pos === 0) return;
    this.doc.remove(this.pos - 1, 1);
    this.pos -= 1;
  }
}

module.exports = { Editor };
