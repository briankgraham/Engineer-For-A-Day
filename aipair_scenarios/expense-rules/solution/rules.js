// The expense policy engine. Finance writes the company policy as a list of rules (plain data, see the brief);
// createEngine checks the rules once, and engine.evaluate(expenses) returns the violations.
const { toCents } = require("./money");

// How each rule type groups the expenses it applies to. Every group is checked on its own: a deny rule
// rejects every group, the other types reject a group whose total is over the limit. A group of null
// means the expense is not part of any group (an expense with no trip, for a trip rule).
const TYPES = {
  deny: { limit: false, group: e => ({ key: e.id }) },
  max_amount: { limit: true, group: e => ({ key: e.id }) },
  trip_total: { limit: true, group: e => (e.tripId == null ? null : { key: e.tripId, tripId: e.tripId }) },
  daily_total: { limit: true, group: e => dayGroup(e) },
};

// The day is the local date written in spentAt ("2026-03-02T21:30:00-05:00" is March 2), not the UTC date.
function dayGroup(e) {
  const date = e.spentAt.slice(0, 10);
  return { key: e.employeeId + " " + date, employeeId: e.employeeId, date };
}

const isWhereValue = v => typeof v === "string" || (Array.isArray(v) && v.length > 0 && v.every(x => typeof x === "string"));

function applies(where, e) {
  return Object.entries(where).every(([field, want]) => (Array.isArray(want) ? want.includes(e[field]) : e[field] === want));
}

function compile(rule, seen) {
  if (!rule || typeof rule.id !== "string" || !rule.id) throw new RangeError("every rule needs an id");
  if (seen.has(rule.id)) throw new RangeError("duplicate rule id " + rule.id);
  seen.add(rule.id);
  if (!Object.hasOwn(TYPES, rule.type)) throw new RangeError(`rule ${rule.id}: unknown type ${JSON.stringify(rule.type)}`);
  const type = TYPES[rule.type];
  const where = rule.where === undefined ? {} : rule.where;
  if (!where || typeof where !== "object" || Array.isArray(where) || !Object.values(where).every(isWhereValue)) throw new RangeError(`rule ${rule.id}: bad where`);
  return { id: rule.id, where, group: type.group, limit: type.limit ? toCents(rule.limit) : null };
}

function createEngine(rules) {
  if (!Array.isArray(rules)) throw new RangeError("rules must be an array");
  const seen = new Set();
  const compiled = rules.map(r => compile(r, seen));
  return {
    evaluate(expenses) {
      const violations = [];
      for (const rule of compiled) {
        const groups = new Map(); // key -> { fields, cents, expenseIds }, in order of each group's first expense
        for (const e of expenses) {
          if (!applies(rule.where, e)) continue;
          const g = rule.group(e);
          if (!g) continue; // a trip rule and an expense with no trip
          const { key, ...fields } = g;
          if (!groups.has(key)) groups.set(key, { fields, cents: 0, expenseIds: [] });
          const acc = groups.get(key);
          acc.cents += toCents(e.amountUsd);
          acc.expenseIds.push(e.id);
        }
        for (const { fields, cents, expenseIds } of groups.values()) {
          if (rule.limit === null || cents > rule.limit) violations.push({ ruleId: rule.id, ...fields, expenseIds });
        }
      }
      return violations;
    },
  };
}

module.exports = { createEngine };
