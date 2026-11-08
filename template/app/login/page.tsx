import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseConfigured, isDemo, env } from "@/lib/env";
import { userClient } from "@/lib/supabase/server";
import { Toast } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

async function sendLink(fd: FormData) {
  "use server";
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/login?error=Enter a valid email address");
  const h = await headers();
  const origin = env("NEXT_PUBLIC_SITE_URL") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const db = await userClient();
  const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: true } });
  redirect(error ? `/login?error=${encodeURIComponent(error.message)}` : "/login?sent=1");
}

type Props = { searchParams: Promise<{ sent?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  if (isDemo()) redirect("/");
  return (
    <div className="login">
      <section className="panel">
        <div className="panel-head"><h2>Sign in to Lead Engine</h2></div>
        <div className="panel-body" style={{ display: "grid", gap: 12 }}>
          {!supabaseConfigured() ? (
            <p className="muted">Supabase is not connected yet. Set the keys from <code>.env.example</code> in Vercel, or run <code>npm run demo</code> locally.</p>
          ) : sp.sent ? (
            <p role="status">Check your inbox. The link signs you in on this device.</p>
          ) : (
            <form action={sendLink} style={{ display: "grid", gap: 12 }}>
              <label className="field">Work email<input id="email" name="email" type="email" required autoComplete="email" /></label>
              <button className="btn" type="submit">Email me a sign-in link</button>
              <p className="hint">Only emails on the team list see data.</p>
            </form>
          )}
          <Toast error={sp.error} />
        </div>
      </section>
    </div>
  );
}
