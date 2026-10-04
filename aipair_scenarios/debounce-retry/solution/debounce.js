function debounce(fn, waitMs, options = {}) {
  const { leading = false, trailing = true } = options;
  if (typeof fn !== "function") throw new TypeError("fn must be a function");
  if (typeof waitMs !== "number" || !Number.isFinite(waitMs) || waitMs < 0) throw new RangeError("waitMs must be a non-negative number");
  if (!leading && !trailing) throw new RangeError("leading and trailing cannot both be false");
  const timers = options.timers || { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: id => clearTimeout(id) };

  let timer = null, hasPending = false, pendingArgs = null, pendingThis, result;

  function invoke(args, ctx) {
    result = fn.apply(ctx, args);
    return result;
  }

  function onQuiet() {
    timer = null;
    if (trailing && hasPending) {
      const args = pendingArgs, ctx = pendingThis;
      hasPending = false;
      pendingArgs = null;
      invoke(args, ctx);
    }
    hasPending = false;
    pendingArgs = null;
  }

  function debounced(...args) {
    const startingBurst = timer === null;
    if (timer !== null) timers.clearTimeout(timer);
    timer = timers.setTimeout(onQuiet, waitMs);
    if (startingBurst && leading) {
      hasPending = false;
      pendingArgs = null;
      return invoke(args, this);
    }
    pendingArgs = args;
    pendingThis = this;
    hasPending = true;
    return result;
  }

  debounced.cancel = () => {
    if (timer !== null) timers.clearTimeout(timer);
    timer = null;
    hasPending = false;
    pendingArgs = null;
  };

  debounced.flush = () => {
    if (trailing && hasPending) {
      if (timer !== null) timers.clearTimeout(timer);
      timer = null;
      const args = pendingArgs, ctx = pendingThis;
      hasPending = false;
      pendingArgs = null;
      return invoke(args, ctx);
    }
    return result;
  };

  debounced.pending = () => trailing && hasPending;

  return debounced;
}

module.exports = { debounce };
