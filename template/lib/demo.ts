import type { Company, Mailbox, Message, Person, Signal, SourceRun } from "./types";
import { DEFAULT_SCORING, scoreCompany } from "./scoring";

// Example data for DEMO=1. Every company, person and address here is made up (.example domains, example.com mail).
// Shown with a "Demo data" banner; never written anywhere.

export const DEMO_NOW = new Date(Date.UTC(2026, 10, 9, 11, 0, 0));
const d = (daysAgo: number, hour = 10) => new Date(Date.UTC(2026, 10, 9 - daysAgo, hour, 0, 0)).toISOString();

type Seed = [id: string, domain: string, name: string, country: string, size: string, tech: string[], source: string, q: boolean | null, status: Company["status"], evidence: string | null];
const seeds: Seed[] = [
  ["c01", "harbourline-logistics.example", "Harbourline Logistics", "UK", "11-50", ["Softr", "Airtable"], "urlscan", true, "qualified", "Client portal on Softr at track.harbourline-logistics.example, 5.4 s to load on a phone"],
  ["c02", "meridian-dental.example", "Meridian Dental Group", "US", "51-200", ["Bubble"], "httparchive", true, "contacted", "Patient booking app on Bubble with 4 separate logins"],
  ["c03", "northfield-legal.example", "Northfield Legal", "US", "11-50", ["Airtable"], "registers", true, "replied", "Intake form posts to an Airtable base"],
  ["c04", "copperleaf-studio.example", "Copperleaf Studio", "UK", "1-10", ["Webflow", "Memberstack"], "urlscan", true, "qualified", "Members area on Memberstack, 3 paid tiers"],
  ["c05", "brightwater-clinics.example", "Brightwater Clinics", "IE", "51-200", ["Glide"], "httparchive", true, "qualified", "Staff rota app on Glide at rota.brightwater-clinics.example"],
  ["c06", "tallow-and-pine.example", "Tallow & Pine", "US", "11-50", ["Make"], "urlscan", null, "new", null],
  ["c07", "eastgate-recruit.example", "Eastgate Recruitment", "UK", "11-50", ["Airtable"], "source-signals", true, "qualified", "Candidate tracker shared as an Airtable view"],
  ["c08", "solent-surveyors.example", "Solent Surveyors", "UK", "1-10", ["Softr"], "urlscan", true, "qualified", "Survey request portal on Softr"],
  ["c09", "quayside-events.example", "Quayside Events", "AU", "11-50", ["Bubble"], "httparchive", null, "new", null],
  ["c10", "pinecrest-accounting.example", "Pinecrest Accounting", "US", "11-50", ["Airtable", "Zapier"], "people", true, "qualified", "Client onboarding checklist in Airtable, Zapier hook on the form"],
  ["c11", "freehold-fitness.example", "Freehold Fitness", "UK", "1-10", ["GoHighLevel"], "urlscan", false, "rejected", null],
  ["c12", "secure-login-update.example", "secure-login-update", "?", "", ["Airtable"], "urlscan", false, "rejected", null],
];
const qualifyReasons: Record<string, string> = {
  c11: "Marketing site only, no app or portal behind it",
  c12: "Phishing page: login form copying a bank, domain 3 days old",
};


export const demoSignals: Signal[] = [
  { id: "s1", companyId: "c01", personId: null, kind: "job", value: "Ops coordinator role names Airtable and Softr", url: "https://jobs.example/harbourline/ops", observedAt: d(2) },
  { id: "s2", companyId: "c01", personId: null, kind: "tech", value: "Softr (track.harbourline-logistics.example)", url: "https://urlscan.io/result/example", observedAt: d(3) },
  { id: "s3", companyId: "c01", personId: null, kind: "tech", value: "Airtable embed on /quote", url: null, observedAt: d(3) },
  { id: "s4", companyId: "c01", personId: "p01", kind: "comment", value: "Commented on a post about client portals that outgrew no-code", url: null, observedAt: d(5) },
  { id: "s5", companyId: "c02", personId: null, kind: "tech", value: "Bubble (book.meridian-dental.example)", url: null, observedAt: d(6) },
  { id: "s6", companyId: "c02", personId: null, kind: "review", value: "3 reviews mention the booking app logging out", url: null, observedAt: d(9) },
  { id: "s7", companyId: "c03", personId: null, kind: "register", value: "State bar listing, firm of 14 attorneys", url: null, observedAt: d(12) },
  { id: "s8", companyId: "c03", personId: null, kind: "tech", value: "Airtable form embed on /intake", url: null, observedAt: d(4) },
  { id: "s9", companyId: "c04", personId: null, kind: "comment", value: "Asked how to move members off Memberstack", url: null, observedAt: d(1) },
  { id: "s10", companyId: "c04", personId: null, kind: "tech", value: "Memberstack on Webflow", url: null, observedAt: d(5) },
  { id: "s11", companyId: "c05", personId: null, kind: "job", value: "Practice manager role names Glide", url: null, observedAt: d(3) },
  { id: "s12", companyId: "c06", personId: null, kind: "tech", value: "Make webhook fires on every page view", url: null, observedAt: d(2) },
  { id: "s13", companyId: "c07", personId: null, kind: "job", value: "First ops hire, open 41 days (ATS first_published)", url: null, observedAt: d(10) },
  { id: "s14", companyId: "c08", personId: null, kind: "tech", value: "Softr portal", url: null, observedAt: d(8) },
  { id: "s15", companyId: "c09", personId: null, kind: "tech", value: "Bubble app", url: null, observedAt: d(11) },
  { id: "s16", companyId: "c10", personId: null, kind: "tech", value: "Zapier hook on the signup form", url: null, observedAt: d(14) },
  { id: "s17", companyId: "c11", personId: null, kind: "tech", value: "GoHighLevel site", url: null, observedAt: d(6) },
  { id: "s18", companyId: "c12", personId: null, kind: "tech", value: "Airtable embed", url: null, observedAt: d(2) },
];

export const demoPeople: Person[] = [
  { id: "p01", companyId: "c01", name: "Dana Whitlock", role: "Operations Director", email: "dana@harbourline-logistics.example", verifyStatus: "ok", verifySource: "millionverifier", linkedinUrl: null, offerKey: "portal-rebuild", suppressed: false },
  { id: "p02", companyId: "c01", name: "Sam Okafor", role: "Office Manager", email: "sam@harbourline-logistics.example", verifyStatus: "catch_all", verifySource: "millionverifier", linkedinUrl: null, offerKey: null, suppressed: false },
  { id: "p03", companyId: "c02", name: "Lee Moreno", role: "Practice Owner", email: "lee@meridian-dental.example", verifyStatus: "ok", verifySource: "millionverifier", linkedinUrl: null, offerKey: "booking-app", suppressed: false },
  { id: "p04", companyId: "c03", name: "Priya Shah", role: "Managing Partner", email: "pshah@northfield-legal.example", verifyStatus: "ok", verifySource: "register", linkedinUrl: null, offerKey: "intake", suppressed: false },
  { id: "p05", companyId: "c04", name: "Tom Ellery", role: "Founder", email: "tom@copperleaf-studio.example", verifyStatus: "ok", verifySource: "millionverifier", linkedinUrl: null, offerKey: "members", suppressed: false },
  { id: "p06", companyId: "c05", name: "Aoife Brennan", role: "Practice Manager", email: null, verifyStatus: "unverified", verifySource: null, linkedinUrl: null, offerKey: null, suppressed: false },
  { id: "p07", companyId: "c07", name: "Marcus Hale", role: "Director", email: "marcus@eastgate-recruit.example", verifyStatus: "unknown", verifySource: "millionverifier", linkedinUrl: null, offerKey: null, suppressed: false },
];

export const demoMessages: Message[] = [
  { id: "m1", personId: "p01", companyId: "c01", channel: "email", mailbox: null, step: 1, subject: "track portal speed", body: "Hi Dana,\n\nYour tracking portal at track.harbourline-logistics.example took 5.4 seconds to load on a phone when I checked it this morning. Most of that is the Softr page waiting on Airtable.\n\nI wrote down the three changes that would get it under a second. Want me to send the note?\n\nAlex", direction: "out", class: null, status: "draft", sendAfter: null, sentAt: null },
  { id: "m2", personId: "p01", companyId: "c01", channel: "email", mailbox: null, step: 2, subject: "", body: "One more detail: the quote form on /quote writes to the same Airtable base, so a slow day for the portal is a slow day for new quotes too.\n\nAlex", direction: "out", class: null, status: "draft", sendAfter: null, sentAt: null },
  { id: "m3", personId: "p03", companyId: "c02", channel: "email", mailbox: "alex@trylumen.example", step: 1, subject: "booking app logins", body: "Hi Lee,\n\nPatients at Meridian sign in to four different places to book, pay and see notes. Three recent reviews mention being logged out mid-booking.\n\nHappy to show what one login would look like. Worth a look?\n\nAlex", direction: "out", class: null, status: "sent", sendAfter: null, sentAt: d(3, 10) },
  { id: "m4", personId: "p03", companyId: "c02", channel: "email", mailbox: "alex@trylumen.example", step: 2, subject: "", body: "One thing I left out: the booking app and the payment page keep separate logins, so a patient who pays first has to sign in twice.\n\nAlex", direction: "out", class: null, status: "queued", sendAfter: null, sentAt: null },
  { id: "m5", personId: "p04", companyId: "c03", channel: "email", mailbox: "jo@getlumen.example", step: 1, subject: "intake form", body: "Hi Priya,\n\nThe intake form on your site sends every enquiry into an Airtable base. Nothing tells the client their message arrived, and nobody gets a nudge when it sits for a day.\n\nI can show what a 1-page intake tracker would look like for a firm your size. Worth a look?\n\nJo", direction: "out", class: null, status: "sent", sendAfter: null, sentAt: d(5, 14) },
  { id: "m6", personId: "p04", companyId: "c03", channel: "email", mailbox: "jo@getlumen.example", step: 0, subject: "Re: intake form", body: "Thanks. What would this cost for a firm our size?", direction: "in", class: "question", status: "sent", sendAfter: null, sentAt: d(4, 9) },
  { id: "m7", personId: "p05", companyId: "c04", channel: "email", mailbox: null, step: 1, subject: "members area", body: "Hi Tom,\n\nCopperleaf runs three paid member tiers on Memberstack. You asked last week how to move members off it without losing their logins.\n\nI wrote up how we would do it in a week. Want the note?\n\nAlex", direction: "out", class: null, status: "queued", sendAfter: d(0, 9), sentAt: null },
];

export const demoMailboxes: Mailbox[] = [
  { id: "mb1", email: "alex@trylumen.example", fromName: "Alex Carter", dailyCap: 15, active: true, lastSentAt: d(0, 9), sentToday: 6 },
  { id: "mb2", email: "jo@getlumen.example", fromName: "Jo Carter", dailyCap: 15, active: true, lastSentAt: d(0, 9), sentToday: 4 },
  { id: "mb3", email: "alex@getlumen.example", fromName: "Alex Carter", dailyCap: 10, active: false, lastSentAt: null, sentToday: 0 },
];

export const demoRuns: SourceRun[] = [
  { id: "r1", source: "httparchive", inputHash: "a1", startedAt: d(0, 7), rowsIn: 2960, rowsKept: 110, costUsd: 0, units: 21.0, status: "ok", note: null },
  { id: "r2", source: "urlscan", inputHash: "a2", startedAt: d(0, 6), rowsIn: 169, rowsKept: 41, costUsd: 0, units: 10, status: "ok", note: null },
  { id: "r3", source: "millionverifier", inputHash: "a3", startedAt: d(0, 8), rowsIn: 59, rowsKept: 30, costUsd: 0.22, units: 59, status: "ok", note: null },
  { id: "r4", source: "monid", inputHash: "a4", startedAt: d(0, 8), rowsIn: 12, rowsKept: 5, costUsd: 0.38, units: 0, status: "ok", note: null },
  { id: "r5", source: "monid", inputHash: "a5", startedAt: d(0, 8), rowsIn: 0, rowsKept: 0, costUsd: 0, units: 0, status: "refused", note: "company is not qualified: run qualify first (paid contact work only on qualified companies)" },
  { id: "r6", source: "apify", inputHash: "a6", startedAt: d(0, 9), rowsIn: 0, rowsKept: 0, costUsd: 0, units: 0, status: "refused", note: "Apify is off: set an Apify budget in Settings first" },
  { id: "r7", source: "apollo", inputHash: "a7", startedAt: d(1, 9), rowsIn: 148, rowsKept: 25, costUsd: 0, units: 2, status: "ok", note: null },
  { id: "r8", source: "urlscan", inputHash: "a8", startedAt: d(1, 6), rowsIn: 131, rowsKept: 33, costUsd: 0, units: 10, status: "ok", note: null },
  { id: "r9", source: "httparchive", inputHash: "a9", startedAt: d(1, 7), rowsIn: 0, rowsKept: 0, costUsd: 0, units: 0, status: "refused", note: "same input already ran in the last 24 h; try again in ~3 h or change the input" },
];


// Scores come from the real scoring code, so the demo shows exactly what the app computes.
const demoScoring = { ...DEFAULT_SCORING, countries: ["UK", "US"], tools: ["Softr", "Airtable", "Bubble", "Glide", "Memberstack"] };

export const demoCompanies: Company[] = seeds.map(([id, domain, name, country, size, tech, source, q, status, evidence], i) => {
  const r = scoreCompany({ country: country === "?" ? null : country, sizeBand: size || null, tech, qualified: q,
    signals: demoSignals.filter((s) => s.companyId === id) }, DEMO_NOW, demoScoring);
  return {
    id, domain, name, country: country === "?" ? null : country, sizeBand: size || null, tech, source, evidence,
    qualified: q, qualifyReason: qualifyReasons[id] ?? (q ? "Live app found; real business; size and country fit" : null),
    score: r.score, why: r.why, status, createdAt: d(i + 1),
  };
});
