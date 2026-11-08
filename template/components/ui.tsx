import Link from "next/link";
import type { ReactNode } from "react";
import type { Tone } from "@/lib/view/format";
import type { PageState } from "@/lib/data/load";

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`pill tone-${tone}`}>{children}</span>;
}

export function KindTag({ kind }: { kind: string | null }) {
  if (!kind) return <span className="kind">none</span>;
  return <span className={`kind kind-${kind}`}>{kind}</span>;
}

export function Bar({ ratio, tone, label }: { ratio: number; tone: Tone; label: string }) {
  return (
    <span className={`bar tone-${tone}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} aria-label={label}>
      <i style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }} />
    </span>
  );
}

export function Score({ value, label, tone }: { value: number | null; label: string; tone: Tone }) {
  return (
    <span className="score">
      <b>{label}</b>
      <Bar ratio={(value ?? 0) / 100} tone={tone} label={`score ${label}`} />
    </span>
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export function Head({ title, sub, children, crumb }: { title: string; sub?: ReactNode; children?: ReactNode; crumb?: ReactNode }) {
  return (
    <header className="head">
      <div>
        {crumb}
        <h1>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      {children}
    </header>
  );
}

export function Toast({ saved, error }: { saved?: string; error?: string }) {
  if (error) return <p className="toast tone-bad" role="alert">{error}</p>;
  if (saved) return <p className="toast tone-good" role="status">Saved.</p>;
  return null;
}

// What a page shows instead of data when the app is not connected, the visitor is signed out, or a read failed.
export function StateNotice({ state }: { state: PageState }) {
  if (state.mode === "signed-out") {
    return (
      <section className="panel notice">
        <h2>Sign in to see your leads</h2>
        <p className="muted">This workspace is private to your team.</p>
        <p><Link className="btn" href="/login">Sign in with email</Link></p>
      </section>
    );
  }
  if (state.mode === "no-access") {
    return (
      <section className="panel notice">
        <h2>No access for {state.email}</h2>
        <p className="muted">Ask the owner to add your email to the team (table <code>team_members</code>), then reload.</p>
      </section>
    );
  }
  if (state.mode === "error") {
    return (
      <section className="panel notice">
        <h2>Could not load this page</h2>
        <p className="muted">{state.message}</p>
        <p className="muted">Check that the migrations ran (<code>supabase db push</code>) and the keys in Vercel are current.</p>
      </section>
    );
  }
  return (
    <section className="panel notice">
      <h2>Connect Supabase in Settings</h2>
      <p className="muted">The app is running, but it has no database yet. Run <code>/lead-engine:setup</code> in Claude Code, or do it by hand:</p>
      <ol>
        <li>Create a Supabase project and run <code>supabase db push</code> from this repo.</li>
        <li>Set <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> in Vercel (see <code>.env.example</code>).</li>
        <li>Add your email to <code>team_members</code> and redeploy.</li>
      </ol>
      <p className="muted">Want to look around first? Run <code>npm run demo</code> to see example data.</p>
    </section>
  );
}
