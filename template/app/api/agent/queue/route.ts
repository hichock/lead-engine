import { agentAuthed } from "@/lib/auth";
import { machineRoute } from "@/lib/route";
import { queueLeads } from "@/lib/pipeline/queue";

export const dynamic = "force-dynamic";

// POST {person_ids} → send checks, then drafts become queued. Used by the outreach-review skill only when the owner
// turned on auto-queue in Settings; otherwise the owner approves in Outreach.
export async function POST(req: Request) {
  return machineRoute(req, agentAuthed, async (db) => {
    const { data } = await db.from("settings").select("value").eq("key", "send").maybeSingle();
    if ((data?.value as { autoQueue?: boolean } | null)?.autoQueue !== true)
      return { status: 403, body: { refused: "auto-queue is off: the owner approves drafts in Outreach (Settings → Sending → auto-queue)" } };
    const body = (await req.json().catch(() => ({}))) as { person_ids?: unknown };
    const ids = Array.isArray(body.person_ids) ? body.person_ids.map(String).slice(0, 200) : [];
    if (!ids.length) return { status: 400, body: { error: "person_ids needed" } };
    return { body: await queueLeads(db, ids) };
  });
}
