function retry(task, options, callback) {
  if (typeof task !== "function") throw new TypeError("task must be a function");
  if (typeof callback !== "function") throw new TypeError("callback must be a function");
  const opts = options || {};
  const { attempts = 3, baseMs = 100, factor = 2, maxMs = Infinity, shouldRetry = () => true } = opts;
  if (!Number.isInteger(attempts) || attempts < 1) throw new RangeError("attempts must be a positive integer");
  if (typeof baseMs !== "number" || !Number.isFinite(baseMs) || baseMs < 0) throw new RangeError("baseMs must be a non-negative number");
  if (typeof factor !== "number" || !(factor >= 1)) throw new RangeError("factor must be a number >= 1");
  if (typeof maxMs !== "number" || !(maxMs >= 0)) throw new RangeError("maxMs must be a number >= 0");
  const timers = opts.timers || { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: id => clearTimeout(id) };

  let attempt = 0, timer = null, done = false;

  function finish(err, value) {
    if (done) return;
    done = true;
    if (err != null) callback(err);
    else callback(null, value);
  }

  function run() {
    timer = null;
    attempt++;
    const n = attempt;
    let answered = false;
    task((err, value) => {
      if (done || answered) return;
      answered = true;
      if (err == null) return finish(null, value);
      if (n < attempts && shouldRetry(err, n)) {
        timer = timers.setTimeout(run, Math.min(maxMs, baseMs * factor ** (n - 1)));
      } else {
        finish(err);
      }
    });
  }

  run();

  return {
    cancel() {
      done = true;
      if (timer !== null) {
        timers.clearTimeout(timer);
        timer = null;
      }
    },
  };
}

module.exports = { retry };
