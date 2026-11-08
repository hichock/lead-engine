import { agentAuthed } from "@/lib/auth";
import { machineRoute } from "@/lib/route";
import { ingest } from "@/lib/pipeline/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST {companies?, people?, signals?, drafts?, reply_classes?, suppression?} → idempotent writes; reports every skip.
export async function POST(req: Request) {
  return machineRoute(req, agentAuthed, async (db) => {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return { status: 400, body: { error: "JSON body needed" } };
    return { body: await ingest(db, body as Record<string, unknown>) };
  });
}
