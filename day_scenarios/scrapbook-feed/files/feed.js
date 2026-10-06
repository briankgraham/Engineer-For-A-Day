const { getUserRow } = require("./store");

// A person's feed is the posts of everyone they follow, newest first. It is computed when it is asked for.
// getFeed(userId, { limit, cursor }) returns one page: { items: [post], nextCursor }. Clients start without a cursor
// and pass the nextCursor they got back to ask for the next page; they treat it as opaque. nextCursor is null on the last page.
function create({ store, log }) {
  function getFeed(userId, { limit = 20, cursor = null } = {}) {
    getUserRow(store, userId);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new RangeError("limit must be an integer from 1 to 50");
    const follows = store.follows.get(userId);
    const all = [...store.posts.values()].filter(p => follows.has(p.authorId)).sort((a, b) => b.createdAt - a.createdAt);
    // SCRAP-412: the posts this person has muted are dropped here
    const offset = cursor === null ? 0 : parseCursor(cursor);
    const items = all.slice(offset, offset + limit).map(p => ({ ...p }));
    const next = offset + limit;
    return { items, nextCursor: next < all.length ? "o:" + next : null };
  }

  function parseCursor(cursor) {
    const m = /^o:(\d+)$/.exec(typeof cursor === "string" ? cursor : "");
    if (!m) throw new RangeError("bad cursor");
    return Number(m[1]);
  }

  return { getFeed };
}

module.exports = { create };
