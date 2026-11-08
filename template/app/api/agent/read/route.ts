import { agentAuthed } from "@/lib/auth";
import { machineRoute } from "@/lib/route";
import { readView, VIEWS, type ViewName } from "@/lib/pipeline/views";

export const dynamic = "force-dynamic";

// GET ?view=to-qualify|to-contact|to-verify|to-write|drafts|replies|company&domain=..|funnel &limit=50
export async function GET(req: Request) {
  return machineRoute(req, agentAuthed, async (db) => {
    const p = new URL(req.url).searchParams;
    const view = p.get("view") as ViewName;
    if (!VIEWS.includes(view)) return { status: 400, body: { error: `view: ${VIEWS.join(" | ")}` } };
    return { body: await readView(db, view, p) };
  });
}
