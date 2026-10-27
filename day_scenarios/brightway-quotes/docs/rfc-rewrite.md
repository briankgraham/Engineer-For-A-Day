# RFC: Rewrite the quote engine (Quote v2)

Author: Marisol Vega · Status: Draft, review Thursday · Reviewers: you, Teo

## Problem

`quote.js` is the most important file we have and nobody wants to touch it. Every pricing request from Sales (a new fee, a special deal for one customer) is a risky change in a function with almost no tests, and we cannot hire anyone who can be productive in it.

## Proposal

1. Build Quote v2 as a new service in TypeScript with a declarative rules engine, so Sales can add and change pricing rules without an engineer.
2. Write the rules from the spec: the team wiki page *Quote service notes* describes every step of the price.
3. Two engineers, six weeks. Feature work on `quote.js` is frozen until the cutover.
4. Cut over all customers at once on Monday 4 January at 06:00 UTC, right after the weekly rates import.
5. Delete `quote.js` the same week.

## Why this works

- The wiki already documents the rules, so we do not need to read the old code.
- A clean design with unit tests will be easier to reason about than patching a 2017 function.
- One cutover is simpler than running two engines side by side.
- If something goes wrong we redeploy the old service, which we keep for a week.

## Open questions

- TypeScript or Kotlin?
- Which rules engine library?
