import { agentAuthed } from "@/lib/auth";
import { machineRoute } from "@/lib/route";
import { rescore } from "@/lib/pipeline/score";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST {company_ids?} → recompute score = fit × trigger and the why lines (all companies when no ids).
export async function POST(req: Request) {
  return machineRoute(req, agentAuthed, async (db) => {
    const body = (await req.json().catch(() => ({}))) as { company_ids?: unknown };
    const ids = Array.isArray(body.company_ids) ? body.company_ids.map(String) : null;
    return { body: await rescore(db, ids) };
  });
}
