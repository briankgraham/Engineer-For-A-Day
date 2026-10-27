// Hidden: KES-318 (cart quantity stepper). Runs when the day ends.
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
const line = (app, sku) => app.getCart().lines.find(l => l.sku === sku);

test("setQuantity validates the quantity and the sku before doing anything", async () => {
  const { app, calls } = await loaded();
  for (const bad of [-1, 11, 1.5, NaN, "2", null, undefined]) throws(() => app.setQuantity("oat-milk", bad), RangeError, "qty " + String(bad));
  let code = null;
  try { app.setQuantity("nope", 1); } catch (e) { code = e.code; }
  eq(code, "ITEM_NOT_IN_CART");
  eq(calls.length, 0, "nothing was sent");
});

test("the new quantity shows at once, the request carries it, and the promise resolves with the confirmed line", async () => {
  const { app, calls } = await loaded();
  const p = app.setQuantity("oat-milk", 4);
  const l = line(app, "oat-milk");
  eq([l.qty, l.pending, l.lineTotal], [4, true, 1000]);
  eq(calls.length, 1);
  eq([calls[0].method, calls[0].url], ["PUT", "/api/cart/items/oat-milk"]);
  eq(calls[0].body.qty, 4);
  calls[0].reply({ sku: "oat-milk", qty: 4, available: 9 });
  const r = await p;
  eq([r.sku, r.qty], ["oat-milk", 4]);
  eq(line(app, "oat-milk").pending, false);
  eq([app.getCart().subtotal, app.getCart().count], [4 * 250 + 1200, 5]);
});

test("changes made while a request is in flight are folded into one more request", async () => {
  const { app, calls } = await loaded();
  const p1 = app.setQuantity("oat-milk", 3);
  const p2 = app.setQuantity("oat-milk", 4);
  const p3 = app.setQuantity("oat-milk", 5);
  eq(line(app, "oat-milk").qty, 5, "the screen follows the shopper");
  eq(calls.length, 1, "one request in flight per sku");
  calls[0].reply({ sku: "oat-milk", qty: 3, available: 9 });
  await flush();
  eq(line(app, "oat-milk").qty, 5, "the answer for 3 must not overwrite the wanted 5");
  eq(line(app, "oat-milk").pending, true);
  eq(calls.length, 2);
  eq(calls[1].body.qty, 5);
  calls[1].reply({ sku: "oat-milk", qty: 5, available: 9 });
  const rs = await Promise.all([p1, p2, p3]);
  eq(rs.map(r => r.qty), [5, 5, 5]);
  eq(line(app, "oat-milk").pending, false);
});

test("asking again for the quantity already in flight sends nothing more, and other skus do not wait", async () => {
  const { app, calls } = await loaded();
  const a = app.setQuantity("oat-milk", 3);
  const b = app.setQuantity("oat-milk", 3);
  const c = app.setQuantity("mug", 2);
  eq(calls.length, 2, "one for oat-milk, one for mug");
  calls[0].reply({ sku: "oat-milk", qty: 3, available: 9 });
  calls[1].reply({ sku: "mug", qty: 2, available: 9 });
  await Promise.all([a, b, c]);
  eq(calls.length, 2);
  eq([line(app, "oat-milk").qty, line(app, "mug").qty], [3, 2]);
});

test("a failed request goes back to the last quantity the server confirmed and drops newer changes", async () => {
  const { app, calls } = await loaded();
  const p1 = app.setQuantity("oat-milk", 3);
  calls[0].reply({ sku: "oat-milk", qty: 3, available: 9 });
  await p1;
  const p2 = app.setQuantity("oat-milk", 4);
  const p3 = app.setQuantity("oat-milk", 5);
  calls[1].reply({ error: "boom" }, 500);
  const [r2, r3] = await Promise.all([p2, p3]);
  const l = line(app, "oat-milk");
  eq([l.qty, l.pending, l.error], [3, false, "UPDATE_FAILED"]);
  eq([r2.qty, r3.qty], [3, 3]);
  eq(calls.length, 2, "the newer wanted quantity is dropped, not retried");
  eq(app.getCart().announcement, "Couldn't update Oat milk. Back to 3.");
  const p4 = app.setQuantity("oat-milk", 2);
  eq(line(app, "oat-milk").error, null, "a new change clears the error");
  calls[2].reply({ sku: "oat-milk", qty: 2, available: 9 });
  await p4;
  eq(line(app, "oat-milk").qty, 2);
});

test("a request that never gets an answer is a failure too", async () => {
  const { app, calls } = await loaded();
  const p = app.setQuantity("mug", 7);
  calls[0].fail();
  const r = await p;
  eq([r.qty, line(app, "mug").qty, line(app, "mug").error], [1, 1, "UPDATE_FAILED"]);
});

test("when the server confirms less than was asked for, the line shows what the server says", async () => {
  const { app, calls } = await loaded();
  const p = app.setQuantity("oat-milk", 8);
  calls[0].reply({ sku: "oat-milk", qty: 3, available: 3 });
  const r = await p;
  eq([r.qty, line(app, "oat-milk").qty, line(app, "oat-milk").pending], [3, 3, false]);
  eq(app.getCart().announcement, "Only 3 of Oat milk available");
});

test("setting 0 removes the line at once, and undoRemove brings it back in its old place within 8 seconds", async () => {
  const { app, calls, clock } = await loaded();
  const p = app.setQuantity("oat-milk", 0);
  eq(app.getCart().lines.map(l => l.sku), ["mug"]);
  eq(calls[0].body.qty, 0);
  calls[0].reply({ sku: "oat-milk", qty: 0, available: 5 });
  await p;
  eq(app.getCart().announcement, "Oat milk removed");
  clock.tick(8000);
  const u = app.undoRemove("oat-milk");
  eq(app.getCart().lines.map(l => l.sku), ["oat-milk", "mug"]);
  eq(line(app, "oat-milk").qty, 2, "back to the quantity it had");
  eq(calls[1].body.qty, 2);
  calls[1].reply({ sku: "oat-milk", qty: 2, available: 5 });
  await u;
  eq(line(app, "oat-milk").pending, false);
});

test("undoRemove is too late after 8 seconds, and has nothing to undo on a line that was not removed", async () => {
  const { app, calls, clock } = await loaded();
  const p = app.setQuantity("mug", 0);
  calls[0].reply({ sku: "mug", qty: 0, available: 5 });
  await p;
  clock.tick(8001);
  let code = null;
  try { app.undoRemove("mug"); } catch (e) { code = e.code; }
  eq(code, "UNDO_EXPIRED");
  code = null;
  try { app.undoRemove("oat-milk"); } catch (e) { code = e.code; }
  eq(code, "UNDO_EXPIRED");
  const again = app.setQuantity("mug", 1);
  eq(line(app, "mug").qty, 1, "setQuantity can still add a removed line back");
  calls[1].reply({ sku: "mug", qty: 1, available: 5 });
  await again;
});

test("a removal the server refused puts the line back and cannot be undone", async () => {
  const { app, calls } = await loaded();
  const p = app.setQuantity("mug", 0);
  calls[0].reply({}, 500);
  await p;
  eq([line(app, "mug").qty, line(app, "mug").error], [1, "UPDATE_FAILED"]);
  let code = null;
  try { app.undoRemove("mug"); } catch (e) { code = e.code; }
  eq(code, "UNDO_EXPIRED");
});

test("getCart lists lines in cents with a subtotal, and returns the same object until the cart changes", async () => {
  const { app, calls } = await loaded();
  const a = app.getCart();
  eq(a.lines.map(l => [l.sku, l.title, l.qty, l.unitPrice, l.lineTotal, l.pending, l.error]), [["oat-milk", "Oat milk", 2, 250, 500, false, null], ["mug", "Enamel mug", 1, 1200, 1200, false, null]]);
  eq([a.count, a.subtotal], [3, 1700]);
  assert(app.getCart() === a, "nothing changed, same view");
  app.setQuery("shoes");
  calls[0].reply({ items: [] });
  await flush();
  assert(app.getCart() === a, "typing in the search box must not give the cart a new view");
  app.setQuantity("mug", 2);
  const b = app.getCart();
  assert(b !== a, "a cart change gives a new view");
  eq(a.lines[1].qty, 1, "the old view is not changed");
  eq(b.lines[1].qty, 2);
});

test("renderCart escapes seller text, labels the controls, disables + at 10 and has a live region", async () => {
  const t = mk();
  const p = t.app.loadCart();
  t.calls[0].reply({ items: [{ sku: "mug", title: 'Tom & Jerry\'s <b>"Big"</b> mug', unitPrice: 1200, qty: 10 }, { sku: "oat-milk", title: "Oat milk", unitPrice: 250, qty: 2 }] });
  await p;
  const html = t.app.renderCart();
  assert(!html.includes("<b>"), "the title must be escaped");
  assert(html.includes("Tom &amp; Jerry's &lt;b&gt;"), "the text is kept");
  assert(/<button[^>]*aria-label="Decrease quantity of Oat milk"[^>]*>/.test(html), "decrease button label");
  const incOat = html.match(/<button[^>]*aria-label="Increase quantity of Oat milk"[^>]*>/);
  assert(incOat && !/\bdisabled\b/.test(incOat[0]), "+ is enabled below 10");
  const incMug = html.match(/<button[^>]*aria-label="Increase quantity of Tom[^>]*>/);
  assert(incMug && /\bdisabled\b/.test(incMug[0]), "+ is disabled at 10");
  assert(html.includes("$5.00") && html.includes("$120.00"), "line totals");
  assert(html.includes("Subtotal $125.00"), "subtotal");
  const live = html.match(/<p[^>]*role="status"[^>]*>([^<]*)<\/p>/);
  assert(live && /aria-live="polite"/.test(live[0]), "a polite live region");
  const q = t.app.setQuantity("oat-milk", 3);
  t.calls[1].reply({ sku: "oat-milk", qty: 3, available: 9 });
  await q;
  eq(t.app.renderCart().match(/<p[^>]*role="status"[^>]*>([^<]*)<\/p>/)[1], "Oat milk: quantity 3");
});
