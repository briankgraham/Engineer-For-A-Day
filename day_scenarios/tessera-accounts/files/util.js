// Errors the HTTP layer maps to 4xx responses carry a machine-readable code.
function codeError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function validEmail(email) {
  return typeof email === "string" && EMAIL.test(email.trim());
}

// The form emails are compared in: trimmed and lowercased. Throws TypeError for anything that is not an email address.
function normalizeEmail(email) {
  if (!validEmail(email)) throw new TypeError("bad email address");
  return email.trim().toLowerCase();
}

module.exports = { codeError, validEmail, normalizeEmail };
