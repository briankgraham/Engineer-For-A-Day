# Quote service notes

Team wiki · last edited by Gustav Lindahl (left the company) · 3 years ago

> Heads up from the current team: nobody has had time to re-read this page since Gustav left. Check it against the code before you rely on it.

## What it does

`quote(req)` prices one parcel and returns `{ amount, currency, zone, chargeableKg }`. Money is cents. It is called by the web checkout, the partner API and the sales tool.

## How a price is built

1. **Zone.** The destination country (and for the US, the postcode) maps to a zone from 1 to 9. Zone 9 is only used for Antarctica and test requests.
2. **Chargeable weight.** The heavier of the actual weight and the volume (L × W × H in cm, divided by 5000), **rounded to the nearest half kilo**.
3. **Rate.** The zone's `base` (charged once) plus `perKg` for each chargeable kilo.
4. **Contract discount.** If the customer has a contract, the discount percentage is taken off the **final price**.
5. **Surcharges.** A flat residential fee, 15% for pickups on a weekend **in the warehouse's local day**, then fuel.
6. **Minimum charge.** No quote is cheaper than the minimum charge.

## Things to know

- `weight_lbs` was a stop-gap for the old checkout. We removed that checkout in 2020, so it is gone.
- Ops set `fuelPct` every Monday through `setFuelPct`.
- Quotes are valid for 7 days and the system honors the price it quoted.
- The rate card is imported every Monday at 06:00 UTC and is the same on every worker.
- Runbook flags (ask the SRE on call): `contract_pricing` (on: customers with a contract get their discount; off: everybody pays list price).
