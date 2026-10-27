// Tiny view helpers (the storefront has no DOM in this repo; views render to HTML strings).
// h(tag, props, ...children) builds a node and renderToString(node) turns it into HTML. Text and attribute values are escaped.
// raw(html) marks a string that is already safe HTML (static markup such as an icon). Never pass user or seller text to raw.
const VOID = new Set(["br", "hr", "img", "input", "meta", "link"]);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function h(tag, props, ...children) {
  return { tag, props: props || {}, children: children.flat() };
}

function raw(html) {
  return { raw: String(html) };
}

function renderToString(node) {
  if (node === null || node === undefined || node === false) return "";
  if (typeof node !== "object") return esc(node);
  if ("raw" in node) return node.raw;
  const attrs = Object.entries(node.props)
    .filter(([, v]) => v !== false && v !== null && v !== undefined)
    .map(([k, v]) => (v === true ? " " + k : " " + k + '="' + esc(v) + '"'))
    .join("");
  if (VOID.has(node.tag)) return "<" + node.tag + attrs + ">";
  return "<" + node.tag + attrs + ">" + node.children.map(renderToString).join("") + "</" + node.tag + ">";
}

module.exports = { h, raw, renderToString };
