const { fulfilled, rejected } = require("./results");

function mapLimit(items, limit, fn, { settle = false, signal } = {}) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError("limit must be a positive integer");
  if (typeof fn !== "function") throw new TypeError("fn must be a function");
  const list = Array.from(items);

  return new Promise((resolve, reject) => {
    const results = new Array(list.length);
    let next = 0, running = 0, done = 0, stopped = false, launching = false;

    const onAbort = () => stop(signal.reason);
    const cleanup = () => { if (signal) signal.removeEventListener("abort", onAbort); };
    const stop = err => { if (stopped) return; stopped = true; cleanup(); reject(err); };
    const finish = () => { stopped = true; cleanup(); resolve(results); };

    // One call to fn has ended (ok = it returned or resolved, otherwise it threw or rejected).
    const settleOne = (i, ok, val) => {
      running--; done++;
      if (stopped) return;
      if (ok) results[i] = settle ? fulfilled(val) : val;
      else if (settle) results[i] = rejected(val);
      else return stop(val);
      if (done === list.length) return finish();
      launch();
    };

    const launch = () => {
      if (launching) return; // a synchronous failure inside the loop below must not recurse
      launching = true;
      while (!stopped && running < limit && next < list.length) {
        const i = next++;
        running++;
        let p;
        try { p = fn(list[i], i); } catch (e) { settleOne(i, false, e); continue; }
        Promise.resolve(p).then(v => settleOne(i, true, v), e => settleOne(i, false, e));
      }
      launching = false;
    };

    if (signal) {
      if (signal.aborted) return stop(signal.reason);
      signal.addEventListener("abort", onAbort);
    }
    if (list.length === 0) return finish();
    launch();
  });
}

module.exports = { mapLimit };
