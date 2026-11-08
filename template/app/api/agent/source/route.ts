import { agentAuthed } from "@/lib/auth";
import { machineRoute } from "@/lib/route";
import { parseCall, runSource } from "@/lib/sources/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST {source, params, company_id?} → one guarded source call (ledger + caps + qualified check).
// 200 done · 202 pending (call again with the same body to resume) · 403 refused by a cap or rule · 409 same input in 24 h.
export async function POST(req: Request) {
  return machineRoute(req, agentAuthed, async (db) => {
    const call = parseCall(await req.json().catch(() => null));
    if (typeof call === "string") return { status: 400, body: { error: call } };
    const out = await runSource(db, call);
    return { status: out.status, body: out.body };
  });
}
