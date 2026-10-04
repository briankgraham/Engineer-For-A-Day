const { fulfilled, rejected } = require("./results");

function mapLimit(items, limit, fn, { settle = false, signal } = {}) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError("limit must be a positive integer");
  if (typeof fn !== "function") throw new TypeError("fn must be a function");
  const list = Array.from(items);

  const run = async () => {
    const results = [];
    for (let start = 0; start < list.length; start += limit) {
      if (signal && signal.aborted) throw signal.reason;
      const batch = list.slice(start, start + limit).map((item, j) => {
        try { return Promise.resolve(fn(item, start + j)); } catch (e) { return Promise.reject(e); }
      });
      if (settle) {
        for (const r of await Promise.allSettled(batch)) results.push(r.status === "fulfilled" ? fulfilled(r.value) : rejected(r.reason));
      } else {
        results.push(...(await Promise.all(batch)));
      }
    }
    return results;
  };
  return run();
}

module.exports = { mapLimit };
