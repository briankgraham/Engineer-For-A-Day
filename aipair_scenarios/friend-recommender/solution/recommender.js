// "People you may know": suggests friends of friends, ranked by how many mutual friends they share with the user.
class Recommender {
  constructor(graph) {
    this.graph = graph;
    this.blocked = new Map(); // user id -> Set of ids blocked in either direction
    this.dismissed = new Map(); // user id -> Set of ids that user dismissed
    this.cache = new Map(); // user id -> the full ranked list (before k is applied)
    graph.onChange(event => this._invalidate(this._affectedBy(event)));
  }

  // Up to k suggestions for userId, best first, as { id, mutual }.
  recommend(userId, k = 10) {
    if (!this.graph.isActive(userId)) return [];
    let ranked = this.cache.get(userId);
    if (!ranked) {
      ranked = this._rank(userId);
      this.cache.set(userId, ranked);
    }
    return ranked.slice(0, k).map(r => ({ ...r }));
  }

  block(userId, otherId) {
    if (userId === otherId || !this.graph.hasUser(userId) || !this.graph.hasUser(otherId)) return false;
    this._add(this.blocked, userId, otherId);
    this._add(this.blocked, otherId, userId);
    this.graph.removeFriendship(userId, otherId);
    this._invalidate([userId, otherId]);
    return true;
  }

  dismiss(userId, candidateId) {
    if (userId === candidateId || !this.graph.hasUser(userId) || !this.graph.hasUser(candidateId)) return false;
    this._add(this.dismissed, userId, candidateId);
    this._invalidate([userId]);
    return true;
  }

  _rank(userId) {
    const graph = this.graph;
    const friends = graph.friendsOf(userId);
    const hidden = id =>
      id === userId || friends.has(id) || !graph.isActive(id) ||
      this._has(this.blocked, userId, id) || this._has(this.dismissed, userId, id);

    const mutual = new Map();
    for (const friend of friends) {
      if (!graph.isActive(friend)) continue;
      for (const candidate of graph.friendsOf(friend)) {
        if (hidden(candidate)) continue;
        mutual.set(candidate, (mutual.get(candidate) || 0) + 1);
      }
    }

    return [...mutual.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([id, n]) => ({ id, mutual: n }));
  }

  // Whose recommendations can change: a user's list depends on their friends and their friends' friends.
  _affectedBy(event) {
    const graph = this.graph;
    if (event.type === "addFriendship" || event.type === "removeFriendship") {
      return [event.a, event.b, ...graph.friendsOf(event.a), ...graph.friendsOf(event.b)];
    }
    if (event.type === "deactivate") {
      const out = [event.id];
      for (const f of graph.friendsOf(event.id)) {
        out.push(f);
        for (const ff of graph.friendsOf(f)) out.push(ff);
      }
      return out;
    }
    return [];
  }

  _invalidate(ids) {
    for (const id of ids) this.cache.delete(id);
  }

  _add(map, a, b) {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a).add(b);
  }

  _has(map, a, b) {
    return map.has(a) && map.get(a).has(b);
  }
}

module.exports = { Recommender };
