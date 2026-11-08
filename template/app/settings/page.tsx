import { Shell } from "@/components/shell";
import { Head, Pill, StateNotice, Toast } from "@/components/ui";
import { loadSettings, type SettingsData } from "@/lib/data/load";
import { SOURCES } from "@/lib/sources/registry";
import type { Caps } from "@/lib/caps";
import { addMailbox, saveCaps, saveForwardTo, saveSend, saveSources, toggleMailbox } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

const CAP_FIELDS: { key: keyof Caps; label: string; step: string; hint: string }[] = [
  { key: "monidUsd", label: "Monid, $ per day", step: "0.1", hint: "contact finding and fallback verify" },
  { key: "mvChecks", label: "MillionVerifier checks per day", step: "1", hint: "~$0.0037 per check" },
  { key: "bigqueryGb", label: "BigQuery GB per day", step: "1", hint: "free tier: 1,000 GB a month" },
  { key: "bigqueryGbPerQuery", label: "BigQuery GB per query", step: "1", hint: "hard ceiling sent to BigQuery" },
  { key: "apifyUsd", label: "Apify, $ per day", step: "0.5", hint: "0 keeps Apify off" },
  { key: "urlscanSearches", label: "urlscan searches per day", step: "10", hint: "free key: 1,000 a day" },
  { key: "apolloPages", label: "Apollo pages per day", step: "1", hint: "free people search, 100 per page" },
  { key: "monthlyUsd", label: "All paid sources, $ per month", step: "1", hint: "stops every paid call when reached" },
];

export default async function SettingsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const loaded = await loadSettings();
  if (!("data" in loaded)) return <Shell active="settings"><Head title="Settings" /><StateNotice state={loaded} /></Shell>;
  const s = loaded.data;
  return (
    <Shell active="settings">
      <Head title="Settings" sub={`Signed in as ${s.email}. Caps here are enforced by the server on every source call. Keep kb/sources.md in step.`} />
      <Toast saved={sp.saved} error={sp.error} />
      <CapsForm s={s} />
      <SourcesForm s={s} />
      <SendForm s={s} />
      <Mailboxes s={s} />
    </Shell>
  );
}

function CapsForm({ s }: { s: SettingsData }) {
  return (
    <section className="panel">
      <div className="panel-head"><h2>Caps per run day</h2><p>A call that would pass a cap is refused and logged</p></div>
      <form action={saveCaps} className="panel-body">
        <div className="form-grid">
          {CAP_FIELDS.map((f) => (
            <label className="field" key={f.key}>{f.label}
              <input id={`cap-${f.key}`} name={f.key} type="number" min={0} step={f.step} defaultValue={s.caps[f.key]} required />
              <span className="hint">{f.hint}</span>
            </label>
          ))}
        </div>
        <div className="form-actions"><button className="btn" type="submit">Save caps</button></div>
      </form>
    </section>
  );
}

function SourcesForm({ s }: { s: SettingsData }) {
  return (
    <section className="panel">
      <div className="panel-head"><h2>Sources</h2><p>A switched-off source refuses every call</p></div>
      <form action={saveSources} className="panel-body">
        <div className="form-grid">
          {Object.values(SOURCES).map((src) => (
            <label className="check" key={src.key}>
              <input id={`src-${src.key}`} type="checkbox" name={`src_${src.key}`} defaultChecked={s.enabled[src.key] === true} />
              <span><strong>{src.label}</strong><br /><span className="hint">{src.paid ? "paid" : "free"} · {src.stage}</span></span>
            </label>
          ))}
        </div>
        <div className="form-actions"><button className="btn" type="submit">Save sources</button></div>
      </form>
    </section>
  );
}

function SendForm({ s }: { s: SettingsData }) {
  return (
    <section className="panel">
      <div className="panel-head"><h2>Sending</h2><p>Times are the lead&apos;s local time, Monday to Friday</p></div>
      <form action={saveSend} className="panel-body">
        <div className="form-grid">
          <label className="field">Window starts (hour)<input id="ws" name="windowStartHour" type="number" min={0} max={23} defaultValue={s.send.windowStartHour} /></label>
          <label className="field">Window ends (hour)<input id="we" name="windowEndHour" type="number" min={1} max={24} defaultValue={s.send.windowEndHour} /></label>
          <label className="field">Minutes between sends<input id="gap" name="minGapMinutes" type="number" min={2} defaultValue={s.send.minGapMinutes} /></label>
          <label className="field">Follow-up delays (business days)<input id="delays" name="stepDelays" defaultValue={s.send.stepDelays.join(", ")} /></label>
          <label className="field">New leads per day (all mailboxes)<input id="perday" name="newPerDay" type="number" min={0} defaultValue={s.send.newPerDay} /></label>
        </div>
        <label className="field" style={{ marginTop: 12 }}>Opt-out line (added to every email; leave on)
          <input id="optout" name="optOutLine" defaultValue={s.send.optOutLine} />
          <span className="hint">CAN-SPAM needs a working opt-out; UK PECR and GDPR need the sender named and a way to object. Empty turns it off: your legal risk.</span>
        </label>
        <label className="check" style={{ marginTop: 12 }}>
          <input id="autoq" type="checkbox" name="autoQueue" defaultChecked={s.send.autoQueue} />
          <span><strong>Auto-queue</strong><br /><span className="hint">Let the daily outreach-review queue drafts that pass the send checks. Off: you approve each batch in Outreach.</span></span>
        </label>
        <div className="form-actions"><button className="btn" type="submit">Save sending</button></div>
      </form>
      <form action={saveForwardTo} className="panel-body" style={{ borderTop: "1px solid var(--line)" }}>
        <label className="field">Forward replies to<input id="fwd" name="forwardTo" type="email" defaultValue={s.forwardTo} placeholder="you@yourcompany.example" /></label>
        <div className="form-actions"><button className="btn ghost" type="submit">Save</button></div>
      </form>
    </section>
  );
}

function Mailboxes({ s }: { s: SettingsData }) {
  return (
    <section className="panel">
      <div className="panel-head"><h2>Mailboxes</h2><p>Warmed mailboxes on secondary domains, never your main domain</p></div>
      {s.mailboxes.length ? (
        <ul className="list">
          {s.mailboxes.map((m) => (
            <li key={m.id}>
              <div className="row-top">
                <span><strong className="mono">{m.email}</strong> <span className="muted">{m.fromName} · cap {m.dailyCap}/day</span></span>
                <form action={toggleMailbox} className="card-meta">
                  <input type="hidden" name="email" value={m.email} />
                  <input type="hidden" name="active" value={m.active ? "false" : "true"} />
                  <Pill tone={m.active ? "good" : "neutral"}>{m.active ? "on" : "off"}</Pill>
                  <button className="btn ghost" type="submit">{m.active ? "Pause" : "Resume"}</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <form action={addMailbox} className="panel-body" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="form-grid">
          <label className="field">Email<input id="mb-email" name="email" type="email" required placeholder="alex@yourbrand-mail.example" /></label>
          <label className="field">Sender name<input id="mb-name" name="fromName" required placeholder="Alex Carter" /></label>
          <label className="field">App password<input id="mb-pass" name="password" type="password" required autoComplete="off" /></label>
          <label className="field">Daily cap<input id="mb-cap" name="dailyCap" type="number" min={1} max={50} defaultValue={15} /></label>
        </div>
        <p className="hint">Google Workspace: turn on 2-step verification, then create an app password. The password is encrypted on the server and never shown again.</p>
        <div className="form-actions"><button className="btn" type="submit">Add mailbox</button></div>
      </form>
    </section>
  );
}
