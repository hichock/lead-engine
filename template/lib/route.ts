import { NextResponse } from "next/server";
import { serviceConfigured } from "./env";
import { adminClient } from "./supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

// Wrapper for machine routes: auth check, "not configured" answer, JSON errors (never a silent 200).
export async function machineRoute(req: Request, authed: (r: Request) => boolean, work: (db: SupabaseClient) => Promise<{ status?: number; body: unknown }>) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!serviceConfigured()) return NextResponse.json({ error: "Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)" }, { status: 503 });
  try {
    const r = await work(adminClient());
    return NextResponse.json(r.body, { status: r.status ?? 200 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
