const { h, renderToString } = require("./h");

// The search box. setQuery(q) is called on every keystroke with what is in the box (search as you type).
// A query shorter than flags.searchMinChars (after trimming) sends nothing and clears the results.
// State is store.search: see store.js.
function create({ store, api, flags, log }) {
  const patch = fields => store.update(s => ({ ...s, search: { ...s.search, ...fields } }));
  let latest = 0; // every keystroke gets a number; only the newest one may change what is on screen

  async function run(q) {
    const id = ++latest;
    const term = q.trim();
    if (term.length < flags.searchMinChars) {
      patch({ query: q, status: "idle", items: [], resultsFor: "", error: null });
      return;
    }
    patch({ query: q, status: "loading", error: null });
    try {
      const res = await api.search(term);
      if (id !== latest) return;
      patch({ status: "ready", items: res.items, resultsFor: term, error: null });
      log.info("search.render", { resultsFor: term });
    } catch (e) {
      if (id !== latest) return;
      patch({ status: "error", error: e.code });
    }
  }

  function setQuery(q) {
    if (typeof q !== "string") throw new TypeError("query must be a string");
    return run(q);
  }

  // Callers always get copies, never the stored state.
  function getSearch() {
    const s = store.getState().search;
    return { ...s, items: s.items.map(i => ({ ...i })) };
  }

  function renderSearch() {
    const s = store.getState().search;
    return renderToString(
      h("section", { class: "search" },
        s.status === "loading" ? h("p", { role: "status" }, "Searching…") : null,
        s.status === "error" ? h("p", { role: "alert" }, "Search failed. Try again.") : null,
        s.status === "ready" ? h("p", { class: "for" }, 'Results for "' + s.resultsFor + '"') : null,
        h("ul", {}, ...s.items.map(i => h("li", { class: "result", "data-sku": i.sku }, i.title)))
      )
    );
  }

  return { setQuery, getSearch, renderSearch };
}

module.exports = { create };
