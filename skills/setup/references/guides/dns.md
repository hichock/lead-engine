# DNS for sending domains

Do this for every sending domain, at the registrar or DNS host (Zapmail sets most of it for domains bought there).

| Record | Type | Name | Value (example) |
|---|---|---|---|
| SPF | TXT | `@` | Google: `v=spf1 include:_spf.google.com ~all` · Microsoft: `v=spf1 include:spf.protection.outlook.com ~all` (one SPF record per domain) |
| DKIM | TXT (Google) or CNAME (Microsoft) | `google._domainkey` / `selector1._domainkey` | from the mail admin: Google Admin → Apps → Gmail → **Authenticate email** → Generate new record; Microsoft Defender → Email authentication → DKIM |
| DMARC | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@<your main domain>` (start at `p=none`, move to `quarantine` later) |
| Redirect | URL redirect or a rule | `@` and `www` | 301 to `https://<your main site>` over HTTPS (Cloudflare redirect rules do this; some registrars' forwarding is HTTP only) |

Check after 10 to 60 minutes:
```bash
dig +short TXT <domain> | grep spf
dig +short TXT _dmarc.<domain>
dig +short TXT google._domainkey.<domain>
```
Or send one email to a Gmail address you own → **⋮** → **Show original**: SPF, DKIM and DMARC should all say PASS.
Gmail, Yahoo and Outlook require this for bulk senders (sourced); it matters at any volume. Avoid domains younger than
about 3 months for cold email where you can (very new domains landed on a blocklist in one playbook, sourced).
