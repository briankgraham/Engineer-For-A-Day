// In-memory action cache: cache key -> build output. Counts lookups for the hit-rate dashboard.
function createCache() {
  const entries = new Map();
  const stats = { hits: 0, misses: 0 };
  return {
    get(key) {
      if (entries.has(key)) { stats.hits++; return entries.get(key); }
      stats.misses++;
      return undefined;
    },
    put(key, output) { entries.set(key, output); },
    size() { return entries.size; },
    stats() { return { ...stats }; },
  };
}

module.exports = { createCache };
