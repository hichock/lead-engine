import { cronAuthed } from "@/lib/auth";
import { machineRoute } from "@/lib/route";
import { sendTick } from "@/lib/sender/tick";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Every 5 minutes (Supabase pg_cron, see supabase/sql/schedule.sql): one email per mailbox, inside caps and windows.
export async function GET(req: Request) {
  return machineRoute(req, cronAuthed, async (db) => ({ body: await sendTick(db) }));
}
export const POST = GET;
