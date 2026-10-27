// Errors the HTTP layer maps to 4xx responses carry a machine-readable code.
function codeError(code, message) {
  var e = new Error(message);
  e.code = code;
  return e;
}

module.exports = { codeError: codeError };
