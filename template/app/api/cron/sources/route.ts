import { cronAuthed } from "@/lib/auth";
import { machineRoute } from "@/lib/route";
import { runCronSources } from "@/lib/pipeline/cron-sources";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily: runs the free scheduled pulls in settings.cron_jobs (urlscan date slices per fingerprint) through the
// same guard and ledger as skills, and adds new hosts as companies with a tech signal. No model needed.
export async function GET(req: Request) {
  return machineRoute(req, cronAuthed, async (db) => ({ body: await runCronSources(db) }));
}
export const POST = GET;
