import { parseFilters, toLeadsView, type LeadRow } from "../view/leads-view";
import { toOutreachView, type OutreachItem } from "../view/outreach-view";
import { toSourcesView } from "../view/sources-view";
import { readCaps, type Caps } from "../caps";
import type { Company, Mailbox, Message, Person, Signal, SourceRun } from "../types";

// The dashboard as one static HTML file, for the local mode (no app) and for the plan's dashboard mock (example
// rows in the owner's brand colour). Pure: data in, HTML out. It reuses the app's view models and its stylesheet
// (app/globals.css, passed in by the caller), so the report and the app read the same.

export type ReportData = {
  companies: Company[]; people: Person[]; signals: Signal[]; messages: Message[]; runs: SourceRun[];
  mailboxes?: Mailbox[]; caps?: Caps; enabled?: Record<string, boolean>;
};
export type ReportOptions = { title: string; css: string; now: Date; accent?: string | null; note?: string | null; example?: boolean };

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const HEX = /^#[0-9a-f]{6}$/i;

// Brand accent over the app palette, in both themes (dark mixes it toward white so it stays readable).
function accentCss(hex: string | null | undefined): string {
  if (!hex || !HEX.test(hex)) return "";
  const dark = `--accent: color-mix(in srgb, ${hex} 55%, white); --accent-soft: color-mix(in srgb, ${hex} 22%, #111513); --focus: color-mix(in srgb, ${hex} 55%, white); --accent-ink: #0d1110;`;
  return `:root { --accent: ${hex}; --accent-soft: color-mix(in srgb, ${hex} 14%, white); --focus: ${hex}; --accent-ink: #ffffff; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${dark} } }
:root[data-theme="dark"] { ${dark} }`;
}

const pill = (tone: string, text: string) => `<span class="pill tone-${esc(tone)}">${esc(text)}</span>`;
const kind = (k: string | null) => (k ? `<span class="kind kind-${esc(k)}">${esc(k)}</span>` : `<span class="kind">none</span>`);
const bar = (ratio: number, tone: string) => `<span class="bar tone-${esc(tone)}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(ratio * 100)}"><i style="width:${Math.max(0, Math.min(1, ratio)) * 100}%"></i></span>`;
const score = (r: LeadRow) => `<span class="score"><b>${esc(r.scoreLabel)}</b>${bar((r.score ?? 0) / 100, r.scoreTone)}</span>`;
const stat = (v: unknown, label: string) => `<div class="stat"><b>${esc(v)}</b><span>${esc(label)}</span></div>`;
const panel = (title: string, sub: string, body: string) =>
  `<section class="panel"><div class="panel-head"><h2>${esc(title)}</h2><p>${esc(sub)}</p></div>${body}</section>`;

function leadsPanel(rows: LeadRow[], total: number): string {
  const top = rows.slice(0, 60);
  if (!top.length) return panel("Leads", "Ranked by fit × trigger", `<p class="empty">No companies yet. Run source-tech or source-registers to find the first batch.</p>`);
  const tr = top.map((r) => `<tr><td class="nowrap"><span class="co-name">${esc(r.name)}</span><span class="co-domain">${esc(r.domain)} · ${esc(r.country)}</span></td>
<td><div class="sig">${kind(r.signalKind)}<span class="sig-text">${esc(r.signalText)}</span></div><span class="sig-age">${esc(r.signalAge)}</span></td>
<td class="nowrap">${score(r)}</td><td class="why">${esc(r.why)}</td><td>${pill(r.statusTone, r.status)}</td></tr>`).join("");
  const cards = top.map((r) => `<li class="card"><div class="card-top"><div><span class="co-name">${esc(r.name)}</span><span class="co-domain">${esc(r.domain)} · ${esc(r.country)}</span></div>${score(r)}</div>
<div class="sig">${kind(r.signalKind)}<span class="sig-text">${esc(r.signalText)}</span></div><div class="why">${esc(r.why)}</div><div class="card-meta">${pill(r.statusTone, r.status)}<span class="sig-age">${esc(r.signalAge)}</span></div></li>`).join("");
  return panel("Leads", `Top ${top.length} of ${total}, ranked by fit × trigger`, `<div class="table-wrap leads-table"><table class="data"><thead><tr><th>Company</th><th>Newest signal</th><th>Score</th><th>Why</th><th>Status</th></tr></thead><tbody>${tr}</tbody></table></div><ul class="cards">${cards}</ul>`);
}

function sourcesPanel(d: ReportData, now: Date): string {
  const v = toSourcesView(d.runs, d.caps ?? readCaps(null), d.enabled ?? {}, now);
  const rows = v.rows.filter((r) => r.runs || r.refused || r.enabled).map((r) => `<tr><td>${esc(r.label)}</td><td class="r num">${r.runs}</td><td class="r num">${r.rowsIn} → ${r.rowsKept}</td><td class="r">${esc(r.yieldPct)}</td><td class="r num">${esc(r.costMonth)}</td><td class="nowrap">${bar(r.capRatio, r.capTone)} <span class="sig-age">${esc(r.capText)}</span></td><td class="sig-age">${esc(r.lastRun)}</td></tr>`).join("");
  const body = rows ? `<div class="table-wrap"><table class="data"><thead><tr><th>Source</th><th class="r">Runs</th><th class="r">Rows in → kept</th><th class="r">Yield</th><th class="r">This month</th><th>Cap today</th><th>Last run</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="empty">No source runs yet.</p>`;
  return panel("Sources and spend", `Paid this month ${v.monthSpend} of ${v.monthCap}`, body);
}

const items = (list: OutreachItem[], empty: string) => list.length
  ? `<ul class="list">${list.slice(0, 15).map((m) => `<li><div class="row-top"><strong>${esc(m.company)}</strong>${pill(m.tone, m.status)}</div><span class="sig-age">${esc(m.step)} · ${esc(m.person)} · ${esc(m.when)}</span><span class="sig-text">${esc(m.subject)}: ${esc(m.preview)}</span></li>`).join("")}</ul>`
  : `<p class="empty">${esc(empty)}</p>`;

function outreachPanels(d: ReportData, now: Date): string {
  const v = toOutreachView(d.messages, d.people, d.companies, d.mailboxes ?? [], now);
  return `<div class="split">${panel("Drafts to approve", `${v.totals.drafts} waiting. Approve in the Claude session ("queue these").`, items(v.drafts, "No drafts. first-lines writes them for verified leads."))}
${panel("Replies", `${v.totals.replies} so far`, items(v.replies, "No replies yet."))}</div>
${panel("Sent", `${v.totals.queued} queued`, items(v.sent, "Nothing sent yet."))}`;
}

export function buildReport(d: ReportData, o: ReportOptions): string {
  const leads = toLeadsView(d.companies, d.signals, parseFilters({}), o.now);
  const sent = d.messages.filter((m) => m.direction === "out" && m.status === "sent");
  const verified = d.people.filter((p) => p.verifyStatus === "ok").length;
  const banner = o.example ? `<p class="banner"><strong>Example data.</strong> Every company and person below is made up, to show what your dashboard will look like.</p>` : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<title>${esc(o.title)}</title>
<style>${o.css}
${accentCss(o.accent)}
.report { padding-block: 24px 48px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.report .page { margin: 0 auto; }
.banner { margin: 0; padding: 10px 14px; border-radius: var(--radius); background: var(--warn-soft); color: var(--warn); }
</style></head>
<body><main class="report"><div class="page">
<header class="head"><div><h1>${esc(o.title)}</h1><p>Generated ${esc(o.now.toISOString().slice(0, 16).replace("T", " "))} UTC${o.note ? ` · ${esc(o.note)}` : ""}</p></div></header>
${banner}
<div class="stats">${stat(leads.total, "Companies")}${stat(leads.counts.toQualify, "To qualify")}${stat(leads.counts.qualified, "Qualified")}${stat(verified, "Verified contacts")}${stat(sent.length, "Emails sent")}${stat(leads.counts.replied, "Replied")}</div>
${leadsPanel(leads.rows, leads.total)}
${outreachPanels(d, o.now)}
${sourcesPanel(d, o.now)}
</div></main></body></html>
`;
}
