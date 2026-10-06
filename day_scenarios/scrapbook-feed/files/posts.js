const { codeError, getUserRow } = require("./store");

function create({ store, now, log }) {
  // at is the post's timestamp in ms. It defaults to now. Bulk imports pass the original time, so many posts can share one.
  function createPost(authorId, text, { at = now() } = {}) {
    getUserRow(store, authorId);
    if (typeof text !== "string" || !text.trim() || text.length > 500) throw new TypeError("a post needs text of 1 to 500 characters");
    if (!Number.isInteger(at) || at < 0) throw new TypeError("bad timestamp");
    const id = "p_" + String(++store.seq).padStart(8, "0"); // ids sort in creation order
    const post = { id, authorId, text, createdAt: at };
    store.posts.set(id, post);
    log.info("post.created", { id, authorId });
    return { ...post };
  }

  function deletePost(id) {
    if (!store.posts.delete(id)) throw codeError("POST_NOT_FOUND", "no post " + id);
    log.info("post.deleted", { id });
  }

  return { createPost, deletePost };
}

module.exports = { create };
