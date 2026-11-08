import { NextResponse } from "next/server";
import { userClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Magic-link landing: exchanges the one-time code for a session cookie, then opens the app.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const db = await userClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
  }
  return NextResponse.redirect(new URL("/", url.origin));
}
