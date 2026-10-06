const { getUserRow } = require("./store");
const { hiddenBy } = require("./mutes");

// A person's feed is the posts of everyone they follow, newest first. It is computed when it is asked for.
// getFeed(userId, { limit, cursor }) returns one page: { items: [post], nextCursor }. Clients start without a cursor
// and pass the nextCursor they got back to ask for the next page; they treat it as opaque. nextCursor is null on the last page.

// Newest first. Posts can share a timestamp (bulk imports), so the id breaks ties. The pair (createdAt, id) is unique
// and never changes, so a page can start "after this post" no matter what was added or deleted in the meantime.
const cmp = (a, b) => b.createdAt - a.createdAt || (a.id === b.id ? 0 : a.id < b.id ? 1 : -1);

const encode = p => "c:" + p.createdAt + ":" + p.id;

function decode(cursor) {
  const m = /^c:(\d+):(p_\d+)$/.exec(typeof cursor === "string" ? cursor : "");
  if (!m) throw new RangeError("bad cursor");
  return { createdAt: Number(m[1]), id: m[2] };
}

function create({ store, now, log }) {
  function getFeed(userId, { limit = 20, cursor = null } = {}) {
    getUserRow(store, userId);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new RangeError("limit must be an integer from 1 to 50");
    const after = cursor === null ? null : decode(cursor);
    const follows = store.follows.get(userId);
    const hidden = hiddenBy(store, now, userId);
    const rest = [...store.posts.values()]
      .filter(p => follows.has(p.authorId) && !hidden(p))
      .sort(cmp)
      .filter(p => !after || cmp(after, p) < 0);
    const page = rest.slice(0, limit);
    return { items: page.map(p => ({ ...p })), nextCursor: rest.length > limit ? encode(page[page.length - 1]) : null };
  }

  return { getFeed };
}

module.exports = { create };
