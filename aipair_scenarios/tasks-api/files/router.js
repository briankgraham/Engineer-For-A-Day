// Maps "METHOD /path?query" onto a handler. This file works.
function parseQuery(qs) {
  const query = {};
  for (const pair of qs.split("&")) {
    if (!pair) continue;
    const i = pair.indexOf("=");
    const key = decodeURIComponent(i < 0 ? pair : pair.slice(0, i));
    query[key] = i < 0 ? "" : decodeURIComponent(pair.slice(i + 1));
  }
  return query;
}

function makeRouter(handlers) {
  return function route(method, url, body) {
    const q = url.indexOf("?");
    const path = q < 0 ? url : url.slice(0, q);
    const query = q < 0 ? {} : parseQuery(url.slice(q + 1));
    const parts = path.split("/").filter(Boolean);
    const notFound = { status: 404, body: { error: "no such route" } };
    const badMethod = { status: 405, body: { error: "method not allowed" } };

    if (parts[0] !== "tasks") return notFound;
    if (parts.length === 1) {
      if (method === "GET") return handlers.listTasks({ query });
      if (method === "POST") return handlers.createTask({ body });
      return badMethod;
    }
    if (parts.length === 2) {
      const params = { id: parts[1] };
      if (method === "GET") return handlers.getTask({ params });
      if (method === "PATCH") return handlers.updateTask({ params, body });
      if (method === "DELETE") return handlers.deleteTask({ params });
      return badMethod;
    }
    return notFound;
  };
}

module.exports = { makeRouter };
