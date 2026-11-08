import { timingSafeEqual } from "node:crypto";
import { env } from "./env";

// Bearer-token checks for machine callers. Cron routes use CRON_SECRET (Vercel Cron sends it automatically as
// "Authorization: Bearer <CRON_SECRET>"); agent routes (Claude skills, scripts/le.mjs) use AGENT_TOKEN.
function bearerMatches(req: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const cronAuthed = (req: Request) => bearerMatches(req, env("CRON_SECRET"));
export const agentAuthed = (req: Request) => bearerMatches(req, env("AGENT_TOKEN"));
