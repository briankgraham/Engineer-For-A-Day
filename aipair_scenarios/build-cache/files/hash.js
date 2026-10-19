// FNV-1a (32-bit) as 8 hex characters. Each part is length-prefixed, so ("ab", "c") and ("a", "bc") differ.
function checksum(...parts) {
  let h = 0x811c9dc5;
  for (const p of parts) {
    const s = String(p).length + ":" + p + ";";
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  return h.toString(16).padStart(8, "0");
}

module.exports = { checksum };
