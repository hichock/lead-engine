import { Shell } from "@/components/shell";
import { Bar, Head, Pill, Stat, StateNotice } from "@/components/ui";
import { loadSources } from "@/lib/data/load";
import { toSourcesView } from "@/lib/view/sources-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sources & runs" };

export default async function SourcesPage() {
  const loaded = await loadSources();
  if (!("data" in loaded)) return <Shell active="sources"><Head title="Sources & runs" /><StateNotice state={loaded} /></Shell>;
  const vm = toSourcesView(loaded.data.runs, loaded.data.caps, loaded.data.enabled, loaded.now);
  return (
    <Shell active="sources">
      <Head title="Sources & runs" sub="Every call goes through the run ledger. Caps are checked in code before money is spent; refused calls are listed with the reason." />
      <div className="stats">
        <Stat value={vm.monthSpend} label="Paid this month" />
        <Stat value={vm.monthCap} label="Monthly cap" />
        <Stat value={vm.rows.reduce((s, r) => s + r.runs, 0)} label="Runs (60 d)" />
        <Stat value={vm.rows.reduce((s, r) => s + r.refused, 0)} label="Refused" />
      </div>
      <section className="panel">
        <div className="panel-head"><h2>Per source</h2><p>Yield = rows kept ÷ rows in. "Today" resets at 00:00 UTC.</p></div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Source</th><th className="r">Runs</th><th className="r">Rows in</th><th className="r">Kept</th><th className="r">Yield</th><th className="r">Cost (month)</th><th>Today vs cap</th><th>Last run</th></tr>
            </thead>
            <tbody>
              {vm.rows.map((r) => (
                <tr key={r.key}>
                  <td className="nowrap">
                    <strong>{r.label}</strong>
                    <span className="co-domain">{r.enabled ? "on" : "off"} · {r.paid ? "paid" : "free"}{r.refused ? ` · ${r.refused} refused` : ""}</span>
                  </td>
                  <td className="r num">{r.runs}</td>
                  <td className="r num">{r.rowsIn.toLocaleString("en-US")}</td>
                  <td className="r num">{r.rowsKept.toLocaleString("en-US")}</td>
                  <td className="r num">{r.yieldPct}</td>
                  <td className="r num">{r.costMonth}</td>
                  <td style={{ minWidth: 150 }}>
                    <div className="num" style={{ fontSize: "var(--fs-xs)", marginBottom: 4 }}>{r.capText} <span className="muted">{r.capLabel}</span></div>
                    <Bar ratio={r.capRatio} tone={r.capTone} label={`${r.label} cap used`} />
                  </td>
                  <td className="nowrap muted">{r.lastRun}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Recent runs</h2><p>Newest 25</p></div>
        {vm.recent.length ? (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>When</th><th>Source</th><th>Status</th><th className="r">Rows</th><th className="r">Cost</th><th>Note</th></tr></thead>
              <tbody>
                {vm.recent.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap muted">{r.when}</td>
                    <td className="nowrap">{r.source}</td>
                    <td><Pill tone={r.tone}>{r.status}</Pill></td>
                    <td className="r num nowrap">{r.rows}</td>
                    <td className="r num">{r.cost}</td>
                    <td className="why">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="empty">No runs yet.</p>}
      </section>
    </Shell>
  );
}
