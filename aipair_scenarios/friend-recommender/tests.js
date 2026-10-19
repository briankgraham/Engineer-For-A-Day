// Hidden level 1 cases (run when the candidate finishes)
const { SocialGraph } = require("./graph");
const { Recommender } = require("./recommender");

function graphOf(edges, users = []) {
  const g = new SocialGraph();
  for (const e of edges) for (const id of e.split("-")) g.addUser(id);
  for (const id of users) g.addUser(id);
  for (const e of edges) g.addFriendship(...e.split("-"));
  return g;
}

// Small deterministic pseudo-random generator, so every run sees the same graphs.
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

// The spec, written as directly as possible.
function brute(g, ids, u, k) {
  if (!g.isActive(u)) return [];
  const out = [];
  for (const c of ids) {
    if (c === u || g.areFriends(u, c) || !g.isActive(c)) continue;
    let m = 0;
    for (const f of ids) if (g.isActive(f) && g.areFriends(u, f) && g.areFriends(f, c)) m++;
    if (m) out.push({ id: c, mutual: m });
  }
  out.sort((a, b) => b.mutual - a.mutual || (a.id < b.id ? -1 : 1));
  return out.slice(0, k);
}

test("level 1: a deactivated user gets no suggestions", () => {
  const g = graphOf(["ana-ben", "ben-cy"]);
  g.deactivate("ana");
  eq(new Recommender(g).recommend("ana"), []);
});

test("level 1: a deactivated friend of a friend is not suggested", () => {
  const g = graphOf(["ana-ben", "ben-cy", "ben-dee"]);
  g.deactivate("cy");
  eq(new Recommender(g).recommend("ana"), [{ id: "dee", mutual: 1 }]);
});

test("level 1: a user with no friends gets []", () => {
  eq(new Recommender(graphOf(["ben-cy"], ["ana"])).recommend("ana"), []);
});

test("level 1: k defaults to 10", () => {
  const edges = ["ana-hub"];
  for (let i = 0; i < 15; i++) edges.push("hub-u" + String(i).padStart(2, "0"));
  eq(new Recommender(graphOf(edges)).recommend("ana").length, 10);
});

test("level 1: ids are compared as strings, not numbers", () => {
  const g = graphOf(["ana-ben", "ben-u9", "ben-u10", "ben-U2"]);
  eq(new Recommender(g).recommend("ana").map(r => r.id), ["U2", "u10", "u9"]);
});

test("level 1: asking twice gives the same answer, and other users are not affected", () => {
  const g = graphOf(["ana-ben", "ben-cy", "cy-dee"]);
  const r = new Recommender(g);
  const first = r.recommend("ana");
  eq(r.recommend("ana"), first);
  eq(r.recommend("ben"), [{ id: "dee", mutual: 1 }]);
  eq(g.friendsOf("ben").size, 2);
});

test("level 1: matches the spec on random graphs", () => {
  const rand = rng(11);
  for (let t = 0; t < 60; t++) {
    const ids = Array.from({ length: 12 }, (_, i) => "p" + ((i * 7) % 12));
    const g = new SocialGraph();
    for (const id of ids) g.addUser(id);
    for (let e = 0; e < 25; e++) g.addFriendship(ids[Math.floor(rand() * 12)], ids[Math.floor(rand() * 12)]);
    for (const id of ids) if (rand() < 0.15) g.deactivate(id);
    const r = new Recommender(g);
    for (const u of ids) {
      const k = 1 + Math.floor(rand() * 6);
      eq(r.recommend(u, k), brute(g, ids, u, k), "graph " + t + ", user " + u + ", k = " + k);
    }
  }
});
