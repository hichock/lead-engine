import Link from "next/link";
import { Shell } from "@/components/shell";
import { Head, KindTag, Pill, Score, Stat, StateNotice } from "@/components/ui";
import { loadLeads } from "@/lib/data/load";
import { parseFilters, toLeadsView, type LeadRow, type LeadsView } from "@/lib/view/leads-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LeadsPage({ searchParams }: Props) {
  const filters = parseFilters(await searchParams);
  const loaded = await loadLeads();
  if (!("data" in loaded)) return <Shell active="leads"><Head title="Leads" /><StateNotice state={loaded} /></Shell>;
  const vm = toLeadsView(loaded.data.companies, loaded.data.signals, filters, loaded.now);
  return (
    <Shell active="leads" counts={{ leads: vm.total }}>
      <Head title="Leads" sub="Companies found by signals, ranked by fit × trigger. Contacts are only looked up for qualified companies." />
      <div className="stats">
        <Stat value={vm.total} label="Companies" />
        <Stat value={vm.counts.toQualify} label="To qualify" />
        <Stat value={vm.counts.qualified} label="Qualified" />
        <Stat value={vm.counts.contacted} label="Contacted" />
        <Stat value={vm.counts.replied} label="Replied" />
      </div>
      <section className="panel">
        <Filters vm={vm} f={filters} />
        {vm.rows.length ? <LeadsTable rows={vm.rows} /> : <p className="empty">{vm.filtered ? "No companies match these filters." : "No companies yet. Run the source-tech skill to find the first batch."}</p>}
        <ul className="cards" aria-label="Leads">
          {vm.rows.map((r) => <LeadCard key={r.id} r={r} />)}
        </ul>
      </section>
    </Shell>
  );
}

function Filters({ vm, f }: { vm: LeadsView; f: ReturnType<typeof parseFilters> }) {
  return (
    <form className="filters" method="get">
      <label className="field grow">Search
        <input id="q" name="q" type="search" defaultValue={f.q} placeholder="Company, domain or signal" />
      </label>
      <label className="field">Status
        <select id="status" name="status" defaultValue={f.status}>
          <option value="">Any</option>
          {vm.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <label className="field">Signal
        <select id="kind" name="kind" defaultValue={f.kind}>
          <option value="">Any</option>
          {vm.kinds.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </label>
      <label className="field">Min score
        <input id="min" name="min" type="number" min={0} max={100} step={5} defaultValue={f.minScore || ""} style={{ width: 88 }} />
      </label>
      <button className="btn" type="submit">Filter</button>
      {vm.filtered ? <Link className="btn ghost" href="/">Clear</Link> : null}
    </form>
  );
}

function LeadsTable({ rows }: { rows: LeadRow[] }) {
  return (
    <div className="table-wrap leads-table">
      <table className="data">
        <thead>
          <tr><th>Company</th><th>Newest signal</th><th>Score</th><th>Why</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="nowrap">
                <Link className="co-name" href={`/companies/${r.id}`}>{r.name}</Link>
                <span className="co-domain">{r.domain} · {r.country}</span>
              </td>
              <td>
                <div className="sig"><KindTag kind={r.signalKind} /><span className="sig-text">{r.signalText}</span></div>
                <span className="sig-age">{r.signalAge}{r.signalCount > 1 ? ` · ${r.signalCount} signals` : ""}</span>
              </td>
              <td className="nowrap"><Score value={r.score} label={r.scoreLabel} tone={r.scoreTone} /></td>
              <td className="why">{r.why}{r.factors ? <span className="sig-age" style={{ display: "block" }}>{r.factors}</span> : null}</td>
              <td><Pill tone={r.statusTone}>{r.status}</Pill></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadCard({ r }: { r: LeadRow }) {
  return (
    <li className="card">
      <div className="card-top">
        <div>
          <Link className="co-name" href={`/companies/${r.id}`}>{r.name}</Link>
          <span className="co-domain">{r.domain} · {r.country}</span>
        </div>
        <Score value={r.score} label={r.scoreLabel} tone={r.scoreTone} />
      </div>
      <div className="sig"><KindTag kind={r.signalKind} /><span className="sig-text">{r.signalText}</span></div>
      <div className="why">{r.why}{r.factors ? <span className="sig-age"> · {r.factors}</span> : null}</div>
      <div className="card-meta"><Pill tone={r.statusTone}>{r.status}</Pill><span className="sig-age">{r.signalAge}</span></div>
    </li>
  );
}
