// Hidden level 3 cases
const { SocialGraph } = require("./graph");
const { Recommender } = require("./recommender");

function graphOf(edges, users = []) {
  const g = new SocialGraph();
  for (const e of edges) for (const id of e.split("-")) g.addUser(id);
  for (const id of users) g.addUser(id);
  for (const e of edges) g.addFriendship(...e.split("-"));
  return g;
}

function counting(g) {
  const real = g.friendsOf.bind(g);
  const c = { calls: 0 };
  g.friendsOf = id => (c.calls++, real(id));
  return c;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

test("level 3: a friendship between two of your friends' friends changes your mutual counts", () => {
  // ana's suggestions go through ben; ben is not part of the change, but cy (a friend of ben) gets a new friend.
  const g = graphOf(["ana-ben", "ana-cy", "ben-dee"], ["eli"]);
  const r = new Recommender(g);
  eq(r.recommend("ana"), [{ id: "dee", mutual: 1 }]);
  g.addFriendship("cy", "dee");
  eq(r.recommend("ana"), [{ id: "dee", mutual: 2 }]);
  g.removeFriendship("ben", "dee");
  eq(r.recommend("ana"), [{ id: "dee", mutual: 1 }]);
});

test("level 3: deactivating a friend of a friend removes them from your suggestions", () => {
  const g = graphOf(["ana-ben", "ben-cy", "ben-dee"]);
  const r = new Recommender(g);
  r.recommend("ana");
  g.deactivate("cy");
  eq(r.recommend("ana"), [{ id: "dee", mutual: 1 }]);
});

test("level 3: deactivating a friend stops them counting as a mutual friend", () => {
  const g = graphOf(["ana-ben", "ana-cy", "ben-dee", "cy-dee"]);
  const r = new Recommender(g);
  r.recommend("ana");
  g.deactivate("cy");
  eq(r.recommend("ana"), [{ id: "dee", mutual: 1 }]);
});

test("level 3: a block takes effect on the next call for both users", () => {
  const g = graphOf(["ana-ben", "ben-cy"]);
  const r = new Recommender(g);
  r.recommend("ana");
  r.recommend("cy");
  r.block("ana", "cy");
  eq(r.recommend("ana"), []);
  eq(r.recommend("cy"), []);
});

test("level 3: changing the returned list does not change the next answer", () => {
  const g = graphOf(["ana-ben", "ben-cy", "ben-dee"]);
  const r = new Recommender(g);
  const first = r.recommend("ana");
  first.pop();
  first[0].mutual = 99;
  eq(r.recommend("ana"), [{ id: "cy", mutual: 1 }, { id: "dee", mutual: 1 }]);
});

test("level 3: a change far away keeps an unrelated user's suggestions cached", () => {
  const g = graphOf(["ana-ben", "ben-cy", "x1-x2", "x2-x3"], ["x4"]);
  const r = new Recommender(g);
  const c = counting(g);
  r.recommend("ana");
  g.addFriendship("x3", "x4");
  g.deactivate("x1");
  c.calls = 0;
  eq(r.recommend("ana"), [{ id: "cy", mutual: 1 }]);
  eq(c.calls, 0, "friendsOf calls for ana after changes that cannot affect her");
});

test("level 3: always matches the spec through random changes", () => {
  const rand = rng(23);
  const ids = Array.from({ length: 14 }, (_, i) => "p" + i);
  const g = new SocialGraph();
  for (const id of ids) g.addUser(id);
  const r = new Recommender(g);
  const hidden = new Set(); // "u>c": c must not be suggested to u (blocked either way, or dismissed by u)
  const pick = () => ids[Math.floor(rand() * ids.length)];
  for (let step = 0; step < 400; step++) {
    const x = rand(), a = pick(), b = pick();
    if (x < 0.4) g.addFriendship(a, b);
    else if (x < 0.6) g.removeFriendship(a, b);
    else if (x < 0.63) g.deactivate(a);
    else if (x < 0.68) { if (r.block(a, b)) hidden.add(a + ">" + b).add(b + ">" + a); }
    else if (x < 0.75) { if (r.dismiss(a, b)) hidden.add(a + ">" + b); }
    else {
      const k = 1 + Math.floor(rand() * 5);
      eq(r.recommend(a, k), expected(a, k), "step " + step + ", user " + a + ", k = " + k);
    }
  }

  function expected(u, k) {
    if (!g.isActive(u)) return [];
    const out = [];
    for (const c of ids) {
      if (c === u || g.areFriends(u, c) || !g.isActive(c) || hidden.has(u + ">" + c)) continue;
      let m = 0;
      for (const f of ids) if (g.isActive(f) && g.areFriends(u, f) && g.areFriends(f, c)) m++;
      if (m) out.push({ id: c, mutual: m });
    }
    out.sort((p, q) => q.mutual - p.mutual || (p.id < q.id ? -1 : 1));
    return out.slice(0, k);
  }
});
