import Link from "next/link";
import { Shell } from "@/components/shell";
import { Bar, Head, Pill, Stat, StateNotice, Toast } from "@/components/ui";
import { loadOutreach } from "@/lib/data/load";
import { toOutreachView, type OutreachItem } from "@/lib/view/outreach-view";
import { isDemo } from "@/lib/env";
import { approveDrafts } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Outreach" };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function OutreachPage({ searchParams }: Props) {
  const sp = await searchParams;
  const loaded = await loadOutreach();
  if (!("data" in loaded)) return <Shell active="outreach"><Head title="Outreach" /><StateNotice state={loaded} /></Shell>;
  const { messages, people, companies, mailboxes } = loaded.data;
  const vm = toOutreachView(messages, people, companies, mailboxes, loaded.now);
  return (
    <Shell active="outreach" counts={{ outreach: vm.totals.drafts }}>
      <Head title="Outreach" sub="Plain-text emails from your own mailboxes, Mon–Fri in each lead's working hours. A reply, bounce or opt-out stops the sequence." />
      <Toast saved={sp.saved} error={sp.error} />
      <div className="stats">
        <Stat value={`${vm.totals.sentToday} / ${vm.totals.capToday}`} label="Sent today / cap" />
        <Stat value={vm.totals.drafts} label="Drafts to approve" />
        <Stat value={vm.totals.queued} label="Queued" />
        <Stat value={vm.totals.replies} label="Replies" />
      </div>
      <section className="panel">
        <div className="panel-head"><h2>Mailboxes</h2><p>One email per mailbox per 5-minute tick, 8+ minutes apart</p></div>
        <div className="panel-body grid-3">
          {vm.mailboxes.length ? vm.mailboxes.map((m) => (
            <div className="box" key={m.email}>
              <div className="box-top"><strong className="mono">{m.email}</strong><Pill tone={m.active ? "good" : "neutral"}>{m.active ? "on" : "off"}</Pill></div>
              <div className="num" style={{ fontSize: "var(--fs-xs)" }}>{m.sent} of {m.cap} today · last {m.last}</div>
              <Bar ratio={m.ratio} tone={m.tone} label={`${m.email} daily cap used`} />
            </div>
          )) : <p className="muted">No mailboxes yet. Add one in <Link href="/settings">Settings</Link>.</p>}
        </div>
      </section>
      <DraftsPanel items={vm.drafts} />
      <ItemsPanel title="Queue" sub="Follow-ups first, then new first emails" items={vm.queue} empty="Nothing queued." />
      <ItemsPanel title="Replies" sub="Classified by the outreach-review skill; answers are drafted for you to send" items={vm.replies} empty="No replies yet." />
      <ItemsPanel title="Sent" sub="Newest first" items={vm.sent} empty="Nothing sent yet." />
    </Shell>
  );
}

function DraftsPanel({ items }: { items: OutreachItem[] }) {
  return (
    <section className="panel">
      <div className="panel-head"><h2>Drafts to approve</h2><p>Send checks run again on approve: verifier ok, not suppressed, not contacted, ≤ 90 words</p></div>
      {items.length ? (
        <form action={approveDrafts}>
          <ul className="list">
            {items.map((d) => (
              <li key={d.id}>
                <label className="check">
                  <input type="checkbox" name="person" value={d.personId} defaultChecked id={`draft-${d.id}`} />
                  <span style={{ display: "grid", gap: 4, minWidth: 0 }}>
                    <span className="row-top"><strong>{d.company} · {d.person}</strong><span className="mono muted">{d.email}</span></span>
                    <span><b>{d.subject}</b> <span className="muted">{d.preview}</span></span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="panel-body form-actions" style={{ marginTop: 0 }}>
            <button className="btn" type="submit" disabled={isDemo()}>Approve and queue</button>
            <span className="hint">Turn on auto-queue in Settings to let the daily review queue drafts for you.</span>
          </div>
        </form>
      ) : <p className="empty">No drafts. The first-lines skill writes them for verified, qualified leads.</p>}
    </section>
  );
}

function ItemsPanel({ title, sub, items, empty }: { title: string; sub: string; items: OutreachItem[]; empty: string }) {
  return (
    <section className="panel">
      <div className="panel-head"><h2>{title}</h2><p>{sub}</p></div>
      {items.length ? (
        <ul className="list">
          {items.map((d) => (
            <li key={d.id}>
              <div className="row-top">
                <Link className="co-name" href={`/companies/${d.companyId}`}>{d.company} · {d.person}</Link>
                <span className="card-meta"><span className="hint">{d.step}</span><Pill tone={d.tone}>{d.status}</Pill></span>
              </div>
              <span><b>{d.subject}</b> <span className="muted">{d.preview}</span></span>
              <span className="hint">{d.when} · <span className="mono">{d.mailbox}</span></span>
            </li>
          ))}
        </ul>
      ) : <p className="empty">{empty}</p>}
    </section>
  );
}
