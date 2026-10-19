// Level 1: the bugs on the ticket. Some of these fail today; find out why. More cases run when you finish.
const { SocialGraph } = require("./graph");
const { Recommender } = require("./recommender");

// A graph from a list of "a-b" friendships; every id mentioned becomes a user.
function graphOf(edges, users = []) {
  const g = new SocialGraph();
  for (const e of edges) for (const id of e.split("-")) g.addUser(id);
  for (const id of users) g.addUser(id);
  for (const e of edges) g.addFriendship(...e.split("-"));
  return g;
}

test("level 1: suggests friends of friends, most mutual friends first", () => {
  const g = graphOf(["ana-ben", "ana-cy", "ben-dee", "cy-dee", "ben-eli"]);
  eq(new Recommender(g).recommend("ana"), [{ id: "dee", mutual: 2 }, { id: "eli", mutual: 1 }]);
});

test("level 1: never suggests the user or their current friends", () => {
  const g = graphOf(["ana-ben", "ana-cy", "ben-cy", "cy-dee"]);
  eq(new Recommender(g).recommend("ana"), [{ id: "dee", mutual: 1 }]);
});

test("level 1: returns at most k suggestions", () => {
  const g = graphOf(["ana-ben", "ben-cy", "ben-dee", "ben-eli"]);
  eq(new Recommender(g).recommend("ana", 2).length, 2);
});

test("level 1: an unknown user gets no suggestions", () => {
  eq(new Recommender(graphOf(["ana-ben"])).recommend("zed"), []);
});

test("level 1: ties are ordered by id", () => {
  // Ticket: "the order of PYMK changes depending on who joined first".
  const g = graphOf(["ana-ben", "ben-zoe", "ben-max", "ben-kim"]);
  eq(new Recommender(g).recommend("ana").map(r => r.id), ["kim", "max", "zoe"]);
});

test("level 1: opening PYMK does not change anyone's friends", () => {
  // Ticket: "my friend count goes up by one after I look at People You May Know".
  const g = graphOf(["ana-ben", "ben-cy"]);
  new Recommender(g).recommend("ana");
  eq([...g.friendsOf("ana")], ["ben"]);
  eq(g.areFriends("ana", "ana"), false);
});

test("level 1: a deactivated friend does not count as a mutual friend", () => {
  // Ticket: "PYMK says we have 2 mutual friends, but one of them deleted their account".
  const g = graphOf(["ana-ben", "ana-cy", "ben-dee", "cy-dee"]);
  g.deactivate("cy");
  eq(new Recommender(g).recommend("ana"), [{ id: "dee", mutual: 1 }]);
});
