// KES-318: the cart quantity stepper. See the ticket for the rules.
const { codeError } = require("./store");
const { h, renderToString } = require("./h");

const MAX_QTY = 10;
const UNDO_MS = 8000;
const money = cents => "$" + (cents / 100).toFixed(2);

function create({ store, api, now, log }) {
  const runs = new Map(); // sku -> the promise of the run that is talking to the server about it (one per sku)
  const lineOf = sku => store.getState().cart.items[sku];
  const patch = (sku, fn) => store.update(s => ({ ...s, cart: { ...s.cart, items: { ...s.cart.items, [sku]: fn(s.cart.items[sku]) } } }));
  const announce = text => store.update(s => ({ ...s, cart: { ...s.cart, announcement: text } }));

  // Sends the shown quantity; when the shopper changed it meanwhile, sends again, so the server sees one request at a time and ends on the latest.
  async function run(sku) {
    for (;;) {
      const sent = lineOf(sku).qty;
      let res;
      try {
        res = await api.updateCartItem(sku, sent);
      } catch (e) {
        const l = lineOf(sku);
        patch(sku, x => ({ ...x, qty: x.confirmed, pending: false, error: "UPDATE_FAILED", removedAt: null }));
        announce("Couldn't update " + l.title + ". Back to " + l.confirmed + ".");
        log.warn("cart.update_failed", { sku, code: e.code });
        break;
      }
      patch(sku, x => ({ ...x, confirmed: res.qty }));
      if (lineOf(sku).qty !== sent) continue;
      patch(sku, x => ({ ...x, qty: res.qty, pending: false }));
      const title = lineOf(sku).title;
      announce(res.qty === 0 ? title + " removed" : res.qty < sent ? "Only " + res.qty + " of " + title + " available" : title + ": quantity " + res.qty);
      break;
    }
    runs.delete(sku);
    return { sku, qty: lineOf(sku).confirmed };
  }

  function setQuantity(sku, qty) {
    if (!Number.isInteger(qty) || qty < 0 || qty > MAX_QTY) throw new RangeError("quantity must be an integer from 0 to " + MAX_QTY);
    if (!lineOf(sku)) throw codeError("ITEM_NOT_IN_CART", "no line " + sku);
    patch(sku, l => ({ ...l, qty, pending: true, error: null, prevQty: qty === 0 && l.qty > 0 ? l.qty : l.prevQty, removedAt: qty === 0 ? (l.qty > 0 ? now() : l.removedAt) : null }));
    if (!runs.has(sku)) runs.set(sku, run(sku));
    return runs.get(sku);
  }

  function undoRemove(sku) {
    const l = lineOf(sku);
    if (!l || l.qty !== 0 || l.removedAt == null || now() - l.removedAt > UNDO_MS) throw codeError("UNDO_EXPIRED", "nothing to undo for " + sku);
    return setQuantity(sku, l.prevQty);
  }

  // The same object comes back until store.cart changes, so a view that depends on it can skip work (search typing leaves store.cart alone).
  let memo = { cart: null, view: null };
  function getCart() {
    const cart = store.getState().cart;
    if (memo.cart !== cart) {
      const lines = cart.order.map(sku => cart.items[sku]).filter(l => l.qty > 0)
        .map(l => ({ sku: l.sku, title: l.title, qty: l.qty, unitPrice: l.unitPrice, lineTotal: l.qty * l.unitPrice, pending: l.pending, error: l.error || null }));
      memo = { cart, view: { lines, count: lines.reduce((n, l) => n + l.qty, 0), subtotal: lines.reduce((n, l) => n + l.lineTotal, 0), announcement: cart.announcement } };
    }
    return memo.view;
  }

  function renderCart() {
    const v = getCart();
    return renderToString(
      h("section", { class: "cart" },
        h("ul", {}, ...v.lines.map(l =>
          h("li", { "data-sku": l.sku },
            h("span", { class: "title" }, l.title),
            h("button", { "aria-label": "Decrease quantity of " + l.title, "data-action": "dec" }, "−"),
            h("output", {}, String(l.qty)),
            h("button", { "aria-label": "Increase quantity of " + l.title, "data-action": "inc", disabled: l.qty >= MAX_QTY }, "+"),
            h("span", { class: "price" }, money(l.lineTotal))))),
        h("p", { class: "subtotal" }, "Subtotal " + money(v.subtotal)),
        h("p", { role: "status", "aria-live": "polite" }, v.announcement)
      )
    );
  }

  return { setQuantity, undoRemove, getCart, renderCart };
}

module.exports = { create };
