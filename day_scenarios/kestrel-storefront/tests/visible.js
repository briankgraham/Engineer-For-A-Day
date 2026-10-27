// storefront.test.js: the app's existing test suite (CI runs it on every PR).
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

test("renderToString escapes text and attribute values, and raw() is the only way around it", () => {
  const { h, raw, renderToString } = require("./h");
  eq(renderToString(h("p", { title: 'a "b"' }, "1 < 2 & 3")), '<p title="a &quot;b&quot;">1 &lt; 2 &amp; 3</p>');
  eq(renderToString(h("button", { disabled: true, hidden: false }, "Go")), "<button disabled>Go</button>");
  eq(renderToString(h("p", {}, raw("<b>x</b>"))), "<p><b>x</b></p>");
  eq(renderToString(h("br")), "<br>");
});

test("the store notifies subscribers only when the state is replaced", () => {
  const { app } = mk();
  let n = 0;
  const off = app.store.subscribe(() => n++);
  app.store.update(s => s);
  eq(n, 0);
  app.store.update(s => ({ ...s }));
  eq(n, 1);
  off();
  app.store.update(s => ({ ...s }));
  eq(n, 1);
});

test("loadCart puts the server's lines in the store, in order", async () => {
  const { app, calls } = mk();
  const p = app.loadCart();
  eq([calls[0].method, calls[0].url], ["GET", "/api/cart"]);
  calls[0].reply(CART);
  await p;
  const cart = app.store.getState().cart;
  eq(cart.order, ["oat-milk", "mug"]);
  eq([cart.items.mug.qty, cart.items.mug.confirmed, cart.items.mug.pending], [1, 1, false]);
});

test("a failed request throws an error with a code", async () => {
  const { app, calls } = mk();
  const p = app.loadCart();
  calls[0].reply({}, 500);
  let code = null;
  try { await p; } catch (e) { code = e.code; }
  eq(code, "HTTP_500");
  const q = app.loadCart();
  calls[1].fail();
  try { await q; } catch (e) { code = e.code; }
  eq(code, "NETWORK");
});

test("a search sends the trimmed, encoded query and shows the results", async () => {
  const { app, calls } = mk();
  const p = app.setQuery(" red shoes ");
  eq(calls[0].url, "/api/search?q=red%20shoes");
  eq(app.getSearch().status, "loading");
  calls[0].reply({ items: [{ sku: "s1", title: "Red shoes", price: 5900 }] });
  await p;
  const s = app.getSearch();
  eq([s.query, s.status, s.resultsFor, s.items.length], [" red shoes ", "ready", "red shoes", 1]);
});

test("a query shorter than searchMinChars sends nothing and clears the results", async () => {
  const { app, calls } = mk({ flags: { searchMinChars: 3 } });
  const p = app.setQuery("shoes");
  calls[0].reply({ items: [{ sku: "s1", title: "Shoes", price: 100 }] });
  await p;
  await app.setQuery("sh");
  eq(calls.length, 1);
  const s = app.getSearch();
  eq([s.status, s.items.length, s.resultsFor], ["idle", 0, ""]);
});

test("setQuery rejects anything but a string, and a blank query sends nothing", async () => {
  const { app, calls } = mk();
  throws(() => app.setQuery(42), TypeError);
  await app.setQuery("   ");
  eq(calls.length, 0);
  eq(app.getSearch().status, "idle");
});

test("a failed search shows the error code", async () => {
  const { app, calls } = mk();
  const p = app.setQuery("shoes");
  calls[0].reply({}, 503);
  await p;
  const s = app.getSearch();
  eq([s.status, s.error], ["error", "HTTP_503"]);
});

test("renderSearch escapes seller titles and the query", async () => {
  const { app, calls } = mk();
  const p = app.setQuery("<i>");
  calls[0].reply({ items: [{ sku: "s1", title: "Tom & Jerry <script>x</script>", price: 100 }] });
  await p;
  const html = app.renderSearch();
  assert(!html.includes("<script>") && !html.includes("<i>"), "markup must be escaped");
  assert(html.includes("Tom &amp; Jerry &lt;script&gt;"), "text is kept");
});

test("getSearch returns copies", async () => {
  const { app, calls } = mk();
  const p = app.setQuery("shoes");
  calls[0].reply({ items: [{ sku: "s1", title: "Shoes", price: 100 }] });
  await p;
  const s = app.getSearch();
  s.items[0].title = "changed";
  s.items.push({});
  eq(app.getSearch().items.map(i => i.title), ["Shoes"]);
});
