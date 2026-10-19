// Level 3: caching. More cases run when you finish.
const { SocialGraph } = require("./graph");
const { Recommender } = require("./recommender");

function graphOf(edges, users = []) {
  const g = new SocialGraph();
  for (const e of edges) for (const id of e.split("-")) g.addUser(id);
  for (const id of users) g.addUser(id);
  for (const e of edges) g.addFriendship(...e.split("-"));
  return g;
}

// Counts the recommender's calls to graph.friendsOf.
function counting(g) {
  const real = g.friendsOf.bind(g);
  const c = { calls: 0 };
  g.friendsOf = id => (c.calls++, real(id));
  return c;
}

test("level 3: asking again with nothing changed does not read the graph", () => {
  const g = graphOf(["ana-ben", "ben-cy", "ben-dee"]);
  const r = new Recommender(g);
  const c = counting(g);
  const first = r.recommend("ana");
  c.calls = 0;
  eq(r.recommend("ana"), first);
  eq(c.calls, 0, "friendsOf calls on the second recommend");
});

test("level 3: a new friendship shows up in the user's next suggestions", () => {
  const g = graphOf(["ana-ben", "ben-cy"], ["dee"]);
  const r = new Recommender(g);
  eq(r.recommend("ana"), [{ id: "cy", mutual: 1 }]);
  g.addFriendship("ben", "dee");
  eq(r.recommend("ana"), [{ id: "cy", mutual: 1 }, { id: "dee", mutual: 1 }]);
});

test("level 3: a smaller k and then a bigger k", () => {
  const g = graphOf(["ana-ben", "ben-cy", "ben-dee", "ben-eli"]);
  const r = new Recommender(g);
  eq(r.recommend("ana", 1).length, 1);
  eq(r.recommend("ana", 3).length, 3);
});

test("level 3: a dismissal takes effect on the next call", () => {
  const g = graphOf(["ana-ben", "ben-cy", "ben-dee"]);
  const r = new Recommender(g);
  r.recommend("ana");
  r.dismiss("ana", "cy");
  eq(r.recommend("ana"), [{ id: "dee", mutual: 1 }]);
});
