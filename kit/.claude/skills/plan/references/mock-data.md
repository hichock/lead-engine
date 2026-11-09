# Example data for the dashboard mock

`npm run mock -- --data=docs/mock-data.json --title="<Company> leads" --accent=#<hex> --out=docs/dashboard-mock.html`
renders the same dashboard the owner will use (the report view), with a yellow "Example data" banner.

Make the rows fit *their* plan: their niche, their countries, the signal kinds of the chosen channels, evidence lines
like the ones qualify would write. Every company and person is made up: `.example` domains, invented names, no real
firms. 8 to 12 companies, 3 to 5 people with `ok`, 2 drafts, 1 sent, 1 reply, 3 to 5 source runs.

Shape (camelCase, the app's types in `lib/types.ts`):

```json
{
  "companies": [{ "id": "c1", "domain": "harbour-dental.example", "name": "Harbour Dental", "country": "UK",
    "sizeBand": "11-50", "tech": ["Dentally"], "source": "register:gdc", "evidence": "Online booking on Dentally, no deposit step",
    "qualified": true, "qualifyReason": "Live practice site; 11-50; UK", "score": 72,
    "why": ["Fit 1: UK is a target country · size 11-50 (weight 1)", "Trigger 0.72: job: Practice manager role open 41 days"],
    "status": "qualified", "createdAt": "2026-11-02T09:00:00Z" }],
  "signals": [{ "id": "s1", "companyId": "c1", "personId": null, "kind": "job", "value": "Practice manager role open 41 days",
    "url": null, "observedAt": "2026-11-05T00:00:00Z" }],
  "people": [{ "id": "p1", "companyId": "c1", "name": "Alex Moreno", "role": "Practice Manager", "email": "alex@harbour-dental.example",
    "verifyStatus": "ok", "verifySource": "millionverifier", "linkedinUrl": null, "offerKey": null, "suppressed": false }],
  "messages": [{ "id": "m1", "personId": "p1", "companyId": "c1", "channel": "email", "mailbox": null, "step": 1,
    "subject": "booking deposits", "body": "Hi Alex,\n\n...", "direction": "out", "class": null, "status": "draft",
    "sendAfter": null, "sentAt": null }],
  "runs": [{ "id": "r1", "source": "urlscan", "inputHash": "x", "startedAt": "2026-11-09T06:17:00Z", "rowsIn": 140,
    "rowsKept": 31, "costUsd": 0, "units": 10, "status": "ok", "note": null }]
}
```
Signal kinds: tech, register, job, ad, review, comment, request. Statuses: new, qualified, rejected, contacted,
replied. Sources in runs: urlscan, httparchive, apollo, monid, millionverifier, apify. Dates relative to today.
