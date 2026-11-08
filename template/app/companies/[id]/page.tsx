import Link from "next/link";
import { Shell } from "@/components/shell";
import { Head, KindTag, Pill, Score, StateNotice } from "@/components/ui";
import { loadCompany } from "@/lib/data/load";
import { toCompanyView, type CompanyView } from "@/lib/view/company-view";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };
const crumb = <Link className="crumb" href="/">← Leads</Link>;

export default async function CompanyPage({ params }: Props) {
  const { id } = await params;
  const loaded = await loadCompany(id);
  if (!("data" in loaded)) return <Shell active="leads"><Head title="Company" crumb={crumb} /><StateNotice state={loaded} /></Shell>;
  const { company, signals, people, messages } = loaded.data;
  if (!company) return <Shell active="leads"><Head title="Company not found" crumb={crumb} sub="It may have been merged or deleted." /></Shell>;
  const vm = toCompanyView(company, signals, people, messages, loaded.now);
  return (
    <Shell active="leads">
      <Head title={vm.name} crumb={crumb} sub={<span className="mono">{vm.domain}</span>}>
        <div className="card-meta">
          <Pill tone={vm.statusTone}>{vm.status}</Pill>
          <Score value={vm.scoreValue} label={vm.score} tone={vm.scoreTone} />
        </div>
      </Head>
      <div className="split">
        <div className="stack">
          <WhyPanel vm={vm} />
          <Timeline vm={vm} />
        </div>
        <div className="stack">
          <Facts vm={vm} />
          <People vm={vm} />
          <Thread vm={vm} />
        </div>
      </div>
    </Shell>
  );
}

function WhyPanel({ vm }: { vm: CompanyView }) {
  return (
    <section className="panel">
      <div className="panel-head"><h2>Why this score</h2><Pill tone={vm.qualified.tone}>{vm.qualified.label}</Pill></div>
      <div className="panel-body why-grid">
        {vm.evidence ? <p className="evidence">{vm.evidence}</p> : null}
        {vm.why.length ? vm.why.map((w) => (
          <div className="why-row" key={w.label}>
            <div className="why-label">{w.label}<b>{w.value}</b></div>
            <ul className="why-parts">{w.parts.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )) : <p className="muted">Not scored yet. The score skill computes fit × trigger and writes the reasons here.</p>}
        {vm.qualified.reason ? <p className="hint">Qualify: {vm.qualified.reason}</p> : null}
        <div className="formula">score = 100 × fit × trigger · fit from the gates in kb/icp.md · trigger from signal strength and age</div>
      </div>
    </section>
  );
}

function Timeline({ vm }: { vm: CompanyView }) {
  return (
    <section className="panel">
      <div className="panel-head"><h2>Signals</h2><p>{vm.timeline.length} found</p></div>
      <div className="panel-body">
        {vm.timeline.length ? (
          <ol className="timeline">
            {vm.timeline.map((s) => (
              <li key={s.id}>
                <time dateTime={s.date} title={s.date}>{s.when}</time>
                <div className="tl-body">
                  <div className="sig"><KindTag kind={s.kind} /><span>{s.value}</span></div>
                  {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.url}</a> : null}
                </div>
              </li>
            ))}
          </ol>
        ) : <p className="muted">No signals yet.</p>}
      </div>
    </section>
  );
}

function Facts({ vm }: { vm: CompanyView }) {
  return (
    <section className="panel">
      <div className="panel-head"><h2>Company</h2></div>
      <div className="panel-body">
        <dl className="facts">
          <dt>Domain</dt><dd className="mono">{vm.domain}</dd>
          <dt>Country</dt><dd>{vm.country}</dd>
          <dt>Size</dt><dd>{vm.sizeBand}</dd>
          <dt>Runs on</dt><dd>{vm.tech.join(", ") || "–"}</dd>
          <dt>Found by</dt><dd>{vm.source}</dd>
        </dl>
      </div>
    </section>
  );
}

function People({ vm }: { vm: CompanyView }) {
  return (
    <section className="panel">
      <div className="panel-head"><h2>People</h2><p>Only verifier "ok" is sendable</p></div>
      {vm.people.length ? (
        <ul className="list">
          {vm.people.map((p) => (
            <li key={p.id}>
              <div className="row-top"><strong>{p.name}</strong><Pill tone={p.verifyTone}>{p.verify}</Pill></div>
              <span className="muted">{p.role}</span>
              <span className="mono">{p.email}</span>
            </li>
          ))}
        </ul>
      ) : <p className="empty">No contact yet. find-contact runs only after the company is qualified.</p>}
    </section>
  );
}

function Thread({ vm }: { vm: CompanyView }) {
  return (
    <section className="panel">
      <div className="panel-head"><h2>Messages</h2><p>{vm.thread.length || "none yet"}</p></div>
      {vm.thread.length ? (
        <div className="panel-body thread">
          {vm.thread.map((m) => (
            <article key={m.id} className={`msg ${m.dir}`}>
              <div className="msg-head"><span>{m.step}</span><span><Pill tone={m.tone}>{m.status}</Pill> {m.when}</span></div>
              <div className="msg-subject">{m.subject}</div>
              <pre className="msg-body">{m.body}</pre>
              {m.mailbox ? <span className="hint mono">{m.mailbox}</span> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
