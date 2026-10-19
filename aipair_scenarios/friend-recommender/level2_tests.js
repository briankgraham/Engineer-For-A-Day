// Hidden level 2 cases
const { SocialGraph } = require("./graph");
const { Recommender } = require("./recommender");

function graphOf(edges, users = []) {
  const g = new SocialGraph();
  for (const e of edges) for (const id of e.split("-")) g.addUser(id);
  for (const id of users) g.addUser(id);
  for (const e of edges) g.addFriendship(...e.split("-"));
  return g;
}

test("level 2: a block works in both directions", () => {
  const g = graphOf(["ana-ben", "ben-cy"]);
  const r = new Recommender(g);
  r.block("cy", "ana");
  eq(r.recommend("ana"), []);
  eq(r.recommend("cy"), []);
});

test("level 2: a dismissal only hides the suggestion from the user who dismissed it", () => {
  const g = graphOf(["ana-ben", "ben-cy"]);
  const r = new Recommender(g);
  r.dismiss("ana", "cy");
  eq(r.recommend("ana"), []);
  eq(r.recommend("cy"), [{ id: "ana", mutual: 1 }]);
});

test("level 2: after a block, the blocked friend no longer counts as a mutual friend", () => {
  const g = graphOf(["ana-ben", "ana-cy", "ben-dee", "cy-dee"]);
  const r = new Recommender(g);
  r.block("ana", "ben");
  eq(r.recommend("ana"), [{ id: "dee", mutual: 1 }]);
  eq(r.recommend("dee"), [{ id: "ana", mutual: 1 }]);
});

test("level 2: blocking a friend does not suggest them back", () => {
  const g = graphOf(["ana-ben", "ana-cy", "ben-cy"]);
  const r = new Recommender(g);
  r.block("ana", "ben");
  eq(r.recommend("ana"), []);
  eq(r.recommend("ben"), []);
});

test("level 2: blocking two users who are not friends does not touch other friendships", () => {
  const g = graphOf(["ana-ben", "ben-cy"]);
  const r = new Recommender(g);
  r.block("ana", "cy");
  eq(g.areFriends("ana", "ben"), true);
  eq(g.areFriends("ben", "cy"), true);
});

test("level 2: several dismissals still fill up to k from further down the list", () => {
  const g = graphOf(["ana-ben", "ana-cy", "ben-u1", "cy-u1", "ben-u2", "cy-u2", "ben-u3", "ben-u4", "ben-u5"]);
  const r = new Recommender(g);
  r.dismiss("ana", "u1");
  r.dismiss("ana", "u3");
  eq(r.recommend("ana", 3), [{ id: "u2", mutual: 2 }, { id: "u4", mutual: 1 }, { id: "u5", mutual: 1 }]);
});
