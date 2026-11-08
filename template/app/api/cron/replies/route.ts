import { cronAuthed } from "@/lib/auth";
import { machineRoute } from "@/lib/route";
import { pollReplies } from "@/lib/sender/replies";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Every 15 minutes: read new mail; replies, bounces and opt-outs stop the person's sequence.
export async function GET(req: Request) {
  return machineRoute(req, cronAuthed, async (db) => ({ body: { report: await pollReplies(db) } }));
}
export const POST = GET;
