const { codeError } = require("./store");

// The only module that talks to the network. fetch is injected (the browser's in production, a fake in tests).
// Failures become errors with a code: NETWORK when the request never got an answer, HTTP_<status> for a non-2xx answer.
function create({ fetch, log }) {
  async function request(method, path, body) {
    let res;
    try {
      res = await fetch("/api" + path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (e) {
      log.warn("api.network_error", { path });
      throw codeError("NETWORK", "no answer from " + path);
    }
    if (!res.ok) {
      log.warn("api.http_error", { path, status: res.status });
      throw codeError("HTTP_" + res.status, path + " answered " + res.status);
    }
    return res.json();
  }

  return {
    getCart: () => request("GET", "/cart"), // { items: [{ sku, title, unitPrice, qty }] }
    updateCartItem: (sku, qty) => request("PUT", "/cart/items/" + encodeURIComponent(sku), { qty }), // { sku, qty, available }
    search: q => request("GET", "/search?q=" + encodeURIComponent(q)), // { items: [{ sku, title, price }] }
  };
}

module.exports = { create };
