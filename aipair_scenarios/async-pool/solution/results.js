// Small helpers for the settled-result shape used by settle mode. Already done.
const fulfilled = value => ({ status: "fulfilled", value });
const rejected = reason => ({ status: "rejected", reason });

module.exports = { fulfilled, rejected };
