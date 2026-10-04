// Hidden edge cases (run when the candidate finishes, on top of visible_tests.js)
const { Router } = require("./router");
const { mkRes } = require("./response");
const req = (method, path) => ({ method, path });

test("an error handler registered before the failing layer never sees the error", async () => {
  const router = new Router();
  const ran = [];
  router.use((err, req, res, next) => {
    ran.push("early error handler");
    res.status(500).send({ error: err.message });
  });
  router.get("/x", (req, res, next) => {
    next(new Error("boom"));
  });
  const res = mkRes();
  await router.handle(req("GET", "/x"), res);
  eq(ran, []); // the early handler must never run
  eq(res.statusCode, 500); // still falls through to the default 500
  eq(res.sent, true);
});

test("an error handler registered after the failing layer does catch it", async () => {
  const router = new Router();
  const ran = [];
  router.get("/x", (req, res, next) => {
    next(new Error("boom"));
  });
  router.use((err, req, res, next) => {
    ran.push("late error handler: " + err.message);
    res.status(500).send({ error: err.message });
  });
  const res = mkRes();
  await router.handle(req("GET", "/x"), res);
  eq(ran, ["late error handler: boom"]);
});

test("a layer's second call to next() has no effect, even if downstream is still pending", async () => {
  const router = new Router();
  const order = [];
  const d = mkDeferred();
  router.use((req, res, next) => {
    next();
    next(); // a bug in this middleware: calling next() twice
  });
  router.use(async (req, res, next) => {
    order.push("b-start");
    await d.promise;
    order.push("b-resume");
    next();
  });
  router.get("/x", (req, res) => {
    order.push("c");
    res.send({ ok: true });
  });
  const res = mkRes();
  const p = router.handle(req("GET", "/x"), res);
  await flush();
  eq(order, ["b-start"]); // the second next() must not have skipped ahead to c
  eq(res.sent, false);
  d.resolve();
  await p;
  eq(order, ["b-start", "b-resume", "c"]);
  eq(res.body, { ok: true });
});

test("a next() call after a response was already sent runs nothing else", async () => {
  const router = new Router();
  const d = mkDeferred();
  router.use(async (req, res, next) => {
    res.send({ from: "first" });
    await d.promise;
    next(); // straggler, arrives after the response already went out
  });
  router.use((req, res) => {
    res.send({ from: "second" }); // must never run
  });
  const res = mkRes();
  const p = router.handle(req("GET", "/x"), res);
  await flush();
  eq(res.body, { from: "first" });
  d.resolve();
  await p;
  eq(res.body, { from: "first" });
});

test("an unhandled error at the end of the stack gets a default 500 with the error's message", async () => {
  const router = new Router();
  router.get("/x", (req, res, next) => {
    next(new Error("nobody catches this"));
  });
  const res = mkRes();
  await router.handle(req("GET", "/x"), res);
  eq(res.sent, true);
  eq(res.statusCode, 500);
  eq(res.body, { error: "nobody catches this" });
});

test("calling next() with no argument inside an error handler clears the error and resumes normal routing", async () => {
  const router = new Router();
  const order = [];
  router.get("/x", (req, res, next) => {
    next(new Error("boom"));
  });
  router.use((err, req, res, next) => {
    order.push("recovered");
    next(); // no argument: treat the error as handled and continue normally
  });
  router.use((req, res) => {
    order.push("normal again");
    res.send({ ok: true });
  });
  const res = mkRes();
  await router.handle(req("GET", "/x"), res);
  eq(order, ["recovered", "normal again"]);
  eq(res.body, { ok: true });
});

test("an error thrown inside an error handler is passed to the next error handler", async () => {
  const router = new Router();
  router.get("/x", (req, res, next) => {
    next(new Error("first"));
  });
  router.use((err, req, res, next) => {
    throw new Error("from the handler itself");
  });
  router.use((err, req, res, next) => {
    res.status(500).send({ error: err.message });
  });
  const res = mkRes();
  await router.handle(req("GET", "/x"), res);
  eq(res.body, { error: "from the handler itself" });
});

test("post() does not match a get request to the same path", async () => {
  const router = new Router();
  router.post("/x", (req, res) => res.send({ from: "post" }));
  const res = mkRes();
  await router.handle(req("GET", "/x"), res);
  eq(res.statusCode, 404);
});
