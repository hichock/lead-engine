# Register adapter template

Save as `scripts/registers/<name>.py`. Keep it under ~80 lines. Commit it so the next run reuses it.

```python
#!/usr/bin/env python3
"""<Register name> adapter. Usage: <name>.py --area "<area>" --cities "A,B" --pages 2 > out.jsonl
Terms checked on <date>: <verdict and link>. Polite: 1 request per 2 s, max pages enforced."""
import argparse, html, json, re, sys, time, urllib.parse, urllib.request

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
BASE = "https://<register>/search?"          # the public search page
PAGE_SIZE = 50

def fetch(params):
    req = urllib.request.Request(BASE + urllib.parse.urlencode(params), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "ignore")

def decode_cfemail(hexstr):                    # only for emails the page itself shows to visitors
    k = int(hexstr[:2], 16)
    return "".join(chr(int(hexstr[i:i + 2], 16) ^ k) for i in range(2, len(hexstr), 2))

def parse(page, city, area):
    rows = []
    for block in page.split('<li class="result">')[1:]:          # adjust to the register's markup
        name = re.search(r'class="name">([^<]+)', block)
        site = re.search(r'href="(https?://[^"]+)"[^>]*>\s*Website', block)
        em = re.search(r'data-cfemail="([0-9a-f]+)"', block)
        if not name:
            continue
        rows.append({"name": html.unescape(name.group(1)).strip(), "website": site.group(1) if site else "",
                     "email": decode_cfemail(em.group(1)) if em else "", "city": city, "area": area})
    return rows

if __name__ == "__main__":
    a = argparse.ArgumentParser(); a.add_argument("--area"); a.add_argument("--cities"); a.add_argument("--pages", type=int, default=2)
    o = a.parse_args()
    for city in o.cities.split(","):
        for p in range(1, o.pages + 1):
            rows = parse(fetch({"city": city, "area": o.area, "page": p, "size": PAGE_SIZE}), city, o.area)
            for r in rows:
                print(json.dumps(r))
            if len(rows) < PAGE_SIZE:
                break
            time.sleep(2)
```

Convert to ingest rows with a short script: domain from `website` (or from the email when it is not a free mailbox),
one company per domain, `kind: "register"` signal, people only with a published email.
