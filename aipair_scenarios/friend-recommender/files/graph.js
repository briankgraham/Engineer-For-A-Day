// The social graph service. It is shared by the whole app (profiles, notifications, search) and it works:
// the bugs on the ticket are not in here.
// Friendships are mutual: addFriendship(a, b) makes b a friend of a and a a friend of b.
class SocialGraph {
  constructor() {
    this.friends = new Map(); // user id -> Set of friend ids
    this.inactive = new Set(); // deactivated user ids (they keep their friendships)
    this.listeners = [];
  }

  // Adds a user with no friends. Returns false if the id is already taken.
  addUser(id) {
    if (this.friends.has(id)) return false;
    this.friends.set(id, new Set());
    this._emit({ type: "addUser", id });
    return true;
  }

  hasUser(id) {
    return this.friends.has(id);
  }

  // True for a user that exists and has not been deactivated.
  isActive(id) {
    return this.friends.has(id) && !this.inactive.has(id);
  }

  // Returns false (and changes nothing) for an unknown user, the same user twice, or users who are already friends.
  addFriendship(a, b) {
    if (a === b || !this.friends.has(a) || !this.friends.has(b) || this.friends.get(a).has(b)) return false;
    this.friends.get(a).add(b);
    this.friends.get(b).add(a);
    this._emit({ type: "addFriendship", a, b });
    return true;
  }

  // Returns false (and changes nothing) if a and b are not friends.
  removeFriendship(a, b) {
    if (!this.friends.has(a) || !this.friends.get(a).has(b)) return false;
    this.friends.get(a).delete(b);
    this.friends.get(b).delete(a);
    this._emit({ type: "removeFriendship", a, b });
    return true;
  }

  // The user stays in the graph with their friendships, but no longer shows up anywhere in the product.
  deactivate(id) {
    if (!this.isActive(id)) return false;
    this.inactive.add(id);
    this._emit({ type: "deactivate", id });
    return true;
  }

  areFriends(a, b) {
    return this.friends.has(a) && this.friends.get(a).has(b);
  }

  // The friends of a user (active or not), or an empty set for an unknown user.
  // This is the graph's own set, not a copy (copying it on every call was too slow for the feed): do not modify it.
  friendsOf(id) {
    return this.friends.get(id) || new Set();
  }

  // Calls listener(event) after every change, with event.type one of "addUser" ({ id }), "addFriendship" ({ a, b }),
  // "removeFriendship" ({ a, b }) or "deactivate" ({ id }).
  onChange(listener) {
    this.listeners.push(listener);
  }

  _emit(event) {
    for (const l of this.listeners) l(event);
  }
}

module.exports = { SocialGraph };
