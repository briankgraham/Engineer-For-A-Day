function parseCSV(text, { delimiter = ",", header = false } = {}) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  if (typeof delimiter !== "string" || delimiter.length !== 1 || delimiter === '"' || delimiter === "\r" || delimiter === "\n") {
    throw new RangeError("delimiter must be a single character other than a quote or a newline");
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const n = text.length;
  const isEol = i => text[i] === "\n" || (text[i] === "\r" && text[i + 1] === "\n");
  const rows = [];
  let i = 0, line = 1;

  while (i < n) {
    const row = [];
    for (;;) {
      let field = "";
      if (text[i] === '"') {
        const startLine = line;
        i++;
        let closed = false;
        while (i < n) {
          const c = text[i];
          if (c === '"') {
            if (text[i + 1] === '"') {
              field += '"';
              i += 2;
              continue;
            }
            i++;
            closed = true;
            break;
          }
          if (c === "\n") line++;
          field += c;
          i++;
        }
        if (!closed) throw new Error(`Unterminated quoted field starting on line ${startLine}`);
        if (i < n && text[i] !== delimiter && !isEol(i)) throw new Error(`Unexpected character after closing quote on line ${line}`);
      } else {
        while (i < n && text[i] !== delimiter && !isEol(i)) field += text[i++];
      }
      row.push(field);
      if (i < n && text[i] === delimiter) {
        i++;
        continue; // another field follows, possibly an empty one at the end of the input
      }
      break;
    }
    rows.push(row);
    if (i < n) {
      i += text[i] === "\r" ? 2 : 1;
      line++;
    }
  }

  if (!header) return rows;
  if (rows.length === 0) return [];
  const names = rows[0];
  const seen = new Set();
  for (const name of names) {
    if (seen.has(name)) throw new Error(`Duplicate header: ${name}`);
    seen.add(name);
  }
  return rows.slice(1).map((r, k) => {
    if (r.length > names.length) throw new Error(`Row ${k + 1} has ${r.length} fields but the header has ${names.length}`);
    const o = {};
    names.forEach((name, j) => {
      o[name] = j < r.length ? r[j] : "";
    });
    return o;
  });
}

module.exports = { parseCSV };
