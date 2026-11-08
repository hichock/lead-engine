# Qualify gates in practice

## Drop reasons seen (author, 370 cleaned urlscan hosts, approx., 2026-11-03)
phishing/parked ~60 · personal/demo ~120 · nonprofits/schools ~45 · big enterprises ~10 · competitors ~8 ·
no static evidence ~70 · SaaS whose product is the no-code app ~20. About 1 in 4 Softr sites was a real business.

## Phishing and junk signs
- Login form imitating a bank, Microsoft 365, DocuSign, a courier; brand name in a random hyphenated domain.
- Domain registered days ago (check with `whois <domain> | grep -i creat` when available).
- Page loads a real tool host (Airtable, Softr) only to collect credentials: tool presence does not mean customer.
- Template text ("Lorem ipsum", "Your company name"), default tool subdomains with demo names.
Mark phishing as rejected with the reason; never visit forms or submit anything.

## "Still on the tool" (live check)
7 domains had already left Softr between the crawl and the check (measured 2026-11-03). Always re-fetch.
Every Softr page carries "AIRTABLE" in a generic config, so that string alone does not prove an Airtable backend.

## Evidence line rules
- A checkable fact about their system, visible today: where the app lives, what it does, a measured number.
- Never a tab title (decision 2026-11-08 in the author's KB), never a guess about their revenue.
- A "problem count" only when there are at least 2 real problems.
- If you only have a weak fact, qualify = true is still fine, but say "weak evidence" in the reason so `score` and
  `first-lines` know.

## Measured app facts (optional, strong hook)
Playwright with the iPhone 13 profile measures load time, request count and page weight, e.g. "5.4 seconds on a
phone" (measured 2026-11-06). Example:
```bash
npx playwright@1 install chromium   # once
node -e '
const { chromium, devices } = require("playwright");
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices["iPhone 13"] });
  const p = await c.newPage(); let n = 0, bytes = 0;
  p.on("response", async r => { n++; try { bytes += (await r.body()).length } catch {} });
  const t = Date.now(); await p.goto(process.argv[1], { waitUntil: "load", timeout: 45000 });
  console.log(JSON.stringify({ seconds: ((Date.now() - t) / 1000).toFixed(1), requests: n, mb: (bytes / 1e6).toFixed(1) }));
  await b.close(); })();' "https://portal.acme.example/"
```
Run it twice and use the slower figure only if both are close; say "when I checked it this morning" in copy.

## Size signals
Team page headcount, "our 25 staff", register firm size, LinkedIn company page band. Big enterprises (traffic rank in
the top few thousand, 500+ staff) rarely fit a small-studio offer (assumed): reject unless `kb/icp.md` wants them.
