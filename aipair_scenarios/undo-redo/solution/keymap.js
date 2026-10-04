// Turns key presses into editor calls. Returns true if the key was handled (so the caller can preventDefault).
function handleKey(editor, key) {
  const lower = key.toLowerCase();
  if (lower.startsWith("ctrl+")) {
    if (lower === "ctrl+z") {
      editor.undo();
      return true;
    }
    if (lower === "ctrl+y" || lower === "ctrl+shift+z") {
      editor.redo();
      return true;
    }
    return false;
  }
  if (key.length === 1) {
    editor.type(key);
    return true;
  }
  switch (key) {
    case "Enter":
      editor.type("\n");
      return true;
    case "Backspace":
      editor.backspace();
      return true;
    case "ArrowLeft":
      editor.moveTo(Math.max(0, editor.cursor - 1));
      return true;
    case "ArrowRight":
      editor.moveTo(Math.min(editor.text.length, editor.cursor + 1));
      return true;
    default:
      return false;
  }
}

module.exports = { handleKey };
