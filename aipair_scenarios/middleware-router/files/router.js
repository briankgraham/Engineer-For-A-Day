// A minimal middleware router: layers run in registration order along the happy path. Error handlers, async
// failures, the next() guard, and default responses for unmatched routes or unhandled errors still need work.
class Router {
  constructor() {
    this.stack = [];
  }

  use(fn) {
    this.stack.push({ method: null, path: null, fn });
  }

  get(path, ...fns) {
    for (const fn of fns) this.stack.push({ method: "GET", path, fn });
  }

  post(path, ...fns) {
    for (const fn of fns) this.stack.push({ method: "POST", path, fn });
  }

  handle(req, res) {
    const stack = this.stack;
    let i = 0;
    return new Promise(resolve => {
      const step = () => {
        if (res.sent) return resolve();
        const layer = stack[i++];
        if (!layer) return resolve();
        if (layer.method && (layer.method !== req.method || layer.path !== req.path)) return step();
        const next = () => step();
        layer.fn(req, res, next);
        if (res.sent) resolve();
      };
      step();
    });
  }
}

module.exports = { Router };
