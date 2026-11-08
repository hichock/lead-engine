import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Refreshes the Supabase session cookie on every page request and sends signed-out visitors to /login.
// Skipped in demo mode and when Supabase is not configured (pages then show a "connect Supabase" state).
// Real access control is RLS in the database; this is only the redirect.
export async function proxy(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (process.env.DEMO === "1" || !url || !key) return NextResponse.next();
  let res = NextResponse.next({ request: req });
  const db = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await db.auth.getUser();
  const open = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/auth");
  if (!data.user && !open) return NextResponse.redirect(new URL("/login", req.url));
  return res;
}

export const config = {
  // Pages only: API routes check their own bearer tokens.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
