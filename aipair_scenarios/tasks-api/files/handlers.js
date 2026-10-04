// Request handlers for the tasks API. Each takes { params, query, body } and returns { status, body }.
// Query values are always strings (or missing), because they come straight from the URL.
const ok = (body, status = 200) => ({ status, body });
const fail = (status, message) => ({ status, body: { error: message } });

const STATUSES = ["open", "done"];

function makeHandlers(store) {
  return {
    createTask({ body = {} }) {
      if (typeof body.title !== "string" || !body.title.trim()) return fail(400, "title is required");
      if (body.status !== undefined && !STATUSES.includes(body.status)) return fail(400, "bad status");
      return ok(store.insert({ title: body.title.trim(), status: body.status }), 201);
    },

    getTask({ params }) {
      const task = store.find(params.id);
      if (!task) return fail(404, "not found");
      return ok(task);
    },

    listTasks({ query = {} }) {
      let items = store.all();
      if (query.status !== undefined) {
        if (!STATUSES.includes(query.status)) return fail(400, "bad status");
        items = items.filter(t => t.status === query.status);
      }
      return ok({ items });
    },

    updateTask({ params, body = {} }) {
      const task = store.find(params.id);
      if (!task) return fail(404, "not found");
      if (body.title !== undefined) {
        if (typeof body.title !== "string" || !body.title.trim()) return fail(400, "bad title");
        task.title = body.title.trim();
      }
      if (body.status !== undefined) {
        if (!STATUSES.includes(body.status)) return fail(400, "bad status");
        task.status = body.status;
      }
      return ok(task);
    },

    deleteTask({ params }) {
      if (!store.remove(params.id)) return fail(404, "not found");
      return ok(null, 204);
    },
  };
}

module.exports = { makeHandlers };
