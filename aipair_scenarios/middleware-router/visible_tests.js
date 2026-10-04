// Read-only: these are the tests you can see. A few extra edge cases run when you finish.
const { Router } = require("./router");
const { mkRes } = require("./response");
const req = (method, path) => ({ method, path });

// ---- happy path (passes today) ----
test("use() middleware runs for every request, before route handlers, in registration order", async () => {
  const router = new Router();
  const order = [];
  router.use((req, res, next) => {
    order.push("a");
    next();
  });
  router.use((req, res, next) => {
    order.push("b");
    next();
  });
  router.get("/x", (req, res) => {
    order.push("c");
    res.send({ ok: true });
  });
  const res = mkRes();
  await router.handle(req("GET", "/x"), res);
  eq(order, ["a", "b", "c"]);
  eq(res.body, { ok: true });
});

test("get() and post() only run for the matching method and path", async () => {
  const router = new Router();
  const hit = [];
  router.get("/a", (req, res) => {
    hit.push("get /a");
    res.send({});
  });
  router.post("/a", (req, res) => {
    hit.push("post /a");
    res.send({});
  });
  router.get("/b", (req, res) => {
    hit.push("get /b");
    res.send({});
  });
  await router.handle(req("POST", "/a"), mkRes());
  eq(hit, ["post /a"]);
});

test("multiple handlers on one route run in order until one sends a response", async () => {
  const router = new Router();
  const order = [];
  router.get(
    "/x",
    (req, res, next) => {
      order.push(1);
      next();
    },
    (req, res) => {
      order.push(2);
      res.send({ from: "second handler" });
    }
  );
  const res = mkRes();
  await router.handle(req("GET", "/x"), res);
  eq(order, [1, 2]);
  eq(res.body, { from: "second handler" });
});

// ---- fallbacks and error handling (mostly not built yet) ----
test("an unmatched route gets a default 404", async () => {
  const router = new Router();
  router.get("/x", (req, res) => res.send({}));
  const res = mkRes();
  await router.handle(req("GET", "/nope"), res);
  eq(res.sent, true);
  eq(res.statusCode, 404);
});

test("next(err) skips remaining normal handlers and jumps to an error handler", async () => {
  const router = new Router();
  const order = [];
  router.get("/x", (req, res, next) => {
    order.push("route");
    next(new Error("boom"));
  });
  router.use((req, res, next) => {
    order.push("normal middleware after"); // must be skipped while an error is pending
    next();
  });
  router.use((err, req, res, next) => {
    order.push("error handler: " + err.message);
    res.status(500).send({ error: err.message });
  });
  const res = mkRes();
  await router.handle(req("GET", "/x"), res);
  eq(order, ["route", "error handler: boom"]);
  eq(res.statusCode, 500);
});

test("a synchronous throw is treated like next(err)", async () => {
  const router = new Router();
  router.get("/x", (req, res) => {
    throw new Error("kaboom");
  });
  router.use((err, req, res, next) => {
    res.status(500).send({ error: err.message });
  });
  const res = mkRes();
  await router.handle(req("GET", "/x"), res);
  eq(res.statusCode, 500);
  eq(res.body, { error: "kaboom" });
});

test("an async handler that rejects reaches the error handler too", async () => {
  const router = new Router();
  router.get("/x", async (req, res) => {
    throw new Error("async kaboom");
  });
  router.use((err, req, res, next) => {
    res.status(500).send({ error: err.message });
  });
  const res = mkRes();
  await router.handle(req("GET", "/x"), res);
  eq(res.statusCode, 500);
  eq(res.body, { error: "async kaboom" });
});
