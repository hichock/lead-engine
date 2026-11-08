// One place that reads environment variables. Every key is optional at build time, so the app builds and renders
// a "connect Supabase" state without them. .env.example lists every variable.

export const env = (name: string): string | undefined => {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
};

export function requireEnv(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`${name} is not set (see .env.example)`);
  return v;
}

export const isDemo = () => env("DEMO") === "1";
export const supabaseConfigured = () => !!(env("NEXT_PUBLIC_SUPABASE_URL") && env("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
export const serviceConfigured = () => !!(env("NEXT_PUBLIC_SUPABASE_URL") && env("SUPABASE_SERVICE_ROLE_KEY"));
