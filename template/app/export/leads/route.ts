import { loadExport } from "@/lib/data/load";
import { leadsCsv, sequencerCsv } from "@/lib/view/export-csv";

export const dynamic = "force-dynamic";

const STATUS: Record<string, number> = { unconfigured: 503, "signed-out": 401, "no-access": 403, error: 500 };

// GET /export/leads            → every company with its best contact (CSV)
// GET /export/leads?for=sequencer → only sendable people with their drafted emails, ready for an Instantly or Smartlead import
// Reads as the signed-in user, so RLS applies exactly as on the Leads page.
export async function GET(req: Request) {
  const loaded = await loadExport();
  if (!("data" in loaded)) {
    const msg = loaded.mode === "error" ? `Could not load leads: ${loaded.message}` : `Export unavailable: ${loaded.mode}`;
    return new Response(msg, { status: STATUS[loaded.mode] ?? 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const forSequencer = new URL(req.url).searchParams.get("for") === "sequencer";
  const { companies, people, messages } = loaded.data;
  const csv = forSequencer ? sequencerCsv(companies, people, messages) : leadsCsv(companies, people);
  const day = loaded.now.toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${forSequencer ? "sequencer" : "leads"}-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
