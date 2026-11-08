import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "../env";

// Service-role client: bypasses RLS. Server only (cron and agent routes). Never import it in a client component.
let cached: SupabaseClient | null = null;
export function adminClient(): SupabaseClient {
  cached ??= createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

// Reads every row of a query, 1,000 at a time (Supabase cuts larger reads silently). Order by a unique key.
export async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(`Could not load rows: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}
