// Domain helpers. Pure.
const TWO_PART = new Set(["co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "net.au", "org.au", "co.nz", "com.br", "co.za", "com.mx", "co.in", "com.sg", "co.jp", "com.tr"]);

// "https://www.Portal.Acme.co.uk/x" → "portal.acme.co.uk"
export function hostOf(input: string): string {
  const s = input.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").split(/[/?#]/)[0].split(":")[0];
  return s.replace(/^www\./, "").replace(/\.$/, "");
}

// "portal.acme.co.uk" → "acme.co.uk". Good enough for company identity; not a full public-suffix list.
export function apexOf(input: string): string {
  const parts = hostOf(input).split(".");
  if (parts.length <= 2) return parts.join(".");
  const last2 = parts.slice(-2).join(".");
  return TWO_PART.has(last2) ? parts.slice(-3).join(".") : last2;
}

export const isDomain = (s: string) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s);
