// Level 2: block and dismiss. More cases run when you finish.
const { SocialGraph } = require("./graph");
const { Recommender } = require("./recommender");

function graphOf(edges, users = []) {
  const g = new SocialGraph();
  for (const e of edges) for (const id of e.split("-")) g.addUser(id);
  for (const id of users) g.addUser(id);
  for (const e of edges) g.addFriendship(...e.split("-"));
  return g;
}

test("level 2: a dismissed suggestion is not shown again", () => {
  const g = graphOf(["ana-ben", "ben-cy", "ben-dee"]);
  const r = new Recommender(g);
  eq(r.dismiss("ana", "cy"), true);
  eq(r.recommend("ana"), [{ id: "dee", mutual: 1 }]);
});

test("level 2: dismissing still fills the list up to k", () => {
  const g = graphOf(["ana-ben", "ben-cy", "ben-dee", "ben-eli"]);
  const r = new Recommender(g);
  r.dismiss("ana", "cy");
  eq(r.recommend("ana", 2).map(x => x.id), ["dee", "eli"]);
});

test("level 2: a blocked user is not suggested to the blocker", () => {
  const g = graphOf(["ana-ben", "ben-cy"]);
  const r = new Recommender(g);
  eq(r.block("ana", "cy"), true);
  eq(r.recommend("ana"), []);
});

test("level 2: blocking ends the friendship", () => {
  const g = graphOf(["ana-ben", "ben-cy"]);
  const r = new Recommender(g);
  r.block("ana", "ben");
  eq(g.areFriends("ana", "ben"), false);
});

test("level 2: block and dismiss return false for an unknown user or the same user twice", () => {
  const r = new Recommender(graphOf(["ana-ben"]));
  eq(r.block("ana", "zed"), false);
  eq(r.block("ana", "ana"), false);
  eq(r.dismiss("zed", "ana"), false);
  eq(r.dismiss("ana", "ana"), false);
});
