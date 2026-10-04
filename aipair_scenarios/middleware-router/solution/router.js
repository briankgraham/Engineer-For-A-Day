// A small Express-style router: use()/get()/post() add layers to one ordered stack; handle() walks it per request.
// A layer is a normal handler (req, res, next) unless it declares four parameters (err, req, res, next), an error handler.
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
    let err = null;

    return new Promise(resolve => {
      const step = () => {
        if (res.sent) return resolve();
        if (i >= stack.length) {
          if (err) res.status(500).send({ error: String((err && err.message) || err) });
          else res.status(404).send({ error: "not found" });
          return resolve();
        }
        const layer = stack[i++];
        const isErrorLayer = layer.fn.length >= 4;
        if (err) {
          if (!isErrorLayer) return step();
        } else {
          if (isErrorLayer) return step();
          if (layer.method && (layer.method !== req.method || layer.path !== req.path)) return step();
        }

        let called = false;
        const next = nextErr => {
          if (called) return;
          called = true;
          if (nextErr !== undefined) err = nextErr;
          else if (isErrorLayer) err = null;
          step();
        };

        try {
          const ret = isErrorLayer ? layer.fn(err, req, res, next) : layer.fn(req, res, next);
          if (ret && typeof ret.then === "function") {
            ret.then(() => {
              if (res.sent) resolve();
            }, next);
          } else if (res.sent) {
            resolve();
          }
        } catch (e) {
          next(e);
        }
      };
      step();
    });
  }
}

module.exports = { Router };
