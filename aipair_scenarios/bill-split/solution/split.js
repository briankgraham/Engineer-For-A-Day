function splitEvenly(totalCents, people) {
  if (!Number.isInteger(totalCents) || totalCents < 0) throw new RangeError("bad total");
  if (!Number.isInteger(people) || people < 1) throw new RangeError("bad number of people");
  const base = Math.floor(totalCents / people);
  const extra = totalCents % people;
  return Array.from({ length: people }, (_, i) => base + (i < extra ? 1 : 0));
}

module.exports = { splitEvenly };
