// Hidden: INC-0912 (stale search results). Runs when the day ends.
function mk(opts = {}) {
  const { createApp } = require("./app");
  const clock = mkClock();
  const calls = [];
  // A fake fetch: every request waits in calls until the test answers it with reply(json, status) or fail().
  const fetch = (url, o = {}) => new Promise((resolve, reject) => {
    calls.push({
      url, method: o.method || "GET", body: o.body ? JSON.parse(o.body) : undefined,
      reply: (json, status = 200) => resolve({ ok: status < 400, status, json: async () => json }),
      fail: () => reject(new Error("offline")),
    });
  });
  const app = createApp({ fetch, now: clock.now, ...opts });
  return { app, calls, clock };
}
const CART = { items: [{ sku: "oat-milk", title: "Oat milk", unitPrice: 250, qty: 2 }, { sku: "mug", title: "Enamel mug", unitPrice: 1200, qty: 1 }] };
// An app whose cart is already loaded.
async function loaded(opts) {
  const t = mk(opts);
  const p = t.app.loadCart();
  t.calls[0].reply(CART);
  await p;
  t.calls.length = 0;
  return t;
}
const shoes = { items: [{ sku: "s1", title: "Running shoes", price: 5900 }] };
const shirts = { items: [{ sku: "x1", title: "Shirt", price: 2000 }, { sku: "x2", title: "Shorts", price: 2500 }] };

test("a slow answer for an old query does not replace the results of the newer one", async () => {
  const { app, calls } = mk();
  const a = app.setQuery("sh");
  const b = app.setQuery("shoes");
  eq(calls.map(c => c.url), ["/api/search?q=sh", "/api/search?q=shoes"]);
  calls[1].reply(shoes);
  await b;
  calls[0].reply(shirts);
  await a;
  const s = app.getSearch();
  eq([s.query, s.status, s.resultsFor], ["shoes", "ready", "shoes"]);
  eq(s.items.map(i => i.sku), ["s1"]);
});

test("while the newest query is still loading, an old answer is not shown", async () => {
  const { app, calls } = mk();
  const a = app.setQuery("sh");
  app.setQuery("shoes");
  calls[0].reply(shirts);
  await a;
  const s = app.getSearch();
  eq([s.status, s.items.length, s.resultsFor], ["loading", 0, ""]);
});

test("an old failure does not replace newer results", async () => {
  const { app, calls } = mk();
  const a = app.setQuery("sh");
  const b = app.setQuery("shoes");
  calls[1].reply(shoes);
  await b;
  calls[0].fail();
  await a;
  const s = app.getSearch();
  eq([s.status, s.error, s.items.length], ["ready", null, 1]);
});

test("the newest query's failure is shown, and an older success cannot hide it", async () => {
  const { app, calls } = mk();
  const a = app.setQuery("sh");
  const b = app.setQuery("shoes");
  calls[1].reply({}, 503);
  await b;
  calls[0].reply(shirts);
  await a;
  const s = app.getSearch();
  eq([s.status, s.error, s.items.length], ["error", "HTTP_503", 0]);
});

test("clearing the box while a request is in flight: the late answer does not bring results back", async () => {
  const { app, calls } = mk();
  const a = app.setQuery("shoes");
  await app.setQuery("");
  calls[0].reply(shoes);
  await a;
  const s = app.getSearch();
  eq([s.query, s.status, s.items.length, s.resultsFor], ["", "idle", 0, ""]);
});

test("typing the same query twice: only the newest request's answer is used", async () => {
  const { app, calls } = mk();
  const a = app.setQuery("shoes");
  const b = app.setQuery("shoes");
  calls[1].reply(shoes);
  await b;
  calls[0].reply(shirts);
  await a;
  eq(app.getSearch().items.map(i => i.sku), ["s1"]);
});
