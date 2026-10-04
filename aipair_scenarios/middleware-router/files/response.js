// A fake response object for tests: tracks what would be sent, with no real server involved. This file already works.
function mkRes() {
  return {
    statusCode: 200,
    sent: false,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      this.sent = true;
      return this;
    },
    json(body) {
      return this.send(body);
    }
  };
}

module.exports = { mkRes };
