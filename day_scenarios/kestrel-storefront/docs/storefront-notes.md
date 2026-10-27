# The storefront web app: how it works

Team wiki · last edited by Priya Raman · 4 months ago

Kestrel's storefront is a single-page app on top of the public API. This page is about the state layer and everything the shopper's browser does on its own.

## How the page is built

- **One store.** `store.js` holds `search` and `cart`. State is replaced, never mutated, and subscribers only run when the object changed (keep the slices you did not touch).
- **Views render to strings** (`h.js`). Text and attributes are escaped for you. `raw()` is for static markup such as icons; it is not for anything a seller typed.
- **All network goes through `api.js`.** It returns parsed JSON or throws an error with a `code` (`NETWORK`, `HTTP_<status>`).
- Money is integer cents everywhere. Only the views format it.

## Search

- Since release **2026.47** (Nov 24) the search box searches **from the first character** (the minimum was 3). `setQuery` is called on every keystroke and the results appear as you type.
- The search API answers each request on its own. It does not know about the keystrokes before it.
- Remote config: `search_min_chars` (default 1) and `typeahead` (default on; off means the box searches when you press Enter).

## Cart

- The cart is loaded once at page start (`loadCart`) and then lives in the store.
- The server is the source of truth for quantities and stock: it can answer with a smaller quantity than was asked for.

## Monitoring

- Real-user monitoring (RUM) sends `search.input` for each keystroke and `search.render` whenever results are painted, with `input=` (what is in the box) and `results_for=` (what the results answer). A render where they differ has `stale=true`.
- The `search_stale_render_rate` metric exists since Nov 25 (KES-277). It has **no alert yet**; it is on the board as low priority.
- The search API logs `search.api` with `index=` (the index version that answered) and `took=`.
