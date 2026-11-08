// Send-window and calendar helpers for the own sender. Pure.

// Lead's time zone from its country (first match wins). Default: Europe/London. The owner can store a timezone per
// company to override this.
const TZ: [RegExp, string][] = [
  [/^(us|usa|united states)$/i, "America/Chicago"], [/^(ca|canada)$/i, "America/Toronto"],
  [/^(au|australia)$/i, "Australia/Sydney"], [/^(nz|new zealand)$/i, "Pacific/Auckland"],
  [/^(uk|gb|united kingdom|england|scotland|wales|northern ireland)$/i, "Europe/London"], [/^(ie|ireland)$/i, "Europe/Dublin"],
  [/^(br|brazil)$/i, "America/Sao_Paulo"], [/^(mx|mexico)$/i, "America/Mexico_City"], [/^(in|india)$/i, "Asia/Kolkata"],
  [/^(za|south africa)$/i, "Africa/Johannesburg"], [/^(sg|singapore)$/i, "Asia/Singapore"], [/^(ae|uae|united arab emirates)$/i, "Asia/Dubai"],
  [/^(de|fr|nl|be|at|ch|es|it|se|no|dk|fi|cz|pl|pt|lu|germany|france|netherlands|belgium|austria|switzerland|spain|italy|sweden|norway|denmark|finland|czechia|poland|portugal|luxembourg)$/i, "Europe/Berlin"],
];

export function tzFor(country: string | null, timezone?: string | null): string {
  if (timezone) return timezone;
  const c = (country ?? "").trim();
  return TZ.find(([re]) => re.test(c))?.[1] ?? "Europe/London";
}

function localParts(d: Date, tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", hour: "numeric", hour12: false })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  return { day: String(p.weekday), hour: Number(p.hour) % 24 };
}

// True Mon–Fri between startHour (inclusive) and endHour (exclusive) in the lead's time zone.
export function inWindow(d: Date, tz: string, startHour = 9, endHour = 17): boolean {
  const { day, hour } = localParts(d, tz);
  return day !== "Sat" && day !== "Sun" && hour >= startHour && hour < endHour;
}

// Adds business days (skips Saturday and Sunday, UTC calendar).
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) left--;
  }
  return d;
}

// Start of the run day (UTC midnight). Caps "per run" mean per UTC day.
export function startOfRunDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function startOfMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
