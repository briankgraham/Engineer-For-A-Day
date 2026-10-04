// Flawed on purpose: splits into lines first, then splits each line into fields.
function parseCSV(text, { delimiter = ",", header = false } = {}) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  if (typeof delimiter !== "string" || delimiter.length !== 1 || delimiter === '"' || delimiter === "\r" || delimiter === "\n") {
    throw new RangeError("delimiter must be a single character other than a quote or a newline");
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const lines = text.split(/\r?\n/);
  if (lines[lines.length - 1] === "") lines.pop();
  const rows = lines.map(line => {
    const out = [];
    let field = "", quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"') {
          if (line[i + 1] === '"') { field += '"'; i++; } else quoted = false;
        } else field += c;
      } else if (c === '"' && field === "") quoted = true;
      else if (c === delimiter) { out.push(field); field = ""; }
      else field += c;
    }
    out.push(field);
    return out;
  });
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
    names.forEach((name, j) => { o[name] = j < r.length ? r[j] : ""; });
    return o;
  });
}

module.exports = { parseCSV };
