// "People you may know": suggests friends of friends, ranked by how many mutual friends they share with the user.
class Recommender {
  constructor(graph) {
    this.graph = graph;
  }

  // Up to k suggestions for userId, best first, as { id, mutual }.
  recommend(userId, k = 10) {
    const graph = this.graph;
    if (!graph.hasUser(userId)) return [];

    const exclude = graph.friendsOf(userId);
    exclude.add(userId); // never suggest the user to themselves

    const mutual = new Map();
    for (const friend of graph.friendsOf(userId)) {
      for (const candidate of graph.friendsOf(friend)) {
        if (exclude.has(candidate) || !graph.isActive(candidate)) continue;
        mutual.set(candidate, (mutual.get(candidate) || 0) + 1);
      }
    }

    return [...mutual.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, k)
      .map(([id, n]) => ({ id, mutual: n }));
  }
}

module.exports = { Recommender };
