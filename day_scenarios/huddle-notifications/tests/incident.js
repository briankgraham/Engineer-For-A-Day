// Hidden: INC-0519 (the same push delivered several times). Runs when the day ends.
// The push client here lets each test decide which sends fail, and when they settle.
function scriptedPush() {
  const calls = [], fail = {};
  let n = 0;
  return {
    calls, fail, // fail[token] = HTTP status to fail that token with (cleared after one use unless sticky)
    send(msg) {
      calls.push(msg);
      const status = fail[msg.token];
      if (status) {
        if (status !== 410) delete fail[msg.token];
        const e = new Error("Pushly " + status);
        e.status = status;
        return Promise.reject(e);
      }
      return Promise.resolve({ messageId: "m_" + ++n });
    },
  };
}
function mk(push = scriptedPush()) {
  const { createApp } = require("./app");
  const app = createApp({ push, now: mkClock().now });
  app.createUser({ id: "maya", name: "Maya" });
  for (const id of ["ben", "zoe", "ali"]) {
    app.createUser({ id, name: id });
    app.registerDevice(id, "tk_" + id);
    app.follow(id, "maya");
  }
  return { app, push };
}
const post = id => ({ id, type: "post.created", actorId: "maya", text: "Live in 5 minutes!" });
const sendsTo = (push, token) => push.calls.filter(c => c.token === token).length;
const settle = p => p.then(() => null, e => e);

test("the same event delivered twice sends each device one push", async () => {
  const { app, push } = mk();
  await app.handleEvent(post("ev_1"));
  await settle(app.handleEvent(post("ev_1")));
  eq(push.calls.length, 3, "pushes sent");
});

test("one failing device does not stop the other followers from getting the push", async () => {
  const { app, push } = mk();
  push.fail["tk_ben"] = 503;
  await settle(app.handleEvent(post("ev_1")));
  eq(sendsTo(push, "tk_zoe"), 1);
  eq(sendsTo(push, "tk_ali"), 1);
});

test("after a temporary failure the event still fails so the queue retries it, and the retry only resends the failed device", async () => {
  const { app, push } = mk();
  push.fail["tk_zoe"] = 503;
  const err = await settle(app.handleEvent(post("ev_1")));
  assert(err, "handleEvent should reject so the queue redelivers the event");
  await app.handleEvent(post("ev_1"));
  eq(sendsTo(push, "tk_ben"), 1);
  eq(sendsTo(push, "tk_ali"), 1);
  eq(sendsTo(push, "tk_zoe"), 2, "the failed device is tried again");
  eq(app.deliveriesFor("zoe").length, 1);
});

test("a token Pushly reports as unregistered (410) is removed, not retried, and does not fail the event", async () => {
  const { app, push } = mk();
  push.fail["tk_ali"] = 410;
  const err = await settle(app.handleEvent(post("ev_1")));
  eq(err, null, "a dead token is not a reason to redeliver the event");
  eq(app.getUser("ali").devices, []);
  await app.handleEvent(post("ev_2"));
  eq(sendsTo(push, "tk_ali"), 1, "the dead token is not used again");
  eq(sendsTo(push, "tk_ben"), 2);
});

test("two workers handling the same event at the same time send each device once", async () => {
  const calls = [], waiting = [];
  let n = 0;
  const slow = { calls, send(msg) { calls.push(msg); const d = mkDeferred(); waiting.push(d); return d.promise; } };
  const { app } = mk(slow);
  const a = settle(app.handleEvent(post("ev_1")));
  const b = settle(app.handleEvent(post("ev_1")));
  for (let round = 0; round < 10; round++) {
    await flush();
    while (waiting.length) waiting.shift().resolve({ messageId: "m_" + ++n });
  }
  await a; await b;
  eq(calls.map(c => c.token).sort(), ["tk_ali", "tk_ben", "tk_zoe"]);
});
